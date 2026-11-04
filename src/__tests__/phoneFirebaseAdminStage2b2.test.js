/**
 * phoneFirebaseAdminStage2b2.test.js
 *
 * Verification Test Suite for Stage 2B.2 Firebase Admin Runtime Compatibility & Modular SDK Migration.
 *
 * Verifies:
 * 1. Admin SDK initialization & shared app singleton.
 * 2. Credentials configuration and escaped-newline handling.
 * 3. Missing configuration / SDK unavailable behavior.
 * 4. Invalid configuration & initialization errors without leaking secrets.
 * 5. Authentication through modular SDK API (getAuth).
 * 6. Firestore repository modular initialization (getFirestore).
 * 7. Health-check semantics (/status accuracy, distinguishing MISSING, INIT_FAILED, RUNTIME_READY, CONNECTED).
 * 8. Production failure behavior without in-memory storage fallback.
 */

import {
  getFirebaseAdminApp,
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
  getFirebaseAdminStatus,
  getFirebaseAdminCredentials,
  sanitizeErrorMessage,
  loadAdminSubmodule,
  setFirebaseAdminAppForTest,
  setFirebaseAdminAuthForTest,
  setFirebaseAdminFirestoreForTest,
  setAdminSubmoduleLoaderForTest,
  resetFirebaseAdminStateForTest
} from '../server/phone/firebaseAdminApp.js';
import {
  authenticateWebRequest
} from '../server/phone/phoneAuthenticationService.js';
import {
  FirestorePhoneRepository,
  StorageUnconfiguredError,
  getDefaultPhoneRepository,
  isFirestoreConfigured,
  hasFirestoreEnvironmentConfig
} from '../server/phone/phoneDurableRepository.js';
import {
  handlePhoneApiRequest
} from '../server/phone/phoneApiRouter.js';

