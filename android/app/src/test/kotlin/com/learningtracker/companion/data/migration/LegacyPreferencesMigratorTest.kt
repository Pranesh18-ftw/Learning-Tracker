package com.learningtracker.companion.data.migration

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.learningtracker.companion.data.AppDatabase
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.MigrationAccountingException
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.LegacyMigrationLedgerEntity
import com.learningtracker.companion.data.entity.MigrationMetadataEntity
import com.learningtracker.companion.model.AppBreakdownSummary
import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.BoundaryConfidence
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.model.TimelineInterval
import com.learningtracker.companion.util.CompanionPreferences
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
@Config(sdk = [34])
class LegacyPreferencesMigratorTest {

    private lateinit var context: Context
    private lateinit var db: AppDatabase
    private lateinit var gate: DatabaseAccessGate
    private lateinit var barrier: LegacyStorageBarrier
    private lateinit var coordinator: LegacyStorageCoordinator
    private lateinit var migrator: LegacyPreferencesMigrator
    private val json = Json { ignoreUnknownKeys = true }

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Context>()
        clearAllLegacyPrefs()

        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()

        gate = DatabaseAccessGate { db }
        barrier = LegacyStorageBarrier()
        coordinator = LegacyStorageCoordinator(context, gate, barrier)
        migrator = LegacyPreferencesMigrator(context, gate, coordinator, barrier)
    }

    @After
    fun tearDown() {
        db.close()
        clearAllLegacyPrefs()
    }

    private fun clearAllLegacyPrefs() {
        context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences("learningtracker_companion_prefs", Context.MODE_PRIVATE).edit().clear().commit()
    }

    private fun createValidSummary(id: String, sessionId: String = "sess_$id"): FocusSummary {
        return FocusSummary(
            sessionId = sessionId,
            summaryId = id,
            intendedSeconds = 1800L,
            observedWindowSeconds = 1800L,
            interruptionCount = 1,
            interruptionSeconds = 60L,
            referenceSeconds = 1200L,
            distractionSeconds = 60L,
            unknownSeconds = 480L,
            longestUninterruptedSeconds = 600L,
            timeline = listOf(
                TimelineInterval(
                    id = "${id}_int_0",
                    startTime = 1000L,
                    endTime = 2000L,
                    durationSeconds = 1000L,
                    classification = "FOCUSED",
                    packageName = "com.android.chrome"
                )
            ),
            appBreakdown = listOf(
                AppBreakdownSummary(
                    packageName = "com.android.chrome",
                    category = AppCategory.REFERENCE,
                    durationSeconds = 1000L
                )
            ),
            collectionStatus = CollectionStatus.COMPLETE,
            boundaryConfidence = BoundaryConfidence.AUTHORITATIVE,
            timestamp = 2000000L,
            syncState = "PENDING"
        )
    }

    // 1. Valid Telemetry Migration
    @Test
    fun test01_ValidTelemetryMigration() = runBlocking {
        val summary = createValidSummary("sum_001", "sess_001")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString(summary.summaryId, json.encodeToString(summary)).commit()

        val result = migrator.performMigration()
        assertTrue("Result should be Success", result is MigrationResult.Success)
        assertEquals(1, (result as MigrationResult.Success).validMigrated)

        val dao = db.telemetryOutboxDao()
        val session = dao.getSessionById("sess_001")
        assertNotNull("Session must be migrated", session)
        assertEquals("FINALIZED", session!!.state)

        val outboxSummary = dao.getSummaryById("sum_001")
        assertNotNull("Summary must be migrated", outboxSummary)
        assertEquals("PENDING", outboxSummary!!.syncState)

        val ledger = dao.getLedgerEntry("telemetry:sum_001", "learningtracker_telemetry")
        assertNotNull("Ledger entry must exist", ledger)
        assertEquals("MIGRATED_VALID", ledger!!.outcome)
        assertEquals("sum_001", ledger.destinationSummaryId)

        val meta = dao.getMigrationMetadata("shared_prefs_v1_to_v2")
        assertNotNull("Metadata must exist", meta)
        assertEquals("COMPLETED", meta!!.status)
        assertEquals(1, meta.totalExpected)
        assertEquals(1, meta.validMigrated)
        assertEquals(0, meta.quarantinedCount)

        assertEquals(StorageRoutingMode.ROOM_PRIMARY, coordinator.currentRoute.get())
        assertTrue(CompanionPreferences(context).isRoomMigrationComplete)
    }

    // 2. Active Session Migration
    @Test
    fun test02_ActiveSessionMigration() = runBlocking {
        val contract = FocusSessionContract(
            sessionId = "sess_active_01",
            startedAt = 500000L,
            intendedDurationSeconds = 3600L,
            taskName = "Active Study",
            subjectName = "Math"
        )
        val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
        activePrefs.edit().putString("active_session_json", json.encodeToString(contract)).commit()

        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.Success)
        assertEquals(1, (result as MigrationResult.Success).validMigrated)

        val dao = db.telemetryOutboxDao()
        val session = dao.getSessionById("sess_active_01")
        assertNotNull("Active session must exist in Room", session)
        assertEquals("RUNNING", session!!.state)
        assertEquals("Active Study", session.taskName)

        val ledger = dao.getLedgerEntry("active_session:active_session_json", "learningtracker_active_session")
        assertNotNull("Ledger entry must exist", ledger)
        assertEquals("MIGRATED_VALID", ledger!!.outcome)
    }

    // 3. Retry Metadata Preservation & Attempt Capping
    @Test
    fun test03_RetryMetadataPreservation() = runBlocking {
        val summary = createValidSummary("sum_retry_01")
        val cappedSummary = createValidSummary("sum_capped_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)

        telPrefs.edit()
            .putString(summary.summaryId, json.encodeToString(summary))
            .putString(cappedSummary.summaryId, json.encodeToString(cappedSummary))
            .commit()

        metaPrefs.edit()
            .putInt("${summary.summaryId}_attempts", 4)
            .putString("${summary.summaryId}_last_error", "503 Service Unavailable")
            .putLong("${summary.summaryId}_last_attempt", 12345678L)
            .putInt("${cappedSummary.summaryId}_attempts", 10)
            .putString("${cappedSummary.summaryId}_last_error", "Exhausted retries")
            .commit()

        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.Success)
        assertEquals(2, (result as MigrationResult.Success).validMigrated)

        val dao = db.telemetryOutboxDao()
        val stored = dao.getSummaryById("sum_retry_01")
        assertNotNull(stored)
        assertEquals(4, stored!!.attempts)
        assertEquals("503 Service Unavailable", stored.lastError)
        assertEquals(12345678L, stored.lastAttemptAt)
        assertEquals("PENDING", stored.syncState)

        val storedCapped = dao.getSummaryById("sum_capped_01")
        assertNotNull(storedCapped)
        assertEquals(10, storedCapped!!.attempts)
        assertEquals("Exhausted retries", storedCapped.lastError)
        assertEquals("PERMANENT_ERROR", storedCapped.syncState)
    }

    // 4. Non-String Quarantine
    @Test
    fun test04_NonStringQuarantine() = runBlocking {
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit()
            .putInt("sum_corrupt_int", 999)
            .putBoolean("sum_corrupt_bool", true)
            .commit()

        val result = migrator.performMigration()
        assertTrue("Must be PartialWithQuarantine", result is MigrationResult.PartialWithQuarantine)
        val partial = result as MigrationResult.PartialWithQuarantine
        assertEquals(0, partial.validMigrated)
        assertEquals(2, partial.quarantinedCount)

        val dao = db.telemetryOutboxDao()
        val ledgerInt = dao.getLedgerEntry("telemetry:sum_corrupt_int", "learningtracker_telemetry")
        assertNotNull(ledgerInt)
        assertEquals("QUARANTINED", ledgerInt!!.outcome)
        assertTrue(ledgerInt.errorMessage!!.contains("Non-string preference value"))

        val meta = dao.getMigrationMetadata("shared_prefs_v1_to_v2")
        assertEquals("PARTIAL_QUARANTINED", meta!!.status)
        assertEquals(2, meta.totalExpected)
        assertEquals(0, meta.validMigrated)
        assertEquals(2, meta.quarantinedCount)

        // Route is still ROOM_PRIMARY after partial quarantine cutover
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, coordinator.currentRoute.get())
        assertFalse(CompanionPreferences(context).isRoomMigrationComplete)
    }

    // 5. Invalid JSON Quarantine
    @Test
    fun test05_InvalidJsonQuarantine() = runBlocking {
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_malformed", "{ not_valid_json: true ").commit()

        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.PartialWithQuarantine)
        assertEquals(1, (result as MigrationResult.PartialWithQuarantine).quarantinedCount)

        val dao = db.telemetryOutboxDao()
        val ledger = dao.getLedgerEntry("telemetry:sum_malformed", "learningtracker_telemetry")
        assertNotNull(ledger)
        assertEquals("QUARANTINED", ledger!!.outcome)
        assertTrue(ledger.errorMessage!!.contains("SerializationException"))
    }

    // 6. Exact Accounting Invariant
    @Test
    fun test06_ExactAccounting() = runBlocking {
        val summary1 = createValidSummary("sum_acc_1")
        val summary2 = createValidSummary("sum_acc_2")
        val contract = FocusSessionContract("sess_acc_act", 100L, 600L)

        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val actPrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)

        telPrefs.edit()
            .putString("sum_acc_1", json.encodeToString(summary1))
            .putString("sum_acc_2", json.encodeToString(summary2))
            .putString("sum_malformed", "bad_json")
            .putInt("sum_number", 123)
            .commit()

        actPrefs.edit().putString("active_session_json", json.encodeToString(contract)).commit()

        // 4 telemetry entries + 1 active session = 5 expected
        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.PartialWithQuarantine)
        val partial = result as MigrationResult.PartialWithQuarantine
        assertEquals(3, partial.validMigrated) // 2 summaries + 1 active session
        assertEquals(2, partial.quarantinedCount) // 1 bad json + 1 number
        assertEquals(5, partial.validMigrated + partial.quarantinedCount)

        val dao = db.telemetryOutboxDao()
        val meta = dao.getMigrationMetadata("shared_prefs_v1_to_v2")
        assertEquals(5, meta!!.totalExpected)
        assertEquals(3, meta.validMigrated)
        assertEquals(2, meta.quarantinedCount)
    }

    // 7. Fingerprint Matching
    @Test
    fun test07_FingerprintMatching() = runBlocking {
        val summary = createValidSummary("sum_fp_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString(summary.summaryId, json.encodeToString(summary)).commit()

        val r1 = migrator.performMigration()
        assertTrue(r1 is MigrationResult.Success)

        val dao = db.telemetryOutboxDao()
        val ledgerBefore = dao.getLedgerEntry("telemetry:sum_fp_01", "learningtracker_telemetry")
        assertNotNull(ledgerBefore)

        // Reset metadata status to force re-evaluation of same dataset
        dao.setMigrationMetadata(
            MigrationMetadataEntity(
                migrationKey = "shared_prefs_v1_to_v2",
                status = "PARTIAL_QUARANTINED",
                totalExpected = 1,
                validMigrated = 1,
                quarantinedCount = 0,
                remediatedCount = 0,
                completedAt = System.currentTimeMillis()
            )
        )

        val r2 = migrator.performMigration()
        assertTrue(r2 is MigrationResult.Success)
        val ledgerAfter = dao.getLedgerEntry("telemetry:sum_fp_01", "learningtracker_telemetry")
        assertEquals(ledgerBefore!!.contentFingerprint, ledgerAfter!!.contentFingerprint)
        assertEquals("MIGRATED_VALID", ledgerAfter.outcome)
    }

    // 8. Fingerprint Changes: Destination in PENDING/RETRY Permits Safe Update
    @Test
    fun test08_FingerprintChanges_PendingPermitsSafeUpdate() = runBlocking {
        val initialSummary = createValidSummary("sum_update_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_update_01", json.encodeToString(initialSummary)).commit()

        migrator.performMigration()

        val dao = db.telemetryOutboxDao()
        val originalStored = dao.getSummaryById("sum_update_01")
        assertEquals(1800L, originalStored!!.intendedSeconds)

        // Change source content in legacy SharedPreferences
        val modifiedSummary = initialSummary.copy(intendedSeconds = 3600L)
        telPrefs.edit().putString("sum_update_01", json.encodeToString(modifiedSummary)).commit()

        // Reset metadata status to trigger re-migration
        dao.setMigrationMetadata(
            MigrationMetadataEntity(
                migrationKey = "shared_prefs_v1_to_v2",
                status = "PARTIAL_QUARANTINED",
                totalExpected = 1,
                validMigrated = 1,
                quarantinedCount = 0,
                remediatedCount = 0,
                completedAt = System.currentTimeMillis()
            )
        )

        val r2 = migrator.performMigration()
        assertTrue(r2 is MigrationResult.Success)

        val updatedStored = dao.getSummaryById("sum_update_01")
        assertEquals(3600L, updatedStored!!.intendedSeconds)
        assertEquals("MIGRATED_VALID", dao.getLedgerEntry("telemetry:sum_update_01", "learningtracker_telemetry")!!.outcome)
    }

    // 9. Delivered / In-Flight Conflict Protection
    @Test
    fun test09_DeliveredOrInFlightConflictProtection() = runBlocking {
        val summary = createValidSummary("sum_protect_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_protect_01", json.encodeToString(summary)).commit()

        migrator.performMigration()

        val dao = db.telemetryOutboxDao()
        // Simulate worker marking this summary as DELIVERED
        val stored = dao.getSummaryById("sum_protect_01")
        dao.upsertSummary(stored!!.copy(syncState = "DELIVERED", deliveredAt = System.currentTimeMillis()))

        // Modify source in SharedPreferences post-migration
        val altered = summary.copy(intendedSeconds = 9999L)
        telPrefs.edit().putString("sum_protect_01", json.encodeToString(altered)).commit()

        // Re-migrate
        dao.setMigrationMetadata(
            MigrationMetadataEntity(
                migrationKey = "shared_prefs_v1_to_v2",
                status = "PARTIAL_QUARANTINED",
                totalExpected = 1,
                validMigrated = 1,
                quarantinedCount = 0,
                remediatedCount = 0,
                completedAt = System.currentTimeMillis()
            )
        )

        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.PartialWithQuarantine)

        // Room record must NOT be overwritten!
        val preserved = dao.getSummaryById("sum_protect_01")
        assertEquals("DELIVERED", preserved!!.syncState)
        assertEquals(1800L, preserved.intendedSeconds) // NOT 9999L

        // Conflicting modification must be quarantined in ledger
        val ledger = dao.getLedgerEntry("telemetry:sum_protect_01", "learningtracker_telemetry")
        assertEquals("QUARANTINED", ledger!!.outcome)
        assertTrue(ledger.errorMessage!!.contains("destination in Room is DELIVERED"))
    }

    // 10. Quarantine Remediation Workflow
    @Test
    fun test10_QuarantineRemediationWorkflow() = runBlocking {
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_repair_me", "corrupt_data").commit()

        val migrationRes = migrator.performMigration()
        assertTrue(migrationRes is MigrationResult.PartialWithQuarantine)

        val remediationService = QuarantineRemediationService(gate)
        val repairedSummary = createValidSummary("sum_repaired_01")
        val repairedJson = json.encodeToString(repairedSummary)

        val remRes = remediationService.remediateQuarantinedRecord(
            sourceKey = "telemetry:sum_repair_me",
            sourcePreferenceFile = "learningtracker_telemetry",
            repairedJson = repairedJson
        )
        assertTrue("Remediation should succeed", remRes is RemediationResult.Success)

        val dao = db.telemetryOutboxDao()
        val ledger = dao.getLedgerEntry("telemetry:sum_repair_me", "learningtracker_telemetry")
        assertEquals("REMEDIATED", ledger!!.outcome)
        assertEquals("sum_repaired_01", ledger.destinationSummaryId)
        assertNotNull(ledger.remediatedAt)

        val storedSummary = dao.getSummaryById("sum_repaired_01")
        assertNotNull("Remediated summary must exist in Room", storedSummary)
        assertEquals("PENDING", storedSummary!!.syncState)

        val meta = dao.getMigrationMetadata("shared_prefs_v1_to_v2")
        assertEquals(1, meta!!.remediatedCount)
    }

    // 11. Repeated Migration Idempotence
    @Test
    fun test11_RepeatedMigrationIdempotence() = runBlocking {
        val summary = createValidSummary("sum_idem_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_idem_01", json.encodeToString(summary)).commit()

        val r1 = migrator.performMigration()
        assertTrue(r1 is MigrationResult.Success)

        // Subsequent call returns AlreadyCompleted immediately without modifying data
        val r2 = migrator.performMigration()
        assertEquals(MigrationResult.AlreadyCompleted, r2)
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, coordinator.currentRoute.get())
        assertTrue(CompanionPreferences(context).isRoomMigrationComplete)
    }

    // 12. Crash / Restart Boundaries
    @Test
    fun test12_CrashRestartBoundaries() = runBlocking {
        val dao = db.telemetryOutboxDao()

        // Case A: Startup with NO prior migration metadata
        val freshCoordinator1 = LegacyStorageCoordinator(context, gate, barrier)
        val route1 = freshCoordinator1.initializeRoutingMode()
        assertEquals(StorageRoutingMode.LEGACY_SHARED_PREFERENCES, route1)

        // Case B: Completed migration metadata restores ROOM_PRIMARY
        dao.setMigrationMetadata(
            MigrationMetadataEntity(
                migrationKey = "shared_prefs_v1_to_v2",
                status = "COMPLETED",
                totalExpected = 5,
                validMigrated = 5,
                quarantinedCount = 0,
                remediatedCount = 0,
                completedAt = System.currentTimeMillis()
            )
        )
        val freshCoordinator2 = LegacyStorageCoordinator(context, gate, barrier)
        val route2 = freshCoordinator2.initializeRoutingMode()
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, route2)

        // Verify write through freshCoordinator2 routes directly to Room
        freshCoordinator2.recordSummary(createValidSummary("sum_restart_01"))
        assertNotNull("Summary after restart must be in Room", dao.getSummaryById("sum_restart_01"))
        assertNull("Summary after restart must NOT be in legacy prefs", context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE).getString("sum_restart_01", null))

        // Case C: PARTIAL_QUARANTINED also restores ROOM_PRIMARY
        dao.setMigrationMetadata(
            MigrationMetadataEntity(
                migrationKey = "shared_prefs_v1_to_v2",
                status = "PARTIAL_QUARANTINED",
                totalExpected = 5,
                validMigrated = 3,
                quarantinedCount = 2,
                remediatedCount = 0,
                completedAt = System.currentTimeMillis()
            )
        )
        val freshCoordinator3 = LegacyStorageCoordinator(context, gate, barrier)
        val route3 = freshCoordinator3.initializeRoutingMode()
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, route3)
    }

    // 13. Concurrent Writers During Migration
    @Test
    fun test13_ConcurrentWritersDuringMigration() = runBlocking {
        val summary1 = createValidSummary("sum_concurrent_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_concurrent_01", json.encodeToString(summary1)).commit()

        // Writer executes while barrier is locked; writer rechecks route and routes directly to Room once cutover finishes
        val migrationDeferred = async {
            migrator.performMigration()
        }

        val writerDeferred = async {
            delay(10) // Let migration enter withWriterLock
            val newSummary = createValidSummary("sum_written_during_mig")
            coordinator.recordSummary(newSummary)
        }

        migrationDeferred.await()
        writerDeferred.await()

        val dao = db.telemetryOutboxDao()
        assertNotNull("Migrated summary must exist in Room", dao.getSummaryById("sum_concurrent_01"))
        assertNotNull("Writer summary must exist in Room", dao.getSummaryById("sum_written_during_mig"))
    }

    // 14. Concurrent Migrator Protection
    @Test
    fun test14_ConcurrentMigratorProtection() = runBlocking {
        val summary = createValidSummary("sum_par_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_par_01", json.encodeToString(summary)).commit()

        val job1 = async { migrator.performMigration() }
        val job2 = async { migrator.performMigration() }

        val r1 = job1.await()
        val r2 = job2.await()

        val results = listOf(r1, r2)
        assertTrue(results.any { it is MigrationResult.Success })
        assertTrue(results.any { it == MigrationResult.AlreadyCompleted })
    }

    // 15. Database Persistence Failure Rollback & Legacy Preservation
    @Test
    fun test15_DatabasePersistenceFailureRollback() = runBlocking {
        val summary = createValidSummary("sum_fail_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_fail_01", json.encodeToString(summary)).commit()

        // Set gate to DEGRADED to simulate database persistence failure
        gate.setState(DatabaseAccessGate.GateState.DEGRADED)

        val result = migrator.performMigration()
        assertTrue("Result must be Failed", result is MigrationResult.Failed)
        assertEquals(StorageRoutingMode.MIGRATION_FAILED, coordinator.currentRoute.get())

        // Legacy SharedPreferences must remain intact as read-only backup!
        val preservedRaw = telPrefs.getString("sum_fail_01", null)
        assertNotNull("Legacy preference must remain intact and not deleted", preservedRaw)

        // After failure, safe routing restores writes to legacy preferences
        val fallbackSummary = createValidSummary("sum_fallback_01")
        coordinator.recordSummary(fallbackSummary)
        val fallbackRaw = telPrefs.getString("sum_fallback_01", null)
        assertNotNull("Writer after failure safely writes to legacy preferences", fallbackRaw)
    }

    // 16. Writer After Cutover Writes to Room and Never to Legacy Preferences
    @Test
    fun test16_WriterAfterCutoverWritesToRoomAndNotLegacyPrefs() = runBlocking {
        val initialSummary = createValidSummary("sum_cutover_init")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
        val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
        telPrefs.edit().putString("sum_cutover_init", json.encodeToString(initialSummary)).commit()

        val migrationRes = migrator.performMigration()
        assertTrue(migrationRes is MigrationResult.Success)
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, coordinator.currentRoute.get())

        // Perform writes after cutover
        val postSummary = createValidSummary("sum_post_cutover_01")
        coordinator.recordSummary(postSummary)

        val activeContract = FocusSessionContract(
            sessionId = "sess_post_cutover_01",
            startedAt = System.currentTimeMillis(),
            intendedDurationSeconds = 1500L,
            taskName = "Physics",
            subjectName = "Mechanics",
            state = "RUNNING"
        )
        coordinator.recordActiveSession(activeContract)

        val dao = db.telemetryOutboxDao()

        // 1. Must be stored in Room
        assertNotNull("Summary must be in Room", dao.getSummaryById("sum_post_cutover_01"))
        assertNotNull("Session must be in Room", dao.getSessionById("sess_post_cutover_01"))

        // 2. Must NEVER be written to legacy SharedPreferences
        assertNull("Telemetry must NOT be written to legacy preferences", telPrefs.getString("sum_post_cutover_01", null))
        assertFalse("Metadata attempts must NOT be written to legacy preferences", metaPrefs.contains("sum_post_cutover_01_attempts"))
        assertNull("Active session must NOT be written to legacy preferences", activePrefs.getString("active_session_json", null))
    }

    // 17. ${summaryId}_created_at Preservation in Room
    @Test
    fun test17_CreatedAtPreservedInRoom() = runBlocking {
        val summary = createValidSummary("sum_created_at_01")
        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)

        val customCreatedAt = 1711929600000L // Specific legacy creation timestamp
        telPrefs.edit().putString(summary.summaryId, json.encodeToString(summary)).commit()
        metaPrefs.edit()
            .putInt("${summary.summaryId}_attempts", 3)
            .putLong("${summary.summaryId}_created_at", customCreatedAt)
            .commit()

        val result = migrator.performMigration()
        assertTrue(result is MigrationResult.Success)

        val dao = db.telemetryOutboxDao()
        val roomSummary = dao.getSummaryById("sum_created_at_01")
        assertNotNull("Summary must exist in Room", roomSummary)
        assertEquals("CreatedAt must preserve legacy \${summaryId}_created_at", customCreatedAt, roomSummary!!.createdAt)
        assertEquals("Attempts must be preserved", 3, roomSummary.attempts)
    }

    // 18. LocalTelemetryStorage & FocusIntegritySyncManager Call-Site Integration
    @Test
    fun test18_LocalTelemetryStorageIntegrationWithCoordinator() = runBlocking {
        val testSecureStore = com.learningtracker.companion.security.SecureCredentialStore(
            context,
            cryptoEngine = com.learningtracker.companion.security.JvmTestCryptoEngine()
        )
        val testPairingManager = com.learningtracker.companion.pairing.PairingManager(context, secureStore = testSecureStore)
        val telStorage = com.learningtracker.companion.sync.LocalTelemetryStorage(context, coordinator)
        val syncManager = com.learningtracker.companion.sync.FocusIntegritySyncManager(
            context = context,
            pairingManager = testPairingManager,
            coordinator = coordinator,
            storage = telStorage
        )

        // A. Prior to migration: writes route to legacy prefs
        assertEquals(StorageRoutingMode.LEGACY_SHARED_PREFERENCES, coordinator.currentRoute.get())
        val preSummary = createValidSummary("sum_pre_mig")
        telStorage.saveSummary(preSummary)

        val telPrefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        assertNotNull("Pre-migration summary routes to legacy prefs", telPrefs.getString("sum_pre_mig", null))

        // B. Cutover migration
        val migResult = migrator.performMigration()
        assertTrue(migResult is MigrationResult.Success)
        assertEquals(StorageRoutingMode.ROOM_PRIMARY, coordinator.currentRoute.get())

        // C. After cutover: writes route to Room, never to legacy prefs
        val postSummary = createValidSummary("sum_post_mig")
        telStorage.saveSummary(postSummary)

        val dao = db.telemetryOutboxDao()
        assertNotNull("Post-migration summary routes to Room", dao.getSummaryById("sum_post_mig"))
        assertNull("Post-migration summary never written to legacy prefs", telPrefs.getString("sum_post_mig", null))

        // D. Update sync state routes to Room
        telStorage.updateSyncState("sum_post_mig", "DELIVERED")
        val deliveredInRoom = dao.getSummaryById("sum_post_mig")
        assertEquals("DELIVERED", deliveredInRoom!!.syncState)

        // E. Active session persistence routes to Room
        val sessionContract = FocusSessionContract(
            sessionId = "sess_integrated",
            startedAt = System.currentTimeMillis(),
            intendedDurationSeconds = 1800L
        )
        syncManager.onFocusStarted(sessionContract)
        assertNotNull("Active session routes to Room", dao.getSessionById("sess_integrated"))
        val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
        assertNull("Active session not written to legacy prefs", activePrefs.getString("active_session_json", null))
    }
}
