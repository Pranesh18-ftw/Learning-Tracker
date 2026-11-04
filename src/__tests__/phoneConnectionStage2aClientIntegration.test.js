/**
 * phoneConnectionStage2aClientIntegration.test.js
 *
 * Integration Test Suite for Browser-Side Phone Connection & Lifecycle Integration (Stage 2A):
 * - phoneConnectionClient HTTP interactions
 * - Non-blocking network failure resilience during Focus sessions
 * - RoadmapContext.reconcileSessionTelemetry behavior (duration/task preservation)
 * - Provenance enforcement on late-arriving telemetry
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import {
  startPairingSession,
  relaySessionStart,
  relaySessionEnd,
  setAuthTokenProvider,
  resetAuthTokenProvider
} from '../services/phoneConnectionClient';
import {
  notifyFocusStarted,
  notifyFocusEnded
} from '../services/focusIntegrityService';
import { TELEMETRY_PROVENANCE } from '../shared/focusIntegrityProtocol';

describe('Phone Connection v1 — Stage 2A Client Integration Test Suite', () => {
  let originalFetch;
  let container = null;
  let root = null;
  let capturedContext = null;

  function ContextConsumer() {
    capturedContext = useRoadmap();
    return null;
  }

  beforeEach(() => {
    localStorage.clear();
    originalFetch = global.fetch;
    setAuthTokenProvider(async () => 'mock-firebase-id-token-xyz');

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
    capturedContext = null;
    global.fetch = originalFetch;
    localStorage.clear();
  });

  test('1. startPairingSession calls /pair/start with Firebase ID token', async () => {
    global.fetch = jest.fn(async (url, opts) => {
      expect(url).toContain('/pair/start');
      expect(opts.headers.Authorization).toBe('Bearer mock-firebase-id-token-xyz');
      return {
        ok: true,
        json: async () => ({
          success: true,
          challengeId: 'pch_test_123',
          pairingCode: '654321',
          expiresAt: Date.now() + 300000,
          expiresInSeconds: 300
        })
      };
    });

    const res = await startPairingSession();
    expect(res.success).toBe(true);
    expect(res.pairingCode).toBe('654321');
  });

  test('2. startPairingSession handles network failure gracefully without throwing uncaught errors', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('Failed to fetch (offline)');
    });

    const res = await startPairingSession();
    expect(res.success).toBe(false);
    expect(res.code).toBe('NETWORK_ERROR');
  });

  test('3. relaySessionStart is non-blocking and handles network failure quietly', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('Network timeout');
    });

    const res = await relaySessionStart({
      sessionId: 'sess_non_blocking_start',
      startedAt: Date.now(),
      targetMinutes: 25
    });

    expect(res.relayed).toBe(false);
    expect(res.reason).toBe('NETWORK_UNAVAILABLE');
  });

  test('4. relaySessionEnd is non-blocking and dispatches session completion', async () => {
    global.fetch = jest.fn(async (url, opts) => {
      expect(url).toContain('/focus-sessions/sess_complete_test/end');
      const body = JSON.parse(opts.body);
      expect(body.status).toBe('COMPLETE');
      return {
        ok: true,
        json: async () => ({ success: true, session: { sessionId: 'sess_complete_test', status: 'COMPLETE' } })
      };
    });

    const res = await relaySessionEnd('sess_complete_test', { status: 'COMPLETE' });
    expect(res.relayed).toBe(true);
  });

  test('5. notifyFocusStarted dispatches relaySessionStart without failing local session setup', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));

    localStorage.setItem('learningTracker_companionDevice', JSON.stringify({
      deviceAssociationId: 'dev_mock_01',
      deviceName: 'Test Phone'
    }));

    const contract = notifyFocusStarted({
      sessionId: 'sess_hook_test',
      targetMinutes: 25,
      task: { name: 'Firmware Registers' }
    });

    expect(contract).toBeDefined();
    expect(contract.sessionId).toBe('sess_hook_test');
    await new Promise(r => setTimeout(r, 20));
    expect(global.fetch).toHaveBeenCalled();
  });

  test('6. notifyFocusEnded dispatches relaySessionEnd without disrupting local flow', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));

    const res = notifyFocusEnded('sess_hook_end');
    expect(res.state).toBe('COMPLETE');
    await new Promise(r => setTimeout(r, 20));
    expect(global.fetch).toHaveBeenCalled();
  });

  test('7. RoadmapContext.reconcileSessionTelemetry attaches late telemetry to committed session', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <ContextConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext).toBeDefined();

    const sessionId = 'sess_canonical_test_100';

    // 1. Add a committed focus session
    act(() => {
      capturedContext.addFocusSession({
        id: sessionId,
        sessionId,
        subjectId: 'sub_stem',
        phaseId: 'p1',
        taskId: 't1',
        durationMinutes: 25,
        startedAt: new Date(Date.now() - 25 * 60000),
        endedAt: new Date(),
        companionTelemetry: null
      });
    });

    const sessionBefore = capturedContext.sessions.find(s => s.id === sessionId);
    expect(sessionBefore).toBeDefined();
    expect(sessionBefore.durationMinutes).toBe(25);
    expect(sessionBefore.companionTelemetry).toBeNull();

    // 2. Reconcile late companion telemetry
    const lateTelemetry = {
      id: 'telem-sess_canonical_test_100',
      summaryId: 'sum_late_001',
      sessionId,
      interruptionCount: 2,
      interruptionSeconds: 60,
      referenceSeconds: 180,
      distractionSeconds: 60,
      longestUninterruptedSeconds: 1260,
      provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE
    };

    act(() => {
      const reconciled = capturedContext.reconcileSessionTelemetry(sessionId, lateTelemetry);
      expect(reconciled).toBe(true);
    });

    // 3. Verify session was enriched with telemetry
    const sessionAfter = capturedContext.sessions.find(s => s.id === sessionId);
    expect(sessionAfter.companionTelemetry).toBeDefined();
    expect(sessionAfter.companionTelemetry.interruptionCount).toBe(2);

    // CRITICAL INVARIANTS:
    expect(sessionAfter.durationMinutes).toBe(25); // INVARIANT: Duration is untouched
    expect(sessionAfter.taskId).toBe('t1'); // INVARIANT: Task association is untouched
  });

  test('8. reconcileSessionTelemetry handles missing or invalid session safely', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <ContextConsumer />
        </RoadmapProvider>
      );
    });

    act(() => {
      const result = capturedContext.reconcileSessionTelemetry('non_existent_session_id', {
        provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE
      });
      expect(result).toBe(false);
    });
  });
});
