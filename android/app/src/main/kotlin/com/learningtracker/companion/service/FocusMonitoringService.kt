package com.learningtracker.companion.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.learningtracker.companion.FocusIntegrityApplication
import com.learningtracker.companion.MainActivity
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.model.MonitoringState
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import com.learningtracker.companion.sync.PollResult
import com.learningtracker.companion.usage.UsageAccessHelper
import com.learningtracker.companion.util.CompanionPreferences
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.coroutineContext

internal object SafeLogger {
    fun e(tag: String, msg: String, tr: Throwable? = null) {
        try {
            if (tr != null) Log.e(tag, msg, tr) else Log.e(tag, msg)
        } catch (_: Throwable) {
            System.err.println("[$tag] ERROR: $msg")
        }
    }
    fun w(tag: String, msg: String) {
        try {
            Log.w(tag, msg)
        } catch (_: Throwable) {
            println("[$tag] WARN: $msg")
        }
    }
    fun i(tag: String, msg: String) {
        try {
            Log.i(tag, msg)
        } catch (_: Throwable) {
            println("[$tag] INFO: $msg")
        }
    }
    fun d(tag: String, msg: String) {
        try {
            Log.d(tag, msg)
        } catch (_: Throwable) {
            println("[$tag] DEBUG: $msg")
        }
    }
}

/**
 * SessionLifecycleCoordinator (Phase 1 Requirements B & C)
 *
 * Coordinates session lifecycle operations:
 * 1. Serializes start, stop, cancellation, and replacement operations using a Mutex.
 * 2. Enforces same-session idempotency (no duplicate monitoring jobs, records, or focus starts).
 * 3. Enforces safe different-session transitions:
 *    - Cancels and joins the old monitoring job.
 *    - Runs finalization of old session under NonCancellable.
 *    - If finalization fails, preserves old session state and pending telemetry, and aborts transition.
 * 4. Ensures authoritative session identity consistency across jobs, active session, and summaries.
 */
