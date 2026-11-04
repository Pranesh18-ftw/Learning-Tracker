package com.learningtracker.companion.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.learningtracker.companion.model.AppBreakdownSummary
import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.BoundaryConfidence
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.model.TimelineInterval
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.security.JvmTestCryptoEngine
import com.learningtracker.companion.security.SecureCredentialStore
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RoomTelemetryStorageTest {

    private lateinit var context: Context
    private lateinit var db: AppDatabase
    private lateinit var gate: DatabaseAccessGate
    private lateinit var storage: RoomTelemetryStorage

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        gate = DatabaseAccessGate { db }
        storage = RoomTelemetryStorage(gate)
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun createSampleSummary(
        id: String,
        sessionId: String = "sess_$id",
        syncState: String = "PENDING",
        timeline: List<TimelineInterval> = emptyList(),
        breakdown: List<AppBreakdownSummary> = emptyList()
    ): FocusSummary {
        return FocusSummary(
            sessionId = sessionId,
            summaryId = id,
            intendedSeconds = 1800L,
            observedWindowSeconds = 1800L,
            interruptionCount = 2,
            interruptionSeconds = 120L,
            referenceSeconds = 1200L,
            distractionSeconds = 60L,
            unknownSeconds = 420L,
            longestUninterruptedSeconds = 600L,
            timeline = timeline,
            appBreakdown = breakdown,
            collectionStatus = CollectionStatus.COMPLETE,
            boundaryConfidence = BoundaryConfidence.AUTHORITATIVE,
            timestamp = 1700000000000L,
            syncState = syncState
        )
    }

    // 1. Save and retrieve summary
    @Test
    fun test01_SaveAndRetrieveSummary() {
        val summary = createSampleSummary("sum_01", "sess_01")
        storage.saveSummary(summary)

        val retrieved = storage.getSummary("sum_01")
        assertNotNull("Summary should be retrieved", retrieved)
        assertEquals("sum_01", retrieved!!.summaryId)
        assertEquals("sess_01", retrieved.sessionId)
        assertEquals(1800L, retrieved.intendedSeconds)
        assertEquals(1800L, retrieved.observedWindowSeconds)
        assertEquals(2, retrieved.interruptionCount)
        assertEquals(CollectionStatus.COMPLETE, retrieved.collectionStatus)
        assertEquals(BoundaryConfidence.AUTHORITATIVE, retrieved.boundaryConfidence)
        assertEquals("PENDING", retrieved.syncState)
    }

    // 2. Save summary with timeline and app breakdown
    @Test
    fun test02_SaveSummaryWithTimelineAndAppBreakdown() {
        val intervals = listOf(
            TimelineInterval(
                id = "int_01",
                startTime = 1000L,
                endTime = 1600L,
                durationSeconds = 600L,
                classification = "FOCUSED",
                packageName = "org.wikipedia",
                appCategory = "reference"
            ),
            TimelineInterval(
                id = "int_02",
                startTime = 1600L,
                endTime = 2000L,
                durationSeconds = 400L,
                classification = "DISTRACTION",
                packageName = "com.instagram.android",
                appCategory = "distraction"
            )
        )
        val breakdown = listOf(
            AppBreakdownSummary("org.wikipedia", AppCategory.REFERENCE, 600L),
            AppBreakdownSummary("com.instagram.android", AppCategory.DISTRACTION, 400L)
        )
        val summary = createSampleSummary("sum_with_children", "sess_children", timeline = intervals, breakdown = breakdown)
        storage.saveSummary(summary)

        val retrieved = storage.getSummary("sum_with_children")
        assertNotNull(retrieved)
        assertEquals(2, retrieved!!.timeline.size)
        assertEquals("org.wikipedia", retrieved.timeline[0].packageName)
        assertEquals("com.instagram.android", retrieved.timeline[1].packageName)
        assertEquals(2, retrieved.appBreakdown.size)
        assertEquals(AppCategory.REFERENCE, retrieved.appBreakdown[0].category)
        assertEquals(AppCategory.DISTRACTION, retrieved.appBreakdown[1].category)
    }

    // 3. Retrieve pending summaries
    @Test
    fun test03_RetrievePendingSummaries() {
        val s1 = createSampleSummary("sum_pending_01", syncState = "PENDING")
        val s2 = createSampleSummary("sum_retry_01", syncState = "RETRY")
        val s3 = createSampleSummary("sum_delivered_01", syncState = "DELIVERED")

        storage.saveSummary(s1)
        storage.saveSummary(s2)
        storage.saveSummary(s3)

        // Mark s2 as RETRY and s3 as DELIVERED explicitly
        storage.updateSyncState("sum_retry_01", "RETRY")
        storage.updateSyncState("sum_delivered_01", "DELIVERED")

        val pending = storage.getPendingSummaries()
        assertEquals(2, pending.size)
        val pendingIds = pending.map { it.summaryId }
        assertTrue(pendingIds.contains("sum_pending_01"))
        assertTrue(pendingIds.contains("sum_retry_01"))
        assertTrue(!pendingIds.contains("sum_delivered_01"))
    }

    // 4. Update sync state
    @Test
    fun test04_UpdateSyncState() {
        val summary = createSampleSummary("sum_state_01")
        storage.saveSummary(summary)
        assertEquals("PENDING", storage.getSummary("sum_state_01")!!.syncState)

        storage.updateSyncState("sum_state_01", "IN_FLIGHT")
        assertEquals("IN_FLIGHT", storage.getSummary("sum_state_01")!!.syncState)

        storage.updateSyncState("sum_state_01", "DELIVERED")
        assertEquals("DELIVERED", storage.getSummary("sum_state_01")!!.syncState)
    }

    // 5. Preserve retry metadata and cap attempts
    @Test
    fun test05_PreserveRetryMetadataAndCapAttempts() {
        val summary = createSampleSummary("sum_retry_meta_01")
        storage.saveSummary(summary)
        assertEquals(0, storage.getAttempts("sum_retry_meta_01"))
        assertNull(storage.getLastError("sum_retry_meta_01"))

        storage.updateSyncState("sum_retry_meta_01", "RETRY", "Network timeout 504")
        assertEquals(1, storage.getAttempts("sum_retry_meta_01"))
        assertEquals("Network timeout 504", storage.getLastError("sum_retry_meta_01"))

        // Increment retry attempts up to 10
        for (i in 2..10) {
            storage.updateSyncState("sum_retry_meta_01", "RETRY", "Retry failure $i")
        }

        val finalAttempts = storage.getAttempts("sum_retry_meta_01")
        assertEquals(10, finalAttempts)
        val finalSummary = storage.getSummary("sum_retry_meta_01")
        assertEquals("PERMANENT_ERROR", finalSummary!!.syncState)
    }

    // 6. Delete individual summary and associated child records
    @Test
    fun test06_DeleteIndividualSummaryAndAssociatedChildRecords() = runBlocking {
        val intervals = listOf(TimelineInterval(id = "int_del_01", startTime = 100L, endTime = 200L, packageName = "pkg"))
        val breakdown = listOf(AppBreakdownSummary("pkg", AppCategory.REFERENCE, 100L))
        val summary = createSampleSummary("sum_delete_01", timeline = intervals, breakdown = breakdown)
        storage.saveSummary(summary)
        assertNotNull(storage.getSummary("sum_delete_01"))

        storage.deleteSummary("sum_delete_01")
        assertNull("Summary must be deleted", storage.getSummary("sum_delete_01"))

        // Verify child records purged
        val dao = db.telemetryOutboxDao()
        assertTrue("Intervals must be purged", dao.getIntervalsForSummary("sum_delete_01").isEmpty())
        assertTrue("Breakdown must be purged", dao.getBreakdownForSummary("sum_delete_01").isEmpty())
    }

    // 7. Clear summaries safely
    @Test
    fun test07_ClearSummariesSafely() {
        storage.saveSummary(createSampleSummary("sum_clear_1"))
        storage.saveSummary(createSampleSummary("sum_clear_2"))
        assertEquals(2, storage.getAllSummaries().size)

        storage.clearAllSummaries()
        assertTrue("All summaries must be cleared", storage.getAllSummaries().isEmpty())
    }

    // 8. Terminal-state protection
    @Test
    fun test08_TerminalStateProtection() {
        val summary = createSampleSummary("sum_term_01")
        storage.saveSummary(summary)
        storage.updateSyncState("sum_term_01", "DELIVERED")
        assertEquals("DELIVERED", storage.getSummary("sum_term_01")!!.syncState)

        // Attempting to revive DELIVERED record via updateSyncState must be rejected
        storage.updateSyncState("sum_term_01", "PENDING")
        assertEquals("DELIVERED must not revive to PENDING", "DELIVERED", storage.getSummary("sum_term_01")!!.syncState)

        storage.updateSyncState("sum_term_01", "RETRY")
        assertEquals("DELIVERED must not revive to RETRY", "DELIVERED", storage.getSummary("sum_term_01")!!.syncState)

        // Attempting to overwrite DELIVERED record via saveSummary must be rejected
        storage.saveSummary(createSampleSummary("sum_term_01", syncState = "PENDING"))
        assertEquals("DELIVERED record must remain intact", "DELIVERED", storage.getSummary("sum_term_01")!!.syncState)
    }

    // 9. Database access while migration gate is active
    @Test
    fun test09_DatabaseAccessWhileMigrationGateActive() {
        gate.setState(DatabaseAccessGate.GateState.RECOVERING)
        try {
            storage.getSummary("sum_gate_test")
            org.junit.Assert.fail("Expected DatabaseRecoveryInProgressException")
        } catch (e: Exception) {
            assertTrue("Expected recovery exception", e is DatabaseRecoveryInProgressException)
        }

        gate.setState(DatabaseAccessGate.GateState.DEGRADED)
        try {
            storage.saveSummary(createSampleSummary("sum_degraded_test"))
            org.junit.Assert.fail("Expected DatabaseDegradedException")
        } catch (e: Exception) {
            assertTrue("Expected degraded exception", e is DatabaseDegradedException)
        }

        gate.setState(DatabaseAccessGate.GateState.OPEN)
    }

    // 10. Existing Phase 1 session lifecycle compatibility
    @Test
    fun test10_ExistingPhase1SessionLifecycleCompatibility() = runBlocking {
        val dao = db.telemetryOutboxDao()
        val sessionContract = FocusSessionContract(
            sessionId = "sess_p1_compat",
            startedAt = 100000L,
            intendedDurationSeconds = 1500L,
            taskName = "Writing",
            subjectName = "English",
            state = "RUNNING"
        )
        // Session started in Phase 1
        dao.insertSessionIfMissing(com.learningtracker.companion.data.entity.FocusSessionEntity(
            sessionId = sessionContract.sessionId,
            startedAt = sessionContract.startedAt,
            intendedDurationSeconds = sessionContract.intendedDurationSeconds,
            taskName = sessionContract.taskName,
            subjectName = sessionContract.subjectName,
            state = "RUNNING"
        ))

        // Session concluded: finalization through storage
        val summary = createSampleSummary("sum_p1_compat", "sess_p1_compat")
        storage.saveSummary(summary)

        val updatedSession = dao.getSessionById("sess_p1_compat")
        assertNotNull(updatedSession)
        assertEquals("FINALIZED", updatedSession!!.state)

        val retrievedSummary = storage.getSummary("sum_p1_compat")
        assertNotNull(retrievedSummary)
        assertEquals("sess_p1_compat", retrievedSummary!!.sessionId)
    }

    // 11. Room storage integration through FocusIntegritySyncManager
    @Test
    fun test11_RoomStorageIntegrationThroughFocusIntegritySyncManager() {
        val secureStore = SecureCredentialStore(context, cryptoEngine = JvmTestCryptoEngine())
        val pairingManager = PairingManager(context, secureStore = secureStore)
        val syncManager = FocusIntegritySyncManager(
            context = context,
            pairingManager = pairingManager,
            storage = storage
        )

        val summary = createSampleSummary("sum_syncmgr_01")
        syncManager.storage.saveSummary(summary)

        val pending = syncManager.storage.getPendingSummaries()
        assertEquals(1, pending.size)
        assertEquals("sum_syncmgr_01", pending[0].summaryId)

        syncManager.storage.updateSyncState("sum_syncmgr_01", "DELIVERED")
        assertEquals(0, syncManager.storage.getPendingSummaries().size)
        assertEquals(1, syncManager.storage.getAttempts("sum_syncmgr_01"))
    }

    // 12. Restart and retrieve previously persisted data
    @Test
    fun test12_RestartAndRetrievePreviouslyPersistedData() {
        val summary = createSampleSummary(
            "sum_restart_test",
            timeline = listOf(TimelineInterval(id = "i1", startTime = 10L, endTime = 20L, durationSeconds = 10L, packageName = "pkg")),
            breakdown = listOf(AppBreakdownSummary("pkg", AppCategory.NEUTRAL, 10L))
        )
        storage.saveSummary(summary)

        // Simulate application restart: instantiate fresh gate and storage pointing to same underlying database
        val freshGate = DatabaseAccessGate { db }
        val freshStorage = RoomTelemetryStorage(freshGate)

        val retrieved = freshStorage.getSummary("sum_restart_test")
        assertNotNull("Previously persisted summary must be retrieved after restart", retrieved)
        assertEquals("sum_restart_test", retrieved!!.summaryId)
        assertEquals(1, retrieved.timeline.size)
        assertEquals("pkg", retrieved.timeline[0].packageName)
        assertEquals(1, retrieved.appBreakdown.size)
        assertEquals(AppCategory.NEUTRAL, retrieved.appBreakdown[0].category)
    }
}
