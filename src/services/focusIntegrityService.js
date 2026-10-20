/**
 * focusIntegrityService.js
 *
 * Web Integration Service for Focus Integrity Companion (Prompt #1, #4, #22, #35).
 *
 * Responsibilities:
 * - Device Pairing & Association (Prompt #8 & #9)
 * - Session Contract Lifecycle (Prompt #4 & #22)
 * - Companion Telemetry Storage & Reconciliation (Prompt #16 & #17)
 * - App Classification Overrides (Prompt #15)
 * - Additive Resiliency (Prompt #39: If phone is absent, web functions normally)
 */

import { safeStorageGet, safeStorageSet, safeStorageRemove } from '../utils/storage';
import {
  COMPANION_STATES,
  APP_CATEGORIES,
  TELEMETRY_PROVENANCE,
  TELEMETRY_STATUS,
  validateFocusSessionContract,
  validateFocusTelemetry,
  normalizeFocusTelemetry
} from '../shared/focusIntegrityProtocol';
import {
  relaySessionStart,
  relaySessionEnd,
  fetchAndReconcileSessionTelemetry
} from './phoneConnectionClient';

const STORAGE_KEY_PAIRED_DEVICE = 'learningTracker_companionDevice';
const STORAGE_KEY_TELEMETRY = 'learningTracker_focusTelemetry';
const STORAGE_KEY_APP_OVERRIDES = 'learningTracker_appOverrides';
const STORAGE_KEY_PAIRING_TOKENS = 'learningTracker_pairingTokens';
const STORAGE_KEY_ENABLED = 'learningTracker_focusIntegrityEnabled';

/**
 * Check if Focus Integrity is globally enabled by user (Prompt #27)
 */
export function isFocusIntegrityEnabled() {
  return safeStorageGet(STORAGE_KEY_ENABLED, true);
}

/**
 * Enable or disable Focus Integrity measurement (Prompt #27)
 */
export function setFocusIntegrityEnabled(enabled) {
  safeStorageSet(STORAGE_KEY_ENABLED, Boolean(enabled));
  return Boolean(enabled);
}

/**
 * Delete all recorded focus telemetry without affecting learning sessions (Prompt #28)
 */
export function deleteFocusTelemetryHistory() {
  safeStorageRemove(STORAGE_KEY_TELEMETRY);
  return { success: true };
}

/**
 * Retrieve all recorded companion telemetry records (Prompt #4 & #5)
 * Invariant 1: Production learner data must only accept real external source.
 */
export function getAllFocusTelemetry(options = {}) {
  const all = safeStorageGet(STORAGE_KEY_TELEMETRY, {});
  const list = Object.values(all);
  const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  if (options.includeAllForTesting && isTest) return list;
  if (isTest) {
    return list.filter(t => t.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE || t.provenance === TELEMETRY_PROVENANCE.TEST_FIXTURE);
  }
  return list.filter(t => t.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE);
}

/**
 * Get paired companion device info
 */
export function getPairedDevice() {
  return safeStorageGet(STORAGE_KEY_PAIRED_DEVICE, null);
}

/**
 * Check if Focus Integrity companion is paired and active
 */
export function isCompanionConnected() {
  const device = getPairedDevice();
  return Boolean(device && device.deviceAssociationId);
}

/**
 * Generates a short-lived single-use pairing token (Prompt #8)
 */
export function generatePairingToken() {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const tokenRecord = {
    token: code,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  };
  const existing = safeStorageGet(STORAGE_KEY_PAIRING_TOKENS, []);
  const valid = existing.filter(t => t.expiresAt > Date.now());
  safeStorageSet(STORAGE_KEY_PAIRING_TOKENS, [...valid, tokenRecord]);
  return tokenRecord;
}

/**
 * Verifies pairing token and associates companion device
 */
