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
 * Telemetry storage abstraction for Phase 1.
 * Supports production SharedPreferences implementation and testable in-memory implementation.
 */
interface ITelemetryStorage {
    fun saveSummary(summary: FocusSummary)
    fun getSummary(summaryId: String): FocusSummary?
    fun getAllSummaries(): List<FocusSummary>
    fun getPendingSummaries(): List<FocusSummary>
    fun updateSyncState(summaryId: String, nextState: String, lastError: String? = null)
    fun getAttempts(summaryId: String): Int
    fun getLastError(summaryId: String): String?
    fun deleteSummary(summaryId: String)
    fun clearAllSummaries()
}

/**
 * In-memory telemetry storage for tests and isolated lifecycle execution.
 */
class InMemoryTelemetryStorage : ITelemetryStorage {
    private val summaries = mutableMapOf<String, FocusSummary>()
    private val attempts = mutableMapOf<String, Int>()
    private val lastErrors = mutableMapOf<String, String>()

    @Synchronized
    override fun saveSummary(summary: FocusSummary) {
        summaries[summary.summaryId] = summary
        if (!attempts.containsKey(summary.summaryId)) {
            attempts[summary.summaryId] = 0
        }
    }

    @Synchronized
    override fun getSummary(summaryId: String): FocusSummary? = summaries[summaryId]

    @Synchronized
    override fun getAllSummaries(): List<FocusSummary> = summaries.values.toList()

    @Synchronized
    override fun getPendingSummaries(): List<FocusSummary> =
        summaries.values.filter { it.syncState == "PENDING" || it.syncState == "RETRY" }

    @Synchronized
    override fun updateSyncState(summaryId: String, nextState: String, lastError: String?) {
        val current = summaries[summaryId] ?: return
        summaries[summaryId] = current.copy(syncState = nextState)
        attempts[summaryId] = (attempts[summaryId] ?: 0) + 1
        if (lastError != null) lastErrors[summaryId] = lastError
    }

    @Synchronized
    override fun getAttempts(summaryId: String): Int = attempts[summaryId] ?: 0

    @Synchronized
    override fun getLastError(summaryId: String): String? = lastErrors[summaryId]

    @Synchronized
    override fun deleteSummary(summaryId: String) {
        summaries.remove(summaryId)
        attempts.remove(summaryId)
        lastErrors.remove(summaryId)
    }

    @Synchronized
    override fun clearAllSummaries() {
        summaries.clear()
        attempts.clear()
        lastErrors.clear()
    }
}

/**
 * LocalTelemetryStorage (Stage 2B Part 15)
 *
 * Local-first persistent storage for Focus summaries.
 * Idempotent: keyed by unique summaryId.
 * Records retry attempts and delivery state without leaking sensitive tokens.
 */
