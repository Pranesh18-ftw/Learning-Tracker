package com.learningtracker.companion.security

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Custom exception thrown when cryptographic operations fail.
 */
class SecureStorageException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Interface defining cryptographic operations for secure token storage.
 */
interface SecureCryptoEngine {
    fun encrypt(plaintext: ByteArray): ByteArray
    fun decrypt(ciphertextWithIv: ByteArray): ByteArray
}

/**
 * Production Android Keystore-backed AES-256-GCM encryption engine.
 * Generates and stores hardware/keystore-protected AES key.
 */
class AndroidKeyStoreCryptoEngine(
    private val keyAlias: String = "LearningTrackerDeviceCredentialKey"
) : SecureCryptoEngine {

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    private fun getOrCreateKey(): SecretKey {
        if (!keyStore.containsAlias(keyAlias)) {
            val keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE
            )
            val keyGenSpec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()

            keyGenerator.init(keyGenSpec)
            keyGenerator.generateKey()
        }
        val entry = keyStore.getEntry(keyAlias, null) as? KeyStore.SecretKeyEntry
            ?: throw SecureStorageException("Unable to retrieve SecretKeyEntry from AndroidKeyStore")
        return entry.secretKey
    }

    override fun encrypt(plaintext: ByteArray): ByteArray {
        try {
            val key = getOrCreateKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val iv = cipher.iv ?: throw SecureStorageException("Cipher generated null IV")
            val encryptedBytes = cipher.doFinal(plaintext)

            // Combined IV + ciphertext
            val combined = ByteArray(iv.size + encryptedBytes.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)
            return combined
        } catch (e: Exception) {
            throw SecureStorageException("Failed to encrypt device credential in AndroidKeyStore", e)
        }
    }

    override fun decrypt(ciphertextWithIv: ByteArray): ByteArray {
        try {
            if (ciphertextWithIv.size < GCM_IV_LENGTH) {
                throw SecureStorageException("Ciphertext payload too short to contain valid GCM IV")
            }
            val key = getOrCreateKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, ciphertextWithIv, 0, GCM_IV_LENGTH)
            cipher.init(Cipher.DECRYPT_MODE, key, spec)
            return cipher.doFinal(
                ciphertextWithIv,
                GCM_IV_LENGTH,
                ciphertextWithIv.size - GCM_IV_LENGTH
            )
        } catch (e: Exception) {
            throw SecureStorageException("Failed to decrypt device credential from AndroidKeyStore", e)
        }
    }

    fun removeKey() {
        try {
            if (keyStore.containsAlias(keyAlias)) {
                keyStore.deleteEntry(keyAlias)
            }
        } catch (ignored: Exception) {}
    }
}

/**
 * Pure JVM software AES-256-GCM crypto engine for local unit tests without AndroidKeyStore.
 */
class JvmTestCryptoEngine(
    seedSecret: ByteArray = ByteArray(32).apply { SecureRandom().nextBytes(this) }
) : SecureCryptoEngine {
    private val secretKey = SecretKeySpec(seedSecret, "AES")

    override fun encrypt(plaintext: ByteArray): ByteArray {
        val iv = ByteArray(12).apply { SecureRandom().nextBytes(this) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(plaintext)
        val combined = ByteArray(iv.size + encrypted.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(encrypted, 0, combined, iv.size, encrypted.size)
        return combined
    }

    override fun decrypt(ciphertextWithIv: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, ciphertextWithIv, 0, 12)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
        return cipher.doFinal(ciphertextWithIv, 12, ciphertextWithIv.size - 12)
    }
}

/**
 * SecureCredentialStore
 *
 * Protects device bearer tokens using AES-GCM encryption backed by AndroidKeyStore.
 * The raw token is NEVER written in plaintext to disk or logged.
 */
class SecureCredentialStore(
    context: Context,
    private val cryptoEngine: SecureCryptoEngine = AndroidKeyStoreCryptoEngine(),
    prefsName: String = "learningtracker_secure_credentials"
) {
    private val prefs: SharedPreferences = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ENCRYPTED_DEVICE_TOKEN = "enc_dev_tok"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_PAIRED_AT = "paired_at"
        private const val KEY_STATUS = "device_status" // "ACTIVE" | "REVOKED"
        private const val KEY_PROTOCOL_VERSION = "protocol_version"
        private const val KEY_SERVER_BASE_URL = "server_base_url"
    }

    /**
     * Persists the normalized server base URL that was used for pairing.
     */
    fun saveServerBaseUrl(url: String) {
        prefs.edit().putString(KEY_SERVER_BASE_URL, url.trim()).apply()
    }

    /**
     * Retrieves the stored server base URL, or null if none stored.
     */
    fun getServerBaseUrl(): String? = prefs.getString(KEY_SERVER_BASE_URL, null)

    /**
     * Securely encrypts and stores the device credential and associated metadata.
     */
    fun saveDeviceCredential(
        deviceId: String,
        deviceName: String,
        deviceToken: String,
        protocolVersion: String = "1.0.0",
        pairedAt: Long = System.currentTimeMillis()
    ) {
        require(deviceToken.isNotBlank()) { "deviceToken must not be blank" }
        require(deviceId.isNotBlank()) { "deviceId must not be blank" }

        val encryptedBytes = cryptoEngine.encrypt(deviceToken.toByteArray(Charsets.UTF_8))
        val encodedToken = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)

        prefs.edit()
            .putString(KEY_ENCRYPTED_DEVICE_TOKEN, encodedToken)
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_DEVICE_NAME, deviceName)
            .putString(KEY_STATUS, "ACTIVE")
            .putString(KEY_PROTOCOL_VERSION, protocolVersion)
            .putLong(KEY_PAIRED_AT, pairedAt)
            .apply()
    }

    /**
     * Decrypts and retrieves the raw device bearer token in memory.
     * Never logs the token.
     */
    fun getDeviceToken(): String? {
        val encoded = prefs.getString(KEY_ENCRYPTED_DEVICE_TOKEN, null) ?: return null
        return try {
            val encryptedBytes = Base64.decode(encoded, Base64.NO_WRAP)
            val decryptedBytes = cryptoEngine.decrypt(encryptedBytes)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            // If secure storage fails, report null and do not silently fall back to plaintext
            null
        }
    }

    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)
    fun getDeviceName(): String? = prefs.getString(KEY_DEVICE_NAME, null)
    fun getPairedAt(): Long = prefs.getLong(KEY_PAIRED_AT, 0L)
    fun getStatus(): String = prefs.getString(KEY_STATUS, "UNKNOWN") ?: "UNKNOWN"
    fun getProtocolVersion(): String = prefs.getString(KEY_PROTOCOL_VERSION, "1.0.0") ?: "1.0.0"

    fun isPaired(): Boolean {
        return getDeviceToken() != null && getDeviceId() != null && !isRevoked()
    }

    fun isRevoked(): Boolean {
        return getStatus() == "REVOKED"
    }

    fun markRevoked() {
        prefs.edit().putString(KEY_STATUS, "REVOKED").apply()
    }

    /**
     * Clears all stored credentials and metadata.
     */
    fun clearCredentials() {
        prefs.edit().clear().apply()
        if (cryptoEngine is AndroidKeyStoreCryptoEngine) {
            cryptoEngine.removeKey()
        }
    }
}
