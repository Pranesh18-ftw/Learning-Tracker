package com.learningtracker.companion.model

import kotlinx.serialization.Serializable

/**
 * Explicit connection and lifecycle states for Focus Integrity (Prompt #7 & #16).
 * Never pretend the phone is connected or monitoring when it isn't.
 */
@Serializable
enum class CompanionState {
    NOT_PAIRED,
    PAIRING,
    PAIRED,
    PERMISSION_REQUIRED,
    MONITORING_DISABLED,
    MONITORING_ACTIVE,
    NO_ACTIVE_SESSION,
    ACTIVE_SESSION,
    COLLECTION_PENDING,
    UPLOAD_PENDING,
    CONNECTED,
    DISCONNECTED,
    REVOKED,
    ERROR,

    // Aliases / compatibility states
    NOT_CONNECTED,
    CONNECTED_BUT_USAGE_ACCESS_MISSING,
    READY,
    SESSION_ACTIVE,
    SESSION_COMPLETE,
    SYNC_PENDING,
    SYNCED
}

/**
 * App usage classification (Prompt #13 & #14).
 * Phone usage != distraction: distinguishes reference tools from distractions.
 * Unknown apps are strictly kept UNKNOWN (never silently labeled distraction).
 */
@Serializable
enum class AppCategory(val value: String) {
    REFERENCE("reference"),
    NEUTRAL("neutral"),
    DISTRACTION("distraction"),
    UNKNOWN("unknown");

    companion object {
        fun fromString(type: String?): AppCategory {
            return entries.find { it.value.equals(type, ignoreCase = true) } ?: UNKNOWN
        }
    }
}