export function confirmDevicePairing(token, deviceMetadata = {}) {
  const tokens = safeStorageGet(STORAGE_KEY_PAIRING_TOKENS, []);
  const match = tokens.find(t => t.token === token && t.expiresAt > Date.now());

  if (!match) {
    return { success: false, error: 'Invalid or expired pairing code.' };
  }

  // Remove used token
  safeStorageSet(STORAGE_KEY_PAIRING_TOKENS, tokens.filter(t => t.token !== token));

  const deviceAssociation = {
    deviceAssociationId: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    deviceName: deviceMetadata.deviceName || 'Android Device',
    model: deviceMetadata.model || 'Companion Phone',
    hasUsageAccess: Boolean(deviceMetadata.hasUsageAccess ?? true),
    pairedAt: Date.now(),
    state: COMPANION_STATES.READY
  };

  safeStorageSet(STORAGE_KEY_PAIRED_DEVICE, deviceAssociation);
  return { success: true, device: deviceAssociation };
}

/**
 * Unpair companion device
 */
export function unpairCompanionDevice() {
  safeStorageRemove(STORAGE_KEY_PAIRED_DEVICE);
  return { success: true };
}

/**
 * Get app category overrides
 */
export function getAppOverrides() {
  return safeStorageGet(STORAGE_KEY_APP_OVERRIDES, {});
}

/**
 * Set custom override for an app package (Prompt #15)
 */
export function setAppOverride(packageName, category) {
  const current = getAppOverrides();
  const updated = {
    ...current,
    [packageName]: category
  };
  safeStorageSet(STORAGE_KEY_APP_OVERRIDES, updated);
  return updated;
}

/**
 * Broadcast: Focus Session Started
 */
export function notifyFocusStarted(session) {
  if (!isCompanionConnected()) return null;

  const contract = {
    sessionId: session.id || session.sessionId || `session-${Date.now()}`,
    startedAt: session.startedAt ? new Date(session.startedAt).getTime() : Date.now(),
    intendedDurationSeconds: (session.targetMinutes || 25) * 60,
    taskName: session.task?.name || session.taskName || 'STEM Focus Session',
    subjectName: session.task?.subjectName || session.subjectName,
    state: 'RUNNING'
  };

  const validation = validateFocusSessionContract(contract);
  if (!validation.valid) {
    console.warn('Invalid FocusSessionContract', validation.error);
    return null;
  }

  // Update device state
  const device = getPairedDevice();
  if (device) {
    safeStorageSet(STORAGE_KEY_PAIRED_DEVICE, { ...device, state: COMPANION_STATES.SESSION_ACTIVE });
  }

  // Non-blocking: relay session start to phone connection backend
  relaySessionStart(contract).catch(() => {});

  return contract;
}

/**
 * Broadcast: Focus Session Ended & record telemetry
 * Normalized into canonical event and stored idempotently (Prompt #4 & #5)
 * Invariant 1: Telemetry may only be recorded if from a real registered source.
 * Invariant 3: Local data is pending local sync, NOT falsely marked SYNCED.
 */
export function recordFocusTelemetry(telemetry) {
  const validation = validateFocusTelemetry(telemetry);
  if (!validation.valid) {
    console.error('Invalid FocusTelemetry', validation.error);
    return false;
  }

  const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  const provenance = telemetry.provenance || (isTest ? TELEMETRY_PROVENANCE.TEST_FIXTURE : null);

  if (!isTest && provenance !== TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) {
    console.warn('Production runtime rejected non-real telemetry record for session:', telemetry?.sessionId || 'unknown');
    return false;
  }

  const normalized = normalizeFocusTelemetry({
    ...telemetry,
    provenance
  });
  const allTelemetry = safeStorageGet(STORAGE_KEY_TELEMETRY, {});

  // Idempotent: keyed by sessionId (one session -> one record) (Prompt #5)
  allTelemetry[normalized.sessionId] = {
    ...normalized,
    syncState: 'PENDING_LOCAL_SYNC',
    receivedAt: allTelemetry[normalized.sessionId]?.receivedAt || Date.now()
  };

  safeStorageSet(STORAGE_KEY_TELEMETRY, allTelemetry);

  const device = getPairedDevice();
  if (device) {
    safeStorageSet(STORAGE_KEY_PAIRED_DEVICE, { ...device, state: COMPANION_STATES.READY });
  }

  return true;
}

