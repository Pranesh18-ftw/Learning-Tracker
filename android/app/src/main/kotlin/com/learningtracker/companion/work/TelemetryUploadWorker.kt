package com.learningtracker.companion.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.learningtracker.companion.FocusIntegrityApplication
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.entity.AppBreakdownEntity
import com.learningtracker.companion.data.entity.TelemetrySummaryEntity
import com.learningtracker.companion.data.entity.TimelineIntervalEntity
import com.learningtracker.companion.data.entity.toModel
import com.learningtracker.companion.network.ApiResult
import com.learningtracker.companion.network.AppBreakdownItem
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.network.TelemetrySummaryPayload
import com.learningtracker.companion.pairing.PairingManager
import java.util.UUID
import kotlinx.coroutines.isActive

/**
 * TelemetryUploadWorker (M2.4)
 *
 * Implements the 12-step upload lifecycle with:
 * - 5-record batch size
 * - 5-minute lease duration
 * - Strict DatabaseAccessGate separation (NEVER held across network calls)
 * - Atomic lease-checking updates matching claimToken and claimGeneration
 * - Draining loop until no eligible records remain
 */
class TelemetryUploadWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val BATCH_SIZE = 5
        const val LEASE_DURATION_MS = 5 * 60 * 1000L // 300,000 ms (5 minutes)
        const val MAX_ATTEMPTS = 10

        @Volatile internal var testDatabaseAccessGate: DatabaseAccessGate? = null
        @Volatile internal var testPairingManager: PairingManager? = null
        @Volatile internal var testApiClient: PhoneApiClient? = null
        @Volatile internal var testWorkManager: androidx.work.WorkManager? = null
        @Volatile internal var testTimeProvider: (() -> Long)? = null
        @Volatile internal var onUploadHttpHook: (suspend (String) -> Unit)? = null

        fun resetTestOverrides() {
            testDatabaseAccessGate = null
            testPairingManager = null
            testApiClient = null
            testWorkManager = null
            testTimeProvider = null
            onUploadHttpHook = null
        }
    }

    private fun currentTime(): Long = testTimeProvider?.invoke() ?: System.currentTimeMillis()

    private fun resolveGate(): DatabaseAccessGate {
        return testDatabaseAccessGate
            ?: FocusIntegrityApplication.getInstance()?.databaseAccessGate
            ?: throw IllegalStateException("DatabaseAccessGate is not available")
    }

    private fun resolvePairingManager(): PairingManager {
        return testPairingManager
            ?: FocusIntegrityApplication.getInstance()?.pairingManager
            ?: PairingManager(applicationContext)
    }

    private fun resolveApiClient(pm: PairingManager): PhoneApiClient {
        return testApiClient ?: pm.apiClient
    }

    private data class ClaimedRecord(
        val summary: TelemetrySummaryEntity,
        val intervals: List<TimelineIntervalEntity>,
        val breakdown: List<AppBreakdownEntity>,
        val claimToken: String,
        val claimGeneration: Long
    )

    override suspend fun doWork(): Result {
        val gate = try {
            resolveGate()
        } catch (e: Exception) {
            return Result.failure()
        }

        val pairingManager = resolvePairingManager()
        val apiClient = resolveApiClient(pairingManager)

        // Outbox draining loop (Step 12)
        while (kotlinx.coroutines.currentCoroutineContext().isActive && !isStopped) {
            val now = currentTime()

            // 1. Initialize database access & 2. Sweep leases & 3. Sweep exhausted & 4. Query & 5. Claim & 6. Generation & 7. Child records
            val claimedBatch = gate.withAccess { db ->
                val outboxDao = db.telemetryOutboxDao()

                // Step 2: Sweep expired leases
                outboxDao.sweepAllStaleLeases(now)

                // Step 3: Move exhausted records (attempts >= 10) to PERMANENT_ERROR
                outboxDao.sweepExhaustedAttempts(now)

                // Step 4: Query eligible records (batch size = 5)
                val eligible = outboxDao.getEligibleOutboxBatch(now, batchSize = BATCH_SIZE)
                if (eligible.isEmpty()) {
                    return@withAccess emptyList<ClaimedRecord>()
                }

                val claimedList = mutableListOf<ClaimedRecord>()
                for (item in eligible) {
                    // Step 5: Claim each record with a unique claimToken
                    val claimToken = UUID.randomUUID().toString()
                    val leaseExpiresAt = now + LEASE_DURATION_MS
                    val rowsUpdated = outboxDao.claimForUploadWithToken(
                        summaryId = item.summaryId,
                        newClaimToken = claimToken,
                        now = now,
                        leaseExpiresAt = leaseExpiresAt
                    )

                    if (rowsUpdated > 0) {
                        // Step 6: Capture claimGeneration and latest entity state
                        val updated = outboxDao.getSummaryById(item.summaryId)
                        if (updated != null && updated.claimToken == claimToken) {
                            // Step 7: Load the full summary and child records
                            val intervals = outboxDao.getIntervalsForSummary(item.summaryId)
                            val breakdown = outboxDao.getBreakdownForSummary(item.summaryId)
                            claimedList.add(
                                ClaimedRecord(
                                    summary = updated,
                                    intervals = intervals,
                                    breakdown = breakdown,
                                    claimToken = claimToken,
                                    claimGeneration = updated.claimGeneration
                                )
                            )
                        }
                    }
                }
                claimedList
            }
            // Step 8: Release DatabaseAccessGate (End of withAccess block)

            if (claimedBatch.isEmpty()) {
                break
            }

            // Process claimed records (HTTP upload without holding gate)
            for (record in claimedBatch) {
                if (!kotlinx.coroutines.currentCoroutineContext().isActive || isStopped) {
                    return Result.retry()
                }

                val deviceToken = pairingManager.getDeviceToken()
                val deviceId = pairingManager.getDeviceAssociation()?.deviceAssociationId

                if (deviceToken.isNullOrBlank() || deviceId.isNullOrBlank() || pairingManager.isRevoked() || !pairingManager.isPaired()) {
                    val revokeTime = currentTime()
                    gate.withAccess { db ->
                        db.telemetryOutboxDao().markAllPendingAsRevoked("Device not paired or revoked", revokeTime)
                    }
                    return Result.failure()
                }

                val payload = TelemetrySummaryPayload(
                    summaryId = record.summary.summaryId,
                    deviceId = deviceId,
                    sessionId = record.summary.sessionId,
                    windowStart = (record.summary.createdAt - (record.summary.observedWindowSeconds * 1000L)).coerceAtLeast(0L),
                    windowEnd = record.summary.createdAt,
                    intendedSeconds = record.summary.intendedSeconds,
                    observedSeconds = record.summary.observedWindowSeconds,
                    interruptionCount = record.summary.interruptionCount,
                    interruptionSeconds = record.summary.interruptionSeconds,
                    referenceSeconds = record.summary.referenceSeconds,
                    distractionSeconds = record.summary.distractionSeconds,
                    longestUninterruptedSeconds = record.summary.longestUninterruptedSeconds,
                    appBreakdown = record.breakdown.map {
                        AppBreakdownItem(
                            packageName = it.packageName,
                            category = it.category.lowercase(),
                            durationSeconds = it.durationSeconds
                        )
                    },
                    timeline = record.intervals.map { it.toModel() },
                    consentVersion = "1.0.0",
                    schemaVersion = "1.0.0"
                )

                // Step 9: Perform HTTP upload outside database gate
                onUploadHttpHook?.invoke(record.summary.summaryId)
                val apiResult = apiClient.submitTelemetrySummary(payload, deviceToken)

                if (!kotlinx.coroutines.currentCoroutineContext().isActive || isStopped) {
                    return Result.retry()
                }

                // Step 10: Reacquire DatabaseAccessGate
                val updateTime = currentTime()
                var abortDraining = false

                gate.withAccess { db ->
                    val outboxDao = db.telemetryOutboxDao()

                    // Step 11: Update the record only if claimToken and claimGeneration still match
                    when (apiResult) {
                        is ApiResult.Success -> {
                            outboxDao.markDelivered(
                                summaryId = record.summary.summaryId,
                                claimToken = record.claimToken,
                                claimGeneration = record.claimGeneration,
                                now = updateTime
                            )
                        }
                        is ApiResult.Error -> {
                            when (apiResult.statusCode) {
                                401 -> {
                                    pairingManager.markRevoked()
                                    outboxDao.markAllPendingAsRevoked("Device credential revoked (HTTP 401)", updateTime)
                                    abortDraining = true
                                }
                                409 -> {
                                    outboxDao.markConflict(
                                        summaryId = record.summary.summaryId,
                                        claimToken = record.claimToken,
                                        claimGeneration = record.claimGeneration,
                                        error = "HTTP 409 Conflict: ${apiResult.message}",
                                        now = updateTime
                                    )
                                }
                                400, 403, 422 -> {
                                    outboxDao.markPermanentError(
                                        summaryId = record.summary.summaryId,
                                        claimToken = record.claimToken,
                                        claimGeneration = record.claimGeneration,
                                        error = "HTTP ${apiResult.statusCode}: ${apiResult.message}",
                                        now = updateTime
                                    )
                                }
                                429 -> {
                                    val nextAttemptAt = RetryScheduleCalculator.parseRetryAfter(
                                        header = apiResult.retryAfterHeader,
                                        now = updateTime,
                                        attempts = record.summary.attempts
                                    )
                                    outboxDao.markRetry(
                                        summaryId = record.summary.summaryId,
                                        claimToken = record.claimToken,
                                        claimGeneration = record.claimGeneration,
                                        error = "HTTP 429 Rate Limited: ${apiResult.message}",
                                        nextAttemptAt = nextAttemptAt,
                                        now = updateTime
                                    )
                                }
                                else -> {
                                    // HTTP 5xx / network failures -> bounded exponential backoff
                                    val backoffMs = RetryScheduleCalculator.calculateExponentialBackoffMs(
                                        attempts = record.summary.attempts
                                    )
                                    val nextAttemptAt = updateTime + backoffMs
                                    outboxDao.markRetry(
                                        summaryId = record.summary.summaryId,
                                        claimToken = record.claimToken,
                                        claimGeneration = record.claimGeneration,
                                        error = "${apiResult.code}: ${apiResult.message}",
                                        nextAttemptAt = nextAttemptAt,
                                        now = updateTime
                                    )
                                }
                            }
                        }
                    }
                }

                if (abortDraining) {
                    return Result.failure()
                }
            }
        }

        // Draining complete. Schedule next retry if needed.
        try {
            val scheduler = OutboxRetryScheduler(
                context = applicationContext,
                gate = gate,
                workManager = testWorkManager,
                timeProvider = { currentTime() }
            )
            scheduler.scheduleNext(currentTime())
        } catch (_: Exception) {
            // Worker succeeds even if scheduler encounters non-fatal condition
        }

        return Result.success()
    }
}
