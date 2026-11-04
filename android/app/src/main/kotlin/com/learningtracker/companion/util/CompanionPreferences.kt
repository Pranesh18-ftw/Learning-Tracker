package com.learningtracker.companion.util

import android.content.Context
import android.content.SharedPreferences

/**
 * CompanionPreferences
 *
 * Persistent configuration for automatic focus tracking and background monitoring.
 */
class CompanionPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("learningtracker_companion_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_AUTOMATIC_TRACKING_ENABLED = "automatic_tracking_enabled"
        private const val KEY_LAST_SYNC_TIME = "last_sync_time"
        private const val KEY_BATTERY_DIALOG_DISMISSED = "battery_dialog_dismissed"
    }

    /**
     * Whether automatic background focus tracking is enabled.
     * Default is true once device is paired.
     */
    var isAutomaticTrackingEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTOMATIC_TRACKING_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTOMATIC_TRACKING_ENABLED, value).apply()

    /**
     * Timestamp of last successful telemetry synchronization / server ingestion.
     */
    var lastSyncTime: Long
        get() = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_SYNC_TIME, value).apply()

    /**
     * Whether the user has dismissed the battery optimization banner.
     */
    var isBatteryDialogDismissed: Boolean
        get() = prefs.getBoolean(KEY_BATTERY_DIALOG_DISMISSED, false)
        set(value) = prefs.edit().putBoolean(KEY_BATTERY_DIALOG_DISMISSED, value).apply()

    /**
     * Whether legacy SharedPreferences data has been migrated into Room.
     * Note: Room migration metadata remains the authoritative source of truth.
     */
    var isRoomMigrationComplete: Boolean
        get() = prefs.getBoolean("room_migration_complete", false)
        set(value) = prefs.edit().putBoolean("room_migration_complete", value).apply()
}
