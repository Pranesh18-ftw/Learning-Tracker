/**
 * phoneDurableRepository.js
 *
 * Durable Repository Layer for Learning Tracker Phone Connection (Stage 2A).
 *
 * Strict Invariants:
 * 1. Process memory or local filesystem is NEVER treated as durable storage in production.
 * 2. In production, operations target Cloud Firestore using server credentials.
 * 3. If Firestore is unconfigured, operations throw StorageUnconfiguredError with clear guidance.
 *    Production code NEVER automatically falls back to an in-memory repository.
 * 4. In-memory repository (createInMemoryPhoneRepository) is explicitly restricted to test suites.
 */

import {
  getFirebaseAdminFirestore,
  getFirebaseAdminStatus,
  sanitizeErrorMessage
} from './firebaseAdminApp.js';

export class StorageUnconfiguredError extends Error {
  constructor(message = 'Durable Firestore repository is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server environment.') {
    super(message);
    this.name = 'StorageUnconfiguredError';
    this.code = 'STORAGE_UNCONFIGURED';
    this.statusCode = 503;
  }
}

/**
 * Checks whether production Firestore credentials are set in environment
 */
export function hasFirestoreEnvironmentConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson && serviceAccountJson.trim().length > 0) return true;
  return Boolean(projectId && clientEmail && privateKey);
}

/**
 * Checks whether production Firestore credentials are set and runtime ready
 */
export function isFirestoreConfigured() {
  const status = getFirebaseAdminStatus();
  return Boolean(status.configured);
}

/**
 * Cloud Firestore Durable Repository (Production)
 */
export class FirestorePhoneRepository {
  constructor(firestoreInstance = null) {
    this._firestore = firestoreInstance;
    this._injected = Boolean(firestoreInstance);
  }

  isConfigured() {
    if (this._firestore) return true;
    const status = getFirebaseAdminStatus();
    return Boolean(status.configured);
  }

  async getStorageStatus({ probe = false } = {}) {
    if (this._firestore) {
      let connected = null;
      if (probe) {
        try {
          await this._firestore.collection('_health').doc('ping').get();
          connected = true;
        } catch (err) {
          return {
            configured: false,
            state: 'OPERATION_FAILED',
            details: `Database probe failed: ${sanitizeErrorMessage(err.message)}`,
            connectivityTested: true,
            connected: false
          };
        }
      }
      return {
        configured: true,
        state: probe && connected ? 'CONNECTED' : 'RUNTIME_READY',
        details: this._injected ? 'Injected Firestore instance' : 'Firebase Admin initialized and ready',
        connectivityTested: Boolean(probe),
        connected
      };
    }

    const adminStatus = getFirebaseAdminStatus();
    if (!adminStatus.configured) {
      return {
        configured: false,
        state: adminStatus.state,
        details: adminStatus.details,
        connectivityTested: false,
        connected: null
      };
    }

    let connected = null;
    if (probe) {
      try {
        const db = this._getDb();
        await db.collection('_health').doc('ping').get();
        connected = true;
      } catch (err) {
        return {
          configured: false,
          state: 'OPERATION_FAILED',
          details: `Database probe failed: ${sanitizeErrorMessage(err.message)}`,
          connectivityTested: true,
          connected: false
        };
      }
    }

    return {
      configured: true,
      state: probe && connected ? 'CONNECTED' : 'RUNTIME_READY',
      details: 'Firebase Admin initialized with valid credentials',
      connectivityTested: Boolean(probe),
      connected
    };
  }

  _getDb() {
    if (this._firestore) return this._firestore;
    const status = getFirebaseAdminStatus();
    if (!status.configured) {
      if (status.state === 'INITIALIZATION_FAILED') {
        throw new StorageUnconfiguredError(`Failed to initialize Firebase Admin SDK: ${status.details}`);
      }
      throw new StorageUnconfiguredError();
    }
    try {
      this._firestore = getFirebaseAdminFirestore();
      return this._firestore;
    } catch (err) {
      throw new StorageUnconfiguredError(`Failed to initialize Firebase Admin SDK: ${sanitizeErrorMessage(err.message)}`);
    }
  }

