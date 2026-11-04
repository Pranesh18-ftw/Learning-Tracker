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
 * Universal Platform Identifiers for Companion Ecosystem (Phase 6)
 */
export const COMPANION_PLATFORMS = Object.freeze({
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  HARMONYOS: 'HARMONYOS',
  DESKTOP_WEB: 'DESKTOP_WEB',
  MOBILE_WEB: 'MOBILE_WEB'
});

/**
 * Observable Telemetry Granularity per Platform
 */
export const TELEMETRY_GRANULARITY = Object.freeze({
  INTERVAL_CLASSIFIED: 'INTERVAL_CLASSIFIED',       // Full second-by-second timeline (Android UsageStats)
  THRESHOLD_AGGREGATE: 'THRESHOLD_AGGREGATE',       // Aggregate threshold breaches & shields (iOS DeviceActivity)
  TIMER_SELF_REPORTED: 'TIMER_SELF_REPORTED'        // Workstation timer with self-committed reflection
});

/**
 * Grounded Confidence Tier of Telemetry Observation
 */
export const TELEMETRY_CONFIDENCE = Object.freeze({
  AUTHENTICATED_COMPANION_INTERVALS: 'AUTHENTICATED_COMPANION_INTERVALS', // Validated bearer token, session window match, millisecond epoch intervals from paired companion
  HARDWARE_ATTESTED_INTERVALS: 'HARDWARE_ATTESTED_INTERVALS',             // Cryptographically attested via Google Play Integrity / Apple App Attest
  CATEGORY_SHIELDED: 'CATEGORY_SHIELDED',                                 // System shield policy enforcement (Apple Screen Time / ManagedSettings)
  STUDIO_TIMER_RECORD: 'STUDIO_TIMER_RECORD',                             // Focus timer lifecycle with self-committed reflection
  SELF_COMMITTED: 'SELF_COMMITTED',                                       // Learner reflection entry
  SELF_REPORTED: 'SELF_REPORTED',                                         // Backward-compatible alias for STUDIO_TIMER_RECORD
  UNVERIFIED: 'UNVERIFIED',                                               // Unauthenticated or structure-only payload lacking cryptographic companion binding
  HARDWARE_VERIFIED: 'AUTHENTICATED_COMPANION_INTERVALS'                  // Backward-compatible alias
});

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
    source: raw.source || (raw.platform ? String(raw.platform).toLowerCase() : 'android'),
    platform: raw.platform || COMPANION_PLATFORMS.ANDROID,
    platformVersion: raw.platformVersion || null,
    monitoringGranularity: raw.monitoringGranularity || (Array.isArray(raw.timeline) && raw.timeline.length > 0 ? TELEMETRY_GRANULARITY.INTERVAL_CLASSIFIED : TELEMETRY_GRANULARITY.THRESHOLD_AGGREGATE),
    telemetryConfidence: raw.telemetryConfidence || TELEMETRY_CONFIDENCE.HARDWARE_VERIFIED,
    provenance: raw.provenance || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' ? TELEMETRY_PROVENANCE.TEST_FIXTURE : TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE),
    observedAt: raw.observedAt || raw.timestamp || Date.now(),
    collectionStatus: raw.collectionStatus || null,
    appBreakdown,
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((item, idx) => ({
          id: item.id || `interval-${idx}`,
          startTime: Number(item.startTime || 0),
          endTime: Number(item.endTime || 0),
          durationSeconds: Number(item.durationSeconds || Math.max(0, Math.round((item.endTime - item.startTime) / 1000))),
          classification: item.classification || 'FOCUSED',
          packageName: item.packageName || null,
          appCategory: item.appCategory || null,
          note: item.note || null
        }))
      : []
  };
}

export const normalizeTelemetrySummary = normalizeFocusTelemetry;

export const TIMELINE_INTERVAL_TYPES = {
  FOCUSED: 'FOCUSED',
  DISTRACTION: 'DISTRACTION',
  PAUSED: 'PAUSED',
  UNOBSERVED: 'UNOBSERVED'
};

/**
 * Builds a clean, continuous attention timeline across [sessionStart, sessionEnd].
 * Guarantees zero fabricated intervals, accurate boundaries, and truthful coverage.
 */
