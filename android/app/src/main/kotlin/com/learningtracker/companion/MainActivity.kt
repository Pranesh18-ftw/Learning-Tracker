package com.learningtracker.companion

import android.Manifest
import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.learningtracker.companion.model.CompanionState
import com.learningtracker.companion.model.MonitoringState
import com.learningtracker.companion.network.PhoneApiClient
import com.learningtracker.companion.pairing.PairingManager
import com.learningtracker.companion.pairing.PairingResult
import com.learningtracker.companion.service.FocusMonitoringService
import com.learningtracker.companion.sync.FocusIntegritySyncManager
import com.learningtracker.companion.sync.PollResult
import com.learningtracker.companion.ui.*
import com.learningtracker.companion.usage.UsageAccessHelper
import com.learningtracker.companion.util.CompanionPreferences
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class FocusIntegrityApplication : Application() {
    lateinit var pairingManager: PairingManager
    lateinit var syncManager: FocusIntegritySyncManager
    lateinit var preferences: CompanionPreferences
    lateinit var databaseAccessGate: com.learningtracker.companion.data.DatabaseAccessGate
    lateinit var storageBarrier: com.learningtracker.companion.data.migration.LegacyStorageBarrier
    lateinit var storageCoordinator: com.learningtracker.companion.data.migration.LegacyStorageCoordinator

    override fun onCreate() {
        super.onCreate()
        instance = this
        preferences = CompanionPreferences(this)
        pairingManager = PairingManager(this)

        storageBarrier = testStorageBarrier ?: com.learningtracker.companion.data.migration.LegacyStorageBarrier()
        databaseAccessGate = testDatabaseAccessGate ?: com.learningtracker.companion.data.DatabaseAccessGate {
            try {
                com.learningtracker.companion.data.EncryptedDatabaseProvider.createEncryptedDatabase(
                    this,
                    getOrCreateDatabasePassphrase()
                )
            } catch (_: Throwable) {
                com.learningtracker.companion.data.EncryptedDatabaseProvider.createInMemoryDatabase(this)
            }
        }
        storageCoordinator = testStorageCoordinator ?: com.learningtracker.companion.data.migration.LegacyStorageCoordinator(
            context = this,
            gate = databaseAccessGate,
            legacyBarrier = storageBarrier
        )

        // Confirm startup initializes routing from Room migration_metadata before accepting writes.
        kotlinx.coroutines.runBlocking {
            storageCoordinator.initializeRoutingMode()
            if (storageCoordinator.currentRoute.get() != com.learningtracker.companion.data.migration.StorageRoutingMode.ROOM_PRIMARY) {
                try {
                    val migrator = com.learningtracker.companion.data.migration.LegacyPreferencesMigrator(
                        context = this@FocusIntegrityApplication,
                        gate = databaseAccessGate,
                        coordinator = storageCoordinator,
                        legacyBarrier = storageBarrier
                    )
                    migrator.performMigration()
                } catch (e: Exception) {
                    android.util.Log.e("FocusIntegrityApp", "Legacy migration failed on startup", e)
                }
            }
        }

        syncManager = testSyncManager ?: FocusIntegritySyncManager(
            context = this,
            pairingManager = pairingManager,
            preferences = preferences,
            coordinator = storageCoordinator
        )

        // M2.4: Restore WorkManager background retry schedule on startup
        try {
            com.learningtracker.companion.work.OutboxRetryScheduler(this, gate = databaseAccessGate).scheduleNextAsync()
        } catch (e: Exception) {
            android.util.Log.e("FocusIntegrityApp", "Failed to restore outbox retry schedule", e)
        }

        // INVARIANT: Application initialization NEVER starts the foreground service.
        // Guarantees clean IDLE state on app launch and prevents indirect service starts during BOOT_COMPLETED.
    }

    private fun getOrCreateDatabasePassphrase(): ByteArray {
        val prefs = getSharedPreferences("learningtracker_db_sec", Context.MODE_PRIVATE)
        val existing = prefs.getString("db_key_b64", null)
        if (existing != null) {
            return android.util.Base64.decode(existing, android.util.Base64.NO_WRAP)
        }
        val bytes = ByteArray(32)
        java.security.SecureRandom().nextBytes(bytes)
        val encoded = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        prefs.edit().putString("db_key_b64", encoded).commit()
        return bytes
    }

    companion object {
        @Volatile
        private var instance: FocusIntegrityApplication? = null

        @Volatile
        internal var testSyncManager: FocusIntegritySyncManager? = null

        @Volatile
        internal var testPairingManager: PairingManager? = null

        @Volatile
        internal var testDatabaseAccessGate: com.learningtracker.companion.data.DatabaseAccessGate? = null

        @Volatile
        internal var testStorageBarrier: com.learningtracker.companion.data.migration.LegacyStorageBarrier? = null

        @Volatile
        internal var testStorageCoordinator: com.learningtracker.companion.data.migration.LegacyStorageCoordinator? = null

        fun getInstance(): FocusIntegrityApplication? = instance

        fun getSyncManager(context: Context): FocusIntegritySyncManager {
            testSyncManager?.let { return it }
            val app = (context as? FocusIntegrityApplication)
                ?: (context.applicationContext as? FocusIntegrityApplication)
                ?: instance
            return app?.syncManager
                ?: throw IllegalStateException("FocusIntegrityApplication is not initialized or accessible from Context")
        }

        fun getPairingManager(context: Context): PairingManager {
            testPairingManager?.let { return it }
            val app = (context as? FocusIntegrityApplication)
                ?: (context.applicationContext as? FocusIntegrityApplication)
                ?: instance
            return app?.pairingManager ?: PairingManager(context)
        }

        fun getStorageCoordinator(context: Context): com.learningtracker.companion.data.migration.LegacyStorageCoordinator {
            testStorageCoordinator?.let { return it }
            val app = (context as? FocusIntegrityApplication)
                ?: (context.applicationContext as? FocusIntegrityApplication)
                ?: instance
            return app?.storageCoordinator
                ?: throw IllegalStateException("FocusIntegrityApplication is not initialized or accessible from Context")
        }

        fun getRoomTelemetryStorage(context: Context): com.learningtracker.companion.data.RoomTelemetryStorage {
            return getStorageCoordinator(context).roomStorage
        }

        internal fun setTestInstance(
            app: FocusIntegrityApplication?,
            testManager: FocusIntegritySyncManager? = null,
            testPairing: PairingManager? = null
        ) {
            instance = app
            testSyncManager = testManager
            testPairingManager = testPairing
        }

        internal fun resetTestOverrides() {
            testSyncManager = null
            testPairingManager = null
            testDatabaseAccessGate = null
            testStorageBarrier = null
            testStorageCoordinator = null
            com.learningtracker.companion.work.TelemetryUploadWorker.resetTestOverrides()
        }
    }
}

