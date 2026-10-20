/**
 * firebaseAdminApp.js
 *
 * Centralized Firebase Admin SDK Modular Initialization & Lifecycle Management (Stage 2B.2).
 *
 * Invariants:
 * 1. Uses modular Firebase Admin APIs (firebase-admin/app, firebase-admin/auth, firebase-admin/firestore).
 * 2. Shared server-side initialization: auth and firestore share the same correctly initialized Admin app.
 * 3. Configuration via environment variables:
 *    - FIREBASE_SERVICE_ACCOUNT_KEY (JSON)
 *    - or FIREBASE_PROJECT_ID / GCLOUD_PROJECT, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * 4. Escaped-newline handling for FIREBASE_PRIVATE_KEY is preserved.
 * 5. Credentials, private keys, and tokens are NEVER printed or logged.
 * 6. Health check reports accurate status distinguishing missing config, init failure, and runtime readiness.
 */

import { TextEncoder as UtilTextEncoder, TextDecoder as UtilTextDecoder } from 'util';

// Ensure global TextEncoder/TextDecoder exist in environments like jsdom/Jest
if (typeof globalThis.TextEncoder === 'undefined' && typeof UtilTextEncoder !== 'undefined') {
  globalThis.TextEncoder = UtilTextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined' && typeof UtilTextDecoder !== 'undefined') {
  globalThis.TextDecoder = UtilTextDecoder;
}

// Test injection seams
let _testAdminApp = null;
let _testAdminAuth = null;
let _testAdminFirestore = null;
let _testAdminSubmoduleLoader = null;

/**
 * Sanitizes error messages to prevent accidental credential or token leakage
 */
