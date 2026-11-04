package com.learningtracker.companion.data.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "telemetry_summaries",
    foreignKeys = [
        ForeignKey(
            entity = FocusSessionEntity::class,
            parentColumns = ["sessionId"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [
        Index(value = ["syncState", "createdAt"], name = "idx_summaries_sync_state"),
        Index(value = ["sessionId"], name = "idx_summaries_session_id"),
        Index(value = ["claimToken"], name = "idx_summaries_claim_token"),
        Index(value = ["syncState", "nextAttemptAt"], name = "idx_summaries_next_attempt")
    ]
)
data class TelemetrySummaryEntity(
    @PrimaryKey
    val summaryId: String, // "sum_<sessionId>"
    val sessionId: String,
    val intendedSeconds: Long,
    val observedWindowSeconds: Long,
    val interruptionCount: Int,
    val interruptionSeconds: Long,
    val referenceSeconds: Long,
    val distractionSeconds: Long,
    val unknownSeconds: Long,
    val longestUninterruptedSeconds: Long,
    val collectionStatus: String, // "COMPLETE", "PARTIAL", "NO_OBSERVATIONS"
    val boundaryConfidence: String, // "AUTHORITATIVE", "ESTIMATED"
    val syncState: String = "PENDING", // "PENDING", "IN_FLIGHT", "DELIVERED", "RETRY", "PERMANENT_ERROR", "CONFLICT"
    val attempts: Int = 0,
    val claimToken: String? = null, // UUID of active leaseholder
    val claimGeneration: Long = 0L, // Monotonically increasing counter
    val leaseExpiresAt: Long? = null, // Epoch ms when lease expires
    val nextAttemptAt: Long? = null, // Epoch ms before which worker cannot attempt upload
    val lastAttemptAt: Long? = null,
    val lastError: String? = null,
    val deliveredAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
