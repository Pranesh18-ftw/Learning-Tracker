package com.learningtracker.companion.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.learningtracker.companion.data.IllegalSessionStateTransitionException
import com.learningtracker.companion.data.MissingSessionAuthoritativeEvidenceException
import com.learningtracker.companion.data.SessionIdMismatchException
import com.learningtracker.companion.data.entity.AppBreakdownEntity
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.LegacyMigrationLedgerEntity
import com.learningtracker.companion.data.entity.MigrationMetadataEntity
import com.learningtracker.companion.data.entity.TelemetrySummaryEntity
import com.learningtracker.companion.data.entity.TimelineIntervalEntity
import com.learningtracker.companion.model.FocusSessionContract

@Dao
abstract class TelemetryOutboxDao {

    // --- Session Mutations ---

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    abstract suspend fun insertSessionIfMissing(session: FocusSessionEntity): Long

    @Query("""
        UPDATE focus_sessions 
        SET state = 'FINALIZED', 
            endedAt = COALESCE(:endedAt, endedAt, :now), 
            boundaryConfidence = :boundaryConfidence, 
            updatedAt = :now 
        WHERE sessionId = :sessionId AND state = 'RUNNING'
    """)
    abstract suspend fun transitionRunningSessionToFinalized(
        sessionId: String,
        endedAt: Long?,
        boundaryConfidence: String,
        now: Long
    ): Int

    @Query("""
        UPDATE focus_sessions 
        SET endedAt = COALESCE(:endedAt, endedAt), 
            boundaryConfidence = :boundaryConfidence, 
            updatedAt = :now 
        WHERE sessionId = :sessionId AND state = 'FINALIZED'
    """)
    abstract suspend fun updateExistingFinalizedSession(
        sessionId: String,
        endedAt: Long?,
        boundaryConfidence: String,
        now: Long
    ): Int

    @Query("SELECT * FROM focus_sessions WHERE sessionId = :sessionId")
    abstract suspend fun getSessionById(sessionId: String): FocusSessionEntity?

    // --- Summary Mutations ---

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsertSummary(summary: TelemetrySummaryEntity): Long

    @Query("SELECT * FROM telemetry_summaries WHERE summaryId = :summaryId")
    abstract suspend fun getSummaryById(summaryId: String): TelemetrySummaryEntity?

    // --- Child Telemetry Purging ---

