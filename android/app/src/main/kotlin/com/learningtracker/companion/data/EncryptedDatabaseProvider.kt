package com.learningtracker.companion.data

import android.content.Context
import androidx.room.Room
import androidx.room.RoomDatabase
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory

object EncryptedDatabaseProvider {

    fun createEncryptedDatabase(
        context: Context,
        passphraseBytes: ByteArray,
        dbName: String = "learningtracker_durable.db"
    ): AppDatabase {
        System.loadLibrary("sqlcipher")

        val factory = SupportOpenHelperFactory(
            passphraseBytes,
            null, // SQLiteDatabaseHook
            true  // enableWriteAheadLogging
        )

        return Room.databaseBuilder(
            context.applicationContext,
            AppDatabase::class.java,
            dbName
        )
            .openHelperFactory(factory)
            .setJournalMode(RoomDatabase.JournalMode.WRITE_AHEAD_LOGGING)
            .build()
    }

    fun createInMemoryDatabase(context: Context): AppDatabase {
        return Room.inMemoryDatabaseBuilder(
            context.applicationContext,
            AppDatabase::class.java
        )
            .allowMainThreadQueries()
            .build()
    }
}
