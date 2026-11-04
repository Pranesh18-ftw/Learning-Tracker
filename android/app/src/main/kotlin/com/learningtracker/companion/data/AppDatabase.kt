package com.learningtracker.companion.data

import androidx.room.Database
import androidx.room.RoomDatabase
import com.learningtracker.companion.data.dao.TelemetryOutboxDao
import com.learningtracker.companion.data.entity.AppBreakdownEntity
import com.learningtracker.companion.data.entity.FocusSessionEntity
import com.learningtracker.companion.data.entity.LegacyMigrationLedgerEntity
import com.learningtracker.companion.data.entity.MigrationMetadataEntity
import com.learningtracker.companion.data.entity.TelemetrySummaryEntity
import com.learningtracker.companion.data.entity.TimelineIntervalEntity

@Database(
    entities = [
        FocusSessionEntity::class,
        TelemetrySummaryEntity::class,
        TimelineIntervalEntity::class,
        AppBreakdownEntity::class,
        LegacyMigrationLedgerEntity::class,
        MigrationMetadataEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun telemetryOutboxDao(): TelemetryOutboxDao
}