    @Query("DELETE FROM timeline_intervals WHERE summaryId = :summaryId")
    abstract suspend fun deleteIntervalsForSummary(summaryId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertIntervals(intervals: List<TimelineIntervalEntity>)

    @Query("SELECT * FROM timeline_intervals WHERE summaryId = :summaryId ORDER BY orderIndex ASC")
    abstract suspend fun getIntervalsForSummary(summaryId: String): List<TimelineIntervalEntity>

    @Query("DELETE FROM app_breakdown WHERE summaryId = :summaryId")
    abstract suspend fun deleteBreakdownForSummary(summaryId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertBreakdown(items: List<AppBreakdownEntity>)

    @Query("SELECT * FROM app_breakdown WHERE summaryId = :summaryId")
    abstract suspend fun getBreakdownForSummary(summaryId: String): List<AppBreakdownEntity>

    // --- Outbox Queries & Strict Ownership Validation ---

    @Query("""
        SELECT * FROM telemetry_summaries 
        WHERE attempts < 10 
          AND (
            (syncState IN ('PENDING', 'RETRY') AND (nextAttemptAt IS NULL OR nextAttemptAt <= :now))
            OR (syncState = 'IN_FLIGHT' AND (leaseExpiresAt IS NULL OR leaseExpiresAt < :now))
          )
        ORDER BY createdAt ASC 
        LIMIT :batchSize
    """)
    abstract suspend fun getEligibleOutboxBatch(now: Long, batchSize: Int = 10): List<TelemetrySummaryEntity>

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'IN_FLIGHT', 
            claimToken = :newClaimToken, 
            claimGeneration = claimGeneration + 1, 
            leaseExpiresAt = :leaseExpiresAt, 
            lastAttemptAt = :now, 
            attempts = attempts + 1, 
            updatedAt = :now 
        WHERE summaryId = :summaryId 
          AND attempts < 10
          AND (
            (syncState IN ('PENDING', 'RETRY') AND (nextAttemptAt IS NULL OR nextAttemptAt <= :now))
            OR (syncState = 'IN_FLIGHT' AND (leaseExpiresAt IS NULL OR leaseExpiresAt < :now))
          )
    """)
    abstract suspend fun claimForUploadWithToken(
        summaryId: String,
        newClaimToken: String,
        now: Long,
        leaseExpiresAt: Long
    ): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'DELIVERED', 
            deliveredAt = :now, 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            nextAttemptAt = NULL,
            lastError = NULL, 
            updatedAt = :now 
        WHERE summaryId = :summaryId 
          AND syncState = 'IN_FLIGHT' 
          AND claimToken = :claimToken 
          AND claimGeneration = :claimGeneration 
          AND leaseExpiresAt >= :now
    """)
    abstract suspend fun markDelivered(
        summaryId: String,
        claimToken: String,
        claimGeneration: Long,
        now: Long
    ): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'RETRY', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            nextAttemptAt = :nextAttemptAt,
            lastError = :error, 
            updatedAt = :now 
        WHERE summaryId = :summaryId 
          AND syncState = 'IN_FLIGHT' 
          AND claimToken = :claimToken 
          AND claimGeneration = :claimGeneration 
          AND leaseExpiresAt >= :now
    """)
    abstract suspend fun markRetry(
        summaryId: String,
        claimToken: String,
        claimGeneration: Long,
        error: String,
        nextAttemptAt: Long?,
        now: Long
    ): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'CONFLICT', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            nextAttemptAt = NULL,
            lastError = :error, 
            updatedAt = :now 
        WHERE summaryId = :summaryId 
          AND syncState = 'IN_FLIGHT' 
          AND claimToken = :claimToken 
          AND claimGeneration = :claimGeneration 
          AND leaseExpiresAt >= :now
    """)
    abstract suspend fun markConflict(
        summaryId: String,
        claimToken: String,
        claimGeneration: Long,
        error: String,
        now: Long
    ): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'PERMANENT_ERROR', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            nextAttemptAt = NULL,
            lastError = :error, 
            updatedAt = :now 
        WHERE summaryId = :summaryId 
          AND syncState = 'IN_FLIGHT' 
          AND claimToken = :claimToken 
          AND claimGeneration = :claimGeneration 
          AND leaseExpiresAt >= :now
    """)
    abstract suspend fun markPermanentError(
        summaryId: String,
        claimToken: String,
        claimGeneration: Long,
        error: String,
        now: Long
    ): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'RETRY', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            lastError = 'Stale lease expired and swept', 
            updatedAt = :now 
        WHERE syncState = 'IN_FLIGHT' AND (leaseExpiresAt IS NULL OR leaseExpiresAt < :now)
    """)
    abstract suspend fun sweepAllStaleLeases(now: Long): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'PERMANENT_ERROR', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            lastError = 'Exhausted maximum retry attempts (>= 10)', 
            updatedAt = :now 
        WHERE attempts >= 10 
          AND (
            syncState IN ('PENDING', 'RETRY') 
            OR (syncState = 'IN_FLIGHT' AND (leaseExpiresAt IS NULL OR leaseExpiresAt < :now))
          )
    """)
    abstract suspend fun sweepExhaustedAttempts(now: Long): Int

    @Query("""
        UPDATE telemetry_summaries 
        SET syncState = 'PERMANENT_ERROR', 
            claimToken = NULL, 
            leaseExpiresAt = NULL, 
            nextAttemptAt = NULL, 
            lastError = :reason, 
            updatedAt = :now 
        WHERE syncState IN ('PENDING', 'RETRY', 'IN_FLIGHT')
    """)
    abstract suspend fun markAllPendingAsRevoked(reason: String, now: Long): Int

    @Query("""
        SELECT COUNT(*) FROM telemetry_summaries 
        WHERE attempts < 10 
          AND (
            (syncState = 'PENDING') 
            OR (syncState = 'RETRY' AND (nextAttemptAt IS NULL OR nextAttemptAt <= :now))
            OR (syncState = 'IN_FLIGHT' AND (leaseExpiresAt IS NULL OR leaseExpiresAt < :now))
          )
    """)
    abstract suspend fun countDueOrPendingRecords(now: Long): Int

    @Query("""
        SELECT MIN(nextAttemptAt) 
        FROM telemetry_summaries 
        WHERE syncState = 'RETRY' 
          AND nextAttemptAt IS NOT NULL 
          AND nextAttemptAt > :now
    """)
    abstract suspend fun getEarliestFutureRetryDeadline(now: Long): Long?

    // --- Pruning Query ---

    @Query("DELETE FROM telemetry_summaries WHERE syncState = 'DELIVERED' AND deliveredAt < :threshold")
    abstract suspend fun pruneDeliveredSummaries(threshold: Long): Int

    // --- Per-Source Ledger Queries ---

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertLedgerEntry(entry: LegacyMigrationLedgerEntity)

    @Query("SELECT * FROM legacy_migration_ledger WHERE sourceKey = :sourceKey AND sourcePreferenceFile = :prefFile")
    abstract suspend fun getLedgerEntry(sourceKey: String, prefFile: String): LegacyMigrationLedgerEntity?

    @Query("SELECT * FROM legacy_migration_ledger WHERE outcome = 'QUARANTINED'")
    abstract suspend fun getAllQuarantinedLedgerEntries(): List<LegacyMigrationLedgerEntity>

    @Query("SELECT * FROM legacy_migration_ledger")
    abstract suspend fun getAllLedgerEntries(): List<LegacyMigrationLedgerEntity>

    @Query("""
        UPDATE legacy_migration_ledger 
        SET outcome = :newOutcome, 
            destinationSummaryId = :destinationSummaryId, 
            contentFingerprint = :contentFingerprint, 
            errorMessage = :errorMessage,
            remediatedAt = :now 
        WHERE sourceKey = :sourceKey AND sourcePreferenceFile = :prefFile
    """)
    abstract suspend fun updateLedgerOutcome(
        sourceKey: String,
        prefFile: String,
        newOutcome: String,
        destinationSummaryId: String?,
        contentFingerprint: String,
        errorMessage: String?,
        now: Long
    ): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun setMigrationMetadata(metadata: MigrationMetadataEntity)

    @Query("SELECT * FROM migration_metadata WHERE migrationKey = :key")
    abstract suspend fun getMigrationMetadata(key: String): MigrationMetadataEntity?

    @Query("""
        UPDATE migration_metadata 
        SET validMigrated = validMigrated + 1, 
            quarantinedCount = quarantinedCount - 1, 
            remediatedCount = remediatedCount + 1, 
            completedAt = :now 
        WHERE migrationKey = :key
    """)
    abstract suspend fun incrementRemediatedCount(key: String, now: Long): Int

    // --- CONCRETE ENFORCED ROOM TRANSACTION ---

    @Transaction
    open suspend fun finalizeSessionAtomic(
        session: FocusSessionEntity,
        summary: TelemetrySummaryEntity,
        intervals: List<TimelineIntervalEntity>,
        breakdown: List<AppBreakdownEntity>,
        authoritativeContract: FocusSessionContract? = null
    ) {
        val now = System.currentTimeMillis()

        // 1. Session Transition Rules: ONLY RUNNING may transition to FINALIZED
        val existingSession = getSessionById(session.sessionId)
        if (existingSession != null) {
            when (existingSession.state) {
                "RUNNING" -> {
                    val updated = transitionRunningSessionToFinalized(
                        sessionId = session.sessionId,
                        endedAt = session.endedAt ?: now,
                        boundaryConfidence = session.boundaryConfidence,
                        now = now
                    )
                    if (updated == 0) throw IllegalStateException("Failed to transition session ${session.sessionId} from RUNNING to FINALIZED")
                }
                "FINALIZED" -> {
                    updateExistingFinalizedSession(
                        sessionId = session.sessionId,
                        endedAt = session.endedAt,
                        boundaryConfidence = session.boundaryConfidence,
                        now = now
                    )
                }
                "CANCELLED", "SUPERSEDED" -> {
                    throw IllegalSessionStateTransitionException(
                        "Illegal transition: Session ${session.sessionId} is in terminal state '${existingSession.state}' and cannot transition to FINALIZED"
                    )
                }
                else -> throw IllegalSessionStateTransitionException("Unknown state '${existingSession.state}'")
            }
        } else {
            val contract = authoritativeContract ?: throw MissingSessionAuthoritativeEvidenceException(
                "Cannot insert absent session ${session.sessionId} as FINALIZED without authoritative server contract"
            )
            if (contract.sessionId != session.sessionId) {
                throw SessionIdMismatchException(
                    "Authoritative contract sessionId '${contract.sessionId}' does not match target sessionId '${session.sessionId}'"
                )
            }
            insertSessionIfMissing(session.copy(state = "FINALIZED", updatedAt = now))
        }

        // 2. Protect Terminal Summary States & Handle In-Flight Super-session
        val existingSummary = getSummaryById(summary.summaryId)
        val targetGeneration: Long
        if (existingSummary != null) {
            if (existingSummary.syncState in listOf("DELIVERED", "CONFLICT", "PERMANENT_ERROR")) {
                return
            }
            if (existingSummary.syncState == "IN_FLIGHT" && existingSummary.leaseExpiresAt != null && existingSummary.leaseExpiresAt > now) {
                targetGeneration = existingSummary.claimGeneration + 1L
            } else {
                targetGeneration = existingSummary.claimGeneration
            }
        } else {
            targetGeneration = 0L
        }

        // 3. Upsert Summary Preserving Attempt Counters AND Retry-After Deadlines
        val targetAttempts = existingSummary?.attempts ?: 0
        val targetLastError = existingSummary?.lastError
        val targetNextAttemptAt = existingSummary?.nextAttemptAt
        val targetSyncState = when {
            targetAttempts >= 10 -> "PERMANENT_ERROR"
            targetNextAttemptAt != null && targetNextAttemptAt > now -> "RETRY"
            else -> "PENDING"
        }

        upsertSummary(
            summary.copy(
                syncState = targetSyncState,
                attempts = targetAttempts,
                claimToken = null,
                claimGeneration = targetGeneration,
                leaseExpiresAt = null,
                nextAttemptAt = targetNextAttemptAt,
                lastError = targetLastError,
                updatedAt = now
            )
        )

        // 4. Purge Obsolete Child Records Before Replacement
        deleteIntervalsForSummary(summary.summaryId)
        deleteBreakdownForSummary(summary.summaryId)

        // 5. Insert Fresh Child Data
        if (intervals.isNotEmpty()) insertIntervals(intervals)
        if (breakdown.isNotEmpty()) insertBreakdown(breakdown)
    }

    @Query("SELECT * FROM telemetry_summaries ORDER BY createdAt DESC")
    abstract suspend fun getAllSummaries(): List<TelemetrySummaryEntity>

    @Query("SELECT * FROM telemetry_summaries WHERE syncState IN ('PENDING', 'RETRY') ORDER BY createdAt DESC")
    abstract suspend fun getPendingSummaries(): List<TelemetrySummaryEntity>

    @Query("DELETE FROM telemetry_summaries WHERE summaryId = :summaryId")
    abstract suspend fun deleteSummaryById(summaryId: String): Int

    @Query("DELETE FROM telemetry_summaries")
    abstract suspend fun deleteAllSummaries(): Int

    @Transaction
    open suspend fun deleteSummaryAndChildren(summaryId: String): Int {
        deleteIntervalsForSummary(summaryId)
        deleteBreakdownForSummary(summaryId)
        return deleteSummaryById(summaryId)
    }

    @Transaction
    open suspend fun deleteAllSummariesAndChildren(): Int {
        val summaries = getAllSummaries()
        for (s in summaries) {
            deleteIntervalsForSummary(s.summaryId)
            deleteBreakdownForSummary(s.summaryId)
        }
        return deleteAllSummaries()
    }

    @Query("SELECT * FROM focus_sessions WHERE state = 'RUNNING' ORDER BY startedAt DESC LIMIT 1")
    abstract suspend fun getRunningSession(): FocusSessionEntity?

    @Query("UPDATE focus_sessions SET state = 'CANCELLED', updatedAt = :now WHERE state = 'RUNNING'")
    abstract suspend fun cancelRunningSessions(now: Long = System.currentTimeMillis()): Int
}

