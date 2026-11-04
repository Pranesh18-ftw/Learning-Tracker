/**
 * authReadinessTimeoutResolution.test.js
 *
 * Dedicated verification suite for Firebase authentication-readiness timeout flaw fixes:
 * 1. Distinguish successful authentication-state resolution from a timeout.
 * 2. Never cache a timeout as a definitive SIGNED_OUT result.
 * 3. Do not set _hasAuthResolvedOnce = true merely because readiness timed out.
 * 4. Clear timers when readiness resolves and clean up fallback listeners cleanly.
 * 5. Return explicit, non-sensitive readiness-timeout result.
 * 6. Update getAuthHeaderWithDiagnostics() to report AUTH_TIMEOUT distinctly rather than NO_AUTH_USER.
 * 7. Allow subsequent attempts to succeed when auth resolves after a timeout.
 * 8. Fallback listener path (onAuthStateChanged) correctness and cleanup.
 * 9. Non-blocking session relay diagnostics with AUTH_TIMEOUT.
 */

import {
  waitForAuthReady,
  isAuthInitialized,
  getAuthLifecycleState,
  resetAuthLifecycleForTest,
  AUTH_LIFECYCLE_STATES
} from '../services/authService';
import {
  getAuthHeaderWithDiagnostics,
  relaySessionStart,
  resetAuthTokenProvider
} from '../services/phoneConnectionClient';
import {
  notifyFocusStarted,
  clearFocusIntegrityData,
  resetSessionRelayStatusForTest,
  generatePairingToken,
  confirmDevicePairing
} from '../services/focusIntegrityService';
import * as FirebaseModule from '../services/firebase';

const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: function GoogleAuthProvider() {
    this.setCustomParameters = () => {};
  },
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args)
}));

