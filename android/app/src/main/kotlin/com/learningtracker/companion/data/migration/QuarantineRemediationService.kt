package com.learningtracker.companion.data.migration

import androidx.room.withTransaction
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.toEntity
import com.learningtracker.companion.data.entity.toSummaryEntity
import com.learningtracker.companion.model.FocusSummary
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

sealed class RemediationResult {
    data class Success(val sourceKey: String, val summaryId: String) : RemediationResult()
    data class Failed(val sourceKey: String, val reason: String) : RemediationResult()
}

class QuarantineRemediationService(
    private val gate: DatabaseAccessGate
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun remediateQuarantinedRecord(
        sourceKey: String,
        sourcePreferenceFile: String,
        repairedJson: String
    ): RemediationResult = gate.withAccess { database ->
        val outboxDao = database.telemetryOutboxDao()
        val now = System.currentTimeMillis()

        try {
            database.withTransaction {
                val existingLedger = outboxDao.getLedgerEntry(sourceKey, sourcePreferenceFile)
                    ?: throw IllegalArgumentException("No ledger entry found for $sourceKey in $sourcePreferenceFile")

                if (existingLedger.outcome != "QUARANTINED") {
                    throw IllegalStateException("Record $sourceKey is in status '${existingLedger.outcome}', not QUARANTINED")
                }

                val summary = json.decodeFromString<FocusSummary>(repairedJson)

                val existingSummary = outboxDao.getSummaryById(summary.summaryId)
                if (existingSummary != null) {
                    throw IllegalStateException("Destination summary ${summary.summaryId} already exists in Room")
                }

                val sessionEntity = FocusSessionEntity(
                    sessionId = summary.sessionId,
                    startedAt = (summary.timestamp - (summary.observedWindowSeconds * 1000L)).coerceAtLeast(0L),
                    intendedDurationSeconds = summary.intendedSeconds,
                    endedAt = summary.timestamp,
                    state = "FINALIZED"
                )
                outboxDao.insertSessionIfMissing(sessionEntity)

                val summaryEntity = summary.toSummaryEntity().copy(
                    syncState = "PENDING",
                    attempts = 0,
                    claimToken = null,
                    claimGeneration = 0L,
                    leaseExpiresAt = null,
                    nextAttemptAt = null,
                    createdAt = now,
                    updatedAt = now
                )
                outboxDao.upsertSummary(summaryEntity)

                val intervals = summary.timeline.mapIndexed { idx, it ->
                    it.toEntity(summary.summaryId, summary.sessionId, idx)
                }
                if (intervals.isNotEmpty()) outboxDao.insertIntervals(intervals)

                val breakdown = summary.appBreakdown.map { it.toEntity(summary.summaryId) }
                if (breakdown.isNotEmpty()) outboxDao.insertBreakdown(breakdown)

                val digest = MessageDigest.getInstance("SHA-256")
                val fingerprint = digest.digest(repairedJson.toByteArray(StandardCharsets.UTF_8)).joinToString("") { "%02x".format(it) }

                outboxDao.updateLedgerOutcome(
                    sourceKey = sourceKey,
                    prefFile = sourcePreferenceFile,
                    newOutcome = "REMEDIATED",
                    destinationSummaryId = summary.summaryId,
                    contentFingerprint = fingerprint,
                    errorMessage = null,
                    now = now
                )

                outboxDao.incrementRemediatedCount("shared_prefs_v1_to_v2", now)
            }
            RemediationResult.Success(sourceKey, sourcePreferenceFile)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            RemediationResult.Failed(sourceKey, e.message ?: "Unknown error")
        }
    }
}
