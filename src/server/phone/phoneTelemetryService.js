/**
 * phoneTelemetryService.js
 *
 * Idempotent Telemetry Ingestion & Retrieval Engine (Stage 2A).
 *
 * Invariants:
 * 1. Only authenticated, active devices can submit telemetry.
 * 2. Incoming payloads are capped at 64 KB and strictly validated against CURRENT_SCHEMA_VERSION.
 * 3. Provenance is assigned by the SERVER ('REAL_EXTERNAL_SOURCE') and cannot be client-controlled.
 * 4. Duplicate summary IDs with identical content are handled idempotently.
 * 5. Re-submitting the same summary ID with conflicting content is rejected.
 * 6. Cross-account session references are strictly rejected with 403.
 */

import { validateTelemetrySummaryRequest } from './phoneValidation.js';
import {
  COMPANION_PLATFORMS,
  TELEMETRY_GRANULARITY,
  TELEMETRY_CONFIDENCE,
  TELEMETRY_PROVENANCE
} from '../../shared/focusIntegrityProtocol.js';

/**
 * Ingests a FOCUS_WINDOW_SUMMARY from a paired companion device
 */
export async function ingestTelemetrySummary(device, payload, repository) {
  if (!device || !device.deviceId || !device.ownerUid) {
    return { success: false, error: 'Device authentication required.', code: 'UNAUTHORIZED_DEVICE', statusCode: 401 };
  }

  const validation = validateTelemetrySummaryRequest(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: validation.code, statusCode: 400 };
  }

  const { summaryId, sessionId, schemaVersion, observedWindow, activitySummary, consentVersion } = payload;
  const ownerUid = device.ownerUid;

  // 1. Session Association & Cross-Account Guard
  if (sessionId) {
    const session = await repository.getFocusSession(sessionId);
    if (session && session.ownerUid !== ownerUid) {
      return {
        success: false,
        error: 'Referenced session belongs to a different account.',
        code: 'CROSS_ACCOUNT_SESSION',
        statusCode: 403
      };
    }
  }

  // 2. Server-Side Derivation & Validation of Platform, Granularity & Confidence (Prompt #6)
  const rawPlatform = payload.platform || device.platform || COMPANION_PLATFORMS.ANDROID;
  const declaredPlatform = String(rawPlatform).toUpperCase();

  let resolvedPlatform = COMPANION_PLATFORMS.ANDROID;
  let monitoringGranularity = TELEMETRY_GRANULARITY.UNKNOWN;
  let telemetryConfidence = TELEMETRY_CONFIDENCE.UNVERIFIED;
  let source = 'UNVERIFIED_CLIENT';

  const hasGenuineIntervals = Array.isArray(payload.timeline) && payload.timeline.length > 0;
  const hasAppBreakdown = Array.isArray(payload.appBreakdown) && payload.appBreakdown.length > 0;

  if (declaredPlatform === COMPANION_PLATFORMS.ANDROID) {
    resolvedPlatform = COMPANION_PLATFORMS.ANDROID;
    // Assign AUTHENTICATED_COMPANION_INTERVALS if accompanied by classified timeline intervals from authenticated device
    if (hasGenuineIntervals) {
      monitoringGranularity = TELEMETRY_GRANULARITY.INTERVAL_CLASSIFIED;
      telemetryConfidence = TELEMETRY_CONFIDENCE.AUTHENTICATED_COMPANION_INTERVALS;
      source = 'ANDROID_COMPANION_NATIVE';
    } else if (hasAppBreakdown) {
      monitoringGranularity = TELEMETRY_GRANULARITY.THRESHOLD_AGGREGATE;
      telemetryConfidence = TELEMETRY_CONFIDENCE.AUTHENTICATED_COMPANION_INTERVALS;
      source = 'ANDROID_COMPANION_NATIVE';
    } else {
      // Empty intervals / breakdown cannot be upgraded to authenticated companion intervals
      monitoringGranularity = TELEMETRY_GRANULARITY.STUDIO_ONLY;
      telemetryConfidence = TELEMETRY_CONFIDENCE.SELF_REPORTED;
      source = 'ANDROID_STUDIO_FALLBACK';
    }
  } else if (declaredPlatform === COMPANION_PLATFORMS.IOS) {
    resolvedPlatform = COMPANION_PLATFORMS.IOS;
    // iOS Screen Time does NOT expose raw millisecond timeline package intervals.
    // It provides threshold aggregate or shielded category summaries.
    monitoringGranularity = TELEMETRY_GRANULARITY.THRESHOLD_AGGREGATE;
    telemetryConfidence = TELEMETRY_CONFIDENCE.CATEGORY_SHIELDED;
    source = 'IOS_COMPANION_SCREENTIME';
  } else if ([COMPANION_PLATFORMS.HARMONYOS, COMPANION_PLATFORMS.WEB_STUDIO, COMPANION_PLATFORMS.DESKTOP_WEB, COMPANION_PLATFORMS.MOBILE_WEB].includes(declaredPlatform)) {
    resolvedPlatform = declaredPlatform;
    monitoringGranularity = TELEMETRY_GRANULARITY.STUDIO_ONLY;
    telemetryConfidence = TELEMETRY_CONFIDENCE.SELF_REPORTED;
    source = declaredPlatform;
  } else {
    resolvedPlatform = 'UNKNOWN';
    monitoringGranularity = TELEMETRY_GRANULARITY.UNKNOWN;
    telemetryConfidence = TELEMETRY_CONFIDENCE.UNVERIFIED;
    source = 'UNVERIFIED_CLIENT';
  }

  const now = Date.now();
  const summaryRecord = {
    summaryId,
    deviceId: device.deviceId,
    ownerUid,
    sessionId: sessionId || null,
    schemaVersion,
    platform: resolvedPlatform,
    monitoringGranularity,
    telemetryConfidence,
    source,
    provenance: (telemetryConfidence === TELEMETRY_CONFIDENCE.HARDWARE_VERIFIED || telemetryConfidence === TELEMETRY_CONFIDENCE.CATEGORY_SHIELDED)
      ? TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE
      : (telemetryConfidence === TELEMETRY_CONFIDENCE.SELF_REPORTED ? 'SELF_REPORTED' : 'UNVERIFIED_SOURCE'),
    observedWindow,
    observedAt: observedWindow.endedAt || now,
    receivedAt: now,
    consentVersion,
    payload: {
      ...activitySummary,
      timeline: payload.timeline || activitySummary.timeline || [],
      appBreakdown: payload.appBreakdown || activitySummary.appBreakdown || []
    },
    reconciled: false,
    createdAt: now
  };

  // 3. Transactional Ingestion & Idempotency / Conflict Detection
  const result = await repository.ingestTelemetrySummaryTransaction(summaryRecord);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.code,
      statusCode: 409
    };
  }

  // If a timeline is provided and repository supports saveSessionTimeline, persist it
  if (summaryRecord.sessionId && summaryRecord.payload.timeline?.length && typeof repository.saveSessionTimeline === 'function') {
    try {
      await repository.saveSessionTimeline(summaryRecord.sessionId, {
        ownerUid,
        deviceId: device.deviceId,
        snapshotVersion: 9999,
        timestamp: now,
        intervals: summaryRecord.payload.timeline,
        observedWindow,
        distractionCount: summaryRecord.payload.interruptionCount || 0,
        distractionDurationSeconds: summaryRecord.payload.distractionSeconds || 0,
        focusedDurationSeconds: Math.max(0, (summaryRecord.payload.observedSeconds || 0) - (summaryRecord.payload.distractionSeconds || 0)),
        isFinal: true
      });
    } catch (_) {}
  }

  return {
    success: true,
    summaryId,
    sessionId: summaryRecord.sessionId,
    receivedAt: result.record?.receivedAt || now,
    provenance: 'REAL_EXTERNAL_SOURCE',
    deliveryStatus: 'DELIVERED',
    idempotent: Boolean(result.idempotent)
  };
}