export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return 'Unknown error';
  let sanitized = message.replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, '[REDACTED_KEY]');
  sanitized = sanitized.replace(/devtok_[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]');
  sanitized = sanitized.replace(/(ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g, '[REDACTED_JWT]');
  return sanitized;
}

/**
 * Loads modular firebase-admin submodules via explicit static require paths
 * with compatibility fallback for test environments (such as Jest 27 in CRA)
 * that lack subpath exports mapping.
 *
 * Using explicit literal paths ensures AST bundlers (such as esbuild and
 * Netlify zip-it-and-ship-it) can statically trace module dependencies.
 */
export function loadAdminSubmodule(submodule) {
  if (_testAdminSubmoduleLoader) {
    return _testAdminSubmoduleLoader(submodule);
  }

  switch (submodule) {
    case 'app': {
      try {
        // eslint-disable-next-line global-require
        return require('firebase-admin/app');
      } catch (err) {
        try {
          // eslint-disable-next-line global-require
          return require('firebase-admin/lib/app');
        } catch {
          throw new Error(`Failed to load Firebase Admin submodule 'app': ${sanitizeErrorMessage(err.message)}`);
        }
      }
    }
    case 'auth': {
      try {
        // eslint-disable-next-line global-require
        return require('firebase-admin/auth');
      } catch (err) {
        try {
          // eslint-disable-next-line global-require
          return require('firebase-admin/lib/auth');
        } catch {
          throw new Error(`Failed to load Firebase Admin submodule 'auth': ${sanitizeErrorMessage(err.message)}`);
        }
      }
    }
    case 'firestore': {
      try {
        // eslint-disable-next-line global-require
        return require('firebase-admin/firestore');
      } catch (err) {
        try {
          // eslint-disable-next-line global-require
          return require('firebase-admin/lib/firestore');
        } catch {
          throw new Error(`Failed to load Firebase Admin submodule 'firestore': ${sanitizeErrorMessage(err.message)}`);
        }
      }
    }
    default:
      throw new Error(`Failed to load Firebase Admin submodule '${sanitizeErrorMessage(String(submodule))}': Unsupported submodule. Must be 'app', 'auth', or 'firestore'.`);
  }
}

/**
 * Normalizes private key by trimming, stripping wrapping quotes, replacing escaped newlines,
 * and normalizing line endings to \n.
 */
export function normalizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Extracts and validates Firebase Admin credentials from environment variables.
 * Returns null if completely unconfigured.
 * Throws an Error if credentials are partially configured or malformed.
 */
export function getFirebaseAdminCredentials() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be a valid JSON object.');
      }
      const projectId = parsed.project_id || parsed.projectId;
      const clientEmail = parsed.client_email || parsed.clientEmail;
      let privateKey = parsed.private_key || parsed.privateKey;

      const missing = [];
      if (!projectId) missing.push('project_id');
      if (!clientEmail) missing.push('client_email');
      if (!privateKey) missing.push('private_key');

      if (missing.length > 0) {
        throw new Error(`FIREBASE_SERVICE_ACCOUNT_KEY JSON is missing required field(s): ${missing.join(', ')}.`);
      }

      privateKey = normalizePrivateKey(privateKey);
      if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY private_key must contain valid PEM headers (-----BEGIN ... -----END).');
      }

      return {
        ...parsed,
        projectId,
        project_id: projectId,
        clientEmail,
        client_email: clientEmail,
        privateKey,
        private_key: privateKey
      };
    } catch (err) {
      throw new Error(`Malformed FIREBASE_SERVICE_ACCOUNT_KEY: ${sanitizeErrorMessage(err.message)}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  const anyDiscreteProvided = Boolean(projectId || clientEmail || rawPrivateKey);
  if (!anyDiscreteProvided) {
    return null;
  }

  const missing = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!rawPrivateKey) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    throw new Error(`Incomplete Firebase credentials: missing ${missing.join(', ')}.`);
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);
  if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY: key must contain PEM header and footer (-----BEGIN ... -----END).');
  }

  return {
    projectId,
    project_id: projectId,
    clientEmail,
    client_email: clientEmail,
    privateKey,
    private_key: privateKey
  };
}

/**
 * Returns the shared, modular Firebase Admin App instance.
 * Initializes the default app if not already initialized.
 */
export function getFirebaseAdminApp() {
  if (_testAdminApp) {
    return _testAdminApp;
  }

  const { initializeApp, getApps, getApp, cert } = loadAdminSubmodule('app');

  const existingApps = getApps();
  if (existingApps && existingApps.length > 0) {
    return getApp();
  }

  const credentials = getFirebaseAdminCredentials();
  if (!credentials) {
    const error = new Error('Firebase Admin SDK is not configured. Missing required credentials.');
    error.code = 'FIREBASE_ADMIN_UNCONFIGURED';
    throw error;
  }

  try {
    const certConfig = cert(credentials);
    const projectId = credentials.projectId || credentials.project_id;
    return initializeApp({
      credential: certConfig,
      projectId: projectId || undefined
    });
  } catch (err) {
    const initError = new Error(`Firebase Admin initialization failed: ${sanitizeErrorMessage(err.message)}`);
    initError.code = 'FIREBASE_ADMIN_INIT_ERROR';
    throw initError;
  }
}

/**
 * Returns modular Firebase Admin Auth instance bound to the shared app.
 */
export function getFirebaseAdminAuth() {
  if (_testAdminAuth) {
    return _testAdminAuth;
  }
  const app = getFirebaseAdminApp();
  const { getAuth } = loadAdminSubmodule('auth');
  return getAuth(app);
}

/**
 * Returns modular Firebase Admin Firestore instance bound to the shared app.
 */
export function getFirebaseAdminFirestore() {
  if (_testAdminFirestore) {
    return _testAdminFirestore;
  }
  const app = getFirebaseAdminApp();
  const { getFirestore } = loadAdminSubmodule('firestore');
  return getFirestore(app);
}

/**
 * Inspects Firebase Admin initialization status without throwing or performing mutations.
 * Distinguishes between:
 * - MISSING_CONFIGURATION: credentials not provided in environment
 * - INITIALIZATION_FAILED: credentials present but invalid or SDK init crashed
 * - RUNTIME_READY: SDK loaded and app successfully initialized / ready
 */
export function getFirebaseAdminStatus() {
  if (_testAdminApp || _testAdminFirestore || _testAdminAuth) {
    return {
      configured: true,
      state: 'RUNTIME_READY',
      details: 'Test stub active',
      hasCredentials: true,
      sdkLoaded: true,
      appInitialized: true
    };
  }

  let adminAppModule;
  try {
    adminAppModule = loadAdminSubmodule('app');
  } catch (err) {
    return {
      configured: false,
      state: 'SDK_NOT_AVAILABLE',
      details: sanitizeErrorMessage(err.message),
      hasCredentials: false,
      sdkLoaded: false,
      appInitialized: false
    };
  }

  let credentials;
  try {
    credentials = getFirebaseAdminCredentials();
  } catch (err) {
    return {
      configured: false,
      state: 'INITIALIZATION_FAILED',
      details: sanitizeErrorMessage(err.message),
      hasCredentials: true,
      sdkLoaded: true,
      appInitialized: false
    };
  }

  if (!credentials) {
    return {
      configured: false,
      state: 'MISSING_CONFIGURATION',
      details: 'Firebase Admin credentials not set in environment',
      hasCredentials: false,
      sdkLoaded: true,
      appInitialized: false
    };
  }

  try {
    const existingApps = adminAppModule.getApps();
    if (existingApps && existingApps.length > 0) {
      return {
        configured: true,
        state: 'RUNTIME_READY',
        details: 'Firebase Admin initialized and ready',
        hasCredentials: true,
        sdkLoaded: true,
        appInitialized: true
      };
    }

    // Attempt initialization with extracted credentials
    getFirebaseAdminApp();
    return {
      configured: true,
      state: 'RUNTIME_READY',
      details: 'Firebase Admin initialized and ready',
      hasCredentials: true,
      sdkLoaded: true,
      appInitialized: true
    };
  } catch (err) {
    return {
      configured: false,
      state: 'INITIALIZATION_FAILED',
      details: sanitizeErrorMessage(err.message),
      hasCredentials: true,
      sdkLoaded: true,
      appInitialized: false
    };
  }
}

/**
 * Test Hooks for Dependency Injection and Isolation
 */
export function setFirebaseAdminAppForTest(app) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks are forbidden outside test environment.');
  }
  _testAdminApp = app;
}

export function setFirebaseAdminAuthForTest(auth) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks are forbidden outside test environment.');
  }
  _testAdminAuth = auth;
}

export function setFirebaseAdminFirestoreForTest(firestore) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks are forbidden outside test environment.');
  }
  _testAdminFirestore = firestore;
}

export function setAdminSubmoduleLoaderForTest(loader) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks are forbidden outside test environment.');
  }
  _testAdminSubmoduleLoader = loader;
}

export function resetFirebaseAdminStateForTest() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks are forbidden outside test environment.');
  }
  _testAdminApp = null;
  _testAdminAuth = null;
  _testAdminFirestore = null;
  _testAdminSubmoduleLoader = null;

  try {
    const { getApps, deleteApp } = loadAdminSubmodule('app');
    const apps = getApps();
    if (apps && apps.length > 0) {
      apps.forEach(app => {
        try {
          deleteApp(app);
        } catch {
          // ignore cleanup errors in tests
        }
      });
    }
  } catch {
    // ignore
  }
}
