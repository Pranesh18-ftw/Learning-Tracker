package com.learningtracker.companion.network

import org.json.JSONArray
import org.json.JSONObject
import com.learningtracker.companion.model.FocusSessionContract
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sealed result for API operations.
 */
sealed class ApiResult<out T> {
    data class Success<out T>(val data: T, val statusCode: Int) : ApiResult<T>()
    data class Error(
        val code: String,
        val message: String,
        val statusCode: Int,
        val isTransient: Boolean = false
    ) : ApiResult<Nothing>()
}

data class PairingCompletionResponse(
    val success: Boolean,
    val deviceId: String,
    val deviceToken: String,
    val protocolVersion: String,
    val pairedAt: Long
)

data class ActiveSessionResponse(
    val status: String, // "ACTIVE_SESSION_FOUND" | "NO_ACTIVE_SESSION" | "AMBIGUOUS_ACTIVE_SESSIONS"
    val sessionId: String?,
    val startedAt: Long?,
    val intendedDurationSeconds: Long?,
    val taskName: String?,
    val subjectName: String?,
    val serverTime: Long
)

data class SessionStatusResponse(
    val success: Boolean,
    val sessionId: String,
    val status: String, // "RUNNING" | "COMPLETE" | "CANCELLED" | "SUPERSEDED"
    val startedAt: Long,
    val endedAt: Long?,
    val serverStartedAt: Long?,
    val serverEndedAt: Long?,
    val intendedDurationSeconds: Long,
    val taskName: String?,
    val subjectName: String?
)

data class TelemetrySubmissionResponse(
    val success: Boolean,
    val summaryId: String,
    val receivedAt: Long,
    val deliveryStatus: String,
    val idempotent: Boolean
)

data class AppBreakdownItem(
    val packageName: String,
    val category: String, // "reference" | "distraction" | "neutral" | "unknown"
    val durationSeconds: Long
)

data class TelemetrySummaryPayload(
    val summaryId: String,
    val deviceId: String,
    val sessionId: String,
    val windowStart: Long,
    val windowEnd: Long,
    val intendedSeconds: Long,
    val observedSeconds: Long,
    val interruptionCount: Int,
    val interruptionSeconds: Long,
    val referenceSeconds: Long,
    val distractionSeconds: Long,
    val longestUninterruptedSeconds: Long,
    val appBreakdown: List<AppBreakdownItem> = emptyList(),
    val consentVersion: String = "1.0.0",
    val schemaVersion: String = "1.0.0"
)

/**
 * Native HTTP client for Learning Tracker Netlify Functions API.
 * Uses standard HttpURLConnection without heavy third-party networking bloat.
 */
