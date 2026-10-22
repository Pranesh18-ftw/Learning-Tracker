package com.learningtracker.companion

import android.app.Application
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.learningtracker.companion.model.CompanionState
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.pairing.PairingResult
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import com.learningtracker.companion.sync.PollResult
import com.learningtracker.companion.ui.*
import com.learningtracker.companion.usage.UsageAccessHelper
import java.net.URL
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class FocusIntegrityApplication : Application() {
    lateinit var pairingManager: PairingManager
    lateinit var syncManager: FocusIntegritySyncManager

    override fun onCreate() {
        super.onCreate()
        pairingManager = PairingManager(this)
        syncManager = FocusIntegritySyncManager(
            context = this,
            pairingManager = pairingManager
        )
    }
}

class MainActivity : ComponentActivity() {

    private val app by lazy { application as FocusIntegrityApplication }
    private var pendingPairingToken by mutableStateOf<String?>(null)

    private fun extractTokenFromIntent(intent: Intent?): String? {
        val data = intent?.data ?: return null
        val scheme = data.scheme
        val host = data.host

        val isDebug = BuildConfig.DEBUG
        val configuredHost = try {
            val configured = URL(app.pairingManager.apiClient.getBaseUrl())
            configured.host
        } catch (_: Exception) {
            null
        }

        if (!PhoneApiClient.isAllowedPairingOrigin(scheme, host, isDebug, configuredHost)) {
            return null
        }

        if (!scheme.isNullOrBlank() && !host.isNullOrBlank()) {
            val portPart = if (data.port != -1 && data.port != 80 && data.port != 443) ":${data.port}" else ""
            val dynamicBase = "$scheme://$host$portPart"
            app.pairingManager.apiClient.setBaseUrl(dynamicBase)
        }
        val path = data.path ?: return null
        if (path.startsWith("/connect") || path.startsWith("/pair")) {
            val codeParam = data.getQueryParameter("code")
            return codeParam ?: data.lastPathSegment?.takeIf { it != "connect" && it != "pair" }
        }
        return null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingPairingToken = extractTokenFromIntent(intent)

        setContent {
            var currentScreen by remember { mutableStateOf("home") } // "home" | "privacy" | "replay"
            var hasUsageAccess by remember { mutableStateOf(UsageAccessHelper.hasUsageAccess(this)) }
            var isPaired by remember { mutableStateOf(app.pairingManager.isPaired()) }
            var isRevoked by remember { mutableStateOf(app.pairingManager.isRevoked()) }
            var activeSession by remember { mutableStateOf(app.syncManager.getActiveSession()) }
            var pendingUploadCount by remember { mutableStateOf(app.syncManager.storage.getPendingSummaries().size) }
            var lastSuccessfulUploadTime by remember { mutableStateOf(app.syncManager.getLastSuccessfulUploadTime()) }
            var lastError by remember { mutableStateOf<String?>(null) }
            var showPairingDialog by remember { mutableStateOf(false) }

            // Periodically refresh states while in foreground
            LaunchedEffect(Unit) {
                lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
                    // On resume / reconnection: recover any sessions missed while backgrounded
                    if (app.pairingManager.isPaired() && !app.pairingManager.isRevoked()) {
                        withContext(Dispatchers.IO) {
                            app.syncManager.performUnreconciledRecovery(force = true)
                        }
                    }

                    while (isActive) {
                        hasUsageAccess = UsageAccessHelper.hasUsageAccess(this@MainActivity)
                        isPaired = app.pairingManager.isPaired()
                        isRevoked = app.pairingManager.isRevoked()
                        pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                        lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()

                        if (isPaired && !isRevoked) {
                            val poll = withContext(Dispatchers.IO) {
                                app.syncManager.pollActiveSession()
                            }
                            when (poll) {
                                is PollResult.Active -> activeSession = poll.session
                                is PollResult.Completed -> {
                                    activeSession = null
                                    pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                                    lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()
                                }
                                is PollResult.Cancelled -> activeSession = null
                                is PollResult.Revoked -> {
                                    isRevoked = true
                                    isPaired = false
                                    lastError = "Device has been revoked on server."
                                }
                                is PollResult.Error -> {
                                    lastError = poll.message
                                }
                                PollResult.Idle -> {
                                    activeSession = null
                                }
                            }
                        }
                        delay(15000L) // Poll every 15 seconds while resumed
                    }
                }
            }

            val companionState = when {
                isRevoked -> CompanionState.REVOKED
                !isPaired -> CompanionState.NOT_PAIRED
                !hasUsageAccess -> CompanionState.PERMISSION_REQUIRED
                activeSession != null -> CompanionState.ACTIVE_SESSION
                pendingUploadCount > 0 -> CompanionState.UPLOAD_PENDING
                else -> CompanionState.CONNECTED
            }

            if (showPairingDialog) {
                PairingInputDialog(
                    onDismiss = { showPairingDialog = false },
                    onSubmitCode = { code ->
                        showPairingDialog = false
                        lifecycleScope.launch(Dispatchers.IO) {
                            val res = app.pairingManager.pairWithCode(code)
                            withContext(Dispatchers.Main) {
                                when (res) {
                                    is PairingResult.Success -> {
                                        isPaired = true
                                        isRevoked = false
                                        lastError = null
                                    }
                                    is PairingResult.Error -> {
                                        lastError = "${res.code}: ${res.message}"
                                    }
                                }
                            }
                            if (res is PairingResult.Success) {
                                app.syncManager.pollActiveSession()
                            }
                        }
                    }
                )
            }

            // Screen navigation router
            when {
                pendingPairingToken != null -> {
                    PairingConfirmationScreen(
                        pairingToken = pendingPairingToken!!,
                        accountIdentifier = "Authenticated User",
                        deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                        onConfirm = {
                            val token = pendingPairingToken!!
                            pendingPairingToken = null
                            lifecycleScope.launch(Dispatchers.IO) {
                                val res = app.pairingManager.pairWithCode(token)
                                withContext(Dispatchers.Main) {
                                    if (res is PairingResult.Success) {
                                        isPaired = true
                                        isRevoked = false
                                        lastError = null
                                    } else if (res is PairingResult.Error) {
                                        lastError = "${res.code}: ${res.message}"
                                    }
                                }
                            }
                        },
                        onCancel = {
                            pendingPairingToken = null
                        }
                    )
                }
                currentScreen == "privacy" -> {
                    PrivacyNoticeScreen(
                        onClose = { currentScreen = "home" },
                        onClearTelemetry = {
                            app.syncManager.clearPendingTelemetry()
                            pendingUploadCount = 0
                        }
                    )
                }
                currentScreen == "replay" -> {
                    EventReplayTesterScreen(onClose = { currentScreen = "home" })
                }
                activeSession != null -> {
                    ActiveSessionScreen(
                        session = activeSession!!,
                        onEndSession = {
                            app.syncManager.onFocusEnded(activeSession!!.sessionId)
                            activeSession = null
                            pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                            lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()
                        }
                    )
                }
                else -> {
                    HomeScreen(
                        state = companionState,
                        device = app.pairingManager.getDeviceAssociation(),
                        hasUsageAccess = hasUsageAccess,
                        pendingUploadCount = pendingUploadCount,
                        lastSuccessfulUploadTime = lastSuccessfulUploadTime,
                        lastError = lastError,
                        onGrantUsageAccess = {
                            startActivity(UsageAccessHelper.createUsageAccessIntent())
                        },
                        onOpenPairingDialog = {
                            showPairingDialog = true
                        },
                        onRetryUploads = {
                            lifecycleScope.launch {
                                val batch = app.syncManager.uploadPendingSummaries()
                                pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                                lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()
                                if (batch.errors.isNotEmpty()) {
                                    lastError = batch.errors.first()
                                } else {
                                    lastError = null
                                }
                            }
                        },
                        onUnpair = {
                            app.pairingManager.unpair()
                            isPaired = false
                            activeSession = null
                            lastError = null
                        },
                        onClearTelemetry = {
                            app.syncManager.clearPendingTelemetry()
                            pendingUploadCount = 0
                        },
                        onOpenPrivacy = {
                            currentScreen = "privacy"
                        },
                        onOpenReplayDevTool = {
                            currentScreen = "replay"
                        }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractTokenFromIntent(intent)?.let { token ->
            pendingPairingToken = token
        }
    }

    override fun onResume() {
        super.onResume()
        // Re-check access when user returns from system Settings
    }
}
