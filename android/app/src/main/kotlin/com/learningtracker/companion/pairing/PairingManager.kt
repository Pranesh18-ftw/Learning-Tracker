package com.learningtracker.companion.pairing

import android.content.Context
import android.os.Build
import com.learningtracker.companion.model.DeviceAssociation
import com.learningtracker.companion.network.ApiResult
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.security.SecureCredentialStore
import java.util.UUID

sealed class PairingResult {
    data class Success(val association: DeviceAssociation) : PairingResult()
    data class Error(val code: String, val message: String) : PairingResult()
}

/**
 * PairingManager (Stage 2B)
 *
 * Manages device pairing to the Learning Tracker account.
 * Uses an application-generated random UUID device association ID (dev_...).
 * NEVER accesses or transmits persistent hardware IDs (IMEI, SIM serial, MAC address).
 * Authenticates with POST /api/v1/phone/pair/complete and stores token in AndroidKeyStore.
 */
class PairingManager(
    private val context: Context,
    val secureStore: SecureCredentialStore = SecureCredentialStore(context),
    val apiClient: PhoneApiClient = PhoneApiClient()
) {
    init {
        secureStore.getServerBaseUrl()?.let { savedUrl ->
            if (savedUrl.isNotBlank()) {
                apiClient.setBaseUrl(savedUrl)
            }
        }
    }

    fun isPaired(): Boolean = secureStore.isPaired()

    fun isRevoked(): Boolean = secureStore.isRevoked()

    fun markRevoked() {
        secureStore.markRevoked()
    }

    fun getDeviceAssociation(): DeviceAssociation? {
        val id = secureStore.getDeviceId() ?: return null
        val name = secureStore.getDeviceName() ?: Build.MODEL
        val pairedAt = secureStore.getPairedAt()
        return DeviceAssociation(id, name, pairedAccountEmail = null, pairedAt = pairedAt)
    }

    fun getDeviceToken(): String? = secureStore.getDeviceToken()

    /**
     * Executes authoritative pairing ceremony with server:
     * POST /api/v1/phone/pair/complete
     *
     * Never automatically retries to avoid exhausting single-use 6-digit codes.
     * Never logs pairing code or returned device token.
     */
    fun pairWithCode(
        pairingCode: String,
        customDeviceName: String? = null
    ): PairingResult {
        val sanitizedCode = pairingCode.trim()
        if (sanitizedCode.length != 6 || !sanitizedCode.all { it.isDigit() }) {
            return PairingResult.Error(
                code = "INVALID_PAIRING_CODE_FORMAT",
                message = "Pairing code must be exactly 6 digits."
            )
        }

        // Generate application-scoped random device ID (never hardware ID)
        val deviceId = "dev_" + UUID.randomUUID().toString().replace("-", "").take(16)
        val deviceName = customDeviceName?.trim()?.takeIf { it.isNotBlank() }
            ?: "${Build.MANUFACTURER} ${Build.MODEL}".trim()

        val apiResult = apiClient.completePairing(
            pairingCode = sanitizedCode,
            deviceId = deviceId,
            deviceName = deviceName,
            protocolVersion = "1.0.0",
            consentVersion = "1.0.0"
        )

        return when (apiResult) {
            is ApiResult.Success -> {
                val data = apiResult.data
                try {
                    // Securely store credentials in AndroidKeyStore
                    secureStore.saveDeviceCredential(
                        deviceId = data.deviceId,
                        deviceName = deviceName,
                        deviceToken = data.deviceToken,
                        protocolVersion = data.protocolVersion,
                        pairedAt = data.pairedAt
                    )
                    secureStore.saveServerBaseUrl(apiClient.getBaseUrl())
                    PairingResult.Success(
                        DeviceAssociation(
                            deviceAssociationId = data.deviceId,
                            deviceName = deviceName,
                            pairedAccountEmail = null,
                            pairedAt = data.pairedAt
                        )
                    )
                } catch (e: Exception) {
                    PairingResult.Error(
                        code = "SECURE_STORAGE_ERROR",
                        message = "Failed to store device credentials securely: ${e.message}"
                    )
                }
            }
            is ApiResult.Error -> {
                PairingResult.Error(
                    code = apiResult.code,
                    message = apiResult.message
                )
            }
        }
    }

    /**
     * Disconnects the device and clears all locally stored credentials and cryptographic keys.
     */
    fun unpair() {
        secureStore.clearCredentials()
    }
}