  async savePairingChallenge(challenge) {
    const db = this._getDb();
    await db.collection('phone_pairing_challenges').doc(challenge.challengeId).set(challenge);
    return challenge;
  }

  async getPairingChallengeById(challengeId) {
    const db = this._getDb();
    const doc = await db.collection('phone_pairing_challenges').doc(challengeId).get();
    return doc.exists ? doc.data() : null;
  }

  async getPairingChallengeByHash(codeHash) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_pairing_challenges')
      .where('codeHash', '==', codeHash)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  async updatePairingChallenge(challengeId, patch) {
    const db = this._getDb();
    const ref = db.collection('phone_pairing_challenges').doc(challengeId);
    await ref.update(patch);
    const updated = await ref.get();
    return updated.data();
  }

  async redeemPairingChallengeTransaction({ challengeId, codeHash, deviceId, deviceRecord, credentialRecord }) {
    const db = this._getDb();
    return db.runTransaction(async (transaction) => {
      let challengeDoc;
      let challengeRef;

      if (challengeId) {
        challengeRef = db.collection('phone_pairing_challenges').doc(challengeId);
        challengeDoc = await transaction.get(challengeRef);
      } else {
        const query = await db.collection('phone_pairing_challenges')
          .where('codeHash', '==', codeHash)
          .where('status', '==', 'PENDING')
          .limit(1)
          .get();
        if (query.empty) {
          return { success: false, code: 'INVALID_PAIRING_CODE', error: 'Invalid or expired pairing code.' };
        }
        challengeRef = query.docs[0].ref;
        challengeDoc = await transaction.get(challengeRef);
      }

      if (!challengeDoc.exists) {
        return { success: false, code: 'INVALID_PAIRING_CODE', error: 'Invalid pairing code.' };
      }

      const challenge = challengeDoc.data();
      const now = Date.now();

      if (challenge.status !== 'PENDING') {
        return { success: false, code: 'INVALID_PAIRING_CODE', error: 'Pairing code has already been consumed or cancelled.' };
      }

      if (now > challenge.expiresAt) {
        transaction.update(challengeRef, { status: 'EXPIRED' });
        return { success: false, code: 'CODE_EXPIRED', error: 'Pairing code has expired. Please generate a new code.' };
      }

      const currentAttempts = (challenge.attemptsCount || 0) + 1;
      if (challenge.codeHash !== codeHash) {
        const isExceeded = currentAttempts >= 5;
        transaction.update(challengeRef, {
          attemptsCount: currentAttempts,
          status: isExceeded ? 'EXPIRED' : 'PENDING'
        });
        return {
          success: false,
          code: isExceeded ? 'TOO_MANY_ATTEMPTS' : 'INVALID_PAIRING_CODE',
          error: isExceeded ? 'Too many failed redemption attempts. Challenge expired.' : 'Invalid pairing code.'
        };
      }

      // Check device collision across accounts
      const deviceRef = db.collection('phone_devices').doc(deviceId);
      const existingDeviceDoc = await transaction.get(deviceRef);
      if (existingDeviceDoc.exists && existingDeviceDoc.data().ownerUid !== challenge.ownerUid) {
        return { success: false, code: 'DEVICE_ID_CONFLICT', error: 'Device identifier is registered to another account.' };
      }

      // Atomically consume challenge and register device + credential
      transaction.update(challengeRef, {
        status: 'CONSUMED',
        consumedAt: now,
        consumedByDeviceId: deviceId,
        attemptsCount: currentAttempts
      });

      const fullDeviceRecord = {
        ...deviceRecord,
        ownerUid: challenge.ownerUid
      };
      const fullCredentialRecord = {
        ...credentialRecord,
        ownerUid: challenge.ownerUid
      };

      transaction.set(deviceRef, fullDeviceRecord);
      const credRef = db.collection('phone_device_credentials').doc(credentialRecord.tokenHash);
      transaction.set(credRef, fullCredentialRecord);

      return {
        success: true,
        challenge
      };
    });
  }

