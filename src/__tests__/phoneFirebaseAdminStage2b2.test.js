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
  setFirebaseAdminAppForTest,
  setFirebaseAdminAuthForTest,
  setFirebaseAdminFirestoreForTest,
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
  describe('Health-Check Semantics & Distinction', () => {
    test('16. /status reports storageConfigured: false and state: MISSING_CONFIGURATION when unconfigured', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('OK');
      expect(data.storageConfigured).toBe(false);
      expect(data.storageState).toBe('MISSING_CONFIGURATION');
      expect(data.databaseConnected).toBeNull();
    });

    test('17. /status reports INITIALIZATION_FAILED when credentials JSON is invalid', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{ bad json';

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.storageConfigured).toBe(false);
      expect(data.storageState).toBe('INITIALIZATION_FAILED');
      expect(data.databaseConnected).toBeNull();
    });

    test('18. /status reports RUNTIME_READY and does NOT probe database without probe=true', async () => {
      const mockDb = { collection: jest.fn() };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status'
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.storageConfigured).toBe(true);
      expect(data.storageState).toBe('RUNTIME_READY');
      expect(data.databaseConnected).toBeNull();
      // Ensure no unnecessary database read occurred
      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    test('19. /status with probe=true tests connectivity and reports CONNECTED when probe succeeds', async () => {
      const mockDoc = { get: jest.fn().mockResolvedValue({ exists: true }) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
      const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.storageConfigured).toBe(true);
      expect(data.storageState).toBe('CONNECTED');
      expect(data.databaseConnected).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('_health');
    });

    test('20. /status with probe=true reports OPERATION_FAILED when database probe throws', async () => {
      const mockDoc = { get: jest.fn().mockRejectedValue(new Error('Connection timeout to Firestore.')) };
      const mockCollection = { doc: jest.fn().mockReturnValue(mockDoc) };
      const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
      setFirebaseAdminFirestoreForTest(mockDb);

      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/status',
        queryStringParameters: { probe: 'true' }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.storageConfigured).toBe(false);
      expect(data.storageState).toBe('OPERATION_FAILED');
      expect(data.databaseConnected).toBe(false);
      expect(data.storageDetails).toContain('Connection timeout to Firestore');
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
});
