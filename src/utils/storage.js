/**
 * storage.js
 *
 * Hardened Safe Storage Layer for Learning Tracker (P1.3).
 *
 * Invariants:
 * 1. Distinguishable Failures:
 *    SUCCESS, MISSING, MALFORMED, UNAVAILABLE, QUOTA_EXCEEDED, WRITE_FAILED, READ_FAILED.
 * 2. Non-Destructive on Malformed Data:
 *    Corrupted JSON is never silently treated as an empty learner; corrupted keys
 *    are quarantined to prevent silent overwrite and permanent data loss.
 * 3. Truthful Write Reporting:
 *    Writes return explicit success/error statuses; quota failures are detected.
 * 4. Safe Clear & Multi-key Scoping:
 *    Supports scoped prefix clearing and full clean clearing without exceptions.
 */

export const STORAGE_STATUS = {
  SUCCESS: 'SUCCESS',
  MISSING: 'MISSING',
  MALFORMED: 'MALFORMED',
  UNAVAILABLE: 'UNAVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  WRITE_FAILED: 'WRITE_FAILED',
  READ_FAILED: 'READ_FAILED'
};

const QUARANTINE_PREFIX = 'learningTracker_quarantine_';

/**
 * Checks if window.localStorage is accessible in the current execution environment.
 */
function isStorageAvailable() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch (e) {
    return false;
  }
}

/**
 * Inspects a localStorage key in detail without collapsing errors into null.
 *
 * @param {string} key
 * @returns {{ ok: boolean, status: string, data: any, raw: string|null, error: any }}
 */
export function safeStorageInspect(key) {
  if (!isStorageAvailable()) {
    return {
      ok: false,
      status: STORAGE_STATUS.UNAVAILABLE,
      data: null,
      raw: null,
      error: new Error('localStorage is unavailable')
    };
  }

  let raw = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error);
    return {
      ok: false,
      status: STORAGE_STATUS.READ_FAILED,
      data: null,
      raw: null,
      error
    };
  }

  if (raw === null) {
    return {
      ok: true,
      status: STORAGE_STATUS.MISSING,
      data: null,
      raw: null,
      error: null
    };
  }

  try {
    const data = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
    return {
      ok: true,
      status: STORAGE_STATUS.SUCCESS,
      data,
      raw,
      error: null
    };
  } catch (jsonErr) {
    console.error(`Failed to parse JSON for localStorage key "${key}"`, jsonErr);
    return {
      ok: false,
      status: STORAGE_STATUS.MALFORMED,
      data: null,
      raw,
      error: jsonErr
    };
  }
}

/**
 * Safely saves a corrupted record into a quarantine slot to prevent permanent data loss.
 *
 * @param {string} key - Original storage key
 * @param {string} raw - Corrupted raw payload
 * @param {any} error - Parse error
 */
export function safeStorageQuarantine(key, raw, error = null) {
  if (!isStorageAvailable() || raw === null || raw === undefined) return false;
  try {
    const quarantineKey = `${QUARANTINE_PREFIX}${key}`;
    const payload = JSON.stringify({
      originalKey: key,
      quarantinedAt: new Date().toISOString(),
      raw,
      errorMessage: error?.message || String(error || 'Malformed JSON')
    });
    window.localStorage.setItem(quarantineKey, payload);
    return true;
  } catch (e) {
    console.warn(`Failed to write quarantine for key "${key}"`, e);
    return false;
  }
}

/**
 * Returns all currently active quarantine keys.
 */
export function getQuarantinedKeys() {
  if (!isStorageAvailable()) return [];
  const keys = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(QUARANTINE_PREFIX)) {
        keys.push(k.substring(QUARANTINE_PREFIX.length));
      }
    }
  } catch (e) {
    // Ignore access error
  }
  return keys;
}

/**
 * Retrieves the raw quarantine record for a given key.
 */
export function getQuarantinedData(key) {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(`${QUARANTINE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Removes a quarantine record for a given key.
 */
export function removeQuarantinedData(key) {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(`${QUARANTINE_PREFIX}${key}`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reads and parses a localStorage key with a fallback value.
 * Fully backwards-compatible with existing call sites.
 *
 * @param {string} key
 * @param {any} fallback
 * @param {Object} options - Optional flags (e.g. { quarantineOnMalformed: true })
 * @returns {any}
 */
export function safeStorageGet(key, fallback = null, options = {}) {
  const inspected = safeStorageInspect(key);

  if (inspected.status === STORAGE_STATUS.SUCCESS) {
    return inspected.data;
  }

  if (inspected.status === STORAGE_STATUS.MALFORMED && options.quarantineOnMalformed) {
    safeStorageQuarantine(key, inspected.raw, inspected.error);
  }

  return fallback;
}

/**
 * Serializes and writes a value to localStorage.
 * Truthfully reports SUCCESS, QUOTA_EXCEEDED, or STORAGE failure.
 * Backwards compatible with callers expecting { ok: boolean, error: 'quota'|'storage'|null }.
 *
 * @param {string} key
 * @param {any} value
 * @returns {{ ok: boolean, error: string|null, status: string }}
 */
export function safeStorageSet(key, value) {
  if (!isStorageAvailable()) {
    return {
      ok: false,
      error: 'storage',
      status: STORAGE_STATUS.UNAVAILABLE
    };
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch (serialError) {
    console.error(`Failed to serialize value for localStorage key "${key}"`, serialError);
    return {
      ok: false,
      error: 'storage',
      status: STORAGE_STATUS.WRITE_FAILED
    };
  }

  try {
    window.localStorage.setItem(key, serialized);
    return {
      ok: true,
      error: null,
      status: STORAGE_STATUS.SUCCESS
    };
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error);
    const quotaExceeded =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.code === 22 ||
        error.code === 1014);

    return {
      ok: false,
      error: quotaExceeded ? 'quota' : 'storage',
      status: quotaExceeded ? STORAGE_STATUS.QUOTA_EXCEEDED : STORAGE_STATUS.WRITE_FAILED
    };
  }
}

/**
 * Safely removes a key from localStorage.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function safeStorageRemove(key) {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}"`, error);
    return false;
  }
}

/**
 * Safely clears storage, optionally filtered by a key prefix.
 *
 * @param {string|null} prefix - Optional key prefix
 * @returns {boolean}
 */
export function safeStorageClear(prefix = null) {
  if (!isStorageAvailable()) return false;
  try {
    if (!prefix) {
      window.localStorage.clear();
      return true;
    }

    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    return false;
  }
}