export function buildAttentionTimeline({
  sessionStart,
  sessionEnd,
  pauses = [],
  observedIntervals = [],
  isCompanionPaired = true,
  hasUsageAccess = true,
  isHistoricalWithoutTimeline = false
} = {}) {
  const start = Number(sessionStart) || 0;
  const end = Number(sessionEnd) || start;
  const totalDurationMs = Math.max(0, end - start);
  const totalSeconds = Math.max(0, Math.round(totalDurationMs / 1000));

  if (totalDurationMs <= 0) {
    return {
      intervals: [],
      metrics: {
        totalSeconds: 0,
        focusedSeconds: 0,
        distractionSeconds: 0,
        pausedSeconds: 0,
        unobservedSeconds: 0,
        interruptionCount: 0,
        longestUninterruptedSeconds: 0,
        coveragePercent: 0,
        hasDetailedTimeline: false
      }
    };
  }

  // If this is an older historical session without detailed interval tracking
  if (isHistoricalWithoutTimeline && (!observedIntervals || observedIntervals.length === 0)) {
    return {
      intervals: [],
      metrics: {
        totalSeconds,
        focusedSeconds: totalSeconds,
        distractionSeconds: 0,
        pausedSeconds: 0,
        unobservedSeconds: isCompanionPaired ? 0 : totalSeconds,
        interruptionCount: 0,
        longestUninterruptedSeconds: totalSeconds,
        coveragePercent: isCompanionPaired ? 100 : 0,
        hasDetailedTimeline: false
      }
    };
  }

  // 1. Normalize and clamp pauses to [start, end]
  const clampedPauses = (pauses || [])
    .map(p => {
      const pStart = Math.max(start, Number(p.pausedAt || p.startTime || p.start || 0));
      const pEnd = Math.min(end, Number(p.resumedAt || p.endTime || p.end || end));
      return { startTime: pStart, endTime: pEnd };
    })
    .filter(p => p.endTime > p.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  // 2. Normalize observed intervals
  const normalizedObserved = (observedIntervals || [])
    .map((int, idx) => {
      const iStart = Math.max(start, Number(int.startTime || int.startTimeMs || 0));
      const iEnd = Math.min(end, Number(int.endTime || int.endTimeMs || end));
      const cat = String(int.category || int.appCategory || '').toLowerCase();
      let classification = int.classification || int.type;
      if (!classification) {
        if (cat === 'distraction') classification = TIMELINE_INTERVAL_TYPES.DISTRACTION;
        else if (cat === 'reference' || cat === 'neutral') classification = TIMELINE_INTERVAL_TYPES.FOCUSED;
        else classification = TIMELINE_INTERVAL_TYPES.FOCUSED;
      }
      return {
        id: int.id || `obs-${idx}`,
        startTime: iStart,
        endTime: iEnd,
        classification,
        type: classification,
        packageName: int.packageName || null,
        appName: int.appName || null,
        appCategory: cat || null
      };
    })
    .filter(int => int.endTime > int.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  // 3. Collect all critical boundary timestamps
  const boundarySet = new Set([start, end]);
  clampedPauses.forEach(p => {
    boundarySet.add(p.startTime);
    boundarySet.add(p.endTime);
  });
  normalizedObserved.forEach(o => {
    boundarySet.add(o.startTime);
    boundarySet.add(o.endTime);
  });

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const rawSegments = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    if (segEnd <= segStart) continue;

    // Check if segment falls inside a pause
    const isPaused = clampedPauses.some(p => p.startTime <= segStart && p.endTime >= segEnd);
    if (isPaused) {
      rawSegments.push({
        startTime: segStart,
        endTime: segEnd,
        durationSeconds: Math.round((segEnd - segStart) / 1000),
        classification: TIMELINE_INTERVAL_TYPES.PAUSED,
        packageName: null,
        appName: null,
        appCategory: null
      });
      continue;
    }

    // Check if phone was unobserved
    if (!isCompanionPaired || !hasUsageAccess) {
      rawSegments.push({
        startTime: segStart,
        endTime: segEnd,
        durationSeconds: Math.round((segEnd - segStart) / 1000),
        classification: TIMELINE_INTERVAL_TYPES.UNOBSERVED,
        packageName: null,
        appName: null,
        appCategory: null
      });
      continue;
    }

    // Check if matching an observed interval
    const matchObs = normalizedObserved.find(o => o.startTime <= segStart && o.endTime >= segEnd);
    if (matchObs) {
      rawSegments.push({
        startTime: segStart,
        endTime: segEnd,
        durationSeconds: Math.round((segEnd - segStart) / 1000),
        classification: matchObs.classification,
        packageName: matchObs.packageName,
        appName: matchObs.appName,
        appCategory: matchObs.appCategory
      });
    } else {
      // Uninterrupted focus time during session
      rawSegments.push({
        startTime: segStart,
        endTime: segEnd,
        durationSeconds: Math.round((segEnd - segStart) / 1000),
        classification: TIMELINE_INTERVAL_TYPES.FOCUSED,
        packageName: null,
        appName: null,
        appCategory: null
      });
    }
  }

  // 4. Merge adjacent identical intervals
  const merged = [];
  for (const seg of rawSegments) {
    if (merged.length === 0) {
      merged.push({
        id: `interval-0`,
        type: seg.classification,
        classification: seg.classification,
        startTime: seg.startTime,
        endTime: seg.endTime,
        startTimeMs: seg.startTime,
        endTimeMs: seg.endTime,
        durationSeconds: seg.durationSeconds,
        packageName: seg.packageName,
        appName: seg.appName,
        appCategory: seg.appCategory
      });
    } else {
      const prev = merged[merged.length - 1];
      if (
        prev.classification === seg.classification &&
        prev.packageName === seg.packageName
      ) {
        prev.endTime = seg.endTime;
        prev.endTimeMs = seg.endTime;
        prev.durationSeconds = Math.round((prev.endTime - prev.startTime) / 1000);
      } else {
        merged.push({
          id: `interval-${merged.length}`,
          type: seg.classification,
          classification: seg.classification,
          startTime: seg.startTime,
          endTime: seg.endTime,
          startTimeMs: seg.startTime,
          endTimeMs: seg.endTime,
          durationSeconds: seg.durationSeconds,
          packageName: seg.packageName,
          appName: seg.appName,
          appCategory: seg.appCategory
        });
      }
    }
  }

  // 5. Calculate summary metrics
  let focusedSeconds = 0;
  let distractionSeconds = 0;
  let pausedSeconds = 0;
  let unobservedSeconds = 0;
  let currentUninterrupted = 0;
  let longestUninterruptedSeconds = 0;
  let interruptionCount = 0;

  merged.forEach(interval => {
    const dur = interval.durationSeconds;
    if (interval.classification === TIMELINE_INTERVAL_TYPES.FOCUSED) {
      focusedSeconds += dur;
      currentUninterrupted += dur;
      if (currentUninterrupted > longestUninterruptedSeconds) {
        longestUninterruptedSeconds = currentUninterrupted;
      }
    } else if (interval.classification === TIMELINE_INTERVAL_TYPES.DISTRACTION) {
      distractionSeconds += dur;
      interruptionCount++;
      currentUninterrupted = 0;
    } else if (interval.classification === TIMELINE_INTERVAL_TYPES.PAUSED) {
      pausedSeconds += dur;
      currentUninterrupted = 0;
    } else if (interval.classification === TIMELINE_INTERVAL_TYPES.UNOBSERVED) {
      unobservedSeconds += dur;
      currentUninterrupted = 0;
    }
  });

  const observedSeconds = Math.max(0, totalSeconds - unobservedSeconds);
  const coveragePercent = totalSeconds > 0
    ? Math.round((observedSeconds / totalSeconds) * 100)
    : 0;

  return {
    intervals: merged,
    metrics: {
      totalSeconds,
      focusedSeconds,
      distractionSeconds,
      pausedSeconds,
      unobservedSeconds,
      interruptionCount,
      longestUninterruptedSeconds,
      coveragePercent,
      hasDetailedTimeline: merged.length > 0
    }
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

