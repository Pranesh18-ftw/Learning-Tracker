package com.learningtracker.companion.data.entity

import androidx.room.Entity

@Entity(
    tableName = "legacy_migration_ledger",
    primaryKeys = ["sourceKey", "sourcePreferenceFile"]
)
data class LegacyMigrationLedgerEntity(
    val sourceKey: String,
    val sourcePreferenceFile: String,
    val contentFingerprint: String,
    val outcome: String, // "MIGRATED_VALID", "QUARANTINED", "REMEDIATED"
    val destinationSummaryId: String? = null,
    val errorMessage: String? = null,
    val migratedAt: Long = System.currentTimeMillis(),
    val remediatedAt: Long? = null
)