class SessionLifecycleCoordinator(
    private val scope: CoroutineScope,
    private val onStartForeground: ((FocusSessionContract) -> Unit)? = null,
    private val onUpdateNotification: ((String, String) -> Unit)? = null,
    private val onStopForeground: (() -> Unit)? = null,
    private val onStateChanged: ((MonitoringState) -> Unit)? = null,
    private val isTrackingEnabled: () -> Boolean = { true },
    private val pollIntervalMs: Long = 5000L
) {
    val mutex = Mutex()

    @Volatile
    var currentSession: FocusSessionContract? = null
        private set

    @Volatile
    var activeJob: Job? = null
        private set

    @Volatile
    var isRunning: Boolean = false
        private set

    suspend fun startOrTransitionSession(
        session: FocusSessionContract,
        syncManager: FocusIntegritySyncManager
    ): Boolean = mutex.withLock {
        // Requirement B: Same session ID repeated start is idempotent
        if (currentSession?.sessionId == session.sessionId && (activeJob?.isActive == true || isRunning)) {
            SafeLogger.d("SessionLifecycleCoordinator", "Session ${session.sessionId} is already active. Ignoring duplicate start.")
            return@withLock true
        }

        val previousSession = currentSession
        if (previousSession != null && (activeJob?.isActive == true || isRunning)) {
            // Requirement C: Different session ID transition
            SafeLogger.i("SessionLifecycleCoordinator", "Safely finalizing previous session ${previousSession.sessionId} before transitioning to ${session.sessionId}")
            val currentJob = coroutineContext[Job]
            val oldJob = activeJob
            activeJob = null
            if (oldJob != null && oldJob != currentJob && oldJob.isActive) {
                oldJob.cancelAndJoin()
            } else if (oldJob != null && oldJob.isActive) {
                oldJob.cancel()
            }

            val finalizationSuccess = withContext(NonCancellable) {
                try {
                    val now = System.currentTimeMillis()
                    syncManager.finalizeSessionCollection(previousSession, now)
                    syncManager.uploadPendingSummaries()
                    true
                } catch (e: Exception) {
                    SafeLogger.e("SessionLifecycleCoordinator", "Failed to finalize previous session ${previousSession.sessionId}: ${e.message}", e)
                    false
                }
            }

            if (!finalizationSuccess) {
                // Invariant: If finalization fails, preserve old session and pending state.
                // Do not silently proceed with a new session if doing so would discard the old session.
                val err = "Cannot transition to session ${session.sessionId}: finalization of session ${previousSession.sessionId} failed."
                FocusMonitoringService.reportStartupFailure(err)
                return@withLock false
            }
        }

        // Safe transition: Activate new session
        currentSession = session
        isRunning = true
        FocusMonitoringService.isRunning = true
        FocusMonitoringService.activeMonitoredSessionId = session.sessionId
        onStateChanged?.invoke(MonitoringState.MONITORING)
        syncManager.onFocusStarted(session)
        onStartForeground?.invoke(session)

        val job = scope.launch {
            while (isActive) {
                if (!isTrackingEnabled()) {
                    withContext(NonCancellable) {
                        finalizeAndStop(session, syncManager)
                    }
                    break
                }

                val pm = syncManager.pairingManager
                if (pm != null && (!pm.isPaired() || pm.isRevoked())) {
                    onStateChanged?.invoke(MonitoringState.DISABLED)
                    break
                }

                var shouldTerminate = false
                try {
                    val poll = syncManager.pollActiveSession()
                    when (poll) {
                        is PollResult.Active -> {
                            onStateChanged?.invoke(MonitoringState.MONITORING)
                        }
                        is PollResult.Completed -> {
                            withContext(NonCancellable) {
                                handleSessionCompleted(poll.summary, syncManager)
                            }
                            shouldTerminate = true
                        }
                        is PollResult.Cancelled -> {
                            syncManager.onFocusCancelled(session.sessionId)
                            onStateChanged?.invoke(MonitoringState.READY)
                            shouldTerminate = true
                        }
                        is PollResult.Revoked -> {
                            onStateChanged?.invoke(MonitoringState.DISABLED)
                            shouldTerminate = true
                        }
                        is PollResult.Idle -> {
                            if (syncManager.getActiveSession() != null) {
                                withContext(NonCancellable) {
                                    finalizeAndStop(session, syncManager)
                                }
                            }
                            shouldTerminate = true
                        }
                        is PollResult.Error -> {}
                    }
                } catch (e: Exception) {
                    SafeLogger.e("SessionLifecycleCoordinator", "Session monitoring poll error", e)
                }

                if (shouldTerminate) {
                    break
                }

                delay(pollIntervalMs)
            }
        }
        activeJob = job

        job.invokeOnCompletion { cause ->
            // Requirement 4: Perform final cleanup from a separate coroutine after monitoring completes naturally.
            // If cancelled externally (by stop() or transition), the caller already performs cleanup.
            if (cause == null) {
                scope.launch {
                    completeMonitoringCleanup(session)
                }
            }
        }

        return@withLock true
    }

    private suspend fun completeMonitoringCleanup(session: FocusSessionContract) = mutex.withLock {
        // If session was already replaced or stopped, don't perform duplicate cleanup
        if (currentSession?.sessionId != session.sessionId) {
            return@withLock
        }

        activeJob = null

        val wasRunning = isRunning
        currentSession = null
        isRunning = false
        FocusMonitoringService.isRunning = false
        FocusMonitoringService.activeMonitoredSessionId = null

        if (wasRunning) {
            onStopForeground?.invoke()
        }
        if (FocusMonitoringService.currentState != MonitoringState.DELIVERED &&
            FocusMonitoringService.currentState != MonitoringState.RECOVERY_REQUIRED) {
            onStateChanged?.invoke(MonitoringState.READY)
        }
    }

    suspend fun stop(syncManager: FocusIntegritySyncManager? = null) = mutex.withLock {
        val currentJob = coroutineContext[Job]
        val oldJob = activeJob
        activeJob = null
        if (oldJob != null && oldJob != currentJob && oldJob.isActive) {
            oldJob.cancelAndJoin()
        } else if (oldJob != null && oldJob.isActive) {
            oldJob.cancel()
        }

        val session = currentSession
        if (session != null && syncManager != null) {
            withContext(NonCancellable) {
                try {
                    val now = System.currentTimeMillis()
                    val summary = syncManager.finalizeSessionCollection(session, now)
                    syncManager.onFocusCancelled(session.sessionId)
                    handleSessionCompleted(summary, syncManager)
                } catch (e: Exception) {
                    SafeLogger.e("SessionLifecycleCoordinator", "Error finalizing on stop: ${e.message}", e)
                }
            }
        }

        val wasRunning = isRunning
        currentSession = null
        isRunning = false
        FocusMonitoringService.isRunning = false
        FocusMonitoringService.activeMonitoredSessionId = null

        if (wasRunning) {
            onStopForeground?.invoke()
        }
        if (FocusMonitoringService.currentState != MonitoringState.DELIVERED &&
            FocusMonitoringService.currentState != MonitoringState.RECOVERY_REQUIRED) {
            onStateChanged?.invoke(MonitoringState.READY)
        }
    }

    private suspend fun finalizeAndStop(session: FocusSessionContract, syncManager: FocusIntegritySyncManager) {
        val now = System.currentTimeMillis()
        val summary = syncManager.finalizeSessionCollection(session, now)
        syncManager.onFocusCancelled(session.sessionId)
        handleSessionCompleted(summary, syncManager)
    }

    private suspend fun handleSessionCompleted(summary: FocusSummary, syncManager: FocusIntegritySyncManager) {
        SafeLogger.d("SessionLifecycleCoordinator", "Session completed: ${summary.summaryId}")
        onStateChanged?.invoke(MonitoringState.FINALIZING)
        onUpdateNotification?.invoke("Focus Concluded", "Finalizing & uploading telemetry...")

        onStateChanged?.invoke(MonitoringState.UPLOADING)
        val uploadResult = withContext(Dispatchers.IO) {
            syncManager.uploadPendingSummaries()
        }

        if (uploadResult.uploadedCount > 0) {
            onStateChanged?.invoke(MonitoringState.DELIVERED)
        } else if (uploadResult.failedCount > 0) {
            onStateChanged?.invoke(MonitoringState.RECOVERY_REQUIRED)
        } else {
            onStateChanged?.invoke(MonitoringState.READY)
        }
    }
}

