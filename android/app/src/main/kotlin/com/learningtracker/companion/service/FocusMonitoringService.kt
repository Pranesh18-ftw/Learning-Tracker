package com.learningtracker.companion.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.learningtracker.companion.FocusIntegrityApplication
import com.learningtracker.companion.MainActivity
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import com.learningtracker.companion.sync.PollResult
import kotlinx.coroutines.*

/**
 * FocusMonitoringService
 *
 * Android Foreground Service enabling seamless, automatic focus-session detection,
 * real-time usage observation, and automatic telemetry upload while the device
 * is in the background or locked.
 *
 * User Experience:
 * - Pair once
 * - Start focus on website
 * - Phone detects session automatically in background
 * - Normal phone usage collected honestly via UsageEventsCollector
 * - Finish focus on website -> Android finalizes and uploads telemetry automatically
 * - Website reflection updates automatically
 */
class FocusMonitoringService : Service() {

    companion object {
        const val CHANNEL_ID = "focus_monitoring_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START = "com.learningtracker.companion.action.START_MONITORING"
        const val ACTION_STOP = "com.learningtracker.companion.action.STOP_MONITORING"

        @Volatile
        var isRunning: Boolean = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, FocusMonitoringService::class.java).apply {
                action = ACTION_START
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                // Ignore if background start is restricted
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, FocusMonitoringService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.startService(intent)
            } catch (_: Exception) {}
        }
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private var monitoringJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startInForeground("Learning Tracker Companion", "Ready for web focus session")
        isRunning = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopMonitoring()
            return START_NOT_STICKY
        }

        startMonitoringLoop()
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Focus Session Tracking"
            val descriptionText = "Monitors and syncs active web focus sessions automatically."
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
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

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun startInForeground(title: String, text: String) {
        val notification = buildNotification(title, text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification(title: String, text: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification(title, text))
    }

    private fun startMonitoringLoop() {
        if (monitoringJob?.isActive == true) return

        val app = application as? FocusIntegrityApplication
        val syncManager = app?.syncManager ?: FocusIntegritySyncManager(this)
        val pairingManager = app?.pairingManager ?: syncManager.pairingManager

        monitoringJob = serviceScope.launch {
            while (isActive) {
                if (!pairingManager.isPaired() || pairingManager.isRevoked()) {
                    stopMonitoring()
                    break
                }

                try {
                    val poll = syncManager.pollActiveSession()
                    when (poll) {
                        is PollResult.Active -> {
                            val taskTitle = poll.session.taskName?.takeIf { it.isNotBlank() } ?: "Focus Session"
                            updateNotification("Focus Session Active: $taskTitle", "Observing attention integrity")
                        }
                        is PollResult.Completed -> {
                            updateNotification("Focus Session Concluded", "Telemetry uploaded automatically")
                            syncManager.uploadPendingSummaries()
                        }
                        is PollResult.Cancelled -> {
                            updateNotification("Learning Tracker Companion", "Ready for web focus session")
                        }
                        is PollResult.Revoked -> {
                            stopMonitoring()
                            break
                        }
                        is PollResult.Idle -> {
                            if (syncManager.getActiveSession() == null) {
                                updateNotification("Learning Tracker Companion", "Ready for web focus session")
                            }
                        }
                        is PollResult.Error -> {
                            // Transient error, keep notification steady
                        }
                    }

                    // Retry any pending summaries that failed due to transient network errors
                    if (syncManager.storage.getPendingSummaries().isNotEmpty()) {
                        syncManager.uploadPendingSummaries()
                    }
                } catch (_: Exception) {
                    // Resilient: keep background loop alive across network drops
                }

                delay(10000L) // Poll every 10 seconds
            }
        }
    }

    private fun stopMonitoring() {
        monitoringJob?.cancel()
        monitoringJob = null
        isRunning = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopMonitoring()
        serviceJob.cancel()
    }
}
