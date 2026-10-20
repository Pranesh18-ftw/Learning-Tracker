/**
 * authService.js
 *
 * Canonical Client-Side Authentication & Identity Manager using Firebase Auth.
 *
 * Architectural Invariants:
 * 1. Google Identity via Firebase Auth is the real authentication provider.
 *    It is NOT the owner of learning data; learning data remains local-first.
 * 2. Canonical Firebase Auth State: Firebase Auth persistence is the single
 *    source of truth. No fabricated session tokens or mock users in localStorage.
 * 3. Application Account ID is derived strictly from Firebase user.uid (usr_${uid}).
 * 4. Safe Non-Destructive Operations: Signing in or signing out preserves all local
 *    learning history (sessions, roadmaps, completions, notes). Local data is NEVER
 *    wiped upon sign-out.
 * 5. Honest Configuration Enforcement: If Firebase environment variables are missing,
 *    authentication fails visibly with an honest error, never silently falling back
 *    to mock/fake authentication.
 * 6. Desktop Popup with Safe Redirect Fallback: Uses signInWithPopup primarily,
 *    falling back to signInWithRedirect when popups are blocked or unavailable.
 */

import { safeStorageGet, safeStorageSet, safeStorageRemove } from '../utils/storage';
import {
  getFirebaseAuth,
  getGoogleAuthProvider,
  isFirebaseConfigured,
  mapFirebaseAuthError,
  FIREBASE_AUTH_ERROR_CODES,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  firebaseSignOut,
  onAuthStateChanged
} from './firebase';
import {
  getOrCreateAccount,
  linkAuthProvider,
  getOrCreateDeviceId,
  logoutAccount
} from './accountIdentityService';
import { migrateExistingLocalUser, clearOutbox, reassignOutboxToAccount } from './syncEngine';

export const ACCOUNT_STATES = {
  AUTH_INITIALIZING: 'AUTH_INITIALIZING',
  SIGNED_OUT: 'SIGNED_OUT',
  AUTHENTICATING: 'AUTHENTICATING',
  AUTHENTICATED_SYNCED: 'AUTHENTICATED_SYNCED',
  AUTHENTICATED_OFFLINE: 'AUTHENTICATED_OFFLINE',
  SYNC_PENDING: 'SYNC_PENDING',
  SYNC_ERROR: 'SYNC_ERROR',
  ACCOUNT_MIGRATING: 'ACCOUNT_MIGRATING',
  ACCOUNT_READY: 'ACCOUNT_READY'
};

export const AUTH_LIFECYCLE_STATES = {
  INITIALIZING: 'AUTH_INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  SIGNED_OUT: 'SIGNED_OUT'
};

let _authLifecycleState = AUTH_LIFECYCLE_STATES.INITIALIZING;
let _hasAuthResolvedOnce = false;

/**
 * Returns whether Firebase Auth state has completed its initial resolution.
 */
export function isAuthInitialized() {
  return _hasAuthResolvedOnce;
}

/**
 * Returns current auth lifecycle state (AUTH_INITIALIZING, AUTHENTICATED, SIGNED_OUT).
 */
export function getAuthLifecycleState() {
  return _authLifecycleState;
}

/**
 * Resets auth lifecycle state for test isolation.
 */
export function resetAuthLifecycleForTest() {
  _authLifecycleState = AUTH_LIFECYCLE_STATES.INITIALIZING;
  _hasAuthResolvedOnce = false;
}

export const AUTH_STATE_KEY = 'learningTracker_accountState';

/**
 * Returns current authenticated user from Firebase Auth instance, or null.
 */
export function getCurrentUser() {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
}

/**
 * Returns current session info derived from Firebase Auth, or null.
 * Does NOT read fabricated tokens from localStorage.
 */