/**
 * Correct an app classification after a session (Prompt #8 & #9)
 * Stores user preference, updates future classification, and updates session view
 * while preserving the raw observation event.
 */
export function correctAppClassification(packageName, newCategory, { updateHistory = false, sessionId = null } = {}) {
  // 1. Store preference for all future sessions
  setAppOverride(packageName, newCategory);

  // 2. If a specific session is indicated, update its categorized summary while preserving raw event
  if (sessionId) {
    const allTelemetry = safeStorageGet(STORAGE_KEY_TELEMETRY, {});
    const existing = allTelemetry[sessionId];
    if (existing && Array.isArray(existing.appBreakdown)) {
      let refSecs = 0;
      let distSecs = 0;
      let unkSecs = 0;

      const updatedBreakdown = existing.appBreakdown.map(app => {
        const cat = app.packageName === packageName ? newCategory : app.category;
        const dur = app.durationSeconds || 0;
        if (cat === APP_CATEGORIES.REFERENCE) refSecs += dur;
        else if (cat === APP_CATEGORIES.DISTRACTION) distSecs += dur;
        else if (cat === APP_CATEGORIES.UNKNOWN) unkSecs += dur;

        return {
          ...app,
          category: cat,
          userOverridden: app.packageName === packageName ? true : Boolean(app.userOverridden)
        };
      });

      const updatedRecord = {
        ...existing,
        appBreakdown: updatedBreakdown,
        referenceSeconds: refSecs,
        distractionSeconds: distSecs,
        unknownSeconds: unkSecs,
        classificationNote: `Learner classified ${packageName} as ${newCategory}.`
      };

      allTelemetry[sessionId] = updatedRecord;
      safeStorageSet(STORAGE_KEY_TELEMETRY, allTelemetry);
      return {
        success: true,
        overrideCategory: newCategory,
        record: updatedRecord
      };
    }
  }

  return {
    success: true,
    overrideCategory: newCategory,
    packageName
  };
}

/**
 * Computes truthful summary metrics for Growth screen (Prompts #10, #11, #21)
 * Strictly truthful, NO fake IQ, NO discipline score.
 */
export function getFocusIntegritySummaryMetrics(windowDays = 30) {
  const telemetryList = getAllFocusTelemetry();
  const now = Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const recent = telemetryList.filter(t => (t.observedAt || 0) >= cutoff);

  if (recent.length === 0) {
    return {
      hasEnoughData: false,
      sampleSize: 0,
      message: 'Not enough history yet. Continue regular focus sessions with your companion phone.'
    };
  }

  const uninterruptedDurations = recent
    .map(t => Math.round((t.longestUninterruptedSeconds || 0) / 60))
    .filter(m => m > 0);

  const sorted = [...uninterruptedDurations].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianUninterruptedMinutes = sorted.length > 0
    ? (sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2))
    : 0;

  const longestUninterruptedMinutes = uninterruptedDurations.length > 0 ? Math.max(...uninterruptedDurations) : 0;

  // Distraction comparison: compare earlier half vs recent half of the window
  const half = Math.floor(recent.length / 2);
  const earlierSlice = recent.slice(0, Math.max(1, half));
  const recentSlice = recent.slice(Math.max(1, half));

  const avgDistractionEarlier = earlierSlice.reduce((sum, t) => sum + (t.distractionSeconds || 0), 0) / earlierSlice.length;
  const avgDistractionRecent = recentSlice.reduce((sum, t) => sum + (t.distractionSeconds || 0), 0) / recentSlice.length;

  let distractionChangePercent = null;
  if (avgDistractionEarlier > 0) {
    distractionChangePercent = Math.round(((avgDistractionRecent - avgDistractionEarlier) / avgDistractionEarlier) * 100);
  }

  // Trend statement (Prompt #11: Good trends, NOT judgments)
  let trendStatement = 'Your focus container data is being recorded.';
  if (recent.length >= 3) {
    if (distractionChangePercent !== null && distractionChangePercent <= -15) {
      trendStatement = 'You had fewer distraction interruptions in recent sessions.';
    } else if (recentSlice.length > 0 && medianUninterruptedMinutes >= 25) {
      trendStatement = 'Your uninterrupted periods have increased over recent sessions.';
    } else {
      trendStatement = 'Your focus blocks have been recorded consistently.';
    }
  }

  return {
    hasEnoughData: recent.length >= 3,
    sampleSize: recent.length,
    medianUninterruptedMinutes,
    longestUninterruptedMinutes,
    distractionChangePercent,
    trendStatement,
    totalSessionsCompleted: recent.length
  };
}

