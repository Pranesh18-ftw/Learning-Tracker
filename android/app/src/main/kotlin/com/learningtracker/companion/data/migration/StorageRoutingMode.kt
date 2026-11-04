package com.learningtracker.companion.data.migration

enum class StorageRoutingMode {
    LEGACY_SHARED_PREFERENCES, // Default prior to migration
    MIGRATING_HOLD,            // Migration active; writers suspend on barrier
    ROOM_PRIMARY,              // All writes commit directly to Room
    MIGRATION_FAILED           // Reverted on SQLite failure; writers stay in legacy
}
