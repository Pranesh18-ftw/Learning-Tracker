package com.learningtracker.companion.tracker

import com.learningtracker.companion.model.AppCategory
import com.learningtracker.companion.model.ForegroundInterval
import com.learningtracker.companion.model.Interruption

/**
 * InterruptionClassifier (Prompt #12, #13, #14, #15)
 *
 * Maps raw foreground intervals into categorized interruption events.
 *
 * CORE RULES:
 * - Phone usage != distraction (Calculator, Docs, Chrome, PDF readers are Reference).
 * - System UI / Dialer / Companion app are Neutral (not counted as distractions).
 * - Feeds, short-form video, and games are Distraction.
 * - Everything else is UNKNOWN (never silently assumed to be distraction).
 * - User custom overrides take precedence.
 */
class InterruptionClassifier(
    private val userOverrides: Map<String, AppCategory> = emptyMap()
) {

    companion object {
        val DEFAULT_REFERENCE_PACKAGES = setOf(
            "com.android.chrome",
            "org.mozilla.firefox",
            "com.google.android.calculator",
            "com.sec.android.app.popupcalculator",
            "com.adobe.reader",
            "com.google.android.apps.docs",
            "com.github.android",
            "com.notion.id",
            "org.kicad.viewer",
            "bin.mt.plus" // code editor/file viewer
        )

        val DEFAULT_DISTRACTION_PACKAGES = setOf(
            "com.instagram.android",
            "com.zhiliaoapp.musically", // TikTok
            "com.google.android.youtube",
            "com.twitter.android",
            "com.reddit.frontpage",
            "com.snapchat.android",
            "com.facebook.katana",
            "com.netflix.mediaclient",
            "com.supercell.clashofclans"
        )

        val DEFAULT_NEUTRAL_PACKAGES = setOf(
            "com.android.systemui",
            "com.android.settings",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.learningtracker.companion",
            "com.sec.android.app.launcher",
            "com.google.android.apps.nexuslauncher"
        )
    }

    /**
     * Classifies a package name based on user overrides and defaults.
     */
    fun classifyPackage(packageName: String): AppCategory {
        // 1. User explicit override takes priority (Prompt #15)
        userOverrides[packageName]?.let { return it }

        // 2. Default package sets
        if (DEFAULT_NEUTRAL_PACKAGES.contains(packageName)) return AppCategory.NEUTRAL
        if (DEFAULT_REFERENCE_PACKAGES.contains(packageName)) return AppCategory.REFERENCE
        if (DEFAULT_DISTRACTION_PACKAGES.contains(packageName)) return AppCategory.DISTRACTION

        // 3. Fallback heuristic for common utility terms
        val lower = packageName.toLowerCase()
        if (lower.contains("calculator") || lower.contains("reader") || lower.contains("docs") || lower.contains("pdf")) {
            return AppCategory.REFERENCE
        }

        // 4. Strictly UNKNOWN (Prompt #14: Do not silently label unknown apps as distraction)
        return AppCategory.UNKNOWN
    }

    /**
     * Classifies a list of foreground intervals into interruptions.
     * Neutral packages (e.g. system UI or companion app itself) are suppressed from counting as away-from-work.
     */
    fun classifyIntervals(intervals: List<ForegroundInterval>): List<Interruption> {
        val interruptions = mutableListOf<Interruption>()

        for (interval in intervals) {
            val category = classifyPackage(interval.packageName)

            // Suppress Neutral usage from counting as an interruption
            if (category == AppCategory.NEUTRAL) {
                continue
            }

            interruptions.add(
                Interruption(
                    startTime = interval.startTime,
                    endTime = interval.endTime,
                    durationSeconds = interval.durationSeconds,
                    packageName = interval.packageName,
                    category = category
                )
            )
        }

        return interruptions
    }
}
