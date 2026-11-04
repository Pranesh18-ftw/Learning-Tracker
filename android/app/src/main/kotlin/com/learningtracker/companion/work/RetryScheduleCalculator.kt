package com.learningtracker.companion.work

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

object RetryScheduleCalculator {
    const val DEFAULT_BASE_DELAY_MS = 30_000L // 30 seconds
    const val MAX_DELAY_MS = 3600_000L // 1 hour

    /**
     * Calculates bounded exponential backoff deadline:
     * base * 2^(attempts - 1), capped at maxDelayMs.
     */
    fun calculateExponentialBackoffMs(
        attempts: Int,
        baseDelayMs: Long = DEFAULT_BASE_DELAY_MS,
        maxDelayMs: Long = MAX_DELAY_MS
    ): Long {
        val exp = (attempts - 1).coerceIn(0, 10)
        val delay = baseDelayMs * (1L shl exp)
        return minOf(delay, maxDelayMs)
    }

    /**
     * Parses Retry-After header in both supported formats:
     * 1. Delta seconds (e.g. "120" -> now + 120,000 ms)
     * 2. RFC 1123 HTTP date (e.g. "Wed, 21 Oct 2026 07:28:00 GMT" -> epoch ms)
     *
     * Falls back to bounded exponential backoff if header is absent or invalid.
     */
    fun parseRetryAfter(
        header: String?,
        now: Long,
        attempts: Int,
        baseDelayMs: Long = DEFAULT_BASE_DELAY_MS,
        maxDelayMs: Long = MAX_DELAY_MS
    ): Long {
        if (header.isNullOrBlank()) {
            return now + calculateExponentialBackoffMs(attempts, baseDelayMs, maxDelayMs)
        }
        val trimmed = header.trim()

        // 1. Try delta seconds
        val deltaSeconds = trimmed.toLongOrNull()
        if (deltaSeconds != null) {
            return now + (deltaSeconds.coerceAtLeast(1L) * 1000L)
        }

        // 2. Try RFC 1123 HTTP date
        val parsedDate = try {
            val format = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("GMT")
            }
            format.parse(trimmed)
        } catch (_: Exception) {
            null
        }

        if (parsedDate != null) {
            return maxOf(now + 1000L, parsedDate.time)
        }

        // Fallback to bounded exponential backoff
        return now + calculateExponentialBackoffMs(attempts, baseDelayMs, maxDelayMs)
    }
}
