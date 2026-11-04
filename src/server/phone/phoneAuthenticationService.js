/**
 * phoneAuthenticationService.js
 *
 * Server-Side Authentication & Cryptographic Verification for Phone Connection (Stage 2A).
 *
 * Invariants:
 * 1. Web authentication verifies real Firebase ID tokens and derives authoritative UID.
 *    Client-supplied UIDs in request bodies or query params are strictly ignored.
 * 2. Device authentication uses high-entropy scoped bearer credentials.
 *    Credentials are stored server-side ONLY as SHA-256 hashes.
 * 3. Revoked devices and revoked credentials immediately reject subsequent requests.
 * 4. Authorization headers and credential secrets are NEVER printed to logs.
 */

import crypto from 'crypto';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminStatus
} from './firebaseAdminApp.js';

import {
  isDeviceInactivityExpired,
  DEVICE_INACTIVITY_EXPIRY_MS
} from '../../shared/phonePolicy.js';

let _testTokenVerifier = null;

/**
 * Computes SHA-256 hex digest of sensitive input (device tokens)
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(String(data), 'utf8').digest('hex');
}

/**
 * Returns server-side secret pepper for pairing codes if configured
 */
export function getPairingSecretPepper() {
  const pepper = process.env.PAIRING_SECRET_PEPPER || null;
  if (!pepper && process.env.NODE_ENV === 'production') {
    throw new Error('PAIRING_SECRET_PEPPER is required in production to protect pairing challenges.');
  }
  return pepper;
}

/**
 * Cryptographically hashes pairing codes using keyed HMAC-SHA256 when pepper
 * is configured, or SHA-256 by default. Prevents offline rainbow-table recovery.
 */
export function hashPairingCode(rawCode, salt = '') {
  const pepper = getPairingSecretPepper();
  const input = `${String(rawCode).trim()}${salt ? `:${salt}` : ''}`;
  if (pepper) {
    return crypto.createHmac('sha256', pepper).update(input, 'utf8').digest('hex');
  }
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generates a cryptographically random 6-digit pairing code (100000 - 999999)
 */
export function generatePairingCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates an opaque, high-entropy device credential
 */
export function generateDeviceToken() {
  return `devtok_${crypto.randomBytes(32).toString('base64url')}`;
}

/**
 * Registers an isolated token verifier for unit tests
 */
export function setTokenVerifierForTest(verifier) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Setting test token verifier is forbidden outside test environments.');
  }
  _testTokenVerifier = verifier;
}

/**
 * Verifies Firebase ID token from Authorization header and extracts authoritative UID
 */
export async function authenticateWebRequest(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return {
      authenticated: false,
      error: 'Missing Authorization header.',
      code: 'MISSING_AUTHORIZATION',
      statusCode: 401
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authenticated: false,
      error: 'Malformed Authorization header. Format: Bearer <token>.',
      code: 'MALFORMED_AUTHORIZATION',
      statusCode: 401
    };
  }

  const idToken = parts[1];

  // 1. Allow registered test token verifier in test environment
  if (process.env.NODE_ENV === 'test' && _testTokenVerifier) {
    try {
      const decoded = await _testTokenVerifier(idToken);
      if (!decoded || !decoded.uid) {
        return { authenticated: false, error: 'Invalid token.', code: 'INVALID_TOKEN', statusCode: 401 };
      }
      return {
        authenticated: true,
        uid: decoded.uid,
        email: decoded.email || null,
        accountId: `usr_${decoded.uid}`
      };
    } catch (err) {
      return { authenticated: false, error: err.message, code: 'INVALID_TOKEN', statusCode: 401 };
    }
  }

  // 2. Production Firebase Admin ID token verification using modular getAuth
  try {
    const adminStatus = getFirebaseAdminStatus();
    if (!adminStatus.configured) {
      return {
        authenticated: false,
        error: 'Firebase Admin authentication is not configured on this server.',
        code: 'AUTH_BACKEND_UNCONFIGURED',
        statusCode: 503
      };
    }
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const expectedProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    if (expectedProject && decodedToken.aud && decodedToken.aud !== expectedProject) {
      return {
        authenticated: false,
        error: 'Token audience does not match configured Firebase project.',
        code: 'INVALID_TOKEN_AUDIENCE',
        statusCode: 401
      };
    }
    return {
      authenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      accountId: `usr_${decodedToken.uid}`
    };
  } catch (err) {
    return {
      authenticated: false,
      error: 'Firebase ID token verification failed.',
      code: 'INVALID_TOKEN',
      statusCode: 401
    };
  }
}

/**
 * Authenticates a companion device using scoped bearer token
 */
