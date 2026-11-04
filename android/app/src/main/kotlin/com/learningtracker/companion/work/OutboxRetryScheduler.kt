package com.learningtracker.companion.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.learningtracker.companion.FocusIntegrityApplication
import com.learningtracker.companion.data.DatabaseAccessGate
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Centralized Outbox Retry Scheduler (M2.4)
 *
 * Assesses the state of the Room telemetry outbox:
 * - IMMEDIATE_ELIGIBLE: PENDING records or RETRY records whose deadline has expired (nextAttemptAt <= now).
 * - FUTURE_RETRY: No due records, but at least one RETRY record with a future deadline (nextAttemptAt > now).
 * - NO_WORK: No pending or future records to sync.
 *
 * Enqueues WorkManager jobs using non-interfering unique work policies:
 * - WORK_NAME_DRAIN uses ExistingWorkPolicy.KEEP so active worker is never cancelled.
 * - WORK_NAME_RETRY uses ExistingWorkPolicy.REPLACE to adjust to the earliest upcoming deadline.
 */
class OutboxRetryScheduler(
    private val context: Context,
    private val gate: DatabaseAccessGate? = null,
    private val workManager: WorkManager? = null,
    private val timeProvider: () -> Long = { System.currentTimeMillis() }
) {
    companion object {
        const val WORK_NAME_DRAIN = "lt_telemetry_outbox_drain"
        const val WORK_NAME_RETRY = "lt_telemetry_outbox_retry"
        private val schedulerMutex = Mutex()
    }

    enum class WorkState {
        IMMEDIATE_ELIGIBLE,
        FUTURE_RETRY,
        NO_WORK
    }

    data class Assessment(
        val dueCount: Int,
        val earliestFutureRetryDeadline: Long?,
        val state: WorkState
    )

    private fun resolveGate(): DatabaseAccessGate {
        return gate
            ?: FocusIntegrityApplication.getInstance()?.databaseAccessGate
            ?: TelemetryUploadWorker.testDatabaseAccessGate
            ?: throw IllegalStateException("DatabaseAccessGate is not available")
    }

    private fun resolveWorkManager(): WorkManager {
        return workManager
            ?: TelemetryUploadWorker.testWorkManager
            ?: try {
                WorkManager.getInstance(context)
            } catch (e: Exception) {
                throw IllegalStateException("WorkManager is not initialized", e)
            }
    }

    /**
     * Inspects SQLite outbox state and returns the current assessment.
     */
    suspend fun assess(now: Long = timeProvider()): Assessment {
        val gateToUse = resolveGate()
        return gateToUse.withAccess { db ->
            val outboxDao = db.telemetryOutboxDao()
            val due = outboxDao.countDueOrPendingRecords(now)
            val earliestFuture = outboxDao.getEarliestFutureRetryDeadline(now)
            val state = when {
                due > 0 -> WorkState.IMMEDIATE_ELIGIBLE
                earliestFuture != null -> WorkState.FUTURE_RETRY
                else -> WorkState.NO_WORK
            }
            Assessment(due, earliestFuture, state)
        }
    }

    /**
     * Synchronously assesses SQLite outbox state and enqueues appropriate WorkManager jobs.
     */
    suspend fun scheduleNext(now: Long = timeProvider()): Assessment {
        schedulerMutex.withLock {
            val assessment = assess(now)
            val wm = resolveWorkManager()

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            when (assessment.state) {
                WorkState.IMMEDIATE_ELIGIBLE -> {
                    val drainRequest = OneTimeWorkRequestBuilder<TelemetryUploadWorker>()
                        .setConstraints(constraints)
                        .build()
                    wm.enqueueUniqueWork(WORK_NAME_DRAIN, ExistingWorkPolicy.KEEP, drainRequest)
                }
                WorkState.FUTURE_RETRY -> {
                    val deadline = assessment.earliestFutureRetryDeadline!!
                    val delayMs = (deadline - now).coerceAtLeast(0L)
                    val retryRequest = OneTimeWorkRequestBuilder<TelemetryUploadWorker>()
                        .setConstraints(constraints)
                        .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                        .build()
                    wm.enqueueUniqueWork(WORK_NAME_RETRY, ExistingWorkPolicy.REPLACE, retryRequest)
                }
                WorkState.NO_WORK -> {
                    wm.cancelUniqueWork(WORK_NAME_RETRY)
                }
            }
            return assessment
        }
    }

    /**
     * Non-blocking invocation for Application.onCreate and BootReceiver.
     */
    fun scheduleNextAsync(
        scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
        now: Long = timeProvider()
    ): Job {
        return scope.launch {
            try {
                scheduleNext(now)
            } catch (e: Exception) {
                android.util.Log.e("OutboxRetryScheduler", "Failed to schedule next outbox work", e)
            }
        }
    }
}
