/**
 * phoneTelemetryReconciliation.test.js
 *
 * Comprehensive Regression Test Suite for:
 * - Missing Android-to-web focus telemetry retrieval and reconciliation path
 * - formatNormalizedTelemetryResponse auditing (preserving 0 values and unknown nulls)
 * - Truthful distinction between reconciled, no telemetry yet, insufficient observations, and retrieval errors
 * - FocusSpace bounded retries, manual check/retry buttons, and reflection lifecycle
 * - RoadmapContext late reconciliation, cross-account guards, and non-destructive session enrichment
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FocusSpace from '../components/FocusSpace';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import {
  getServerSessionTelemetry,
  fetchAndReconcileSessionTelemetry,
  setAuthTokenProvider,
  resetAuthTokenProvider
} from '../services/phoneConnectionClient';
import {
  formatNormalizedTelemetryResponse,
  reconcileSessionTelemetry
} from '../server/phone/telemetryReconciliationService';
import {
  reconcileLateTelemetry,
  recordFocusTelemetry,
  getTelemetryForSession,
  getTelemetryStatusForSession,
  clearFocusIntegrityData,
  setPairedDeviceRecord
} from '../services/focusIntegrityService';
import {
  TELEMETRY_PROVENANCE,
  TELEMETRY_STATUS,
  APP_CATEGORIES
} from '../shared/focusIntegrityProtocol';

describe('Phone Telemetry Retrieval & Reconciliation Regression Suite', () => {
  let originalFetch;
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    clearFocusIntegrityData();
    originalFetch = global.fetch;
    setAuthTokenProvider(async () => 'mock-valid-firebase-id-token');

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

  // =========================================================================
  // 1. FORMAT NORMALIZED TELEMETRY RESPONSE AUDIT (Requirement F)
  // =========================================================================
  describe('formatNormalizedTelemetryResponse audit', () => {
    test('1. Preserves legitimate zero values for observedSeconds and interruptionCount', () => {
      const record = {
        summaryId: 'sum_zero_test',
        sessionId: 'sess_zero_test',
        deviceId: 'dev_test_phone',
        observedAt: 1728590000000,
        receivedAt: 1728590005000,
        reconciled: true,
        payload: {
          intendedSeconds: 1500,
          observedSeconds: 0, // Legitimate 0 observed seconds!
          interruptionCount: 0,
          interruptionSeconds: 0,
          referenceSeconds: 0,
          distractionSeconds: 0,
          longestUninterruptedSeconds: 0
        }
      };

      const normalized = formatNormalizedTelemetryResponse(record);
      expect(normalized).toBeDefined();
      expect(normalized.observedSeconds).toBe(0); // MUST NOT default to 1500!
      expect(normalized.intendedSeconds).toBe(1500);
      expect(normalized.interruptionCount).toBe(0);
      expect(normalized.interruptionSeconds).toBe(0);
      expect(normalized.longestUninterruptedSeconds).toBe(0);
    });

    test('2. Preserves unknown/missing measurements as null without fabricating durations', () => {
      const record = {
        summaryId: 'sum_missing_test',
        sessionId: 'sess_missing_test',
        deviceId: 'dev_test_phone',
        observedAt: 1728590000000,
        receivedAt: 1728590005000,
        reconciled: false,
        payload: {
          // intendedSeconds and observedSeconds completely omitted
          interruptionCount: 1
        }
      };

      const normalized = formatNormalizedTelemetryResponse(record);
      expect(normalized).toBeDefined();
      expect(normalized.observedSeconds).toBeNull(); // MUST NOT default to 1500!
      expect(normalized.intendedSeconds).toBeNull(); // MUST NOT default to 1500!
      expect(normalized.interruptionCount).toBe(1);
    });

    test('3. Handles missing or empty record safely', () => {
      expect(formatNormalizedTelemetryResponse(null)).toBeNull();
      expect(formatNormalizedTelemetryResponse(undefined)).toBeNull();
    });
  });

  // =========================================================================
  // 2. WEB CLIENT SERVER RETRIEVAL (Requirements B, D, E, H)
  // =========================================================================
  describe('getServerSessionTelemetry client function', () => {
    test('4. Rejects request when user is unauthenticated in local mode', async () => {
      resetAuthTokenProvider(); // No auth token provider configured
      const res = await getServerSessionTelemetry('sess_auth_check');
      expect(res.success).toBe(false);
      expect(res.reason).toBe('LOCAL_MODE_UNAUTHENTICATED');
      expect(res.code).toBe('UNAUTHENTICATED');
      expect(res.telemetry).toBeNull();
      expect(res.error).toContain('Sign in required');
    });

    test('5. Rejects missing sessionId without network request', async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;
      const res = await getServerSessionTelemetry('');
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_SESSION_ID');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('6. Successfully retrieves reconciled telemetry via GET endpoint', async () => {
      const mockTelemetry = {
        id: 'telem-sess_reconciled_123',
        summaryId: 'sum_rec_123',
        sessionId: 'sess_reconciled_123',
        deviceId: 'dev_samsung_s24',
        intendedSeconds: 1500,
        observedSeconds: 1500,
        interruptionCount: 1,
        interruptionSeconds: 30,
        referenceSeconds: 60,
        distractionSeconds: 30,
        provenance: 'REAL_EXTERNAL_SOURCE'
      };

      global.fetch = jest.fn(async (url, opts) => {
        expect(url).toContain('/focus-sessions/sess_reconciled_123/telemetry');
        expect(opts.method).toBe('GET');
        expect(opts.headers.Authorization).toBe('Bearer mock-valid-firebase-id-token');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            reconciled: true,
            telemetry: mockTelemetry
          })
        };
      });

      const res = await getServerSessionTelemetry('sess_reconciled_123');
      expect(res.success).toBe(true);
      expect(res.reconciled).toBe(true);
      expect(res.telemetry).toEqual(mockTelemetry);
      expect(res.reason).toBe('RECONCILED');
    });

    test('7. Truthfully distinguishes NO_TELEMETRY_FOUND when summary has not arrived yet', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reconciled: false,
          reason: 'NO_TELEMETRY_FOUND',
          telemetry: null
        })
      }));

      const res = await getServerSessionTelemetry('sess_pending_upload');
      expect(res.success).toBe(true);
      expect(res.reconciled).toBe(false);
      expect(res.reason).toBe('NO_TELEMETRY_FOUND');
      expect(res.telemetry).toBeNull();
    });

    test('8. Handles server 404 (session not found) truthfully without collapsing to zero interruptions', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Session not found or not owned by authenticated user.',
          code: 'SESSION_NOT_FOUND'
        })
      }));

      const res = await getServerSessionTelemetry('sess_unknown_404');
      expect(res.success).toBe(false);
      expect(res.status).toBe(404);
      expect(res.code).toBe('SESSION_NOT_FOUND');
      expect(res.telemetry).toBeNull();
    });

    test('9. Handles server 422 (window drift exceeded) with safe diagnostic', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          error: 'Telemetry observation window starts 20m away from session start. Association rejected.',
          code: 'WINDOW_DRIFT_EXCEEDED'
        })
      }));

      const res = await getServerSessionTelemetry('sess_drift_422');
      expect(res.success).toBe(false);
      expect(res.status).toBe(422);
      expect(res.code).toBe('WINDOW_DRIFT_EXCEEDED');
      expect(res.telemetry).toBeNull();
    });

    test('10. Handles network errors safely without exposing credentials', async () => {
      global.fetch = jest.fn(async () => {
        throw new TypeError('Failed to fetch');
      });

      const res = await getServerSessionTelemetry('sess_net_err');
      expect(res.success).toBe(false);
      expect(res.code).toBe('NETWORK_ERROR');
      expect(res.reason).toBe('NETWORK_UNAVAILABLE');
      expect(res.error).toBe('Network connection unavailable. Could not retrieve companion telemetry.');
      expect(res.telemetry).toBeNull();
    });
  });

  // =========================================================================
  // 3. FOCUS INTEGRITY SERVICE RECONCILIATION INTEGRATION
  // =========================================================================
  describe('focusIntegrityService: reconcileLateTelemetry', () => {
    test('11. Records retrieved telemetry to local storage upon successful server reconciliation', async () => {
      const sessionId = 'sess_local_store_reconcile';
      const mockTelemetry = {
        id: `telem-${sessionId}`,
        summaryId: 'sum_local_store_01',
        sessionId,
        interruptionCount: 0,
        observedSeconds: 1500,
        intendedSeconds: 1500,
        provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE,
        source: 'ANDROID_COMPANION_NATIVE'
      };

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reconciled: true,
          telemetry: mockTelemetry
        })
      }));

      // Initially no telemetry locally
      expect(getTelemetryForSession(sessionId)).toBeNull();

      const result = await reconcileLateTelemetry(sessionId);
      expect(result.success).toBe(true);
      expect(result.reconciled).toBe(true);
      expect(result.telemetry).toBeDefined();

      // Verified stored in local storage
      const stored = getTelemetryForSession(sessionId);
      expect(stored).toBeDefined();
      expect(stored.sessionId).toBe(sessionId);
      expect(stored.interruptionCount).toBe(0);
    });

    test('12. Preserves error state when retrieval fails and does not create fake local record', async () => {
      const sessionId = 'sess_fail_does_not_create_local';

      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Session belongs to a different account.',
          code: 'CROSS_ACCOUNT_SESSION'
        })
      }));

      const result = await reconcileLateTelemetry(sessionId);
      expect(result.success).toBe(false);
      expect(result.code).toBe('CROSS_ACCOUNT_SESSION');

      // Local storage must remain null
      expect(getTelemetryForSession(sessionId)).toBeNull();
    });
  });

  // =========================================================================
  // 4. FOCUSSPACE UI REFLECTION TRUTHFULNESS & RETRIES (Requirements C, D, E)
  // =========================================================================
  describe('FocusSpace Component Reflection & Late Telemetry', () => {
    test('13. Renders verified server telemetry breakdown when reconciled', async () => {
      const sessionId = 'sess_ui_verified_01';

      // Seed paired device
      setPairedDeviceRecord({
        deviceAssociationId: 'dev_galaxy_s24',
        deviceName: 'Galaxy S24',
        status: 'active'
      });

      // Seed local storage with real external telemetry
      recordFocusTelemetry({
        id: `telem-${sessionId}`,
        sessionId,
        intendedSeconds: 1500,
        observedSeconds: 1500,
        interruptionCount: 2,
        interruptionSeconds: 45,
        referenceSeconds: 120,
        distractionSeconds: 45,
        longestUninterruptedSeconds: 1335,
        provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE,
        source: 'ANDROID_COMPANION_NATIVE',
        appBreakdown: [
          { packageName: 'com.android.chrome', category: APP_CATEGORIES.REFERENCE, durationSeconds: 120 },
          { packageName: 'com.instagram.android', category: APP_CATEGORIES.DISTRACTION, durationSeconds: 45 }
        ]
      });

      const session = {
        id: sessionId,
        sessionId,
        status: 'reflection',
        targetMinutes: 25,
        elapsedMs: 25 * 60 * 1000,
        task: { id: 't1', name: 'RTOS Task Scheduling' }
      };

      await act(async () => {
        root.render(<FocusSpace session={session} onCommitEvidence={() => {}} onAbandon={() => {}} />);
      });

      expect(container.textContent).toContain('FOCUS INTEGRITY EVIDENCE');
      expect(container.textContent).toContain('2 detected'); // 2 interruptions
      expect(container.textContent).toContain('Distraction');
      expect(container.textContent).toContain('Reference');
    });

    test('14. Truthfully displays insufficient observations when observedSeconds is 0', async () => {
      const sessionId = 'sess_ui_zero_observed';

      setPairedDeviceRecord({
        deviceAssociationId: 'dev_galaxy_s24',
        deviceName: 'Galaxy S24',
        status: 'active'
      });

      recordFocusTelemetry({
        id: `telem-${sessionId}`,
        sessionId,
        intendedSeconds: 1500,
        observedSeconds: 0, // 0s observed!
        interruptionCount: 0,
        interruptionSeconds: 0,
        longestUninterruptedSeconds: 0,
        provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE,
        source: 'ANDROID_COMPANION_NATIVE'
      });

      const session = {
        id: sessionId,
        sessionId,
        status: 'reflection',
        targetMinutes: 25,
        elapsedMs: 25 * 60 * 1000,
        task: { id: 't1', name: 'Zero Observed Verification' }
      };

      await act(async () => {
        root.render(<FocusSpace session={session} onCommitEvidence={() => {}} onAbandon={() => {}} />);
      });

      // MUST NOT say "Zero phone interruptions observed" or "✓ 25m uninterrupted"
      expect(container.textContent).not.toContain('Zero phone interruptions observed');
      expect(container.textContent).toContain('No phone usage observations recorded during session window');
      expect(container.textContent).toContain('0s observed');
    });

    test('15. Displays pending upload status with manual check button when no telemetry uploaded yet', async () => {
      const sessionId = 'sess_ui_pending_check';

      setPairedDeviceRecord({
        deviceAssociationId: 'dev_galaxy_s24',
        deviceName: 'Galaxy S24',
        status: 'active'
      });

      // Server returns NO_TELEMETRY_FOUND
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          reconciled: false,
          reason: 'NO_TELEMETRY_FOUND',
          telemetry: null
        })
      }));

      const session = {
        id: sessionId,
        sessionId,
        status: 'reflection',
        targetMinutes: 25,
        elapsedMs: 25 * 60 * 1000,
        task: { id: 't1', name: 'Pending Telemetry Check' }
      };

      await act(async () => {
        root.render(<FocusSpace session={session} onCommitEvidence={() => {}} onAbandon={() => {}} />);
      });

      expect(container.textContent).toContain('Companion phone paired');
      expect(container.textContent).toContain('No telemetry observations recorded');
      expect(container.textContent).toContain('Check status');
    });

    test('16. Displays truthful error diagnostic with Retry button when retrieval fails', async () => {
      const sessionId = 'sess_ui_error_check';

      setPairedDeviceRecord({
        deviceAssociationId: 'dev_galaxy_s24',
        deviceName: 'Galaxy S24',
        status: 'active'
      });

      // Server returns 401 Unauthorized
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Firebase ID token is invalid or expired.',
          code: 'UNAUTHORIZED'
        })
      }));

      const session = {
        id: sessionId,
        sessionId,
        status: 'reflection',
        targetMinutes: 25,
        elapsedMs: 25 * 60 * 1000,
        task: { id: 't1', name: 'Auth Error Verification' }
      };

      await act(async () => {
        root.render(<FocusSpace session={session} onCommitEvidence={() => {}} onAbandon={() => {}} />);
      });

      // MUST NOT show zero interruptions or quiet line
      expect(container.textContent).not.toContain('Zero phone interruptions observed');
      expect(container.textContent).toContain('Firebase ID token is invalid or expired');
      expect(container.textContent).toContain('Retry');
    });
  });

  // =========================================================================
  // 5. ROADMAPCONTEXT RECONCILIATION & LIFECYCLE (Requirements A, C, G)
  // =========================================================================
  describe('RoadmapContext server reconciliation lifecycle', () => {
    let capturedContext = null;

    function ContextConsumer() {
      capturedContext = useRoadmap();
      return null;
    }

    test('17. openReflectionSession dispatches notifyFocusEnded to mark session COMPLETE on server', async () => {
      const fetchSpy = jest.fn(async (url, opts) => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, session: { status: 'COMPLETE' } })
        };
      });
      global.fetch = fetchSpy;

      act(() => {
        root.render(
          <RoadmapProvider>
            <ContextConsumer />
          </RoadmapProvider>
        );
      });

      act(() => {
        capturedContext.startFocusSession(
          { id: 't_firmware', taskId: 't_firmware', name: 'DMA Controller', subjectId: 'eng', phaseId: 'p1' },
          25
        );
      });

      const currentSessionId = capturedContext.focusSession.sessionId;
      expect(currentSessionId).toBeDefined();

      // Trigger transition to reflection
      act(() => {
        capturedContext.openReflectionSession();
      });

      expect(capturedContext.focusSession.status).toBe('reflection');

      // Verify that notifyFocusEnded / relaySessionEnd was triggered
      await act(async () => {
        await new Promise(r => setTimeout(r, 30));
      });

      const endCalls = fetchSpy.mock.calls.filter(call => call[0].includes(`/focus-sessions/${currentSessionId}/end`));
      expect(endCalls.length).toBeGreaterThanOrEqual(1);
      const endBody = JSON.parse(endCalls[0][1].body);
      expect(endBody.status).toBe('COMPLETE');
    });

    test('18. reconcileSessionTelemetryFromServer enriches committed session idempotently without modifying task or duration', async () => {
      const sessionId = 'sess_bg_reconcile_999';

      global.fetch = jest.fn(async (url) => {
        if (url.includes(`/focus-sessions/${sessionId}/telemetry`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              reconciled: true,
              telemetry: {
                id: `telem-${sessionId}`,
                summaryId: 'sum_bg_999',
                sessionId,
                intendedSeconds: 1500,
                observedSeconds: 1500,
                interruptionCount: 1,
                interruptionSeconds: 20,
                referenceSeconds: 100,
                distractionSeconds: 20,
                longestUninterruptedSeconds: 1380,
                provenance: TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE,
                source: 'ANDROID_COMPANION_NATIVE'
              }
            })
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      act(() => {
        root.render(
          <RoadmapProvider>
            <ContextConsumer />
          </RoadmapProvider>
        );
      });

      // 1. Add committed session without companion telemetry
      act(() => {
        capturedContext.addFocusSession({
          id: sessionId,
          sessionId,
          subjectId: 'sub_eng',
          phaseId: 'p1',
          taskId: 'task_rtos',
          durationMinutes: 25,
          startedAt: new Date(Date.now() - 25 * 60000),
          endedAt: new Date(),
          companionTelemetry: null
        });
      });

      const before = capturedContext.sessions.find(s => s.id === sessionId);
      expect(before.companionTelemetry).toBeNull();
      expect(before.durationMinutes).toBe(25);

      // 2. Perform background reconciliation from server
      await act(async () => {
        const res = await capturedContext.reconcileSessionTelemetryFromServer(sessionId);
        expect(res.success).toBe(true);
        expect(res.reconciled).toBe(true);
      });

      const after = capturedContext.sessions.find(s => s.id === sessionId);
      expect(after.companionTelemetry).toBeDefined();
      expect(after.companionTelemetry.interruptionCount).toBe(1);
      expect(after.durationMinutes).toBe(25); // INVARIANT: Duration untouched
      expect(after.taskId).toBe('task_rtos'); // INVARIANT: Task untouched
    });
  });
});
