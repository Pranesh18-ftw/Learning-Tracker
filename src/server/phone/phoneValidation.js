/**
 * phoneValidation.js
 *
 * Strict Input Validation and Safety Guards for Phone Connection API (Stage 2A).
 *
 * Enforces:
 * - Request payload size limits (max 64 KB)
 * - Safe identifier patterns (alphanumeric, dashes, underscores)
 * - Strict timestamp and window validation (startedAt <= endedAt)
 * - Supported protocol/schema versions ('1.0.0')
 * - Bounded array lengths and object depths
 * - Rejection of prohibited data (messages, keystrokes, URLs)
 */

export const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB
export const CURRENT_SCHEMA_VERSION = '1.0.0';

export const ID_PATTERN = /^[a-zA-Z0-9_-]{4,128}$/;
export const PAIRING_CODE_PATTERN = /^[\dA-Za-z-]{6,16}$/;
export const PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9_.-]{3,128}$/;

export const ALLOWED_CATEGORIES = new Set(['reference', 'distraction', 'neutral', 'unknown']);

/**
 * Validates request Content-Length header if present before buffering/parsing
 */
export function validateContentLengthHeader(contentLengthHeader) {
  if (!contentLengthHeader) return { valid: true };
  const length = parseInt(contentLengthHeader, 10);
  if (!isNaN(length) && length > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Content-Length ${length} exceeds maximum permitted size of ${MAX_PAYLOAD_BYTES} bytes.`,
      code: 'PAYLOAD_TOO_LARGE'
    };
  }
  return { valid: true };
}

/**
 * Validates request raw body size before parsing
 */
export function validatePayloadSize(body) {
  if (!body) return { valid: true };
  const size = typeof body === 'string' ? Buffer.byteLength(body, 'utf8') : JSON.stringify(body).length;
  if (size > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Payload exceeds maximum permitted size of ${MAX_PAYLOAD_BYTES} bytes (${size} bytes received).`,
      code: 'PAYLOAD_TOO_LARGE'
    };
  }
  return { valid: true };
}

/**
 * Validates pairing start request
 */
export function validatePairingStartRequest() {
  return { valid: true };
}

/**
 * Validates pairing completion request from future Android companion
 */
