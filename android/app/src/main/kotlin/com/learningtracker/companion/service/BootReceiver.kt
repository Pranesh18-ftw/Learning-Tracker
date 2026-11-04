package com.learningtracker.companion.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.learningtracker.companion.FocusIntegrityApplication
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.sync.FocusIntegritySyncManager

/**
 * BootReceiver (Phase 1: Session Lifecycle & Idle Decoupling)
 *
 * Handles device reboot:
 * - NEVER starts continuous 24/7 foreground service on reboot.
 * - Detects unfinished / orphaned focus sessions interrupted by device power-off.
 * - Reconciles any unfinished session with honest PARTIAL collection status.
 * - Missing intervals (such as device downtime) are NEVER classified as focused time.
 * - Leaves the device in a clean IDLE state with zero foreground services running.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            handleBootRecovery(context)
        }
    }

    companion object {
        fun handleBootRecovery(context: Context) {
            val syncManager = FocusIntegrityApplication.getSyncManager(context)
            handleBootRecovery(syncManager)
            try {
                com.learningtracker.companion.work.OutboxRetryScheduler(context).scheduleNextAsync()
            } catch (e: Exception) {
                android.util.Log.e("BootReceiver", "Failed to restore outbox retry schedule on boot", e)
            }
        }

        fun handleBootRecovery(syncManager: FocusIntegritySyncManager) {
            val orphanedSession = syncManager.getActiveSession()
            if (orphanedSession != null) {
                val now = System.currentTimeMillis()
                val intendedEnd = orphanedSession.startedAt + (orphanedSession.intendedDurationSeconds * 1000L)
                val sessionEnd = minOf(intendedEnd, now)

                // Finalize session with PARTIAL status; reboot window is not focused time
                syncManager.finalizeOrphanedSession(orphanedSession, sessionEnd, CollectionStatus.PARTIAL)
            }
            // CRITICAL INVARIANT:
            // FocusMonitoringService.start(context) is NEVER called here.
            // Continuous monitoring is NOT restarted on reboot.
        }
    }
}
