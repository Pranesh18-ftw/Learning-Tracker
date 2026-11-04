/**
 * mockAuthServer.js (TEST-ONLY HELPER)
 *
 * In-memory test helper for companion device pairing and multi-tenant test suites.
 * This file is purely for tests and is NEVER imported by production runtime code.
 */

export class MockAuthServerDatabase {
  constructor() {
    this.users = new Map();              // internalUserId -> User object
    this.authIdentities = new Map();     // `${provider}:${providerSubject}` -> internalUserId
    this.sessions = new Map();           // sessionToken -> Session object
    this.devices = new Map();            // deviceId -> Device object
    this.deviceTokens = new Map();       // deviceToken -> { deviceId, userId }
    this.pairingRequests = new Map();    // tokenId -> PairingRequest object
    this.userData = new Map();           // internalUserId -> { sessions: [], completions: [], evidence: [] }
  }

  reset() {
    this.users.clear();
    this.authIdentities.clear();
    this.sessions.clear();
    this.devices.clear();
    this.deviceTokens.clear();
    this.pairingRequests.clear();
    this.userData.clear();
  }

  /**
   * Validates a Google Identity Token.
   * Checks signature structure, expiration, audience, and tampered claims.
   */
  verifyGoogleIdToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token missing or invalid format.' };
    }

    // Tampered token check
    if (token.includes('tampered') || token.includes('invalid_signature')) {
      return { valid: false, error: 'Invalid token signature.' };
    }

    try {
      let payload;
      if (token.startsWith('{')) {
        payload = JSON.parse(token);
      } else if (token.startsWith('google-token:')) {
        const parts = token.split(':');
        payload = {
          iss: 'https://accounts.google.com',
          sub: parts[1] || 'google-sub-default',
          email: parts[2] || 'user@example.com',
          name: parts[3] || 'Google User',
          exp: Math.floor(Date.now() / 1000) + 3600
        };
      } else if (token.includes('.')) {
        const parts = token.split('.');
        if (parts.length !== 3) {
          return { valid: false, error: 'Malformed JWT token.' };
        }
        payload = JSON.parse(atob(parts[1]));
      } else {
        return { valid: false, error: 'Unrecognized token format.' };
      }

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token has expired.' };
      }

      // Check issuer
      if (payload.iss && !payload.iss.includes('accounts.google.com')) {
        return { valid: false, error: 'Invalid token issuer.' };
      }

      // Must have stable Google subject ID
      if (!payload.sub) {
        return { valid: false, error: 'Token missing stable subject identifier (sub).' };
      }

      return {
        valid: true,
        payload: {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture || null
        }
      };
    } catch (e) {
      return { valid: false, error: 'Failed to parse identity token: ' + e.message };
    }
  }

  /**
   * Authenticates a verified Google identity into a canonical internal user.
   */
  authenticateGoogleUser({ sub, email, name, picture }) {
    const identityKey = `google:${sub}`;
    let userId = this.authIdentities.get(identityKey);
    let user;

    if (userId && this.users.has(userId)) {
      user = this.users.get(userId);
      user.profile.email = email || user.profile.email;
      user.profile.displayName = name || user.profile.displayName;
      user.profile.avatar = picture || user.profile.avatar;
      user.updatedAt = Date.now();
    } else {
      userId = sub ? `usr_${sub}` : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      user = {
        id: userId,
        authIdentities: [
          {
            provider: 'google',
            providerSubject: sub,
            linkedAt: Date.now()
          }
        ],
        profile: {
          displayName: name || 'Learner',
          email: email || null,
          avatar: picture || null
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.users.set(userId, user);
      this.authIdentities.set(identityKey, userId);
      this.userData.set(userId, { sessions: [], completions: [], evidence: [] });
    }

    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const csrfToken = `csrf_${Math.random().toString(36).substring(2, 12)}`;

    const session = {
      sessionToken,
      csrfToken,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };

    this.sessions.set(sessionToken, session);
    this.sessions.set(`sess_${user.id}`, session);

    return {
      success: true,
      user: {
        id: user.id,
        displayName: user.profile.displayName,
        email: user.profile.email,
        avatar: user.profile.avatar,
        authProvider: 'google',
        createdAt: user.createdAt
      },
      sessionToken,
      csrfToken
    };
  }

  authorizeSession(sessionToken, csrfToken = null) {
    if (sessionToken && sessionToken.startsWith('sess_usr_')) {
      const userId = sessionToken.replace('sess_', '');
      return { authorized: true, userId };
    }

    if (!sessionToken || !this.sessions.has(sessionToken)) {
      return { authorized: false, error: 'Unauthorized: Invalid or expired session.' };
    }

    const session = this.sessions.get(sessionToken);
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionToken);
      return { authorized: false, error: 'Unauthorized: Session expired.' };
    }

    if (csrfToken && session.csrfToken !== csrfToken) {
      return { authorized: false, error: 'Forbidden: CSRF token mismatch.' };
    }

    return { authorized: true, userId: session.userId };
  }

  getUserSessions(sessionToken) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    const data = this.userData.get(auth.userId) || { sessions: [] };
    return data.sessions;
  }

  recordUserSession(sessionToken, sessionRecord) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    if (!this.userData.has(auth.userId)) {
      this.userData.set(auth.userId, { sessions: [], completions: [], evidence: [] });
    }

    const store = this.userData.get(auth.userId);
    store.sessions.push(sessionRecord);
    return { success: true, count: store.sessions.length };
  }

  registerUserDevice(sessionToken, deviceData) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    const deviceId = deviceData.deviceId || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deviceRecord = {
      id: deviceId,
      userId: auth.userId,
      platform: deviceData.platform || 'web',
      name: deviceData.name || 'Connected Device',
      status: 'active',
      createdAt: Date.now(),
      lastSeenAt: Date.now()
    };

    this.devices.set(deviceId, deviceRecord);
    return deviceRecord;
  }

  getUserDevices(sessionToken) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    const userDevices = [];
    for (const dev of this.devices.values()) {
      if (dev.userId === auth.userId) {
        userDevices.push(dev);
      }
    }
    return userDevices;
  }

  createPairingRequest(sessionToken) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    const tokenId = `pair_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pairingRequest = {
      tokenId,
      userId: auth.userId,
      expiresAt: Date.now() + 5 * 60 * 1000,
      status: 'PENDING',
      consumedAt: null,
      pairUrl: `https://learningtracker001.netlify.app/connect/${tokenId}`
    };

    this.pairingRequests.set(tokenId, pairingRequest);
    return { success: true, pairingRequest };
  }

  verifyPairingRequest(tokenId) {
    if (!tokenId || !this.pairingRequests.has(tokenId)) {
      return { valid: false, error: 'Pairing request not found.' };
    }

    const req = this.pairingRequests.get(tokenId);
    if (req.status === 'CONSUMED') {
      return { valid: false, error: 'Pairing code has already been used.' };
    }

    if (req.status === 'REVOKED' || req.expiresAt < Date.now()) {
      req.status = 'EXPIRED';
      return { valid: false, error: 'Pairing request has expired.' };
    }

    const user = this.users.get(req.userId);
    return {
      valid: true,
      tokenId: req.tokenId,
      userId: req.userId,
      accountDisplayName: user?.profile?.displayName || 'Learner',
      expiresAt: req.expiresAt
    };
  }

  consumePairingToken(tokenId, deviceData = {}) {
    const verification = this.verifyPairingRequest(tokenId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const req = this.pairingRequests.get(tokenId);
    req.status = 'CONSUMED';
    req.consumedAt = Date.now();

    const deviceId = deviceData.deviceId || `dev_android_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deviceRecord = {
      id: deviceId,
      userId: req.userId,
      platform: 'android',
      name: deviceData.name || 'Galaxy S25',
      status: 'active',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      capabilities: {
        hasUsageAccess: Boolean(deviceData.hasUsageAccess ?? true),
        model: deviceData.model || 'SM-S921B'
      }
    };

    this.devices.set(deviceId, deviceRecord);

    const deviceToken = `devtok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    this.deviceTokens.set(deviceToken, {
      deviceId,
      userId: req.userId,
      createdAt: Date.now()
    });

    return {
      success: true,
      device: deviceRecord,
      deviceToken
    };
  }

  revokeDevice(sessionToken, deviceId) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    if (!this.devices.has(deviceId)) {
      return { success: false, error: 'Device not found.' };
    }

    const dev = this.devices.get(deviceId);
    if (dev.userId !== auth.userId) {
      return { success: false, error: 'Forbidden: Device belongs to another account.' };
    }

    dev.status = 'revoked';
    dev.revokedAt = Date.now();

    for (const [token, binding] of this.deviceTokens.entries()) {
      if (binding.deviceId === deviceId) {
        this.deviceTokens.delete(token);
      }
    }

    return { success: true, deviceId, status: 'revoked' };
  }

  renameDevice(sessionToken, deviceId, newName) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    if (!this.devices.has(deviceId)) {
      return { success: false, error: 'Device not found.' };
    }

    const dev = this.devices.get(deviceId);
    if (dev.userId !== auth.userId) {
      return { success: false, error: 'Forbidden: Device belongs to another account.' };
    }

    dev.name = newName.trim() || dev.name;
    dev.updatedAt = Date.now();

    return { success: true, device: dev };
  }

  authorizeDeviceToken(deviceToken) {
    if (!deviceToken || !this.deviceTokens.has(deviceToken)) {
      return { authorized: false, error: 'Unauthorized: Invalid or revoked device token.', status: 'revoked' };
    }

    const binding = this.deviceTokens.get(deviceToken);
    const dev = this.devices.get(binding.deviceId);
    if (!dev || dev.status === 'revoked') {
      return { authorized: false, error: 'Unauthorized: Device association has been revoked.', status: 'revoked' };
    }

    return {
      authorized: true,
      deviceId: binding.deviceId,
      userId: binding.userId,
      device: dev
    };
  }

  recordCompanionTelemetry(deviceToken, telemetryData) {
    const auth = this.authorizeDeviceToken(deviceToken);
    if (!auth.authorized) {
      return { success: false, error: auth.error, status: auth.status || 'unauthorized' };
    }

    auth.device.lastSeenAt = Date.now();

    if (!this.userData.has(auth.userId)) {
      this.userData.set(auth.userId, { sessions: [], completions: [], evidence: [], telemetry: [] });
    }

    const store = this.userData.get(auth.userId);
    if (!store.telemetry) store.telemetry = [];

    const existingIndex = store.telemetry.findIndex(t => t.sessionId === telemetryData.sessionId);
    if (existingIndex >= 0) {
      return { success: true, duplicate: true, telemetry: store.telemetry[existingIndex] };
    }

    const recorded = {
      ...telemetryData,
      deviceId: auth.deviceId,
      receivedAt: Date.now()
    };
    store.telemetry.push(recorded);

    return { success: true, count: store.telemetry.length, recorded };
  }

  signOut(sessionToken) {
    if (this.sessions.has(sessionToken)) {
      this.sessions.delete(sessionToken);
    }
    return { success: true };
  }

  deleteUserAccount(sessionToken) {
    const auth = this.authorizeSession(sessionToken);
    if (!auth.authorized) {
      throw new Error(auth.error);
    }

    const userId = auth.userId;

    for (const [token, sess] of this.sessions.entries()) {
      if (sess.userId === userId) {
        this.sessions.delete(token);
      }
    }

    for (const [key, mappedId] of this.authIdentities.entries()) {
      if (mappedId === userId) {
        this.authIdentities.delete(key);
      }
    }

    for (const [devId, dev] of this.devices.entries()) {
      if (dev.userId === userId) {
        this.devices.delete(devId);
      }
    }
    for (const [token, binding] of this.deviceTokens.entries()) {
      if (binding.userId === userId) {
        this.deviceTokens.delete(token);
      }
    }
    for (const [tokenId, req] of this.pairingRequests.entries()) {
      if (req.userId === userId) {
        this.pairingRequests.delete(tokenId);
      }
    }

    this.userData.delete(userId);
    this.users.delete(userId);

    return { success: true, deletedUserId: userId };
  }
}

export const mockAuthServer = new MockAuthServerDatabase();

describe('MockAuthServer test helper', () => {
  test('initializes and resets correctly for tests', () => {
    mockAuthServer.reset();
    expect(mockAuthServer.users.size).toBe(0);
    expect(mockAuthServer.sessions.size).toBe(0);
  });
});
