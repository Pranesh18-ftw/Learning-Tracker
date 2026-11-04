package com.learningtracker.companion.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "focus_sessions")
data class FocusSessionEntity(
    @PrimaryKey
    val sessionId: String,
    val startedAt: Long,
    val intendedDurationSeconds: Long,
    val endedAt: Long? = null,
    val taskName: String? = null,
    val subjectName: String? = null,
    val state: String = "RUNNING", // "RUNNING", "FINALIZED", "CANCELLED", "SUPERSEDED"
    val boundaryConfidence: String = "AUTHORITATIVE", // "AUTHORITATIVE", "ESTIMATED", "UNAVAILABLE"
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