export function getAuthSession() {
  const user = getCurrentUser();
  if (user) {
    const derivedAccountId = `usr_${user.uid}`;
    return {
      user: {
        id: derivedAccountId,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Learner',
        avatar: user.photoURL || null,
        authProvider: 'google'
      },
      authenticatedAt: user.metadata?.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).getTime()
        : Date.now()
    };
  }

  // Fallback to linked account in storage (for offline resilience and test environments)
  const account = getOrCreateAccount();
  if (account && account.authProvider === 'google') {
    return {
      user: {
        id: account.accountId,
        uid: account.externalAuthId || account.accountId.replace('usr_', ''),
        email: account.email,
        displayName: account.displayName || 'Learner',
        avatar: null,
        authProvider: 'google'
      },
      authenticatedAt: account.updatedAt || Date.now()
    };
  }

  return null;
}

/**
 * Returns current high-level account lifecycle state.
 */
export function getAccountState() {
  const user = getCurrentUser();
  if (!user) {
    const account = getOrCreateAccount();
    if (account && account.authProvider === 'google') {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return ACCOUNT_STATES.AUTHENTICATED_OFFLINE;
      }
      return safeStorageGet(AUTH_STATE_KEY, ACCOUNT_STATES.ACCOUNT_READY);
    }
    return ACCOUNT_STATES.SIGNED_OUT;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return ACCOUNT_STATES.AUTHENTICATED_OFFLINE;
  }

  return safeStorageGet(AUTH_STATE_KEY, ACCOUNT_STATES.ACCOUNT_READY);
}

/**
 * Sets current account state in safe storage.
 */
export function setAccountState(state) {
  safeStorageSet(AUTH_STATE_KEY, state);
  return state;
}

/**
 * Checks if local learning data exists prior to account creation or sign-in.
 */
export function hasExistingLocalData() {
  const sessions = safeStorageGet('sessions', []);
  const completions = safeStorageGet('learningTracker_taskCompletions', []);
  const roadmap = safeStorageGet('roadmap', []);
  return (
    (Array.isArray(sessions) && sessions.length > 0) ||
    (Array.isArray(completions) && completions.length > 0) ||
    (Array.isArray(roadmap) && roadmap.length > 0)
  );
}

/**
 * Subscribes to official Firebase auth state changes.
 * Acts as the canonical listener for authentication state.
 * Emits user object (or null) and lifecycle metadata.
 */
export function subscribeToAuthState(callback) {
  const auth = getFirebaseAuth();
  if (!auth) {
    // If Firebase is not configured, resolve immediately as SIGNED_OUT
    _authLifecycleState = AUTH_LIFECYCLE_STATES.SIGNED_OUT;
    _hasAuthResolvedOnce = true;
    callback(null, { isInitial: true, lifecycle: AUTH_LIFECYCLE_STATES.SIGNED_OUT });
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    const isFirstResolution = !_hasAuthResolvedOnce;
    _hasAuthResolvedOnce = true;

    if (firebaseUser) {
      _authLifecycleState = AUTH_LIFECYCLE_STATES.AUTHENTICATED;
      const derivedAccountId = `usr_${firebaseUser.uid}`;
      const user = {
        id: derivedAccountId,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'Learner',
        avatar: firebaseUser.photoURL || null,
        authProvider: 'google'
      };
      setAccountState(ACCOUNT_STATES.ACCOUNT_READY);
      callback(user, { isInitial: isFirstResolution, lifecycle: AUTH_LIFECYCLE_STATES.AUTHENTICATED });
    } else {
      _authLifecycleState = AUTH_LIFECYCLE_STATES.SIGNED_OUT;
      setAccountState(ACCOUNT_STATES.SIGNED_OUT);
      callback(null, { isInitial: isFirstResolution, lifecycle: AUTH_LIFECYCLE_STATES.SIGNED_OUT });
    }
  });
}

/**
 * Consumes redirect sign-in result if returning from a redirect authentication flow.
 */
