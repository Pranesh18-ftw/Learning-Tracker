package com.learningtracker.companion.tracker

import com.learningtracker.companion.model.AppBreakdownSummary
import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.model.Interruption
import java.util.UUID

/**
 * FocusSummaryCalculator (Stage 2B Part 11 & 12)
 *
 * Computes truthful metrics for a concluded focus session:
 * - Intended vs observed duration
 * - Number of phone interruptions
 * - Categorized interruption time (Reference vs Distraction vs Unknown)
 * - Longest uninterrupted stretch
 * - Bounded app breakdown (max 50 entries)
 * - Explicit collection status (COMPLETE, PARTIAL, NO_OBSERVATIONS)
 *
 * NO FAKE "FOCUS SCORE: 83%".
 * NO CLAIM OF PHYSICAL PHONE PICKUP.
 */
class FocusSummaryCalculator {

    fun calculateSummary(
        session: FocusSessionContract,
        sessionEndTime: Long,
        interruptions: List<Interruption>,
        summaryId: String = "sum_" + UUID.randomUUID().toString().replace("-", ""),
        collectionStatus: CollectionStatus = CollectionStatus.COMPLETE
    ): FocusSummary {
        val observedWindowSeconds = ((sessionEndTime - session.startedAt) / 1000L).coerceAtLeast(0L)

        var refSeconds = 0L
        var distSeconds = 0L
        var unkSeconds = 0L

        // Aggregate app breakdown by packageName
        val breakdownMap = mutableMapOf<String, Pair<AppCategory, Long>>()

        for (interruption in interruptions) {
            when (interruption.category) {
                AppCategory.REFERENCE -> refSeconds += interruption.durationSeconds
                AppCategory.DISTRACTION -> distSeconds += interruption.durationSeconds
                AppCategory.UNKNOWN -> unkSeconds += interruption.durationSeconds
                AppCategory.NEUTRAL -> { /* ignored from distraction metrics */ }
            }

            val pkg = interruption.packageName
            if (pkg != null) {
                val existing = breakdownMap[pkg]
                val updatedDuration = (existing?.second ?: 0L) + interruption.durationSeconds
                breakdownMap[pkg] = Pair(interruption.category, updatedDuration)
            }
        }

        val totalInterruptionSeconds = refSeconds + distSeconds + unkSeconds

        val appBreakdown = breakdownMap.map { (pkg, pair) ->
            AppBreakdownSummary(
                packageName = pkg,
                category = pair.first,
                durationSeconds = pair.second
            )
        }
            .sortedByDescending { it.durationSeconds }
            .take(50)

        // Calculate longest uninterrupted stretch
        val longestStretch = if (collectionStatus == CollectionStatus.PERMISSION_REQUIRED || collectionStatus == CollectionStatus.COLLECTION_FAILED) {
            0L
        } else {
            calculateLongestUninterruptedSeconds(
                sessionStart = session.startedAt,
                sessionEnd = sessionEndTime,
                interruptions = interruptions
            )
        }

        return FocusSummary(
            sessionId = session.sessionId,
            summaryId = summaryId,
            intendedSeconds = session.intendedDurationSeconds,
            observedWindowSeconds = observedWindowSeconds,
            interruptionCount = interruptions.size,
            interruptionSeconds = totalInterruptionSeconds,
            referenceSeconds = refSeconds,
            distractionSeconds = distSeconds,
            unknownSeconds = unkSeconds,
            longestUninterruptedSeconds = longestStretch,
            interruptions = interruptions,
            appBreakdown = appBreakdown,
            collectionStatus = collectionStatus,
            timestamp = sessionEndTime,
            syncState = "PENDING"
        )
    }

    /**
     * Finds the maximum uninterrupted continuous time gap across the session window.
     * Accurately handles overlapping interruptions and clips to session boundaries.
     */
    private fun calculateLongestUninterruptedSeconds(
        sessionStart: Long,
        sessionEnd: Long,
        interruptions: List<Interruption>
    ): Long {
        if (sessionEnd <= sessionStart) return 0L
        if (interruptions.isEmpty()) {
            return (sessionEnd - sessionStart) / 1000L
        }

        val sorted = interruptions.sortedBy { it.startTime }
        var maxGapMs = 0L
        var currentCursor = sessionStart

        for (interruption in sorted) {
            val clampedStart = interruption.startTime.coerceIn(sessionStart, sessionEnd)
            val clampedEnd = interruption.endTime.coerceIn(sessionStart, sessionEnd)
            if (clampedStart > currentCursor) {
                val gap = clampedStart - currentCursor
                if (gap > maxGapMs) maxGapMs = gap
            }
            if (clampedEnd > currentCursor) {
                currentCursor = clampedEnd
            }
        }

        if (sessionEnd > currentCursor) {
            val gap = sessionEnd - currentCursor
            if (gap > maxGapMs) maxGapMs = gap
        }

        return maxGapMs / 1000L
    }
}
