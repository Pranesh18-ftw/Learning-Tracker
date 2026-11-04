package com.learningtracker.companion.data

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.atomic.AtomicInteger

class DatabaseAccessGate(
    private val databaseProvider: () -> AppDatabase
) {
    enum class GateState { OPEN, DRAINING, RECOVERING, DEGRADED, STORAGE_EXHAUSTED }

    private val coordinatorMutex = Mutex()
    private val activeOperations = AtomicInteger(0)
    @Volatile private var drainSignal = CompletableDeferred<Unit>()
    @Volatile private var state: GateState = GateState.OPEN
    @Volatile private var databaseInstance: AppDatabase? = null

    fun getState(): GateState = state

    fun setState(newState: GateState) {
        state = newState
    }

    private fun getOrOpenDatabase(): AppDatabase {
        return databaseInstance ?: synchronized(this) {
            databaseInstance ?: databaseProvider().also { databaseInstance = it }
        }
    }

    suspend fun <T> withAccess(block: suspend (AppDatabase) -> T): T {
        coordinatorMutex.withLock {
            when (state) {
                GateState.DEGRADED -> throw DatabaseDegradedException("Database is in unrecoverable degraded state")
                GateState.STORAGE_EXHAUSTED -> throw DatabaseStorageFullException("Device storage exhausted")
                GateState.DRAINING, GateState.RECOVERING -> throw DatabaseRecoveryInProgressException("Recovery active")
                GateState.OPEN -> activeOperations.incrementAndGet()
            }
        }

        try {
            return block(getOrOpenDatabase())
        } finally {
            val remaining = activeOperations.decrementAndGet()
            if (remaining == 0 && state == GateState.DRAINING) {
                drainSignal.complete(Unit)
            }
        }
    }
}