class MainActivity : ComponentActivity() {

    private val app by lazy { application as FocusIntegrityApplication }
    private var pendingPairingToken by mutableStateOf<String?>(null)

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ ->
        // Triggers UI recomposition through lifecycle/state checks
    }

    private fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun isBatteryOptimizationIgnored(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return true
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    private fun requestIgnoreBatteryOptimization() {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        } catch (_: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            } catch (_: Exception) {}
        }
    }

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

        // Runtime request for notification permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission()) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            var currentScreen by remember { mutableStateOf("home") } // "home" | "privacy" | "replay" | "active"
            var hasUsageAccess by remember { mutableStateOf(UsageAccessHelper.hasUsageAccess(this)) }
            var isNotificationGranted by remember { mutableStateOf(hasNotificationPermission()) }
            var isBatteryIgnored by remember { mutableStateOf(isBatteryOptimizationIgnored()) }
            var isPaired by remember { mutableStateOf(app.pairingManager.isPaired()) }
            var isRevoked by remember { mutableStateOf(app.pairingManager.isRevoked()) }
            var activeSession by remember { mutableStateOf(app.syncManager.getActiveSession()) }
            var pendingUploadCount by remember { mutableStateOf(app.syncManager.storage.getPendingSummaries().size) }
            var lastSuccessfulUploadTime by remember { mutableStateOf(app.syncManager.getLastSuccessfulUploadTime()) }
            var isAutomaticTrackingEnabled by remember { mutableStateOf(app.preferences.isAutomaticTrackingEnabled) }
            val monitoringState by FocusMonitoringService.monitoringStateFlow.collectAsState()
            var lastError by remember { mutableStateOf<String?>(null) }
            var showPairingDialog by remember { mutableStateOf(false) }

            // Periodically refresh states while in foreground
            LaunchedEffect(Unit) {
                lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
                    // On resume: catch up on any sessions missed while backgrounded or offline
                    if (app.pairingManager.isPaired() && !app.pairingManager.isRevoked()) {
                        withContext(Dispatchers.IO) {
                            app.syncManager.performUnreconciledRecovery(force = true)
                        }
                    }

                    while (isActive) {
                        hasUsageAccess = UsageAccessHelper.hasUsageAccess(this@MainActivity)
                        isNotificationGranted = hasNotificationPermission()
                        isBatteryIgnored = isBatteryOptimizationIgnored()
                        isPaired = app.pairingManager.isPaired()
                        isRevoked = app.pairingManager.isRevoked()
                        isAutomaticTrackingEnabled = app.preferences.isAutomaticTrackingEnabled
                        pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                        lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()

                        if (isPaired && !isRevoked) {
                            val poll = withContext(Dispatchers.IO) {
                                app.syncManager.pollActiveSession()
                            }
                            when (poll) {
                                is PollResult.Active -> {
                                    activeSession = poll.session
                                    if (app.preferences.isAutomaticTrackingEnabled && !FocusMonitoringService.isRunning) {
                                        FocusMonitoringService.startForSession(this@MainActivity, poll.session)
                                    }
                                }
                                is PollResult.Completed -> {
                                    activeSession = null
                                    pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                                    lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()
                                }
                                is PollResult.Cancelled -> {
                                    activeSession = null
                                    FocusMonitoringService.stop(this@MainActivity)
                                }
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
                        delay(12000L) // Poll every 12 seconds while resumed
                    }
                }
            }

            val companionState = when {
                isRevoked -> CompanionState.REVOKED
                !isPaired -> CompanionState.NOT_PAIRED
                !hasUsageAccess -> CompanionState.PERMISSION_REQUIRED
                !isAutomaticTrackingEnabled -> CompanionState.MONITORING_DISABLED
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
                                        val active = app.syncManager.getActiveSession()
                                        if (active != null && app.preferences.isAutomaticTrackingEnabled) {
                                            FocusMonitoringService.startForSession(this@MainActivity, active)
                                        }
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
                                        val active = app.syncManager.getActiveSession()
                                        if (active != null && app.preferences.isAutomaticTrackingEnabled) {
                                            FocusMonitoringService.startForSession(this@MainActivity, active)
                                        }
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
                currentScreen == "active" && activeSession != null -> {
                    ActiveSessionScreen(
                        session = activeSession!!,
                        onEndSession = {
                            app.syncManager.onFocusEnded(activeSession!!.sessionId)
                            activeSession = null
                            currentScreen = "home"
                            pendingUploadCount = app.syncManager.storage.getPendingSummaries().size
                            lastSuccessfulUploadTime = app.syncManager.getLastSuccessfulUploadTime()
                        },
                        onDismissToHome = {
                            currentScreen = "home"
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
                        isAutomaticTrackingEnabled = isAutomaticTrackingEnabled,
                        onToggleAutomaticTracking = { enabled ->
                            isAutomaticTrackingEnabled = enabled
                            app.preferences.isAutomaticTrackingEnabled = enabled
                            if (enabled) {
                                val active = app.syncManager.getActiveSession()
                                if (active != null && app.pairingManager.isPaired() && !app.pairingManager.isRevoked()) {
                                    FocusMonitoringService.startForSession(this@MainActivity, active)
                                }
                            } else {
                                FocusMonitoringService.stop(this@MainActivity)
                            }
                        },
                        monitoringState = monitoringState,
                        hasNotificationPermission = isNotificationGranted,
                        onRequestNotificationPermission = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            }
                        },
                        isBatteryOptimizationIgnored = isBatteryIgnored,
                        onRequestIgnoreBatteryOptimization = {
                            requestIgnoreBatteryOptimization()
                        },
                        activeSession = activeSession,
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
                            FocusMonitoringService.stop(this@MainActivity)
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
        val active = app.syncManager.getActiveSession()
        if (active != null && app.pairingManager.isPaired() && !app.pairingManager.isRevoked() && app.preferences.isAutomaticTrackingEnabled) {
            FocusMonitoringService.startForSession(this, active)
        }
    }
}
