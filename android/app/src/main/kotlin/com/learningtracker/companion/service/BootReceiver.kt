package com.learningtracker.companion.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.learningtracker.companion.pairing.PairingManager

/**
 * BootReceiver
 *
 * Restores automatic background focus-session monitoring after device reboot
 * if the companion app is already paired and not revoked.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val pairingManager = PairingManager(context)
            if (pairingManager.isPaired() && !pairingManager.isRevoked()) {
                FocusMonitoringService.start(context)
            }
        }
    }
}