/**
 * Injectable dispatcher abstraction for service startup.
 * Production implementation delegates to Android framework context methods.
 * JVM tests can inject custom dispatchers to simulate success or system exceptions.
 */
fun interface ServiceDispatcher {
    fun startService(context: Context, session: FocusSessionContract): ComponentName?
}

internal object AndroidFrameworkServiceDispatcher : ServiceDispatcher {
    override fun startService(context: Context, session: FocusSessionContract): ComponentName? {
        val intent = FocusMonitoringService.createServiceIntent(context, session)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }
}

/**
 * FocusMonitoringService (Phase 1: Session Lifecycle & Idle Decoupling)
 *
 * Session-scoped Android Foreground Service for observing active focus sessions.
 *
 * Core Phase 1 Invariants:
 * - IDLE: Zero foreground services running. No continuous HTTP polling. No ongoing notification.
 * - SESSION_STARTING: Starts strictly when an active focus session is initiated and prerequisites pass.
 * - ACTIVE_SESSION: Runs with FOREGROUND_SERVICE_TYPE_DATA_SYNC, streaming telemetry and observing usage.
 * - SESSION_FINALIZING: When focus session concludes, persists local summary, attempts upload, and
 *   immediately calls stopForeground(STOP_FOREGROUND_REMOVE) and stopSelf(). DOES NOT loop into idle polling.
 * - RECOVERY: Process death or reboot leaves service idle; orphaned sessions reconciled as PARTIAL.
 */
class FocusMonitoringService : Service() {