  async saveDevice(device) {
    const db = this._getDb();
    await db.collection('phone_devices').doc(device.deviceId).set(device);
    return device;
  }

  async getDevice(deviceId) {
    const db = this._getDb();
    const doc = await db.collection('phone_devices').doc(deviceId).get();
    return doc.exists ? doc.data() : null;
  }

  async listDevicesByOwner(ownerUid) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_devices')
      .where('ownerUid', '==', ownerUid)
      .get();
    return snapshot.docs.map(d => d.data());
  }

  async updateDevice(deviceId, patch) {
    const db = this._getDb();
    const ref = db.collection('phone_devices').doc(deviceId);
    await ref.update(patch);
    const updated = await ref.get();
    return updated.data();
  }

  async saveDeviceCredential(credential) {
    const db = this._getDb();
    await db.collection('phone_device_credentials').doc(credential.tokenHash).set(credential);
    return credential;
  }

  async getDeviceCredentialByHash(tokenHash) {
    const db = this._getDb();
    const doc = await db.collection('phone_device_credentials').doc(tokenHash).get();
    return doc.exists ? doc.data() : null;
  }

  async revokeDeviceCredentials(deviceId) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_device_credentials')
      .where('deviceId', '==', deviceId)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'revoked', revokedAt: Date.now() });
    });
    await batch.commit();
    return { success: true };
  }

  async saveFocusSession(session) {
    const db = this._getDb();
    await db.collection('phone_focus_sessions').doc(session.sessionId).set(session);
    return session;
  }

  async getFocusSession(sessionId) {
    const db = this._getDb();
    const doc = await db.collection('phone_focus_sessions').doc(sessionId).get();
    return doc.exists ? doc.data() : null;
  }

  async getActiveFocusSessions(ownerUid) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_focus_sessions')
      .where('ownerUid', '==', ownerUid)
      .where('status', '==', 'RUNNING')
      .get();
    return snapshot.docs.map(d => d.data());
  }

  async getUnreconciledFocusSessions(ownerUid, { limit = 5, sinceMs = 0 } = {}) {
    const db = this._getDb();
    let query = db.collection('phone_focus_sessions')
      .where('ownerUid', '==', ownerUid)
      .where('status', '==', 'COMPLETE');

    if (sinceMs > 0) {
      query = query.where('startedAtClient', '>=', sinceMs);
    }

    const snapshot = await query.limit(limit * 2).get();
    const sessions = snapshot.docs
      .map(d => d.data())
      .filter(s => !s.reconciledTelemetryId);

    return sessions
      .sort((a, b) => (b.startedAtClient || 0) - (a.startedAtClient || 0))
      .slice(0, limit);
  }

  async updateFocusSession(sessionId, patch) {
    const db = this._getDb();
    const ref = db.collection('phone_focus_sessions').doc(sessionId);
    await ref.update(patch);
    const updated = await ref.get();
    return updated.data();
  }

  async saveTelemetrySummary(summary) {
    const db = this._getDb();
    await db.collection('phone_telemetry_summaries').doc(summary.summaryId).set(summary);
    return summary;
  }

  async getTelemetrySummary(summaryId) {
    const db = this._getDb();
    const doc = await db.collection('phone_telemetry_summaries').doc(summaryId).get();
    return doc.exists ? doc.data() : null;
  }

  async getTelemetryBySessionId(sessionId, ownerUid) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_telemetry_summaries')
      .where('sessionId', '==', sessionId)
      .where('ownerUid', '==', ownerUid)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  async ingestTelemetrySummaryTransaction(summaryRecord) {
    const db = this._getDb();
    return db.runTransaction(async (transaction) => {
      const ref = db.collection('phone_telemetry_summaries').doc(summaryRecord.summaryId);
      const doc = await transaction.get(ref);

      if (doc.exists) {
        const existing = doc.data();
        if (existing.ownerUid !== summaryRecord.ownerUid) {
          return { success: false, code: 'SUMMARY_ID_COLLISION', error: 'Summary ID collision across accounts.' };
        }
        const existingPayload = JSON.stringify(existing.payload);
        const incomingPayload = JSON.stringify(summaryRecord.payload);
        if (existingPayload === incomingPayload) {
          return { success: true, idempotent: true, record: existing };
        }
        return { success: false, code: 'CONFLICTING_SUMMARY_CONTENT', error: 'Conflicting telemetry summary already exists with same summary ID.' };
      }

      transaction.set(ref, summaryRecord);
      return { success: true, idempotent: false, record: summaryRecord };
    });
  }

  async deleteTelemetryByOwner(ownerUid) {
    const db = this._getDb();
    const snapshot = await db.collection('phone_telemetry_summaries')
      .where('ownerUid', '==', ownerUid)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Clear dangling telemetry pointers on owner's sessions
    const sessionsSnapshot = await db.collection('phone_focus_sessions')
      .where('ownerUid', '==', ownerUid)
      .get();
    sessionsSnapshot.docs.forEach(doc => {
      if (doc.data().reconciledTelemetryId) {
        batch.update(doc.ref, { reconciledTelemetryId: null, reconciledAtServer: null });
      }
    });

    await batch.commit();
    return { deletedCount: snapshot.docs.length };
  }

  async checkRateLimit(key, maxLimit, windowMs) {
    const db = this._getDb();
    const ref = db.collection('phone_rate_limits').doc(key);
    const now = Date.now();
    let isAllowed = true;
    let currentCount = 1;

    await db.runTransaction(async t => {
      const doc = await t.get(ref);
      if (!doc.exists) {
        t.set(ref, { count: 1, windowStart: now });
      } else {
        const data = doc.data();
        if (now - data.windowStart > windowMs) {
          t.set(ref, { count: 1, windowStart: now });
        } else if (data.count >= maxLimit) {
          isAllowed = false;
          currentCount = data.count;
        } else {
          currentCount = data.count + 1;
          t.update(ref, { count: currentCount });
        }
      }
    });

    return { allowed: isAllowed, currentCount };
  }
}

