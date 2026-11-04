package com.learningtracker.companion.tracker

import com.learningtracker.companion.model.CollectionStatus
import com.learningtracker.companion.model.ForegroundInterval

/**
 * Normalized input event consumed by ForegroundTracker (Prompt #10 & #11).
 * Can be derived from real Android UsageEvents or developer synthetic replay fixtures.
 */
data class RawTelemetryEvent(
    val eventType: Int,
    val packageName: String?,
    val timestamp: Long
) {
    companion object {
        const val ACTIVITY_RESUMED = 1
        const val ACTIVITY_PAUSED = 2
        const val SCREEN_INTERACTIVE = 15
        const val SCREEN_NON_INTERACTIVE = 16
        const val KEYGUARD_SHOWN = 17
        const val KEYGUARD_HIDDEN = 18
    }
}

data class ReconstructionResult(
    val intervals: List<ForegroundInterval>,
    val status: CollectionStatus,
    val totalEventsObserved: Int,
    val hasUnobservedGaps: Boolean
)

/**
 * ForegroundTracker (Stage 2B Part 7 & 8)
 *
 * Reconstructs bounded foreground intervals from discrete Android UsageEvents.
 *
 * Invariants:
 * - Never fabricates an initial foreground app if unknown at sessionStart.
 * - Screen lock / keyguard shown closes any running app interval.
 * - Screen interactive / keyguard hidden re-enables interaction observation.
 * - Merges consecutive micro-transitions of the same package.
 * - Distinguishes COMPLETE from PARTIAL and NO_OBSERVATIONS status.
 */
class ForegroundTracker {

    /**
     * Reconstruct foreground intervals over an active window [sessionStart, sessionEnd].
     */
    fun reconstructIntervals(
        events: List<RawTelemetryEvent>,
        sessionStart: Long,
        sessionEnd: Long
    ): List<ForegroundInterval> {
        return reconstructWithStatus(events, sessionStart, sessionEnd).intervals
    }

    /**
     * Reconstructs intervals and determines honest collection status.
     */
    fun reconstructWithStatus(
        events: List<RawTelemetryEvent>,
        sessionStart: Long,
        sessionEnd: Long
    ): ReconstructionResult {
        if (sessionEnd <= sessionStart) {
            return ReconstructionResult(
                intervals = emptyList(),
                status = CollectionStatus.NO_OBSERVATIONS,
                totalEventsObserved = 0,
                hasUnobservedGaps = false
            )
        }

        // Filter and sort events chronologically
        val sorted = events
            .filter { it.timestamp in sessionStart..sessionEnd }
            .sortedWith(compareBy({ it.timestamp }, { it.eventType }))

        if (sorted.isEmpty()) {
            return ReconstructionResult(
                intervals = emptyList(),
                status = CollectionStatus.NO_OBSERVATIONS,
                totalEventsObserved = 0,
                hasUnobservedGaps = true
            )
        }

        // Deduplicate events occurring at exact same timestamp with identical type and package
        val deduplicated = mutableListOf<RawTelemetryEvent>()
        for (e in sorted) {
            if (deduplicated.isEmpty() ||
                deduplicated.last().timestamp != e.timestamp ||
                deduplicated.last().eventType != e.eventType ||
                deduplicated.last().packageName != e.packageName) {
                deduplicated.add(e)
            }
        }

        val intervals = mutableListOf<ForegroundInterval>()
        var currentPackage: String? = null
        var intervalStartTime: Long = -1L
        var isScreenInteractive = true

        for (event in deduplicated) {
            when (event.eventType) {
                RawTelemetryEvent.SCREEN_NON_INTERACTIVE,
                RawTelemetryEvent.KEYGUARD_SHOWN -> {
                    // Screen turned off / locked: close any running app interval
                    if (isScreenInteractive && currentPackage != null && intervalStartTime >= 0) {
                        val end = event.timestamp.coerceIn(intervalStartTime, sessionEnd)
                        if (end > intervalStartTime) {
                            intervals.add(ForegroundInterval(currentPackage, intervalStartTime, end))
                        }
                        currentPackage = null
                        intervalStartTime = -1L
                    }
                    isScreenInteractive = false
                }

                RawTelemetryEvent.SCREEN_INTERACTIVE,
                RawTelemetryEvent.KEYGUARD_HIDDEN -> {
                    isScreenInteractive = true
                }

                RawTelemetryEvent.ACTIVITY_RESUMED -> {
                    val pkg = event.packageName?.trim()?.takeIf { it.isNotBlank() } ?: continue
                    if (!isScreenInteractive) isScreenInteractive = true

                    if (currentPackage == null) {
                        // Started fresh app interval (we do NOT back-allocate to sessionStart if unknown)
                        currentPackage = pkg
                        intervalStartTime = event.timestamp.coerceAtLeast(sessionStart)
                    } else if (currentPackage != pkg) {
                        // Switched to a different app: close previous, open new
                        if (intervalStartTime >= 0) {
                            val end = event.timestamp.coerceIn(intervalStartTime, sessionEnd)
                            if (end > intervalStartTime) {
                                intervals.add(ForegroundInterval(currentPackage, intervalStartTime, end))
                            }
                        }
                        currentPackage = pkg
                        intervalStartTime = event.timestamp.coerceAtLeast(sessionStart)
                    }
                }

                RawTelemetryEvent.ACTIVITY_PAUSED -> {
                    val pkg = event.packageName?.trim()?.takeIf { it.isNotBlank() } ?: continue
                    if (currentPackage == pkg && intervalStartTime >= 0) {
                        val end = event.timestamp.coerceIn(intervalStartTime, sessionEnd)
                        if (end > intervalStartTime) {
                            intervals.add(ForegroundInterval(currentPackage, intervalStartTime, end))
                        }
                        currentPackage = null
                        intervalStartTime = -1L
                    }
                }
            }
        }

        // Close dangling interval at sessionEnd only if screen is still interactive
        if (currentPackage != null && isScreenInteractive && intervalStartTime >= 0) {
            val end = sessionEnd.coerceAtLeast(intervalStartTime)
            if (end > intervalStartTime) {
                intervals.add(ForegroundInterval(currentPackage, intervalStartTime, end))
            }
        }

        val consolidated = consolidateIntervals(intervals)

        // Check if there is an unobserved gap at the beginning or throughout
        val firstObservedTime = deduplicated.first().timestamp
        val hasInitialGap = (firstObservedTime - sessionStart) > 60_000L // > 1 minute before first event
        val status = if (hasInitialGap) CollectionStatus.PARTIAL else CollectionStatus.COMPLETE

        return ReconstructionResult(
            intervals = consolidated,
            status = status,
            totalEventsObserved = deduplicated.size,
            hasUnobservedGaps = hasInitialGap
        )
    }

    /**
     * Merges adjacent or tightly consecutive segments of the same package
     * and filters out sub-500ms jitter.
     */
    private fun consolidateIntervals(raw: List<ForegroundInterval>): List<ForegroundInterval> {
        if (raw.isEmpty()) return emptyList()

        val consolidated = mutableListOf<ForegroundInterval>()
        var current = raw[0]

        for (i in 1 until raw.size) {
            val next = raw[i]
            // If same package and gap is less than 1.5 seconds, merge
            if (next.packageName == current.packageName && (next.startTime - current.endTime) <= 1500L) {
                current = current.copy(endTime = maxOf(current.endTime, next.endTime))
            } else {
                if (current.durationMs >= 500L) {
                    consolidated.add(current)
                }
                current = next
            }
        }

        if (current.durationMs >= 500L) {
            consolidated.add(current)
        }

        return consolidated
    }
}
