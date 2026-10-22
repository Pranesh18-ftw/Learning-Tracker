/**
 * phoneApiRouter.js
 *
 * HTTP Dispatcher & Route Controller for Netlify Functions Phone API (Stage 2A).
 *
 * Routes:
 * POST   /pair/start                              (Web Auth -> Pairing Challenge)
 * POST   /pair/complete                           (Phone Payload -> Device Token)
 * GET    /devices                                 (Web Auth -> Device Inventory)
 * DELETE /devices/:deviceId                       (Web Auth -> Device Revocation)
 * POST   /focus-sessions/start                    (Web Auth -> Session Start Relay)
 * POST   /focus-sessions/:sessionId/end           (Web Auth -> Session End Relay)
 * GET    /focus-session/active                    (Device Auth -> Active Session Poll)
 * POST   /telemetry-summaries                     (Device Auth -> Summary Ingest)
 * GET    /focus-sessions/:sessionId/telemetry     (Web Auth -> Reconcile & Retrieve)
 * DELETE /telemetry                               (Web Auth -> Purge Telemetry)
 * GET    /status                                  (Public Health Check)
 */

import {
  authenticateWebRequest,
  authenticateDeviceRequest
} from './phoneAuthenticationService.js';
import {
  startPairingChallenge,
  completePairingChallenge,
  listOwnerDevices,
  revokeDevice
} from './devicePairingService.js';
import {
  relaySessionStart,
  relaySessionEnd,
  getActiveSessionForDevice,
  getSessionStatusForDevice,
  getUnreconciledSessionsForDevice
} from './focusSessionRelayService.js';
import {
  ingestTelemetrySummary,
  deleteOwnerTelemetry
} from './phoneTelemetryService.js';
import {
  reconcileSessionTelemetry
} from './telemetryReconciliationService.js';
import {
  validatePayloadSize,
  validateContentLengthHeader
} from './phoneValidation.js';
import {
  getDefaultPhoneRepository
} from './phoneDurableRepository.js';

const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: STANDARD_HEADERS,
    body: JSON.stringify(data)
  };
}

/**
 * Normalizes request path across direct Netlify function URL and /api/v1/phone redirects
 */
export function normalizePath(rawPath) {
  if (!rawPath) return '/';
  let p = rawPath.trim();
  p = p.replace(/^\/\.netlify\/functions\/phone/, '');
  p = p.replace(/^\/api\/v1\/phone/, '');
  p = p.replace(/^\/api\/phone/, '');
  if (!p.startsWith('/')) p = `/${p}`;
  return p.replace(/\/+$/, '') || '/';
}

/**
 * Main API Request Dispatcher
 */
