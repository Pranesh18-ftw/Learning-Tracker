package com.learningtracker.companion.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import com.learningtracker.companion.tracker.RawTelemetryEvent

/**
 * UsageAccessHelper (Stage 2B Part 5)
 *
 * Verifies whether user has explicitly granted Usage Access,
 * and builds the intent targeting Android's Usage Access Settings.
 */
object UsageAccessHelper {

    fun hasUsageAccess(context: Context): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            false
        }
    }

    fun createUsageAccessIntent(): Intent {
        return Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }
}

/**
 * UsageEventsCollector (Stage 2B Part 6 & 8)
 *
 * Queries discrete UsageEvents strictly for the completed session window [sessionStart, sessionEnd].
 * Never runs continuous background sensors or collects private data.
 */
class UsageEventsCollector(private val context: Context) {

    fun querySessionWindow(sessionStart: Long, sessionEnd: Long): List<RawTelemetryEvent> {
        if (!UsageAccessHelper.hasUsageAccess(context)) {
            return emptyList()
        }

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return emptyList()

        return try {
            val rawEvents = mutableListOf<RawTelemetryEvent>()
            val usageEvents: UsageEvents? = usageStatsManager.queryEvents(sessionStart, sessionEnd)
            if (usageEvents == null) return emptyList()

            val event = UsageEvents.Event()

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)

                // Extract relevant activity and screen events (compatible with API 26+ MOVE_TO_FOREGROUND / BACKGROUND)
                when (event.eventType) {
                    RawTelemetryEvent.ACTIVITY_RESUMED,
                    RawTelemetryEvent.ACTIVITY_PAUSED,
                    RawTelemetryEvent.SCREEN_INTERACTIVE,
                    RawTelemetryEvent.SCREEN_NON_INTERACTIVE,
                    RawTelemetryEvent.KEYGUARD_SHOWN,
                    RawTelemetryEvent.KEYGUARD_HIDDEN -> {
                        rawEvents.add(
                            RawTelemetryEvent(
                                eventType = event.eventType,
                                packageName = event.packageName,
                                timestamp = event.timeStamp
                            )
                        )
                    }
                }
            }

            rawEvents
        } catch (e: Exception) {
            emptyList()
        }
    }
}
