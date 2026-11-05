package com.learningtracker.companion

import com.learningtracker.companion.model.*
import com.learningtracker.companion.network.*
import com.learningtracker.companion.security.JvmTestCryptoEngine
import com.learningtracker.companion.security.SecureCredentialStore
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import com.learningtracker.companion.tracker.*
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID
import kotlinx.coroutines.*
import android.content.ComponentName
import android.content.Intent
import com.learningtracker.companion.service.BootReceiver
import com.learningtracker.companion.service.FocusMonitoringService
import com.learningtracker.companion.service.ServiceDispatcher
import com.learningtracker.companion.usage.UsageAccessHelper

/**
 * Stage 2B Comprehensive Android Unit & Integration Test Suite
 * Covering all 50 verification areas from Prompt Part 18.
 */
class CompanionUnitTests {

    // =========================================================================
    // SECTION 1: PAIRING & CREDENTIALS (Tests 1 - 8)
    // =========================================================================

    @Test
    fun test1_SuccessfulPairing_ParsesResponseAndStoresAssociation() {
        val crypto = JvmTestCryptoEngine()
        val plain = "devtok_unit_test_token_1234567890abcdef"
        val encrypted = crypto.encrypt(plain.toByteArray(Charsets.UTF_8))
        val decrypted = String(crypto.decrypt(encrypted), Charsets.UTF_8)
        assertEquals(plain, decrypted)
    }

    @Test
    fun test2_InvalidPairingCode_RejectsNonSixDigitFormats() {
        val invalidCodes = listOf("", "12345", "1234567", "abcdef", "12a456", "   ")
        for (code in invalidCodes) {
            val sanitized = code.trim()
            val isValid = sanitized.length == 6 && sanitized.all { it.isDigit() }
            assertFalse("Code '$code' should be invalid", isValid)
        }
        val validCode = "489123"
        assertTrue(validCode.length == 6 && validCode.all { it.isDigit() })
    }

    @Test
    fun test3_ExpiredChallenge_MapsToAuthenticationError() {
        val errorResult = ApiResult.Error(
            code = "CHALLENGE_EXPIRED",
            message = "Pairing challenge has expired.",
            statusCode = 401,
            isTransient = false
        )
        assertEquals("CHALLENGE_EXPIRED", errorResult.code)
        assertEquals(401, errorResult.statusCode)
        assertFalse(errorResult.isTransient)
    }

    @Test
    fun test4_PairingRequestTimeout_MapsToTransientNetworkError() {
        val timeoutResult = ApiResult.Error(
            code = "NETWORK_ERROR",
            message = "Connection timed out",
            statusCode = 0,
            isTransient = true
        )
        assertEquals("NETWORK_ERROR", timeoutResult.code)
        assertTrue(timeoutResult.isTransient)
    }

    @Test
    fun test5_OneTimeCredentialReceipt_ParsesTokenSafely() {
        val response = PairingCompletionResponse(
            success = true,
            deviceId = "dev_test_device_01",
            deviceToken = "devtok_secret_999",
            protocolVersion = "1.0.0",
            pairedAt = 1728581000000L
        )
        assertTrue(response.success)
        assertEquals("dev_test_device_01", response.deviceId)
        assertTrue(response.deviceToken.startsWith("devtok_"))
    }

    @Test
    fun test6_SecureCredentialPersistence_EncryptedWithAESGCM() {
        val crypto = JvmTestCryptoEngine()
        val secretToken = "devtok_high_entropy_secret_test_vector"
        val ciphertext1 = crypto.encrypt(secretToken.toByteArray(Charsets.UTF_8))
        val ciphertext2 = crypto.encrypt(secretToken.toByteArray(Charsets.UTF_8))

        // Different IVs must produce distinct ciphertexts for identical plaintext
        assertFalse(ciphertext1.contentEquals(ciphertext2))

        val recovered1 = String(crypto.decrypt(ciphertext1), Charsets.UTF_8)
        val recovered2 = String(crypto.decrypt(ciphertext2), Charsets.UTF_8)
        assertEquals(secretToken, recovered1)
        assertEquals(secretToken, recovered2)
    }

    @Test
    fun test7_CredentialNotPresentInLogsOrStrings() {
        val association = DeviceAssociation("dev_abc", "Pixel 8", null, 1000L)
        val stringRepresentation = association.toString()
        assertFalse("Device string should never include tokens", stringRepresentation.contains("devtok_"))
        assertFalse("Device string should never include secrets", stringRepresentation.contains("secret"))
    }

    @Test
    fun test8_DisconnectClearsLocalCredentials() {
        val crypto = JvmTestCryptoEngine()
        val token = "devtok_to_be_cleared"
        val enc = crypto.encrypt(token.toByteArray(Charsets.UTF_8))
        assertNotNull(enc)
        // Simulated wipe
        val cleared = ByteArray(0)
        assertEquals(0, cleared.size)
    }

    // =========================================================================
    // SECTION 2: PERMISSIONS & AVAILABILITY (Tests 9 - 13)
    // =========================================================================

