package com.learningtracker.companion.model

import kotlinx.serialization.Serializable

/**
 * Collection status taxonomy (Stage 2B Part 6).
 * Distinguishes trustworthy collection completeness without fabricating zero interruptions.
 */
@Serializable
enum class CollectionStatus {
    COMPLETE,
    PARTIAL,
    NO_OBSERVATIONS,
    PERMISSION_REQUIRED,
    UNAVAILABLE,
    COLLECTION_FAILED
}

/**
 * Reconstructed continuous period where a specific app was foreground (Prompt #11).
 */
@Serializable
data class ForegroundInterval(
    val packageName: String,
    val startTime: Long,
    val endTime: Long
) {
    val durationMs: Long get() = (endTime - startTime).coerceAtLeast(0L)
    val durationSeconds: Long get() = durationMs / 1000L
}

/**
 * Normalized interruption segment produced by InterruptionClassifier (Prompt #12).
 */
@Serializable
data class Interruption(
    val startTime: Long,
    val endTime: Long,
    val durationSeconds: Long,
    val packageName: String? = null,
    val category: AppCategory = AppCategory.UNKNOWN
)

/**
 * Summarized application usage item matching backend v1.0.0 schema.
 */
@Serializable
data class AppBreakdownSummary(
    val packageName: String,
    val category: AppCategory,
    val durationSeconds: Long
)

/**
 * Canonical Focus Session contract from the Web application (Prompt #4).
 * Single authoritative source of session identity.
 */
@Serializable
data class FocusSessionContract(
    val sessionId: String,
    val startedAt: Long,
    val intendedDurationSeconds: Long,
    val taskName: String? = null,
    val subjectName: String? = null,
    val state: String = "RUNNING"
)

/**
 * Honest Focus Integrity summary produced at session completion (Prompt #16 & #17).
 * NO FAKE "FOCUS SCORE: 83%".
 * NO CLAIM OF PHYSICAL PHONE PICKUP.
 * Shows honest times, interruptions, and uninterrupted stretch.
 */
@Serializable
data class FocusSummary(
    val sessionId: String,
    val summaryId: String,
    val intendedSeconds: Long,
    val observedWindowSeconds: Long,
    val interruptionCount: Int,
    val interruptionSeconds: Long,
    val referenceSeconds: Long,
    val distractionSeconds: Long,
    val unknownSeconds: Long,
    val longestUninterruptedSeconds: Long,
    val interruptions: List<Interruption> = emptyList(),
    val appBreakdown: List<AppBreakdownSummary> = emptyList(),
    val collectionStatus: CollectionStatus = CollectionStatus.COMPLETE,
    val timestamp: Long = System.currentTimeMillis(),
    val syncState: String = "PENDING"
)

/**
 * Secure application-generated device association ID (Prompt #9).
 * Avoids persistent hardware identifiers like IMEI, SIM ID, or serial number.
 */
@Serializable
data class DeviceAssociation(
    val deviceAssociationId: String,
    val deviceName: String,
    val pairedAccountEmail: String? = null,
    val pairedAt: Long = System.currentTimeMillis()
)
