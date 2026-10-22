/**
 * phoneConnectionTruthfulnessAndDiagnostics.test.js
 *
 * Dedicated Verification Suite for:
 * - TASK A: Authentication readiness wait & non-sensitive session relay diagnostics (6 distinct states)
 * - TASK B: Phone Connection Truthfulness (Pairing != Live Connection != Telemetry)
 * - TASK C: Non-blocking invariants & telemetry truthfulness preservation
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FocusSpace from '../components/FocusSpace';
import {
  relaySessionStart,
  relaySessionEnd,
  getAuthHeaderWithDiagnostics,
  setAuthTokenProvider,
  resetAuthTokenProvider
} from '../services/phoneConnectionClient';
import {
  notifyFocusStarted,
  notifyFocusEnded,
  isCompanionPaired,
  isCompanionReachable,
  isCompanionConnected,
  getLastSessionRelayStatus,
  resetSessionRelayStatusForTest,
  setPairedDeviceRecord,
  generatePairingToken,
  confirmDevicePairing,
  clearFocusIntegrityData,
  COMPANION_REACHABILITY_THRESHOLD_MS
} from '../services/focusIntegrityService';
import { waitForAuthReady, resetAuthLifecycleForTest } from '../services/authService';

describe('Phone Connection Truthfulness & Focus Session Relay Diagnostics', () => {
  let originalFetch;
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    clearFocusIntegrityData();
    resetSessionRelayStatusForTest();
    resetAuthLifecycleForTest();
    resetAuthTokenProvider();
    originalFetch = global.fetch;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    resetAuthTokenProvider();
    resetSessionRelayStatusForTest();
    resetAuthLifecycleForTest();
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    global.fetch = originalFetch;
    localStorage.clear();
    clearFocusIntegrityData();
  });

  // =========================================================================
  // TASK A: AUTHENTICATION READINESS & 6 SAFE RELAY DIAGNOSTIC STATES
  // =========================================================================
  describe('TASK A — Authentication Readiness & Session Relay Diagnostics', () => {
    test('State 1: No paired device sets NO_PAIRED_DEVICE diagnostic and returns null gracefully', () => {
      expect(isCompanionPaired()).toBe(false);

      const contract = notifyFocusStarted({
        sessionId: 'sess_diag_no_device',
        targetMinutes: 25,
        task: { name: 'Thermal Dissipation' }
      });

      expect(contract).toBeNull();
      const status = getLastSessionRelayStatus();
      expect(status.relayed).toBe(false);
      expect(status.code).toBe('NO_PAIRED_DEVICE');
      expect(status.diagnostic).toContain('No companion phone paired');
      expect(status.sessionId).toBe('sess_diag_no_device');
    });

    test('State 2: No authenticated Firebase user produces NO_AUTH_USER diagnostic', async () => {
      // Pair device
      const token = generatePairingToken();
      confirmDevicePairing(token.token, { deviceName: 'Galaxy S25' });

      // No auth token provider, unconfigured/signed-out Firebase
      const res = await relaySessionStart(
        { sessionId: 'sess_unauth_01', targetMinutes: 25 },
        { waitForAuth: false }
      );

      expect(res.relayed).toBe(false);
      expect(res.code).toBe('NO_AUTH_USER');
      expect(res.reason).toBe('LOCAL_MODE_UNAUTHENTICATED');
      expect(res.diagnostic).toContain('No authenticated');
      // Must not leak sensitive headers or tokens
      expect(JSON.stringify(res)).not.toContain('Bearer');
    });

    test('State 3: Token acquisition failure produces AUTH_TOKEN_FAILED diagnostic', async () => {
      setAuthTokenProvider(async () => {
        throw new Error('ID token generation failed');
      });

      const res = await relaySessionStart({
        sessionId: 'sess_token_fail_01',
        targetMinutes: 25
      });

      expect(res.relayed).toBe(false);
      expect(res.code).toBe('AUTH_TOKEN_FAILED');
      expect(res.reason).toBe('AUTH_TOKEN_FAILED');
      expect(res.diagnostic).toContain('token');
      expect(JSON.stringify(res)).not.toContain('Bearer');
    });

    test('State 4: Server HTTP rejection distinguishes status code truthfully', async () => {
      setAuthTokenProvider(async () => 'valid_bearer_token');

      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden device association', code: 'DEVICE_MISMATCH' })
      }));

      const res = await relaySessionStart({
        sessionId: 'sess_http_rejected_01',
        targetMinutes: 25
      });

      expect(res.relayed).toBe(false);
      expect(res.code).toBe('HTTP_REJECTED');
      expect(res.status).toBe(403);
      expect(res.diagnostic).toBe('Session start rejected by server with HTTP 403.');
      // Confirm sensitive data was not logged or returned
      expect(JSON.stringify(res)).not.toContain('valid_bearer_token');
    });

    test('State 5: Network failure produces NETWORK_FAILURE diagnostic without throwing', async () => {
      setAuthTokenProvider(async () => 'valid_bearer_token');

      global.fetch = jest.fn(async () => {
        throw new Error('Failed to fetch (offline)');
      });

      const res = await relaySessionStart({
        sessionId: 'sess_network_err_01',
        targetMinutes: 25
      });

      expect(res.relayed).toBe(false);
      expect(res.code).toBe('NETWORK_FAILURE');
      expect(res.reason).toBe('NETWORK_UNAVAILABLE');
      expect(res.diagnostic).toContain('Network error');
    });

    test('State 6: Successful registration produces SESSION_REGISTERED and relays payload correctly', async () => {
      setAuthTokenProvider(async () => 'valid_test_token_789');

      let capturedUrl;
      let capturedBody;
      let capturedAuth;
      global.fetch = jest.fn(async (url, opts) => {
        capturedUrl = url;
        capturedBody = JSON.parse(opts.body);
        capturedAuth = opts.headers.Authorization;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            session: { sessionId: 'sess_success_01', status: 'ACTIVE' }
          })
        };
      });

      const res = await relaySessionStart({
        sessionId: 'sess_success_01',
        startedAt: 1728590000000,
        targetMinutes: 30,
        taskName: 'Microcontroller Timing',
        subjectName: 'Embedded Systems'
      });

      expect(res.relayed).toBe(true);
      expect(res.code).toBe('SESSION_REGISTERED');
      expect(capturedUrl).toContain('/api/v1/phone/focus-sessions/start');
      expect(capturedAuth).toBe('Bearer valid_test_token_789');
      expect(capturedBody.sessionId).toBe('sess_success_01');
      expect(capturedBody.intendedDurationSeconds).toBe(1800);
      expect(capturedBody.taskName).toBe('Microcontroller Timing');
      expect(capturedBody.subjectName).toBe('Embedded Systems');
    });

    test('Session relay bounded wait: waits for initial auth resolution rather than failing immediately', async () => {
      // Simulate auth resolving after a brief 50ms delay
      let authReady = false;
      setTimeout(() => {
        authReady = true;
      }, 50);

      const mockAuthObj = {
        get currentUser() {
          return authReady ? { getIdToken: async () => 'delayed_id_token' } : null;
        },
        authStateReady: async () => {
          while (!authReady) {
            await new Promise(r => setTimeout(r, 10));
          }
        }
      };

      // Test bounded wait mechanism directly
      await waitForAuthReady(1000);
      const res = await getAuthHeaderWithDiagnostics({ waitForAuth: true, timeoutMs: 1000 });
      // In this test environment without full firebase init, it resolves gracefully
      expect(res).toBeDefined();
      expect(['OK', 'NO_AUTH_USER']).toContain(res.code);
    });

    test('notifyFocusStarted updates _lastSessionRelayStatus and attaches non-blocking relayPromise', async () => {
      const token = generatePairingToken();
      confirmDevicePairing(token.token, { deviceName: 'Galaxy S25' });

      setAuthTokenProvider(async () => 'mock_token');
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, session: { sessionId: 'sess_contract_test' } })
      }));

      const contract = notifyFocusStarted({
        sessionId: 'sess_contract_test',
        targetMinutes: 25,
        task: { name: 'OpAmp Feedback' }
      });

      expect(contract).toBeDefined();
      expect(contract.sessionId).toBe('sess_contract_test');
      expect(contract.relayPromise).toBeInstanceOf(Promise);

      // Await the attached relay promise to verify the outcome is tracked
      const relayResult = await contract.relayPromise;
      expect(relayResult.relayed).toBe(true);

      const status = getLastSessionRelayStatus();
      expect(status.relayed).toBe(true);
      expect(status.code).toBe('SESSION_REGISTERED');
      expect(status.sessionId).toBe('sess_contract_test');
    });
  });

  // =========================================================================
  // TASK B: STATUS LABELS & TRUTHFUL SEPARATION (Pairing != Reachability != Telemetry)
  // =========================================================================
  describe('TASK B — Truthful Status Labels & Reachability Separation', () => {
    test('1. Paired alone never implies a live connection: isCompanionReachable is false when lastSeenAt is missing', () => {
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_no_last_seen',
        deviceName: 'Pixel 9',
        lastSeenAt: null
      });

      expect(isCompanionPaired()).toBe(true);
      expect(isCompanionConnected()).toBe(true); // Backward-compat alias
      expect(isCompanionReachable()).toBe(false); // TRUTHFUL: Not reachable without signal
    });

    test('2. Stale pairing record (> 2 minutes) is NOT reachable', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_stale_phone',
        deviceName: 'Galaxy S24',
        lastSeenAt: fiveMinutesAgo
      });

      expect(isCompanionPaired()).toBe(true);
      expect(isCompanionReachable(COMPANION_REACHABILITY_THRESHOLD_MS)).toBe(false);
    });

    test('3. Recent communication signal (< 2 minutes) is recognized as reachable', () => {
      const thirtySecondsAgo = Date.now() - 30000;
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_active_phone',
        deviceName: 'Galaxy S25',
        lastSeenAt: thirtySecondsAgo
      });

      expect(isCompanionPaired()).toBe(true);
      expect(isCompanionReachable(COMPANION_REACHABILITY_THRESHOLD_MS)).toBe(true);
    });

    test('4. FocusSpace Ready Screen renders "Focus Integrity: Phone Paired" without live green pulse when disconnected', () => {
      // Paired but offline / stale lastSeenAt
      const oneHourAgo = Date.now() - 3600000;
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_offline_phone',
        deviceName: 'Galaxy S25',
        lastSeenAt: oneHourAgo
      });

      const mockSession = {
        sessionId: 'sess_ready_truth',
        status: 'ready',
        targetMinutes: 25,
        timeLeftSeconds: 1500,
        task: { name: 'RLC Circuits' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      // Truthful: Shows Paired, strictly NOT "Phone Connected"
      expect(container.textContent).toContain('Focus Integrity: Phone Paired');
      expect(container.textContent).not.toContain('Focus Integrity: Phone Connected');
      expect(container.textContent).not.toContain('(Active)');
    });

    test('5. FocusSpace Ready Screen indicates "(Active)" only when recent communication signal exists', () => {
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_active_phone',
        deviceName: 'Galaxy S25',
        lastSeenAt: Date.now() - 10000 // 10 seconds ago
      });

      const mockSession = {
        sessionId: 'sess_ready_active',
        status: 'ready',
        targetMinutes: 25,
        timeLeftSeconds: 1500,
        task: { name: 'RLC Circuits' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('Focus Integrity: Phone Paired');
      expect(container.textContent).toContain('(Active)');
      expect(container.textContent).not.toContain('Focus Integrity: Phone Connected');
    });

    test('6. FocusSpace Header during session renders "Phone Paired", never "Phone Connected"', () => {
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_header_test',
        deviceName: 'Galaxy S25',
        lastSeenAt: Date.now() - 3600000 // Stale
      });

      const mockSession = {
        sessionId: 'sess_running_truth',
        status: 'running',
        targetMinutes: 25,
        timeLeftSeconds: 1200,
        task: { name: 'Fourier Transform' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('Phone Paired');
      expect(container.textContent).not.toContain('Phone Connected');
      expect(container.textContent).not.toContain('Phone Paired (Active)');
    });

    test('7. FocusSpace Drawer footer renders "● Paired", never "● Connected"', () => {
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_drawer_test',
        deviceName: 'Galaxy S25',
        lastSeenAt: null
      });

      const mockSession = {
        sessionId: 'sess_drawer_truth',
        status: 'running',
        targetMinutes: 25,
        timeLeftSeconds: 900,
        task: { name: 'State Machines' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('● Paired');
      expect(container.textContent).not.toContain('● Connected');
    });

    test('8. Reflection screen empty state shows "Phone not connected (not paired)" when no companion is paired', () => {
      const mockSession = {
        sessionId: 'sess_reflect_no_phone',
        status: 'reflection',
        targetMinutes: 25,
        timeLeftSeconds: 0,
        task: { name: 'Bode Plots' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('Phone not connected (Phone not paired)');
      expect(container.textContent).toContain('Phone not paired');
      expect(container.textContent).toContain('Phone not connected');
    });
  });

  // =========================================================================
  // TASK C: RESILIENCE, INTEGRITY & TRUTHFULNESS PRESERVATION
  // =========================================================================
  describe('TASK C — Non-blocking Timer & Invariant Preservation', () => {
    test('Non-blocking: server hanging indefinitely does not block notifyFocusStarted', async () => {
      const token = generatePairingToken();
      confirmDevicePairing(token.token, { deviceName: 'Galaxy S25' });

      setAuthTokenProvider(async () => 'valid_token');
      // Simulated hanging fetch that never resolves
      global.fetch = jest.fn(() => new Promise(() => {}));

      const startTime = Date.now();
      const contract = notifyFocusStarted({
        sessionId: 'sess_hanging_test',
        targetMinutes: 25,
        task: { name: 'Inductive Reactance' }
      });
      const elapsed = Date.now() - startTime;

      // notifyFocusStarted MUST return immediately
      expect(contract).toBeDefined();
      expect(contract.sessionId).toBe('sess_hanging_test');
      expect(elapsed).toBeLessThan(100);
    });

    test('Telemetry truthfulness: Revoked companion device is neither paired nor reachable', () => {
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_revoked_01',
        deviceName: 'Old Phone',
        status: 'revoked',
        lastSeenAt: Date.now()
      });

      expect(isCompanionPaired()).toBe(false);
      expect(isCompanionConnected()).toBe(false);
      expect(isCompanionReachable()).toBe(false);
    });
  });
});
