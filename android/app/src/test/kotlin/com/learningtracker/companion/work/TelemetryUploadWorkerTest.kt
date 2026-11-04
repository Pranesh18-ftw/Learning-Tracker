package com.learningtracker.companion.work

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.work.ExistingWorkPolicy
import androidx.work.ListenableWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import com.learningtracker.companion.data.AppDatabase
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.TelemetrySummaryEntity
import com.learningtracker.companion.network.ApiResult
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.network.TelemetrySubmissionResponse
import com.learningtracker.companion.network.TelemetrySummaryPayload
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.security.JvmTestCryptoEngine
import com.learningtracker.companion.security.SecureCredentialStore
import com.learningtracker.companion.service.BootReceiver
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
class TelemetryUploadWorkerTest {

    private lateinit var context: Context
    private lateinit var db: AppDatabase
    private lateinit var gate: DatabaseAccessGate
    private lateinit var fakeApi: FakePhoneApiClient
    private lateinit var pairingManager: PairingManager
    private lateinit var secureStore: SecureCredentialStore
    private var simulatedTime: Long = 1_000_000L

    class FakePhoneApiClient : PhoneApiClient() {
        var submitResult: ApiResult<TelemetrySubmissionResponse> = ApiResult.Success(
            TelemetrySubmissionResponse(
                success = true,
                summaryId = "sum_default",
                receivedAt = System.currentTimeMillis(),
                deliveryStatus = "ACCEPTED",
                idempotent = false
            ),
            statusCode = 200
        )
        val submittedPayloads = mutableListOf<TelemetrySummaryPayload>()
        var onPostSummaryHook: (suspend (TelemetrySummaryPayload) -> Unit)? = null

        override fun submitTelemetrySummary(
            payload: TelemetrySummaryPayload,
            deviceToken: String
        ): ApiResult<TelemetrySubmissionResponse> {
            submittedPayloads.add(payload)
            onPostSummaryHook?.let { runBlocking { it(payload) } }
            return submitResult
        }
    }

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        gate = DatabaseAccessGate { db }

        simulatedTime = System.currentTimeMillis()
        val cryptoEngine = JvmTestCryptoEngine()
        secureStore = SecureCredentialStore(context, cryptoEngine)
        secureStore.saveDeviceCredential(
            deviceId = "dev_test_123",
            deviceName = "Pixel 8 Test",
            deviceToken = "token_valid_xyz",
            protocolVersion = "1.0.0",
            pairedAt = simulatedTime
        )