export async function handlePhoneApiRequest(event, injectedRepo = null) {
  // 1. CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: STANDARD_HEADERS,
      body: ''
    };
  }

  const repository = injectedRepo || getDefaultPhoneRepository();
  const path = normalizePath(event.path || event.rawUrl || '/');
  const method = (event.httpMethod || 'GET').toUpperCase();
  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  // 2. Health / Status Check
  if (method === 'GET' && (path === '/' || path === '/status')) {
    const probe = event.queryStringParameters?.probe === 'true';
    const storageInfo = typeof repository.getStorageStatus === 'function'
      ? await repository.getStorageStatus({ probe })
      : {
          configured: repository.isConfigured(),
          state: repository.isConfigured() ? 'RUNTIME_READY' : 'MISSING_CONFIGURATION',
          details: repository.isConfigured() ? 'Storage ready' : 'Storage unconfigured',
          connectivityTested: false,
          connected: null
        };

    return jsonResponse(200, {
      status: 'OK',
      service: 'learning-tracker-phone-connection',
      version: '1.0.0',
      storageConfigured: storageInfo.configured,
      storageState: storageInfo.state,
      storageDetails: storageInfo.details,
      databaseConnected: storageInfo.connected !== undefined ? storageInfo.connected : null
    });
  }

  // 3. Content-Length and payload size checks
  const contentLength = event.headers?.['content-length'] || event.headers?.['Content-Length'];
  const headerValidation = validateContentLengthHeader(contentLength);
  if (!headerValidation.valid) {
    return jsonResponse(413, { error: headerValidation.error, code: headerValidation.code });
  }

  const sizeValidation = validatePayloadSize(event.body);
  if (!sizeValidation.valid) {
    return jsonResponse(413, { error: sizeValidation.error, code: sizeValidation.code });
  }

  // 4. Parse body if present
  let body = {};
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
      return jsonResponse(400, { error: 'Invalid JSON request body.', code: 'INVALID_JSON' });
    }
  }

  try {
    // ── ROUTE 1: POST /pair/start ──
    if (method === 'POST' && path === '/pair/start') {
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await startPairingChallenge(auth.uid, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 2: POST /pair/complete ──
    if (method === 'POST' && path === '/pair/complete') {
      const clientIp = event.headers?.['x-nf-client-connection-ip'] ||
                       event.headers?.['client-ip'] ||
                       event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                       'unknown_ip';
      const result = await completePairingChallenge(body, repository, clientIp);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 3: GET /devices ──
    if (method === 'GET' && path === '/devices') {
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await listOwnerDevices(auth.uid, repository);
      return jsonResponse(result.statusCode || 200, result);
    }

    // ── ROUTE 4: DELETE /devices/:deviceId ──
    const deviceMatch = path.match(/^\/devices\/([^/]+)$/);
    if (method === 'DELETE' && deviceMatch) {
      const targetDeviceId = decodeURIComponent(deviceMatch[1]);
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await revokeDevice(auth.uid, targetDeviceId, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 5: POST /focus-sessions/start ──
    if (method === 'POST' && path === '/focus-sessions/start') {
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await relaySessionStart(auth.uid, body, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 6: POST /focus-sessions/:sessionId/end ──
    const sessionEndMatch = path.match(/^\/focus-sessions\/([^/]+)\/end$/);
    if (method === 'POST' && sessionEndMatch) {
      const targetSessionId = decodeURIComponent(sessionEndMatch[1]);
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await relaySessionEnd(auth.uid, targetSessionId, body, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 7: GET /focus-session/active ──
    if (method === 'GET' && path === '/focus-session/active') {
      const auth = await authenticateDeviceRequest(authHeader, repository);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await getActiveSessionForDevice(auth.ownerUid, repository);
      return jsonResponse(result.statusCode || 200, result);
    }

    // ── ROUTE 7b: GET /focus-sessions/:sessionId/status ──
    const sessionStatusMatch = path.match(/^\/focus-sessions\/([^/]+)\/status$/);
    if (method === 'GET' && sessionStatusMatch) {
      const targetSessionId = decodeURIComponent(sessionStatusMatch[1]);
      const deviceAuth = await authenticateDeviceRequest(authHeader, repository);
      let ownerUid = null;
      if (deviceAuth.authenticated) {
        ownerUid = deviceAuth.ownerUid;
      } else {
        const webAuth = await authenticateWebRequest(authHeader);
        if (webAuth.authenticated) {
          ownerUid = webAuth.uid;
        }
      }
      if (!ownerUid) {
        return jsonResponse(401, { error: 'Authentication required.', code: 'UNAUTHORIZED' });
      }
      const result = await getSessionStatusForDevice(ownerUid, targetSessionId, repository);
      return jsonResponse(result.statusCode || 200, result);
    }

    // ── ROUTE 7c: GET /focus-sessions/unreconciled ──
    if (method === 'GET' && path === '/focus-sessions/unreconciled') {
      const auth = await authenticateDeviceRequest(authHeader, repository);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const limit = event.queryStringParameters?.limit;
      const since = event.queryStringParameters?.since;
      const result = await getUnreconciledSessionsForDevice(auth.ownerUid, repository, { limit, since });
      return jsonResponse(result.statusCode || 200, result);
    }

    // ── ROUTE 8: POST /telemetry-summaries ──
    if (method === 'POST' && path === '/telemetry-summaries') {
      const auth = await authenticateDeviceRequest(authHeader, repository);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await ingestTelemetrySummary(auth.device, body, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 9: GET /focus-sessions/:sessionId/telemetry ──
    const sessionTelemetryMatch = path.match(/^\/focus-sessions\/([^/]+)\/telemetry$/);
    if (method === 'GET' && sessionTelemetryMatch) {
      const targetSessionId = decodeURIComponent(sessionTelemetryMatch[1]);
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await reconcileSessionTelemetry(auth.uid, targetSessionId, repository);
      return jsonResponse(result.statusCode || (result.success ? 200 : 400), result);
    }

    // ── ROUTE 10: DELETE /telemetry ──
    if (method === 'DELETE' && path === '/telemetry') {
      const auth = await authenticateWebRequest(authHeader);
      if (!auth.authenticated) {
        return jsonResponse(auth.statusCode || 401, { error: auth.error, code: auth.code });
      }
      const result = await deleteOwnerTelemetry(auth.uid, repository);
      return jsonResponse(result.statusCode || 200, result);
    }

    // Route not found
    return jsonResponse(404, {
      error: `Route '${method} ${path}' not found.`,
      code: 'ROUTE_NOT_FOUND'
    });
  } catch (err) {
    if (err.name === 'StorageUnconfiguredError' || err.code === 'STORAGE_UNCONFIGURED') {
      return jsonResponse(503, {
        error: 'Phone connection durable storage is unconfigured.',
        code: 'STORAGE_UNCONFIGURED',
        message: err.message
      });
    }

    console.error('Unhandled phone API server error:', err.message);
    return jsonResponse(500, {
      error: 'An internal server error occurred while processing the request.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