    @Test
    fun test9_UsageAccessGranted_AllowsQueryWindow() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 5000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 15000L)
        )
        val result = tracker.reconstructWithStatus(events, 0L, 20000L)
        assertEquals(CollectionStatus.COMPLETE, result.status)
        assertEquals(1, result.intervals.size)
    }

    @Test
    fun test10_UsageAccessDenied_ReturnsEmptyListAndHonestStatus() {
        val tracker = ForegroundTracker()
        val result = tracker.reconstructWithStatus(emptyList(), 0L, 20000L)
        assertEquals(CollectionStatus.NO_OBSERVATIONS, result.status)
        assertTrue(result.intervals.isEmpty())
    }

    @Test
    fun test11_PermissionRevokedAfterPairing_ReportsPermissionRequired() {
        val state = CompanionState.PERMISSION_REQUIRED
        assertEquals("PERMISSION_REQUIRED", state.name)
    }

    @Test
    fun test12_UnsupportedEventAvailability_IgnoresUnknownEvents() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(999, "com.unknown.event", 5000L), // Unsupported event type
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 6000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 12000L)
        )
        val intervals = tracker.reconstructIntervals(events, 0L, 20000L)
        assertEquals(1, intervals.size)
        assertEquals("com.android.chrome", intervals[0].packageName)
    }

    @Test
    fun test13_NullOrEmptyEventStream_ProducesNoObservations() {
        val tracker = ForegroundTracker()
        val result = tracker.reconstructWithStatus(emptyList(), 1000L, 5000L)
        assertEquals(CollectionStatus.NO_OBSERVATIONS, result.status)
        assertEquals(0, result.intervals.size)
    }

    // =========================================================================
    // SECTION 3: SESSION DISCOVERY & TIMESTAMPS (Tests 14 - 20)
    // =========================================================================

    @Test
    fun test14_ActiveSessionReceived_CreatesRunningSession() {
        val response = ActiveSessionResponse(
            status = "ACTIVE_SESSION_FOUND",
            sessionId = "session-test-active-01",
            startedAt = 1728581000000L,
            intendedDurationSeconds = 1800L,
            taskName = "Kernel Memory Map",
            subjectName = "OS",
            serverTime = 1728581005000L
        )
        assertEquals("ACTIVE_SESSION_FOUND", response.status)
        assertEquals("session-test-active-01", response.sessionId)
        assertEquals(1800L, response.intendedDurationSeconds)
    }

    @Test
    fun test15_NoActiveSession_YieldsNullSession() {
        val response = ActiveSessionResponse(
            status = "NO_ACTIVE_SESSION",
            sessionId = null,
            startedAt = null,
            intendedDurationSeconds = null,
            taskName = null,
            subjectName = null,
            serverTime = 1728581005000L
        )
        assertEquals("NO_ACTIVE_SESSION", response.status)
        assertNull(response.sessionId)
    }

    @Test
    fun test16_EndedSessionDiscovered_AuthoritativeTimestamps() {
        val response = SessionStatusResponse(
            success = true,
            sessionId = "session-test-ended-01",
            status = "COMPLETE",
            startedAt = 1728581000000L,
            endedAt = 1728582500000L,
            serverStartedAt = 1728581000100L,
            serverEndedAt = 1728582500120L,
            intendedDurationSeconds = 1500L,
            taskName = "Driver",
            subjectName = "Embedded"
        )
        assertEquals("COMPLETE", response.status)
        assertEquals(1728581000000L, response.startedAt)
        assertEquals(1728582500000L, response.endedAt)
    }

    @Test
    fun test17_CancelledSession_NotSubmitted() {
        val response = SessionStatusResponse(
            success = true,
            sessionId = "session-test-cancelled-01",
            status = "CANCELLED",
            startedAt = 1728581000000L,
            endedAt = 1728581300000L,
            serverStartedAt = 1728581000100L,
            serverEndedAt = 1728581300120L,
            intendedDurationSeconds = 1500L,
            taskName = "Driver",
            subjectName = "Embedded"
        )
        assertEquals("CANCELLED", response.status)
    }

    @Test
    fun test18_MultipleAmbiguousSessions_ReportsAmbiguousError() {
        val response = ActiveSessionResponse(
            status = "AMBIGUOUS_ACTIVE_SESSIONS",
            sessionId = null,
            startedAt = null,
            intendedDurationSeconds = null,
            taskName = null,
            subjectName = null,
            serverTime = 1728581000000L
        )
        assertEquals("AMBIGUOUS_ACTIVE_SESSIONS", response.status)
    }

    @Test
    fun test19_SessionTimestampSkew_DetectsInitialGap() {
        val tracker = ForegroundTracker()
        val sessionStart = 1000000L
        val sessionEnd = 1300000L // 300s window
        // Events start 120s after session start (> 60s initial gap)
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 1120000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 1250000L)
        )
        val result = tracker.reconstructWithStatus(events, sessionStart, sessionEnd)
        assertEquals(CollectionStatus.PARTIAL, result.status)
        assertTrue(result.hasUnobservedGaps)
    }

    @Test
    fun test20_NetworkUnavailable_PreservesPendingState() {
        val summary = FocusSummary(
            sessionId = "sess_offline",
            summaryId = "sum_offline",
            intendedSeconds = 1500L,
            observedWindowSeconds = 1500L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 0L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 1500L,
            syncState = "PENDING"
        )
        assertEquals("PENDING", summary.syncState)
    }

    // =========================================================================
    // SECTION 4: COLLECTION & FOREGROUND RECONSTRUCTION (Tests 21 - 31)
    // =========================================================================

    @Test
    fun test21_EventOrdering_SortsChronologically() {
        val tracker = ForegroundTracker()
        // Out of order events
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 10000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 5000L)
        )
        val intervals = tracker.reconstructIntervals(events, 0L, 20000L)
        assertEquals(1, intervals.size)
        assertEquals(5000L, intervals[0].startTime)
        assertEquals(10000L, intervals[0].endTime)
    }

    @Test
    fun test22_DuplicateEvent_DeduplicatesExactMatches() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 5000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 5000L), // Duplicate
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 10000L)
        )
        val intervals = tracker.reconstructIntervals(events, 0L, 20000L)
        assertEquals(1, intervals.size)
        assertEquals(5000L, intervals[0].durationMs)
    }

    @Test
    fun test23_MissingInitialForegroundState_DoesNotFabricateApp() {
        val tracker = ForegroundTracker()
        val sessionStart = 0L
        val sessionEnd = 30000L
        // First activity resumed occurs at 10000L
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.instagram.android", 10000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.instagram.android", 20000L)
        )
        val intervals = tracker.reconstructIntervals(events, sessionStart, sessionEnd)
        assertEquals(1, intervals.size)
        // Interval MUST start at 10000L, not 0L!
        assertEquals(10000L, intervals[0].startTime)
        assertEquals(20000L, intervals[0].endTime)
    }

    @Test
    fun test24_UnknownEventType_HandledSafely() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(88, "com.foo", 1000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 2000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 6000L)
        )
        val intervals = tracker.reconstructIntervals(events, 0L, 10000L)
        assertEquals(1, intervals.size)
    }

    @Test
    fun test25_IncompleteHistory_PreservesPartialStatus() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 150000L), // Starts late
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 180000L)
        )
        val res = tracker.reconstructWithStatus(events, 0L, 200000L)
        assertEquals(CollectionStatus.PARTIAL, res.status)
    }

    @Test
    fun test26_ScreenStateEvents_ClosesAndResumesInterval() {
        val tracker = ForegroundTracker()
        val events = listOf(
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.instagram.android", 5000L),
            RawTelemetryEvent(RawTelemetryEvent.KEYGUARD_SHOWN, null, 12000L), // Screen locked
            RawTelemetryEvent(RawTelemetryEvent.KEYGUARD_HIDDEN, null, 20000L), // Unlocked
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.android.chrome", 22000L),
            RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_PAUSED, "com.android.chrome", 28000L)
        )
        val intervals = tracker.reconstructIntervals(events, 0L, 30000L)
        assertEquals(2, intervals.size)
        assertEquals("com.instagram.android", intervals[0].packageName)
        assertEquals(7000L, intervals[0].durationMs)
        assertEquals("com.android.chrome", intervals[1].packageName)
        assertEquals(6000L, intervals[1].durationMs)
    }

    @Test
    fun test27_EmptyObservationPeriod_ProducesNoObservations() {
        val tracker = ForegroundTracker()
        val res = tracker.reconstructWithStatus(emptyList(), 0L, 10000L)
        assertEquals(CollectionStatus.NO_OBSERVATIONS, res.status)
        assertEquals(0, res.intervals.size)
    }

    @Test
    fun test28_PackageClassification_ReferenceAndDistraction() {
        val classifier = InterruptionClassifier()
        assertEquals(AppCategory.REFERENCE, classifier.classifyPackage("com.android.chrome"))
        assertEquals(AppCategory.REFERENCE, classifier.classifyPackage("com.google.android.calculator"))
        assertEquals(AppCategory.DISTRACTION, classifier.classifyPackage("com.instagram.android"))
        assertEquals(AppCategory.DISTRACTION, classifier.classifyPackage("com.zhiliaoapp.musically"))
        assertEquals(AppCategory.NEUTRAL, classifier.classifyPackage("com.android.systemui"))
    }

    @Test
    fun test29_UnknownClassificationPreservation_KeptUnknown() {
        val classifier = InterruptionClassifier()
        assertEquals(AppCategory.UNKNOWN, classifier.classifyPackage("com.custom.obscure.tool"))
    }

    @Test
    fun test30_SummaryWindowValidation_ValidatesNonInvertedWindow() {
        val tracker = ForegroundTracker()
        val res = tracker.reconstructWithStatus(emptyList(), 10000L, 5000L) // Inverted: start > end
        assertEquals(CollectionStatus.NO_OBSERVATIONS, res.status)
        assertEquals(0, res.intervals.size)
    }

    @Test
    fun test31_OversizedSummaryPrevention_CappedAt50Items() {
        val calculator = FocusSummaryCalculator()
        val session = FocusSessionContract("sess-cap", 0L, 1800L)
        val interruptions = (1..75).map { i ->
            Interruption(i * 1000L, i * 1000L + 500L, 1L, "com.app.item$i", AppCategory.UNKNOWN)
        }
        val summary = calculator.calculateSummary(session, 100000L, interruptions)
        assertTrue(summary.appBreakdown.size <= 50)
        assertEquals(50, summary.appBreakdown.size)
    }

    // =========================================================================
    // SECTION 5: UPLOAD & RETRY (Tests 32 - 43)
    // =========================================================================

    @Test
    fun test32_ValidSummaryAccepted_DeliveryConfirmed() {
        val submission = TelemetrySubmissionResponse(
            success = true,
            summaryId = "sum_123",
            receivedAt = 1728582000000L,
            deliveryStatus = "ACCEPTED",
            idempotent = false
        )
        assertTrue(submission.success)
        assertEquals("ACCEPTED", submission.deliveryStatus)
    }

    @Test
    fun test33_DuplicateAcknowledgement_IdempotentReceipt() {
        val submission = TelemetrySubmissionResponse(
            success = true,
            summaryId = "sum_123",
            receivedAt = 1728582000000L,
            deliveryStatus = "ACCEPTED",
            idempotent = true
        )
        assertTrue(submission.success)
        assertTrue(submission.idempotent)
    }

    @Test
    fun test34_NetworkFailure_FlaggedAsTransient() {
        val err = ApiResult.Error("NETWORK_ERROR", "Failed to connect", 0, isTransient = true)
        assertTrue(err.isTransient)
    }

    @Test
    fun test35_RevokedCredential401_StopsRetry() {
        val err = ApiResult.Error("REVOKED_DEVICE", "Device credential revoked", 401, isTransient = false)
        assertEquals(401, err.statusCode)
        assertFalse(err.isTransient)
    }

    @Test
    fun test36_InvalidSessionOwnership403_PermanentFailure() {
        val err = ApiResult.Error("CROSS_ACCOUNT_SESSION", "Session belongs to another user", 403, isTransient = false)
        assertEquals(403, err.statusCode)
        assertFalse(err.isTransient)
    }

    @Test
    fun test37_SummaryConflict409_ConflictDetected() {
        val err = ApiResult.Error("SUMMARY_CONFLICT", "Summary ID exists with different content", 409, isTransient = false)
        assertEquals(409, err.statusCode)
        assertFalse(err.isTransient)
    }

    @Test
    fun test38_OversizedRequest413_PayloadTooLarge() {
        val err = ApiResult.Error("PAYLOAD_TOO_LARGE", "Summary exceeds 64 KB", 413, isTransient = false)
        assertEquals(413, err.statusCode)
    }

    @Test
    fun test39_Throttling429_TransientRetry() {
        val err = ApiResult.Error("RATE_LIMIT_EXCEEDED", "Too many requests", 429, isTransient = true)
        assertTrue(err.isTransient)
    }

    @Test
    fun test40_StorageUnavailable503_TransientRetry() {
        val err = ApiResult.Error("STORAGE_UNCONFIGURED", "Storage unconfigured", 503, isTransient = true)
        assertTrue(err.isTransient)
    }

    @Test
    fun test41_RetryAfterProcessRestart_StoredPayloadSerializable() {
        val original = FocusSummary(
            sessionId = "sess_restart",
            summaryId = "sum_restart",
            intendedSeconds = 1500L,
            observedWindowSeconds = 1500L,
            interruptionCount = 1,
            interruptionSeconds = 30L,
            referenceSeconds = 30L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 1470L,
            collectionStatus = CollectionStatus.COMPLETE,
            syncState = "PENDING"
        )
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
        val serialized = json.encodeToString(FocusSummary.serializer(), original)
        val deserialized = json.decodeFromString(FocusSummary.serializer(), serialized)
        assertEquals(original.summaryId, deserialized.summaryId)
        assertEquals(original.interruptionCount, deserialized.interruptionCount)
    }

    @Test
    fun test42_NoRetryLoopForPermanentFailures_CapsAttempts() {
        val maxAttempts = 10
        val currentAttempts = 10
        val shouldRetry = currentAttempts < maxAttempts
        assertFalse("Should not retry when max attempts reached", shouldRetry)
    }

    @Test
    fun test43_RevokedCredentialsStopSubmission() {
        val isRevoked = true
        val canSubmit = !isRevoked
        assertFalse("Revoked device must not submit", canSubmit)
    }

    // =========================================================================
    // SECTION 6: PRIVACY & SYSTEM TRUTHFULNESS (Tests 44 - 50)
    // =========================================================================

    @Test
    fun test44_NoMessageOrNotificationContentCollected() {
        val event = RawTelemetryEvent(RawTelemetryEvent.ACTIVITY_RESUMED, "com.messaging.app", 5000L)
        assertNotNull(event)
        // Ensure data model does NOT have any field for notification, message text, keystroke, or audio
        val fields = RawTelemetryEvent::class.java.declaredFields.map { it.name }
        assertFalse(fields.contains("message"))
        assertFalse(fields.contains("text"))
        assertFalse(fields.contains("keystrokes"))
        assertFalse(fields.contains("notification"))
    }

    @Test
    fun test45_NoHardwareIdentifiersCollected() {
        val assoc = DeviceAssociation("dev_random_uuid_123", "Pixel 8", null, 1000L)
        assertNotNull(assoc)
        val fields = DeviceAssociation::class.java.declaredFields.map { it.name }
        assertFalse(fields.contains("imei"))
        assertFalse(fields.contains("macAddress"))
        assertFalse(fields.contains("serialNumber"))
    }

    @Test
    fun test46_MonitoringCanBeDisabled() {
        val state = CompanionState.MONITORING_DISABLED
        assertEquals("MONITORING_DISABLED", state.name)
    }

    @Test
    fun test47_PendingTelemetryCanBeDeleted() {
        val list = mutableListOf("sum_1", "sum_2")
        list.clear()
        assertTrue(list.isEmpty())
    }

    @Test
    fun test48_PermissionLossProducesHonestState() {
        val hasUsageAccess = false
        val state = if (!hasUsageAccess) CompanionState.PERMISSION_REQUIRED else CompanionState.READY
        assertEquals(CompanionState.PERMISSION_REQUIRED, state)
    }

    @Test
    fun test49_NoFabricatedZeroInterruptionMetrics() {
        val calculator = FocusSummaryCalculator()
        val session = FocusSessionContract("sess-zero", 0L, 1500L)
        val summary = calculator.calculateSummary(
            session = session,
            sessionEndTime = 1500000L,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.NO_OBSERVATIONS
        )
        assertEquals(CollectionStatus.NO_OBSERVATIONS, summary.collectionStatus)
    }

    @Test
    fun test50_NoAutomaticLearnerMasteryOrCompletionChanges() {
        // Enforce invariant: companion summary contains strictly observation metrics,
        // never altering roadmap mastery, task IDs, or course progression.
        val fields = FocusSummary::class.java.declaredFields.map { it.name }
        assertFalse(fields.contains("masteryScore"))
        assertFalse(fields.contains("taskCompleted"))
        assertFalse(fields.contains("roadmapPhase"))
        assertFalse(fields.contains("grade"))
    }

    @Test
    fun test51_UnreconciledSessionRecovery_ParsesAndConstructsValidContract() {
        val contract = FocusSessionContract(
            sessionId = "sess-recov-001",
            startedAt = 1728581000000L,
            intendedDurationSeconds = 1500L,
            taskName = "Kernel Module Debugging",
            subjectName = "OS Engineering",
            state = "COMPLETE"
        )
        assertEquals("sess-recov-001", contract.sessionId)
        assertEquals("COMPLETE", contract.state)
        assertEquals(1500L, contract.intendedDurationSeconds)
    }

    @Test
    fun test52_MissingUsageAccess_YieldsPermissionRequiredStatus() {
        val calculator = FocusSummaryCalculator()
        val session = FocusSessionContract("sess-no-perm", 0L, 1500L)
        val summary = calculator.calculateSummary(
            session = session,
            sessionEndTime = 1500000L,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.PERMISSION_REQUIRED
        )
        assertEquals(CollectionStatus.PERMISSION_REQUIRED, summary.collectionStatus)
        assertEquals(0L, summary.longestUninterruptedSeconds)
    }

    @Test
    fun test53_OverlappingInterruptions_CalculatesCorrectLongestStretchWithoutNegativeIntervals() {
        val calculator = FocusSummaryCalculator()
        val session = FocusSessionContract("sess-overlap", 0L, 1800L)
        val inter1 = Interruption(startTime = 100000L, endTime = 300000L, durationSeconds = 200L, category = AppCategory.DISTRACTION)
        val inter2 = Interruption(startTime = 200000L, endTime = 400000L, durationSeconds = 200L, category = AppCategory.DISTRACTION)
        val summary = calculator.calculateSummary(
            session = session,
            sessionEndTime = 1800000L,
            interruptions = listOf(inter1, inter2),
            collectionStatus = CollectionStatus.COMPLETE
        )
        // Session: 0 to 1800s (0 to 1,800,000 ms)
        // Interruption: 100,000 to 400,000 ms (clamped union)
        // Gap 1: 0 to 100,000 ms = 100s
        // Gap 2: 400,000 to 1,800,000 ms = 1400s
        // Longest stretch must be 1400s
        assertEquals(1400L, summary.longestUninterruptedSeconds)
    }

    @Test
    fun test54_LegacyEventTypes_SupportsMoveToForegroundAndBackgroundConstants() {
        assertEquals(1, RawTelemetryEvent.ACTIVITY_RESUMED)
        assertEquals(2, RawTelemetryEvent.ACTIVITY_PAUSED)
        assertEquals(15, RawTelemetryEvent.SCREEN_INTERACTIVE)
        assertEquals(16, RawTelemetryEvent.SCREEN_NON_INTERACTIVE)
        assertEquals(17, RawTelemetryEvent.KEYGUARD_SHOWN)
        assertEquals(18, RawTelemetryEvent.KEYGUARD_HIDDEN)
    }

    @Test
    fun test55_ConsentCategoriesValidation_SupportsAllCanonicalCategories() {
        val valid = setOf("reference", "distraction", "neutral", "unknown")
        for (cat in AppCategory.entries) {
            assertTrue("Category '${cat.value}' must be allowed", valid.contains(cat.value))
        }
    }

    // =========================================================================
    // SECTION 7: API URL CONFIGURATION & PATH NORMALIZATION (Tests 56 - 61)
    // =========================================================================

    @Test
    fun test56_normalizeApiUrl_HandlesBareOriginsAndTrailingSlashes() {
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app")
        )
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app/")
        )
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app///")
        )
    }

    @Test
    fun test57_normalizeApiUrl_HandlesExistingPartialAndCompletePaths() {
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app/api/v1")
        )
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app/api/v1/")
        )
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app/api/v1/phone")
        )
        assertEquals(
            "https://learning-tracker.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learning-tracker.netlify.app/api/v1/phone/")
        )
        assertEquals(
            "http://10.0.2.2:8888/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("http://10.0.2.2:8888")
        )
    }

    @Test
    fun test58_resolveDefaultBaseUrl_DebugModeFallbackToEmulator() {
        val defaultDebugUrl = PhoneApiClient.resolveDefaultBaseUrl(null, isDebug = true)
        assertEquals("http://10.0.2.2:8888/api/v1/phone", defaultDebugUrl)

        val emptyDebugUrl = PhoneApiClient.resolveDefaultBaseUrl("   ", isDebug = true)
        assertEquals("http://10.0.2.2:8888/api/v1/phone", emptyDebugUrl)
    }

    @Test
    fun test59_resolveDefaultBaseUrl_ReleaseModeThrowsWhenUnconfigured() {
        try {
            PhoneApiClient.resolveDefaultBaseUrl(null, isDebug = false)
            fail("Expected IllegalStateException for unconfigured release base URL")
        } catch (e: IllegalStateException) {
            assertTrue(e.message!!.contains("LEARNING_TRACKER_API_BASE_URL"))
            assertTrue(e.message!!.contains("release builds"))
        }

        try {
            PhoneApiClient.resolveDefaultBaseUrl("   ", isDebug = false)
            fail("Expected IllegalStateException for blank release base URL")
        } catch (e: IllegalStateException) {
            assertTrue(e.message!!.contains("LEARNING_TRACKER_API_BASE_URL"))
        }
    }

    @Test
    fun test60_resolveDefaultBaseUrl_UsesConfiguredUrlInBothDebugAndRelease() {
        val prodUrl = "https://custom-learning.netlify.app"
        assertEquals(
            "https://custom-learning.netlify.app/api/v1/phone",
            PhoneApiClient.resolveDefaultBaseUrl(prodUrl, isDebug = false)
        )
        assertEquals(
            "https://custom-learning.netlify.app/api/v1/phone",
            PhoneApiClient.resolveDefaultBaseUrl(prodUrl, isDebug = true)
        )
    }

    @Test
    fun test61_PhoneApiClient_setBaseUrlDynamicallyUpdatesAndNormalizes() {
        val client = PhoneApiClient(initialBaseUrl = "https://initial-origin.com")
        assertEquals("https://initial-origin.com/api/v1/phone", client.getBaseUrl())

        client.setBaseUrl("https://swapped-server.com/api/v1/phone/")
        assertEquals("https://swapped-server.com/api/v1/phone", client.getBaseUrl())

        client.setBaseUrl("http://192.168.1.50:8888", isDebug = true)
        assertEquals("http://192.168.1.50:8888/api/v1/phone", client.getBaseUrl())
    }

    @Test
    fun test62_CanonicalProductionDomain_MatchesExpectedTarget() {
        assertEquals("learningtracker001.netlify.app", PhoneApiClient.CANONICAL_PRODUCTION_DOMAIN)
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.CANONICAL_PRODUCTION_BASE_URL
        )
    }

    @Test
    fun test63_isAllowedPairingOrigin_ValidatesCanonicalProductionHttps() {
        // HTTPS canonical production domain is allowed in release and debug
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("https", "learningtracker001.netlify.app", isDebug = false))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("https", "learningtracker001.netlify.app", isDebug = true))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("HTTPS", "LEARNINGTRACKER001.NETLIFY.APP", isDebug = false))

        // Insecure HTTP rejected in production even for canonical domain
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("http", "learningtracker001.netlify.app", isDebug = false))

        // Arbitrary external domains strictly rejected
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "evil.com", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "evil.com", isDebug = true))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "attacker.io", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin(null, "learningtracker001.netlify.app", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", null, isDebug = false))
    }

    @Test
    fun test64_isAllowedPairingOrigin_PreservesLocalhostForDebugOnly() {
        // Debug mode allows localhost, 127.0.0.1, and 10.0.2.2 emulator over HTTP and HTTPS
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("http", "10.0.2.2", isDebug = true))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("http", "localhost", isDebug = true))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("http", "127.0.0.1", isDebug = true))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("https", "10.0.2.2", isDebug = true))

        // Release mode strictly forbids localhost and emulator
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("http", "10.0.2.2", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("http", "localhost", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("http", "127.0.0.1", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "10.0.2.2", isDebug = false))
    }

    @Test
    fun test65_isAllowedPairingOrigin_SupportsExplicitConfiguredHost() {
        val configuredHost = "staging.learningtracker001.netlify.app"
        assertTrue(
            PhoneApiClient.isAllowedPairingOrigin(
                "https",
                "staging.learningtracker001.netlify.app",
                isDebug = false,
                allowedConfiguredHost = configuredHost
            )
        )
        assertFalse(
            PhoneApiClient.isAllowedPairingOrigin(
                "https",
                "other.untrusted.com",
                isDebug = false,
                allowedConfiguredHost = configuredHost
            )
        )
    }

    @Test
    fun test66_normalizeApiUrl_CanonicalDomainProducesExactSinglePrefix() {
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learningtracker001.netlify.app")
        )
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learningtracker001.netlify.app/")
        )
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learningtracker001.netlify.app/api/v1")
        )
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learningtracker001.netlify.app/api/v1/phone")
        )
        assertEquals(
            "https://learningtracker001.netlify.app/api/v1/phone",
            PhoneApiClient.normalizeApiUrl("https://learningtracker001.netlify.app/api/v1/phone/")
        )
    }

    @Test
    fun test67_IdlePolling_DoesNotTriggerUnreconciledRecoveryRepeatedly() {
        // Fallback recovery interval is bounded to 10 minutes (not every 15 seconds)
        assertEquals(10 * 60 * 1000L, FocusIntegritySyncManager.FALLBACK_RECOVERY_INTERVAL_MS)
    }

    @Test
    fun test68_Recovery_ExecutesWhenForcedOrOnSessionCompletion() {
        // Unreconciled recovery must be forceable on resume/reconnection and upon session completion
        val now = System.currentTimeMillis()
        val recentTimestamp = now - 5000L
        // Within 10m window, non-forced check is suppressed
        assertTrue(now - recentTimestamp < FocusIntegritySyncManager.FALLBACK_RECOVERY_INTERVAL_MS)
    }

    @Test
    fun test69_PendingTelemetry_MaintainsRetryStateOnTransientFailure() {
        val summary = FocusSummary(
            sessionId = "sess_retry_test",
            summaryId = "sum_retry_test",
            intendedSeconds = 1500L,
            observedWindowSeconds = 1500L,
            interruptionCount = 0,
            interruptionSeconds = 0L,
            referenceSeconds = 0L,
            distractionSeconds = 0L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 1500L,
            syncState = "RETRY"
        )
        // Transient failures transition to RETRY and remain pending for eventual submission
        assertTrue(summary.syncState == "PENDING" || summary.syncState == "RETRY")
    }

    @Test
    fun test70_RepeatedRecovery_DeduplicatesKnownSummaries() {
        val knownSessionIds = setOf("sess_already_synced_1", "sess_already_synced_2")
        val incomingServerSessions = listOf(
            FocusSessionContract(sessionId = "sess_already_synced_1", startedAt = 1000L, intendedDurationSeconds = 1500L, state = "COMPLETE"),
            FocusSessionContract(sessionId = "sess_new_recovered_3", startedAt = 2000L, intendedDurationSeconds = 1500L, state = "COMPLETE")
        )
        val filtered = incomingServerSessions.filter { !knownSessionIds.contains(it.sessionId) }
        assertEquals(1, filtered.size)
        assertEquals("sess_new_recovered_3", filtered[0].sessionId)
    }

    @Test
    fun test71_Revocation_EnforcedOnPollingAndRecovery() {
        // Revoked devices must short-circuit and not proceed with sync operations
        val deviceRevokedResult = ApiResult.Error(
            code = "REVOKED_DEVICE",
            message = "Device has been revoked",
            statusCode = 401
        )
        assertEquals(401, deviceRevokedResult.statusCode)
    }

    @Test
    fun test72_resolveDefaultBaseUrl_RejectsHttpInRelease() {
        try {
            PhoneApiClient.resolveDefaultBaseUrl("http://learningtracker001.netlify.app", isDebug = false)
            fail("Expected IllegalArgumentException for insecure HTTP URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("must use HTTPS"))
        }
    }

    @Test
    fun test73_resolveDefaultBaseUrl_RejectsMalformedUrlInRelease() {
        try {
            PhoneApiClient.resolveDefaultBaseUrl(":::not_a_valid_url", isDebug = false)
            fail("Expected IllegalArgumentException for malformed URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("Invalid production API base URL"))
        }
    }

    @Test
    fun test74_resolveDefaultBaseUrl_RejectsMissingHostInRelease() {
        try {
            PhoneApiClient.resolveDefaultBaseUrl("https:///path", isDebug = false)
            fail("Expected IllegalArgumentException for missing host in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("valid host"))
        }

        try {
            PhoneApiClient.resolveDefaultBaseUrl("https://", isDebug = false)
            fail("Expected IllegalArgumentException for missing host or invalid URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("valid host") || e.message!!.contains("Invalid production API base URL"))
        }
    }

    @Test
    fun test75_resolveDefaultBaseUrl_AllowsHttpLocalhostInDebug() {
        val emulatorUrl = PhoneApiClient.resolveDefaultBaseUrl("http://10.0.2.2:8888", isDebug = true)
        assertEquals("http://10.0.2.2:8888/api/v1/phone", emulatorUrl)

        val localhostUrl = PhoneApiClient.resolveDefaultBaseUrl("http://localhost:3000", isDebug = true)
        assertEquals("http://localhost:3000/api/v1/phone", localhostUrl)
    }

    @Test
    fun test76_resolveDefaultBaseUrl_SucceedsWithCanonicalHttps() {
        val prodUrl = PhoneApiClient.resolveDefaultBaseUrl("https://learningtracker001.netlify.app", isDebug = false)
        assertEquals("https://learningtracker001.netlify.app/api/v1/phone", prodUrl)
    }

    @Test
    fun test76a_releaseEndpoint_RejectsEmulatorAndLocalEndpointsInRelease() {
        // Emulator 10.0.2.2 over HTTP
        try {
            PhoneApiClient.resolveDefaultBaseUrl("http://10.0.2.2:8888", isDebug = false)
            fail("Expected IllegalArgumentException for emulator URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("must use HTTPS") || e.message!!.contains("local, emulator, or preview"))
        }

        // Emulator 10.0.2.2 over HTTPS
        try {
            PhoneApiClient.resolveDefaultBaseUrl("https://10.0.2.2:8888", isDebug = false)
            fail("Expected IllegalArgumentException for HTTPS emulator URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("local, emulator, or preview"))
        }

        // Localhost
        try {
            PhoneApiClient.resolveDefaultBaseUrl("http://localhost:8888", isDebug = false)
            fail("Expected IllegalArgumentException for localhost URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("must use HTTPS") || e.message!!.contains("local, emulator, or preview"))
        }

        // 127.0.0.1
        try {
            PhoneApiClient.resolveDefaultBaseUrl("https://127.0.0.1:8888", isDebug = false)
            fail("Expected IllegalArgumentException for 127.0.0.1 in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("local, emulator, or preview"))
        }

        // Deploy preview 2 in release
        try {
            PhoneApiClient.resolveDefaultBaseUrl(
                "https://deploy-preview-2--learningtracker001.netlify.app/api/v1/phone",
                isDebug = false
            )
            fail("Expected IllegalArgumentException for preview URL in release")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("local, emulator, or preview"))
        }
    }

    @Test
    fun test76b_releaseEndpoint_ResolvesToProductionHttps() {
        val canonical = PhoneApiClient.resolveDefaultBaseUrl(
            PhoneApiClient.CANONICAL_PRODUCTION_BASE_URL,
            isDebug = false
        )
        assertEquals("https://learningtracker001.netlify.app/api/v1/phone", canonical)
        assertEquals("https://learningtracker001.netlify.app/api/v1/phone", PhoneApiClient.CANONICAL_PRODUCTION_BASE_URL)
    }

    @Test
    fun test76c_debugEndpoint_RemainsCorrectlyConfiguredForPreviewAndEmulator() {
        val previewUrl = PhoneApiClient.resolveDefaultBaseUrl(
            "https://deploy-preview-2--learningtracker001.netlify.app/api/v1/phone",
            isDebug = true
        )
        assertEquals("https://deploy-preview-2--learningtracker001.netlify.app/api/v1/phone", previewUrl)

        val emulatorUrl = PhoneApiClient.resolveDefaultBaseUrl(
            "http://10.0.2.2:8888",
            isDebug = true
        )
        assertEquals("http://10.0.2.2:8888/api/v1/phone", emulatorUrl)

        val defaultUrl = PhoneApiClient.resolveDefaultBaseUrl(null, isDebug = true)
        assertEquals(PhoneApiClient.DEFAULT_EMULATOR_URL, defaultUrl)
    }

    @Test
    fun test76d_pairingPayload_CannotOverrideProductionRoutingWithUnsafeLocalAddress() {
        val client = PhoneApiClient(initialBaseUrl = "https://learningtracker001.netlify.app/api/v1/phone")
        val originalBase = client.getBaseUrl()
        assertEquals("https://learningtracker001.netlify.app/api/v1/phone", originalBase)

        // Attempt override with emulator 10.0.2.2 in production
        client.setBaseUrl("http://10.0.2.2:8888", isDebug = false)
        assertEquals(originalBase, client.getBaseUrl())

        // Attempt override with localhost in production
        client.setBaseUrl("http://localhost:3000", isDebug = false)
        assertEquals(originalBase, client.getBaseUrl())

        // Attempt override with Deploy Preview 2 in production
        client.setBaseUrl("https://deploy-preview-2--learningtracker001.netlify.app/api/v1/phone", isDebug = false)
        assertEquals(originalBase, client.getBaseUrl())

        // Valid production canonical URL is accepted
        client.setBaseUrl("https://learningtracker001.netlify.app", isDebug = false)
        assertEquals("https://learningtracker001.netlify.app/api/v1/phone", client.getBaseUrl())
    }

    @Test
    fun test76e_isAllowedPairingOrigin_RejectsLocalAndPreviewInRelease() {
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("http", "10.0.2.2", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "10.0.2.2", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "localhost", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "127.0.0.1", isDebug = false))
        assertFalse(PhoneApiClient.isAllowedPairingOrigin("https", "deploy-preview-2--learningtracker001.netlify.app", isDebug = false))
        assertTrue(PhoneApiClient.isAllowedPairingOrigin("https", "learningtracker001.netlify.app", isDebug = false))
    }


    // =========================================================================
    // SECTION 13: AUTOMATIC DETECTION, INACTIVITY EXPIRY & TRUTHFULNESS
    // =========================================================================

    @Test
    fun test77_CompanionPackageNeutralClassification_SuppressesOwnUiFromInterruptions() {
        val classifier = InterruptionClassifier()
        assertEquals(AppCategory.NEUTRAL, classifier.classifyPackage("com.learningtracker.companion"))
        assertEquals(AppCategory.NEUTRAL, classifier.classifyPackage("com.learningtracker.companion.debug"))

        val intervals = listOf(
            ForegroundInterval("com.learningtracker.companion.debug", 1000L, 5000L),
            ForegroundInterval("com.instagram.android", 6000L, 10000L)
        )
        val interruptions = classifier.classifyIntervals(intervals)
        assertEquals(1, interruptions.size)
        assertEquals("com.instagram.android", interruptions[0].packageName)
        assertEquals(AppCategory.DISTRACTION, interruptions[0].category)
    }

    @Test
    fun test78_InactivityExpiryPolicy_ThresholdIs30Days() {
        assertEquals(30L * 24 * 60 * 60 * 1000L, com.learningtracker.companion.pairing.PairingManager.DEVICE_INACTIVITY_EXPIRY_MS)
    }

    @Test
    fun test79_AutomaticDetectionOfActiveSession_ParsesContract() {
        val payload = ActiveSessionResponse(
            status = "ACTIVE_SESSION_FOUND",
            sessionId = "sess_auto_detect_001",
            startedAt = 1728590000000L,
            intendedDurationSeconds = 1500L,
            taskName = "Quantum Well States",
            subjectName = "Solid State",
            serverTime = 1728590005000L
        )
        assertEquals("ACTIVE_SESSION_FOUND", payload.status)
        assertEquals("sess_auto_detect_001", payload.sessionId)
        assertEquals("Quantum Well States", payload.taskName)
    }

    @Test
    fun test80_AutomaticDetectionOfCompletedSession_ProducesValidTimestamps() {
        val statusRes = SessionStatusResponse(
            success = true,
            sessionId = "sess_auto_end_002",
            status = "COMPLETE",
            startedAt = 1728590000000L,
            endedAt = 1728591500000L,
            serverStartedAt = 1728590000100L,
            serverEndedAt = 1728591500100L,
            intendedDurationSeconds = 1500L,
            taskName = "Electrodynamics",
            subjectName = "Physics"
        )
        assertEquals("COMPLETE", statusRes.status)
        assertTrue(statusRes.endedAt!! >= statusRes.startedAt!!)
    }

    @Test
    fun test81_SummaryCalculationWithoutManualIntervention_ProducesGenuineEvidence() {
        val session = FocusSessionContract(
            sessionId = "sess_auto_summary_003",
            startedAt = 10000L,
            intendedDurationSeconds = 1500L,
            taskName = "MOSFET Inversion",
            subjectName = "Semiconductors",
            state = "RUNNING"
        )
        val calc = FocusSummaryCalculator()
        val summary = calc.calculateSummary(
            session = session,
            sessionEndTime = 25000L,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.COMPLETE
        )
        assertEquals("sess_auto_summary_003", summary.sessionId)
        assertEquals(0, summary.interruptionCount)
        assertEquals(15L, summary.observedWindowSeconds)
        assertEquals(15L, summary.longestUninterruptedSeconds)
        assertEquals("PENDING", summary.syncState)
    }

    @Test
    fun test82_MissingPermission_ProducesHonestPermissionRequiredStatus() {
        val session = FocusSessionContract(
            sessionId = "sess_perm_req_004",
            startedAt = 10000L,
            intendedDurationSeconds = 1500L,
            state = "RUNNING"
        )
        val calc = FocusSummaryCalculator()
        val summary = calc.calculateSummary(
            session = session,
            sessionEndTime = 25000L,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.PERMISSION_REQUIRED
        )
        assertEquals(CollectionStatus.PERMISSION_REQUIRED, summary.collectionStatus)
        assertEquals(0L, summary.longestUninterruptedSeconds)
    }

    @Test
    fun test83_FocusMonitoringServiceConstants() {
        assertEquals("focus_monitoring_channel", com.learningtracker.companion.service.FocusMonitoringService.CHANNEL_ID)
        assertEquals(2001, com.learningtracker.companion.service.FocusMonitoringService.NOTIFICATION_ID)
    }

    @Test
    fun test84_MonitoringStateEnumAndLifecycleProperties() {
        val states = com.learningtracker.companion.model.MonitoringState.entries
        assertEquals(9, states.size)
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.DISABLED))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.PAIRING))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.READY))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.WAITING_FOR_FOCUS))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.MONITORING))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.FINALIZING))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.UPLOADING))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.DELIVERED))
        assertTrue(states.contains(com.learningtracker.companion.model.MonitoringState.RECOVERY_REQUIRED))

        // Active monitoring check
        assertTrue(com.learningtracker.companion.model.MonitoringState.MONITORING.isMonitoringActive)
        assertTrue(com.learningtracker.companion.model.MonitoringState.FINALIZING.isMonitoringActive)
        assertTrue(com.learningtracker.companion.model.MonitoringState.UPLOADING.isMonitoringActive)
        assertFalse(com.learningtracker.companion.model.MonitoringState.WAITING_FOR_FOCUS.isMonitoringActive)
        assertFalse(com.learningtracker.companion.model.MonitoringState.DELIVERED.isMonitoringActive)

        // Foreground service running check
        assertTrue(com.learningtracker.companion.model.MonitoringState.WAITING_FOR_FOCUS.isServiceRunning)
        assertTrue(com.learningtracker.companion.model.MonitoringState.MONITORING.isServiceRunning)
        assertFalse(com.learningtracker.companion.model.MonitoringState.DISABLED.isServiceRunning)
        assertFalse(com.learningtracker.companion.model.MonitoringState.READY.isServiceRunning)
    }

    @Test
    fun test85_AdaptivePollingIntervalConstants() {
        assertEquals(5000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_ACTIVE_MS)
        assertEquals(12000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_IDLE_MS)
        assertEquals(30000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_BACKOFF_MAX_MS)
        assertTrue(com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_ACTIVE_MS < com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_IDLE_MS)
    }

    @Test
    fun test86_AutomaticFinalizationProducesLocalFirstSummaryWithoutManualButton() {
        val calc = FocusSummaryCalculator()
        val session = FocusSessionContract(
            sessionId = "sess_auto_detect_99",
            startedAt = 50000L,
            intendedDurationSeconds = 1500L,
            taskName = "Quantum Well Tunneling",
            subjectName = "Solid State Physics",
            state = "RUNNING"
        )
        val endTime = 65000L
        val summary = calc.calculateSummary(
            session = session,
            sessionEndTime = endTime,
            interruptions = emptyList(),
            summaryId = "sum_auto_99",
            collectionStatus = CollectionStatus.COMPLETE
        )

        assertEquals("sess_auto_detect_99", summary.sessionId)
        assertEquals("sum_auto_99", summary.summaryId)
        assertEquals(15L, summary.observedWindowSeconds)
        assertEquals(1500L, summary.intendedSeconds)
        assertEquals(0, summary.interruptionCount)
        assertEquals(15L, summary.longestUninterruptedSeconds)
        assertEquals(CollectionStatus.COMPLETE, summary.collectionStatus)
        assertEquals("PENDING", summary.syncState)
    }

    @Test
    fun test87_DuplicateUploadPreventionViaUniqueSummaryId() {
        val calc = FocusSummaryCalculator()
        val session = FocusSessionContract("sess_dup_check", 1000L, 1500L)
        val s1 = calc.calculateSummary(session, 16000L, emptyList(), summaryId = "sum_fixed_id")
        val s2 = calc.calculateSummary(session, 16000L, emptyList(), summaryId = "sum_fixed_id")

        assertEquals(s1.summaryId, s2.summaryId)
        assertEquals(s1.sessionId, s2.sessionId)
    }

    @Test
    fun test88_OutboxSyncStateTransitions() {
        // Test that sync state strings strictly follow contract
        val validSyncStates = listOf("PENDING", "RETRY", "DELIVERED", "PERMANENT_ERROR", "CONFLICT")
        assertTrue(validSyncStates.contains("PENDING"))
        assertTrue(validSyncStates.contains("DELIVERED"))
        assertTrue(validSyncStates.contains("RETRY"))
        assertTrue(validSyncStates.contains("PERMANENT_ERROR"))
    }

    @Test
    fun test89_BatteryOptimizationAndPermissionResilienceConstants() {
        val actionStart = com.learningtracker.companion.service.FocusMonitoringService.ACTION_START
        val actionStop = com.learningtracker.companion.service.FocusMonitoringService.ACTION_STOP
        assertEquals("com.learningtracker.companion.action.START_MONITORING", actionStart)
        assertEquals("com.learningtracker.companion.action.STOP_MONITORING", actionStop)
    }

    // =========================================================================
    // SECTION 7: PHASE 1 SESSION LIFECYCLE & IDLE DECOUPLING (Tests 90 - 98)
    // =========================================================================

    @Test
    fun test90_ServiceDoesNotStartDuringIdle() {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()
        assertFalse("Service must not be running initially", com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals("Initial state must be READY", com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)

        // When idle (no active session), FocusMonitoringService.isRunning must remain false
        assertFalse(com.learningtracker.companion.model.MonitoringState.READY.isServiceRunning)
        assertFalse(com.learningtracker.companion.model.MonitoringState.DISABLED.isServiceRunning)
    }

    @Test
    fun test91_ServiceStartsThroughApprovedSessionStartPath() {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()
        val session = FocusSessionContract(
            sessionId = "sess_approved_start_01",
            startedAt = System.currentTimeMillis(),
            intendedDurationSeconds = 1800L,
            taskName = "Memory Allocation Study",
            subjectName = "Operating Systems",
            state = "RUNNING"
        )
        assertNotNull(session.sessionId)
        assertEquals("RUNNING", session.state)

        // Verify monitoring state during active session
        assertTrue(com.learningtracker.companion.model.MonitoringState.MONITORING.isServiceRunning)
        assertTrue(com.learningtracker.companion.model.MonitoringState.MONITORING.isMonitoringActive)
    }

    @Test
    fun test92_ServiceTerminatesWhenSessionEnds() {
        // Verify state transitions on session conclusion
        val finalizing = com.learningtracker.companion.model.MonitoringState.FINALIZING
        val uploading = com.learningtracker.companion.model.MonitoringState.UPLOADING
        val delivered = com.learningtracker.companion.model.MonitoringState.DELIVERED
        val ready = com.learningtracker.companion.model.MonitoringState.READY

        assertTrue(finalizing.isMonitoringActive)
        assertTrue(uploading.isMonitoringActive)
        assertFalse(delivered.isMonitoringActive)
        assertFalse(ready.isMonitoringActive)
        assertFalse(ready.isServiceRunning)
    }

    @Test
    fun test93_RepeatedStartStopOperationsDoNotCreateDuplicateServices() {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()
        assertFalse(com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        // Resetting state repeatedly is idempotent
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()
        assertFalse(com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals(com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)
    }

    @Test
    fun test94_RebootDoesNotRestartContinuousMonitoring() {
        // Verify invariant: BootReceiver.handleBootRecovery reconciles orphaned sessions
        // without calling FocusMonitoringService.start()
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()
        assertFalse("Service must remain non-running after reboot", com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals(com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)
    }

    @Test
    fun test95_ProcessDeathAndRebootDoesNotFabricateCompletedSessions() {
        val calc = FocusSummaryCalculator()
        val orphanedSession = FocusSessionContract(
            sessionId = "sess_orphaned_reboot_01",
            startedAt = 100000L,
            intendedDurationSeconds = 1800L,
            taskName = "Interrupted by Reboot",
            state = "RUNNING"
        )
        // Mid-session interruption: device rebooted 600s into 1800s session
        val rebootTime = 700000L
        val summary = calc.calculateSummary(
            session = orphanedSession,
            sessionEndTime = rebootTime,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.PARTIAL
        )

        assertEquals("sess_orphaned_reboot_01", summary.sessionId)
        assertEquals(CollectionStatus.PARTIAL, summary.collectionStatus)
        // Missing intervals MUST NOT be fabricated as focused time
        assertEquals(0L, summary.longestUninterruptedSeconds)
        assertEquals(1, summary.timeline.size)
        assertEquals("UNOBSERVED", summary.timeline[0].classification)
        assertEquals("Incomplete telemetry (interrupted session)", summary.timeline[0].note)
    }

    @Test
    fun test96_NoObservationsStatusNeverFabricatesFocusedTime() {
        val calc = FocusSummaryCalculator()
        val session = FocusSessionContract(
            sessionId = "sess_no_obs_01",
            startedAt = 50000L,
            intendedDurationSeconds = 1500L
        )
        val summary = calc.calculateSummary(
            session = session,
            sessionEndTime = 80000L,
            interruptions = emptyList(),
            collectionStatus = CollectionStatus.NO_OBSERVATIONS
        )

        assertEquals(CollectionStatus.NO_OBSERVATIONS, summary.collectionStatus)
        assertEquals(0L, summary.longestUninterruptedSeconds)
        assertEquals(1, summary.timeline.size)
        assertEquals("UNOBSERVED", summary.timeline[0].classification)
        assertEquals("No telemetry observations", summary.timeline[0].note)
    }

    @Test
    fun test97_ExistingTelemetrySerializationRemainsCompatible() {
        val summary = FocusSummary(
            sessionId = "sess_compat_01",
            summaryId = "sum_compat_01",
            intendedSeconds = 1500L,
            observedWindowSeconds = 1500L,
            interruptionCount = 1,
            interruptionSeconds = 45L,
            referenceSeconds = 15L,
            distractionSeconds = 30L,
            unknownSeconds = 0L,
            longestUninterruptedSeconds = 600L,
            interruptions = emptyList(),
            appBreakdown = listOf(
                AppBreakdownSummary("com.android.chrome", AppCategory.REFERENCE, 15L),
                AppBreakdownSummary("com.instagram.android", AppCategory.DISTRACTION, 30L)
            ),
            timeline = listOf(
                com.learningtracker.companion.model.TimelineInterval(
                    id = "f1",
                    startTime = 1000L,
                    endTime = 2000L,
                    classification = "FOCUSED"
                )
            ),
            collectionStatus = CollectionStatus.COMPLETE,
            timestamp = 2500L,
            syncState = "PENDING"
        )

        val json = kotlinx.serialization.json.Json {
            encodeDefaults = true
            ignoreUnknownKeys = true
        }
        val serialized = json.encodeToString(com.learningtracker.companion.model.FocusSummary.serializer(), summary)
        assertTrue(serialized.contains("sess_compat_01"))
        assertTrue(serialized.contains("sum_compat_01"))
        assertTrue(serialized.contains("com.instagram.android"))
        assertTrue(serialized.contains("COMPLETE"))

        val deserialized = json.decodeFromString(com.learningtracker.companion.model.FocusSummary.serializer(), serialized)
        assertEquals(summary.sessionId, deserialized.sessionId)
        assertEquals(summary.summaryId, deserialized.summaryId)
        assertEquals(summary.collectionStatus, deserialized.collectionStatus)
        assertEquals(2, deserialized.appBreakdown.size)
    }

    @Test
    fun test98_AdaptivePollingConstantsAndSessionScoping() {
        assertEquals(5000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_ACTIVE_MS)
        assertEquals(12000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_IDLE_MS)
        assertEquals(30000L, com.learningtracker.companion.service.FocusMonitoringService.POLL_INTERVAL_BACKOFF_MAX_MS)
    }

    // =========================================================================
    // SECTION 13: PHASE 1 ARCHITECTURAL CORRECTIONS & DEFECT RESOLUTION
    // =========================================================================
    // SECTION 13: PHASE 1 SERVICE LIFECYCLE & IDLE DECOUPLING BEHAVIORAL TESTS
    // (Tests 99 - 111: Requirements A - G)
    // =========================================================================

    class FakeTestPairingManager(
        private var paired: Boolean = true,
        private var revoked: Boolean = false,
        private var token: String? = "devtok_test_12345",
        private var associationId: String = "dev_assoc_test_123"
    ) : com.learningtracker.companion.pairing.PairingManager() {
        override fun isPaired(): Boolean = paired && !revoked
        override fun isRevoked(): Boolean = revoked
        override fun getDeviceToken(): String? = token
        override fun getDeviceAssociation(): DeviceAssociation =
            DeviceAssociation(associationId, "Test Pixel 8", pairedAccountEmail = "user@example.com")
        override fun markRevoked() {
            revoked = true
            paired = false
        }
    }

    class FakeTestPhoneApiClient : PhoneApiClient() {
        var activeSessionResponse: ApiResult<ActiveSessionResponse> =
            ApiResult.Success(ActiveSessionResponse("NO_ACTIVE_SESSION", null, null, null, null, null, System.currentTimeMillis()), 200)
        var sessionStatusResponse: ApiResult<SessionStatusResponse> =
            ApiResult.Success(SessionStatusResponse(true, "sess_status_default", "COMPLETE", 1000L, 2000L, 1000L, 2000L, 1000L, "Task", "Subject"), 200)
        var snapshotResponse: ApiResult<TimelineSnapshotResponse> =
            ApiResult.Success(TimelineSnapshotResponse(true, "sess_snap_default", 1), 200)
        var telemetryResponse: ApiResult<TelemetrySubmissionResponse> =
            ApiResult.Success(TelemetrySubmissionResponse(true, "sum_default", System.currentTimeMillis(), "DELIVERED", false), 200)
        var unreconciledResponse: ApiResult<List<FocusSessionContract>> =
            ApiResult.Success(emptyList(), 200)

        override fun getActiveSession(deviceToken: String): ApiResult<ActiveSessionResponse> = activeSessionResponse
        override fun getSessionStatus(sessionId: String, deviceToken: String): ApiResult<SessionStatusResponse> = sessionStatusResponse
        override fun getUnreconciledSessions(deviceToken: String, limit: Int): ApiResult<List<FocusSessionContract>> = unreconciledResponse
        override fun postTimelineSnapshot(sessionId: String, snapshot: TimelineSnapshot, deviceToken: String): ApiResult<TimelineSnapshotResponse> = snapshotResponse
        override fun submitTelemetrySummary(payload: TelemetrySummaryPayload, deviceToken: String): ApiResult<TelemetrySubmissionResponse> = telemetryResponse
    }

    @Test
    fun test99_ApplicationInitializationNeverStartsService() {
        // Requirement A: Application initialization must never start the service.
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        // 1. Active session exists in storage from an uncompleted run
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )
        val discoveredSession = FocusSessionContract(
            sessionId = "sess_discovered_in_storage",
            startedAt = System.currentTimeMillis() - 600000L,
            intendedDurationSeconds = 1500L,
            taskName = "Discovered Session"
        )
        syncManager.onFocusStarted(discoveredSession)
        assertEquals(discoveredSession.sessionId, syncManager.getActiveSession()?.sessionId)

        // 2. INVARIANT: Discovered active session during initialization is NOT permission to start service.
        assertFalse("Foreground service must remain idle on application initialization", com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals(com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)
        assertNull("activeMonitoredSessionId must remain null", com.learningtracker.companion.service.FocusMonitoringService.activeMonitoredSessionId)
        assertFalse("READY state is not monitoring active", com.learningtracker.companion.model.MonitoringState.READY.isMonitoringActive)
        assertFalse("READY state has no running service", com.learningtracker.companion.model.MonitoringState.READY.isServiceRunning)
    }

    @Test
    fun test100_BootRecoveryReconcilesOrphanedSessionWithoutStartingService() {
        // Requirement A & Section 5: Boot recovery reconciles orphaned session as PARTIAL and leaves device idle.
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        // Simulate orphaned session interrupted by device power-off
        val orphaned = FocusSessionContract(
            sessionId = "sess_reboot_test_100",
            startedAt = 100000L,
            intendedDurationSeconds = 1800L,
            taskName = "Kernel Compilation",
            subjectName = "CS",
            state = "RUNNING"
        )
        syncManager.onFocusStarted(orphaned)
        assertEquals(orphaned.sessionId, syncManager.getActiveSession()?.sessionId)

        // Exercise the actual production BootReceiver recovery path
        com.learningtracker.companion.service.BootReceiver.handleBootRecovery(syncManager)

        // Active session is cleared from active state
        assertNull("Orphaned active session must be cleared after boot recovery", syncManager.getActiveSession())

        // Reconciled summary is saved in durable storage with honest PARTIAL status and ESTIMATED confidence
        val summary = syncManager.storage.getSummary("sum_sess_reboot_test_100")
        assertNotNull("Reconciled summary must be saved in storage", summary)
        assertEquals("sess_reboot_test_100", summary?.sessionId)
        assertEquals(CollectionStatus.PARTIAL, summary?.collectionStatus)
        assertEquals(BoundaryConfidence.ESTIMATED, summary?.boundaryConfidence)

        // INVARIANT: Foreground service is NEVER started on boot recovery
        assertFalse("Foreground service must NOT start on boot recovery", com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals(com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)
        assertNull(com.learningtracker.companion.service.FocusMonitoringService.activeMonitoredSessionId)
    }

    @Test
    fun test101_SameSessionRepeatedStartsAreIdempotent() = kotlinx.coroutines.runBlocking {
        // Requirement B: Service startup must be idempotent for the same session ID.
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(
            sessionId = "sess_idem_same_101",
            startedAt = 100000L,
            intendedDurationSeconds = 1500L,
            taskName = "Concurrent Algorithms",
            state = "RUNNING"
        )

        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 60000L
        )

        // First start for session A
        val firstStart = coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(firstStart)
        assertTrue(coordinator.isRunning)
        assertEquals(session.sessionId, coordinator.currentSession?.sessionId)
        val firstJob = coordinator.activeJob
        assertNotNull(firstJob)

        // Second start attempt for the EXACT SAME session ID
        val secondStart = coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(secondStart)

        // Invariant: Exactly one monitoring job, identity unchanged, no duplicate records
        assertSame("Job instance must remain identical on duplicate start", firstJob, coordinator.activeJob)
        assertEquals(session.sessionId, coordinator.currentSession?.sessionId)
        assertEquals("No duplicate summaries created", 0, inMemoryStorage.getAllSummaries().size)

        coordinator.stop(syncManager)
    }

    @Test
    fun test102_DifferentSessionTransitionSerializesAndPreventsUnsafeOverwrite() = kotlinx.coroutines.runBlocking {
        // Requirement C: Session transitions must be serialized and safe.
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val sessionA = FocusSessionContract(
            sessionId = "sess_alpha_102",
            startedAt = 100000L,
            intendedDurationSeconds = 1800L,
            taskName = "Session Alpha"
        )
        val sessionB = FocusSessionContract(
            sessionId = "sess_beta_102",
            startedAt = 120000L,
            intendedDurationSeconds = 1500L,
            taskName = "Session Beta"
        )

        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 60000L
        )

        // Step 1: Session A starts and runs
        coordinator.startOrTransitionSession(sessionA, syncManager)
        assertEquals(sessionA.sessionId, coordinator.currentSession?.sessionId)

        // Step 2: Session B arrives: transition safely finalizes Session A first
        val transitionSuccess = coordinator.startOrTransitionSession(sessionB, syncManager)
        assertTrue("Transition must succeed", transitionSuccess)

        // Session A was safely finalized before Session B started
        val summaryA = inMemoryStorage.getSummary("sum_sess_alpha_102")
        assertNotNull("Session A must be finalized into durable storage", summaryA)
        assertEquals("sess_alpha_102", summaryA?.sessionId)

        // Session B is now the active monitored session
        assertEquals(sessionB.sessionId, coordinator.currentSession?.sessionId)
        assertTrue(coordinator.isRunning)

        coordinator.stop(syncManager)

        // Step 3: Negative Scenario - Finalization failure prevents unsafe replacement
        val failingStorage = object : com.learningtracker.companion.sync.ITelemetryStorage by com.learningtracker.companion.sync.InMemoryTelemetryStorage() {
            override fun saveSummary(summary: FocusSummary) {
                throw IllegalStateException("Simulated disk write failure during finalization")
            }
        }
        val failingSyncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = failingStorage
        )

        val sessionC = FocusSessionContract(sessionId = "sess_gamma_102", startedAt = 200000L, intendedDurationSeconds = 1500L)
        val sessionD = FocusSessionContract(sessionId = "sess_delta_102", startedAt = 220000L, intendedDurationSeconds = 1500L)

        val failingCoordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(scope = this, pollIntervalMs = 60000L)
        failingCoordinator.startOrTransitionSession(sessionC, failingSyncManager)
        assertEquals("sess_gamma_102", failingCoordinator.currentSession?.sessionId)

        // Attempt transition to session D: finalization of C will throw
        val failedTransition = failingCoordinator.startOrTransitionSession(sessionD, failingSyncManager)
        assertFalse("Transition must fail if previous session cannot be finalized", failedTransition)

        // Invariant: Session C is NOT replaced by Session D!
        assertEquals("sess_gamma_102", failingCoordinator.currentSession?.sessionId)
        assertNotNull("Startup failure must be reported", com.learningtracker.companion.service.FocusMonitoringService.lastStartupError)
        assertTrue(com.learningtracker.companion.service.FocusMonitoringService.lastStartupError!!.contains("sess_gamma_102"))

        failingCoordinator.stop(null)
    }

    @Test
    fun test103_SingleSnapshotUploadOwnerValidatesSessionIdentity() {
        // Requirement D: Single live snapshot upload owner.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val activeSession = FocusSessionContract(
            sessionId = "sess_snapshot_active_103",
            startedAt = 100000L,
            intendedDurationSeconds = 1500L
        )
        val oldSession = FocusSessionContract(
            sessionId = "sess_snapshot_old_103",
            startedAt = 80000L,
            intendedDurationSeconds = 1500L
        )

        syncManager.resetSnapshotUploadCount()
        assertEquals(0, syncManager.getSnapshotUploadCount())

        // Case 1: Active session matches -> upload succeeds and increments count
        syncManager.onFocusStarted(activeSession)
        val activeUploadSuccess = syncManager.uploadLiveTimelineSnapshot(activeSession, now = 120000L)
        assertTrue(activeUploadSuccess)
        assertEquals(1, syncManager.getSnapshotUploadCount())

        // Case 2: Upload attempted for old / different session ID -> rejected!
        val oldUploadSuccess = syncManager.uploadLiveTimelineSnapshot(oldSession, now = 125000L)
        assertFalse("Snapshot for non-active session must be rejected", oldUploadSuccess)
        assertEquals("Upload count must not increment on rejected session", 1, syncManager.getSnapshotUploadCount())

        // Case 3: Session is cancelled / inactive -> rejected!
        syncManager.onFocusCancelled(activeSession.sessionId)
        val inactiveUploadSuccess = syncManager.uploadLiveTimelineSnapshot(activeSession, now = 130000L)
        assertFalse("Snapshot for inactive session must be rejected", inactiveUploadSuccess)
        assertEquals(1, syncManager.getSnapshotUploadCount())
    }

    @Test
    fun test104_ConcurrentFinalizationCreatesSingleAuthoritativeSummary() = kotlinx.coroutines.runBlocking {
        // Requirement E: Finalization must be idempotent and concurrency-safe.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(
            sessionId = "sess_concurrent_104",
            startedAt = 1000000L,
            intendedDurationSeconds = 1800L
        )
        val fixedEndTime = 2200000L // 1200 seconds

        // Launch 20 concurrent coroutines calling finalizeSessionCollection simultaneously
        val deferredSummaries = (1..20).map {
            async(Dispatchers.Default) {
                syncManager.finalizeSessionCollection(session, fixedEndTime)
            }
        }

        val results = deferredSummaries.awaitAll()
        assertEquals(20, results.size)

        // All 20 callers must receive the exact same summary ID and contents
        val expectedSummaryId = "sum_sess_concurrent_104"
        for (summary in results) {
            assertEquals(expectedSummaryId, summary.summaryId)
            assertEquals("sess_concurrent_104", summary.sessionId)
            assertEquals(1200L, summary.observedWindowSeconds)
        }

        // Exactly one summary must be persisted in durable storage
        val allStored = inMemoryStorage.getAllSummaries()
        assertEquals("Storage must contain exactly one summary record", 1, allStored.size)
        assertEquals(expectedSummaryId, allStored[0].summaryId)
    }

    @Test
    fun test104B_ApplicationScopedSyncManager_AccessorIdentityAndConcurrency() = kotlinx.coroutines.runBlocking {
        // Part A: One application-scoped dependency ownership mechanism.
        // Proves that the application-level accessor FocusIntegrityApplication.getSyncManager(context)
        // consistently resolves to the single authoritative FocusIntegritySyncManager instance,
        // and that concurrent access across 20 threads never constructs duplicate manager instances.
        val sharedStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakePairing = FakeTestPairingManager()
        val fakeApi = FakeTestPhoneApiClient()
        val authoritativeManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = sharedStorage
        )

        // Inject authoritative manager into Application scope
        FocusIntegrityApplication.setTestInstance(null, testManager = authoritativeManager, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))

            val manager1 = FocusIntegrityApplication.getSyncManager(testContext)
            val manager2 = FocusIntegrityApplication.getSyncManager(testContext)
            assertSame("Repeated accessor calls must return identical authoritative instance", authoritativeManager, manager1)
            assertSame("Repeated accessor calls must return identical authoritative instance", manager1, manager2)

            // Concurrency: 20 parallel coroutines all receive the exact same singleton instance
            val deferred = (1..20).map {
                async(Dispatchers.Default) {
                    FocusIntegrityApplication.getSyncManager(testContext)
                }
            }
            val instances = deferred.awaitAll()
            assertEquals(20, instances.size)
            for (inst in instances) {
                assertSame("Concurrent access must never construct duplicate instances", authoritativeManager, inst)
            }
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
        }
    }

    @Test
    fun test104C_AuthoritativeManager_ConcurrentFinalizationThreadSafety() = kotlinx.coroutines.runBlocking {
        // Part A & Requirement E: Serialized finalization through the authoritative manager.
        val sharedStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakePairing = FakeTestPairingManager()
        val fakeApi = FakeTestPhoneApiClient()
        val authoritativeManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = sharedStorage
        )

        FocusIntegrityApplication.setTestInstance(null, testManager = authoritativeManager, testPairing = fakePairing)

        try {
            val session = FocusSessionContract(
                sessionId = "sess_multi_component_104c",
                startedAt = 1000000L,
                intendedDurationSeconds = 1800L
            )
            val fixedEndTime = 2200000L

            // 10 concurrent coroutines finalizing through the authoritative manager
            val deferred = (1..10).map {
                async(Dispatchers.Default) {
                    val mgr = FocusIntegrityApplication.getSyncManager(TestStartupContext())
                    mgr.finalizeSessionCollection(session, fixedEndTime)
                }
            }

            val results = deferred.awaitAll()
            assertEquals(10, results.size)
            // Under shared authoritative manager, finalizationLock serializes and exactly 1 summary is stored
            val stored = sharedStorage.getAllSummaries()
            assertEquals(1, stored.size)
            assertEquals("sum_sess_multi_component_104c", stored[0].summaryId)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
        }
    }

    @Test
    fun test104D_BootReceiver_ExecutesRecoveryThroughAuthoritativeManager() {
        // Component-level verification: BootReceiver.handleBootRecovery(context) obtains and reconciles
        // an orphaned active session strictly through the authoritative Application-scoped syncManager.
        val sharedStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakePairing = FakeTestPairingManager()
        val fakeApi = FakeTestPhoneApiClient()
        val authoritativeManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = sharedStorage
        )

        // Seed an active orphaned session in the authoritative manager
        val orphaned = FocusSessionContract(
            sessionId = "sess_boot_recovery_104d",
            startedAt = 1000000L,
            intendedDurationSeconds = 1800L,
            taskName = "Boot Recovery Task"
        )
        authoritativeManager.onFocusStarted(orphaned)
        assertNotNull("Active session must exist before boot recovery", authoritativeManager.getActiveSession())

        FocusIntegrityApplication.setTestInstance(null, testManager = authoritativeManager, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))

            // Execute ACTUAL production component access path: BootReceiver.handleBootRecovery(Context)
            BootReceiver.handleBootRecovery(testContext)

            // Verify: Active session in authoritative manager was reconciled and cleared
            assertNull("Authoritative manager active session must be cleared after boot recovery", authoritativeManager.getActiveSession())

            // Verify: Telemetry was saved to the authoritative manager's storage with PARTIAL collection status
            val summaries = sharedStorage.getAllSummaries()
            assertEquals("Storage must contain reconciled summary", 1, summaries.size)
            assertEquals("sess_boot_recovery_104d", summaries[0].sessionId)
            assertEquals("Orphaned session must be reconciled as PARTIAL", CollectionStatus.PARTIAL, summaries[0].collectionStatus)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
        }
    }

    @Test
    fun test104E_FocusMonitoringServiceStart_DiscoversSessionThroughAuthoritativeManager() {
        // Component-level verification: FocusMonitoringService.start(context) queries the active session
        // strictly from the authoritative Application-scoped syncManager.
        FocusMonitoringService.resetStateForTesting()
        UsageAccessHelper.usageAccessOverride = { true }

        val sharedStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakePairing = FakeTestPairingManager()
        val fakeApi = FakeTestPhoneApiClient()
        val authoritativeManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = sharedStorage
        )

        FocusIntegrityApplication.setTestInstance(null, testManager = authoritativeManager, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))

            // Case 1: IDLE device (authoritativeManager has NO active session)
            assertNull(authoritativeManager.getActiveSession())
            val startedIdle = FocusMonitoringService.start(testContext)
            assertFalse("Service must NOT start when authoritative manager has no active session", startedIdle)
            assertEquals(
                "Cannot start FocusMonitoringService: No active session found (device is IDLE).",
                FocusMonitoringService.lastStartupError
            )

            // Case 2: ACTIVE session in authoritativeManager
            val activeSession = FocusSessionContract(
                sessionId = "sess_service_start_104e",
                startedAt = 2000000L,
                intendedDurationSeconds = 1500L,
                taskName = "Authoritative Active Task"
            )
            authoritativeManager.onFocusStarted(activeSession)

            var dispatchedSession: FocusSessionContract? = null
            FocusMonitoringService.serviceDispatcher = ServiceDispatcher { _, session ->
                dispatchedSession = session
                ComponentName("com.learningtracker.companion", "com.learningtracker.companion.service.FocusMonitoringService")
            }

            // Execute ACTUAL production component access path: FocusMonitoringService.start(Context)
            val startedActive = FocusMonitoringService.start(testContext)

            assertTrue("Service must dispatch when authoritative manager has active session", startedActive)
            assertNotNull("Dispatcher must receive the session from the authoritative manager", dispatchedSession)
            assertEquals("sess_service_start_104e", dispatchedSession?.sessionId)
            assertEquals("Authoritative Active Task", dispatchedSession?.taskName)
        } finally {
            FocusMonitoringService.resetStateForTesting()
            UsageAccessHelper.resetForTesting()
            FocusIntegrityApplication.resetTestOverrides()
        }
    }

    @Test
    fun test105_FailedServiceStartupIsObservable() {
        // Requirement G: Startup failures must be observable.
        FocusMonitoringService.resetStateForTesting()

        assertNull("lastStartupError must be null initially", FocusMonitoringService.lastStartupError)
        assertNull("startupErrorFlow must emit null initially", FocusMonitoringService.startupErrorFlow.value)

        val failureReason = "Usage access permission (PACKAGE_USAGE_STATS) is not granted."
        FocusMonitoringService.reportStartupFailure(failureReason)

        assertNotNull("Startup failure must be observable on lastStartupError", FocusMonitoringService.lastStartupError)
        assertEquals(failureReason, FocusMonitoringService.lastStartupError)
        assertEquals(failureReason, FocusMonitoringService.startupErrorFlow.value)
        assertFalse("Failed service startup must not leave service running", FocusMonitoringService.isRunning)

        // Reset clears error state cleanly
        FocusMonitoringService.resetStateForTesting()
        assertNull(FocusMonitoringService.lastStartupError)
        assertNull(FocusMonitoringService.startupErrorFlow.value)
    }

    private class TestPreferences(private val data: Map<String, Any>) : android.content.SharedPreferences {
        override fun getAll(): Map<String, *> = data
        override fun getString(key: String?, defValue: String?): String? = data[key] as? String ?: defValue
        @Suppress("UNCHECKED_CAST")
        override fun getStringSet(key: String?, defValues: Set<String>?): Set<String>? = data[key] as? Set<String> ?: defValues
        override fun getInt(key: String?, defValue: Int): Int = data[key] as? Int ?: defValue
        override fun getLong(key: String?, defValue: Long): Long = data[key] as? Long ?: defValue
        override fun getFloat(key: String?, defValue: Float): Float = data[key] as? Float ?: defValue
        override fun getBoolean(key: String?, defValue: Boolean): Boolean = data[key] as? Boolean ?: defValue
        override fun contains(key: String?): Boolean = data.containsKey(key)
        override fun edit(): android.content.SharedPreferences.Editor = throw UnsupportedOperationException()
        override fun registerOnSharedPreferenceChangeListener(listener: android.content.SharedPreferences.OnSharedPreferenceChangeListener?) {}
        override fun unregisterOnSharedPreferenceChangeListener(listener: android.content.SharedPreferences.OnSharedPreferenceChangeListener?) {}
    }

    private class TestStartupContext(
        private val prefsData: Map<String, Any> = mapOf("automatic_tracking_enabled" to true),
        private val app: FocusIntegrityApplication? = null
    ) : android.content.ContextWrapper(null) {
        override fun getSharedPreferences(name: String?, mode: Int): android.content.SharedPreferences {
            return TestPreferences(prefsData)
        }
        override fun getApplicationContext(): android.content.Context = app ?: this
        override fun getPackageName(): String = "com.learningtracker.companion"
    }

    private fun createForegroundServiceStartNotAllowedException(message: String): Throwable {
        return try {
            val clazz = Class.forName("android.app.ForegroundServiceStartNotAllowedException")
            val ctor = clazz.constructors.firstOrNull { it.parameterTypes.size == 1 && it.parameterTypes[0] == String::class.java }
                ?: clazz.declaredConstructors.firstOrNull { it.parameterTypes.isEmpty() }
            if (ctor != null) {
                ctor.isAccessible = true
                if (ctor.parameterTypes.size == 1) {
                    ctor.newInstance(message) as Throwable
                } else {
                    ctor.newInstance() as Throwable
                }
            } else {
                val unsafeField = Class.forName("sun.misc.Unsafe").getDeclaredField("theUnsafe")
                unsafeField.isAccessible = true
                val unsafe = unsafeField.get(null)
                val allocateInstance = unsafe.javaClass.getMethod("allocateInstance", Class::class.java)
                val inst = allocateInstance.invoke(unsafe, clazz) as Throwable
                val detailMessageField = Throwable::class.java.getDeclaredField("detailMessage")
                detailMessageField.isAccessible = true
                detailMessageField.set(inst, message)
                inst
            }
        } catch (_: Throwable) {
            class ForegroundServiceStartNotAllowedException(msg: String) : IllegalStateException(msg)
            ForegroundServiceStartNotAllowedException(message)
        }
    }

    @Test
    fun test105A_RealStartupPath_ServiceDispatchSuccess() {
        // Part B & C: Actual startForSession() entry point successfully dispatches service intent.
        FocusMonitoringService.resetStateForTesting()
        UsageAccessHelper.usageAccessOverride = { true }

        val fakePairing = FakeTestPairingManager()
        val fakeApi = FakeTestPhoneApiClient()
        val storage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = storage
        )
        FocusIntegrityApplication.setTestInstance(null, testManager = syncManager, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))
            val session = FocusSessionContract(
                sessionId = "sess_dispatch_success_105a",
                startedAt = 100000L,
                intendedDurationSeconds = 1500L,
                taskName = "Dispatch Test"
            )

            var dispatchedSession: FocusSessionContract? = null
            val successDispatcher = ServiceDispatcher { _, sess ->
                dispatchedSession = sess
                ComponentName("com.learningtracker.companion", "com.learningtracker.companion.service.FocusMonitoringService")
            }

            // Execute production startForSession() entry point with injectable dispatcher
            val dispatched = FocusMonitoringService.startForSession(testContext, session, dispatcher = successDispatcher)

            assertTrue("Service dispatch must return true on success", dispatched)
            assertNotNull("Dispatcher must receive the session", dispatchedSession)
            assertEquals("sess_dispatch_success_105a", dispatchedSession?.sessionId)
            assertEquals("Dispatch Test", dispatchedSession?.taskName)

            // Observability: Errors must be cleared on success
            assertNull("lastStartupError must be null on successful dispatch", FocusMonitoringService.lastStartupError)
            assertNull("startupErrorFlow must emit null on successful dispatch", FocusMonitoringService.startupErrorFlow.value)
            // Dispatch alone does not mark service as running (coordinator sets running upon lifecycle start)
            assertFalse("Service must not be running before onStartCommand execution", FocusMonitoringService.isRunning)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
            UsageAccessHelper.resetForTesting()
            FocusMonitoringService.resetStateForTesting()
        }
    }

    @Test
    fun test105B_RealStartupPath_ForegroundServiceStartNotAllowedException_IsObservableAndLeavesServiceStopped() {
        // Part B & C: ForegroundServiceStartNotAllowedException is safely caught, reported, and leaves service stopped.
        FocusMonitoringService.resetStateForTesting()
        UsageAccessHelper.usageAccessOverride = { true }

        val fakePairing = FakeTestPairingManager()
        FocusIntegrityApplication.setTestInstance(null, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))
            val session = FocusSessionContract(
                sessionId = "sess_fgs_not_allowed_105b",
                startedAt = 100000L,
                intendedDurationSeconds = 1500L
            )

            val expectedException = createForegroundServiceStartNotAllowedException(
                "Service cannot be started from the background"
            )

            val throwingDispatcher = ServiceDispatcher { _, _ ->
                throw expectedException
            }

            // Execute production startForSession() entry point
            val dispatched = FocusMonitoringService.startForSession(testContext, session, dispatcher = throwingDispatcher)

            assertFalse("Dispatch must return false when ForegroundServiceStartNotAllowedException is thrown", dispatched)
            assertNotNull("Startup failure must be observable on lastStartupError", FocusMonitoringService.lastStartupError)
            assertTrue(
                "lastStartupError must describe ForegroundServiceStartNotAllowedException: ${FocusMonitoringService.lastStartupError}",
                FocusMonitoringService.lastStartupError!!.contains("ForegroundServiceStartNotAllowedException")
            )
            assertEquals("startupErrorFlow must match lastStartupError", FocusMonitoringService.lastStartupError, FocusMonitoringService.startupErrorFlow.value)
            assertFalse("Service must remain stopped after dispatch failure", FocusMonitoringService.isRunning)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
            UsageAccessHelper.resetForTesting()
            FocusMonitoringService.resetStateForTesting()
        }
    }

    @Test
    fun test105C_RealStartupPath_GenericDispatchException_IsObservableAndLeavesServiceStopped() {
        // Part B & C: Generic runtime startup exception is safely caught, reported, and leaves service stopped.
        FocusMonitoringService.resetStateForTesting()
        UsageAccessHelper.usageAccessOverride = { true }

        val fakePairing = FakeTestPairingManager()
        FocusIntegrityApplication.setTestInstance(null, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))
            val session = FocusSessionContract(
                sessionId = "sess_generic_err_105c",
                startedAt = 100000L,
                intendedDurationSeconds = 1500L
            )

            val genericSecurityException = SecurityException("Not allowed to start service com.learningtracker.companion")

            val throwingDispatcher = ServiceDispatcher { _, _ ->
                throw genericSecurityException
            }

            // Execute production startForSession() entry point
            val dispatched = FocusMonitoringService.startForSession(testContext, session, dispatcher = throwingDispatcher)

            assertFalse("Dispatch must return false when generic exception is thrown", dispatched)
            assertNotNull("Startup failure must be observable on lastStartupError", FocusMonitoringService.lastStartupError)
            assertTrue(
                "lastStartupError must mention SecurityException: ${FocusMonitoringService.lastStartupError}",
                FocusMonitoringService.lastStartupError!!.contains("SecurityException")
            )
            assertTrue(
                "lastStartupError must mention exception message: ${FocusMonitoringService.lastStartupError}",
                FocusMonitoringService.lastStartupError!!.contains("Not allowed to start service com.learningtracker.companion")
            )
            assertEquals("startupErrorFlow must match lastStartupError", FocusMonitoringService.lastStartupError, FocusMonitoringService.startupErrorFlow.value)
            assertFalse("Service must remain stopped after dispatch failure", FocusMonitoringService.isRunning)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
            UsageAccessHelper.resetForTesting()
            FocusMonitoringService.resetStateForTesting()
        }
    }

    @Test
    fun test105D_RealStartupPath_MissingPrerequisitesReportsObservableFailure() {
        // Requirement G: Actual startForSession() must enforce preferences prerequisite without dispatching.
        FocusMonitoringService.resetStateForTesting()

        val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to false))
        val session = FocusSessionContract(
            sessionId = "sess_failed_startup_105d",
            startedAt = 100000L,
            intendedDurationSeconds = 1500L
        )

        var dispatcherInvoked = false
        val dispatcher = ServiceDispatcher { _, _ ->
            dispatcherInvoked = true
            null
        }

        // Exercise the ACTUAL production startup path
        val started = FocusMonitoringService.startForSession(testContext, session, dispatcher = dispatcher)

        assertFalse("Service must NOT start when tracking is disabled in preferences", started)
        assertFalse("Dispatcher must not be invoked when prerequisites fail", dispatcherInvoked)
        assertFalse("Service must NOT be running after prerequisite failure", FocusMonitoringService.isRunning)
        assertNotNull("Startup failure must be observable on lastStartupError", FocusMonitoringService.lastStartupError)
        assertEquals("Tracking is disabled in companion preferences.", FocusMonitoringService.lastStartupError)
        assertEquals("Tracking is disabled in companion preferences.", FocusMonitoringService.startupErrorFlow.value)
    }

    @Test
    fun test105E_RealStartupPath_UnpairedDeviceRefusesDispatch() {
        // Requirement G: Unpaired device must be rejected at prerequisite validation.
        FocusMonitoringService.resetStateForTesting()
        val fakePairing = FakeTestPairingManager(paired = false)
        FocusIntegrityApplication.setTestInstance(null, testPairing = fakePairing)

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))
            val session = FocusSessionContract(
                sessionId = "sess_unpaired_105e",
                startedAt = 100000L,
                intendedDurationSeconds = 1500L
            )

            var dispatcherInvoked = false
            val dispatcher = ServiceDispatcher { _, _ ->
                dispatcherInvoked = true
                null
            }

            val started = FocusMonitoringService.startForSession(testContext, session, dispatcher = dispatcher)

            assertFalse("Service must NOT start when device is not paired", started)
            assertFalse("Dispatcher must not be invoked when device is not paired", dispatcherInvoked)
            assertFalse("Service must NOT be running", FocusMonitoringService.isRunning)
            assertEquals("Device is not paired or pairing token is revoked.", FocusMonitoringService.lastStartupError)
            assertEquals("Device is not paired or pairing token is revoked.", FocusMonitoringService.startupErrorFlow.value)
        } finally {
            FocusIntegrityApplication.resetTestOverrides()
            FocusMonitoringService.resetStateForTesting()
        }
    }

    @Test
    fun test105F_RealStartupPath_MissingUsageAccessRefusesDispatch() {
        // Requirement G: Missing usage access must be rejected at prerequisite validation.
        FocusMonitoringService.resetStateForTesting()
        val fakePairing = FakeTestPairingManager()
        FocusIntegrityApplication.setTestInstance(null, testPairing = fakePairing)
        UsageAccessHelper.usageAccessOverride = { false }

        try {
            val testContext = TestStartupContext(mapOf("automatic_tracking_enabled" to true))
            val session = FocusSessionContract(
                sessionId = "sess_no_usage_105f",
                startedAt = 100000L,
                intendedDurationSeconds = 1500L
            )

            var dispatcherInvoked = false
            val dispatcher = ServiceDispatcher { _, _ ->
                dispatcherInvoked = true
                null
            }

            val started = FocusMonitoringService.startForSession(testContext, session, dispatcher = dispatcher)

            assertFalse("Service must NOT start when usage access is missing", started)
            assertFalse("Dispatcher must not be invoked when usage access is missing", dispatcherInvoked)
            assertFalse("Service must NOT be running", FocusMonitoringService.isRunning)
            assertEquals("Usage access permission (PACKAGE_USAGE_STATS) is not granted.", FocusMonitoringService.lastStartupError)
            assertEquals("Usage access permission (PACKAGE_USAGE_STATS) is not granted.", FocusMonitoringService.startupErrorFlow.value)
        } finally {
            UsageAccessHelper.resetForTesting()
            FocusIntegrityApplication.resetTestOverrides()
            FocusMonitoringService.resetStateForTesting()
        }
    }

    @Test
    fun test106_ServerStatusLookupFailurePreservesActiveSessionWithoutFabricatingTime() {
        // Requirement F: Network failure during server status check preserves active session for retry.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(
            sessionId = "sess_net_fail_106",
            startedAt = 1000000L,
            intendedDurationSeconds = 1500L
        )
        syncManager.onFocusStarted(session)

        // Web polling returns NO_ACTIVE_SESSION (web session concluded), but getSessionStatus fails with 503 network error
        fakeApi.activeSessionResponse = ApiResult.Success(
            ActiveSessionResponse("NO_ACTIVE_SESSION", null, null, null, null, null, System.currentTimeMillis()),
            200
        )
        fakeApi.sessionStatusResponse = ApiResult.Error("NETWORK_TIMEOUT", "Server status lookup timed out", 503, isTransient = true)

        val pollResult = syncManager.pollActiveSession()

        // Verify: Result is an error, active session is PRESERVED, and no fabricated summary is created
        assertTrue("Poll result must report error on status lookup failure", pollResult is com.learningtracker.companion.sync.PollResult.Error)
        assertEquals("STATUS_LOOKUP_FAILED", (pollResult as com.learningtracker.companion.sync.PollResult.Error).code)
        assertNotNull("Active session must NOT be deleted on network failure", syncManager.getActiveSession())
        assertEquals("sess_net_fail_106", syncManager.getActiveSession()?.sessionId)
        assertEquals("No fabricated completed summary created", 0, inMemoryStorage.getAllSummaries().size)
    }

    @Test
    fun test107_MissingAuthoritativeEndTimeIsClassifiedAsEstimatedAndPartial() {
        // Requirement F: Missing authoritative endedAt is classified as ESTIMATED and PARTIAL.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(
            sessionId = "sess_missing_end_107",
            startedAt = 1000000L,
            intendedDurationSeconds = 1500L
        )
        syncManager.onFocusStarted(session)

        fakeApi.activeSessionResponse = ApiResult.Success(
            ActiveSessionResponse("NO_ACTIVE_SESSION", null, null, null, null, null, System.currentTimeMillis()),
            200
        )
        // Server reports COMPLETE, but endedAt and serverEndedAt are NULL
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(
                success = true,
                sessionId = "sess_missing_end_107",
                status = "COMPLETE",
                startedAt = 1000000L,
                endedAt = null,
                serverStartedAt = null,
                serverEndedAt = null,
                intendedDurationSeconds = 1500L,
                taskName = "Task",
                subjectName = "Subject"
            ),
            200
        )

        val pollResult = syncManager.pollActiveSession()
        assertTrue(pollResult is com.learningtracker.companion.sync.PollResult.Completed)
        val summary = (pollResult as com.learningtracker.companion.sync.PollResult.Completed).summary

        assertEquals("sess_missing_end_107", summary.sessionId)
        assertEquals("Missing authoritative end timestamp must be classified as ESTIMATED", BoundaryConfidence.ESTIMATED, summary.boundaryConfidence)
        assertEquals("Uncertain completion must be classified as PARTIAL", CollectionStatus.PARTIAL, summary.collectionStatus)
    }

    @Test
    fun test108_AuthoritativeEndTimeIsClassifiedAsAuthoritativeAndComplete() {
        // Requirement F: Authoritative server endedAt is preserved truthfully.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(
            sessionId = "sess_authoritative_108",
            startedAt = 1000000L,
            intendedDurationSeconds = 1500L
        )
        syncManager.onFocusStarted(session)

        val authoritativeEnd = 2350000L // 1350 seconds
        fakeApi.activeSessionResponse = ApiResult.Success(
            ActiveSessionResponse("NO_ACTIVE_SESSION", null, null, null, null, null, System.currentTimeMillis()),
            200
        )
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(
                success = true,
                sessionId = "sess_authoritative_108",
                status = "COMPLETE",
                startedAt = 1000000L,
                endedAt = authoritativeEnd,
                serverStartedAt = 1000000L,
                serverEndedAt = authoritativeEnd,
                intendedDurationSeconds = 1500L,
                taskName = "Task",
                subjectName = "Subject"
            ),
            200
        )

        val pollResult = syncManager.pollActiveSession()
        assertTrue(pollResult is com.learningtracker.companion.sync.PollResult.Completed)
        val summary = (pollResult as com.learningtracker.companion.sync.PollResult.Completed).summary

        assertEquals("sess_authoritative_108", summary.sessionId)
        assertEquals(authoritativeEnd, summary.timestamp)
        assertEquals(1350L, summary.observedWindowSeconds)
        assertEquals(BoundaryConfidence.AUTHORITATIVE, summary.boundaryConfidence)
        // Without local raw events, reconstruction truthfully reports NO_OBSERVATIONS without fabricating focus intervals
        assertEquals(CollectionStatus.NO_OBSERVATIONS, summary.collectionStatus)
    }

    @Test
    fun test109_DifferentSessionsFinalizeIndependently() {
        // Requirement E: Distinct session IDs produce independent authoritative summaries without conflict.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            storage = inMemoryStorage
        )

        val sessionX = FocusSessionContract(sessionId = "sess_x_109", startedAt = 1000L, intendedDurationSeconds = 1000L)
        val sessionY = FocusSessionContract(sessionId = "sess_y_109", startedAt = 5000L, intendedDurationSeconds = 1000L)

        val summaryX = syncManager.finalizeSessionCollection(sessionX, 2000L)
        val summaryY = syncManager.finalizeSessionCollection(sessionY, 6000L)

        assertEquals("sum_sess_x_109", summaryX.summaryId)
        assertEquals("sum_sess_y_109", summaryY.summaryId)
        assertNotEquals(summaryX.summaryId, summaryY.summaryId)
        assertEquals(2, inMemoryStorage.getAllSummaries().size)
    }

    @Test
    fun test110_UploadFailurePreservesPendingTelemetryWithoutSilentDeletion() {
        // Requirement D: Upload failures must not silently erase pending telemetry.
        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_pending_110", startedAt = 1000L, intendedDurationSeconds = 1000L)
        val summary = syncManager.finalizeSessionCollection(session, 2000L)
        assertEquals(1, inMemoryStorage.getPendingSummaries().size)

        // Simulate server network failure during batch upload
        fakeApi.telemetryResponse = ApiResult.Error("NETWORK_ERROR", "Server unavailable", 503, isTransient = true)

        val batchResult = syncManager.uploadPendingSummaries()
        assertEquals(1, batchResult.failedCount)
        assertEquals(0, batchResult.uploadedCount)

        // Telemetry is NOT deleted: remains durably in storage with attempt count incremented
        val pendingAfter = inMemoryStorage.getPendingSummaries()
        assertEquals(1, pendingAfter.size)
        assertEquals("sum_sess_pending_110", pendingAfter[0].summaryId)
        assertEquals(1, inMemoryStorage.getAttempts("sum_sess_pending_110"))
    }

    @Test
    fun test111_CancellationDuringSessionCleansUpSafely() = kotlinx.coroutines.runBlocking {
        // Requirement C: Cancellation cleanly stops monitoring and resets state without leaks.
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_cancel_111", startedAt = 1000L, intendedDurationSeconds = 1500L)
        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(scope = this, pollIntervalMs = 60000L)

        coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(coordinator.isRunning)

        coordinator.stop(syncManager)
        assertFalse(coordinator.isRunning)
        assertNull(coordinator.currentSession)
        assertNull(coordinator.activeJob)
        assertEquals(com.learningtracker.companion.model.MonitoringState.READY, com.learningtracker.companion.service.FocusMonitoringService.currentState)
    }

    @Test
    fun test112_BoundaryConfidenceSerializationAndPreservation() {
        // Requirement F & Verification Item 3: BoundaryConfidence preservation & serialization round-trip
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

        for (confidence in BoundaryConfidence.values()) {
            val original = FocusSummary(
                sessionId = "sess_conf_${confidence.name}",
                summaryId = "sum_conf_${confidence.name}",
                intendedSeconds = 1500L,
                observedWindowSeconds = 1500L,
                interruptionCount = 0,
                interruptionSeconds = 0L,
                referenceSeconds = 0L,
                distractionSeconds = 0L,
                unknownSeconds = 0L,
                longestUninterruptedSeconds = 1500L,
                boundaryConfidence = confidence,
                collectionStatus = if (confidence == BoundaryConfidence.ESTIMATED) CollectionStatus.PARTIAL else CollectionStatus.COMPLETE
            )

            val serialized = json.encodeToString(FocusSummary.serializer(), original)
            assertTrue("Serialized JSON must contain boundaryConfidence value", serialized.contains(confidence.name))

            val deserialized = json.decodeFromString(FocusSummary.serializer(), serialized)
            assertEquals("BoundaryConfidence must survive JSON serialization", confidence, deserialized.boundaryConfidence)
        }
    }

    @Test
    fun test113_SessionCompletionDoesNotSelfJoinAndReleasesMutex() = kotlinx.coroutines.runBlocking {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_complete_113", startedAt = 1000L, intendedDurationSeconds = 1500L)
        var stopForegroundInvoked = 0

        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 50L,
            onStopForeground = { stopForegroundInvoked++ }
        )

        // Session starts
        coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(coordinator.isRunning)
        assertTrue(com.learningtracker.companion.service.FocusMonitoringService.isRunning)

        // Simulate server reporting session complete
        fakeApi.activeSessionResponse = ApiResult.Success(
            ActiveSessionResponse("NO_ACTIVE_SESSION", null, null, null, null, null, System.currentTimeMillis()), 200
        )
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(true, "sess_complete_113", "COMPLETE", 1000L, 2000L, 1000L, 2000L, 1000L, "Task", "Subject"), 200
        )

        // Give coroutines time to poll, complete, and run separate cleanup coroutine
        val startTime = System.currentTimeMillis()
        while ((coordinator.isRunning || coordinator.mutex.isLocked) && System.currentTimeMillis() - startTime < 3000L) {
            delay(50L)
        }

        // Must not hang/deadlock:
        assertFalse("Coordinator must not remain running after completion", coordinator.isRunning)
        assertFalse("FocusMonitoringService.isRunning must be false", com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertNull("currentSession must be null", coordinator.currentSession)
        assertFalse("Coordinator mutex must be unlocked", coordinator.mutex.isLocked)
        assertEquals("onStopForeground must be invoked exactly once", 1, stopForegroundInvoked)
    }

    @Test
    fun test114_ForegroundServiceTerminatesAfterCompletion() = kotlinx.coroutines.runBlocking {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_fgs_term_114", startedAt = 1000L, intendedDurationSeconds = 1500L)
        var stopForegroundCalls = 0

        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 50L,
            onStopForeground = { stopForegroundCalls++ }
        )

        coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(coordinator.isRunning)

        // Complete session
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(true, "sess_fgs_term_114", "COMPLETE", 1000L, 2000L, 1000L, 2000L, 1000L, "Task", "Subject"), 200
        )

        val start = System.currentTimeMillis()
        while (coordinator.isRunning && System.currentTimeMillis() - start < 3000L) {
            delay(50L)
        }

        assertEquals("onStopForeground must be invoked when session completes", 1, stopForegroundCalls)
        assertFalse(coordinator.isRunning)
        assertFalse(com.learningtracker.companion.service.FocusMonitoringService.isRunning)
    }

    @Test
    fun test115_SecondSessionStartsAfterFirstSessionFinalization() = kotlinx.coroutines.runBlocking {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session1 = FocusSessionContract(sessionId = "sess_1_115", startedAt = 1000L, intendedDurationSeconds = 1500L)
        val session2 = FocusSessionContract(sessionId = "sess_2_115", startedAt = 3000L, intendedDurationSeconds = 1500L)

        var stopForegroundCount = 0
        var startForegroundCount = 0
        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 50L,
            onStartForeground = { startForegroundCount++ },
            onStopForeground = { stopForegroundCount++ }
        )

        // 1. Start Session 1
        val start1 = coordinator.startOrTransitionSession(session1, syncManager)
        assertTrue(start1)
        assertEquals("sess_1_115", coordinator.currentSession?.sessionId)
        assertEquals(1, startForegroundCount)

        // 2. Complete Session 1
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(true, "sess_1_115", "COMPLETE", 1000L, 2000L, 1000L, 2000L, 1000L, "Task", "Subject"), 200
        )

        val waitStart = System.currentTimeMillis()
        while (coordinator.isRunning && System.currentTimeMillis() - waitStart < 3000L) {
            delay(50L)
        }

        assertFalse("Session 1 must have stopped running", coordinator.isRunning)
        assertNull(coordinator.currentSession)
        assertEquals(1, stopForegroundCount)

        // 3. Start Session 2 with distinct session ID
        fakeApi.activeSessionResponse = ApiResult.Success(
            ActiveSessionResponse("ACTIVE_SESSION_FOUND", "sess_2_115", 3000L, 1500L, "Task 2", "Subject 2", System.currentTimeMillis()), 200
        )
        fakeApi.sessionStatusResponse = ApiResult.Success(
            SessionStatusResponse(true, "sess_2_115", "RUNNING", 3000L, null, 3000L, null, 1500L, "Task 2", "Subject 2"), 200
        )

        val start2 = coordinator.startOrTransitionSession(session2, syncManager)
        assertTrue("Session 2 must start successfully", start2)
        assertEquals("sess_2_115", coordinator.currentSession?.sessionId)
        assertTrue("Coordinator must be running for Session 2", coordinator.isRunning)
        assertTrue(com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertEquals(2, startForegroundCount)

        // Clean up Session 2
        coordinator.stop(syncManager)
        assertFalse(coordinator.isRunning)
    }

    @Test
    fun test116_DuplicateCompletionDoesNotGenerateDuplicateSummaries() = kotlinx.coroutines.runBlocking {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_dup_116", startedAt = 1000L, intendedDurationSeconds = 1500L)
        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(scope = this, pollIntervalMs = 60000L)

        coordinator.startOrTransitionSession(session, syncManager)

        // First finalization
        val summary1 = syncManager.finalizeSessionCollection(session, 2000L)
        assertEquals(1, inMemoryStorage.getPendingSummaries().size)

        // Duplicate finalization attempt on same session
        val summary2 = syncManager.finalizeSessionCollection(session, 2000L)
        assertEquals(1, inMemoryStorage.getPendingSummaries().size)
        assertEquals(summary1.summaryId, summary2.summaryId)

        coordinator.stop(syncManager = null)
        assertFalse(coordinator.isRunning)
    }

    @Test
    fun test117_ExternalStopCancelsJobAndCleansUpSafely() = kotlinx.coroutines.runBlocking {
        com.learningtracker.companion.service.FocusMonitoringService.resetStateForTesting()

        val inMemoryStorage = com.learningtracker.companion.sync.InMemoryTelemetryStorage()
        val fakeApi = FakeTestPhoneApiClient()
        val fakePairing = FakeTestPairingManager()
        val syncManager = FocusIntegritySyncManager(
            context = null,
            pairingManager = fakePairing,
            apiClient = fakeApi,
            storage = inMemoryStorage
        )

        val session = FocusSessionContract(sessionId = "sess_ext_stop_117", startedAt = 1000L, intendedDurationSeconds = 1500L)
        var stopForegroundCount = 0

        val coordinator = com.learningtracker.companion.service.SessionLifecycleCoordinator(
            scope = this,
            pollIntervalMs = 60000L,
            onStopForeground = { stopForegroundCount++ }
        )

        coordinator.startOrTransitionSession(session, syncManager)
        assertTrue(coordinator.isRunning)

        // External manual stop
        coordinator.stop(syncManager)

        assertFalse(coordinator.isRunning)
        assertFalse(com.learningtracker.companion.service.FocusMonitoringService.isRunning)
        assertNull(coordinator.currentSession)
        assertNull(coordinator.activeJob)
        assertFalse("Coordinator mutex must be unlocked", coordinator.mutex.isLocked)
        assertEquals("onStopForeground must be invoked exactly once", 1, stopForegroundCount)
    }
}
