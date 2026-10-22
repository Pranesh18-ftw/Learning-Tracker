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

  // 2. Server-Assigned Provenance & Receipt Metadata
  const now = Date.now();
  const summaryRecord = {
    summaryId,
    deviceId: device.deviceId,
    ownerUid,
    sessionId: sessionId || null,
    schemaVersion,
    observedWindow,
    observedAt: observedWindow.endedAt || now,
    receivedAt: now,
    source: 'ANDROID_COMPANION_NATIVE',
    provenance: 'REAL_EXTERNAL_SOURCE',
    consentVersion,
    payload: {
      ...activitySummary,
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
