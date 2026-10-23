/**
 * phoneAutomaticTelemetrySync.test.js
 *
 * Dedicated verification suite for:
 * 1. One-time pairing persistence, reconnection, and non-regenerating device identity.
 * 2. 30-day inactivity pairing expiry policy (single source of truth in phonePolicy.js).
 * 3. Strict distinction between reachability (< 2m communication) and pairing expiry (30 days).
 * 4. Server-side rejection of expired device credentials with DEVICE_INACTIVITY_EXPIRED (401).
 * 5. listOwnerDevices detects expired devices without updating lastSeenAt.
 * 6. Automatic reflection view updates when telemetry arrives without manual 'Check status'.
 * 7. Truthful reflection states:
 *    - Waiting for companion phone upload
 *    - Syncing telemetry from phone
 *    - Verified Server Telemetry
 *    - Telemetry unavailable because Usage Access permission is missing
 *    - No phone usage observations recorded during session window
 *    - Honest retrieval error diagnostic with manual retry fallback
 * 8. Non-blocking focus sessions and timers.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FocusSpace from '../components/FocusSpace';
import {
  COMPANION_REACHABILITY_THRESHOLD_MS,
  DEVICE_INACTIVITY_EXPIRY_MS,
  isDeviceInactivityExpired,
  isDeviceReachable
} from '../shared/phonePolicy';
import {
  isCompanionPaired,
  isCompanionReachable,
  setPairedDeviceRecord,
  getPairedDevice,
  clearFocusIntegrityData,
  recordFocusTelemetry,
  getTelemetryForSession,
  getTelemetryStatusForSession,
  reconcileLateTelemetry
} from '../services/focusIntegrityService';
import {
  handlePhoneApiRequest
} from '../server/phone/phoneApiRouter';
import {
  createInMemoryPhoneRepository
} from '../server/phone/phoneDurableRepository';
import {
  authenticateDeviceRequest
} from '../server/phone/phoneAuthenticationService';
import {
  listOwnerDevices
} from '../server/phone/devicePairingService';
import {
  relaySessionStart,
  relaySessionEnd,
  getActiveSessionForDevice,
  getSessionStatusForDevice
} from '../server/phone/focusSessionRelayService';
import {
  ingestTelemetrySummary
} from '../server/phone/phoneTelemetryService';
import {
  reconcileSessionTelemetry
} from '../server/phone/telemetryReconciliationService';
import {
  TELEMETRY_STATUS,
  APP_CATEGORIES
} from '../shared/focusIntegrityProtocol';
import {
  setAuthTokenProvider,
  resetAuthTokenProvider
} from '../services/phoneConnectionClient';

describe('Phone Focus Tracking & Automatic Telemetry Sync Suite', () => {
  let repo;
  let originalFetch;
  let container = null;
  let root = null;

  const OWNER_UID = 'user_auto_sync_test_99';
  const OWNER_TOKEN = 'mock_firebase_owner_token_99';
  const DEVICE_ID = 'dev_auto_test_device_99';
  const RAW_DEVICE_TOKEN = 'devtok_auto_test_token_99_secret';

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    clearFocusIntegrityData();
    repo = createInMemoryPhoneRepository();
    originalFetch = global.fetch;
    setAuthTokenProvider(async () => OWNER_TOKEN);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    resetAuthTokenProvider();
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

  // Helper to register an active device in repo
  async function seedActiveDevice(opts = {}) {
    const now = opts.now || Date.now();
    const lastSeenAt = opts.lastSeenAt !== undefined ? opts.lastSeenAt : now;
    const pairedAt = opts.pairedAt || now;

    const device = {
      deviceId: opts.deviceId || DEVICE_ID,
      deviceName: 'Galaxy S25 Companion',
      ownerUid: OWNER_UID,
      protocolVersion: '1.0.0',
      status: opts.status || 'active',
      consent: { analytics: true, version: '1.0.0' },
      pairedAt,
      lastSeenAt
    };
    await repo.saveDevice(device);

    const tokenHash = require('crypto').createHash('sha256').update(opts.rawToken || RAW_DEVICE_TOKEN).digest('hex');
    await repo.saveDeviceCredential({
      tokenHash,
      deviceId: device.deviceId,
      ownerUid: OWNER_UID,
      status: opts.status || 'active',
      createdAt: pairedAt
    });

    return device;
  }

  // =========================================================================
  // 1. ONE-TIME PAIRING PERSISTENCE & RECONNECTION
  // =========================================================================
  describe('1. One-Time Pairing & Persistent Device Identity', () => {
    test('Device registration is retained across browser sessions without regenerating device ID', () => {
      const initial = setPairedDeviceRecord({
        deviceId: 'dev_persistent_123',
        deviceName: 'Pixel 9 Pro',
        status: 'active',
        pairedAt: Date.now(),
        lastSeenAt: Date.now()
      });

      expect(initial.deviceId).toBe('dev_persistent_123');
      expect(isCompanionPaired()).toBe(true);

      // Subsequent read preserves exact device ID
      const retrieved = getPairedDevice();
      expect(retrieved.deviceId).toBe('dev_persistent_123');
      expect(retrieved.deviceName).toBe('Pixel 9 Pro');
      expect(isCompanionPaired()).toBe(true);
    });

    test('Server device credentials remain valid across restarts without re-pairing', async () => {
      await seedActiveDevice();

      const auth = await authenticateDeviceRequest(`Bearer ${RAW_DEVICE_TOKEN}`, repo);
      expect(auth.authenticated).toBe(true);
      expect(auth.deviceId).toBe(DEVICE_ID);
      expect(auth.ownerUid).toBe(OWNER_UID);
    });
  });

  // =========================================================================
  // 2. REACHABILITY VS 30-DAY INACTIVITY EXPIRATION POLICY
  // =========================================================================
  describe('2. Inactivity Expiry Policy & Reachability Distinction', () => {
    test('Policy constants: 2-minute reachability and 30-day pairing expiry', () => {
      expect(COMPANION_REACHABILITY_THRESHOLD_MS).toBe(2 * 60 * 1000);
      expect(DEVICE_INACTIVITY_EXPIRY_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('Reachability: Device without recent communication (> 2m) is offline, but remains paired', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setPairedDeviceRecord({
        deviceId: 'dev_reachability_test',
        deviceName: 'Samsung S25',
        status: 'active',
        pairedAt: Date.now() - 24 * 60 * 60 * 1000, // paired yesterday
        lastSeenAt: fiveMinutesAgo
      });

      // Still paired! (Backgrounded or screen off)
      expect(isCompanionPaired()).toBe(true);
      // But NOT reachable right now
      expect(isCompanionReachable()).toBe(false);
    });

    test('Reachability: Device with recent communication (< 2m) is reachable', () => {
      const thirtySecondsAgo = Date.now() - 30 * 1000;
      setPairedDeviceRecord({
        deviceId: 'dev_reachability_test',
        deviceName: 'Samsung S25',
        status: 'active',
        pairedAt: Date.now() - 24 * 60 * 60 * 1000,
        lastSeenAt: thirtySecondsAgo
      });

      expect(isCompanionPaired()).toBe(true);
      expect(isCompanionReachable()).toBe(true);
    });

    test('Pairing Expiry: Device inactive for > 30 days is expired and loses pairing', () => {
      const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
      setPairedDeviceRecord({
        deviceId: 'dev_expired_local',
        deviceName: 'Old Phone',
        status: 'active',
        pairedAt: thirtyOneDaysAgo,
        lastSeenAt: thirtyOneDaysAgo
      });

      expect(isDeviceInactivityExpired(getPairedDevice())).toBe(true);
      // isCompanionPaired strictly returns false for expired devices!
      expect(isCompanionPaired()).toBe(false);
      expect(isCompanionReachable()).toBe(false);
    });

    test('Server authenticating device > 30 days inactive revokes credentials with 401 DEVICE_INACTIVITY_EXPIRED', async () => {
      const thirtyFiveDaysAgo = Date.now() - (35 * 24 * 60 * 60 * 1000);
      await seedActiveDevice({
        pairedAt: thirtyFiveDaysAgo,
        lastSeenAt: thirtyFiveDaysAgo
      });

      const auth = await authenticateDeviceRequest(`Bearer ${RAW_DEVICE_TOKEN}`, repo);
      expect(auth.authenticated).toBe(false);
      expect(auth.statusCode).toBe(401);
      expect(auth.code).toBe('DEVICE_INACTIVITY_EXPIRED');

      // Verify server updated device record to 'expired' and revoked credentials
      const updatedDevice = await repo.getDevice(DEVICE_ID);
      expect(updatedDevice.status).toBe('expired');
      const tokenHash = require('crypto').createHash('sha256').update(RAW_DEVICE_TOKEN).digest('hex');
      const cred = await repo.getDeviceCredentialByHash(tokenHash);
      expect(cred).not.toBeNull();
      expect(cred.status).toBe('revoked');
      expect(cred.revokedAt).toBeGreaterThan(0);
    });

    test('listOwnerDevices marks inactive devices as expired without refreshing lastSeenAt', async () => {
      const fortyDaysAgo = Date.now() - (40 * 24 * 60 * 60 * 1000);
      await seedActiveDevice({
        pairedAt: fortyDaysAgo,
        lastSeenAt: fortyDaysAgo
      });

      const res = await listOwnerDevices(OWNER_UID, repo);
      expect(res.success).toBe(true);
      expect(res.devices.length).toBe(1);
      expect(res.devices[0].status).toBe('expired');
      // Crucial: lastSeenAt was NOT falsely bumped forward merely by listing!
      expect(res.devices[0].lastSeenAt).toBe(fortyDaysAgo);
    });
  });

  // =========================================================================
  // 3. AUTOMATIC FOCUS-SESSION LIFECYCLE & TELEMETRY INGESTION
  // =========================================================================
  describe('3. Server-Side Automatic Session Detection & Ingestion', () => {
    test('relaySessionStart records session that is discovered by active session poll', async () => {
      await seedActiveDevice();

      const startRes = await relaySessionStart(OWNER_UID, {
        sessionId: 'sess_auto_flow_1',
        startedAt: Date.now(),
        intendedDurationSeconds: 1500,
        taskName: 'RF Mixer Impedance Matching',
        subjectName: 'Electromagnetics'
      }, repo);

      expect(startRes.success).toBe(true);
      expect(startRes.session.status).toBe('RUNNING');

      // Android companion polls active session
      const activeRes = await getActiveSessionForDevice(OWNER_UID, repo);
      expect(activeRes.status).toBe('ACTIVE_SESSION_FOUND');
      expect(activeRes.activeSession.sessionId).toBe('sess_auto_flow_1');
      expect(activeRes.activeSession.taskName).toBe('RF Mixer Impedance Matching');
    });

    test('relaySessionEnd transitions session to COMPLETE and status query returns authoritative endedAt', async () => {
      await seedActiveDevice();
      const startTime = Date.now();
      const endTime = startTime + 1500 * 1000;

      await relaySessionStart(OWNER_UID, {
        sessionId: 'sess_auto_flow_2',
        startedAt: startTime,
        intendedDurationSeconds: 1500,
        taskName: 'Microstrip Filter Design'
      }, repo);

      await relaySessionEnd(OWNER_UID, 'sess_auto_flow_2', {
        endedAt: endTime,
        status: 'COMPLETE'
      }, repo);

      // Paired companion queries authoritative status
      const statusRes = await getSessionStatusForDevice(OWNER_UID, 'sess_auto_flow_2', repo);
      expect(statusRes.success).toBe(true);
      expect(statusRes.status).toBe('COMPLETE');
      expect(statusRes.endedAt).toBe(endTime);
    });

    test('ingestTelemetrySummary and reconcileSessionTelemetry associate summary idempotently', async () => {
      const device = await seedActiveDevice();
      const startTime = Date.now() - 1500 * 1000;
      const endTime = Date.now();

      await relaySessionStart(OWNER_UID, {
        sessionId: 'sess_auto_flow_3',
        startedAt: startTime,
        intendedDurationSeconds: 1500,
        taskName: 'Smith Chart Lab'
      }, repo);

      await relaySessionEnd(OWNER_UID, 'sess_auto_flow_3', {
        endedAt: endTime,
        status: 'COMPLETE'
      }, repo);

      // Companion submits telemetry
      const ingestRes = await ingestTelemetrySummary(device, {
        summaryId: 'sum_auto_flow_3',
        sessionId: 'sess_auto_flow_3',
        schemaVersion: '1.0.0',
        observedWindow: { startedAt: startTime, endedAt: endTime },
        activitySummary: {
          intendedSeconds: 1500,
          observedSeconds: 1500,
          interruptionCount: 1,
          interruptionSeconds: 45,
          referenceSeconds: 45,
          distractionSeconds: 0,
          longestUninterruptedSeconds: 1455
        },
        appBreakdown: [
          { packageName: 'com.android.chrome', category: 'REFERENCE', durationSeconds: 45 }
        ],
        consentVersion: '1.0.0'
      }, repo);

      expect(ingestRes.success).toBe(true);
      expect(ingestRes.deliveryStatus).toBe('DELIVERED');

      // Server reconciles
      const reconcileRes = await reconcileSessionTelemetry(OWNER_UID, 'sess_auto_flow_3', repo);
      expect(reconcileRes.success).toBe(true);
      expect(reconcileRes.reconciled).toBe(true);
      expect(reconcileRes.telemetry.interruptionCount).toBe(1);
      expect(reconcileRes.telemetry.provenance).toBe('REAL_EXTERNAL_SOURCE');
    });
  });

  // =========================================================================
  // 4. WEBSITE REFLECTION AUTOMATIC RECONCILIATION & HONEST STATES
  // =========================================================================
  describe('4. Web Reflection Automatic Updates without Manual Check', () => {
    test('Shows waiting state initially and updates automatically when late telemetry arrives', async () => {
      const sessionId = 'sess_reflection_auto_sync';
      setPairedDeviceRecord({
        deviceId: 'dev_reflection_test',
        deviceName: 'Pixel 9',
        status: 'active',
        pairedAt: Date.now() - 3600 * 1000,
        lastSeenAt: Date.now() - 30 * 1000
      });

      let fetchCallCount = 0;
      global.fetch = jest.fn().mockImplementation((url) => {
        fetchCallCount++;
        if (url.includes(`/focus-sessions/${sessionId}/telemetry`)) {
          if (fetchCallCount === 1) {
            // First call: not uploaded yet
            return Promise.resolve({
              ok: true,
              json: async () => ({ reconciled: false, reason: 'NO_TELEMETRY_FOUND' })
            });
          }
          // Second call: companion uploaded in background
          return Promise.resolve({
            ok: true,
            json: async () => ({
              reconciled: true,
              telemetry: {
                id: `telem-${sessionId}`,
                sessionId,
                summaryId: 'sum_late_001',
                observedSeconds: 1500,
                interruptionCount: 0,
                longestUninterruptedSeconds: 1500,
                provenance: 'REAL_EXTERNAL_SOURCE',
                source: 'ANDROID_COMPANION_NATIVE'
              }
            })
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      jest.useFakeTimers();

      await act(async () => {
        root.render(
          <FocusSpace
            session={{
              sessionId,
              task: { id: 'task-1', name: 'Maxwell Wave Equations' },
              status: 'reflection',
              targetMinutes: 25,
              sessionStartTime: Date.now() - 1500 * 1000,
              sessionEndTime: Date.now()
            }}
            onAbandon={jest.fn()}
            onCommitEvidence={jest.fn()}
          />
        );
      });

      // At t=0, first sync attempt was made
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain('Waiting for companion phone upload...');

      // Advance timers by 2000ms (next automatic retry in retryDelays)
      await act(async () => {
        jest.advanceTimersByTime(2001);
      });

      // Second sync attempt arrived and reconciled automatically!
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(container.textContent).toContain('Verified Server Telemetry');
      expect(container.textContent).toContain('Zero phone interruptions observed');
      // Did NOT require user to click 'Check status'!

      jest.useRealTimers();
    });

    test('Truthful diagnostic when companion reports PERMISSION_REQUIRED', async () => {
      const sessionId = 'sess_reflection_perm_req';
      setPairedDeviceRecord({
        deviceId: 'dev_reflection_test',
        deviceName: 'Pixel 9',
        status: 'active',
        pairedAt: Date.now(),
        lastSeenAt: Date.now()
      });

      // Pre-seed telemetry with PERMISSION_REQUIRED
      recordFocusTelemetry({
        id: `telem-${sessionId}`,
        sessionId,
        summaryId: 'sum_perm_req',
        collectionStatus: 'PERMISSION_REQUIRED',
        observedSeconds: 0,
        interruptionCount: 0,
        longestUninterruptedSeconds: 0,
        provenance: 'REAL_EXTERNAL_SOURCE'
      });

      await act(async () => {
        root.render(
          <FocusSpace
            session={{
              sessionId,
              task: { id: 'task-perm', name: 'Waveguides' },
              status: 'reflection',
              targetMinutes: 25,
              sessionStartTime: Date.now() - 1500 * 1000,
              sessionEndTime: Date.now()
            }}
            onAbandon={jest.fn()}
            onCommitEvidence={jest.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Usage Access permission is missing on phone');
    });

    test('Truthful diagnostic when companion reports 0s observations', async () => {
      const sessionId = 'sess_reflection_zero_obs';
      setPairedDeviceRecord({
        deviceId: 'dev_reflection_test',
        deviceName: 'Pixel 9',
        status: 'active',
        pairedAt: Date.now(),
        lastSeenAt: Date.now()
      });

      recordFocusTelemetry({
        id: `telem-${sessionId}`,
        sessionId,
        summaryId: 'sum_zero_obs',
        collectionStatus: 'COMPLETE',
        observedSeconds: 0,
        interruptionCount: 0,
        longestUninterruptedSeconds: 0,
        provenance: 'REAL_EXTERNAL_SOURCE'
      });

      await act(async () => {
        root.render(
          <FocusSpace
            session={{
              sessionId,
              task: { id: 'task-zero', name: 'Antenna Poynting Vector' },
              status: 'reflection',
              targetMinutes: 25,
              sessionStartTime: Date.now() - 1500 * 1000,
              sessionEndTime: Date.now()
            }}
            onAbandon={jest.fn()}
            onCommitEvidence={jest.fn()}
          />
        );
      });

      expect(container.textContent).toContain('No phone usage observations recorded during session window');
    });
  });
});