    companion object {
        const val CHANNEL_ID = "focus_monitoring_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START = "com.learningtracker.companion.action.START_MONITORING"
        const val ACTION_STOP = "com.learningtracker.companion.action.STOP_MONITORING"

        const val EXTRA_SESSION_ID = "com.learningtracker.companion.extra.SESSION_ID"
        const val EXTRA_TASK_NAME = "com.learningtracker.companion.extra.TASK_NAME"
        const val EXTRA_STARTED_AT = "com.learningtracker.companion.extra.STARTED_AT"
        const val EXTRA_DURATION_SECONDS = "com.learningtracker.companion.extra.DURATION_SECONDS"

        // Adaptive polling intervals
        const val POLL_INTERVAL_ACTIVE_MS = 5000L       // 5s during active focus for fast end-detection
        const val POLL_INTERVAL_IDLE_MS = 12000L        // Retained for backwards compatibility constants
        const val POLL_INTERVAL_BACKOFF_MAX_MS = 30000L // 30s max backoff on transient errors

        internal val SafeLogger = com.learningtracker.companion.service.SafeLogger

        @Volatile
        internal var serviceDispatcher: ServiceDispatcher = AndroidFrameworkServiceDispatcher

        @Volatile
        var isRunning: Boolean = false
            internal set

        @Volatile
        var currentState: MonitoringState = MonitoringState.READY
            internal set

        @Volatile
        var lastStartupError: String? = null
            internal set

        private val _monitoringStateFlow = MutableStateFlow(MonitoringState.READY)
        val monitoringStateFlow: StateFlow<MonitoringState> = _monitoringStateFlow.asStateFlow()

        private val _startupErrorFlow = MutableStateFlow<String?>(null)
        val startupErrorFlow: StateFlow<String?> = _startupErrorFlow.asStateFlow()

        /**
         * Validates all required prerequisites before launching the session-scoped foreground service.
         */
        fun validatePrerequisites(context: Context): Boolean {
            val prefs = CompanionPreferences(context)
            if (!prefs.isAutomaticTrackingEnabled) {
                val err = "Tracking is disabled in companion preferences."
                SafeLogger.w("FocusMonitoringService", err)
                lastStartupError = err
                _startupErrorFlow.value = err
                return false
            }

            val pairingManager = FocusIntegrityApplication.getPairingManager(context)
            if (!pairingManager.isPaired() || pairingManager.isRevoked()) {
                val err = "Device is not paired or pairing token is revoked."
                SafeLogger.w("FocusMonitoringService", err)
                lastStartupError = err
                _startupErrorFlow.value = err
                return false
            }

            if (!UsageAccessHelper.hasUsageAccess(context)) {
                val err = "Usage access permission (PACKAGE_USAGE_STATS) is not granted."
                SafeLogger.w("FocusMonitoringService", err)
                lastStartupError = err
                _startupErrorFlow.value = err
                return false
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    val err = "Notification permission (POST_NOTIFICATIONS) is not granted."
                    SafeLogger.w("FocusMonitoringService", err)
                    lastStartupError = err
                    _startupErrorFlow.value = err
                    return false
                }
            }

            lastStartupError = null
            _startupErrorFlow.value = null
            return true
        }