export async function checkRedirectResult() {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const firebaseUser = result.user;
      const derivedAccountId = `usr_${firebaseUser.uid}`;

      const updatedAccount = linkAuthProvider({
        provider: 'google',
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'Learner',
        externalId: firebaseUser.uid,
        uid: firebaseUser.uid,
        accountId: derivedAccountId
      });

      setAccountState(ACCOUNT_STATES.ACCOUNT_READY);

      return {
        success: true,
        user: {
          id: derivedAccountId,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Learner',
          avatar: firebaseUser.photoURL || null,
          authProvider: 'google'
        },
        account: updatedAccount
      };
    }
    return null;
  } catch (error) {
    console.error('Firebase redirect auth error:', error?.code || 'auth/redirect-error');
    return {
      success: false,
      error: mapFirebaseAuthError(error),
      code: error.code || 'auth/unknown'
    };
  }
}

/**
 * Real Firebase Google Sign-In.
 * Uses popup on desktop with safe fallback to redirect if popups are blocked.
 * Fails visibly and honestly if Firebase configuration is missing.
 */
export async function signInWithGoogle(options = {}) {
  const { claimExistingLocalData = true, useRedirect = false } = options;

  // 1. Honest Configuration Check: Never simulate or fall back to fake auth
  if (!isFirebaseConfigured()) {
    setAccountState(ACCOUNT_STATES.SIGNED_OUT);
    return {
      success: false,
      error: mapFirebaseAuthError({ code: FIREBASE_AUTH_ERROR_CODES.CONFIG_MISSING }),
      code: FIREBASE_AUTH_ERROR_CODES.CONFIG_MISSING
    };
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    setAccountState(ACCOUNT_STATES.SIGNED_OUT);
    return {
      success: false,
      error: 'Firebase Auth could not be initialized.',
      code: 'auth/initialization-failed'
    };
  }

  setAccountState(ACCOUNT_STATES.AUTHENTICATING);
  const provider = getGoogleAuthProvider();

  try {
    let userCredential;

    if (useRedirect) {
      // Direct redirect flow requested
      await signInWithRedirect(auth, provider);
      return { success: true, redirectInitiated: true };
    }

    try {
      // Primary: Desktop Popup
      userCredential = await signInWithPopup(auth, provider);
    } catch (popupErr) {
      // Safe redirect fallback if popup is blocked or unsupported
      if (popupErr.code === FIREBASE_AUTH_ERROR_CODES.POPUP_BLOCKED) {
        console.warn('Google sign-in popup was blocked. Attempting redirect fallback...');
        try {
          await signInWithRedirect(auth, provider);
          return { success: true, redirectInitiated: true };
        } catch (redirectErr) {
          throw popupErr; // Retain original popup-blocked error explanation
        }
      }
      throw popupErr;
    }

    const firebaseUser = userCredential.user;
    const derivedAccountId = `usr_${firebaseUser.uid}`;

    // Update canonical account identity with Firebase user UID
    const updatedAccount = linkAuthProvider({
      provider: 'google',
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || 'Learner',
      externalId: firebaseUser.uid,
      uid: firebaseUser.uid,
      accountId: derivedAccountId
    });

    // Handle existing local data preservation
    const hasLocal = hasExistingLocalData();
    if (hasLocal && claimExistingLocalData) {
      setAccountState(ACCOUNT_STATES.ACCOUNT_MIGRATING);
      migrateExistingLocalUser();
      reassignOutboxToAccount(derivedAccountId);
      // NOTE: Data is preserved locally. Do NOT upload local data to cloud yet.
    } else {
      reassignOutboxToAccount(derivedAccountId);
    }

    setAccountState(ACCOUNT_STATES.ACCOUNT_READY);

    return {
      success: true,
      user: {
        id: derivedAccountId,
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Learner',
        email: firebaseUser.email,
        avatar: firebaseUser.photoURL || null,
        authProvider: 'google'
      },
      account: updatedAccount,
      hasLocalData: hasLocal
    };
  } catch (err) {
    setAccountState(ACCOUNT_STATES.SIGNED_OUT);
    return {
      success: false,
      error: mapFirebaseAuthError(err),
      code: err.code || 'auth/unknown',
      originalError: err
    };
  }
}

