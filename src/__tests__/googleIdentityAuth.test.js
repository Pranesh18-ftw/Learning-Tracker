/**
 * googleIdentityAuth.test.js
 *
 * Comprehensive Unit and Integration Test Suite for:
 * P0.1 — REPLACE FAKE GOOGLE AUTHENTICATION WITH REAL FIREBASE AUTH
 *
 * Verifies the 11 core requirements:
 * 1. Authenticated startup (restores user from Firebase persistence)
 * 2. Signed-out startup (onAuthStateChanged emits null)
 * 3. Successful Google auth (signInWithPopup derives usr_${uid})
 * 4. Popup blocked (safe redirect fallback / explicit error)
 * 5. Popup closed by user (auth/popup-closed-by-user)
 * 6. Unauthorized domain (auth/unauthorized-domain)
 * 7. Provider disabled in Console (auth/operation-not-allowed)
 * 8. Network failure (auth/network-request-failed)
 * 9. Local-data preservation during sign-in
 * 10. Non-destructive sign-out (preserves local learning history)
 * 11. No mock fallback (missing config fails visibly and honestly)
 */

import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

import {
  signInWithGoogle,
  signOutUser,
  deleteUserAccountPermanently,
  getAuthSession,
  getCurrentUser,
  getAccountState,
  hasExistingLocalData,
  subscribeToAuthState,
  checkRedirectResult,
  isAuthInitialized,
  getAuthLifecycleState,
  resetAuthLifecycleForTest,
  ACCOUNT_STATES,
  AUTH_LIFECYCLE_STATES,
  AUTH_STATE_KEY
} from '../services/authService';
import { isFirebaseConfigured, mapFirebaseAuthError, FIREBASE_AUTH_ERROR_CODES } from '../services/firebase';
import { getOrCreateAccount, linkAuthProvider } from '../services/accountIdentityService';
import { safeStorageSet, safeStorageGet, safeStorageRemove } from '../utils/storage';
import { getOutbox, enqueueMutation, clearOutbox, reassignOutboxToAccount } from '../services/syncEngine';
import { SYNC_ENTITY_TYPES, SYNC_OPERATIONS } from '../shared/accountSyncProtocol';

// Mock the Firebase modular SDK
jest.mock('firebase/app', () => ({
  initializeApp: () => ({ name: '[DEFAULT]' }),
  getApps: () => [],
  getApp: () => ({ name: '[DEFAULT]' })
}));

jest.mock('firebase/auth', () => {
  const mockAuth = {
    currentUser: null
  };
  return {
    getAuth: () => mockAuth,
    GoogleAuthProvider: function GoogleAuthProvider() {
      this.setCustomParameters = () => {};
    },
    signInWithPopup: jest.fn(),
    signInWithRedirect: jest.fn(),
    getRedirectResult: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn()
  };
});

