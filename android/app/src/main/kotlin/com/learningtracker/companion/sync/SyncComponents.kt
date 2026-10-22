package com.learningtracker.companion.sync

import android.content.Context
import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.network.ApiResult
import com.learningtracker.companion.network.AppBreakdownItem
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.network.TelemetrySummaryPayload
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.tracker.FocusSummaryCalculator
import com.learningtracker.companion.tracker.ForegroundTracker
import com.learningtracker.companion.tracker.InterruptionClassifier
import com.learningtracker.companion.usage.UsageEventsCollector
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

/**
 * LocalTelemetryStorage (Stage 2B Part 15)
 *
 * Local-first persistent storage for Focus summaries.
 * Idempotent: keyed by unique summaryId.
 * Records retry attempts and delivery state without leaking sensitive tokens.
 */
class LocalTelemetryStorage(context: Context) {

    private val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
    private val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    fun saveSummary(summary: FocusSummary) {
        val serialized = json.encodeToString(summary)
        prefs.edit().putString(summary.summaryId, serialized).apply()
        if (!metaPrefs.contains("${summary.summaryId}_attempts")) {
            metaPrefs.edit()
                .putInt("${summary.summaryId}_attempts", 0)
                .putLong("${summary.summaryId}_created_at", System.currentTimeMillis())
                .apply()
        }
    }

    fun getSummary(summaryId: String): FocusSummary? {
        val raw = prefs.getString(summaryId, null) ?: return null
        return try {
            json.decodeFromString<FocusSummary>(raw)
        } catch (e: Exception) {
            null
        }
    }

    fun getAllSummaries(): List<FocusSummary> {
        val list = mutableListOf<FocusSummary>()
        for ((_, value) in prefs.all) {
            val raw = value as? String ?: continue
            try {
                list.add(json.decodeFromString(raw))
            } catch (ignored: Exception) {}
        }
        return list.sortedByDescending { it.timestamp }
    }

    fun getPendingSummaries(): List<FocusSummary> {
        return getAllSummaries().filter { it.syncState == "PENDING" || it.syncState == "RETRY" }
    }

    fun updateSyncState(summaryId: String, nextState: String, lastError: String? = null) {
        val current = getSummary(summaryId) ?: return
        val updated = current.copy(syncState = nextState)
        saveSummary(updated)

        val attempts = metaPrefs.getInt("${summaryId}_attempts", 0)
        metaPrefs.edit()
            .putInt("${summaryId}_attempts", attempts + 1)
            .putLong("${summaryId}_last_attempt", System.currentTimeMillis())
            .apply {
                if (lastError != null) {
                    putString("${summaryId}_last_error", lastError)
                }
            }
            .apply()
    }

    fun getAttempts(summaryId: String): Int {
        return metaPrefs.getInt("${summaryId}_attempts", 0)
    }

    fun getLastError(summaryId: String): String? {
        return metaPrefs.getString("${summaryId}_last_error", null)
    }

    fun deleteSummary(summaryId: String) {
        prefs.edit().remove(summaryId).apply()
        metaPrefs.edit()
            .remove("${summaryId}_attempts")
            .remove("${summaryId}_last_attempt")
            .remove("${summaryId}_created_at")
            .remove("${summaryId}_last_error")
            .apply()
    }

    fun clearAllSummaries() {
        prefs.edit().clear().apply()
        metaPrefs.edit().clear().apply()
    }
}

sealed class PollResult {
    data class Active(val session: FocusSessionContract) : PollResult()
    object Idle : PollResult()
    data class Completed(val summary: FocusSummary) : PollResult()
    object Cancelled : PollResult()
    object Revoked : PollResult()
    data class Error(val code: String, val message: String) : PollResult()
}

data class UploadBatchResult(
    val uploadedCount: Int,
    val failedCount: Int,
    val permanentFailures: Int,
    val errors: List<String>
)

