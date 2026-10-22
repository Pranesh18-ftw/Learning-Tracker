/**
 * focusIntegrityProtocol.js
 *
 * Shared Contract for Learning Tracker <-> Android Companion (Focus Integrity V1).
 *
 * Defines the canonical telemetry model, event schema, message protocol,
 * and state machine states shared between Web and Android.
 */

export const COMPANION_STATES = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  NOT_PAIRED: 'NOT_PAIRED',
  PAIRED: 'PAIRED',
  READY: 'READY',
  PERMISSION_NEEDED: 'PERMISSION_NEEDED',
  FOCUS_ACTIVE: 'FOCUS_ACTIVE',
  PROCESSING: 'PROCESSING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  OFFLINE: 'OFFLINE',
  REVOKED: 'REVOKED',
  ERROR: 'ERROR',
  CONNECTED_BUT_USAGE_ACCESS_MISSING: 'CONNECTED_BUT_USAGE_ACCESS_MISSING',
  SESSION_ACTIVE: 'SESSION_ACTIVE',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
  SYNC_PENDING: 'SYNC_PENDING'
};

/**
 * Explicit provenance to guarantee truthfulness:
 * Production learner data must only accept REAL_EXTERNAL_SOURCE.
 */
export const TELEMETRY_PROVENANCE = {
  REAL_EXTERNAL_SOURCE: 'REAL_EXTERNAL_SOURCE',
  TEST_FIXTURE: 'TEST_FIXTURE',
  DEV_SIMULATION: 'DEV_SIMULATION'
};

/**
 * Distinct truth states for telemetry source:
 * Invariant 2: PHONE_TELEMETRY_UNAVAILABLE, PHONE_NOT_CONNECTED,
 * PHONE_CONNECTED_NO_OBSERVATIONS, and PHONE_CONNECTED_WITH_OBSERVATIONS
 * are NOT equivalent and must never collapse into "0 interruptions".
 */
export const TELEMETRY_STATUS = {
  NO_SOURCE: 'NO_SOURCE',
  SOURCE_NOT_CONNECTED: 'SOURCE_NOT_CONNECTED',
  SOURCE_CONNECTED_NO_DATA: 'SOURCE_CONNECTED_NO_DATA',
  SOURCE_CONNECTED_WITH_DATA: 'SOURCE_CONNECTED_WITH_DATA',
  SOURCE_ERROR: 'SOURCE_ERROR'
};

export const APP_CATEGORIES = {
  REFERENCE: 'reference',
  NEUTRAL: 'neutral',
  DISTRACTION: 'distraction',
  UNKNOWN: 'unknown'
};

export const DEFAULT_APP_CLASSIFICATIONS = {
  // Reference apps (STEM, documentation, tools, calculations)
  'com.android.chrome': APP_CATEGORIES.REFERENCE,
  'org.mozilla.firefox': APP_CATEGORIES.REFERENCE,
  'com.google.android.calculator': APP_CATEGORIES.REFERENCE,
  'com.sec.android.app.popupcalculator': APP_CATEGORIES.REFERENCE,
  'com.adobe.reader': APP_CATEGORIES.REFERENCE,
  'com.google.android.apps.docs': APP_CATEGORIES.REFERENCE,
  'com.github.android': APP_CATEGORIES.REFERENCE,
  'com.notion.id': APP_CATEGORIES.REFERENCE,

  // Distraction apps (Feeds, algorithmic scrolling, mobile games)
  'com.instagram.android': APP_CATEGORIES.DISTRACTION,
  'com.zhiliaoapp.musically': APP_CATEGORIES.DISTRACTION, // TikTok
  'com.google.android.youtube': APP_CATEGORIES.DISTRACTION,
  'com.twitter.android': APP_CATEGORIES.DISTRACTION,
  'com.reddit.frontpage': APP_CATEGORIES.DISTRACTION,
  'com.snapchat.android': APP_CATEGORIES.DISTRACTION,
  'com.facebook.katana': APP_CATEGORIES.DISTRACTION,
  'com.netflix.mediaclient': APP_CATEGORIES.DISTRACTION,

  // Neutral / System utilities (Doesn't count as conscious distraction)
  'com.google.android.dialer': APP_CATEGORIES.NEUTRAL,
  'com.samsung.android.dialer': APP_CATEGORIES.NEUTRAL,
  'com.android.systemui': APP_CATEGORIES.NEUTRAL,
  'com.android.settings': APP_CATEGORIES.NEUTRAL,
  'com.learningtracker.companion': APP_CATEGORIES.NEUTRAL
};

export const PROTOCOL_MESSAGE_TYPES = {
  // Web -> Phone
  FOCUS_STARTED: 'FOCUS_STARTED',
  FOCUS_CANCELLED: 'FOCUS_CANCELLED',
  FOCUS_ENDED: 'FOCUS_ENDED',

  // Phone -> Web
  DEVICE_PAIR_REQUEST: 'DEVICE_PAIR_REQUEST',
  DEVICE_PAIRED: 'DEVICE_PAIRED',
  DEVICE_UNPAIRED: 'DEVICE_UNPAIRED',
  FOCUS_TELEMETRY: 'FOCUS_TELEMETRY'
};

/**
 * Validates canonical Focus Session contract payload
 */
export function validateFocusSessionContract(payload) {
  if (!payload) return { valid: false, error: 'Empty payload' };
  if (!payload.sessionId) return { valid: false, error: 'Missing canonical sessionId' };
  if (!payload.startedAt) return { valid: false, error: 'Missing startedAt' };
  if (typeof payload.intendedDurationSeconds !== 'number' || payload.intendedDurationSeconds <= 0) {
    return { valid: false, isValid: false, error: 'Invalid intendedDurationSeconds' };
  }
  return { valid: true, isValid: true };
}

