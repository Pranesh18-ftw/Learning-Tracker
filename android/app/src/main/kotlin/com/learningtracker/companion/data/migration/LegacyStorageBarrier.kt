package com.learningtracker.companion.data.migration

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Barrier coordinating legacy writers during snapshot extraction and Room transaction cutover.
 */
class LegacyStorageBarrier {
    private val mutex = Mutex()

    suspend fun <T> withWriterLock(action: suspend () -> T): T = mutex.withLock {
        action()
    }
}