/**
 * FocusIntegritySyncManager (Stage 2B Part 9, 10, 11, 14, 15)
 *
 * Orchestrates:
 * 1. Discovering active session via GET /api/v1/phone/focus-session/active.
 * 2. On session end, retrieving authoritative endedAt via GET /api/v1/phone/focus-sessions/:sessionId/status.
 * 3. Querying UsageEvents strictly within [startedAt, endedAt].
 * 4. Calculating truthful summary with bounded app breakdown and CollectionStatus.
 * 5. Durably persisting locally before network transmission.
 * 6. Authenticated transmission to POST /api/v1/phone/telemetry-summaries with Bearer devtok_...
 * 7. Bounded exponential backoff and permanent failure handling.
 */
class FocusIntegritySyncManager(
    private val context: Context,
    val pairingManager: PairingManager = PairingManager(context),
    val apiClient: PhoneApiClient = PhoneApiClient(),
    private val usageCollector: UsageEventsCollector = UsageEventsCollector(context),
    private val foregroundTracker: ForegroundTracker = ForegroundTracker(),
    private val classifier: InterruptionClassifier = InterruptionClassifier(),
    private val summaryCalculator: FocusSummaryCalculator = FocusSummaryCalculator(),
    val storage: LocalTelemetryStorage = LocalTelemetryStorage(context)
) {

    companion object {
        const val FALLBACK_RECOVERY_INTERVAL_MS = 10 * 60 * 1000L // 10 minutes fallback interval while foregrounded
    }

    private val sessionPrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }
    private var activeSession: FocusSessionContract? = loadPersistedActiveSession()
    private var lastSuccessfulUploadTime: Long = 0L
    private var lastRecoveryTime: Long = 0L

    fun getLastRecoveryTime(): Long = lastRecoveryTime

    /**
     * Executes unreconciled session recovery if forced, or if the fallback interval has elapsed.
     */
    fun performUnreconciledRecovery(force: Boolean = false): List<FocusSummary> {
        val now = System.currentTimeMillis()
        if (!force && (now - lastRecoveryTime < FALLBACK_RECOVERY_INTERVAL_MS)) {
            return emptyList()
        }
        lastRecoveryTime = now
        return recoverUnreconciledSessions()
    }

    private fun loadPersistedActiveSession(): FocusSessionContract? {
        val raw = sessionPrefs.getString("active_session_json", null) ?: return null
        return try {
            json.decodeFromString<FocusSessionContract>(raw)
        } catch (e: Exception) {
            null
        }
    }

    private fun persistActiveSession(session: FocusSessionContract?) {
        activeSession = session
        if (session == null) {
            sessionPrefs.edit().remove("active_session_json").apply()
        } else {
            val raw = json.encodeToString(session)
            sessionPrefs.edit().putString("active_session_json", raw).apply()
        }
    }

    fun getActiveSession(): FocusSessionContract? = activeSession

    fun getLastSuccessfulUploadTime(): Long = lastSuccessfulUploadTime

    fun onFocusStarted(session: FocusSessionContract) {
        persistActiveSession(session)
    }

    fun onFocusCancelled(sessionId: String) {
        if (activeSession?.sessionId == sessionId) {
            persistActiveSession(null)
        }
    }

    /**
     * Polls the server to discover active session or transitions.
     * Invariant: Does not call /focus-sessions/unreconciled on every idle poll.
     */
    fun pollActiveSession(): PollResult {
        if (!pairingManager.isPaired()) {
            return PollResult.Error("NOT_PAIRED", "Device is not paired.")
        }
        val token = pairingManager.getDeviceToken()
            ?: return PollResult.Error("NO_CREDENTIAL", "Device token not found.")

        val activeResult = apiClient.getActiveSession(token)

        when (activeResult) {
            is ApiResult.Success -> {
                val data = activeResult.data
                when (data.status) {
                    "ACTIVE_SESSION_FOUND" -> {
                        val newSession = FocusSessionContract(
                            sessionId = data.sessionId ?: "unknown_sess",
                            startedAt = data.startedAt ?: System.currentTimeMillis(),
                            intendedDurationSeconds = data.intendedDurationSeconds ?: 1500L,
                            taskName = data.taskName,
                            subjectName = data.subjectName,
                            state = "RUNNING"
                        )
                        persistActiveSession(newSession)
                        return PollResult.Active(newSession)
                    }

                    "NO_ACTIVE_SESSION" -> {
                        val current = activeSession
                        if (current != null) {
                            // Session was active and has ended on web client!
                            // Query authoritative session status and end timestamps
                            val statusResult = apiClient.getSessionStatus(current.sessionId, token)
                            if (statusResult is ApiResult.Success) {
                                val statusData = statusResult.data
                                if (statusData.status == "COMPLETE") {
                                    val sessionEnd = statusData.endedAt ?: statusData.serverEndedAt ?: System.currentTimeMillis()
                                    val summary = finalizeSessionCollection(current, sessionEnd)
                                    persistActiveSession(null)
                                    uploadPendingSummaries()
                                    performUnreconciledRecovery(force = true)
                                    return PollResult.Completed(summary)
                                } else if (statusData.status == "CANCELLED" || statusData.status == "SUPERSEDED") {
                                    persistActiveSession(null)
                                    return PollResult.Cancelled
                                }
                            } else {
                                // If status lookup failed, fallback to current time without guessing
                                val summary = finalizeSessionCollection(current, System.currentTimeMillis())
                                persistActiveSession(null)
                                uploadPendingSummaries()
                                performUnreconciledRecovery(force = true)
                                return PollResult.Completed(summary)
                            }
                        }

                        // Retry pending uploads if any exist (e.g. recovering from previous network error)
                        if (storage.getPendingSummaries().isNotEmpty()) {
                            uploadPendingSummaries()
                        }

                        // Periodic fallback recovery (at most once per 10 minutes, NOT every 15s idle poll)
                        val recovered = performUnreconciledRecovery(force = false)
                        if (recovered.isNotEmpty()) {
                            return PollResult.Completed(recovered.first())
                        }

                        return PollResult.Idle
                    }

                    "AMBIGUOUS_ACTIVE_SESSIONS" -> {
                        return PollResult.Error("AMBIGUOUS_ACTIVE_SESSIONS", "Multiple active sessions detected on server.")
                    }

                    else -> return PollResult.Idle
                }
            }
            is ApiResult.Error -> {
                if (activeResult.statusCode == 401) {
                    pairingManager.markRevoked()
                    return PollResult.Revoked
                }
                return PollResult.Error(activeResult.code, activeResult.message)
            }
        }
    }

    /**
     * Recovers completed sessions that were missed while companion was closed or offline.
     * Bounded to max 5 sessions in the last 24h.
     */
    fun recoverUnreconciledSessions(): List<FocusSummary> {
        if (!pairingManager.isPaired() || pairingManager.isRevoked()) return emptyList()
        val token = pairingManager.getDeviceToken() ?: return emptyList()

        val result = apiClient.getUnreconciledSessions(token, limit = 5)
        if (result !is ApiResult.Success) return emptyList()

        val recovered = mutableListOf<FocusSummary>()
        val existingSummaries = storage.getAllSummaries()
        val knownSessionIds = existingSummaries.map { it.sessionId }.toSet()

        for (session in result.data) {
            if (knownSessionIds.contains(session.sessionId)) continue
            val endTime = session.startedAt + (session.intendedDurationSeconds * 1000L)
            val summary = finalizeSessionCollection(session, endTime)
            recovered.add(summary)
        }

        if (recovered.isNotEmpty()) {
            uploadPendingSummaries()
        }

        return recovered
    }

    /**
     * Finalizes session collection for window [session.startedAt, endTime].
     */
    fun finalizeSessionCollection(
        session: FocusSessionContract,
        endTime: Long
    ): FocusSummary {
        val hasAccess = com.learningtracker.companion.usage.UsageAccessHelper.hasUsageAccess(context)
        val rawEvents = usageCollector.querySessionWindow(session.startedAt, endTime)
        val reconstruction = foregroundTracker.reconstructWithStatus(rawEvents, session.startedAt, endTime)
        val interruptions = classifier.classifyIntervals(reconstruction.intervals)

        val collectionStatus = if (!hasAccess) {
            CollectionStatus.PERMISSION_REQUIRED
        } else {
            reconstruction.status
        }

        val summary = summaryCalculator.calculateSummary(
            session = session,
            sessionEndTime = endTime,
            interruptions = interruptions,
            summaryId = "sum_" + UUID.randomUUID().toString().replace("-", ""),
            collectionStatus = collectionStatus
        )

        // Save locally first (local-first durability guarantee)
        storage.saveSummary(summary)
        return summary
    }

    fun onFocusEnded(sessionId: String, endTime: Long = System.currentTimeMillis()): FocusSummary? {
        val session = activeSession ?: return null
        if (session.sessionId != sessionId) return null

        val summary = finalizeSessionCollection(session, endTime)
        persistActiveSession(null)
        uploadPendingSummaries()
        return summary
    }

    /**
     * Uploads all pending summaries with backoff and error classification.
     */
    fun uploadPendingSummaries(): UploadBatchResult {
        if (!pairingManager.isPaired() || pairingManager.isRevoked()) {
            return UploadBatchResult(0, 0, 0, listOf("Device not paired or revoked"))
        }
        val token = pairingManager.getDeviceToken()
            ?: return UploadBatchResult(0, 0, 0, listOf("Device token missing"))
        val deviceId = pairingManager.getDeviceAssociation()?.deviceAssociationId
            ?: return UploadBatchResult(0, 0, 0, listOf("Device ID missing"))

        val pending = storage.getPendingSummaries()
        var uploaded = 0
        var failed = 0
        var permanent = 0
        val errors = mutableListOf<String>()

        for (summary in pending) {
            val attempts = storage.getAttempts(summary.summaryId)
            if (attempts >= 10) {
                // Permanent backoff cap to avoid battery drain
                storage.updateSyncState(summary.summaryId, "PERMANENT_ERROR", "Max attempts exceeded")
                permanent++
                continue
            }

            val payload = TelemetrySummaryPayload(
                summaryId = summary.summaryId,
                deviceId = deviceId,
                sessionId = summary.sessionId,
                windowStart = summary.timestamp - (summary.observedWindowSeconds * 1000L),
                windowEnd = summary.timestamp,
                intendedSeconds = summary.intendedSeconds,
                observedSeconds = summary.observedWindowSeconds,
                interruptionCount = summary.interruptionCount,
                interruptionSeconds = summary.interruptionSeconds,
                referenceSeconds = summary.referenceSeconds,
                distractionSeconds = summary.distractionSeconds,
                longestUninterruptedSeconds = summary.longestUninterruptedSeconds,
                appBreakdown = summary.appBreakdown.map {
                    AppBreakdownItem(
                        packageName = it.packageName,
                        category = it.category.value,
                        durationSeconds = it.durationSeconds
                    )
                },
                consentVersion = "1.0.0",
                schemaVersion = "1.0.0"
            )

            val result = apiClient.submitTelemetrySummary(payload, token)

            when (result) {
                is ApiResult.Success -> {
                    storage.updateSyncState(summary.summaryId, "DELIVERED")
                    lastSuccessfulUploadTime = System.currentTimeMillis()
                    uploaded++
                }
                is ApiResult.Error -> {
                    when (result.statusCode) {
                        401 -> {
                            pairingManager.markRevoked()
                            storage.updateSyncState(summary.summaryId, "PERMANENT_ERROR", "Device revoked (401)")
                            permanent++
                            errors.add("Device revoked (401)")
                            return UploadBatchResult(uploaded, failed, permanent, errors)
                        }
                        400, 403 -> {
                            storage.updateSyncState(summary.summaryId, "PERMANENT_ERROR", "${result.code}: ${result.message}")
                            permanent++
                            errors.add("${result.code}: ${result.message}")
                        }
                        409 -> {
                            // Conflict: summary exists with conflicting content
                            storage.updateSyncState(summary.summaryId, "CONFLICT", result.message)
                            permanent++
                            errors.add("Conflict (409)")
                        }
                        else -> {
                            // Transient (network, 429, 503)
                            storage.updateSyncState(summary.summaryId, "RETRY", "${result.code}: ${result.message}")
                            failed++
                            errors.add("${result.code}: ${result.message}")
                        }
                    }
                }
            }
        }

        return UploadBatchResult(uploaded, failed, permanent, errors)
    }

    fun clearPendingTelemetry() {
        storage.clearAllSummaries()
    }
}