/**
 * Normalizes Focus Telemetry payload into canonical schema (Prompt #4 & #5)
 */
export function normalizeFocusTelemetry(raw) {
  if (!raw) return null;
  const intendedSeconds = Number(
    raw.intendedSeconds !== undefined
      ? raw.intendedSeconds
      : (raw.intendedMinutes ? raw.intendedMinutes * 60 : (raw.intendedDurationSeconds || 1800))
  );
  const observedSeconds = Number(
    raw.observedSeconds !== undefined
      ? raw.observedSeconds
      : (raw.observedWindowSeconds !== undefined
          ? raw.observedWindowSeconds
          : (raw.uninterruptedSeconds !== undefined ? raw.uninterruptedSeconds : intendedSeconds))
  );
  const interruptionCount = Number(raw.interruptionCount || 0);
  const interruptionSeconds = Number(
    raw.interruptionSeconds !== undefined
      ? raw.interruptionSeconds
      : (raw.totalInterruptionDurationSeconds || raw.interruptedSeconds || 0)
  );
  const appBreakdown = Array.isArray(raw.appBreakdown || raw.interruptions)
    ? (raw.appBreakdown || raw.interruptions).map(item => ({
        packageName: item.packageName || 'unknown',
        category: item.category || APP_CATEGORIES.UNKNOWN,
        durationSeconds: Number(item.durationSeconds || item.duration || 0)
      }))
    : [];

  let computedRef = 0;
  let computedDist = 0;
  let computedUnk = 0;
  appBreakdown.forEach(item => {
    const cat = String(item.category || '').toUpperCase();
    if (cat === 'REFERENCE') computedRef += item.durationSeconds;
    else if (cat === 'DISTRACTION') computedDist += item.durationSeconds;
    else computedUnk += item.durationSeconds;
  });

  const referenceSeconds = Number(raw.referenceSeconds !== undefined ? raw.referenceSeconds : computedRef);
  const distractionSeconds = Number(raw.distractionSeconds !== undefined ? raw.distractionSeconds : computedDist);
  const unknownSeconds = Number(raw.unknownSeconds !== undefined ? raw.unknownSeconds : computedUnk);

  const longestUninterruptedSeconds = Number(
    raw.longestUninterruptedSeconds !== undefined
      ? raw.longestUninterruptedSeconds
      : Math.max(0, observedSeconds - interruptionSeconds)
  );

  return {
    id: raw.id || raw.summaryId || `telem-${raw.sessionId || Date.now()}`,
    summaryId: raw.summaryId || raw.id || `summary-${raw.sessionId || Date.now()}`,
    sessionId: raw.sessionId,
    intendedSeconds,
    observedSeconds,
    interruptionCount,
    interruptionSeconds,
    referenceSeconds,
    distractionSeconds,
    unknownSeconds,
    longestUninterruptedSeconds,
    source: raw.source || 'android',
    provenance: raw.provenance || (process.env.NODE_ENV === 'test' ? TELEMETRY_PROVENANCE.TEST_FIXTURE : TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE),
    observedAt: raw.observedAt || raw.timestamp || Date.now(),
    appBreakdown
  };
}

/**
 * Validates Focus Telemetry summary payload
 */
export function validateFocusTelemetry(telemetry) {
  if (!telemetry) return { valid: false, isValid: false, error: 'Empty telemetry' };
  if (!telemetry.sessionId) return { valid: false, isValid: false, error: 'Missing sessionId' };
  if (typeof telemetry.interruptionCount !== 'number') return { valid: false, isValid: false, error: 'Missing interruptionCount' };
  return { valid: true, isValid: true };
}

/**
 * Validates canonical application-level Device Entity (Prompt #2)
 */
export function validateDeviceEntity(device) {
  if (!device || typeof device !== 'object') return { valid: false, isValid: false, error: 'Empty device entity' };
  if (!device.id || typeof device.id !== 'string') return { valid: false, isValid: false, error: 'Missing device id' };
  if (!device.userId) return { valid: false, isValid: false, error: 'Missing userId' };
  if (!['android', 'web'].includes(device.platform)) return { valid: false, isValid: false, error: 'Invalid device platform' };
  if (!device.name) return { valid: false, isValid: false, error: 'Missing device name' };
  if (!['active', 'revoked'].includes(device.status)) return { valid: false, isValid: false, error: 'Invalid device status' };
  if (typeof device.createdAt !== 'number') return { valid: false, isValid: false, error: 'Invalid createdAt' };
  return { valid: true, isValid: true };
}

/**
 * Validates Pairing Request Entity (Prompt #5)
 */
export function validatePairingRequest(req) {
  if (!req || typeof req !== 'object') return { valid: false, isValid: false, error: 'Empty pairing request' };
  if (!req.tokenId) return { valid: false, isValid: false, error: 'Missing tokenId' };
  if (!req.userId) return { valid: false, isValid: false, error: 'Missing userId' };
  if (typeof req.expiresAt !== 'number') return { valid: false, isValid: false, error: 'Missing expiresAt' };
  if (!['PENDING', 'CONSUMED', 'EXPIRED', 'REVOKED'].includes(req.status)) {
    return { valid: false, isValid: false, error: 'Invalid pairing request status' };
  }
  return { valid: true, isValid: true };
}