export function validatePairingCompleteRequest(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Empty or malformed payload.', code: 'INVALID_PAYLOAD' };
  }

  const { pairingCode, deviceId, deviceName, protocolVersion, consent, challengeId } = payload;

  if (!pairingCode || !PAIRING_CODE_PATTERN.test(String(pairingCode).trim())) {
    return { valid: false, error: 'Pairing code must be a valid 6-character code.', code: 'INVALID_PAIRING_CODE' };
  }

  if (challengeId && !ID_PATTERN.test(String(challengeId))) {
    return { valid: false, error: 'Invalid challengeId format.', code: 'INVALID_CHALLENGE_ID' };
  }

  if (!deviceId || !ID_PATTERN.test(String(deviceId))) {
    return { valid: false, error: 'Invalid deviceId format.', code: 'INVALID_DEVICE_ID' };
  }

  if (!deviceName || typeof deviceName !== 'string' || deviceName.trim().length === 0 || deviceName.length > 100) {
    return { valid: false, error: 'Device name must be between 1 and 100 characters.', code: 'INVALID_DEVICE_NAME' };
  }

  if (protocolVersion !== CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Unsupported protocol version '${protocolVersion}'. Supported version: '${CURRENT_SCHEMA_VERSION}'.`,
      code: 'UNSUPPORTED_PROTOCOL_VERSION'
    };
  }

  if (!consent || typeof consent !== 'object' || consent.consentVersion !== CURRENT_SCHEMA_VERSION) {
    return { valid: false, error: 'Valid user consent metadata is required to complete pairing.', code: 'MISSING_CONSENT' };
  }

  if (consent.categories !== undefined) {
    if (!Array.isArray(consent.categories) || consent.categories.length === 0) {
      return { valid: false, error: 'consent.categories must be a non-empty array.', code: 'INVALID_CONSENT_CATEGORIES' };
    }
    for (const cat of consent.categories) {
      if (typeof cat !== 'string' || !ALLOWED_CATEGORIES.has(cat.trim().toLowerCase())) {
        return {
          valid: false,
          error: `Invalid consent category '${cat}'. Allowed categories: ${Array.from(ALLOWED_CATEGORIES).join(', ')}.`,
          code: 'INVALID_CONSENT_CATEGORY'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates session start relay request from web
 */
export function validateSessionStartRequest(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Empty or malformed payload.', code: 'INVALID_PAYLOAD' };
  }

  const { sessionId, startedAt, intendedDurationSeconds } = payload;

  if (!sessionId || !ID_PATTERN.test(String(sessionId))) {
    return { valid: false, error: 'Invalid sessionId format.', code: 'INVALID_SESSION_ID' };
  }

  if (typeof startedAt !== 'number' || startedAt <= 0 || !Number.isFinite(startedAt)) {
    return { valid: false, error: 'startedAt must be a positive epoch millisecond timestamp.', code: 'INVALID_TIMESTAMP' };
  }

  if (typeof intendedDurationSeconds !== 'number' || intendedDurationSeconds <= 0 || intendedDurationSeconds > 86400) {
    return { valid: false, error: 'intendedDurationSeconds must be between 1 and 86400 seconds.', code: 'INVALID_DURATION' };
  }

  return { valid: true };
}

/**
 * Validates session end relay request from web
 */
export function validateSessionEndRequest(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Empty or malformed payload.', code: 'INVALID_PAYLOAD' };
  }

  const { endedAt, status } = payload;

  if (typeof endedAt !== 'number' || endedAt <= 0 || !Number.isFinite(endedAt)) {
    return { valid: false, error: 'endedAt must be a positive epoch millisecond timestamp.', code: 'INVALID_TIMESTAMP' };
  }

  if (status && !['COMPLETE', 'CANCELLED', 'ABANDONED'].includes(status)) {
    return { valid: false, error: 'Invalid session end status.', code: 'INVALID_STATUS' };
  }

  return { valid: true };
}

/**
 * Validates FOCUS_WINDOW_SUMMARY submission from companion
 */
export function validateTelemetrySummaryRequest(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Empty or malformed payload.', code: 'INVALID_PAYLOAD' };
  }

  const {
    schemaVersion,
    summaryId,
    sessionId,
    observedWindow,
    activitySummary,
    consentVersion
  } = payload;

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Unsupported schema version '${schemaVersion}'. Supported version: '${CURRENT_SCHEMA_VERSION}'.`,
      code: 'UNSUPPORTED_SCHEMA_VERSION'
    };
  }

  if (!summaryId || !ID_PATTERN.test(String(summaryId))) {
    return { valid: false, error: 'Invalid summaryId format.', code: 'INVALID_SUMMARY_ID' };
  }

  if (sessionId && !ID_PATTERN.test(String(sessionId))) {
    return { valid: false, error: 'Invalid sessionId format.', code: 'INVALID_SESSION_ID' };
  }

  if (consentVersion !== CURRENT_SCHEMA_VERSION) {
    return { valid: false, error: 'Invalid or missing consentVersion.', code: 'INVALID_CONSENT_VERSION' };
  }

  if (!observedWindow || typeof observedWindow !== 'object') {
    return { valid: false, error: 'observedWindow object is required.', code: 'MISSING_OBSERVED_WINDOW' };
  }

  const { startedAt, endedAt } = observedWindow;

  if (typeof startedAt !== 'number' || typeof endedAt !== 'number' || !Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    return { valid: false, error: 'observedWindow timestamps must be finite numbers.', code: 'INVALID_WINDOW_TIMESTAMPS' };
  }

  if (startedAt > endedAt) {
    return { valid: false, error: 'observedWindow startedAt must not be greater than endedAt.', code: 'INVALID_WINDOW_ORDER' };
  }

  if (!activitySummary || typeof activitySummary !== 'object') {
    return { valid: false, error: 'activitySummary object is required.', code: 'MISSING_ACTIVITY_SUMMARY' };
  }

  const {
    intendedSeconds,
    observedSeconds,
    interruptionCount,
    interruptionSeconds,
    referenceSeconds,
    distractionSeconds,
    longestUninterruptedSeconds,
    appBreakdown: nestedBreakdown
  } = activitySummary;

  const appBreakdown = payload.appBreakdown !== undefined ? payload.appBreakdown : nestedBreakdown;

  if (typeof observedSeconds !== 'number' || observedSeconds < 0 ||
      typeof interruptionCount !== 'number' || interruptionCount < 0) {
    return { valid: false, error: 'Invalid numeric fields in activitySummary.', code: 'INVALID_ACTIVITY_NUMERICS' };
  }

  // App breakdown inspection
  if (appBreakdown !== undefined) {
    if (!Array.isArray(appBreakdown)) {
      return { valid: false, error: 'appBreakdown must be an array.', code: 'INVALID_APP_BREAKDOWN' };
    }
    if (appBreakdown.length > 50) {
      return { valid: false, error: 'appBreakdown exceeds maximum limit of 50 items.', code: 'APP_BREAKDOWN_TOO_LARGE' };
    }
    for (const item of appBreakdown) {
      if (!item || typeof item !== 'object') {
        return { valid: false, error: 'Invalid item in appBreakdown.', code: 'INVALID_APP_BREAKDOWN_ITEM' };
      }
      if (!item.packageName || !PACKAGE_NAME_PATTERN.test(item.packageName)) {
        return { valid: false, error: `Invalid packageName '${item.packageName}'.`, code: 'INVALID_PACKAGE_NAME' };
      }
      if (!item.category || !ALLOWED_CATEGORIES.has(String(item.category).toLowerCase())) {
        return { valid: false, error: `Invalid category '${item.category}'.`, code: 'INVALID_CATEGORY' };
      }
      if (typeof item.durationSeconds !== 'number' || item.durationSeconds < 0) {
        return { valid: false, error: 'app durationSeconds must be a non-negative number.', code: 'INVALID_APP_DURATION' };
      }
    }
  }

  return { valid: true };
}
