package com.learningtracker.companion.data

import com.learningtracker.companion.data.entity.toEntity
import com.learningtracker.companion.data.entity.toModel
import com.learningtracker.companion.data.entity.toSessionEntity
import com.learningtracker.companion.data.entity.toSummaryEntity
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.sync.ITelemetryStorage
import kotlinx.coroutines.runBlocking

/**
 * RoomTelemetryStorage (Milestone 2.3)
 *
 * Encrypted Room-backed implementation of ITelemetryStorage.
 * Executes all database operations through DatabaseAccessGate.
 * Guarantees transaction atomicity, terminal-state preservation,
 * and foreign key child relationship integrity.
 */
class RoomTelemetryStorage(
    val gate: DatabaseAccessGate
) : ITelemetryStorage {

    override fun saveSummary(summary: FocusSummary) {
        saveSummary(summary, createdAt = null)
    }

    fun saveSummary(summary: FocusSummary, createdAt: Long? = null) {
        runBlocking {
            gate.withAccess { db ->
                val dao = db.telemetryOutboxDao()
                val session = summary.toSessionEntity()
                val summaryEntity = summary.toSummaryEntity().let {
                    if (createdAt != null) it.copy(createdAt = createdAt) else it
                }
                val intervals = summary.timeline.mapIndexed { idx, it ->
                    it.toEntity(summary.summaryId, summary.sessionId, idx)
                }
                val breakdown = summary.appBreakdown.map {
                    it.toEntity(summary.summaryId)
                }
                val authoritativeContract = FocusSessionContract(
                    sessionId = summary.sessionId,
                    startedAt = (summary.timestamp - (summary.observedWindowSeconds * 1000L)).coerceAtLeast(0L),
                    intendedDurationSeconds = summary.intendedSeconds,
                    state = "FINALIZED"
                )
                dao.finalizeSessionAtomic(
                    session = session,
                    summary = summaryEntity,
                    intervals = intervals,
                    breakdown = breakdown,
                    authoritativeContract = authoritativeContract
                )
            }
        }
    }

    override fun getSummary(summaryId: String): FocusSummary? {
        return runBlocking {
            gate.withAccess { db ->
                val dao = db.telemetryOutboxDao()
                val entity = dao.getSummaryById(summaryId) ?: return@withAccess null
                val intervals = dao.getIntervalsForSummary(summaryId)
                val breakdown = dao.getBreakdownForSummary(summaryId)
                entity.toModel(intervals, breakdown)
            }
        }
    }

    override fun getAllSummaries(): List<FocusSummary> {
        return runBlocking {
            gate.withAccess { db ->
                val dao = db.telemetryOutboxDao()
                val summaries = dao.getAllSummaries()
                summaries.map { entity ->
                    val intervals = dao.getIntervalsForSummary(entity.summaryId)
                    val breakdown = dao.getBreakdownForSummary(entity.summaryId)
                    entity.toModel(intervals, breakdown)
                }
            }
        }
    }

    override fun getPendingSummaries(): List<FocusSummary> {
        return runBlocking {
            gate.withAccess { db ->
                val dao = db.telemetryOutboxDao()
                val pending = dao.getPendingSummaries()
                pending.map { entity ->
                    val intervals = dao.getIntervalsForSummary(entity.summaryId)
                    val breakdown = dao.getBreakdownForSummary(entity.summaryId)
                    entity.toModel(intervals, breakdown)
                }
            }
        }
    }

    override fun updateSyncState(summaryId: String, nextState: String, lastError: String?) {
        runBlocking {
            gate.withAccess { db ->
                val dao = db.telemetryOutboxDao()
                val current = dao.getSummaryById(summaryId) ?: return@withAccess

                // Terminal-state protection: Terminal states (DELIVERED, PERMANENT_ERROR, CONFLICT) cannot be revived
                if (current.syncState in listOf("DELIVERED", "PERMANENT_ERROR", "CONFLICT")) {
                    if (nextState != current.syncState) {
                        return@withAccess // Refuse state transition out of terminal state
                    }
                }

                val now = System.currentTimeMillis()
                val attempts = current.attempts + 1
                val targetSyncState = if (attempts >= 10 && nextState != "DELIVERED") {
                    "PERMANENT_ERROR"
                } else {
                    nextState
                }

                val updated = current.copy(
                    syncState = targetSyncState,
                    attempts = attempts,
                    lastAttemptAt = now,
                    lastError = lastError ?: current.lastError,
                    deliveredAt = if (targetSyncState == "DELIVERED") now else current.deliveredAt,
                    claimToken = null,
                    leaseExpiresAt = null,
                    nextAttemptAt = if (targetSyncState in listOf("DELIVERED", "PERMANENT_ERROR", "CONFLICT")) null else current.nextAttemptAt,
                    updatedAt = now
                )
                dao.upsertSummary(updated)
            }
        }
    }

    override fun getAttempts(summaryId: String): Int {
        return runBlocking {
            gate.withAccess { db ->
                db.telemetryOutboxDao().getSummaryById(summaryId)?.attempts ?: 0
            }
        }
    }

    override fun getLastError(summaryId: String): String? {
        return runBlocking {
            gate.withAccess { db ->
                db.telemetryOutboxDao().getSummaryById(summaryId)?.lastError
            }
        }
    }

    override fun deleteSummary(summaryId: String) {
        runBlocking {
            gate.withAccess { db ->
                db.telemetryOutboxDao().deleteSummaryAndChildren(summaryId)
            }
        }
    }

    override fun clearAllSummaries() {
        runBlocking {
            gate.withAccess { db ->
                db.telemetryOutboxDao().deleteAllSummariesAndChildren()
            }
        }
    }
}
