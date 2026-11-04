package com.learningtracker.companion.data.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "timeline_intervals",
    foreignKeys = [
        ForeignKey(
            entity = TelemetrySummaryEntity::class,
            parentColumns = ["summaryId"],
            childColumns = ["summaryId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["summaryId", "orderIndex"], name = "idx_intervals_summary_order")]
)
data class TimelineIntervalEntity(
    @PrimaryKey
    val id: String, // "<summaryId>_<orderIndex>"
    val summaryId: String,
    val sessionId: String,
    val startTime: Long,
    val endTime: Long,
    val durationSeconds: Long,
    val classification: String, // "FOCUSED", "DISTRACTION", "PAUSED", "UNOBSERVED"
    val packageName: String? = null,
    val appCategory: String? = null,
    val note: String? = null,
    val orderIndex: Int
)
