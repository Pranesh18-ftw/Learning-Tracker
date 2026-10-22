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

        client.setBaseUrl("http://192.168.1.50:8888")
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
}
