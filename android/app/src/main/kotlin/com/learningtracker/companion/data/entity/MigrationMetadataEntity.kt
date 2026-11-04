package com.learningtracker.companion.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "migration_metadata")
data class MigrationMetadataEntity(
    @PrimaryKey
    val migrationKey: String, // "shared_prefs_v1_to_v2"
    val status: String, // "COMPLETED", "PARTIAL_QUARANTINED"
    val totalExpected: Int,
    val validMigrated: Int,
    val quarantinedCount: Int,
    val remediatedCount: Int = 0,
    val completedAt: Long
)