export async function authenticateDeviceRequest(authHeader, repository) {
  if (!authHeader || typeof authHeader !== 'string') {
    return {
      authenticated: false,
      error: 'Missing device Authorization header.',
      code: 'MISSING_DEVICE_CREDENTIAL',
      statusCode: 401
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authenticated: false,
      error: 'Malformed Authorization header. Format: Bearer <deviceToken>.',
      code: 'MALFORMED_AUTHORIZATION',
      statusCode: 401
    };
  }

  const rawToken = parts[1];
  const tokenHash = sha256(rawToken);

  const credential = await repository.getDeviceCredentialByHash(tokenHash);
  if (!credential || credential.status === 'revoked') {
    return {
      authenticated: false,
      error: 'Invalid or revoked device credential.',
      code: 'REVOKED_OR_INVALID_CREDENTIAL',
      statusCode: 401
    };
  }

  const device = await repository.getDevice(credential.deviceId);
  if (!device || device.status === 'revoked') {
    return {
      authenticated: false,
      error: 'Device registration is revoked or does not exist.',
      code: 'REVOKED_DEVICE',
      statusCode: 401
    };
  }

  // Enforce 30-day inactivity pairing expiration
  if (device.status === 'expired' || isDeviceInactivityExpired(device)) {
    if (device.status !== 'expired') {
      await repository.updateDevice(device.deviceId, {
        status: 'expired',
        expiredAt: Date.now()
      }).catch(() => {});
    }
    await repository.revokeDeviceCredentials(device.deviceId).catch(() => {});
    return {
      authenticated: false,
      error: 'Device pairing has expired due to 30 days of inactivity. Re-pairing required.',
      code: 'DEVICE_INACTIVITY_EXPIRED',
      statusCode: 401
    };
  }

  // Update last seen timestamp asynchronously (throttled to once every 5 minutes to prevent excessive Firestore writes)
  const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
  if (!device.lastSeenAt || (Date.now() - device.lastSeenAt > LAST_SEEN_UPDATE_INTERVAL_MS)) {
    repository.updateDevice(device.deviceId, { lastSeenAt: Date.now() }).catch(() => {});
  }

  return {
    authenticated: true,
    device,
    deviceId: device.deviceId,
    ownerUid: device.ownerUid,
    accountId: `usr_${device.ownerUid}`
  };
}

/**
 * Constant-time string comparison using SHA-256 digest buffers to prevent timing side-channel attacks.
 * Buffers are guaranteed to be equal length (32 bytes), avoiding timing variations and buffer length errors.
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Extracts diagnostic token from request headers (Authorization: Bearer <token> or X-Diagnostic-Token / X-Diagnostic-Secret).
 */
export function extractDiagnosticToken(event) {
  if (!event || !event.headers || typeof event.headers !== 'object') return null;
  const headers = event.headers;

  // 1. Check custom diagnostic headers case-insensitively
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if ((lowerKey === 'x-diagnostic-token' || lowerKey === 'x-diagnostic-secret') &&
        typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = headers.authorization || headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer' && parts[1].trim().length > 0) {
      return parts[1].trim();
    }
  }

  return null;
}

/**
 * Authenticates an administrative diagnostic request.
 * 
 * Rules:
 * 1. Requires a dedicated server-side diagnostic credential (PHONE_DIAGNOSTIC_SECRET or DIAGNOSTIC_SECRET).
 * 2. If diagnostic credential is not configured, diagnostic access fails closed (403).
 * 3. Rejects requests with missing credentials (401).
 * 4. Strictly forbids reuse of pairing secrets (PAIRING_SECRET_PEPPER).
 * 5. Uses constant-time comparison to prevent timing attacks.
 * 6. Never reveals internal exception details or tokens.
 */
export function authenticateDiagnosticRequest(event) {
  const providedToken = extractDiagnosticToken(event);
  if (!providedToken) {
    return {
      authorized: false,
      error: 'Authentication required for diagnostic probe.',
      code: 'UNAUTHORIZED_DIAGNOSTIC',
      statusCode: 401
    };
  }

  const configuredSecret = process.env.PHONE_DIAGNOSTIC_SECRET || process.env.DIAGNOSTIC_SECRET || null;

  if (!configuredSecret || typeof configuredSecret !== 'string' || configuredSecret.trim().length === 0) {
    return {
      authorized: false,
      error: 'Administrative diagnostic probe is not configured on this server.',
      code: 'DIAGNOSTIC_NOT_CONFIGURED',
      statusCode: 403
    };
  }

  // Strictly forbid reuse of pairing secret pepper for diagnostics
  const pairingPepper = process.env.PAIRING_SECRET_PEPPER;
  if (pairingPepper && constantTimeCompare(providedToken, pairingPepper)) {
    return {
      authorized: false,
      error: 'Invalid administrative diagnostic credentials.',
      code: 'FORBIDDEN_DIAGNOSTIC',
      statusCode: 403
    };
  }

  const isValid = constantTimeCompare(providedToken, configuredSecret.trim());
  if (!isValid) {
    return {
      authorized: false,
      error: 'Invalid administrative diagnostic credentials.',
      code: 'FORBIDDEN_DIAGNOSTIC',
      statusCode: 403
    };
  }

  return {
    authorized: true
  };
}