describe('Stage 2B.2: Firebase Admin Runtime & Modular SDK Integration Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetFirebaseAdminStateForTest();
    // Clean environment variables
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.PHONE_DIAGNOSTIC_SECRET;
    delete process.env.DIAGNOSTIC_SECRET;
  });

  afterEach(() => {
    resetFirebaseAdminStateForTest();
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // 1. CREDENTIALS CONFIGURATION & ESCAPED-NEWLINE PARSING
  // =========================================================================
  describe('Credentials Configuration & Escaped Newlines', () => {
    test('1. Extracts credentials from discrete env vars with escaped-newline replacement', () => {
      process.env.FIREBASE_PROJECT_ID = 'test-proj-123';
      process.env.FIREBASE_CLIENT_EMAIL = 'admin@test-proj-123.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBg\\n-----END PRIVATE KEY-----';

      const creds = getFirebaseAdminCredentials();
      expect(creds).not.toBeNull();
      expect(creds.projectId).toBe('test-proj-123');
      expect(creds.clientEmail).toBe('admin@test-proj-123.iam.gserviceaccount.com');
      expect(creds.privateKey).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg\n-----END PRIVATE KEY-----');
      expect(creds.privateKey).toContain('\n');
      expect(creds.privateKey).not.toContain('\\n');
    });

    test('1b. Handles quoted private key with CRLF and multiple escaped newlines in discrete env vars', () => {
      process.env.FIREBASE_PROJECT_ID = 'test-proj-quoted';
      process.env.FIREBASE_CLIENT_EMAIL = 'quoted@test-proj-quoted.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '"-----BEGIN RSA PRIVATE KEY-----\\r\\nMIIEowIBAAKCAQEA0\\n-----END RSA PRIVATE KEY-----\\r\\n"';

      const creds = getFirebaseAdminCredentials();
      expect(creds).not.toBeNull();
      expect(creds.privateKey).toBe('-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----\n');
      expect(creds.privateKey.startsWith('"')).toBe(false);
      expect(creds.privateKey.endsWith('"')).toBe(false);
    });

    test('2. Extracts credentials from FIREBASE_SERVICE_ACCOUNT_KEY JSON with escaped-newline replacement', () => {
      const serviceAccount = {
        project_id: 'sa-proj-456',
        client_email: 'sa@sa-proj-456.iam.gserviceaccount.com',
        private_key: '-----BEGIN RSA-----\\nABCDEF123456\\n-----END RSA-----'
      };
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(serviceAccount);

      const creds = getFirebaseAdminCredentials();
      expect(creds).not.toBeNull();
      expect(creds.project_id).toBe('sa-proj-456');
      expect(creds.private_key).toBe('-----BEGIN RSA-----\nABCDEF123456\n-----END RSA-----');
    });

    test('2b. Fails closed when FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields', () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        project_id: 'sa-incomplete'
      });

      expect(() => getFirebaseAdminCredentials()).toThrow(/missing required field\(s\): client_email, private_key/);
      expect(getFirebaseAdminStatus().state).toBe('INITIALIZATION_FAILED');
    });

    test('3. Throws when FIREBASE_SERVICE_ACCOUNT_KEY is malformed JSON without leaking raw string', () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{ invalid json "key": -----BEGIN KEY----- }';

      expect(() => getFirebaseAdminCredentials()).toThrow(/Malformed FIREBASE_SERVICE_ACCOUNT_KEY/);
      try {
        getFirebaseAdminCredentials();
      } catch (err) {
        expect(err.message).not.toContain('-----BEGIN KEY-----');
      }
    });

    test('3b. Throws when discrete env vars are incomplete (missing required variables)', () => {
      process.env.FIREBASE_PROJECT_ID = 'incomplete-proj';
      // Missing FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY

      expect(() => getFirebaseAdminCredentials()).toThrow(/missing FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY/);
      const status = getFirebaseAdminStatus();
      expect(status.state).toBe('INITIALIZATION_FAILED');
      expect(status.details).toContain('missing FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    });

    test('3c. Throws when FIREBASE_PRIVATE_KEY lacks PEM delimiters (header/footer)', () => {
      process.env.FIREBASE_PROJECT_ID = 'test-proj';
      process.env.FIREBASE_CLIENT_EMAIL = 'admin@test-proj.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = 'invalid-raw-key-without-pem-markers';

      expect(() => getFirebaseAdminCredentials()).toThrow(/key must contain PEM header and footer/);
      expect(getFirebaseAdminStatus().state).toBe('INITIALIZATION_FAILED');
    });

    test('4. Returns null when credentials are not configured', () => {
      expect(getFirebaseAdminCredentials()).toBeNull();
      expect(hasFirestoreEnvironmentConfig()).toBe(false);
      expect(isFirestoreConfigured()).toBe(false);
      expect(getFirebaseAdminStatus().state).toBe('MISSING_CONFIGURATION');
    });
  });

  // =========================================================================
  // 2. ERROR SANITIZATION & SECRET LEAK PREVENTION
  // =========================================================================
  describe('Secret Leak Prevention & Error Sanitization', () => {
    test('5. sanitizeErrorMessage redacts private keys, device tokens, and JWTs', () => {
      const rawMessage = 'Error with key -----BEGIN PRIVATE KEY-----\nSecretPayload\n-----END PRIVATE KEY----- for token devtok_abc123xyz and jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak';
      const sanitized = sanitizeErrorMessage(rawMessage);

      expect(sanitized).not.toContain('SecretPayload');
      expect(sanitized).not.toContain('devtok_abc123xyz');
      expect(sanitized).not.toContain('doNotLeak');
      expect(sanitized).toContain('[REDACTED_KEY]');
      expect(sanitized).toContain('[REDACTED_TOKEN]');
      expect(sanitized).toContain('[REDACTED_JWT]');
    });
  });

  // =========================================================================
  // 3. ADMIN SDK INITIALIZATION & SHARED APP SINGLETON
  // =========================================================================
  describe('Shared Modular Firebase Admin App Singleton', () => {
    test('6. getFirebaseAdminApp throws FIREBASE_ADMIN_UNCONFIGURED when env vars absent', () => {
      expect(() => getFirebaseAdminApp()).toThrow(expect.objectContaining({
        code: 'FIREBASE_ADMIN_UNCONFIGURED'
      }));
    });

    test('7. Shared app instance is used by both getFirebaseAdminAuth and getFirebaseAdminFirestore', () => {
      const mockApp = { name: '[DEFAULT]', options: {} };
      const mockAuth = { app: mockApp, verifyIdToken: jest.fn() };
      const mockFirestore = { app: mockApp, collection: jest.fn() };

      setFirebaseAdminAppForTest(mockApp);
      setFirebaseAdminAuthForTest(mockAuth);
      setFirebaseAdminFirestoreForTest(mockFirestore);

      const app = getFirebaseAdminApp();
      const auth = getFirebaseAdminAuth();
      const firestore = getFirebaseAdminFirestore();

      expect(app).toBe(mockApp);
      expect(auth).toBe(mockAuth);
      expect(firestore).toBe(mockFirestore);
      expect(auth.app).toBe(app);
      expect(firestore.app).toBe(app);
    });

    test('8. Rejects test seam manipulation outside test environment', () => {
      const savedEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => setFirebaseAdminAppForTest({})).toThrow(/forbidden outside test environment/);
        expect(() => setFirebaseAdminAuthForTest({})).toThrow(/forbidden outside test environment/);
        expect(() => setFirebaseAdminFirestoreForTest({})).toThrow(/forbidden outside test environment/);
        expect(() => setAdminSubmoduleLoaderForTest(() => {})).toThrow(/forbidden outside test environment/);
      } finally {
        process.env.NODE_ENV = savedEnv;
      }
    });
  });

  // =========================================================================
  // 4. AUTHENTICATION THROUGH MODULAR SDK API
  // =========================================================================
  describe('Modular SDK Web Authentication', () => {
    test('9. authenticateWebRequest returns 503 AUTH_BACKEND_UNCONFIGURED when Admin SDK is unconfigured', async () => {
      const res = await authenticateWebRequest('Bearer some_token');
      expect(res.authenticated).toBe(false);
      expect(res.statusCode).toBe(503);
      expect(res.code).toBe('AUTH_BACKEND_UNCONFIGURED');
    });

    test('10. authenticateWebRequest verifies token via modular getAuth and checks audience', async () => {
      process.env.FIREBASE_PROJECT_ID = 'target-firebase-project';

      const mockAuth = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'auth_user_999',
          email: 'user999@example.com',
          aud: 'target-firebase-project'
        })
      };
      setFirebaseAdminAuthForTest(mockAuth);

      const res = await authenticateWebRequest('Bearer valid_prod_id_token');
      expect(res.authenticated).toBe(true);
      expect(res.uid).toBe('auth_user_999');
      expect(res.accountId).toBe('usr_auth_user_999');
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid_prod_id_token', true);
    });

    test('11. authenticateWebRequest rejects token if audience does not match FIREBASE_PROJECT_ID', async () => {
      process.env.FIREBASE_PROJECT_ID = 'expected-project';

      const mockAuth = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'auth_user_rogue',
          email: 'rogue@example.com',
          aud: 'wrong-project-attacker'
        })
      };
      setFirebaseAdminAuthForTest(mockAuth);

      const res = await authenticateWebRequest('Bearer attacker_token');
      expect(res.authenticated).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.code).toBe('INVALID_TOKEN_AUDIENCE');
    });

    test('12. authenticateWebRequest returns 401 INVALID_TOKEN when verifyIdToken throws', async () => {
      const mockAuth = {
        verifyIdToken: jest.fn().mockRejectedValue(new Error('Firebase ID token has expired.'))
      };
      setFirebaseAdminAuthForTest(mockAuth);

      const res = await authenticateWebRequest('Bearer expired_token');
      expect(res.authenticated).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.code).toBe('INVALID_TOKEN');
    });
  });

  // =========================================================================
  // 5. FIRESTORE REPOSITORY MODULAR INTEGRATION
  // =========================================================================
  describe('Firestore Repository Initialization', () => {
    test('13. FirestorePhoneRepository throws StorageUnconfiguredError when env vars absent', () => {
      const repo = new FirestorePhoneRepository();
      expect(repo.isConfigured()).toBe(false);
      expect(() => repo._getDb()).toThrow(StorageUnconfiguredError);
    });

    test('14. Injected Firestore instance marks repository configured and returns instance', () => {
      const mockDb = { collection: jest.fn() };
      const repo = new FirestorePhoneRepository(mockDb);

      expect(repo.isConfigured()).toBe(true);
      expect(repo._getDb()).toBe(mockDb);
    });

    test('15. FirestorePhoneRepository uses modular getFirebaseAdminFirestore when configured', () => {
      const mockDb = { collection: jest.fn() };
      setFirebaseAdminFirestoreForTest(mockDb);

      const repo = new FirestorePhoneRepository();
      expect(repo.isConfigured()).toBe(true);
      expect(repo._getDb()).toBe(mockDb);
    });
  });

  // =========================================================================
  // 6. HEALTH-CHECK ACCURACY (/status)
  // =========================================================================
  describe('Health-Check Semantics & Diagnostic Protection', () => {
    test('16. Public /status reports ONLY approved contract fields to unauthenticated callers when unconfigured', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data).toEqual({
        status: 'OK',
        service: 'learning-tracker-phone-connection',
        version: '1.0.0'
      });
      // Explicitly verify sensitive infrastructure details are never exposed publicly
      expect(data.storageConfigured).toBeUndefined();
      expect(data.storageState).toBeUndefined();
      expect(data.storageDetails).toBeUndefined();
      expect(data.databaseConnected).toBeUndefined();
      expect(Object.keys(data).sort()).toEqual(['service', 'status', 'version']);
    });

    test('17. Public /status returns ONLY approved fields and does not leak internal exception details when credentials JSON is invalid', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{ bad json';

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data).toEqual({
        status: 'OK',
        service: 'learning-tracker-phone-connection',
        version: '1.0.0'
      });
      expect(data.storageDetails).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('bad json');
      expect(JSON.stringify(data)).not.toContain('INITIALIZATION_FAILED');
    });

    test('18. Public /status does NOT probe database or invoke Firestore collection', async () => {
      const mockDb = { collection: jest.fn() };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('OK');
      expect(data.service).toBe('learning-tracker-phone-connection');
      expect(data.version).toBe('1.0.0');
      // Ensure zero Firestore reads occurred for public request
      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('19a. /status with probe=true without administrative credentials is rejected with 401 and no Firestore read', async () => {
      const mockDb = { collection: jest.fn() };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' }
      });

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('UNAUTHORIZED_DIAGNOSTIC');
      expect(data.error).toBe('Authentication required for diagnostic probe.');
      // Enforce zero Firestore reads for unauthenticated probe requests
      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('19b. /status with probe=true with invalid credentials or pairing secret is rejected with 403 and no Firestore read', async () => {
      process.env.PHONE_DIAGNOSTIC_SECRET = 'valid-super-secret-admin-diag-token';
      process.env.PAIRING_SECRET_PEPPER = 'pairing-pepper-do-not-reuse-as-diag';

      const mockDb = { collection: jest.fn() };
      setFirebaseAdminFirestoreForTest(mockDb);

      // Attempt 1: Invalid arbitrary token
      const resWrong = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer wrong-diagnostic-token' }
      });
      expect(resWrong.statusCode).toBe(403);
      expect(JSON.parse(resWrong.body).code).toBe('FORBIDDEN_DIAGNOSTIC');
      expect(mockDb.collection).not.toHaveBeenCalled();

      // Attempt 2: Reusing pairing secret pepper must be explicitly rejected
      const resPepper = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: `Bearer ${process.env.PAIRING_SECRET_PEPPER}` }
      });
      expect(resPepper.statusCode).toBe(403);
      expect(JSON.parse(resPepper.body).code).toBe('FORBIDDEN_DIAGNOSTIC');
      expect(mockDb.collection).not.toHaveBeenCalled();

      // Attempt 3: Ordinary user token must not grant administrative diagnostic access
      const resUser = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer normal-user-id-token' }
      });
      expect(resUser.statusCode).toBe(403);
      expect(JSON.parse(resUser.body).code).toBe('FORBIDDEN_DIAGNOSTIC');
      expect(mockDb.collection).not.toHaveBeenCalled();

      // Attempt 4: Diagnostic probe without configured server secret fails closed (403 DIAGNOSTIC_NOT_CONFIGURED)
      delete process.env.PHONE_DIAGNOSTIC_SECRET;
      delete process.env.DIAGNOSTIC_SECRET;
      const resDisabled = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer some-token' }
      });
      expect(resDisabled.statusCode).toBe(403);
      expect(JSON.parse(resDisabled.body).code).toBe('DIAGNOSTIC_NOT_CONFIGURED');
      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('19c. /status with probe=true with valid administrative credentials performs probe and returns sanitized diagnostic data', async () => {
      process.env.PHONE_DIAGNOSTIC_SECRET = 'valid-super-secret-admin-diag-token';

      const mockDoc = { get: jest.fn().mockResolvedValue({ exists: true }) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
      const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
      setFirebaseAdminFirestoreForTest(mockDb);

      // Test via Authorization: Bearer
      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer valid-super-secret-admin-diag-token' }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('OK');
      expect(data.service).toBe('learning-tracker-phone-connection');
      expect(data.version).toBe('1.0.0');
      expect(data.storageConfigured).toBe(true);
      expect(data.storageState).toBe('CONNECTED');
      expect(data.databaseConnected).toBe(true);
      expect(data.storageDetails).toBe('Database probe connected successfully.');
      expect(mockDb.collection).toHaveBeenCalledWith('_health');

      // Test via X-Diagnostic-Token header
      const resHeader = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { 'x-diagnostic-token': 'valid-super-secret-admin-diag-token' }
      });
      expect(resHeader.statusCode).toBe(200);
      expect(JSON.parse(resHeader.body).databaseConnected).toBe(true);
    });

    test('20. /status with probe=true reports OPERATION_FAILED and sanitized details without leaking internal error messages when probe throws', async () => {
      process.env.PHONE_DIAGNOSTIC_SECRET = 'valid-super-secret-admin-diag-token';

      const mockDoc = { get: jest.fn().mockRejectedValue(new Error('Connection timeout to Firestore at 10.0.0.1:443.')) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
      const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer valid-super-secret-admin-diag-token' }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.storageConfigured).toBe(false);
      expect(data.storageState).toBe('OPERATION_FAILED');
      expect(data.databaseConnected).toBe(false);
      // Ensure raw internal error, stack trace, and IP address are NOT leaked
      expect(data.storageDetails).toBe('Database connectivity probe failed.');
      expect(JSON.stringify(data)).not.toContain('Connection timeout to Firestore');
      expect(JSON.stringify(data)).not.toContain('10.0.0.1');
    });
  });

  // =========================================================================
  // 7. PRODUCTION STORAGE INVARIANTS & NO IN-MEMORY FALLBACK
  // =========================================================================
  describe('Production Storage Invariants', () => {
    test('21. getDefaultPhoneRepository strictly returns FirestorePhoneRepository in production', () => {
      const savedEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const repo = getDefaultPhoneRepository();
        expect(repo).toBeInstanceOf(FirestorePhoneRepository);
        expect(repo.isConfigured()).toBe(false);
      } finally {
        process.env.NODE_ENV = savedEnv;
      }
    });

    test('22. Unconfigured repository in production rejects write operations without fallback', async () => {
      const repo = new FirestorePhoneRepository();

      await expect(repo.savePairingChallenge({ challengeId: 'fail_ch_1' }))
        .rejects
        .toThrow(StorageUnconfiguredError);

      await expect(repo.saveDevice({ deviceId: 'fail_dev_1' }))
        .rejects
        .toThrow(StorageUnconfiguredError);
    });
  });

  // =========================================================================
  // 8. STATIC SUBMODULE LOADING & SDK PACKAGING / AVAILABILITY
  // =========================================================================
  describe('Static Submodule Loading & SDK Availability', () => {
    test('23. Loads each supported Firebase Admin submodule explicitly (app, auth, firestore)', () => {
      const appModule = loadAdminSubmodule('app');
      expect(appModule).toBeDefined();
      expect(typeof appModule.initializeApp).toBe('function');
      expect(typeof appModule.cert).toBe('function');
      expect(typeof appModule.getApps).toBe('function');
      expect(typeof appModule.getApp).toBe('function');

      const authModule = loadAdminSubmodule('auth');
      expect(authModule).toBeDefined();
      expect(typeof authModule.getAuth).toBe('function');

      const firestoreModule = loadAdminSubmodule('firestore');
      expect(firestoreModule).toBeDefined();
      expect(typeof firestoreModule.getFirestore).toBe('function');
    });

    test('24. Rejects unsupported submodule names clearly', () => {
      expect(() => loadAdminSubmodule('database')).toThrow(
        /Failed to load Firebase Admin submodule 'database': Unsupported submodule\. Must be 'app', 'auth', or 'firestore'\./
      );
      expect(() => loadAdminSubmodule('storage')).toThrow(
        /Failed to load Firebase Admin submodule 'storage': Unsupported submodule\. Must be 'app', 'auth', or 'firestore'\./
      );
      expect(() => loadAdminSubmodule('messaging')).toThrow(
        /Failed to load Firebase Admin submodule 'messaging': Unsupported submodule\. Must be 'app', 'auth', or 'firestore'\./
      );
      expect(() => loadAdminSubmodule('../secret')).toThrow(
        /Unsupported submodule/
      );
    });

    test('25. Reports SDK_NOT_AVAILABLE with storageConfigured: false when SDK submodule fails to load', async () => {
      setAdminSubmoduleLoaderForTest(() => {
        throw new Error("Cannot find module 'firebase-admin/app'\nRequire stack:\n- /var/task/netlify/functions/phone.js");
      });

      const status = getFirebaseAdminStatus();
      expect(status.configured).toBe(false);
      expect(status.state).toBe('SDK_NOT_AVAILABLE');
      expect(status.sdkLoaded).toBe(false);
      expect(status.hasCredentials).toBe(false);
      expect(status.appInitialized).toBe(false);
      expect(status.details).toContain("Cannot find module 'firebase-admin/app'");

      // Public unauthenticated request returns ONLY approved fields
      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toEqual({
        status: 'OK',
        service: 'learning-tracker-phone-connection',
        version: '1.0.0'
      });
      expect(body.storageConfigured).toBeUndefined();
      expect(body.storageState).toBeUndefined();
      expect(body.storageDetails).toBeUndefined();
      expect(body.databaseConnected).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain("Cannot find module 'firebase-admin/app'");

      // Privileged administrative diagnostic request returns sanitized status without leaking stack or path
      process.env.PHONE_DIAGNOSTIC_SECRET = 'admin-diag-secret';
      const diagRes = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' },
        headers: { authorization: 'Bearer admin-diag-secret' }
      });
      expect(diagRes.statusCode).toBe(200);
      const diagBody = JSON.parse(diagRes.body);
      expect(diagBody.storageConfigured).toBe(false);
      expect(diagBody.storageState).toBe('SDK_NOT_AVAILABLE');
      expect(diagBody.storageDetails).toBe('Storage dependencies unavailable.');
      expect(JSON.stringify(diagBody)).not.toContain("Cannot find module 'firebase-admin/app'");
    });

    test('26. SDK loads successfully but credentials are missing reports MISSING_CONFIGURATION with sdkLoaded: true', () => {
      const status = getFirebaseAdminStatus();
      expect(status.configured).toBe(false);
      expect(status.state).toBe('MISSING_CONFIGURATION');
      expect(status.sdkLoaded).toBe(true);
      expect(status.hasCredentials).toBe(false);
      expect(status.appInitialized).toBe(false);
      expect(status.details).toBe('Firebase Admin credentials not set in environment');
    });

    test('27. No credential values are included in SDK loading or initialization error messages', () => {
      setAdminSubmoduleLoaderForTest(() => {
        throw new Error('Failure loading submodule with key -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----\n and token devtok_mocksecret123');
      });

      const status = getFirebaseAdminStatus();
      expect(status.state).toBe('SDK_NOT_AVAILABLE');
      expect(status.details).not.toContain('MIIEowIBAAKCAQEA0');
      expect(status.details).not.toContain('devtok_mocksecret123');
      expect(status.details).toContain('[REDACTED_KEY]');
      expect(status.details).toContain('[REDACTED_TOKEN]');
    });
  });
});
