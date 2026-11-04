package com.learningtracker.companion.data.entity

import com.learningtracker.companion.model.AppBreakdownSummary
import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.BoundaryConfidence
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.model.TimelineInterval

fun FocusSessionContract.toEntity(state: String = "RUNNING"): FocusSessionEntity {
    return FocusSessionEntity(
        sessionId = sessionId,
        startedAt = startedAt,
        intendedDurationSeconds = intendedDurationSeconds,
        endedAt = null,
        taskName = taskName,
        subjectName = subjectName,
        state = state,
        boundaryConfidence = "AUTHORITATIVE"
    )
}

fun FocusSummary.toSessionEntity(): FocusSessionEntity {
    return FocusSessionEntity(
        sessionId = sessionId,
        startedAt = (timestamp - (observedWindowSeconds * 1000L)).coerceAtLeast(0L),
        intendedDurationSeconds = intendedSeconds,
        endedAt = timestamp,
        taskName = null,
        subjectName = null,
        state = "FINALIZED",
        boundaryConfidence = boundaryConfidence.name
    )
}

fun FocusSummary.toSummaryEntity(): TelemetrySummaryEntity {
    return TelemetrySummaryEntity(
        summaryId = summaryId,
        sessionId = sessionId,
        intendedSeconds = intendedSeconds,
        observedWindowSeconds = observedWindowSeconds,
        interruptionCount = interruptionCount,
        interruptionSeconds = interruptionSeconds,
        referenceSeconds = referenceSeconds,
        distractionSeconds = distractionSeconds,
        unknownSeconds = unknownSeconds,
        longestUninterruptedSeconds = longestUninterruptedSeconds,
        collectionStatus = collectionStatus.name,
        boundaryConfidence = boundaryConfidence.name,
        syncState = syncState,
        attempts = 0,
        claimToken = null,
        claimGeneration = 0L,
        leaseExpiresAt = null,
        nextAttemptAt = null,
        lastAttemptAt = null,
        lastError = null,
        deliveredAt = null,
        createdAt = timestamp,
        updatedAt = timestamp
    )
}

fun TimelineInterval.toEntity(summaryId: String, sessionId: String, orderIndex: Int): TimelineIntervalEntity {
    val intervalId = if (id.isNotBlank()) id else "${summaryId}_int_$orderIndex"
    return TimelineIntervalEntity(
        id = intervalId,
        summaryId = summaryId,
        sessionId = sessionId,
        startTime = startTime,
        endTime = endTime,
        durationSeconds = durationSeconds,
        classification = classification,
        packageName = packageName,
        appCategory = appCategory,
        note = note,
        orderIndex = orderIndex
    )
}

fun AppBreakdownSummary.toEntity(summaryId: String): AppBreakdownEntity {
    return AppBreakdownEntity(
        id = "${summaryId}_${packageName}",
        summaryId = summaryId,
        packageName = packageName,
        category = category.name.lowercase(),
        durationSeconds = durationSeconds
    )
}

fun TimelineIntervalEntity.toModel(): TimelineInterval {
    return TimelineInterval(
        id = id,
        startTime = startTime,
        endTime = endTime,
        durationSeconds = durationSeconds,
        classification = classification,
        packageName = packageName,
        appCategory = appCategory,
        note = note
    )
}

fun AppBreakdownEntity.toModel(): AppBreakdownSummary {
    return AppBreakdownSummary(
        packageName = packageName,
        category = AppCategory.fromString(category),
        durationSeconds = durationSeconds
    )
}

fun TelemetrySummaryEntity.toModel(
    timeline: List<TimelineIntervalEntity> = emptyList(),
    breakdown: List<AppBreakdownEntity> = emptyList()
): FocusSummary {
    val status = try {
        CollectionStatus.valueOf(collectionStatus)
    } catch (_: Exception) {
        CollectionStatus.COMPLETE
    }
    val confidence = try {
        BoundaryConfidence.valueOf(boundaryConfidence)
    } catch (_: Exception) {
        BoundaryConfidence.AUTHORITATIVE
    }
    return FocusSummary(
        sessionId = sessionId,
        summaryId = summaryId,
        intendedSeconds = intendedSeconds,
        observedWindowSeconds = observedWindowSeconds,
        interruptionCount = interruptionCount,
        interruptionSeconds = interruptionSeconds,
        referenceSeconds = referenceSeconds,
        distractionSeconds = distractionSeconds,
        unknownSeconds = unknownSeconds,
        longestUninterruptedSeconds = longestUninterruptedSeconds,
        interruptions = emptyList(),
        appBreakdown = breakdown.map { it.toModel() },
        timeline = timeline.map { it.toModel() },
        collectionStatus = status,
        boundaryConfidence = confidence,
        timestamp = createdAt,
        syncState = syncState
    )
}

fun FocusSessionEntity.toContract(): FocusSessionContract {
    return FocusSessionContract(
        sessionId = sessionId,
        startedAt = startedAt,
        intendedDurationSeconds = intendedDurationSeconds,
        taskName = taskName,
        subjectName = subjectName,
        state = state
    )
}