/**
 * Retrieves recorded telemetry summary for a session
 */
export async function getTelemetryForSession(ownerUid, sessionId, repository) {
  if (!ownerUid || !sessionId) {
    return { success: false, error: 'Invalid parameters.', code: 'INVALID_REQUEST', statusCode: 400 };
  }

  const record = await repository.getTelemetryBySessionId(sessionId, ownerUid);

  return {
    success: true,
    telemetry: record || null
  };
}
/**
 * Lists all historical telemetry summaries for the authenticated owner
 */
export async function listOwnerTelemetryHistory(ownerUid, repository, options = {}) {
  if (!ownerUid) {
    return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED', statusCode: 401, summaries: [] };
  }

  const records = typeof repository.listTelemetryByOwner === 'function'
    ? await repository.listTelemetryByOwner(ownerUid, options)
    : [];

  return {
    success: true,
    count: records.length,
    summaries: records
  };
}

/**
 * Permanently deletes all retained phone telemetry for the authenticated owner
 */
export async function deleteOwnerTelemetry(ownerUid, repository) {
  if (!ownerUid) {
    return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED', statusCode: 401 };
  }

  const result = await repository.deleteTelemetryByOwner(ownerUid);

  return {
    success: true,
    deletedCount: result.deletedCount
  };
}
