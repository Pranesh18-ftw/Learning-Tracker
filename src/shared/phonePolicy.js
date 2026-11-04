/**
 * phonePolicy.js
 *
 * Centralized, authoritative timing and inactivity policies for Learning Tracker
 * Phone Focus Tracking and Device Companion (Stage 2A & 2B).
 *
 * Principles:
 * 1. Reachability: Companion phone is reachable if it has reported a genuine communication signal
 *    within the last 2 minutes. A phone entering background or screen-off without recent communication
 *    is offline, but remains paired.
 * 2. Pairing Expiry: Inactivity-expiry default of 30 days, measured from the last genuine successful
 *    device activity (lastSeenAt or pairedAt). Reading stale registration records never refreshes the clock.
 * 3. On Expiry: Device association status transitions to 'expired', device bearer credentials are
 *    invalidated, tracking services stop, and re-pairing is required.
 */

// Companion communication reachability threshold: 2 minutes
export const COMPANION_REACHABILITY_THRESHOLD_MS = 2 * 60 * 1000;

// Device inactivity pairing expiration threshold: 30 days
export const DEVICE_INACTIVITY_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Evaluates whether a device registration has expired due to long-term inactivity (> 30 days).
 *
 * @param {Object} device - Device record containing lastSeenAt, pairedAt, and status
 * @param {number} now - Optional timestamp for deterministic testing (defaults to Date.now())
 * @returns {boolean} True if device is explicitly expired/revoked or exceeded 30 days of inactivity
 */
export function isDeviceInactivityExpired(device, now = Date.now()) {
  if (!device) return false;
  if (device.status === 'expired' || device.status === 'revoked') {
    return true;
  }

  const lastActivity = device.lastSeenAt || device.pairedAt || 0;
  if (!lastActivity) {
    return false;
  }

  const lastTime = typeof lastActivity === 'number'
    ? lastActivity
    : new Date(lastActivity).getTime();

  if (isNaN(lastTime) || lastTime <= 0) {
    return false;
  }

  return (now - lastTime) > DEVICE_INACTIVITY_EXPIRY_MS;
}

/**
 * Evaluates whether a companion device is currently reachable (< 2 minutes since last communication).
 *
 * @param {Object} device - Device record
 * @param {number} now - Optional timestamp for deterministic testing
 * @returns {boolean}
 */
export function isDeviceReachable(device, now = Date.now()) {
  if (!device || device.status === 'revoked' || device.status === 'expired') {
    return false;
  }
  if (isDeviceInactivityExpired(device, now)) {
    return false;
  }
  if (!device.lastSeenAt) {
    return false;
  }
  const lastSeen = typeof device.lastSeenAt === 'number'
    ? device.lastSeenAt
    : new Date(device.lastSeenAt).getTime();
  if (isNaN(lastSeen) || lastSeen <= 0) {
    return false;
  }
  return (now - lastSeen) <= COMPANION_REACHABILITY_THRESHOLD_MS;
}