class PhoneApiClient(
    initialBaseUrl: String? = null
) {
    companion object {
        const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:8888/api/v1/phone" // Android emulator localhost
        const val CANONICAL_PRODUCTION_DOMAIN = "learningtracker001.netlify.app"
        const val CANONICAL_PRODUCTION_BASE_URL = "https://learningtracker001.netlify.app/api/v1/phone"
        const val API_PATH_SUFFIX = "/api/v1/phone"
        private const val CONNECT_TIMEOUT_MS = 10_000
        private const val READ_TIMEOUT_MS = 15_000

        /**
         * Validates whether an incoming scheme and host from an Android intent or pairing link
         * represents an authorized pairing origin.
         *
         * In production:
         * - Strictly requires HTTPS.
         * - Host must match canonical production domain (learningtracker001.netlify.app)
         *   or an explicitly configured host.
         * - Arbitrary external domains and insecure HTTP origins are strictly rejected.
         *
         * In debug:
         * - Also permits localhost / 127.0.0.1 / 10.0.2.2 over HTTP or HTTPS for development.
         */
        fun isAllowedPairingOrigin(
            scheme: String?,
            host: String?,
            isDebug: Boolean = false,
            allowedConfiguredHost: String? = null
        ): Boolean {
            if (scheme.isNullOrBlank() || host.isNullOrBlank()) return false
            val normalizedScheme = scheme.lowercase().trim()
            val normalizedHost = host.lowercase().trim()

            // Development localhost / emulator support (debug builds only)
            if (isDebug) {
                val isLocalHost = normalizedHost == "10.0.2.2" ||
                        normalizedHost == "localhost" ||
                        normalizedHost == "127.0.0.1"
                if (isLocalHost && (normalizedScheme == "http" || normalizedScheme == "https")) {
                    return true
                }
            }

            // Production strictly requires HTTPS
            if (normalizedScheme != "https") {
                return false
            }

            // Must match canonical production domain or explicitly configured host
            if (normalizedHost == CANONICAL_PRODUCTION_DOMAIN) {
                return true
            }

            if (!allowedConfiguredHost.isNullOrBlank() && normalizedHost == allowedConfiguredHost.lowercase().trim()) {
                return true
            }

            return false
        }


        /**
         * Normalizes any raw server or API URL so that it ends with '/api/v1/phone' exactly once.
         * Handles bare origins (https://app.com), root slashes (https://app.com/),
         * partial paths (https://app.com/api/v1), and full paths (https://app.com/api/v1/phone/).
         */
        fun normalizeApiUrl(rawUrl: String): String {
            var trimmed = rawUrl.trim()
            if (trimmed.isEmpty()) return ""
            while (trimmed.endsWith("/")) {
                trimmed = trimmed.substring(0, trimmed.length - 1).trim()
            }
            return when {
                trimmed.endsWith(API_PATH_SUFFIX) -> trimmed
                trimmed.endsWith("/api/v1") -> "$trimmed/phone"
                else -> "$trimmed$API_PATH_SUFFIX"
            }
        }

        /**
         * Resolves the default base URL based on build configuration and debug status.
         * In debug mode without a configured URL, safely falls back to emulator localhost.
         * In release mode without a configured URL, throws an explicit IllegalStateException.
         */
        fun resolveDefaultBaseUrl(
            configuredUrl: String? = null,
            isDebug: Boolean = false
        ): String {
            val candidate = configuredUrl?.trim().takeUnless { it.isNullOrEmpty() }
            if (candidate != null) {
                if (!isDebug) {
                    val uri = try {
                        java.net.URI(candidate)
                    } catch (e: Exception) {
                        throw IllegalArgumentException("Invalid production API base URL: '$candidate'", e)
                    }
                    val scheme = uri.scheme?.lowercase()
                    if (scheme != "https") {
                        throw IllegalArgumentException("Production API base URL must use HTTPS. Found '$scheme' in '$candidate'")
                    }
                    if (uri.host.isNullOrBlank()) {
                        throw IllegalArgumentException("Production API base URL must contain a valid host: '$candidate'")
                    }
                }
                return normalizeApiUrl(candidate)
            }
            if (isDebug) {
                return DEFAULT_EMULATOR_URL
            }
            throw IllegalStateException(
                "Missing release configuration: LEARNING_TRACKER_API_BASE_URL must be specified for release builds. Emulator localhost cannot be used in production."
            )
        }
    }

    private var baseUrl: String = resolveInitialBaseUrl(initialBaseUrl)

    private fun resolveInitialBaseUrl(explicitUrl: String?): String {
        if (!explicitUrl.isNullOrBlank()) {
            return normalizeApiUrl(explicitUrl)
        }
        val buildConfigUrl = try {
            val clazz = Class.forName("com.learningtracker.companion.BuildConfig")
            val field = clazz.getField("PHONE_API_BASE_URL")
            field.get(null) as? String
        } catch (_: Exception) {
            null
        }

        val isDebug = try {
            val clazz = Class.forName("com.learningtracker.companion.BuildConfig")
            val field = clazz.getField("DEBUG")
            field.getBoolean(null)
        } catch (_: Exception) {
            // JVM unit tests without Android BuildConfig default to debug
            true
        }

        return resolveDefaultBaseUrl(buildConfigUrl, isDebug)
    }

    fun setBaseUrl(url: String) {
        val trimmed = url.trim()
        if (trimmed.isNotEmpty()) {
            baseUrl = normalizeApiUrl(trimmed)
        }
    }

    fun getBaseUrl(): String = baseUrl

    /**
     * Completes device pairing ceremony.
     * POST /pair/complete
     */
    fun completePairing(
        pairingCode: String,
        deviceId: String,
        deviceName: String,
        protocolVersion: String = "1.0.0",
        consentVersion: String = "1.0.0"
    ): ApiResult<PairingCompletionResponse> {
        val url = "$baseUrl/pair/complete"
        val jsonBody = JSONObject().apply {
            put("pairingCode", pairingCode.trim())
            put("deviceId", deviceId)
            put("deviceName", deviceName)
            put("protocolVersion", protocolVersion)
            put("consent", JSONObject().apply {
                put("consentVersion", consentVersion)
                val catArray = JSONArray().apply {
                    put("reference")
                    put("distraction")
                    put("neutral")
                    put("unknown")
                }
                put("categories", catArray)
            })
        }

        return executeRequest("POST", url, jsonBody.toString(), token = null) { responseJson, _ ->
            val success = responseJson.optBoolean("success", false)
            val devId = responseJson.optString("deviceId", deviceId)
            val devToken = responseJson.optString("deviceToken", responseJson.optString("deviceCredential", ""))
            val proto = responseJson.optString("protocolVersion", protocolVersion)
            val pairedAt = responseJson.optLong("pairedAt", System.currentTimeMillis())

            if (devToken.isBlank()) {
                throw IllegalStateException("Server did not return device token")
            }

            PairingCompletionResponse(
                success = success,
                deviceId = devId,
                deviceToken = devToken,
                protocolVersion = proto,
                pairedAt = pairedAt
            )
        }
    }

    /**
     * Polls active focus session.
     * GET /focus-session/active
     */
    fun getActiveSession(deviceToken: String): ApiResult<ActiveSessionResponse> {
        val url = "$baseUrl/focus-session/active"
        return executeRequest("GET", url, body = null, token = deviceToken) { responseJson, _ ->
            val status = responseJson.optString("status", "NO_ACTIVE_SESSION")
            val serverTime = responseJson.optLong("serverTime", System.currentTimeMillis())

            val activeObj = responseJson.optJSONObject("activeSession") ?: responseJson.optJSONObject("session")
            if (activeObj != null) {
                ActiveSessionResponse(
                    status = status,
                    sessionId = if (activeObj.has("sessionId") && !activeObj.isNull("sessionId")) activeObj.optString("sessionId") else null,
                    startedAt = if (activeObj.has("startedAt") && !activeObj.isNull("startedAt")) activeObj.optLong("startedAt") else null,
                    intendedDurationSeconds = if (activeObj.has("intendedDurationSeconds") && !activeObj.isNull("intendedDurationSeconds")) activeObj.optLong("intendedDurationSeconds") else null,
                    taskName = if (activeObj.has("taskName") && !activeObj.isNull("taskName")) activeObj.optString("taskName") else null,
                    subjectName = if (activeObj.has("subjectName") && !activeObj.isNull("subjectName")) activeObj.optString("subjectName") else null,
                    serverTime = serverTime
                )
            } else {
                ActiveSessionResponse(
                    status = status,
                    sessionId = null,
                    startedAt = null,
                    intendedDurationSeconds = null,
                    taskName = null,
                    subjectName = null,
                    serverTime = serverTime
                )
            }
        }
    }

    /**
     * Discovers authoritative status and exact start/end timestamps of a specific session.
     * GET /focus-sessions/:sessionId/status
     */
    fun getSessionStatus(sessionId: String, deviceToken: String): ApiResult<SessionStatusResponse> {
        val url = "$baseUrl/focus-sessions/$sessionId/status"
        return executeRequest("GET", url, body = null, token = deviceToken) { responseJson, _ ->
            SessionStatusResponse(
                success = responseJson.optBoolean("success", true),
                sessionId = responseJson.optString("sessionId", sessionId),
                status = responseJson.optString("status", "RUNNING"),
                startedAt = responseJson.optLong("startedAt", 0L),
                endedAt = if (responseJson.has("endedAt") && !responseJson.isNull("endedAt")) responseJson.optLong("endedAt") else null,
                serverStartedAt = if (responseJson.has("serverStartedAt") && !responseJson.isNull("serverStartedAt")) responseJson.optLong("serverStartedAt") else null,
                serverEndedAt = if (responseJson.has("serverEndedAt") && !responseJson.isNull("serverEndedAt")) responseJson.optLong("serverEndedAt") else null,
                intendedDurationSeconds = responseJson.optLong("intendedDurationSeconds", 1500L),
                taskName = if (responseJson.has("taskName") && !responseJson.isNull("taskName")) responseJson.optString("taskName") else null,
                subjectName = if (responseJson.has("subjectName") && !responseJson.isNull("subjectName")) responseJson.optString("subjectName") else null
            )
        }
    }

    /**
     * Queries recently completed focus sessions that lack companion telemetry.
     * GET /focus-sessions/unreconciled
     */
    fun getUnreconciledSessions(deviceToken: String, limit: Int = 5): ApiResult<List<FocusSessionContract>> {
        val url = "$baseUrl/focus-sessions/unreconciled?limit=$limit"
        return executeRequest("GET", url, body = null, token = deviceToken) { responseJson, _ ->
            val sessionsArray = responseJson.optJSONArray("sessions") ?: JSONArray()
            val list = mutableListOf<FocusSessionContract>()
            for (i in 0 until sessionsArray.length()) {
                val obj = sessionsArray.optJSONObject(i) ?: continue
                list.add(
                    FocusSessionContract(
                        sessionId = obj.optString("sessionId", "unknown_sess"),
                        startedAt = obj.optLong("startedAt", 0L),
                        intendedDurationSeconds = obj.optLong("intendedDurationSeconds", 1500L),
                        taskName = if (obj.has("taskName") && !obj.isNull("taskName")) obj.optString("taskName") else null,
                        subjectName = if (obj.has("subjectName") && !obj.isNull("subjectName")) obj.optString("subjectName") else null,
                        state = obj.optString("status", "COMPLETE")
                    )
                )
            }
            list
        }
    }

    /**
     * Submits a completed focus window summary.
     * POST /telemetry-summaries
     */
    fun submitTelemetrySummary(
        payload: TelemetrySummaryPayload,
        deviceToken: String
    ): ApiResult<TelemetrySubmissionResponse> {
        val url = "$baseUrl/telemetry-summaries"

        val activitySummaryJson = JSONObject().apply {
            put("intendedSeconds", payload.intendedSeconds)
            put("observedSeconds", payload.observedSeconds)
            put("interruptionCount", payload.interruptionCount)
            put("interruptionSeconds", payload.interruptionSeconds)
            put("referenceSeconds", payload.referenceSeconds)
            put("distractionSeconds", payload.distractionSeconds)
            put("longestUninterruptedSeconds", payload.longestUninterruptedSeconds)

            val breakdownArray = JSONArray()
            payload.appBreakdown.take(50).forEach { item ->
                breakdownArray.put(JSONObject().apply {
                    put("packageName", item.packageName)
                    put("category", item.category.lowercase())
                    put("durationSeconds", item.durationSeconds)
                })
            }
            put("appBreakdown", breakdownArray)
        }

        val observedWindowJson = JSONObject().apply {
            put("startedAt", payload.windowStart)
            put("endedAt", payload.windowEnd)
        }

        val rootJson = JSONObject().apply {
            put("schemaVersion", payload.schemaVersion)
            put("summaryId", payload.summaryId)
            put("deviceId", payload.deviceId)
            put("sessionId", payload.sessionId)
            put("observedWindow", observedWindowJson)
            put("activitySummary", activitySummaryJson)
            put("consentVersion", payload.consentVersion)
        }

        return executeRequest("POST", url, rootJson.toString(), token = deviceToken) { responseJson, _ ->
            TelemetrySubmissionResponse(
                success = responseJson.optBoolean("success", true),
                summaryId = responseJson.optString("summaryId", payload.summaryId),
                receivedAt = responseJson.optLong("receivedAt", System.currentTimeMillis()),
                deliveryStatus = responseJson.optString("deliveryStatus", responseJson.optString("status", "ACCEPTED")),
                idempotent = responseJson.optBoolean("idempotent", false)
            )
        }
    }

    /**
     * Generic HTTP request runner with defensive stream handling and error mapping.
     */
    private fun <T> executeRequest(
        method: String,
        urlString: String,
        body: String?,
        token: String?,
        parser: (JSONObject, Int) -> T
    ): ApiResult<T> {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                useCaches = false
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                if (token != null) {
                    setRequestProperty("Authorization", "Bearer $token")
                }
                if (body != null) {
                    doOutput = true
                }
            }

            if (body != null) {
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body)
                    writer.flush()
                }
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299

            val inputStream = if (isSuccess) connection.inputStream else connection.errorStream
            val rawResponse = inputStream?.let { stream ->
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
            } ?: "{}"

            val json = try {
                JSONObject(rawResponse)
            } catch (e: Exception) {
                JSONObject().apply { put("raw", rawResponse) }
            }

            return if (isSuccess) {
                val data = parser(json, statusCode)
                ApiResult.Success(data, statusCode)
            } else {
                val errorCode = json.optString("code", "HTTP_$statusCode")
                val errorMessage = json.optString("error", json.optString("message", "Request failed with HTTP $statusCode"))
                val isTransient = statusCode == 429 || statusCode in 500..599
                ApiResult.Error(
                    code = errorCode,
                    message = errorMessage,
                    statusCode = statusCode,
                    isTransient = isTransient
                )
            }
        } catch (e: Exception) {
            return ApiResult.Error(
                code = "NETWORK_ERROR",
                message = e.message ?: "Failed to connect to server",
                statusCode = 0,
                isTransient = true
            )
        } finally {
            connection?.disconnect()
        }
    }
}