describe('Firebase Authentication Readiness Timeout & Truthful Diagnostics', () => {
  let mockAuth;
  let getFirebaseAuthSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnAuthStateChanged.mockReset();
    resetAuthLifecycleForTest();
    resetAuthTokenProvider();
    resetSessionRelayStatusForTest();
    clearFocusIntegrityData();

    mockAuth = {
      currentUser: null,
      authStateReady: null
    };

    getFirebaseAuthSpy = jest.spyOn(FirebaseModule, 'getFirebaseAuth').mockImplementation(() => mockAuth);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    getFirebaseAuthSpy.mockRestore();
    resetAuthLifecycleForTest();
    resetAuthTokenProvider();
    resetSessionRelayStatusForTest();
    clearFocusIntegrityData();
  });

  // =========================================================================
  // 1. AUTHSTATEREADY: RESOLVES WITH AUTHENTICATED USER
  // =========================================================================
  test('1. authStateReady resolves with authenticated user -> returns ready=true, state=AUTHENTICATED, clears timer', async () => {
    const mockUser = {
      uid: 'user_active_123',
      getIdToken: jest.fn().mockResolvedValue('valid_token_123')
    };

    let resolveReady;
    mockAuth.authStateReady = jest.fn(() => new Promise((resolve) => {
      resolveReady = resolve;
    }));

    const waitPromise = waitForAuthReady(1000);

    // Simulate auth resolving before timeout
    mockAuth.currentUser = mockUser;
    resolveReady();

    const result = await waitPromise;

    expect(result.ready).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.state).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);
    expect(result.user).toBe(mockUser);
    expect(isAuthInitialized()).toBe(true);
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);

    // Header diagnostics should obtain token successfully
    const headerRes = await getAuthHeaderWithDiagnostics({ waitForAuth: true });
    expect(headerRes.code).toBe('OK');
    expect(headerRes.authHeader).toBe('Bearer valid_token_123');
  });

  // =========================================================================
  // 2. AUTHSTATEREADY: RESOLVES WITH NO AUTHENTICATED USER (SIGNED OUT)
  // =========================================================================
  test('2. authStateReady resolves with null user -> returns ready=true, state=SIGNED_OUT, reports NO_AUTH_USER', async () => {
    let resolveReady;
    mockAuth.authStateReady = jest.fn(() => new Promise((resolve) => {
      resolveReady = resolve;
    }));

    const waitPromise = waitForAuthReady(1000);

    // Resolves with null currentUser (explicitly signed out)
    mockAuth.currentUser = null;
    resolveReady();

    const result = await waitPromise;

    expect(result.ready).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.state).toBe(AUTH_LIFECYCLE_STATES.SIGNED_OUT);
    expect(result.user).toBeNull();
    expect(isAuthInitialized()).toBe(true);
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.SIGNED_OUT);

    const headerRes = await getAuthHeaderWithDiagnostics({ waitForAuth: true });
    expect(headerRes.code).toBe('NO_AUTH_USER');
    expect(headerRes.reason).toBe('LOCAL_MODE_UNAUTHENTICATED');
    expect(headerRes.authHeader).toBeNull();
  });

  // =========================================================================
  // 3. AUTHSTATEREADY: TIMEOUT ELAPSES BEFORE RESOLUTION
  // =========================================================================
  test('3. Timeout elapses before authStateReady finishes -> returns timedOut=true, does NOT cache as SIGNED_OUT, reports AUTH_TIMEOUT', async () => {
    // authStateReady returns a promise that never resolves within timeout
    mockAuth.authStateReady = jest.fn(() => new Promise(() => {}));

    const waitPromise = waitForAuthReady(500);

    // Fast-forward past timeout
    jest.advanceTimersByTime(501);

    const result = await waitPromise;

    expect(result.ready).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.state).toBe(AUTH_LIFECYCLE_STATES.INITIALIZING);
    // Invariant: Timeout does NOT set _hasAuthResolvedOnce = true
    expect(isAuthInitialized()).toBe(false);
    // Invariant: Lifecycle state is NOT permanently set to SIGNED_OUT
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.INITIALIZING);

    // getAuthHeaderWithDiagnostics reports AUTH_TIMEOUT distinctly rather than NO_AUTH_USER
    const headerPromise = getAuthHeaderWithDiagnostics({ waitForAuth: true, timeoutMs: 500 });
    jest.advanceTimersByTime(501);
    const headerRes = await headerPromise;

    expect(headerRes.code).toBe('AUTH_TIMEOUT');
    expect(headerRes.reason).toBe('AUTH_READINESS_TIMEOUT');
    expect(headerRes.diagnostic).toBe('Firebase authentication readiness timed out.');
    expect(headerRes.authHeader).toBeNull();
  });

  // =========================================================================
  // 4. TIMEOUT RECOVERY: AUTH RESOLVES AFTER TIMEOUT AND SUBSEQUENT ATTEMPT SUCCEEDS
  // =========================================================================
  test('4. Auth resolves after a timeout: subsequent call can obtain valid header without being blocked by stale cache', async () => {
    let resolveLateReady;
    mockAuth.authStateReady = jest.fn(() => new Promise((resolve) => {
      resolveLateReady = resolve;
    }));

    // Attempt 1: Times out
    const attempt1Promise = getAuthHeaderWithDiagnostics({ waitForAuth: true, timeoutMs: 200 });
    jest.advanceTimersByTime(201);
    const attempt1Res = await attempt1Promise;

    expect(attempt1Res.code).toBe('AUTH_TIMEOUT');
    expect(isAuthInitialized()).toBe(false);

    // Now Firebase resolves in background
    mockAuth.currentUser = {
      uid: 'user_recovered_456',
      getIdToken: jest.fn().mockResolvedValue('token_recovered_456')
    };
    if (resolveLateReady) resolveLateReady();

    // Attempt 2: Called after resolution
    const attempt2Res = await getAuthHeaderWithDiagnostics({ waitForAuth: true, timeoutMs: 200 });

    expect(attempt2Res.code).toBe('OK');
    expect(attempt2Res.authHeader).toBe('Bearer token_recovered_456');
    expect(isAuthInitialized()).toBe(true);
    expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);
  });

  // =========================================================================
  // 5. FALLBACK LISTENER (onAuthStateChanged): SUCCESS & TIMEOUT PATHS
  // =========================================================================
  describe('Fallback Listener Path (onAuthStateChanged)', () => {
    test('5a. Fallback listener resolves with user and cleans up unsubscribe listener and timer', async () => {
      mockAuth.authStateReady = null;

      const mockUnsubscribe = jest.fn();
      let authCallback;
      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        authCallback = cb;
        return mockUnsubscribe;
      });

      const waitPromise = waitForAuthReady(1000);

      const mockUser = { uid: 'user_fallback_789' };
      authCallback(mockUser);

      const result = await waitPromise;

      expect(result.ready).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.state).toBe(AUTH_LIFECYCLE_STATES.AUTHENTICATED);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(isAuthInitialized()).toBe(true);
    });

    test('5b. Fallback listener times out: cleans up listener, does NOT cache SIGNED_OUT, returns timedOut=true', async () => {
      mockAuth.authStateReady = null;

      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockImplementation(() => mockUnsubscribe);

      const waitPromise = waitForAuthReady(300);

      jest.advanceTimersByTime(301);

      const result = await waitPromise;

      expect(result.ready).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(isAuthInitialized()).toBe(false);
      expect(getAuthLifecycleState()).toBe(AUTH_LIFECYCLE_STATES.INITIALIZING);
    });

    test('5c. Fallback listener registration failure: produces AUTH_READINESS_FAILED (not NO_AUTH_USER) and sends no focus-session HTTP request', async () => {
      mockAuth.authStateReady = null;

      // Simulate failure to register fallback listener (e.g. throws during registration)
      mockOnAuthStateChanged.mockImplementation(() => {
        throw new Error('Registration failed: internal auth client error');
      });

      // 1. Direct waitForAuthReady check
      const readyResult = await waitForAuthReady(1000);
      expect(readyResult.ready).toBe(false);
      expect(readyResult.timedOut).toBe(false);

      // 2. getAuthHeaderWithDiagnostics check
      const authHeaderRes = await getAuthHeaderWithDiagnostics({ waitForAuth: true });
      expect(authHeaderRes.code).toBe('AUTH_READINESS_FAILED');
      expect(authHeaderRes.reason).toBe('AUTH_READINESS_FAILED');
      expect(authHeaderRes.diagnostic).toBe('Firebase authentication readiness failed to initialize.');
      expect(authHeaderRes.authHeader).toBeNull();
      expect(authHeaderRes.code).not.toBe('NO_AUTH_USER');

      // 3. relaySessionStart check: must not send HTTP request
      const originalFetch = global.fetch;
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      try {
        const relayRes = await relaySessionStart(
          { sessionId: 'sess_listener_failed', targetMinutes: 25 },
          { waitForAuth: true }
        );

        expect(relayRes.relayed).toBe(false);
        expect(relayRes.code).toBe('AUTH_READINESS_FAILED');
        expect(relayRes.reason).toBe('AUTH_READINESS_FAILED');
        // Crucial: no fetch request is sent without valid authentication
        expect(fetchSpy).not.toHaveBeenCalled();

        // 4. Focus session remains non-blocking
        const token = generatePairingToken();
        confirmDevicePairing(token.token, { deviceName: 'Pixel 9' });

        const contract = notifyFocusStarted({
          sessionId: 'sess_non_blocking_on_fail',
          targetMinutes: 25,
          task: { name: 'Analog Circuit Lab' }
        });
        expect(contract).toBeDefined();
        expect(contract.sessionId).toBe('sess_non_blocking_on_fail');
        expect(contract.relayPromise).toBeInstanceOf(Promise);

        const relayOutcome = await contract.relayPromise;
        expect(relayOutcome.relayed).toBe(false);
        expect(relayOutcome.code).toBe('AUTH_READINESS_FAILED');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // 6. NON-BLOCKING SESSION RELAY DIAGNOSTICS WITH AUTH_TIMEOUT
  // =========================================================================
  test('6. relaySessionStart propagates AUTH_TIMEOUT distinctly and notifyFocusStarted remains non-blocking', async () => {
    // Pair device so relay is attempted
    const token = generatePairingToken();
    confirmDevicePairing(token.token, { deviceName: 'Pixel 9' });

    // Mock auth pending forever to trigger timeout
    mockAuth.authStateReady = jest.fn(() => new Promise(() => {}));

    const relayPromise = relaySessionStart(
      { sessionId: 'sess_timeout_test', targetMinutes: 25 },
      { waitForAuth: true, timeoutMs: 200 }
    );

    jest.advanceTimersByTime(201);
    const relayRes = await relayPromise;

    expect(relayRes.relayed).toBe(false);
    expect(relayRes.code).toBe('AUTH_TIMEOUT');
    expect(relayRes.reason).toBe('AUTH_READINESS_TIMEOUT');
    expect(relayRes.diagnostic).toContain('Firebase authentication readiness timed out');

    // Local focus session contract is created and returned immediately without blocking
    const contract = notifyFocusStarted({
      sessionId: 'sess_local_unblocked',
      targetMinutes: 25,
      task: { name: 'FPGA State Machine' }
    });

    expect(contract).toBeDefined();
    expect(contract.sessionId).toBe('sess_local_unblocked');
  });
});
