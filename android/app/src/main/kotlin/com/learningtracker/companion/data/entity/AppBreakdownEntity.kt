package com.learningtracker.companion.data.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "app_breakdown",
    foreignKeys = [
        ForeignKey(
            entity = TelemetrySummaryEntity::class,
            parentColumns = ["summaryId"],
            childColumns = ["summaryId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["summaryId"], name = "idx_breakdown_summary")]
)
data class AppBreakdownEntity(
    @PrimaryKey
    val id: String, // "<summaryId>_<packageName>"
    val summaryId: String,
    val packageName: String,
    val category: String, // "reference", "distraction", "neutral", "unknown"
    val durationSeconds: Long
)
