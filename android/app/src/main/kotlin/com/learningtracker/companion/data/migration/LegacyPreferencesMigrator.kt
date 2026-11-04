package com.learningtracker.companion.data.migration

import android.content.Context
import androidx.room.withTransaction
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.MigrationAccountingException
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.LegacyMigrationLedgerEntity
import com.learningtracker.companion.data.entity.MigrationMetadataEntity
import com.learningtracker.companion.data.entity.toEntity
import com.learningtracker.companion.data.entity.toSummaryEntity
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.util.CompanionPreferences
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

sealed class MigrationResult {
    data class Success(val validMigrated: Int) : MigrationResult()
    data class PartialWithQuarantine(val validMigrated: Int, val quarantinedCount: Int) : MigrationResult()
    object AlreadyCompleted : MigrationResult()
    data class Failed(val cause: Throwable) : MigrationResult()
}

data class ImmutableMigrationSnapshot(
    val telemetryMap: Map<String, Any?>, // Retains all types for explicit quarantine
    val metaAttempts: Map<String, Int>,
    val metaLastErrors: Map<String, String?>,
    val metaLastAttempts: Map<String, Long>,
    val metaCreatedAt: Map<String, Long>,
    val rawActiveSessionJson: String?
)

class LegacyPreferencesMigrator(
    private val context: Context,
    private val gate: DatabaseAccessGate,
    private val coordinator: LegacyStorageCoordinator,
    private val legacyBarrier: LegacyStorageBarrier
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun performMigration(): MigrationResult = coordinator.migrationMutex.withLock {
        val previousRoute = coordinator.currentRoute.get()
        try {
            gate.withAccess { database ->
                val outboxDao = database.telemetryOutboxDao()
                val prefs = CompanionPreferences(context)

                // Fast-path check: Room metadata is authoritative
                val existingMeta = outboxDao.getMigrationMetadata("shared_prefs_v1_to_v2")
                if (existingMeta?.status == "COMPLETED") {
                    coordinator.currentRoute.set(StorageRoutingMode.ROOM_PRIMARY)
                    prefs.isRoomMigrationComplete = true
                    return@withAccess MigrationResult.AlreadyCompleted
                }

                // Hold writer lock across BOTH snapshot extraction AND Room commit
                coordinator.currentRoute.set(StorageRoutingMode.MIGRATING_HOLD)

                legacyBarrier.withWriterLock {
                    val telemetryPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
                    val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
                    val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)

                    val telMap = mutableMapOf<String, Any?>()
                    telemetryPrefs.all.forEach { (k, v) -> telMap[k] = v }

                    val attemptsMap = mutableMapOf<String, Int>()
                    val errorsMap = mutableMapOf<String, String?>()
                    val lastAttemptsMap = mutableMapOf<String, Long>()
                    val createdAtMap = mutableMapOf<String, Long>()

                    telMap.keys.forEach { summaryId ->
                        attemptsMap[summaryId] = metaPrefs.getInt("${summaryId}_attempts", 0)
                        errorsMap[summaryId] = metaPrefs.getString("${summaryId}_last_error", null)
                        lastAttemptsMap[summaryId] = metaPrefs.getLong("${summaryId}_last_attempt", 0L)
                        createdAtMap[summaryId] = metaPrefs.getLong("${summaryId}_created_at", 0L)
                    }

                    val snapshot = ImmutableMigrationSnapshot(
                        telemetryMap = telMap,
                        metaAttempts = attemptsMap,
                        metaLastErrors = errorsMap,
                        metaLastAttempts = lastAttemptsMap,
                        metaCreatedAt = createdAtMap,
                        rawActiveSessionJson = activePrefs.getString("active_session_json", null)
                    )

                    val hasActive = !snapshot.rawActiveSessionJson.isNullOrBlank()

                    val nTelemetry = snapshot.telemetryMap.size
                    val nActive = if (hasActive) 1 else 0
                    val totalExpected = nTelemetry + nActive

                    val now = System.currentTimeMillis()

                    if (totalExpected == 0) {
                        database.withTransaction {
                            outboxDao.setMigrationMetadata(
                                MigrationMetadataEntity(
                                    migrationKey = "shared_prefs_v1_to_v2",
                                    status = "COMPLETED",
                                    totalExpected = 0,
                                    validMigrated = 0,
                                    quarantinedCount = 0,
                                    remediatedCount = 0,
                                    completedAt = now
                                )
                            )
                        }
                        coordinator.currentRoute.set(StorageRoutingMode.ROOM_PRIMARY)
                        prefs.isRoomMigrationComplete = true
                        return@withWriterLock MigrationResult.Success(0)
                    }

                    val existingLedger = outboxDao.getAllLedgerEntries().associateBy { "${it.sourcePreferenceFile}:${it.sourceKey}" }

                    var validCount = 0
                    var quarantinedCount = 0

                    database.withTransaction {
                        // A. Active Session Migration
                        if (hasActive) {
                            val activeKey = "active_session:active_session_json"
                            val prefFile = "learningtracker_active_session"
                            val raw = snapshot.rawActiveSessionJson!!
                            val fingerprint = computeSha256(raw)
                            val existing = existingLedger["$prefFile:$activeKey"]

                            if (existing != null && existing.outcome == "MIGRATED_VALID" && existing.contentFingerprint == fingerprint) {
                                validCount++
                            } else if (existing != null && existing.outcome == "QUARANTINED" && existing.contentFingerprint == fingerprint) {
                                quarantinedCount++
                            } else {
                                try {
                                    val activeContract = json.decodeFromString<FocusSessionContract>(raw)
                                    outboxDao.insertSessionIfMissing(activeContract.toEntity(state = "RUNNING"))
                                    outboxDao.insertLedgerEntry(
                                        LegacyMigrationLedgerEntity(
                                            sourceKey = activeKey,
                                            sourcePreferenceFile = prefFile,
                                            contentFingerprint = fingerprint,
                                            outcome = "MIGRATED_VALID",
                                            destinationSummaryId = null,
                                            migratedAt = now
                                        )
                                    )
                                    validCount++
                                } catch (e: CancellationException) {
                                    throw e
                                } catch (e: Exception) {
                                    outboxDao.insertLedgerEntry(
                                        LegacyMigrationLedgerEntity(
                                            sourceKey = activeKey,
                                            sourcePreferenceFile = prefFile,
                                            contentFingerprint = fingerprint,
                                            outcome = "QUARANTINED",
                                            errorMessage = "SerializationException: ${e.message}",
                                            migratedAt = now
                                        )
                                    )
                                    quarantinedCount++
                                }
                            }
                        }

                        // B. Telemetry Summaries Migration
                        for ((key, rawValue) in snapshot.telemetryMap) {
                            val namespacedKey = "telemetry:$key"
                            val prefFile = "learningtracker_telemetry"
                            val existing = existingLedger["$prefFile:$namespacedKey"]

                            // Explicitly quarantine non-string values
                            if (rawValue !is String) {
                                val err = "Non-string preference value: ${rawValue?.javaClass?.simpleName ?: "null"}"
                                val fp = computeSha256(rawValue?.toString() ?: "null")
                                outboxDao.insertLedgerEntry(
                                    LegacyMigrationLedgerEntity(
                                        sourceKey = namespacedKey,
                                        sourcePreferenceFile = prefFile,
                                        contentFingerprint = fp,
                                        outcome = "QUARANTINED",
                                        errorMessage = err,
                                        migratedAt = now
                                    )
                                )
                                quarantinedCount++
                                continue
                            }

                            val fingerprint = computeSha256(rawValue)

                            // Compare Fingerprint against existing ledger
                            if (existing != null) {
                                if (existing.contentFingerprint == fingerprint) {
                                    if (existing.outcome == "MIGRATED_VALID" || existing.outcome == "REMEDIATED") {
                                        validCount++
                                        continue
                                    } else if (existing.outcome == "QUARANTINED") {
                                        quarantinedCount++
                                        continue
                                    }
                                } else {
                                    // Fingerprint changed! Handle post-migration modification
                                    val destination = existing.destinationSummaryId?.let { outboxDao.getSummaryById(it) }
                                    if (destination != null && destination.syncState in listOf("DELIVERED", "IN_FLIGHT")) {
                                        outboxDao.insertLedgerEntry(
                                            LegacyMigrationLedgerEntity(
                                                sourceKey = namespacedKey,
                                                sourcePreferenceFile = prefFile,
                                                contentFingerprint = fingerprint,
                                                outcome = "QUARANTINED",
                                                errorMessage = "Source content changed post-migration while destination in Room is ${destination.syncState}",
                                                migratedAt = now
                                            )
                                        )
                                        quarantinedCount++
                                        continue
                                    }
                                    // If destination is PENDING or RETRY, permit safe update below
                                }
                            }

                            try {
                                val summary = json.decodeFromString<FocusSummary>(rawValue)
                                val attempts = snapshot.metaAttempts[summary.summaryId] ?: 0
                                val lastError = snapshot.metaLastErrors[summary.summaryId]
                                val lastAttempt = snapshot.metaLastAttempts[summary.summaryId]?.takeIf { it > 0 }

                                val sessionEntity = FocusSessionEntity(
                                    sessionId = summary.sessionId,
                                    startedAt = (summary.timestamp - (summary.observedWindowSeconds * 1000L)).coerceAtLeast(0L),
                                    intendedDurationSeconds = summary.intendedSeconds,
                                    endedAt = summary.timestamp,
                                    state = "FINALIZED"
                                )
                                outboxDao.insertSessionIfMissing(sessionEntity)

                                val targetSyncState = if (attempts >= 10) "PERMANENT_ERROR" else "PENDING"
                                val createdAt = snapshot.metaCreatedAt[summary.summaryId]?.takeIf { it > 0L } ?: summary.timestamp
                                val summaryEntity = summary.toSummaryEntity().copy(
                                    attempts = attempts,
                                    lastError = lastError,
                                    lastAttemptAt = lastAttempt,
                                    createdAt = createdAt,
                                    syncState = targetSyncState,
                                    updatedAt = now
                                )
                                outboxDao.upsertSummary(summaryEntity)

                                val intervals = summary.timeline.mapIndexed { idx, it ->
                                    it.toEntity(summary.summaryId, summary.sessionId, idx)
                                }
                                outboxDao.deleteIntervalsForSummary(summary.summaryId)
                                if (intervals.isNotEmpty()) outboxDao.insertIntervals(intervals)

                                val breakdown = summary.appBreakdown.map { it.toEntity(summary.summaryId) }
                                outboxDao.deleteBreakdownForSummary(summary.summaryId)
                                if (breakdown.isNotEmpty()) outboxDao.insertBreakdown(breakdown)

                                outboxDao.insertLedgerEntry(
                                    LegacyMigrationLedgerEntity(
                                        sourceKey = namespacedKey,
                                        sourcePreferenceFile = prefFile,
                                        contentFingerprint = fingerprint,
                                        outcome = "MIGRATED_VALID",
                                        destinationSummaryId = summary.summaryId,
                                        migratedAt = now
                                    )
                                )
                                validCount++
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                outboxDao.insertLedgerEntry(
                                    LegacyMigrationLedgerEntity(
                                        sourceKey = namespacedKey,
                                        sourcePreferenceFile = prefFile,
                                        contentFingerprint = fingerprint,
                                        outcome = "QUARANTINED",
                                        errorMessage = "SerializationException: ${e.message}",
                                        migratedAt = now
                                    )
                                )
                                quarantinedCount++
                            }
                        }

                        // C. Accounting Invariant Verification: Valid + Quarantined == N_expected
                        val totalAccounted = validCount + quarantinedCount
                        if (totalAccounted != totalExpected) {
                            throw MigrationAccountingException("Expected $totalExpected records, accounted for $totalAccounted (valid: $validCount, quarantined: $quarantinedCount)")
                        }

                        val finalStatus = if (quarantinedCount == 0) "COMPLETED" else "PARTIAL_QUARANTINED"
                        outboxDao.setMigrationMetadata(
                            MigrationMetadataEntity(
                                migrationKey = "shared_prefs_v1_to_v2",
                                status = finalStatus,
                                totalExpected = totalExpected,
                                validMigrated = validCount,
                                quarantinedCount = quarantinedCount,
                                remediatedCount = 0,
                                completedAt = now
                            )
                        )
                    }

                    // Cutover complete: switch route to ROOM_PRIMARY before releasing writer barrier
                    coordinator.currentRoute.set(StorageRoutingMode.ROOM_PRIMARY)

                    if (quarantinedCount == 0) {
                        prefs.isRoomMigrationComplete = true
                        MigrationResult.Success(validCount)
                    } else {
                        prefs.isRoomMigrationComplete = false
                        MigrationResult.PartialWithQuarantine(validCount, quarantinedCount)
                    }
                }
            }
        } catch (e: CancellationException) {
            coordinator.currentRoute.set(previousRoute)
            throw e
        } catch (e: Exception) {
            coordinator.currentRoute.set(StorageRoutingMode.MIGRATION_FAILED)
            MigrationResult.Failed(e)
        }
    }

    private fun computeSha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(input.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }
}
