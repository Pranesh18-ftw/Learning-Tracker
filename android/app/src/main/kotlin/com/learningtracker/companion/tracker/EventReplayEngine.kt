package com.learningtracker.companion.tracker

import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.Json

@Serializable
data class ReplayEventJson(
    val type: String,
    @SerialName("package")
    val packageName: String? = null,
    val timestamp: Long
)

/**
 * EventReplayEngine (Prompt #31)
 *
 * Replays synthetic JSON event sequences into ForegroundTracker and InterruptionClassifier.
 * Enables deterministic testing of edge cases without requiring a physical device.
 */
class EventReplayEngine(
    private val foregroundTracker: ForegroundTracker = ForegroundTracker(),
    private val classifier: InterruptionClassifier = InterruptionClassifier(),
    private val summaryCalculator: FocusSummaryCalculator = FocusSummaryCalculator()
) {

    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Parse and run replay events from JSON string.
     */
    fun replayFromJson(
        jsonString: String,
        sessionStart: Long,
        sessionEnd: Long,
        intendedDurationSeconds: Long = (sessionEnd - sessionStart) / 1000L,
        sessionId: String = "replay-test-session"
    ): FocusSummary {
        val replayEvents = json.decodeFromString<List<ReplayEventJson>>(jsonString)
        val rawEvents = replayEvents.map { it.toRawEvent() }

        val intervals = foregroundTracker.reconstructIntervals(rawEvents, sessionStart, sessionEnd)
        val interruptions = classifier.classifyIntervals(intervals)

        val sessionContract = FocusSessionContract(
            sessionId = sessionId,
            startedAt = sessionStart,
            intendedDurationSeconds = intendedDurationSeconds,
            taskName = "Replay Session"
        )

        return summaryCalculator.calculateSummary(sessionContract, sessionEnd, interruptions)
    }

    private fun ReplayEventJson.toRawEvent(): RawTelemetryEvent {
        val eventType = when (type.toUpperCase()) {
            "ACTIVITY_RESUMED" -> RawTelemetryEvent.ACTIVITY_RESUMED
            "ACTIVITY_PAUSED" -> RawTelemetryEvent.ACTIVITY_PAUSED
            "SCREEN_INTERACTIVE" -> RawTelemetryEvent.SCREEN_INTERACTIVE
            "SCREEN_NON_INTERACTIVE" -> RawTelemetryEvent.SCREEN_NON_INTERACTIVE
            else -> RawTelemetryEvent.ACTIVITY_RESUMED
        }
        return RawTelemetryEvent(
            eventType = eventType,
            packageName = this.packageName,
            timestamp = timestamp
        )
    }
}