/**
 * In-Memory Phone Repository (Exclusively for unit & integration testing)
 */
export function createInMemoryPhoneRepository() {
  const challenges = new Map();
  const devices = new Map();
  const credentials = new Map();
  const sessions = new Map();
  const telemetry = new Map();
  const rateLimits = new Map();

  return {
    isConfigured: () => true,

    getStorageStatus: async () => ({
      configured: true,
      state: 'RUNTIME_READY',
      details: 'In-memory test repository active',
      connectivityTested: true,
      connected: true
    }),

    savePairingChallenge: async (challenge) => {
      challenges.set(challenge.challengeId, { ...challenge });
      return challenge;
    },

    getPairingChallengeById: async (challengeId) => {
      const c = challenges.get(challengeId);
      return c ? { ...c } : null;
    },

    getPairingChallengeByHash: async (codeHash) => {
      for (const item of challenges.values()) {
        if (item.codeHash === codeHash) return { ...item };
      }
      return null;
    },

    updatePairingChallenge: async (challengeId, patch) => {
      const existing = challenges.get(challengeId);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      challenges.set(challengeId, updated);
      return { ...updated };
    },

    redeemPairingChallengeTransaction: async ({ challengeId, codeHash, deviceId, deviceRecord, credentialRecord }) => {
      let challenge = null;
      if (challengeId) {
        challenge = challenges.get(challengeId) || null;
      } else {
        for (const ch of challenges.values()) {
          if (ch.codeHash === codeHash && ch.status === 'PENDING') {
            challenge = ch;
            break;
          }
        }
      }

      if (!challenge) {
        return { success: false, code: 'INVALID_PAIRING_CODE', error: 'Invalid or expired pairing code.' };
      }

      const now = Date.now();
      if (challenge.status !== 'PENDING') {
        return { success: false, code: 'INVALID_PAIRING_CODE', error: 'Pairing code has already been consumed or cancelled.' };
      }

      if (now > challenge.expiresAt) {
        challenge.status = 'EXPIRED';
        challenges.set(challenge.challengeId, { ...challenge });
        return { success: false, code: 'CODE_EXPIRED', error: 'Pairing code has expired. Please generate a new code.' };
      }

      const currentAttempts = (challenge.attemptsCount || 0) + 1;
      challenge.attemptsCount = currentAttempts;

      if (challenge.codeHash !== codeHash) {
        const isExceeded = currentAttempts >= 5;
        if (isExceeded) challenge.status = 'EXPIRED';
        challenges.set(challenge.challengeId, { ...challenge });
        return {
          success: false,
          code: isExceeded ? 'TOO_MANY_ATTEMPTS' : 'INVALID_PAIRING_CODE',
          error: isExceeded ? 'Too many failed redemption attempts. Challenge expired.' : 'Invalid pairing code.'
        };
      }

      // Check device collision across accounts
      const existingDevice = devices.get(deviceId);
      if (existingDevice && existingDevice.ownerUid !== challenge.ownerUid) {
        return { success: false, code: 'DEVICE_ID_CONFLICT', error: 'Device identifier is registered to another account.' };
      }

      // Atomically consume challenge
      challenge.status = 'CONSUMED';
      challenge.consumedAt = now;
      challenge.consumedByDeviceId = deviceId;
      challenges.set(challenge.challengeId, { ...challenge });

      devices.set(deviceId, { ...deviceRecord, ownerUid: challenge.ownerUid });
      credentials.set(credentialRecord.tokenHash, { ...credentialRecord, ownerUid: challenge.ownerUid });

      return {
        success: true,
        challenge: { ...challenge }
      };
    },

    saveDevice: async (device) => {
      devices.set(device.deviceId, { ...device });
      return device;
    },

    getDevice: async (deviceId) => {
      const d = devices.get(deviceId);
      return d ? { ...d } : null;
    },

    listDevicesByOwner: async (ownerUid) => {
      const list = [];
      for (const d of devices.values()) {
        if (d.ownerUid === ownerUid) list.push({ ...d });
      }
      return list;
    },

    updateDevice: async (deviceId, patch) => {
      const existing = devices.get(deviceId);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      devices.set(deviceId, updated);
      return { ...updated };
    },

    saveDeviceCredential: async (credential) => {
      credentials.set(credential.tokenHash, { ...credential });
      return credential;
    },

    getDeviceCredentialByHash: async (tokenHash) => {
      const c = credentials.get(tokenHash);
      return c ? { ...c } : null;
    },

    revokeDeviceCredentials: async (deviceId) => {
      for (const [hash, c] of credentials.entries()) {
        if (c.deviceId === deviceId) {
          credentials.set(hash, { ...c, status: 'revoked', revokedAt: Date.now() });
        }
      }
      return { success: true };
    },

    saveFocusSession: async (session) => {
      sessions.set(session.sessionId, { ...session });
      return session;
    },

    getFocusSession: async (sessionId) => {
      const s = sessions.get(sessionId);
      return s ? { ...s } : null;
    },

    getActiveFocusSessions: async (ownerUid) => {
      const list = [];
      for (const s of sessions.values()) {
        if (s.ownerUid === ownerUid && s.status === 'RUNNING') {
          list.push({ ...s });
        }
      }
      return list;
    },

    getUnreconciledFocusSessions: async (ownerUid, { limit = 5, sinceMs = 0 } = {}) => {
      const list = [];
      for (const s of sessions.values()) {
        if (
          s.ownerUid === ownerUid &&
          s.status === 'COMPLETE' &&
          !s.reconciledTelemetryId &&
          (sinceMs === 0 || (s.startedAtClient || 0) >= sinceMs)
        ) {
          list.push({ ...s });
        }
      }
      return list
        .sort((a, b) => (b.startedAtClient || 0) - (a.startedAtClient || 0))
        .slice(0, limit);
    },

    updateFocusSession: async (sessionId, patch) => {
      const existing = sessions.get(sessionId);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      sessions.set(sessionId, updated);
      return { ...updated };
    },

    saveTelemetrySummary: async (summary) => {
      telemetry.set(summary.summaryId, { ...summary });
      return summary;
    },

    ingestTelemetrySummaryTransaction: async (summaryRecord) => {
      const existing = telemetry.get(summaryRecord.summaryId);
      if (existing) {
        if (existing.ownerUid !== summaryRecord.ownerUid) {
          return { success: false, code: 'SUMMARY_ID_COLLISION', error: 'Summary ID collision across accounts.' };
        }
        const existingPayload = JSON.stringify(existing.payload);
        const incomingPayload = JSON.stringify(summaryRecord.payload);
        if (existingPayload === incomingPayload) {
          return { success: true, idempotent: true, record: existing };
        }
        return { success: false, code: 'CONFLICTING_SUMMARY_CONTENT', error: 'Conflicting telemetry summary already exists with same summary ID.' };
      }
      telemetry.set(summaryRecord.summaryId, { ...summaryRecord });
      return { success: true, idempotent: false, record: summaryRecord };
    },

    getTelemetrySummary: async (summaryId) => {
      const t = telemetry.get(summaryId);
      return t ? { ...t } : null;
    },

    getTelemetryBySessionId: async (sessionId, ownerUid) => {
      for (const t of telemetry.values()) {
        if (t.sessionId === sessionId && t.ownerUid === ownerUid) {
          return { ...t };
        }
      }
      return null;
    },

    deleteTelemetryByOwner: async (ownerUid) => {
      let count = 0;
      for (const [id, t] of telemetry.entries()) {
        if (t.ownerUid === ownerUid) {
          telemetry.delete(id);
          count++;
        }
      }
      for (const [id, s] of sessions.entries()) {
        if (s.ownerUid === ownerUid && s.reconciledTelemetryId) {
          sessions.set(id, { ...s, reconciledTelemetryId: null, reconciledAtServer: null });
        }
      }
      return { deletedCount: count };
    },

    checkRateLimit: async (key, maxLimit, windowMs) => {
      const now = Date.now();
      const existing = rateLimits.get(key);
      if (!existing || now - existing.windowStart > windowMs) {
        rateLimits.set(key, { count: 1, windowStart: now });
        return { allowed: true, currentCount: 1 };
      }
      if (existing.count >= maxLimit) {
        return { allowed: false, currentCount: existing.count };
      }
      existing.count += 1;
      return { allowed: true, currentCount: existing.count };
    },

    _reset: () => {
      challenges.clear();
      devices.clear();
      credentials.clear();
      sessions.clear();
      telemetry.clear();
      rateLimits.clear();
    }
  };
}

let _testRepository = null;

/**
 * Registers an isolated test repository for unit/integration tests
 */
export function setPhoneRepositoryForTest(repo) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Setting test repository is forbidden outside test environments.');
  }
  _testRepository = repo;
}

/**
 * Returns active phone repository.
 * In production: strictly returns FirestorePhoneRepository.
 * In test: returns injected test repository if set.
 */
export function getDefaultPhoneRepository() {
  if (process.env.NODE_ENV === 'test' && _testRepository) {
    return _testRepository;
  }
  return new FirestorePhoneRepository();
}