describe('P0.1 Real Firebase Google Authentication Subsystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetAuthLifecycleForTest();
    const auth = getAuth();
    if (auth) auth.currentUser = null;

    process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key-12345';
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'learning-tracker-test.firebaseapp.com';
    process.env.REACT_APP_FIREBASE_PROJECT_ID = 'learning-tracker-test';
    process.env.REACT_APP_FIREBASE_APP_ID = '1:12345:web:67890';
  });

  afterEach(() => {
    delete process.env.REACT_APP_FIREBASE_API_KEY;
    delete process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
    delete process.env.REACT_APP_FIREBASE_PROJECT_ID;
    delete process.env.REACT_APP_FIREBASE_APP_ID;
    localStorage.clear();
  });

  // ============================================================
  // 1. AUTHENTICATED STARTUP (Prompt Success Condition #4 & #9)
  // ============================================================
  test('1. Authenticated startup: onAuthStateChanged restores real Firebase user from persistence', (done) => {
    const mockFirebaseUser = {
      uid: 'firebase_user_startup_101',
      email: 'learner.startup@university.edu',
      displayName: 'Startup Learner',
      photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      metadata: { lastSignInTime: '2026-10-05T08:00:00Z' }
    };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      if (auth) auth.currentUser = mockFirebaseUser;
      // Simulate asynchronous persistence restoration
      setTimeout(() => {
        callback(mockFirebaseUser);
      }, 0);
      return jest.fn(); // Unsubscribe spy
    });

    subscribeToAuthState((user) => {
      expect(user).not.toBeNull();
      expect(user.uid).toBe('firebase_user_startup_101');
      expect(user.id).toBe('usr_firebase_user_startup_101');
      expect(user.email).toBe('learner.startup@university.edu');
      expect(user.displayName).toBe('Startup Learner');
      expect(user.authProvider).toBe('google');
      expect(getAccountState()).toBe(ACCOUNT_STATES.ACCOUNT_READY);
      done();
    });
  });

  // ============================================================
  // 2. SIGNED-OUT STARTUP (Prompt Success Condition #9)
  // ============================================================
  test('2. Signed-out startup: onAuthStateChanged notifies null and maintains SIGNED_OUT state', (done) => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => {
        callback(null);
      }, 0);
      return jest.fn();
    });

    subscribeToAuthState((user) => {
      expect(user).toBeNull();
      expect(getAccountState()).toBe(ACCOUNT_STATES.SIGNED_OUT);
      done();
    });
  });

  // ============================================================
  // 3. SUCCESSFUL GOOGLE AUTH (Prompt Success Conditions #1, #2, #3, #4)
  // ============================================================
  test('3. Successful Google auth via signInWithPopup derives account ID from Firebase user.uid', async () => {
    const mockFirebaseUser = {
      uid: 'fb-uid-ada-lovelace-777',
      email: 'ada@analyticengine.org',
      displayName: 'Ada Lovelace',
      photoURL: 'https://avatar.google.com/ada.png'
    };

    signInWithPopup.mockResolvedValueOnce({
      user: mockFirebaseUser
    });

    const res = await signInWithGoogle({ claimExistingLocalData: false });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    // Application account ID must be derived from Firebase user.uid
    expect(res.user.id).toBe('usr_fb-uid-ada-lovelace-777');
    expect(res.user.uid).toBe('fb-uid-ada-lovelace-777');
    expect(res.user.email).toBe('ada@analyticengine.org');
    expect(res.user.displayName).toBe('Ada Lovelace');
    expect(res.user.authProvider).toBe('google');

    // Canonical account in storage must reflect the derived ID and Google provider
    const account = getOrCreateAccount();
    expect(account.accountId).toBe('usr_fb-uid-ada-lovelace-777');
    expect(account.authProvider).toBe('google');
    expect(account.email).toBe('ada@analyticengine.org');

    // Verify NO fabricated sessionToken or csrfToken in localStorage
    expect(localStorage.getItem('learningTracker_authSession')).toBeNull();
    expect(localStorage.getItem('learningTracker_sessionToken')).toBeNull();
    expect(localStorage.getItem('learningTracker_csrfToken')).toBeNull();
  });

  // ============================================================
  // 4. POPUP BLOCKED WITH SAFE FALLBACK (Prompt Requirement)
  // ============================================================
  test('4. Popup blocked: falls back safely to signInWithRedirect', async () => {
    const popupError = new Error('Popup blocked by browser');
    popupError.code = FIREBASE_AUTH_ERROR_CODES.POPUP_BLOCKED;

    signInWithPopup.mockRejectedValueOnce(popupError);
    signInWithRedirect.mockResolvedValueOnce();

    const res = await signInWithGoogle();

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(true);
    expect(res.redirectInitiated).toBe(true);
  });

  // ============================================================
  // 5. POPUP CLOSED BY USER (Prompt Requirement)
  // ============================================================
  test('5. Popup closed by user: handles auth/popup-closed-by-user gracefully without altering local data', async () => {
    const closeError = new Error('Popup closed by user');
    closeError.code = FIREBASE_AUTH_ERROR_CODES.POPUP_CLOSED;

    signInWithPopup.mockRejectedValueOnce(closeError);

    // Seed local learning data
    safeStorageSet('sessions', [{ id: 'sess_pre_closed', title: 'Local Session' }]);

    const res = await signInWithGoogle();

    expect(res.success).toBe(false);
    expect(res.code).toBe('auth/popup-closed-by-user');
    expect(res.error).toBe('Sign-in popup was closed before completing authentication.');
    expect(getAccountState()).toBe(ACCOUNT_STATES.SIGNED_OUT);

    // Existing local data remains 100% untouched
    const sessions = safeStorageGet('sessions', []);
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('sess_pre_closed');
  });

  // ============================================================
  // 6. UNAUTHORIZED DOMAIN (Prompt Requirement)
  // ============================================================
  test('6. Unauthorized domain: returns clear explanation to add domain in Firebase Console', async () => {
    const domainError = new Error('Unauthorized domain');
    domainError.code = FIREBASE_AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN;

    signInWithPopup.mockRejectedValueOnce(domainError);

    const res = await signInWithGoogle();

    expect(res.success).toBe(false);
    expect(res.code).toBe('auth/unauthorized-domain');
    expect(res.error).toContain('This domain is not authorized for Google Sign-In in Firebase Console.');
    expect(getAccountState()).toBe(ACCOUNT_STATES.SIGNED_OUT);
  });

  // ============================================================
  // 7. PROVIDER DISABLED (Prompt Requirement)
  // ============================================================
  test('7. Provider disabled: returns explicit instruction to enable Google provider in Firebase Console', async () => {
    const providerError = new Error('Operation not allowed');
    providerError.code = FIREBASE_AUTH_ERROR_CODES.PROVIDER_DISABLED;

    signInWithPopup.mockRejectedValueOnce(providerError);

    const res = await signInWithGoogle();

    expect(res.success).toBe(false);
    expect(res.code).toBe('auth/operation-not-allowed');
    expect(res.error).toContain('Google sign-in provider is disabled in Firebase Console.');
  });

  // ============================================================
  // 8. NETWORK FAILURE (Prompt Requirement)
  // ============================================================
  test('8. Network failure: surfaces network error and leaves local state intact', async () => {
    const networkError = new Error('Network request failed');
    networkError.code = FIREBASE_AUTH_ERROR_CODES.NETWORK_REQUEST_FAILED;

    signInWithPopup.mockRejectedValueOnce(networkError);

    safeStorageSet('roadmap', [{ id: 'rm_offline_1', title: 'Signals & Systems' }]);

    const res = await signInWithGoogle();

    expect(res.success).toBe(false);
    expect(res.code).toBe('auth/network-request-failed');
    expect(res.error).toContain('Network connection error.');

    // Local data remains intact
    const roadmap = safeStorageGet('roadmap', []);
    expect(roadmap.length).toBe(1);
    expect(roadmap[0].id).toBe('rm_offline_1');
  });

  // ============================================================
  // 9. LOCAL DATA PRESERVATION ON FIRST SIGN-IN (Prompt Success #6)
  // ============================================================
  test('9. Local data preservation: existing learning history is never destroyed on sign-in', async () => {
    // Seed pre-existing local learning sessions and tasks
    const existingSessions = [
      { id: 'sess_local_1', subject: 'Embedded C', durationMinutes: 45 },
      { id: 'sess_local_2', subject: 'DSP Filters', durationMinutes: 60 }
    ];
    const existingCompletions = [
      { id: 'comp_1', taskId: 'task_pointers', completedAt: 1728000000000 }
    ];

    safeStorageSet('sessions', existingSessions);
    safeStorageSet('learningTracker_taskCompletions', existingCompletions);

    expect(hasExistingLocalData()).toBe(true);

    const mockFirebaseUser = {
      uid: 'fb-uid-first-signin-999',
      email: 'newuser@college.edu',
      displayName: 'First Time Signer'
    };

    signInWithPopup.mockResolvedValueOnce({
      user: mockFirebaseUser
    });

    const res = await signInWithGoogle({ claimExistingLocalData: true });

    expect(res.success).toBe(true);
    expect(res.hasLocalData).toBe(true);

    // Verify local sessions & completions are preserved
    const preservedSessions = safeStorageGet('sessions', []);
    expect(preservedSessions.length).toBe(2);
    expect(preservedSessions[0].subject).toBe('Embedded C');
    expect(preservedSessions[1].subject).toBe('DSP Filters');

    const preservedCompletions = safeStorageGet('learningTracker_taskCompletions', []);
    expect(preservedCompletions.length).toBe(1);
    expect(preservedCompletions[0].taskId).toBe('task_pointers');
  });

  // ============================================================
  // 10. NON-DESTRUCTIVE SIGN-OUT (Prompt Success Condition #5 & #6)
  // ============================================================
  test('10. Sign-out: produces real Firebase sign-out and preserves local learning history', async () => {
    firebaseSignOut.mockResolvedValueOnce();

    // User has local learning data
    safeStorageSet('sessions', [{ id: 'sess_saved_study', durationMinutes: 30 }]);
    safeStorageSet('roadmap', [{ id: 'rm_saved_roadmap', title: 'FPGA Design' }]);

    // Sign out without clearLocalData
    const localAccount = await signOutUser({ clearLocalData: false });

    // 1. Official Firebase sign-out was invoked
    expect(firebaseSignOut).toHaveBeenCalledTimes(1);

    // 2. Account state updated to SIGNED_OUT
    expect(getAccountState()).toBe(ACCOUNT_STATES.SIGNED_OUT);

    // 3. Local account reverted to clean local anonymous user
    expect(localAccount.authProvider).toBe('anonymous');

    // 4. Local learning history remains intact!
    const sessions = safeStorageGet('sessions', []);
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('sess_saved_study');

    const roadmap = safeStorageGet('roadmap', []);
    expect(roadmap.length).toBe(1);
    expect(roadmap[0].id).toBe('rm_saved_roadmap');
  });

  // ============================================================
  // 11. NO MOCK FALLBACK (Prompt Success Condition #1, #2, #8)
  // ============================================================
  test('11. Missing Firebase config fails visibly and honestly without falling back to mock login', async () => {
    // Clear all Firebase configuration
    delete process.env.REACT_APP_FIREBASE_API_KEY;
    delete process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
    delete process.env.REACT_APP_FIREBASE_PROJECT_ID;
    delete process.env.REACT_APP_FIREBASE_APP_ID;

    expect(isFirebaseConfigured()).toBe(false);

    // Attempting sign in MUST fail honestly and visibly
    const res = await signInWithGoogle();

    expect(res.success).toBe(false);
    expect(res.code).toBe(FIREBASE_AUTH_ERROR_CODES.CONFIG_MISSING);
    expect(res.error).toBe('Firebase authentication is not configured. Missing REACT_APP_FIREBASE_* environment variables.');

    // Under NO circumstances does it simulate sign in or return a fake user
    expect(res.user).toBeUndefined();
    expect(signInWithPopup).not.toHaveBeenCalled();
    expect(getAccountState()).toBe(ACCOUNT_STATES.SIGNED_OUT);
  });

  // ============================================================
  // 12. REDIRECT RESULT HANDLING
  // ============================================================
  test('12. Consumes redirect result cleanly after browser returns from Google Auth', async () => {
    const mockRedirectUser = {
      uid: 'fb-uid-redirect-return-888',
      email: 'redirect@test.com',
      displayName: 'Redirect Returner'
    };

    getRedirectResult.mockResolvedValueOnce({
      user: mockRedirectUser
    });

    const res = await checkRedirectResult();

    expect(res).not.toBeNull();
    expect(res.success).toBe(true);
    expect(res.user.id).toBe('usr_fb-uid-redirect-return-888');
    expect(res.user.email).toBe('redirect@test.com');

    const account = getOrCreateAccount();
    expect(account.accountId).toBe('usr_fb-uid-redirect-return-888');
    expect(account.authProvider).toBe('google');
  });

  // ============================================================
  // 13. AUTH LIFECYCLE: INITIALIZING -> AUTHENTICATED
  // ============================================================
  test('13. Auth lifecycle transitions from INITIALIZING to AUTHENTICATED on initial Firebase user resolution', (done) => {
    expect(isAuthInitialized()).toBe(false);
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.INITIALIZING);

    const mockUser = {
      uid: 'uid-lifecycle-1',
      email: 'learner.lifecycle@test.com',
      displayName: 'Lifecycle Learner'
    };

    onAuthStateChanged.mockImplementationOnce((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    subscribeToAuthState((user, details) => {
      expect(user).not.toBeNull();
      expect(user.uid).toBe('uid-lifecycle-1');
      expect(user.id).toBe('usr_uid-lifecycle-1');
      expect(isAuthInitialized()).toBe(true);
      expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);
      expect(details.lifecycle).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);
      expect(details.isInitial).toBe(true);
      done();
    });
  });

  // ============================================================
  // 14. AUTH LIFECYCLE: INITIALIZING -> SIGNED_OUT
  // ============================================================
  test('14. Auth lifecycle transitions from INITIALIZING to SIGNED_OUT when Firebase resolves null user', (done) => {
    expect(isAuthInitialized()).toBe(false);
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.INITIALIZING);

    onAuthStateChanged.mockImplementationOnce((auth, callback) => {
      callback(null);
      return () => {};
    });

    subscribeToAuthState((user, details) => {
      expect(user).toBeNull();
      expect(isAuthInitialized()).toBe(true);
      expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.SIGNED_OUT);
      expect(details.lifecycle).toBe(AUTH_LIFECYCLE_STATES.SIGNED_OUT);
      expect(details.isInitial).toBe(true);
      done();
    });
  });

  // ============================================================
  // 15. STARTUP RACE CONDITION RESOLUTION: REASSIGN OUTBOX MUTATIONS
  // ============================================================
  test('15. Startup identity race resolution: un-synced anonymous mutations are safely reassigned to the verified Firebase user ID upon login', async () => {
    // 1. Unauthenticated local user performs work
    const anonAccount = getOrCreateAccount();
    expect(anonAccount.authProvider).toBe('anonymous');
    const localId = anonAccount.accountId;

    // 2. Enqueue mutations while anonymous
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'session-race-1',
      payload: { sessionId: 'session-race-1', durationMinutes: 30 }
    });

    const outboxBefore = getOutbox();
    expect(outboxBefore.length).toBe(1);
    expect(outboxBefore[0].accountId).toBe(localId);

    // 3. User authenticates via real Firebase Google popup
    const mockFirebaseUser = {
      uid: 'fb-uid-race-resolved',
      email: 'race.resolved@domain.com',
      displayName: 'Race Resolved Learner'
    };

    signInWithPopup.mockResolvedValueOnce({
      user: mockFirebaseUser
    });

    const result = await signInWithGoogle({ claimExistingLocalData: true });
    expect(result.success).toBe(true);
    expect(result.user.id).toBe('usr_fb-uid-race-resolved');

    // 4. Outbox mutations are now owned by usr_fb-uid-race-resolved, NOT orphaned under usr_local_*
    const outboxAfter = getOutbox();
    expect(outboxAfter.length).toBe(1);
    expect(outboxAfter[0].accountId).toBe('usr_fb-uid-race-resolved');
  });

  // ============================================================
  // 16. ZERO MOCK FALLBACK IN PRODUCTION RUNTIME GRAPH
  // ============================================================
  test('16. Zero mock auth server or synthetic tokens in production auth service', () => {
    // Verify authService exports only real Firebase auth operations
    expect(typeof signInWithGoogle).toBe('function');
    expect(typeof signOutUser).toBe('function');
    expect(typeof subscribeToAuthState).toBe('function');
    expect(typeof checkRedirectResult).toBe('function');
    expect(typeof getAuthSession).toBe('function');

    // There is no mock fallback flag or mock token generation
    const session = getAuthSession();
    expect(session).toBeNull();
  });
});