class LocalTelemetryStorage(
    context: Context,
    private val coordinator: com.learningtracker.companion.data.migration.LegacyStorageCoordinator? = null
) : ITelemetryStorage {

    private val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
    private val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }
    private val storageLock = Any()

    override fun saveSummary(summary: FocusSummary) = synchronized(storageLock) {
        if (coordinator != null) {
            kotlinx.coroutines.runBlocking {
                coordinator.recordSummary(summary)
            }
            return
        }
        val serialized = json.encodeToString(summary)
        prefs.edit().putString(summary.summaryId, serialized).apply()
        if (!metaPrefs.contains("${summary.summaryId}_attempts")) {
            metaPrefs.edit()
                .putInt("${summary.summaryId}_attempts", 0)
                .putLong("${summary.summaryId}_created_at", System.currentTimeMillis())
                .apply()
        }
    }

    override fun getSummary(summaryId: String): FocusSummary? = synchronized(storageLock) {
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getSummary(summaryId) }
        }
        val raw = prefs.getString(summaryId, null) ?: return null
        return try {
            json.decodeFromString<FocusSummary>(raw)
        } catch (e: Exception) {
            null
        }
    }

    override fun getAllSummaries(): List<FocusSummary> = synchronized(storageLock) {
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getAllSummaries() }
        }
        val list = mutableListOf<FocusSummary>()
        for ((_, value) in prefs.all) {
            val raw = value as? String ?: continue
            try {
                list.add(json.decodeFromString(raw))
            } catch (ignored: Exception) {}
        }
        return list.sortedByDescending { it.timestamp }
    }

    override fun getPendingSummaries(): List<FocusSummary> = synchronized(storageLock) {
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getPendingSummaries() }
        }
        return getAllSummaries().filter { it.syncState == "PENDING" || it.syncState == "RETRY" }
    }

    override fun updateSyncState(summaryId: String, nextState: String, lastError: String?) = synchronized(storageLock) {
        if (coordinator != null) {
            kotlinx.coroutines.runBlocking {
                coordinator.updateSyncState(summaryId, nextState, lastError)
            }
            return
        }
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

    override fun getAttempts(summaryId: String): Int = synchronized(storageLock) {
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getAttempts(summaryId) }
        }
        return metaPrefs.getInt("${summaryId}_attempts", 0)
    }

    override fun getLastError(summaryId: String): String? = synchronized(storageLock) {
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getLastError(summaryId) }
        }
        return metaPrefs.getString("${summaryId}_last_error", null)
    }

    override fun deleteSummary(summaryId: String) = synchronized(storageLock) {
        if (coordinator != null) {
            kotlinx.coroutines.runBlocking {
                coordinator.deleteSummary(summaryId)
            }
            return
        }
        prefs.edit().remove(summaryId).apply()
        metaPrefs.edit()
            .remove("${summaryId}_attempts")
            .remove("${summaryId}_last_attempt")
            .remove("${summaryId}_created_at")
            .remove("${summaryId}_last_error")
            .apply()
    }

    override fun clearAllSummaries() = synchronized(storageLock) {
        if (coordinator != null) {
            kotlinx.coroutines.runBlocking {
                coordinator.clearAllSummaries()
            }
            return
        }
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
    private val context: Context? = null,
    val pairingManager: PairingManager? = context?.let { PairingManager(it) },
    val apiClient: PhoneApiClient = pairingManager?.apiClient ?: PhoneApiClient(),
    private val usageCollector: UsageEventsCollector? = context?.let { UsageEventsCollector(it) },
    private val foregroundTracker: ForegroundTracker = ForegroundTracker(),
    private val classifier: InterruptionClassifier = InterruptionClassifier(),
    private val summaryCalculator: FocusSummaryCalculator = FocusSummaryCalculator(),
    val coordinator: com.learningtracker.companion.data.migration.LegacyStorageCoordinator? = null,
    val storage: ITelemetryStorage = context?.let { LocalTelemetryStorage(it, coordinator) } ?: InMemoryTelemetryStorage(),
    val preferences: com.learningtracker.companion.util.CompanionPreferences? = context?.let { com.learningtracker.companion.util.CompanionPreferences(it) }
) {

    init {
        pairingManager?.secureStore?.getServerBaseUrl()?.let { savedUrl ->
            if (savedUrl.isNotBlank()) {
                apiClient.setBaseUrl(savedUrl)
            }
        }
    }

    companion object {
        const val FALLBACK_RECOVERY_INTERVAL_MS = 10 * 60 * 1000L // 10 minutes fallback interval while foregrounded
    }

    private val sessionPrefs = context?.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }
    private var activeSession: FocusSessionContract? = loadPersistedActiveSession()
    private var lastSuccessfulUploadTime: Long = preferences?.lastSyncTime ?: 0L
    private var lastRecoveryTime: Long = 0L
    private var lastSnapshotVersion: Int = 0
    private var lastSnapshotUploadTime: Long = 0L

    fun getLastRecoveryTime(): Long = lastRecoveryTime

    fun collectCurrentTimelineSnapshot(
        session: FocusSessionContract,
        now: Long = System.currentTimeMillis()
    ): com.learningtracker.companion.model.TimelineSnapshot {
        val hasAccess = context?.let { com.learningtracker.companion.usage.UsageAccessHelper.hasUsageAccess(it) } ?: true
        val rawEvents = usageCollector?.querySessionWindow(session.startedAt, now) ?: emptyList()
        val reconstruction = foregroundTracker.reconstructWithStatus(rawEvents, session.startedAt, now)
        val interruptions = classifier.classifyIntervals(reconstruction.intervals)

        val collectionStatus = if (!hasAccess) {
            CollectionStatus.PERMISSION_REQUIRED
        } else {
            reconstruction.status
        }

        val intervals = summaryCalculator.buildTimelineIntervals(
            sessionStart = session.startedAt,
            sessionEnd = now,
            interruptions = interruptions,
            collectionStatus = collectionStatus
        )

        lastSnapshotVersion++
        return com.learningtracker.companion.model.TimelineSnapshot(
            schemaVersion = "1.0.0",
            sessionId = session.sessionId,
            snapshotVersion = lastSnapshotVersion,
            timestamp = now,
            observedWindow = com.learningtracker.companion.model.ObservedWindow(
                startedAt = session.startedAt,
                endedAt = now
            ),
            intervals = intervals,
            collectionStatus = collectionStatus
        )
    }

    @Volatile
    private var snapshotUploadCount: Int = 0

    fun getSnapshotUploadCount(): Int = snapshotUploadCount

    fun resetSnapshotUploadCount() {
        snapshotUploadCount = 0
    }

    /**
     * Requirement D: Single Live Snapshot Upload Owner.
     * FocusIntegritySyncManager is the designated authoritative owner.
     * Validates session identity before upload to ensure an old session's snapshot
     * is never uploaded as belonging to a new session.
     */
    fun uploadLiveTimelineSnapshot(
        session: FocusSessionContract,
        now: Long = System.currentTimeMillis()
    ): Boolean {
        val current = activeSession ?: loadPersistedActiveSession()
        if (current == null || current.sessionId != session.sessionId) {
            // Identity mismatch or session inactive: reject upload
            return false
        }
        val pm = pairingManager ?: return false
        if (!pm.isPaired() || pm.isRevoked()) return false
        val token = pm.getDeviceToken() ?: return false
        val snapshot = collectCurrentTimelineSnapshot(session, now)
        val res = apiClient.postTimelineSnapshot(session.sessionId, snapshot, token)
        val success = res is ApiResult.Success
        if (success) {
            snapshotUploadCount++
        }
        return success
    }

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
        if (coordinator != null) {
            return kotlinx.coroutines.runBlocking { coordinator.getActiveSession() } ?: activeSession
        }
        val raw = sessionPrefs?.getString("active_session_json", null) ?: return activeSession
        return try {
            json.decodeFromString<FocusSessionContract>(raw)
        } catch (e: Exception) {
            null
        }
    }

    private fun persistActiveSession(session: FocusSessionContract?) {
        activeSession = session
        if (coordinator != null) {
            kotlinx.coroutines.runBlocking {
                coordinator.recordActiveSession(session)
            }
        } else {
            if (session == null) {
                sessionPrefs?.edit()?.remove("active_session_json")?.apply()
            } else {
                val raw = json.encodeToString(session)
                sessionPrefs?.edit()?.putString("active_session_json", raw)?.apply()
            }
        }
    }

    fun getActiveSession(): FocusSessionContract? = activeSession ?: loadPersistedActiveSession()

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
     *
     * Requirement F: Never fabricates session completion time.
     * If server status lookup fails (network outage), preserves active session for retry.
     */
    fun pollActiveSession(): PollResult {
        val pm = pairingManager ?: return PollResult.Error("NO_PAIRING_MANAGER", "PairingManager is not initialized.")
        if (!pm.isPaired()) {
            return PollResult.Error("NOT_PAIRED", "Device is not paired.")
        }
        val token = pm.getDeviceToken()
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

                        // Periodic incremental timeline snapshot upload while session is active (every ~30s)
                        val now = System.currentTimeMillis()
                        if (now - lastSnapshotUploadTime >= 30_000L) {
                            try {
                                uploadLiveTimelineSnapshot(newSession, now)
                                lastSnapshotUploadTime = now
                            } catch (_: Exception) {}
                        }

                        return PollResult.Active(newSession)
                    }

                    "NO_ACTIVE_SESSION" -> {
                        val current = activeSession ?: loadPersistedActiveSession()
                        if (current != null) {
                            // Session was active and has ended on web client!
                            // Query authoritative session status and end timestamps
                            val statusResult = apiClient.getSessionStatus(current.sessionId, token)
                            if (statusResult is ApiResult.Success) {
                                val statusData = statusResult.data
                                if (statusData.status == "COMPLETE") {
                                    val authoritativeEnd = statusData.endedAt ?: statusData.serverEndedAt
                                    val (sessionEnd, confidence, colStatus) = if (authoritativeEnd != null) {
                                        Triple(authoritativeEnd, com.learningtracker.companion.model.BoundaryConfidence.AUTHORITATIVE, null)
                                    } else {
                                        // Requirement F: Never treat intended end time as authoritative completion.
                                        // When endedAt is missing, classify as ESTIMATED and PARTIAL.
                                        val estimatedEnd = current.startedAt + (current.intendedDurationSeconds * 1000L)
                                        Triple(minOf(estimatedEnd, System.currentTimeMillis()), com.learningtracker.companion.model.BoundaryConfidence.ESTIMATED, CollectionStatus.PARTIAL)
                                    }
                                    val summary = finalizeSessionCollection(
                                        session = current,
                                        endTime = sessionEnd,
                                        forcedStatus = colStatus,
                                        boundaryConfidence = confidence
                                    )
                                    persistActiveSession(null)
                                    uploadPendingSummaries()
                                    performUnreconciledRecovery(force = true)
                                    return PollResult.Completed(summary)
                                } else if (statusData.status == "CANCELLED" || statusData.status == "SUPERSEDED") {
                                    persistActiveSession(null)
                                    return PollResult.Cancelled
                                }
                            } else {
                                // Requirement F: When server status lookup fails (network outage / server error),
                                // DO NOT fabricate session completion or erase activeSession.
                                // Preserve activeSession for subsequent retry when connectivity returns.
                                val err = (statusResult as? ApiResult.Error)?.message ?: "Network error checking session status."
                                return PollResult.Error("STATUS_LOOKUP_FAILED", err)
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
                    pm.markRevoked()
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
        val pm = pairingManager ?: return emptyList()
        if (!pm.isPaired() || pm.isRevoked()) return emptyList()
        val token = pm.getDeviceToken() ?: return emptyList()

        val result = apiClient.getUnreconciledSessions(token, limit = 5)
        if (result !is ApiResult.Success) return emptyList()

        val recovered = mutableListOf<FocusSummary>()
        val existingSummaries = storage.getAllSummaries()
        val knownSessionIds = existingSummaries.map { it.sessionId }.toSet()

        for (session in result.data) {
            if (knownSessionIds.contains(session.sessionId)) continue
            val endTime = session.startedAt + (session.intendedDurationSeconds * 1000L)
            val summary = finalizeSessionCollection(
                session = session,
                endTime = endTime,
                boundaryConfidence = com.learningtracker.companion.model.BoundaryConfidence.ESTIMATED
            )
            recovered.add(summary)
        }

        if (recovered.isNotEmpty()) {
            uploadPendingSummaries()
        }

        return recovered
    }

    private val finalizationLock = Any()

    /**
     * Requirement E: Finalization Must Be Idempotent and Concurrency-Safe.
     * Synchronized on finalizationLock to ensure atomic check-then-save.
     * Concurrent calls for the same session ID will receive the authoritative summary
     * without creating duplicate records or overwriting existing calculations.
     */
    fun finalizeSessionCollection(
        session: FocusSessionContract,
        endTime: Long,
        forcedStatus: CollectionStatus? = null,
        boundaryConfidence: com.learningtracker.companion.model.BoundaryConfidence = com.learningtracker.companion.model.BoundaryConfidence.AUTHORITATIVE
    ): FocusSummary = synchronized(finalizationLock) {
        val sanitizedSessionId = session.sessionId.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(100)
        val stableSummaryId = "sum_$sanitizedSessionId"

        // Idempotency: Check if summary for this session ID already exists in durable storage
        val existing = storage.getSummary(stableSummaryId)
            ?: storage.getAllSummaries().firstOrNull { it.sessionId == session.sessionId }
        if (existing != null) {
            // Already finalized: return existing to prevent duplicate summaries or rewriting authoritative end timestamps
            return@synchronized existing
        }

        val hasAccess = context?.let { com.learningtracker.companion.usage.UsageAccessHelper.hasUsageAccess(it) } ?: true
        val rawEvents = usageCollector?.querySessionWindow(session.startedAt, endTime) ?: emptyList()
        val reconstruction = foregroundTracker.reconstructWithStatus(rawEvents, session.startedAt, endTime)
        val interruptions = classifier.classifyIntervals(reconstruction.intervals)

        val collectionStatus = forcedStatus ?: if (!hasAccess) {
            CollectionStatus.PERMISSION_REQUIRED
        } else {
            reconstruction.status
        }

        val summary = summaryCalculator.calculateSummary(
            session = session,
            sessionEndTime = endTime,
            interruptions = interruptions,
            summaryId = stableSummaryId,
            collectionStatus = collectionStatus,
            boundaryConfidence = boundaryConfidence
        )

        // Save locally first (local-first durability guarantee)
        storage.saveSummary(summary)
        return@synchronized summary
    }

    fun finalizeOrphanedSession(
        session: FocusSessionContract,
        endTime: Long,
        status: CollectionStatus = CollectionStatus.PARTIAL
    ): FocusSummary {
        val summary = finalizeSessionCollection(
            session = session,
            endTime = endTime,
            forcedStatus = status,
            boundaryConfidence = com.learningtracker.companion.model.BoundaryConfidence.ESTIMATED
        )
        persistActiveSession(null)
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
        val pm = pairingManager ?: return UploadBatchResult(0, 0, 0, listOf("PairingManager missing"))
        if (!pm.isPaired() || pm.isRevoked()) {
            return UploadBatchResult(0, 0, 0, listOf("Device not paired or revoked"))
        }
        val token = pm.getDeviceToken()
            ?: return UploadBatchResult(0, 0, 0, listOf("Device token missing"))
        val deviceId = pm.getDeviceAssociation()?.deviceAssociationId
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
                timeline = summary.timeline,
                consentVersion = "1.0.0",
                schemaVersion = "1.0.0"
            )


            val result = apiClient.submitTelemetrySummary(payload, token)

            when (result) {
                is ApiResult.Success -> {
                    storage.updateSyncState(summary.summaryId, "DELIVERED")
                    lastSuccessfulUploadTime = System.currentTimeMillis()
                    preferences?.lastSyncTime = lastSuccessfulUploadTime
                    uploaded++
                }
                is ApiResult.Error -> {
                    when (result.statusCode) {
                        401 -> {
                            pm.markRevoked()
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