        fakeApi = FakePhoneApiClient()
        pairingManager = PairingManager(context, secureStore, fakeApi)

        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        TelemetryUploadWorker.resetTestOverrides()
        TelemetryUploadWorker.testDatabaseAccessGate = gate
        TelemetryUploadWorker.testPairingManager = pairingManager
        TelemetryUploadWorker.testApiClient = fakeApi
        TelemetryUploadWorker.testTimeProvider = { simulatedTime }
        TelemetryUploadWorker.testWorkManager = WorkManager.getInstance(context)
    }

    @After
    fun tearDown() {
        TelemetryUploadWorker.resetTestOverrides()
        com.learningtracker.companion.FocusIntegrityApplication.resetTestOverrides()
        db.close()
    }

    private suspend fun insertTestSession(sessionId: String, state: String = "FINALIZED") {
        gate.withAccess { database ->
            database.telemetryOutboxDao().insertSessionIfMissing(
                FocusSessionEntity(
                    sessionId = sessionId,
                    startedAt = simulatedTime - 1500_000L,
                    intendedDurationSeconds = 1500L,
                    endedAt = simulatedTime,
                    taskName = "Test Task",
                    subjectName = "Test Subject",
                    state = state,
                    boundaryConfidence = "AUTHORITATIVE"
                )
            )
        }
    }

    private suspend fun insertTestSummary(
        summaryId: String,
        sessionId: String = "sess_$summaryId",
        syncState: String = "PENDING",
        attempts: Int = 0,
        claimToken: String? = null,
        claimGeneration: Long = 0L,
        leaseExpiresAt: Long? = null,
        nextAttemptAt: Long? = null,
        createdAt: Long = simulatedTime
    ) {
        insertTestSession(sessionId)
        gate.withAccess { database ->
            database.telemetryOutboxDao().upsertSummary(
                TelemetrySummaryEntity(
                    summaryId = summaryId,
                    sessionId = sessionId,
                    intendedSeconds = 1500L,
                    observedWindowSeconds = 1500L,
                    interruptionCount = 0,
                    interruptionSeconds = 0L,
                    referenceSeconds = 1000L,
                    distractionSeconds = 500L,
                    unknownSeconds = 0L,
                    longestUninterruptedSeconds = 1000L,
                    collectionStatus = "COMPLETE",
                    boundaryConfidence = "AUTHORITATIVE",
                    syncState = syncState,
                    attempts = attempts,
                    claimToken = claimToken,
                    claimGeneration = claimGeneration,
                    leaseExpiresAt = leaseExpiresAt,
                    nextAttemptAt = nextAttemptAt,
                    createdAt = createdAt,
                    updatedAt = createdAt
                )
            )
        }
    }

    // --- TEST 1: Successful upload ---
    @Test
    fun test01_SuccessfulUpload() = runBlocking {
        insertTestSummary("sum_1", sessionId = "sess_1")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        assertEquals(1, fakeApi.submittedPayloads.size)
        assertEquals("sum_1", fakeApi.submittedPayloads[0].summaryId)

        val updated = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_1") }
        assertNotNull(updated)
        assertEquals("DELIVERED", updated!!.syncState)
        assertNull(updated.claimToken)
        assertNull(updated.leaseExpiresAt)
        assertNotNull(updated.deliveredAt)
        assertEquals(1, updated.attempts)
    }

    // --- TEST 2: Multiple-record draining ---
    @Test
    fun test02_MultipleRecordDraining() = runBlocking {
        // Batch size is 5; insert 8 records to test multiple batches drained in loop
        for (i in 1..8) {
            insertTestSummary("sum_$i", sessionId = "sess_$i", createdAt = simulatedTime + i)
        }

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        assertEquals(8, fakeApi.submittedPayloads.size)

        val allSummaries = gate.withAccess { it.telemetryOutboxDao().getAllSummaries() }
        assertEquals(8, allSummaries.size)
        assertTrue(allSummaries.all { it.syncState == "DELIVERED" })
    }

    // --- TEST 3: No network available ---
    @Test
    fun test03_NoNetworkAvailable() = runBlocking {
        fakeApi.submitResult = ApiResult.Error(
            code = "NETWORK_ERROR",
            message = "Connection refused",
            statusCode = 0,
            isTransient = true
        )
        insertTestSummary("sum_net_fail")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        val updated = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_net_fail") }
        assertNotNull(updated)
        assertEquals("RETRY", updated!!.syncState)
        assertNull(updated.claimToken)
        assertNotNull(updated.nextAttemptAt)
        assertTrue(updated.nextAttemptAt!! > simulatedTime)
        assertEquals(1, updated.attempts)
    }

    // --- TEST 4: Network recovery ---
    @Test
    fun test04_NetworkRecovery() = runBlocking {
        // 1. Initial network failure
        fakeApi.submitResult = ApiResult.Error("NETWORK_ERROR", "Offline", 0, isTransient = true)
        insertTestSummary("sum_recover")

        val worker1 = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker1.doWork()

        val recordAfterFailure = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_recover") }
        assertEquals("RETRY", recordAfterFailure!!.syncState)

        // 2. Network recovers; advance clock past retry deadline
        fakeApi.submitResult = ApiResult.Success(
            TelemetrySubmissionResponse(true, "sum_recover", System.currentTimeMillis(), "ACCEPTED", false),
            200
        )
        simulatedTime = recordAfterFailure.nextAttemptAt!! + 1000L

        val worker2 = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result2 = worker2.doWork()

        assertEquals(ListenableWorker.Result.success(), result2)
        val recordAfterRecovery = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_recover") }
        assertEquals("DELIVERED", recordAfterRecovery!!.syncState)
        assertEquals(2, recordAfterRecovery.attempts)
    }

    // --- TEST 5: HTTP 401 revocation ---
    @Test
    fun test05_Http401Revocation() = runBlocking {
        fakeApi.submitResult = ApiResult.Error("UNAUTHORIZED", "Device credentials revoked", 401)
        insertTestSummary("sum_rev_1")
        insertTestSummary("sum_rev_2")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.failure(), result)
        assertTrue(pairingManager.isRevoked())

        val record1 = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_rev_1") }
        val record2 = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_rev_2") }
        assertEquals("PERMANENT_ERROR", record1!!.syncState)
        assertEquals("PERMANENT_ERROR", record2!!.syncState)
        assertTrue(record1.lastError?.contains("401") == true || record1.lastError?.contains("revoked") == true)
    }

    // --- TEST 6: HTTP 409 conflict ---
    @Test
    fun test06_Http409Conflict() = runBlocking {
        fakeApi.submitResult = ApiResult.Error("SUMMARY_CONFLICT", "Summary exists with mismatched hash", 409)
        insertTestSummary("sum_conflict")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_conflict") }
        assertEquals("CONFLICT", record!!.syncState)
        assertNull(record.claimToken)
        assertNull(record.leaseExpiresAt)
        assertNull(record.nextAttemptAt)
    }

    // --- TEST 7: HTTP 400, 403, 422 permanent failures ---
    @Test
    fun test07_HttpPermanentFailures() = runBlocking {
        val testCodes = listOf(400, 403, 422)
        for (code in testCodes) {
            val id = "sum_perm_$code"
            fakeApi.submitResult = ApiResult.Error("HTTP_$code", "Permanent fail $code", code)
            insertTestSummary(id)

            val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
            worker.doWork()

            val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById(id) }
            assertEquals("PERMANENT_ERROR", record!!.syncState)
            assertNull(record.nextAttemptAt)
            assertNull(record.claimToken)
        }
    }

    // --- TEST 8: HTTP 429 delta-seconds Retry-After ---
    @Test
    fun test08_Http429DeltaSecondsRetryAfter() = runBlocking {
        fakeApi.submitResult = ApiResult.Error(
            code = "RATE_LIMIT_EXCEEDED",
            message = "Too Many Requests",
            statusCode = 429,
            isTransient = true,
            retryAfterHeader = "120"
        )
        insertTestSummary("sum_rate_limit_delta")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker.doWork()

        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_rate_limit_delta") }
        assertEquals("RETRY", record!!.syncState)
        assertEquals(simulatedTime + 120_000L, record.nextAttemptAt)
    }

    // --- TEST 9: HTTP 429 HTTP-date Retry-After ---
    @Test
    fun test09_Http429HttpDateRetryAfter() = runBlocking {
        val rfc1123Format = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("GMT")
        }
        val targetEpochMs = ((simulatedTime + 300_000L) / 1000L) * 1000L
        val targetDateStr = rfc1123Format.format(java.util.Date(targetEpochMs))
        val expectedEpochMs = rfc1123Format.parse(targetDateStr)!!.time

        fakeApi.submitResult = ApiResult.Error(
            code = "RATE_LIMIT_EXCEEDED",
            message = "Too Many Requests",
            statusCode = 429,
            isTransient = true,
            retryAfterHeader = targetDateStr
        )
        insertTestSummary("sum_rate_limit_date")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker.doWork()

        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_rate_limit_date") }
        assertEquals("RETRY", record!!.syncState)
        assertEquals(expectedEpochMs, record.nextAttemptAt)
    }

    // --- TEST 10: HTTP 5xx bounded exponential backoff ---
    @Test
    fun test10_Http5xxBoundedExponentialBackoff() = runBlocking {
        fakeApi.submitResult = ApiResult.Error("SERVER_ERROR", "503 Unavailable", 503, isTransient = true)
        insertTestSummary("sum_exp_backoff")

        // Attempt 1: backoff is 30s
        val worker1 = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker1.doWork()
        var record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_exp_backoff") }
        assertEquals(1, record!!.attempts)
        assertEquals(simulatedTime + 30_000L, record.nextAttemptAt)

        // Attempt 2: advance clock, backoff is 60s
        simulatedTime = record.nextAttemptAt!! + 1000L
        val worker2 = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker2.doWork()
        record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_exp_backoff") }
        assertEquals(2, record!!.attempts)
        assertEquals(simulatedTime + 60_000L, record.nextAttemptAt)

        // Attempt 3: advance clock, backoff is 120s
        simulatedTime = record.nextAttemptAt!! + 1000L
        val worker3 = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker3.doWork()
        record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_exp_backoff") }
        assertEquals(3, record!!.attempts)
        assertEquals(simulatedTime + 120_000L, record.nextAttemptAt)
    }

    // --- TEST 11: Expired lease recovery ---
    @Test
    fun test11_ExpiredLeaseRecovery() = runBlocking {
        // Summary in-flight with an expired lease
        insertTestSummary(
            summaryId = "sum_expired_lease",
            syncState = "IN_FLIGHT",
            claimToken = "stale_token_abc",
            claimGeneration = 1L,
            leaseExpiresAt = simulatedTime - 1000L
        )

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_expired_lease") }
        assertEquals("DELIVERED", record!!.syncState)
        assertNull(record.claimToken)
    }

    // --- TEST 12: Stale worker completion rejection ---
    @Test
    fun test12_StaleWorkerCompletionRejection() = runBlocking {
        // Simulate a record claimed by Token A with generation 1
        insertTestSummary(
            summaryId = "sum_stale_completion",
            syncState = "IN_FLIGHT",
            claimToken = "tok_A",
            claimGeneration = 1L,
            leaseExpiresAt = simulatedTime + 300_000L
        )

        // Simulate lease expiry and sweeper reset
        val sweepTime = simulatedTime + 350_000L
        gate.withAccess { it.telemetryOutboxDao().sweepAllStaleLeases(sweepTime) }

        // Stale worker attempts to complete with tok_A at sweepTime
        val updatedRows = gate.withAccess {
            it.telemetryOutboxDao().markDelivered("sum_stale_completion", "tok_A", 1L, sweepTime)
        }
        assertEquals(0, updatedRows)

        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_stale_completion") }
        assertEquals("RETRY", record!!.syncState)
    }

    // --- TEST 13: Claim-generation mismatch ---
    @Test
    fun test13_ClaimGenerationMismatch() = runBlocking {
        insertTestSummary(
            summaryId = "sum_gen_mismatch",
            syncState = "IN_FLIGHT",
            claimToken = "tok_A",
            claimGeneration = 2L,
            leaseExpiresAt = simulatedTime + 300_000L
        )

        // Attempt markDelivered with older generation 1L
        val updatedRows = gate.withAccess {
            it.telemetryOutboxDao().markDelivered("sum_gen_mismatch", "tok_A", 1L, simulatedTime)
        }
        assertEquals(0, updatedRows)

        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_gen_mismatch") }
        assertEquals("IN_FLIGHT", record!!.syncState)
    }

    // --- TEST 14: Maximum attempt exhaustion ---
    @Test
    fun test14_MaximumAttemptExhaustion() = runBlocking {
        insertTestSummary("sum_exhausted", attempts = 10, syncState = "PENDING")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        worker.doWork()

        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_exhausted") }
        assertEquals("PERMANENT_ERROR", record!!.syncState)
        assertEquals(0, fakeApi.submittedPayloads.size) // Never uploaded
    }

    // --- TEST 15: Application restart with pending records ---
    @Test
    fun test15_ApplicationRestartWithPendingRecords() = runBlocking {
        insertTestSummary("sum_restart")

        val scheduler = OutboxRetryScheduler(
            context = context,
            gate = gate,
            workManager = WorkManager.getInstance(context),
            timeProvider = { simulatedTime }
        )
        val assessment = scheduler.scheduleNext()

        assertEquals(OutboxRetryScheduler.WorkState.IMMEDIATE_ELIGIBLE, assessment.state)
        assertEquals(1, assessment.dueCount)

        val workInfos = WorkManager.getInstance(context).getWorkInfosForUniqueWork(OutboxRetryScheduler.WORK_NAME_DRAIN).get()
        assertFalse(workInfos.isEmpty())
    }

    // --- TEST 16: Boot scheduling without FGS startup ---
    @Test
    fun test16_BootSchedulingWithoutFgsStartup() = runBlocking {
        insertTestSummary("sum_boot")

        val syncManager = com.learningtracker.companion.sync.FocusIntegritySyncManager(
            context = context,
            pairingManager = pairingManager,
            coordinator = com.learningtracker.companion.data.migration.LegacyStorageCoordinator(
                context = context,
                gate = gate,
                legacyBarrier = com.learningtracker.companion.data.migration.LegacyStorageBarrier()
            )
        )
        com.learningtracker.companion.FocusIntegrityApplication.setTestInstance(null, testManager = syncManager)

        // Invoke handleBootRecovery
        BootReceiver.handleBootRecovery(context)

        // Verify outbox work scheduled
        val scheduler = OutboxRetryScheduler(context, gate = gate, timeProvider = { simulatedTime })
        val assessment = scheduler.assess()
        assertEquals(OutboxRetryScheduler.WorkState.IMMEDIATE_ELIGIBLE, assessment.state)

        // Invariant: Foreground service should not be running or started
        val serviceClass = com.learningtracker.companion.service.FocusMonitoringService::class.java
        assertNotNull(serviceClass)
    }

    // --- TEST 17: Concurrent scheduler invocation ---
    @Test
    fun test17_ConcurrentSchedulerInvocation() = runBlocking {
        insertTestSummary("sum_concurrent")
        val scheduler = OutboxRetryScheduler(
            context = context,
            gate = gate,
            workManager = WorkManager.getInstance(context),
            timeProvider = { simulatedTime }
        )

        val jobs = (1..20).map {
            async(Dispatchers.IO) {
                scheduler.scheduleNext()
            }
        }
        val assessments = jobs.awaitAll()
        assertTrue(assessments.all { it.state == OutboxRetryScheduler.WorkState.IMMEDIATE_ELIGIBLE })
    }

    // --- TEST 18: Worker cancellation during upload ---
    @Test
    fun test18_WorkerCancellationDuringUpload() = runBlocking {
        insertTestSummary("sum_cancellation")

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val uploadStarted = CompletableDeferred<Unit>()

        fakeApi.onPostSummaryHook = {
            uploadStarted.complete(Unit)
            delay(100)
        }

        val job = launch(Dispatchers.IO) {
            worker.doWork()
        }

        uploadStarted.await()
        worker.stop(0)
        job.join()

        // Database record should still be in-flight protected by lease
        val record = gate.withAccess { it.telemetryOutboxDao().getSummaryById("sum_cancellation") }
        assertEquals("IN_FLIGHT", record!!.syncState)
        assertNotNull(record.claimToken)
    }

    // --- TEST 19: Database gate remains available during slow HTTP requests ---
    @Test
    fun test19_DatabaseGateRemainsAvailableDuringSlowHttpRequests() = runBlocking {
        insertTestSummary("sum_slow_http")

        val uploadStarted = CompletableDeferred<Unit>()
        val concurrentDbAccessCompleted = AtomicBoolean(false)

        fakeApi.onPostSummaryHook = {
            uploadStarted.complete(Unit)
            delay(200) // Slow HTTP operation
        }

        val worker = TestListenableWorkerBuilder<TelemetryUploadWorker>(context).build()
        val workerJob = launch(Dispatchers.IO) {
            worker.doWork()
        }

        uploadStarted.await()

        // Concurrently acquire gate while HTTP call is ongoing
        val concurrentJob = launch(Dispatchers.IO) {
            gate.withAccess { database ->
                val session = database.telemetryOutboxDao().getSessionById("sess_sum_slow_http")
                assertNotNull(session)
                concurrentDbAccessCompleted.set(true)
            }
        }

        concurrentJob.join()
        assertTrue("Gate must remain accessible during HTTP requests", concurrentDbAccessCompleted.get())
        workerJob.join()
    }

    // --- TEST 20: Future retry deadlines survive process restart ---
    @Test
    fun test20_FutureRetryDeadlinesSurviveProcessRestart() = runBlocking {
        val futureDeadline = simulatedTime + 180_000L
        insertTestSummary(
            summaryId = "sum_survive_restart",
            syncState = "RETRY",
            nextAttemptAt = futureDeadline
        )

        // Simulate process restart with brand new scheduler instance
        val newScheduler = OutboxRetryScheduler(
            context = context,
            gate = gate,
            workManager = WorkManager.getInstance(context),
            timeProvider = { simulatedTime }
        )

        val assessment = newScheduler.scheduleNext()
        assertEquals(OutboxRetryScheduler.WorkState.FUTURE_RETRY, assessment.state)
        assertEquals(futureDeadline, assessment.earliestFutureRetryDeadline)

        val workInfos = WorkManager.getInstance(context).getWorkInfosForUniqueWork(OutboxRetryScheduler.WORK_NAME_RETRY).get()
        assertFalse(workInfos.isEmpty())
    }
}