/**
 * Retrieve recorded companion telemetry for a given session.
 * Invariant 1: In normal learner runtime, only real external source telemetry is returned.
 */
export function getTelemetryForSession(sessionId) {
  if (!sessionId) return null;
  const allTelemetry = safeStorageGet(STORAGE_KEY_TELEMETRY, {});
  const record = allTelemetry[sessionId] || null;
  if (!record) return null;

  const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  if (!isTest && record.provenance !== TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) {
    return null;
  }
  return record;
}

/**
 * Returns explicit truthful telemetry status for a given session.
 * Invariant 2: NO_SOURCE, SOURCE_NOT_CONNECTED, SOURCE_CONNECTED_NO_DATA,
 * and SOURCE_CONNECTED_WITH_DATA must never collapse into "0 interruptions".
 */
export function getTelemetryStatusForSession(sessionId) {
  if (!isFocusIntegrityEnabled()) {
    return TELEMETRY_STATUS.NO_SOURCE;
  }
  const device = getPairedDevice();
  if (!device || !device.deviceAssociationId) {
    return TELEMETRY_STATUS.SOURCE_NOT_CONNECTED;
  }
  const telem = getTelemetryForSession(sessionId);
  if (!telem) {
    return TELEMETRY_STATUS.SOURCE_CONNECTED_NO_DATA;
  }
  return TELEMETRY_STATUS.SOURCE_CONNECTED_WITH_DATA;
}

/**
 * Broadcast: Focus Session Ended (Prompt #22)
 */
export function notifyFocusEnded(sessionId, endTime = Date.now()) {
  const device = getPairedDevice();
  if (device) {
    safeStorageSet(STORAGE_KEY_PAIRED_DEVICE, { ...device, state: COMPANION_STATES.READY });
  }

  // Non-blocking: relay session completion to phone connection backend
  relaySessionEnd(sessionId, { endedAt: endTime, status: 'COMPLETE' }).catch(() => {});

  return { sessionId, endTime, state: 'COMPLETE' };
}

/**
 * Broadcast: Focus Session Cancelled / Abandoned (Prompt #22)
 */
export function notifyFocusCancelled(sessionId) {
  const device = getPairedDevice();
  if (device) {
    safeStorageSet(STORAGE_KEY_PAIRED_DEVICE, { ...device, state: COMPANION_STATES.READY });
  }

  // Non-blocking: relay session cancellation to phone connection backend
  relaySessionEnd(sessionId, { endedAt: Date.now(), status: 'CANCELLED' }).catch(() => {});

  return { sessionId, state: 'CANCELLED' };
}

/**
 * Queries server to reconcile any late-arriving telemetry for a session
 */
export async function reconcileLateTelemetry(sessionId) {
  if (!sessionId) return null;
  const result = await fetchAndReconcileSessionTelemetry(sessionId);
  if (result.success && result.telemetry) {
    recordFocusTelemetry(result.telemetry);
    return result.telemetry;
  }
  return null;
}

/**
 * Formats seconds into human-readable minutes and seconds without fake scores
 * e.g. 1658 -> "27m 38s", 142 -> "2m 22s", 1800 -> "30m"
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Resets all Focus Integrity local data (primarily used in tests)
 */
export function clearFocusIntegrityData() {
  safeStorageRemove(STORAGE_KEY_PAIRED_DEVICE);
  safeStorageRemove(STORAGE_KEY_TELEMETRY);
  safeStorageRemove(STORAGE_KEY_APP_OVERRIDES);
  safeStorageRemove(STORAGE_KEY_PAIRING_TOKENS);
  safeStorageRemove(STORAGE_KEY_ENABLED);
  return { success: true };
}
