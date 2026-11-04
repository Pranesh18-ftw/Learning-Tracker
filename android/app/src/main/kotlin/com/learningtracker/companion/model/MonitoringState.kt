package com.learningtracker.companion.model

import kotlinx.serialization.Serializable

/**
 * MonitoringState (Phase 2 Lifecycle State Machine)
 *
 * Explicit states governing automatic background monitoring:
 * - DISABLED: Monitoring turned off by user preference
 * - PAIRING: Companion is undergoing initial pairing
 * - READY: Paired and permissions granted, ready to start monitoring
 * - WAITING_FOR_FOCUS: Foreground service active in background, polling for web focus session
 * - MONITORING: Active web session discovered; observing device usage
 * - FINALIZING: Web session concluded; calculating usage & interruptions
 * - UPLOADING: Local-first summary persisted, transmitting to backend
 * - DELIVERED: Backend acknowledged ingestion and reconciled telemetry
 * - RECOVERY_REQUIRED: Missed sessions or network errors requiring catch-up
 */
@Serializable
enum class MonitoringState {
    DISABLED,
    PAIRING,
    READY,
    WAITING_FOR_FOCUS,
    MONITORING,
    FINALIZING,
    UPLOADING,
    DELIVERED,
    RECOVERY_REQUIRED;

    val isMonitoringActive: Boolean
        get() = this == MONITORING || this == FINALIZING || this == UPLOADING

    val isServiceRunning: Boolean
        get() = this == WAITING_FOR_FOCUS || this == MONITORING || this == FINALIZING || this == UPLOADING || this == DELIVERED
}