        /**
         * Builds the framework Service Intent for an active focus session.
         */
        fun createServiceIntent(context: Context, session: FocusSessionContract): Intent {
            return Intent(context, FocusMonitoringService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_SESSION_ID, session.sessionId)
                putExtra(EXTRA_TASK_NAME, session.taskName)
                putExtra(EXTRA_STARTED_AT, session.startedAt)
                putExtra(EXTRA_DURATION_SECONDS, session.intendedDurationSeconds)
            }
        }

        /**
         * Starts monitoring for an explicit active focus session.
         * Returns true if startup was dispatched, false if prerequisites or launch failed.
         */
        fun startForSession(
            context: Context,
            session: FocusSessionContract,
            dispatcher: ServiceDispatcher = serviceDispatcher
        ): Boolean {
            if (!validatePrerequisites(context)) {
                return false
            }

            return try {
                dispatcher.startService(context, session)
                lastStartupError = null
                _startupErrorFlow.value = null
                true
            } catch (e: Throwable) {
                val err = "Service startup failed: ${e.javaClass.simpleName} - ${e.message}"
                SafeLogger.e("FocusMonitoringService", err, e)
                lastStartupError = err
                _startupErrorFlow.value = err
                false
            }
        }

        /**
         * Legacy / standard entry point: Checks for an active session.
         * If IDLE (no active session), DOES NOT start the foreground service.
         */
        fun start(context: Context): Boolean {
            val syncManager = FocusIntegrityApplication.getSyncManager(context)
            val activeSession = syncManager.getActiveSession()
            return if (activeSession != null) {
                startForSession(context, activeSession)
            } else {
                val err = "Cannot start FocusMonitoringService: No active session found (device is IDLE)."
                SafeLogger.w("FocusMonitoringService", err)
                lastStartupError = err
                _startupErrorFlow.value = err
                false
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, FocusMonitoringService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.startService(intent)
            } catch (e: Throwable) {
                SafeLogger.e("FocusMonitoringService", "Failed to stop FocusMonitoringService", e)
            }
        }

        @Volatile
        var activeMonitoredSessionId: String? = null
            internal set

        fun reportStartupFailure(error: String) {
            SafeLogger.e("FocusMonitoringService", error)
            lastStartupError = error
            _startupErrorFlow.value = error
        }

        internal fun resetStateForTesting() {
            isRunning = false
            currentState = MonitoringState.READY
            _monitoringStateFlow.value = MonitoringState.READY
            lastStartupError = null
            _startupErrorFlow.value = null
            activeMonitoredSessionId = null
            serviceDispatcher = AndroidFrameworkServiceDispatcher
        }
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private lateinit var preferences: CompanionPreferences

    val coordinator by lazy {
        SessionLifecycleCoordinator(
            scope = serviceScope,
            onStartForeground = { session ->
                val taskTitle = session.taskName?.takeIf { it.isNotBlank() } ?: "Focus Session"
                startInForeground("Focus Active: $taskTitle", "Observing focus integrity in background")
            },
            onUpdateNotification = { title, text ->
                updateNotification(title, text)
            },
            onStopForeground = {
                dischargeForegroundRequirementAndStop()
            },
            onStateChanged = { state ->
                updateState(state)
            },
            isTrackingEnabled = { preferences.isAutomaticTrackingEnabled }
        )
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        preferences = CompanionPreferences(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            handleActionStop()
            return START_NOT_STICKY
        }

        val syncManager = FocusIntegrityApplication.getSyncManager(this)

        if (!validatePrerequisites(this)) {
            stopMonitoring()
            return START_NOT_STICKY
        }

        val activeSession = extractSessionFromIntent(intent) ?: syncManager.getActiveSession()
        if (activeSession == null) {
            dischargeForegroundRequirementAndStop()
            return START_NOT_STICKY
        }

        serviceScope.launch {
            coordinator.startOrTransitionSession(activeSession, syncManager)
        }
        return START_NOT_STICKY
    }

    private fun extractSessionFromIntent(intent: Intent?): FocusSessionContract? {
        val sessionId = intent?.getStringExtra(EXTRA_SESSION_ID) ?: return null
        val taskName = intent.getStringExtra(EXTRA_TASK_NAME)
        val startedAt = intent.getLongExtra(EXTRA_STARTED_AT, System.currentTimeMillis())
        val durationSeconds = intent.getLongExtra(EXTRA_DURATION_SECONDS, 1500L)
        return FocusSessionContract(
            sessionId = sessionId,
            startedAt = startedAt,
            intendedDurationSeconds = durationSeconds,
            taskName = taskName,
            state = "RUNNING"
        )
    }

    private fun updateState(newState: MonitoringState) {
        currentState = newState
        _monitoringStateFlow.value = newState
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val name = "Focus Session Tracking"
                val descriptionText = "Monitors and syncs active web focus sessions."
                val importance = NotificationManager.IMPORTANCE_LOW
                val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                    description = descriptionText
                    setShowBadge(false)
                }
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.createNotificationChannel(channel)
            } catch (e: Throwable) {
                SafeLogger.w("FocusMonitoringService", "Failed to create notification channel: ${e.message}")
            }
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, FocusMonitoringService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Tracking", stopPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun startInForeground(title: String, text: String) {
        try {
            val notification = buildNotification(title, text)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Throwable) {
            SafeLogger.w("FocusMonitoringService", "startForeground ignored or unmocked: ${e.message}")
        }
    }

    private fun updateNotification(title: String, text: String) {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, buildNotification(title, text))
        } catch (e: Throwable) {
            SafeLogger.w("FocusMonitoringService", "updateNotification ignored or unmocked: ${e.message}")
        }
    }

    private fun dischargeForegroundRequirementAndStop() {
        try {
            startInForeground("Learning Tracker Companion", "Idle")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(NOTIFICATION_ID)
        } catch (_: Throwable) {}
        try {
            stopSelf()
        } catch (_: Throwable) {}
        isRunning = false
        activeMonitoredSessionId = null
        updateState(MonitoringState.READY)
    }

    private fun handleActionStop() {
        val syncManager = FocusIntegrityApplication.getSyncManager(this)
        serviceScope.launch {
            coordinator.stop(syncManager)
        }
    }

    private fun stopMonitoring() {
        serviceScope.launch {
            coordinator.stop(null)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopMonitoring()
        serviceJob.cancel()
    }
}
