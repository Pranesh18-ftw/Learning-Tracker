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
