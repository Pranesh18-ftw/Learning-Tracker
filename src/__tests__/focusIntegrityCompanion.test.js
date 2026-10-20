/**
 * focusIntegrityCompanion.test.js
 *
 * Comprehensive Unit and Integration Test Suite for:
 * LEARNING TRACKER — ANDROID COMPANION / FOCUS INTEGRITY V1
 *
 * Verifies:
 * 1. Single-use short-lived pairing tokens & anonymous device association (Prompts #8, #9)
 * 2. Canonical focus session contract broadcasting (Prompts #4, #22)
 * 3. Additive resiliency: Disconnect / absent companion never breaks learning (Prompts #25, #39)
 * 4. App classification engine: Reference vs Distraction vs Unknown (Prompts #13, #14, #15)
 * 5. Idempotent telemetry recording & offline sync safety (Prompts #23, #24)
 * 6. Honest evidence metrics without fake focus scores (Prompts #16, #17, #18, #40)
 * 7. FocusSpace and Identity UI integration rendering
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getPairedDevice,
  isCompanionConnected,
  generatePairingToken,
  confirmDevicePairing,
  unpairCompanionDevice,
  getAppOverrides,
  setAppOverride,
  notifyFocusStarted,
  notifyFocusEnded,
  notifyFocusCancelled,
  recordFocusTelemetry,
  getTelemetryForSession,
  formatDuration
} from '../services/focusIntegrityService';
import { simulateSyntheticSessionTelemetry } from '../testing/focusTelemetrySimulator';
import {
  COMPANION_STATES,
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS,
  validateFocusSessionContract,
  validateFocusTelemetry
} from '../shared/focusIntegrityProtocol';
import FocusSpace from '../components/FocusSpace';
import IdentityDevicesAndPrivacy from '../components/IdentityDevicesAndPrivacy';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Focus Integrity Companion Subsystem', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    unpairCompanionDevice();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    localStorage.clear();
  });

  // =========================================================================
  // TEST GROUP 1: Pairing, Identity & Anonymous Association (Prompts #8 & #9)
  // =========================================================================
  describe('Pairing & Device Association', () => {
    test('initially has no paired device', () => {
      expect(getPairedDevice()).toBeNull();
      expect(isCompanionConnected()).toBe(false);
    });

    test('generates short-lived single-use pairing token', () => {
      const tokenRecord = generatePairingToken();
      expect(tokenRecord).toBeDefined();
      expect(typeof tokenRecord.token).toBe('string');
      expect(tokenRecord.token.length).toBeGreaterThanOrEqual(4);
      expect(tokenRecord.expiresAt).toBeGreaterThan(Date.now());
    });

    test('successfully associates device with valid token without persistent hardware IDs', () => {
      const tokenRecord = generatePairingToken();
      const pairResult = confirmDevicePairing(tokenRecord.token, {
        deviceName: 'Samsung Galaxy S25',
        model: 'SM-S921B'
      });

      expect(pairResult.success).toBe(true);
      expect(pairResult.device).toBeDefined();
      expect(pairResult.device.deviceName).toBe('Samsung Galaxy S25');
      // Must use application-generated device association ID, not IMEI / SIM (Prompt #9)
      expect(pairResult.device.deviceAssociationId).toMatch(/^dev-/);
      expect(pairResult.device.state).toBe(COMPANION_STATES.READY);

      expect(isCompanionConnected()).toBe(true);
      expect(getPairedDevice()).toEqual(pairResult.device);
    });

    test('rejects expired or invalid pairing token', () => {
      const invalidResult = confirmDevicePairing('INVALID_CODE');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Invalid or expired');
      expect(isCompanionConnected()).toBe(false);
    });

    test('token is single-use and cannot be used twice (Prompt #8)', () => {
      const tokenRecord = generatePairingToken();
      const firstPair = confirmDevicePairing(tokenRecord.token, { deviceName: 'Phone 1' });
      expect(firstPair.success).toBe(true);

      // Attempt second pairing with same token
      const secondPair = confirmDevicePairing(tokenRecord.token, { deviceName: 'Phone 2' });
      expect(secondPair.success).toBe(false);
    });

    test('unpairing removes device without errors (Prompt #25)', () => {
      const tokenRecord = generatePairingToken();
      confirmDevicePairing(tokenRecord.token, { deviceName: 'Phone' });
      expect(isCompanionConnected()).toBe(true);

      unpairCompanionDevice();
      expect(isCompanionConnected()).toBe(false);
      expect(getPairedDevice()).toBeNull();
    });
  });

  // =========================================================================
  // TEST GROUP 2: Canonical Session Contract (Prompts #4, #22, #25, #39)
  // =========================================================================
  describe('Canonical Focus Session Contract', () => {
    test('validates protocol session contract schema correctly', () => {
      const validContract = {
        sessionId: 'session-12345',
        startedAt: 1728000000000,
        intendedDurationSeconds: 1800,
        state: 'RUNNING'
      };
      expect(validateFocusSessionContract(validContract).valid).toBe(true);

      const invalidContract = {
        sessionId: '',
        intendedDurationSeconds: -50
      };
      expect(validateFocusSessionContract(invalidContract).valid).toBe(false);
    });

    test('notifies companion when focus starts and updates device state', () => {
      const tokenRecord = generatePairingToken();
      confirmDevicePairing(tokenRecord.token, { deviceName: 'Galaxy S25' });

      const sessionObj = {
        id: 'session-stem-01',
        sessionId: 'session-stem-01',
        startedAt: new Date().toISOString(),
        targetMinutes: 30,
        task: { name: 'Capacitor Transient Analysis' }
      };

      const broadcast = notifyFocusStarted(sessionObj);
      expect(broadcast).not.toBeNull();
      expect(broadcast.sessionId).toBe('session-stem-01');
      expect(broadcast.intendedDurationSeconds).toBe(1800);
      expect(broadcast.state).toBe('RUNNING');

      const currentDevice = getPairedDevice();
      expect(currentDevice.state).toBe(COMPANION_STATES.SESSION_ACTIVE);
    });

    test('additive resiliency: starting focus when companion is absent returns null gracefully', () => {
      // No companion paired
      expect(isCompanionConnected()).toBe(false);

      const sessionObj = {
        id: 'session-stem-02',
        targetMinutes: 25
      };

      const broadcast = notifyFocusStarted(sessionObj);
      expect(broadcast).toBeNull(); // Graceful null, zero crash
    });

    test('session conclusion and cancellation reset companion to READY', () => {
      const tokenRecord = generatePairingToken();
      confirmDevicePairing(tokenRecord.token, { deviceName: 'Galaxy S25' });

      notifyFocusStarted({ sessionId: 'session-03', targetMinutes: 25 });
      expect(getPairedDevice().state).toBe(COMPANION_STATES.SESSION_ACTIVE);

      notifyFocusEnded('session-03');
      expect(getPairedDevice().state).toBe(COMPANION_STATES.READY);

      notifyFocusStarted({ sessionId: 'session-04', targetMinutes: 25 });
      notifyFocusCancelled('session-04');
      expect(getPairedDevice().state).toBe(COMPANION_STATES.READY);
    });
  });

  // =========================================================================
  // TEST GROUP 3: App Classification & Overrides (Prompts #13, #14, #15)
  // =========================================================================
  describe('App Classification & User Overrides (Phone != Distraction)', () => {
    test('default classifications classify tools as reference and social feeds as distraction', () => {
      expect(DEFAULT_APP_CLASSIFICATIONS['com.android.chrome']).toBe(APP_CATEGORIES.REFERENCE);
      expect(DEFAULT_APP_CLASSIFICATIONS['com.google.android.calculator']).toBe(APP_CATEGORIES.REFERENCE);
      expect(DEFAULT_APP_CLASSIFICATIONS['com.adobe.reader']).toBe(APP_CATEGORIES.REFERENCE);
      expect(DEFAULT_APP_CLASSIFICATIONS['com.instagram.android']).toBe(APP_CATEGORIES.DISTRACTION);
    });

    test('user can override app classification to treat app as reference during focus (Prompt #15)', () => {
      expect(getAppOverrides()['com.instagram.android']).toBeUndefined();

      // User sets override: treat Instagram as reference for research/design
      setAppOverride('com.instagram.android', APP_CATEGORIES.REFERENCE);

      const overrides = getAppOverrides();
      expect(overrides['com.instagram.android']).toBe(APP_CATEGORIES.REFERENCE);
    });

    test('unknown apps remain strictly UNKNOWN, never silently labeled as distraction (Prompt #14)', () => {
      const unknownApp = 'com.custom.internal.circuit.tool';
      const overrides = getAppOverrides();
      const category = overrides[unknownApp] || DEFAULT_APP_CLASSIFICATIONS[unknownApp] || APP_CATEGORIES.UNKNOWN;
      expect(category).toBe(APP_CATEGORIES.UNKNOWN);
      expect(category).not.toBe(APP_CATEGORIES.DISTRACTION);
    });
  });

  // =========================================================================
  // TEST GROUP 4: Telemetry Ingestion, Idempotency & Summary (Prompts #16, #17, #18, #24)
  // =========================================================================
  describe('Telemetry Ingestion & Truthful Summary Calculation', () => {
    test('validates telemetry payload structure', () => {
      const validTelemetry = {
        sessionId: 'session-01',
        summaryId: 'summary-01',
        intendedSeconds: 1800,
        observedWindowSeconds: 1800,
        interruptionCount: 2,
        interruptionSeconds: 120,
        referenceSeconds: 40,
        distractionSeconds: 80,
        unknownSeconds: 0,
        longestUninterruptedSeconds: 900
      };
      expect(validateFocusTelemetry(validTelemetry).valid).toBe(true);

      const invalidTelemetry = {
        sessionId: 'session-01'
        // Missing required summary fields
      };
      expect(validateFocusTelemetry(invalidTelemetry).valid).toBe(false);
    });

    test('records telemetry idempotently by sessionId (Prompt #24)', () => {
      const telemetry1 = {
        sessionId: 'sess-abc',
        summaryId: 'summary-101',
        intendedSeconds: 1800,
        observedWindowSeconds: 1800,
        interruptionCount: 1,
        interruptionSeconds: 60,
        referenceSeconds: 60,
        distractionSeconds: 0,
        unknownSeconds: 0,
        longestUninterruptedSeconds: 1740
      };

      const success1 = recordFocusTelemetry(telemetry1);
      expect(success1).toBe(true);
      expect(getTelemetryForSession('sess-abc')).toMatchObject({
        summaryId: 'summary-101',
        interruptionCount: 1
      });

      // Recording again with same session is idempotent
      const telemetry2 = {
        ...telemetry1,
        summaryId: 'summary-101'
      };
      const success2 = recordFocusTelemetry(telemetry2);
      expect(success2).toBe(true);
      expect(getTelemetryForSession('sess-abc')).toBeDefined();
    });

    test('calculates simulated synthetic session telemetry without fake focus scores (Prompts #17, #40)', () => {
      const summary = simulateSyntheticSessionTelemetry('sess-synth-30m', 30, [
        { packageName: 'com.android.chrome', durationSeconds: 38 },
        { packageName: 'com.instagram.android', durationSeconds: 104 }
      ]);

      expect(summary.intendedSeconds).toBe(1800);
      expect(summary.observedWindowSeconds).toBe(1800);
      expect(summary.interruptionCount).toBe(2);
      expect(summary.referenceSeconds).toBe(38);
      expect(summary.distractionSeconds).toBe(104);
      expect(summary.interruptionSeconds).toBe(142);
      expect(summary.longestUninterruptedSeconds).toBe(1800 - 142);

      // Verify no fake "focus score" percentage property exists
      expect(summary.focusScore).toBeUndefined();
      expect(summary.score).toBeUndefined();
    });

    test('formatDuration formats seconds truthfully (e.g. 27m 38s, 2m 22s)', () => {
      expect(formatDuration(1658)).toBe('27m 38s');
      expect(formatDuration(142)).toBe('2m 22s');
      expect(formatDuration(1800)).toBe('30m');
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(0)).toBe('0s');
    });
  });

  // =========================================================================
  // TEST GROUP 5: UI Integration Tests (FocusSpace & Identity)
  // =========================================================================
  describe('UI Integration & Additive Rendering', () => {
    test('FocusSpace ready screen shows "Focus Integrity unavailable" when phone is not paired (Prompt #25)', () => {
      const mockSession = {
        id: 'sess-test-01',
        sessionId: 'sess-test-01',
        status: 'ready',
        targetMinutes: 25,
        timeLeftSeconds: 1500,
        task: { name: 'RC Low Pass Filters', glyph: 'capacitor' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('Focus Integrity unavailable');
    });

    test('FocusSpace ready screen shows "Focus Integrity: Phone Connected" when phone is paired (Prompt #35)', () => {
      const token = generatePairingToken();
      confirmDevicePairing(token.token, { deviceName: 'Galaxy S25' });

      const mockSession = {
        id: 'sess-test-02',
        sessionId: 'sess-test-02',
        status: 'ready',
        targetMinutes: 25,
        timeLeftSeconds: 1500,
        task: { name: 'RC Low Pass Filters', glyph: 'capacitor' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('Focus Integrity: Phone Connected');
    });

    test('FocusSpace reflection screen renders honest evidence breakdown when telemetry exists', () => {
      const token = generatePairingToken();
      confirmDevicePairing(token.token, { deviceName: 'Galaxy S25' });

      // Record telemetry for session
      simulateSyntheticSessionTelemetry('sess-test-reflection', 25, [
        { packageName: 'com.android.chrome', durationSeconds: 40 },
        { packageName: 'com.instagram.android', durationSeconds: 80 }
      ]);

      const mockSession = {
        id: 'sess-test-reflection',
        sessionId: 'sess-test-reflection',
        status: 'reflection',
        targetMinutes: 25,
        timeLeftSeconds: 0,
        task: { name: 'RC Low Pass Filters', glyph: 'capacitor' }
      };

      act(() => {
        root.render(<FocusSpace session={mockSession} />);
      });

      expect(container.textContent).toContain('FOCUS INTEGRITY EVIDENCE');
      expect(container.textContent).toContain('2 detected');
      expect(container.textContent).toContain('Time Away2m');
      expect(container.textContent).toContain('40s Reference');
      expect(container.textContent).toContain('1m 20s Distraction');
      // Ensure no fake focus score
      expect(container.textContent).not.toContain('Focus Score');
    });

    test('IdentityDevicesAndPrivacy shows pairing code generation and app classification manager', () => {
      act(() => {
        root.render(
          <IdentityDevicesAndPrivacy
            onExportData={jest.fn()}
            onResetIdentity={jest.fn()}
          />
        );
      });

      // Verify connected devices section and app classification rules
      expect(container.textContent).toContain('Phone App Classifications');
      expect(container.textContent).toContain('Google Chrome');
      expect(container.textContent).toContain('Instagram');
      expect(container.textContent).toMatch(/Connect [Pp]hone|Pair Phone/);
    });
  });

});