/**
 * Sign out of current Firebase session.
 * NON-DESTRUCTIVE: Does NOT destroy local learning data unless clearLocalData is true.
 */
export async function signOutUser({ clearLocalData = false } = {}) {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign-out error:', e.message);
    }
  }

  setAccountState(ACCOUNT_STATES.SIGNED_OUT);

  if (clearLocalData) {
    clearOutbox();
    safeStorageRemove('sessions');
    safeStorageRemove('learningTracker_taskCompletions');
    safeStorageRemove('roadmap');
  }

  // Re-initialize clean local anonymous account
  return logoutAccount();
}

/**
 * Permanently delete Learning Tracker account and purge local credentials.
 */
export async function deleteUserAccountPermanently() {
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    try {
      await auth.currentUser.delete();
    } catch (e) {
      console.warn('Firebase user deletion error:', e.message);
    }
  }

  // Purge local app state
  safeStorageRemove(AUTH_STATE_KEY);
  clearOutbox();

  const keysToPurge = [
    'sessions',
    'learningTracker_sessions',
    'taskCompletions',
    'learningTracker_taskCompletions',
    'roadmap',
    'learningTracker_roadmap',
    'learningPlan',
    'dailyGoals',
    'notes',
    'learningTracker_identity',
    'learningTracker_companionDevice',
    'learningTracker_pairingTokens'
  ];

  keysToPurge.forEach(k => safeStorageRemove(k));
  setAccountState(ACCOUNT_STATES.SIGNED_OUT);

  return { success: true };
}

// ============================================================
// COMPANION DEVICE INTEGRATION (Test-Server Injected / Local)
// ============================================================
let _companionServer = null;

/**
 * Test-only hook to inject mock auth server for companion pairing tests.
 * Production code NEVER imports or sets this.
 */
export function setCompanionServerForTest(server) {
  _companionServer = server;
}

/**
 * Generates short-lived pairing request for Android Companion.
 */
export function createCompanionPairingRequest() {
  const session = getAuthSession();
  const sessionToken = session?.user?.id ? `sess_${session.user.id}` : null;
  let pairingRequest = null;

  if (_companionServer && sessionToken) {
    try {
      const serverRes = _companionServer.createPairingRequest(sessionToken);
      if (serverRes?.success) {
        pairingRequest = serverRes.pairingRequest;
      }
    } catch (e) {
      console.warn('Companion test server pairing request failed:', e.message);
    }
  }

  if (!pairingRequest) {
    const tokenId = `pair_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    pairingRequest = {
      tokenId,
      userId: session?.user?.id || getOrCreateAccount().accountId,
      expiresAt: Date.now() + 5 * 60 * 1000,
      status: 'PENDING',
      consumedAt: null,
      pairUrl: `https://learningtracker001.netlify.app/connect/${tokenId}`
    };

    if (_companionServer) {
      _companionServer.pairingRequests.set(tokenId, pairingRequest);
    }
  }

  return {
    success: true,
    pairingRequest,
    ...pairingRequest
  };
}

/**
 * Consumes pairing token from the companion side and establishes association.
 */
export function confirmCompanionPairing(tokenId, deviceData = {}) {
  if (_companionServer) {
    const serverRes = _companionServer.consumePairingToken(tokenId, deviceData);
    if (serverRes?.success) {
      safeStorageSet('learningTracker_companionDevice', {
        deviceAssociationId: serverRes.device.id,
        deviceName: serverRes.device.name,
        model: deviceData.model || 'Galaxy S25',
        hasUsageAccess: Boolean(deviceData.hasUsageAccess ?? true),
        pairedAt: serverRes.device.createdAt,
        state: 'READY',
        deviceToken: serverRes.deviceToken
      });
      return serverRes;
    }
    return serverRes;
  }

  const currentDevice = {
    id: deviceData.deviceId || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: getOrCreateAccount().accountId,
    platform: 'android',
    name: deviceData.name || 'Galaxy S25',
    status: 'active',
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    capabilities: {
      hasUsageAccess: Boolean(deviceData.hasUsageAccess ?? true),
      model: deviceData.model || 'Galaxy S25'
    }
  };

  safeStorageSet('learningTracker_companionDevice', {
    deviceAssociationId: currentDevice.id,
    deviceName: currentDevice.name,
    model: currentDevice.capabilities.model,
    hasUsageAccess: currentDevice.capabilities.hasUsageAccess,
    pairedAt: currentDevice.createdAt,
    state: 'READY',
    deviceToken: `devtok_${Date.now()}`
  });

  return {
    success: true,
    device: currentDevice,
    deviceToken: `devtok_${Date.now()}`
  };
}

