package com.learningtracker.companion.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.learningtracker.companion.data.dao.TelemetryOutboxDao
import com.learningtracker.companion.data.entity.AppBreakdownEntity
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.LegacyMigrationLedgerEntity
import com.learningtracker.companion.data.entity.MigrationMetadataEntity
import com.learningtracker.companion.data.entity.TelemetrySummaryEntity
import com.learningtracker.companion.data.entity.TimelineIntervalEntity
import com.learningtracker.companion.model.FocusSessionContract
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class RoomTelemetryOutboxDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: TelemetryOutboxDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.telemetryOutboxDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun test01_SessionFinalizationAtomicSuccess() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_01",
            startedAt = now - 3600_000L,
            intendedDurationSeconds = 3600L,
            state = "RUNNING"
        )
        dao.insertSessionIfMissing(session)

        val summary = TelemetrySummaryEntity(
            summaryId = "sum_sess_01",
            sessionId = "sess_01",
            intendedSeconds = 3600L,
            observedWindowSeconds = 3600L,
            interruptionCount = 2,
            interruptionSeconds = 120L,
            referenceSeconds = 1800L,
            distractionSeconds = 300L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 1500L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE"
        )

        val intervals = listOf(
            TimelineIntervalEntity(
                id = "sum_sess_01_0",
                summaryId = "sum_sess_01",
                sessionId = "sess_01",
                startTime = now - 3600_000L,
                endTime = now - 1800_000L,
                durationSeconds = 1800L,
                classification = "FOCUSED",
                orderIndex = 0
            ),
            TimelineIntervalEntity(
                id = "sum_sess_01_1",
                summaryId = "sum_sess_01",
                sessionId = "sess_01",
                startTime = now - 1800_000L,
                endTime = now,
                durationSeconds = 1800L,
                classification = "DISTRACTION",
                orderIndex = 1
            )
        )

        val breakdown = listOf(
            AppBreakdownEntity(
                id = "sum_sess_01_com.study",
                summaryId = "sum_sess_01",
                packageName = "com.study",
                category = "reference",
                durationSeconds = 1800L
            )
        )

        dao.finalizeSessionAtomic(
            session = session.copy(state = "FINALIZED", endedAt = now),
            summary = summary,
            intervals = intervals,
            breakdown = breakdown
        )

        val storedSession = dao.getSessionById("sess_01")
        assertNotNull(storedSession)
        assertEquals("FINALIZED", storedSession!!.state)
        assertEquals(now, storedSession.endedAt)

        val storedSummary = dao.getSummaryById("sum_sess_01")
        assertNotNull(storedSummary)
        assertEquals("PENDING", storedSummary!!.syncState)
        assertEquals(0, storedSummary.attempts)

        val storedIntervals = dao.getIntervalsForSummary("sum_sess_01")
        assertEquals(2, storedIntervals.size)

        val storedBreakdown = dao.getBreakdownForSummary("sum_sess_01")
        assertEquals(1, storedBreakdown.size)
    }

    @Test
    fun test02_IllegalSessionStateTransitionThrows() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_cancelled",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "CANCELLED"
        )
        dao.insertSessionIfMissing(session)

        val summary = TelemetrySummaryEntity(
            summaryId = "sum_cancelled",
            sessionId = "sess_cancelled",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE"
        )

        try {
            dao.finalizeSessionAtomic(
                session = session,
                summary = summary,
                intervals = emptyList(),
                breakdown = emptyList()
            )
            fail("Expected IllegalSessionStateTransitionException")
        } catch (e: IllegalSessionStateTransitionException) {
            assertTrue(e.message!!.contains("terminal state 'CANCELLED'"))
        }

        val stored = dao.getSessionById("sess_cancelled")
        assertEquals("CANCELLED", stored!!.state)
    }

    @Test
    fun test03_MissingSessionRequiresAuthoritativeContract() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_absent",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "RUNNING"
        )

        val summary = TelemetrySummaryEntity(
            summaryId = "sum_absent",
            sessionId = "sess_absent",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE"
        )

        // Null contract throws
        try {
            dao.finalizeSessionAtomic(
                session = session,
                summary = summary,
                intervals = emptyList(),
                breakdown = emptyList(),
                authoritativeContract = null
            )
            fail("Expected MissingSessionAuthoritativeEvidenceException")
        } catch (e: MissingSessionAuthoritativeEvidenceException) {
            assertTrue(e.message!!.contains("without authoritative server contract"))
        }

        // Mismatched contract sessionId throws
        try {
            val contract = FocusSessionContract(
                sessionId = "different_session",
                startedAt = now - 1000L,
                intendedDurationSeconds = 600L
            )
            dao.finalizeSessionAtomic(
                session = session,
                summary = summary,
                intervals = emptyList(),
                breakdown = emptyList(),
                authoritativeContract = contract
            )
            fail("Expected SessionIdMismatchException")
        } catch (e: SessionIdMismatchException) {
            assertTrue(e.message!!.contains("does not match target sessionId"))
        }

        // Matching contract succeeds
        val validContract = FocusSessionContract(
            sessionId = "sess_absent",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L
        )
        dao.finalizeSessionAtomic(
            session = session,
            summary = summary,
            intervals = emptyList(),
            breakdown = emptyList(),
            authoritativeContract = validContract
        )

        val stored = dao.getSessionById("sess_absent")
        assertNotNull(stored)
        assertEquals("FINALIZED", stored!!.state)
    }

    @Test
    fun test04_RetryDeadlinePreservedOnFinalization() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_retry",
            startedAt = now - 2000L,
            intendedDurationSeconds = 1200L,
            state = "RUNNING"
        )
        dao.insertSessionIfMissing(session)

        val deadline = now + 120_000L
        val initialSummary = TelemetrySummaryEntity(
            summaryId = "sum_retry",
            sessionId = "sess_retry",
            intendedSeconds = 1200L,
            observedWindowSeconds = 1200L,
            interruptionCount = 1,
            interruptionSeconds = 30L,
            referenceSeconds = 1000L,
            distractionSeconds = 50L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 900L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "RETRY",
            attempts = 2,
            nextAttemptAt = deadline
        )
        dao.upsertSummary(initialSummary)

        // Updated finalization arrives with new interval
        val updatedSummary = initialSummary.copy(
            observedWindowSeconds = 1250L,
            interruptionCount = 2
        )
        dao.finalizeSessionAtomic(
            session = session.copy(state = "FINALIZED"),
            summary = updatedSummary,
            intervals = emptyList(),
            breakdown = emptyList()
        )

        val finalSummary = dao.getSummaryById("sum_retry")
        assertNotNull(finalSummary)
        // Next attempt deadline is strictly preserved!
        assertEquals(deadline, finalSummary!!.nextAttemptAt)
        assertEquals("RETRY", finalSummary.syncState)
        assertEquals(2, finalSummary.attempts)
    }

    @Test
    fun test05_InFlightLeaseGenerationBump() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_lease",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "RUNNING"
        )
        dao.insertSessionIfMissing(session)

        val summary = TelemetrySummaryEntity(
            summaryId = "sum_lease",
            sessionId = "sess_lease",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "IN_FLIGHT",
            claimToken = "token_worker_1",
            claimGeneration = 1L,
            leaseExpiresAt = now + 300_000L
        )
        dao.upsertSummary(summary)

        // Re-finalization arrives mid-lease:
        dao.finalizeSessionAtomic(
            session = session.copy(state = "FINALIZED"),
            summary = summary.copy(interruptionCount = 1),
            intervals = emptyList(),
            breakdown = emptyList()
        )

        val postFinalize = dao.getSummaryById("sum_lease")
        assertNotNull(postFinalize)
        assertEquals(2L, postFinalize!!.claimGeneration) // Generation bumped!
        assertNull(postFinalize.claimToken)

        // Worker 1 tries to mark delivered with old generation 1:
        val rowsUpdated = dao.markDelivered(
            summaryId = "sum_lease",
            claimToken = "token_worker_1",
            claimGeneration = 1L,
            now = now + 1000L
        )
        // Updates 0 rows because generation was invalidated!
        assertEquals(0, rowsUpdated)
    }

    @Test
    fun test06_ExhaustedAttemptsSweep() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_exh",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "FINALIZED"
        )
        dao.insertSessionIfMissing(session)

        // Record with attempts = 10 in RETRY
        val summary1 = TelemetrySummaryEntity(
            summaryId = "sum_exh_1",
            sessionId = "sess_exh",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "RETRY",
            attempts = 10
        )
        dao.upsertSummary(summary1)

        // Record with attempts = 10 in expired IN_FLIGHT
        val summary2 = TelemetrySummaryEntity(
            summaryId = "sum_exh_2",
            sessionId = "sess_exh",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "IN_FLIGHT",
            claimToken = "old_token",
            claimGeneration = 1L,
            leaseExpiresAt = now - 5000L, // Expired
            attempts = 10
        )
        dao.upsertSummary(summary2)

        val swept = dao.sweepExhaustedAttempts(now)
        assertEquals(2, swept)

        val res1 = dao.getSummaryById("sum_exh_1")
        assertEquals("PERMANENT_ERROR", res1!!.syncState)

        val res2 = dao.getSummaryById("sum_exh_2")
        assertEquals("PERMANENT_ERROR", res2!!.syncState)
    }

    @Test
    fun test07_StaleLeaseSweep() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_stale",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "FINALIZED"
        )
        dao.insertSessionIfMissing(session)

        val summary = TelemetrySummaryEntity(
            summaryId = "sum_stale",
            sessionId = "sess_stale",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "IN_FLIGHT",
            claimToken = "stale_token",
            claimGeneration = 1L,
            leaseExpiresAt = now - 10_000L, // Expired
            attempts = 3
        )
        dao.upsertSummary(summary)

        val swept = dao.sweepAllStaleLeases(now)
        assertEquals(1, swept)

        val res = dao.getSummaryById("sum_stale")
        assertEquals("RETRY", res!!.syncState)
        assertNull(res.claimToken)
    }

    @Test
    fun test08_DueAndFutureRetryQueries() = runBlocking {
        val now = System.currentTimeMillis()
        val session = FocusSessionEntity(
            sessionId = "sess_queries",
            startedAt = now - 1000L,
            intendedDurationSeconds = 600L,
            state = "FINALIZED"
        )
        dao.insertSessionIfMissing(session)

        // Pending record -> counts as due
        val pending = TelemetrySummaryEntity(
            summaryId = "sum_p",
            sessionId = "sess_queries",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "PENDING"
        )
        dao.upsertSummary(pending)

        // Retry past deadline -> counts as due
        val dueRetry = TelemetrySummaryEntity(
            summaryId = "sum_due",
            sessionId = "sess_queries",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "RETRY",
            nextAttemptAt = now - 5000L
        )
        dao.upsertSummary(dueRetry)

        // Future retry -> future deadline
        val futureRetry = TelemetrySummaryEntity(
            summaryId = "sum_future",
            sessionId = "sess_queries",
            intendedSeconds = 600L,
            observedWindowSeconds = 600L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 600L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            collectionStatus = "COMPLETE",
            boundaryConfidence = "AUTHORITATIVE",
            syncState = "RETRY",
            nextAttemptAt = now + 60_000L
        )
        dao.upsertSummary(futureRetry)

        val dueCount = dao.countDueOrPendingRecords(now)
        assertEquals(2, dueCount) // sum_p + sum_due

        val earliestFuture = dao.getEarliestFutureRetryDeadline(now)
        assertEquals(now + 60_000L, earliestFuture)
    }

    @Test
    fun test09_LedgerPersistenceAndRemediation() = runBlocking {
        val entry = LegacyMigrationLedgerEntity(
            sourceKey = "telemetry:sum_legacy",
            sourcePreferenceFile = "learningtracker_telemetry",
            contentFingerprint = "sha256_initial_hash",
            outcome = "QUARANTINED",
            errorMessage = "Corrupt JSON"
        )
        dao.insertLedgerEntry(entry)

        val retrieved = dao.getLedgerEntry("telemetry:sum_legacy", "learningtracker_telemetry")
        assertNotNull(retrieved)
        assertEquals("QUARANTINED", retrieved!!.outcome)

        val now = System.currentTimeMillis()
        val updatedRows = dao.updateLedgerOutcome(
            sourceKey = "telemetry:sum_legacy",
            prefFile = "learningtracker_telemetry",
            newOutcome = "REMEDIATED",
            destinationSummaryId = "sum_repaired",
            contentFingerprint = "sha256_repaired_hash",
            errorMessage = null,
            now = now
        )
        assertEquals(1, updatedRows)

        val remediated = dao.getLedgerEntry("telemetry:sum_legacy", "learningtracker_telemetry")
        assertNotNull(remediated)
        assertEquals("REMEDIATED", remediated!!.outcome)
        assertEquals("sum_repaired", remediated.destinationSummaryId)
        assertEquals("sha256_repaired_hash", remediated.contentFingerprint)
        assertNull(remediated.errorMessage)
    }
}
