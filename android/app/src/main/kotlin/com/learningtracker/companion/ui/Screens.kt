package com.learningtracker.companion.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.learningtracker.companion.model.CompanionState
import com.learningtracker.companion.model.DeviceAssociation
import com.learningtracker.companion.model.FocusSessionContract
import com.learningtracker.companion.model.FocusSummary
import com.learningtracker.companion.tracker.EventReplayEngine
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * ── 1. HOME SCREEN (Stage 2B Part 16) ──
 */
@Composable
fun HomeScreen(
    state: CompanionState,
    device: DeviceAssociation?,
    hasUsageAccess: Boolean,
    pendingUploadCount: Int = 0,
    lastSuccessfulUploadTime: Long = 0L,
    lastError: String? = null,
    onGrantUsageAccess: () -> Unit,
    onOpenPairingDialog: () -> Unit,
    onRetryUploads: () -> Unit,
    onUnpair: () -> Unit,
    onClearTelemetry: () -> Unit,
    onOpenPrivacy: () -> Unit,
    onOpenReplayDevTool: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "LEARNING TRACKER",
                color = Color(0xFF64748B),
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                fontFamily = FontFamily.Monospace
            )

            Spacer(modifier = Modifier.height(14.dp))

            // State Pill
            val isReady = state == CompanionState.CONNECTED || state == CompanionState.MONITORING_ACTIVE || state == CompanionState.READY
            val isWarning = state == CompanionState.PERMISSION_REQUIRED || state == CompanionState.UPLOAD_PENDING || state == CompanionState.NOT_PAIRED
            val stateColor = when {
                isReady -> Color(0xFF10B981)
                state == CompanionState.ERROR || state == CompanionState.REVOKED -> Color(0xFFEF4444)
                else -> Color(0xFFF59E0B)
            }

            Surface(
                color = stateColor.copy(alpha = 0.15f),
                shape = RoundedCornerShape(100.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, stateColor)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(stateColor, shape = RoundedCornerShape(100.dp))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = state.name.replace("_", " "),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Tactile Info Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    InfoRow(
                        label = "Device Status",
                        value = if (device != null) "Paired (${device.deviceName})" else "Not Paired",
                        valueColor = if (device != null) Color(0xFF10B981) else Color(0xFF94A3B8)
                    )
                    if (device != null) {
                        InfoRow(
                            label = "Device ID",
                            value = device.deviceAssociationId.take(16) + "...",
                            valueColor = Color(0xFFA5B4FC)
                        )
                    }
                    InfoRow(
                        label = "Usage Access",
                        value = if (hasUsageAccess) "✓ Granted" else "✕ Action Required",
                        valueColor = if (hasUsageAccess) Color(0xFF10B981) else Color(0xFFEF4444)
                    )
                    InfoRow(
                        label = "Pending Uploads",
                        value = "$pendingUploadCount item(s)",
                        valueColor = if (pendingUploadCount > 0) Color(0xFFF59E0B) else Color(0xFF94A3B8)
                    )
                    if (lastSuccessfulUploadTime > 0L) {
                        val formattedDate = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(lastSuccessfulUploadTime))
                        InfoRow(label = "Last Server Ingest", value = formattedDate)
                    }
                    InfoRow(label = "Monitoring Policy", value = "Session-Bounded (No Background Drain)")
                }
            }

            if (lastError != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Surface(
                    color = Color(0x22EF4444),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x66EF4444)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = lastError, color = Color(0xFFFCA5A5), fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (!hasUsageAccess) {
                Button(
                    onClick = onGrantUsageAccess,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text("Grant Usage Access", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(12.dp))
            } else if (device == null) {
                Button(
                    onClick = onOpenPairingDialog,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Icon(imageVector = Icons.Default.Link, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Pair with Learning Tracker", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(12.dp))
            } else if (pendingUploadCount > 0) {
                Button(
                    onClick = onRetryUploads,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(50.dp)
                ) {
                    Icon(imageVector = Icons.Default.Sync, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Retry Upload ($pendingUploadCount pending)", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }

        // Secondary / Privacy Controls
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextButton(onClick = onOpenPrivacy) {
                Text("Privacy & Data Guarantees", color = Color(0xFF94A3B8), fontSize = 12.sp)
            }
            TextButton(onClick = onOpenReplayDevTool) {
                Text("Developer Event Replay Tool", color = Color(0xFF64748B), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
            }
            if (device != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    TextButton(onClick = onClearTelemetry) {
                        Text("Clear Local Telemetry", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    }
                    TextButton(onClick = onUnpair) {
                        Text("Disconnect Device", color = Color(0xFFEF4444), fontSize = 11.sp)
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/**
 * ── 2. PAIRING INPUT DIALOG (Stage 2B Part 3) ──
 */
@Composable
fun PairingInputDialog(
    onDismiss: () -> Unit,
    onSubmitCode: (String) -> Unit
) {
    var code by remember { mutableStateOf("") }
    var inputError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF111827),
        title = {
            Text("Enter Pairing Code", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Look at the Learning Tracker web application under Device Management to generate a 6-digit pairing code.",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )

                OutlinedTextField(
                    value = code,
                    onValueChange = {
                        if (it.length <= 6) {
                            code = it.filter { char -> char.isDigit() }
                            inputError = null
                        }
                    },
                    label = { Text("6-Digit Code") },
                    placeholder = { Text("489123") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF3B82F6),
                        unfocusedBorderColor = Color(0xFF374151)
                    )
                )

                if (inputError != null) {
                    Text(text = inputError!!, color = Color(0xFFEF4444), fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (code.length == 6) {
                        onSubmitCode(code)
                    } else {
                        inputError = "Please enter all 6 digits."
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
            ) {
                Text("Pair Device")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color(0xFF94A3B8))
            }
        }
    )
}

/**
 * ── 3. ACTIVE SESSION SCREEN ──
 */
@Composable
fun ActiveSessionScreen(
    session: FocusSessionContract,
    onEndSession: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "FOCUS ACTIVE",
                color = Color(0xFFF97316),
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                fontFamily = FontFamily.Monospace
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = session.taskName ?: "Deep Engineering Focus",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            if (session.subjectName != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = session.subjectName,
                    color = Color(0xFF94A3B8),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(Color(0xFF1E293B), shape = RoundedCornerShape(32.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = null,
                    tint = Color(0xFF38BDF8),
                    modifier = Modifier.size(56.dp)
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "Observation Active",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Tracking focus window [${session.intendedDurationSeconds / 60}m intended]. Put your phone aside to preserve focus flow.",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        Button(
            onClick = onEndSession,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            Text("Conclude Focus Locally", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

/**
 * ── 4. PRIVACY GUARANTEE SCREEN (Stage 2B Part 13) ──
 */
@Composable
fun PrivacyNoticeScreen(
    onClose: () -> Unit,
    onClearTelemetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
    ) {
        IconButton(onClick = onClose) {
            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color.White)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "FOCUS INTEGRITY PRIVACY",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black
        )

        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Local-first, truthful measurement without surveillance.",
            color = Color(0xFF94A3B8),
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(28.dp))

        Text("DATA TRANSMITTED ONLY FOR CONCLUDED FOCUS SESSIONS:", color = Color(0xFF10B981), fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(modifier = Modifier.height(8.dp))
        PrivacyItem(icon = "✓", label = "Session window boundaries (startedAt, endedAt)")
        PrivacyItem(icon = "✓", label = "Observed app transitions and duration during session")
        PrivacyItem(icon = "✓", label = "Categorized interruption count (Reference vs Distraction vs Unknown)")
        PrivacyItem(icon = "✓", label = "Longest uninterrupted stretch")
        PrivacyItem(icon = "✓", label = "High-entropy random device ID (never hardware IMEI/MAC)")

        Spacer(modifier = Modifier.height(28.dp))

        Text("DATA STRICTLY EXCLUDED & NEVER COLLECTED:", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(modifier = Modifier.height(8.dp))
        PrivacyItem(icon = "✕", label = "Messages, SMS, or notification contents")
        PrivacyItem(icon = "✕", label = "Keystrokes, text inputs, or passwords")
        PrivacyItem(icon = "✕", label = "Screenshots or screen pixel capture")
        PrivacyItem(icon = "✕", label = "Microphone audio or camera video")
        PrivacyItem(icon = "✕", label = "Clipboard contents")
        PrivacyItem(icon = "✕", label = "Location, GPS, or Wi-Fi scan results")
        PrivacyItem(icon = "✕", label = "Hardware identifiers (IMEI, SIM serial, MAC)")

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedButton(
            onClick = {
                onClearTelemetry()
                onClose()
            },
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Purge Local Telemetry Queue")
        }

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = onClose,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Done")
        }
    }
}

/**
 * ── 5. EVENT REPLAY DEV TESTER ──
 */
@Composable
fun EventReplayTesterScreen(
    onClose: () -> Unit
) {
    val replayEngine = remember { EventReplayEngine() }
    var testResult by remember { mutableStateOf<FocusSummary?>(null) }

    val sampleFixture = """
        [
          {"type": "ACTIVITY_RESUMED", "package": "com.android.chrome", "timestamp": 1000},
          {"type": "ACTIVITY_PAUSED", "package": "com.android.chrome", "timestamp": 4000},
          {"type": "ACTIVITY_RESUMED", "package": "com.instagram.android", "timestamp": 8000},
          {"type": "ACTIVITY_PAUSED", "package": "com.instagram.android", "timestamp": 14000}
        ]
    """.trimIndent()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
    ) {
        IconButton(onClick = onClose) {
            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color.White)
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "EVENT REPLAY HARNESS",
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace
        )

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Sample JSON Fixture (Chrome 3s Reference, Instagram 6s Distraction):",
            color = Color(0xFF94A3B8),
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = {
                testResult = replayEngine.replayFromJson(sampleFixture, 0L, 20000L)
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Run Replay Simulation")
        }

        if (testResult != null) {
            Spacer(modifier = Modifier.height(20.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("REPLAY OUTPUT:", color = Color(0xFF10B981), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("• Observed Window: ${testResult!!.observedWindowSeconds}s", color = Color.White, fontSize = 12.sp)
                    Text("• Interruption Count: ${testResult!!.interruptionCount}", color = Color.White, fontSize = 12.sp)
                    Text("• Reference Seconds: ${testResult!!.referenceSeconds}s (Chrome)", color = Color.White, fontSize = 12.sp)
                    Text("• Distraction Seconds: ${testResult!!.distractionSeconds}s (Instagram)", color = Color.White, fontSize = 12.sp)
                    Text("• Longest Uninterrupted: ${testResult!!.longestUninterruptedSeconds}s", color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}

/**
 * ── 6. PAIRING CONFIRMATION SCREEN ──
 */
@Composable
fun PairingConfirmationScreen(
    pairingToken: String,
    accountIdentifier: String,
    deviceName: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit
) {
    var confirmed by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "LEARNING TRACKER",
                color = Color(0xFF64748B),
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                fontFamily = FontFamily.Monospace
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = if (confirmed) "✓ Phone Connected" else "Connect this phone?",
                color = if (confirmed) Color(0xFF10B981) else Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (confirmed) "This device is now paired as a quiet focus companion." else "Associate this device with your Learning Tracker account to provide Focus Integrity observation.",
                color = Color(0xFF94A3B8),
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                InfoRow(label = "Account", value = accountIdentifier)
                InfoRow(label = "Device", value = deviceName)
                InfoRow(label = "Token Status", value = "Verified", valueColor = Color(0xFF10B981))
                InfoRow(label = "Security", value = "Scoped credential, Keystore encrypted")
            }
        }

        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (!confirmed) {
                Button(
                    onClick = {
                        confirmed = true
                        onConfirm()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text("Connect", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                TextButton(
                    onClick = onCancel,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            } else {
                Surface(
                    color = Color(0x2210B981),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "✓ Association Verified",
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String, valueColor: Color = Color.White) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = Color(0xFF94A3B8), fontSize = 12.sp)
        Text(text = value, color = valueColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PrivacyItem(icon: String, label: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = icon,
            color = if (icon == "✓") Color(0xFF10B981) else Color(0xFFEF4444),
            fontWeight = FontWeight.Black,
            fontSize = 14.sp
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(text = label, color = Color(0xFFCBD5E1), fontSize = 12.sp)
    }
}