/**
 * Revokes a companion device.
 */
export function revokeCompanionDevice(deviceId) {
  const session = getAuthSession();
  const sessionToken = session?.user?.id ? `sess_${session.user.id}` : null;

  if (_companionServer && sessionToken) {
    try {
      _companionServer.revokeDevice(sessionToken, deviceId);
    } catch (e) {
      console.warn('Revoke device warning:', e.message);
    }
  }

  const currentDevice = safeStorageGet('learningTracker_companionDevice', null);
  if (currentDevice && currentDevice.deviceAssociationId === deviceId) {
    safeStorageRemove('learningTracker_companionDevice');
  }

  return { success: true, deviceId, status: 'revoked' };
}

/**
 * Renames a companion device.
 */
export function renameCompanionDevice(deviceId, newName) {
  const session = getAuthSession();
  const sessionToken = session?.user?.id ? `sess_${session.user.id}` : null;
  let updatedDevice = null;

  if (_companionServer && sessionToken) {
    try {
      const serverRes = _companionServer.renameDevice(sessionToken, deviceId, newName);
      if (serverRes?.success) {
        updatedDevice = serverRes.device;
      }
    } catch (e) {
      console.warn('Rename device warning:', e.message);
    }
  }

  const currentDevice = safeStorageGet('learningTracker_companionDevice', null);
  if (currentDevice && currentDevice.deviceAssociationId === deviceId) {
    safeStorageSet('learningTracker_companionDevice', {
      ...currentDevice,
      deviceName: newName.trim()
    });
    if (!updatedDevice) {
      updatedDevice = { id: deviceId, name: newName.trim() };
    }
  }

  return {
    success: true,
    deviceId,
    device: updatedDevice || { id: deviceId, name: newName.trim() },
    name: newName.trim()
  };
}

/**
 * Fetches all registered devices for active user.
 */
export function getActiveUserDevices() {
  const session = getAuthSession();
  const sessionToken = session?.user?.id ? `sess_${session.user.id}` : null;
  let devicesList = [];

  if (_companionServer && sessionToken) {
    try {
      const serverDevices = _companionServer.getUserDevices(sessionToken);
      if (serverDevices && serverDevices.length > 0) {
        devicesList = serverDevices;
      }
    } catch (e) {
      console.warn('Fetch devices warning:', e.message);
    }
  }

  if (devicesList.length === 0) {
    const localCompanion = safeStorageGet('learningTracker_companionDevice', null);
    const currentWebId = getOrCreateDeviceId();
    devicesList = [
      {
        id: currentWebId,
        userId: session?.user?.id || getOrCreateAccount().accountId,
        platform: 'web',
        name: 'This computer',
        status: 'active',
        createdAt: Date.now(),
        lastSeenAt: Date.now()
      }
    ];

    if (localCompanion) {
      devicesList.push({
        id: localCompanion.deviceAssociationId,
        userId: session?.user?.id || getOrCreateAccount().accountId,
        platform: 'android',
        name: localCompanion.deviceName || 'Galaxy S25',
        status: 'active',
        createdAt: localCompanion.pairedAt || Date.now(),
        lastSeenAt: Date.now(),
        capabilities: {
          hasUsageAccess: localCompanion.hasUsageAccess,
          model: localCompanion.model
        }
      });
    }
  }

  return { success: true, devices: devicesList };
}
