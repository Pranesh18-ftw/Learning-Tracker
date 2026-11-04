package com.learningtracker.companion.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.learningtracker.companion.data.entity.FocusSessionEntity
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileInputStream

/**
 * On-disk persistent SQLCipher encryption acceptance test.
 * Verifies:
 * 1. Database creation with SQLCipher on-disk persistence
 * 2. Record insertion and transaction commitment
 * 3. Database closure
 * 4. Reopening with correct key and persistent data restoration
 * 5. Reopening with incorrect key and rejection/failure
 * 6. Proof of ciphertext on disk (absence of plaintext SQLite format 3 magic header)
 * 7. Active SQLCipher engine proof via PRAGMA cipher_version
 */
@RunWith(AndroidJUnit4::class)
class SqlCipherEncryptionIntegrationTest {

    private val dbName = "acceptance_encrypted.db"
    private lateinit var context: Context
    private val correctPassphrase = "correct_secure_passphrase_32_bytes!".toByteArray(Charsets.UTF_8)
    private val wrongPassphrase = "wrong_incorrect_passphrase_bytes!".toByteArray(Charsets.UTF_8)

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Context>()
        cleanDbFiles()
    }

    @After
    fun tearDown() {
        cleanDbFiles()
    }

    private fun cleanDbFiles() {
        try {
            context.deleteDatabase(dbName)
        } catch (ignored: Exception) {}
        val dbFile = context.getDatabasePath(dbName)
        if (dbFile.exists()) dbFile.delete()
        val walFile = File(dbFile.path + "-wal")
        if (walFile.exists()) walFile.delete()
        val shmFile = File(dbFile.path + "-shm")
        if (shmFile.exists()) shmFile.delete()
    }

    @Test
    fun test01_FullEncryptionLifecycle_OnDiskRecordVerification_And_CipherFailure() = runBlocking {
        val dbFile = context.getDatabasePath(dbName)

        // 1. Create encrypted database
        var db = EncryptedDatabaseProvider.createEncryptedDatabase(context, correctPassphrase, dbName)
        val dao = db.telemetryOutboxDao()

        // 2. Insert and commit a record
        val session = FocusSessionEntity(
            sessionId = "sess_encrypted_001",
            startedAt = 1700000000000L,
            intendedDurationSeconds = 1800L,
            taskName = "Writing Secure Core",
            subjectName = "Persistence",
            state = "RUNNING"
        )
        val rowId = dao.insertSessionIfMissing(session)
        assertTrue("Insert should return positive row id", rowId > 0)

        val inserted = dao.getSessionById("sess_encrypted_001")
        assertNotNull("Record should exist in memory/open session", inserted)
        assertEquals("Writing Secure Core", inserted!!.taskName)

        // 3. Close database
        db.close()

        // 4. Confirm the raw file exists and contains ciphertext (NOT plaintext SQLite)
        assertTrue("Database file should exist on disk", dbFile.exists())
        assertTrue("Database file should not be empty", dbFile.length() > 0)

        // Verify standard SQLite header magic string is NOT present
        val headerBytes = ByteArray(16)
        FileInputStream(dbFile).use { it.read(headerBytes) }
        val headerString = String(headerBytes, Charsets.US_ASCII)
        assertFalse(
            "Encrypted database must not have plaintext SQLite magic header 'SQLite format 3'",
            headerString.startsWith("SQLite format 3")
        )

        // Verify standard Android SQLite cannot open the file as plaintext
        try {
            val standardDb = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
            val cursor = standardDb.rawQuery("SELECT count(*) FROM focus_sessions", null)
            cursor.moveToFirst()
            cursor.close()
            standardDb.close()
            fail("Standard plaintext SQLite should fail to open an encrypted SQLCipher database")
        } catch (e: Exception) {
            // Expected: SQLiteDatabaseCorruptException or file is not a database
            assertTrue(
                "Standard SQLite should report file corruption or not a database: ${e.message}",
                e.message != null && (e.message!!.contains("not a database") || e.message!!.contains("corrupt"))
            )
        }

        // 5. Reopen with correct key and verify record
        db = EncryptedDatabaseProvider.createEncryptedDatabase(context, correctPassphrase, dbName)
        val reopenedDao = db.telemetryOutboxDao()
        val restored = reopenedDao.getSessionById("sess_encrypted_001")
        assertNotNull("Record must be readable when opened with correct key", restored)
        assertEquals("sess_encrypted_001", restored!!.sessionId)
        assertEquals("Writing Secure Core", restored.taskName)
        assertEquals("RUNNING", restored.state)
        db.close()

        // 6. Attempt reopening with incorrect key and verify failure
        val badDb = EncryptedDatabaseProvider.createEncryptedDatabase(context, wrongPassphrase, dbName)
        try {
            val badDao = badDb.telemetryOutboxDao()
            badDao.getSessionById("sess_encrypted_001")
            fail("Querying with incorrect key must throw authentication/corrupt exception")
        } catch (e: Exception) {
            // SQLCipher throws SQLiteDatabaseCorruptException or SQLiteException: file is not a database / authentication failure
            assertTrue(
                "Incorrect key must trigger database access failure: ${e.message}",
                e.message != null && (e.message!!.contains("not a database") || e.message!!.contains("corrupt") || e.message!!.contains("auth"))
            )
        } finally {
            try { badDb.close() } catch (ignored: Exception) {}
        }
    }

    @Test
    fun test02_ConfirmCipherVersionPragma() = runBlocking {
        val db = EncryptedDatabaseProvider.createEncryptedDatabase(context, correctPassphrase, dbName)
        val cursor = db.openHelper.readableDatabase.query("PRAGMA cipher_version;")
        try {
            assertTrue("cipher_version query must return at least one row", cursor.moveToFirst())
            val version = cursor.getString(0)
            assertNotNull("SQLCipher version must be non-null", version)
            assertTrue("SQLCipher version must start with 4 (e.g., 4.x.x)", version.startsWith("4."))
        } finally {
            cursor.close()
            db.close()
        }
    }
}
