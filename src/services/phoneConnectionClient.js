/**
 * phoneConnectionClient.js
 *
 * Browser-side Client for Learning Tracker Phone Connection API (Stage 2A).
 *
 * Invariants:
 * 1. Communicates with Netlify Functions backend using Firebase ID tokens.
 * 2. Non-blocking: Network or server failures NEVER block local Focus timer or roadmap completions.
 * 3. Never fabricates telemetry or mocks server success in production runtime.
 * 4. Fails honestly with clear status when cloud backend is unconfigured.
 */

import { getFirebaseAuth } from './firebase';

const DEFAULT_API_BASE = '/api/v1/phone';

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__PHONE_CONNECTION_API__) {
    return window.__PHONE_CONNECTION_API__;
  }
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_PHONE_API_URL) {
    return process.env.REACT_APP_PHONE_API_URL;
  }
  return DEFAULT_API_BASE;
}

let customAuthTokenProvider = null;

export function setAuthTokenProvider(provider) {
  customAuthTokenProvider = provider;
}

export function resetAuthTokenProvider() {
  customAuthTokenProvider = null;
}

async function getAuthHeader() {
  try {
    if (typeof customAuthTokenProvider === 'function') {
      const customToken = await customAuthTokenProvider();
      if (customToken) {
        return customToken.startsWith('Bearer ') ? customToken : `Bearer ${customToken}`;
      }
      return null;
    }
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return token ? `Bearer ${token}` : null;
  } catch (err) {
    return null;
  }
}

/**
 * Initiates device pairing challenge from web workstation
 */
export async function startPairingSession() {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return {
      success: false,
      error: 'Google authentication required to pair a companion phone.',
      code: 'AUTH_REQUIRED'
    };
  }

  const url = `${getApiBaseUrl()}/pair/start`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Server returned HTTP ${res.status}`,
        code: data.code || 'SERVER_ERROR'
      };
    }

    return {
      success: true,
      challengeId: data.challengeId,
      pairingCode: data.pairingCode,
      expiresAt: data.expiresAt,
      expiresInSeconds: data.expiresInSeconds
    };
  } catch (err) {
    return {
      success: false,
      error: 'Could not connect to phone pairing service.',
      code: 'NETWORK_ERROR'
    };
  }
}

/**
 * Lists paired devices belonging to the authenticated user
 */
export async function listPairedDevices() {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'Authentication required.', devices: [] };
  }

  const url = `${getApiBaseUrl()}/devices`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error, devices: [] };
    }

    return { success: true, devices: data.devices || [] };
  } catch (err) {
    return { success: false, error: 'Network error fetching devices.', devices: [] };
  }
}

/**
 * Revokes a paired device
 */
export async function revokePairedDevice(deviceId) {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'Authentication required.' };
  }

  const url = `${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Failed with status ${res.status}` };
    }

    return { success: true, deviceId, revoked: true };
  } catch (err) {
    return { success: false, error: 'Network error revoking device.' };
  }
}

/**
 * Relays Focus session start to serverless backend (Non-blocking)
 */
export async function relaySessionStart(session) {
  if (!session || !session.sessionId) return { relayed: false, reason: 'INVALID_SESSION' };

  const authHeader = await getAuthHeader();
  if (!authHeader) {
    // Unauthenticated local user: perfectly normal, local focus runs without relay
    return { relayed: false, reason: 'LOCAL_MODE_UNAUTHENTICATED' };
  }

  const url = `${getApiBaseUrl()}/focus-sessions/start`;
  const payload = {
    sessionId: session.sessionId,
    startedAt: session.startedAt ? new Date(session.startedAt).getTime() : Date.now(),
    intendedDurationSeconds: (session.targetMinutes || 25) * 60,
    taskName: session.task?.name || session.taskName || 'STEM Focus Session',
    subjectName: session.task?.subjectName || session.subjectName || 'Engineering Domain'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { relayed: false, status: res.status };
    }
    const data = await res.json().catch(() => ({}));
    return { relayed: true, session: data.session };
  } catch (err) {
    // Non-blocking: network failures do not impact local Focus session
    return { relayed: false, reason: 'NETWORK_UNAVAILABLE' };
  }
}

/**
 * Relays Focus session end to serverless backend (Non-blocking)
 */
export async function relaySessionEnd(sessionId, outcome = {}) {
  if (!sessionId) return { relayed: false };

  const authHeader = await getAuthHeader();
  if (!authHeader) return { relayed: false, reason: 'LOCAL_MODE_UNAUTHENTICATED' };

  const url = `${getApiBaseUrl()}/focus-sessions/${encodeURIComponent(sessionId)}/end`;
  const payload = {
    endedAt: outcome.endedAt ? new Date(outcome.endedAt).getTime() : Date.now(),
    status: outcome.status || 'COMPLETE'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { relayed: false, status: res.status };
    }
    const data = await res.json().catch(() => ({}));
    return { relayed: true, session: data.session };
  } catch (err) {
    return { relayed: false, reason: 'NETWORK_UNAVAILABLE' };
  }
}

/**
 * Queries server to fetch and reconcile any late-arriving telemetry for a session
 */
export async function fetchAndReconcileSessionTelemetry(sessionId) {
  if (!sessionId) return { success: false, telemetry: null };

  const authHeader = await getAuthHeader();
  if (!authHeader) return { success: false, reason: 'LOCAL_MODE_UNAUTHENTICATED', telemetry: null };

  const url = `${getApiBaseUrl()}/focus-sessions/${encodeURIComponent(sessionId)}/telemetry`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader
      }
    });

    if (!res.ok) {
      return { success: false, status: res.status, telemetry: null };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      reconciled: Boolean(data.reconciled),
      telemetry: data.telemetry || null
    };
  } catch (err) {
    return { success: false, reason: 'NETWORK_UNAVAILABLE', telemetry: null };
  }
}

/**
 * Deletes all stored companion telemetry for authenticated owner on the server
 */
export async function deletePhoneTelemetry() {
  const authHeader = await getAuthHeader();
  if (!authHeader) return { success: false, reason: 'LOCAL_MODE_UNAUTHENTICATED' };

  const url = `${getApiBaseUrl()}/telemetry`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader
      }
    });

    if (!res.ok) return { success: false, status: res.status };
    const data = await res.json().catch(() => ({}));
    return { success: true, deletedCount: data.deletedCount || 0 };
  } catch (err) {
    return { success: false, reason: 'NETWORK_UNAVAILABLE' };
  }
}
