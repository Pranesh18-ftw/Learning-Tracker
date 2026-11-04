package com.learningtracker.companion.data.migration

import android.content.Context
import com.learningtracker.companion.data.DatabaseAccessGate
import com.learningtracker.companion.data.RoomTelemetryStorage
import com.learningtracker.companion.data.entity.toContract
import com.learningtracker.companion.data.entity.toEntity
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import kotlinx.coroutines.sync.Mutex
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.concurrent.atomic.AtomicReference

/**
 * Coordinates storage routing between legacy SharedPreferences and Room.
 * Enforces double-checked routing inside legacyBarrier.withWriterLock.
 * Delegates Room storage operations directly to RoomTelemetryStorage (M2.3).
 */
class LegacyStorageCoordinator(
    private val context: Context,
    private val gate: DatabaseAccessGate,
    private val legacyBarrier: LegacyStorageBarrier,
    val roomStorage: RoomTelemetryStorage = RoomTelemetryStorage(gate)
) {
    val currentRoute = AtomicReference<StorageRoutingMode>(StorageRoutingMode.LEGACY_SHARED_PREFERENCES)
    val migrationMutex = Mutex() // Application-scoped singleton mutex
    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Startup initialization: determines route from authoritative Room migration metadata.
     * Both COMPLETED and PARTIAL_QUARANTINED states restore ROOM_PRIMARY routing mode.
     */
    suspend fun initializeRoutingMode(): StorageRoutingMode = gate.withAccess { db ->
        val metadata = db.telemetryOutboxDao().getMigrationMetadata("shared_prefs_v1_to_v2")
        val route = if (metadata?.status == "COMPLETED" || metadata?.status == "PARTIAL_QUARANTINED") {
            StorageRoutingMode.ROOM_PRIMARY
        } else {
            StorageRoutingMode.LEGACY_SHARED_PREFERENCES
        }
        currentRoute.set(route)
        route
    }

    suspend fun recordTelemetry(key: String, rawValue: Any?) {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    writeToLegacyPrefs("learningtracker_telemetry", key, rawValue)
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    if (rawValue is String) {
                        try {
                            val summary = json.decodeFromString<FocusSummary>(rawValue)
                            roomStorage.saveSummary(summary)
                        } catch (_: Exception) {}
                    }
                }
            }
        }
    }

    suspend fun recordSummary(summary: FocusSummary, createdAt: Long? = null) {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    writeLegacySummary(summary, createdAt)
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    roomStorage.saveSummary(summary, createdAt)
                }
            }
        }
    }

    suspend fun updateSyncState(summaryId: String, nextState: String, lastError: String? = null) {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    updateLegacySyncState(summaryId, nextState, lastError)
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    roomStorage.updateSyncState(summaryId, nextState, lastError)
                }
            }
        }
    }

    suspend fun deleteSummary(summaryId: String) {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    deleteLegacySummary(summaryId)
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    roomStorage.deleteSummary(summaryId)
                }
            }
        }
    }

    suspend fun clearAllSummaries() {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE).edit().clear().commit()
                    context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE).edit().clear().commit()
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    roomStorage.clearAllSummaries()
                }
            }
        }
    }

    suspend fun recordActiveSession(contract: FocusSessionContract?) {
        legacyBarrier.withWriterLock {
            // Recheck route INSIDE the lock
            when (currentRoute.get()) {
                StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                StorageRoutingMode.MIGRATION_FAILED,
                StorageRoutingMode.MIGRATING_HOLD -> {
                    val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
                    if (contract == null) {
                        activePrefs.edit().remove("active_session_json").commit()
                    } else {
                        val raw = json.encodeToString(contract)
                        activePrefs.edit().putString("active_session_json", raw).commit()
                    }
                }
                StorageRoutingMode.ROOM_PRIMARY -> {
                    gate.withAccess { db ->
                        if (contract != null) {
                            db.telemetryOutboxDao().insertSessionIfMissing(contract.toEntity(state = "RUNNING"))
                        } else {
                            db.telemetryOutboxDao().cancelRunningSessions(System.currentTimeMillis())
                        }
                    }
                }
            }
        }
    }

    suspend fun recordActiveSession(contractJson: String) {
        val contract = try {
            json.decodeFromString<FocusSessionContract>(contractJson)
        } catch (_: Exception) {
            null
        }
        if (contract != null) {
            recordActiveSession(contract)
        } else {
            legacyBarrier.withWriterLock {
                when (currentRoute.get()) {
                    StorageRoutingMode.LEGACY_SHARED_PREFERENCES,
                    StorageRoutingMode.MIGRATION_FAILED,
                    StorageRoutingMode.MIGRATING_HOLD -> {
                        writeToLegacyPrefs("learningtracker_active_session", "active_session_json", contractJson)
                    }
                    StorageRoutingMode.ROOM_PRIMARY -> {
                        routeActiveSessionDirectlyToRoom(contractJson)
                    }
                }
            }
        }
    }

    suspend fun getSummary(summaryId: String): FocusSummary? {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                roomStorage.getSummary(summaryId)
            }
            else -> {
                val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
                val raw = prefs.getString(summaryId, null) ?: return null
                try {
                    json.decodeFromString<FocusSummary>(raw)
                } catch (_: Exception) {
                    null
                }
            }
        }
    }

    suspend fun getAllSummaries(): List<FocusSummary> {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                roomStorage.getAllSummaries()
            }
            else -> {
                val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
                val list = mutableListOf<FocusSummary>()
                for ((_, value) in prefs.all) {
                    val raw = value as? String ?: continue
                    try {
                        list.add(json.decodeFromString(raw))
                    } catch (_: Exception) {}
                }
                list.sortedByDescending { it.timestamp }
            }
        }
    }

    suspend fun getPendingSummaries(): List<FocusSummary> {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                roomStorage.getPendingSummaries()
            }
            else -> {
                getAllSummaries().filter { it.syncState == "PENDING" || it.syncState == "RETRY" }
            }
        }
    }

    suspend fun getAttempts(summaryId: String): Int {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                roomStorage.getAttempts(summaryId)
            }
            else -> {
                val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
                metaPrefs.getInt("${summaryId}_attempts", 0)
            }
        }
    }

    suspend fun getLastError(summaryId: String): String? {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                roomStorage.getLastError(summaryId)
            }
            else -> {
                val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
                metaPrefs.getString("${summaryId}_last_error", null)
            }
        }
    }

    suspend fun getActiveSession(): FocusSessionContract? {
        return when (currentRoute.get()) {
            StorageRoutingMode.ROOM_PRIMARY -> {
                gate.withAccess { db ->
                    db.telemetryOutboxDao().getRunningSession()?.toContract()
                }
            }
            else -> {
                val activePrefs = context.getSharedPreferences("learningtracker_active_session", Context.MODE_PRIVATE)
                val raw = activePrefs.getString("active_session_json", null) ?: return null
                try {
                    json.decodeFromString<FocusSessionContract>(raw)
                } catch (_: Exception) {
                    null
                }
            }
        }
    }

    private fun writeLegacySummary(summary: FocusSummary, createdAt: Long?) {
        val serialized = json.encodeToString(summary)
        writeToLegacyPrefs("learningtracker_telemetry", summary.summaryId, serialized)
        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
        if (!metaPrefs.contains("${summary.summaryId}_attempts")) {
            metaPrefs.edit()
                .putInt("${summary.summaryId}_attempts", 0)
                .putLong("${summary.summaryId}_created_at", createdAt ?: System.currentTimeMillis())
                .commit()
        }
    }

    private fun updateLegacySyncState(summaryId: String, nextState: String, lastError: String?) {
        val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val raw = prefs.getString(summaryId, null)
        if (raw != null) {
            try {
                val current = json.decodeFromString<FocusSummary>(raw)
                val updated = current.copy(syncState = nextState)
                prefs.edit().putString(summaryId, json.encodeToString(updated)).commit()
            } catch (_: Exception) {}
        }

        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
        val attempts = metaPrefs.getInt("${summaryId}_attempts", 0)
        val editor = metaPrefs.edit()
            .putInt("${summaryId}_attempts", attempts + 1)
            .putLong("${summaryId}_last_attempt", System.currentTimeMillis())
        if (lastError != null) {
            editor.putString("${summaryId}_last_error", lastError)
        }
        editor.commit()
    }

    private fun deleteLegacySummary(summaryId: String) {
        val prefs = context.getSharedPreferences("learningtracker_telemetry", Context.MODE_PRIVATE)
        val metaPrefs = context.getSharedPreferences("learningtracker_telemetry_meta", Context.MODE_PRIVATE)
        prefs.edit().remove(summaryId).commit()
        metaPrefs.edit()
            .remove("${summaryId}_attempts")
            .remove("${summaryId}_last_attempt")
            .remove("${summaryId}_created_at")
            .remove("${summaryId}_last_error")
            .commit()
    }

    private fun writeToLegacyPrefs(prefFile: String, key: String, value: Any?) {
        val prefs = context.getSharedPreferences(prefFile, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        when (value) {
            is String -> editor.putString(key, value)
            is Int -> editor.putInt(key, value)
            is Long -> editor.putLong(key, value)
            is Boolean -> editor.putBoolean(key, value)
            is Float -> editor.putFloat(key, value)
            null -> editor.remove(key)
            else -> editor.putString(key, value.toString())
        }
        editor.commit()
    }

    private suspend fun routeActiveSessionDirectlyToRoom(contractJson: String) {
        gate.withAccess { db ->
            val contract = json.decodeFromString<FocusSessionContract>(contractJson)
            db.telemetryOutboxDao().insertSessionIfMissing(contract.toEntity(state = "RUNNING"))
        }
    }
}
