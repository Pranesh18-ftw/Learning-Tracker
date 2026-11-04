/**
 * syncTransport.js
 *
 * Truthful Transport Layer for Learning Tracker Synchronization.
 *
 * Invariants 3 & 4 (Hardened P0.3):
 * - If real backend is configured and reachable: dispatch HTTP request.
 * - If real backend is NOT configured: return/throw SYNC_UNAVAILABLE.
 * - Production runtime must NEVER silently fall back to MockSyncServerBroker.
 * - Local mutations remain queued safely in the offline-first outbox.
 */

let _testSyncBroker = null;

/**
 * Checks whether an authoritative cloud sync endpoint is configured.
 */
export function isSyncBackendConfigured() {
  const apiUrl = typeof window !== 'undefined' && window.__LEARNING_TRACKER_SYNC_API__;
  const envUrl = typeof process !== 'undefined' && process.env && process.env.REACT_APP_SYNC_BACKEND_URL;
  return Boolean(apiUrl || envUrl);
}

/**
 * Test-Only: Registers a test sync broker.
 * Strictly gated to test environments (NODE_ENV === 'test').
 * Production runtime rejects registration.
 */
export function registerTestSyncTransport(broker) {
  if (typeof process === 'undefined' || !process.env || process.env.NODE_ENV !== 'test') {
    throw new Error('Test sync broker registration is forbidden outside test environments.');
  }
  _testSyncBroker = broker;
}

/**
 * Resets test sync broker registration (used in afterEach).
 */
export function clearTestSyncTransport() {
  _testSyncBroker = null;
}

/**
 * Dispatches sync payload to authoritative server endpoint.
 * Invariant 4: Production runtime NEVER silently falls back to mock broker.
 */
export async function dispatchSyncRequest(syncPayload) {
  // 1. Allow registered test broker ONLY in automated test environment
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' && _testSyncBroker) {
    return _testSyncBroker.sync(syncPayload);
  }

  // 2. Real external backend URL (via window config or env var)
  const apiUrl = (typeof window !== 'undefined' && window.__LEARNING_TRACKER_SYNC_API__) ||
                 (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SYNC_BACKEND_URL);

  if (apiUrl) {
    const res = await fetch(`${apiUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload)
    });
    if (!res.ok) {
      const err = new Error(`Sync API failed: ${res.statusText}`);
      err.status = res.status;
      err.code = 'SYNC_API_ERROR';
      throw err;
    }
    return res.json();
  }

  // 3. No real backend configured -> Truthful SYNC_UNAVAILABLE error
  const err = new Error('No cloud sync backend configured. Data is preserved safely on this device.');
  err.code = 'SYNC_UNAVAILABLE';
  err.status = 'SYNC_UNAVAILABLE';
  throw err;
}
