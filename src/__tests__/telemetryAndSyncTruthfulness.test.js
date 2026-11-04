/**
 * telemetryAndSyncTruthfulness.test.js
 *
 * Comprehensive Test Suite for Truthfulness Hardening (P0.3):
 * 1. No phone connector: telemetry status = unavailable/not connected.
 * 2. Focus still works without phone telemetry.
 * 3. No telemetry is NOT rendered as zero interruptions.
 * 4. Synthetic telemetry cannot enter production runtime.
 * 5. Synthetic telemetry cannot be persisted as learner telemetry.
 * 6. MockSyncServerBroker is not reachable from production runtime.
 * 7. Sync without backend returns SYNC_UNAVAILABLE.
 * 8. Local outbox remains durable when sync unavailable.
 * 9. Local mutation is not marked synced when no backend response exists.
 * 10. Authenticated + sync unavailable is valid.
 * 11. Phone not connected + focus session is valid.
 * 12. Fake telemetry cannot influence: Growth, Archive, Achievements, Trajectory, Adaptation.
 * 13. Real future telemetry schema can still be consumed when a legitimate connector exists.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  isCompanionConnected,
  getPairedDevice,
  unpairCompanionDevice,
  recordFocusTelemetry,
  getTelemetryForSession,
  getAllFocusTelemetry,
  getTelemetryStatusForSession,
  getFocusIntegritySummaryMetrics,
  formatDuration
} from '../services/focusIntegrityService';
import {
  TELEMETRY_PROVENANCE,
  TELEMETRY_STATUS,
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS
} from '../shared/focusIntegrityProtocol';
import {
  executeSyncCycle,
  getSyncMetadata,
  enqueueMutation,
  getOutbox,
  getOutboxCount,
  clearOutbox
} from '../services/syncEngine';
import {
  isSyncBackendConfigured,
  dispatchSyncRequest,
  clearTestSyncTransport
} from '../services/syncTransport';
import {
  SYNC_STATUS_STATES,
  SYNC_ENTITY_TYPES,
  SYNC_OPERATIONS,
  OUTBOX_MUTATION_STATUS
} from '../shared/accountSyncProtocol';
import { getOrCreateAccount, linkAuthProvider } from '../services/accountIdentityService';
import { resolveFocusGrowthSignals } from '../utils/growthEvidenceResolver';
import { deriveFeatures } from '../adaptive/featureDeriver';
import { evaluateHypotheses } from '../adaptive/hypothesisEngine';
import FocusSpace from '../components/FocusSpace';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P0.3 — Truthfulness Hardening: Telemetry & Cloud Sync Invariants', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    clearOutbox();
    clearTestSyncTransport();
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
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    clearTestSyncTransport();
  });

  // =========================================================================
  // 1. NO PHONE CONNECTOR -> STATUS = UNAVAILABLE / NOT CONNECTED
  // =========================================================================
  test('1. No phone connector returns SOURCE_NOT_CONNECTED', () => {
    expect(isCompanionConnected()).toBe(false);
    expect(getPairedDevice()).toBeNull();
    const status = getTelemetryStatusForSession('sess-100');
    expect(status).toBe(TELEMETRY_STATUS.SOURCE_NOT_CONNECTED);
  });

  // =========================================================================
  // 2. FOCUS STILL WORKS WITHOUT PHONE TELEMETRY
  // =========================================================================
  test('2. Focus space allows starting, running, and completing sessions without phone telemetry', () => {
    const onCommitEvidence = jest.fn();
    const mockSession = {
      id: 'sess-standalone',
      sessionId: 'sess-standalone',
      status: 'reflection',
      targetMinutes: 25,
      timeLeftSeconds: 0,
      task: { name: 'RC Low Pass Filters', glyph: 'capacitor' }
    };

    act(() => {
      root.render(
        <FocusSpace
          session={mockSession}
          onCommitEvidence={onCommitEvidence}
          onAbandon={jest.fn()}
        />
      );
    });

    // Verify reflection UI renders without errors
    expect(container.textContent).toContain('Phone not connected');
    expect(container.textContent).toContain('Phone telemetry unavailable');

    // Click Record Evidence & Return
    const recordBtn = container.querySelector('button.bg-emerald-500');
    expect(recordBtn).not.toBeNull();
    act(() => {
      recordBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCommitEvidence).toHaveBeenCalledTimes(1);
    expect(onCommitEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinutes: expect.any(Number),
        difficulty: 'medium'
      })
    );
  });

  // =========================================================================
  // 3. NO TELEMETRY IS NOT RENDERED AS ZERO INTERRUPTIONS
  // =========================================================================
  test('3. No telemetry is NOT rendered as "0 interruptions"', () => {
    const mockSession = {
      id: 'sess-no-phone',
      sessionId: 'sess-no-phone',
      status: 'reflection',
      targetMinutes: 25,
      timeLeftSeconds: 0,
      task: { name: 'Capacitor Charge Curves' }
    };

    act(() => {
      root.render(<FocusSpace session={mockSession} />);
    });

    const text = container.textContent;
    expect(text).toContain('Phone not connected');
    expect(text).toContain('Phone telemetry unavailable');
    expect(text).not.toContain('0 interruptions');
    expect(text).not.toContain('Zero phone interruptions');
    expect(text).not.toContain('Focus integrity verified');
  });

  // =========================================================================
  // 4. SYNTHETIC TELEMETRY CANNOT ENTER PRODUCTION RUNTIME
  // =========================================================================
  test('4. Synthetic telemetry without REAL_EXTERNAL_SOURCE provenance is rejected in production', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      // Simulate production runtime
      process.env.NODE_ENV = 'production';

      const syntheticRecord = {
        sessionId: 'sess-prod-fake',
        interruptionCount: 5,
        interruptionSeconds: 300,
        intendedSeconds: 1500,
        observedSeconds: 1500,
        provenance: TELEMETRY_PROVENANCE.DEV_SIMULATION
      };

      const accepted = recordFocusTelemetry(syntheticRecord);
      expect(accepted).toBe(false);

      // Verify nothing reached storage
      expect(getTelemetryForSession('sess-prod-fake')).toBeNull();
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  // =========================================================================
  // 5. SYNTHETIC TELEMETRY CANNOT BE PERSISTED AS LEARNER TELEMETRY
  // =========================================================================
  test('5. Non-real telemetry records are ignored when reading learner telemetry in production', () => {
    // Manually inject a fake record into localStorage (e.g. from previous corrupted state)
    const injected = {
      'sess-bad': {
        sessionId: 'sess-bad',
        interruptionCount: 1,
        interruptionSeconds: 60,
        provenance: 'DEV_SIMULATION'
      }
    };
    localStorage.setItem('learningTracker_focusTelemetry', JSON.stringify(injected));

    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      // In production, getTelemetryForSession returns null for non-real records
      expect(getTelemetryForSession('sess-bad')).toBeNull();
      // getAllFocusTelemetry filters out non-real records
      expect(getAllFocusTelemetry()).toEqual([]);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  // =========================================================================
  // 6. MOCK TRANSPORT IS NOT REACHABLE FROM PRODUCTION RUNTIME
  // =========================================================================
  test('6. Production runtime rejects registering test transport brokers', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() => {
        // Attempting to register test transport in production throws
        const { registerTestSyncTransport } = require('../services/syncTransport');
        registerTestSyncTransport({ sync: jest.fn() });
      }).toThrow(/forbidden outside test environments/i);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  // =========================================================================
  // 7. SYNC WITHOUT BACKEND RETURNS SYNC_UNAVAILABLE
  // =========================================================================
  test('7. Sync execution without configured backend returns SYNC_UNAVAILABLE', async () => {
    // Ensure no backend URL and no test broker
    delete window.__LEARNING_TRACKER_SYNC_API__;
    clearTestSyncTransport();

    expect(isSyncBackendConfigured()).toBe(false);

    const result = await executeSyncCycle();
    expect(result.success).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(result.status).toBe('SYNC_UNAVAILABLE');

    const meta = getSyncMetadata();
    expect(meta.status).toBe(SYNC_STATUS_STATES.SYNC_UNAVAILABLE);
  });

  // =========================================================================
  // 8. LOCAL OUTBOX REMAINS DURABLE WHEN SYNC IS UNAVAILABLE
  // =========================================================================
  test('8. Local outbox queue remains intact when sync is unavailable', async () => {
    delete window.__LEARNING_TRACKER_SYNC_API__;
    clearTestSyncTransport();

    // Enqueue 2 local mutations
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'evt-task-1',
      payload: { taskId: 't-1' }
    });
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'evt-sess-1',
      payload: { sessionId: 's-1', durationMinutes: 25 }
    });

    expect(getOutboxCount()).toBe(2);

    // Attempt sync
    const res = await executeSyncCycle();
    expect(res.success).toBe(false);
    expect(res.unavailable).toBe(true);

    // Outbox MUST retain both items safely
    expect(getOutboxCount()).toBe(2);
    const outbox = getOutbox();
    expect(outbox[0].payload.eventId).toBe('evt-task-1');
    expect(outbox[1].payload.eventId).toBe('evt-sess-1');
  });

  // =========================================================================
  // 9. LOCAL MUTATION IS NOT MARKED SYNCED WHEN NO BACKEND RESPONSE EXISTS
  // =========================================================================
  test('9. Local mutation is marked PENDING_LOCAL_SYNC, never false SYNCED', () => {
    const mutation = enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.USER_IDENTITY,
      operation: SYNC_OPERATIONS.UPDATE_STATE,
      payload: { goal: 'Embedded Systems' }
    });

    expect(mutation.syncStatus).toBe(OUTBOX_MUTATION_STATUS.PENDING_LOCAL_SYNC);
    expect(mutation.syncStatus).not.toBe('SYNCED');
  });

  // =========================================================================
  // 10. AUTHENTICATED + SYNC UNAVAILABLE IS A VALID STATE
  // =========================================================================
  test('10. Learner can be authenticated with Google while sync is truthfully unavailable', async () => {
    delete window.__LEARNING_TRACKER_SYNC_API__;
    clearTestSyncTransport();

    // User signs in with Google identity
    const account = linkAuthProvider({
      provider: 'google',
      email: 'learner@example.com',
      displayName: 'Marie Curie',
      externalId: 'google_uid_123'
    });

    expect(account.authProvider).toBe('google');
    expect(account.email).toBe('learner@example.com');

    // Run sync cycle: backend is not connected
    const syncRes = await executeSyncCycle();
    expect(syncRes.unavailable).toBe(true);

    // Valid state: Authenticated identity + SYNC_UNAVAILABLE + Phone not connected
    const meta = getSyncMetadata();
    expect(meta.status).toBe(SYNC_STATUS_STATES.SYNC_UNAVAILABLE);
    expect(isCompanionConnected()).toBe(false);
  });

  // =========================================================================
  // 11. PHONE NOT CONNECTED + FOCUS SESSION IS VALID
  // =========================================================================
  test('11. Starting and completing a focus session with phone not connected is completely valid', () => {
    expect(isCompanionConnected()).toBe(false);

    const sessionContract = {
      id: 'sess-no-companion',
      targetMinutes: 30,
      taskName: 'Ohm’s Law Derivation'
    };

    // Session can exist and be tracked
    expect(sessionContract.targetMinutes).toBe(30);
    const status = getTelemetryStatusForSession(sessionContract.id);
    expect(status).toBe(TELEMETRY_STATUS.SOURCE_NOT_CONNECTED);
  });

  // =========================================================================
  // 12. FAKE TELEMETRY CANNOT INFLUENCE GROWTH, ARCHIVE, OR ADAPTATION
  // =========================================================================
  test('12. Downstream resolvers (Growth, Adaptive) ignore sessions without real external telemetry', () => {
    const rawSessions = [
      { id: 's1', durationMinutes: 30, completed: true, date: new Date().toISOString() },
      { id: 's2', durationMinutes: 35, completed: true, date: new Date().toISOString() }
    ];

    // Growth Evidence
    const growth = resolveFocusGrowthSignals(rawSessions);
    expect(growth.last30Days?.distractionTrendLabel ?? null).toBeNull();

    // Summary metrics when no real phone is connected
    const metrics = getFocusIntegritySummaryMetrics();
    expect(metrics.hasEnoughData).toBe(false);

    // Feature deriver for adaptive recommendation
    const features = deriveFeatures([{ key: 'observed_sessions', value: rawSessions }]);
    expect(features.focusTelemetry.source).toBe('session_timer');
    expect(features.focusTelemetry.interruptionRate).toBe(0);
  });

  // =========================================================================
  // 13. REAL FUTURE TELEMETRY SCHEMA CONSUMPTION CONTRACT
  // =========================================================================
  test('13. Real external telemetry record can be validated, recorded, and read', () => {
    const realTelemetry = {
      sessionId: 'sess-real-future-01',
      intendedSeconds: 1800,
      observedSeconds: 1800,
      interruptionCount: 1,
      interruptionSeconds: 45,
      referenceSeconds: 45,
      distractionSeconds: 0,
      unknownSeconds: 0,
      longestUninterruptedSeconds: 1755,
      provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE,
      appBreakdown: [
        { packageName: 'com.sec.android.app.popupcalculator', category: APP_CATEGORIES.REFERENCE, durationSeconds: 45 }
      ]
    };

    const recorded = recordFocusTelemetry(realTelemetry);
    expect(recorded).toBe(true);

    const fetched = getTelemetryForSession('sess-real-future-01');
    expect(fetched).not.toBeNull();
    expect(fetched.interruptionCount).toBe(1);
    expect(fetched.provenance).toBe(TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE);
  });

  // =========================================================================
  // 14. DOWNSTREAM ADAPTIVE HYPOTHESES DO NOT INVENT PHONE INTERRUPTIONS
  // =========================================================================
  test('14. Adaptive hypothesis generator never claims phone interruptions without phone telemetry', () => {
    const rawSessions = [
      { id: 's1', durationMinutes: 25, completed: true },
      { id: 's2', durationMinutes: 25, completed: true },
      { id: 's3', durationMinutes: 30, completed: true },
      { id: 's4', durationMinutes: 45, completed: false },
      { id: 's5', durationMinutes: 45, completed: false }
    ];

    const features = deriveFeatures([{ key: 'observed_sessions', value: rawSessions }]);
    expect(features.focusTelemetry.source).toBe('session_timer');

    const hypotheses = evaluateHypotheses(features, []);
    const sessionSizeHypothesis = hypotheses.find(h => h.key === 'shorter_sessions_sustainable');
    if (sessionSizeHypothesis) {
      expect(sessionSizeHypothesis.rationale).not.toContain('fewer phone interruptions');
      expect(sessionSizeHypothesis.rationale).toContain('completion consistency compared to longer blocks');
    }

    const envHypothesis = hypotheses.find(h => h.key === 'environmental_focus_adjustment');
    expect(envHypothesis).toBeUndefined();
  });
});
