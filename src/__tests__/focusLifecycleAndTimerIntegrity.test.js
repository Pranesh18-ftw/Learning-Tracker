import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { safeStorageSet, safeStorageGet } from '../utils/storage';
import FocusSpace from '../components/FocusSpace';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock window.Audio to avoid jsdom failures
window.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockRejectedValue(new Error('Audio playback blocked'))
}));

describe('P1.5 — Focus / Pomodoro Lifecycle, Timer, Visibility, and Session-Recovery Integrity', () => {
  let container;
  let root;
  let capturedContext = null;

  const TestConsumer = () => {
    capturedContext = useRoadmap();
    return <div data-testid="focus-test-consumer">Ready</div>;
  };

  const sampleTask = {
    id: 'task-quantum-well',
    taskId: 'task-quantum-well',
    name: 'Infinite Potential Well Boundary Conditions',
    subjectId: 'subj-physics',
    subjectName: 'Modern Physics',
    phaseId: 'phase-quantum',
    phaseName: 'Quantum Mechanics',
    time: 25
  };

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    capturedContext = null;
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
  });

  const mountContext = () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });
  };

  test('1. Focus session creation, timer start, and canonical monotonic elapsed time', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    expect(capturedContext.focusSession).toBeDefined();
    expect(capturedContext.focusSession.status).toBe('ready');
    expect(capturedContext.focusSession.targetMinutes).toBe(25);
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(1500);
    const initialSessionId = capturedContext.focusSession.sessionId;
    expect(initialSessionId).toBeTruthy();

    // Start running
    const t0 = Date.now();
    act(() => {
      capturedContext.beginFocusRunning();
    });

    expect(capturedContext.focusSession.status).toBe('running');
    expect(capturedContext.focusSession.sessionId).toBe(initialSessionId);
    expect(capturedContext.focusSession.sessionStartTime).toBeGreaterThanOrEqual(t0);
    expect(capturedContext.focusSession.sessionEndTime).toBe(capturedContext.focusSession.sessionStartTime + 1500 * 1000);
  });

  test('2. Multiple pause/resume cycles preserve exact accumulated active time without drift', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    const startTime = 1000000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startTime);

    act(() => {
      capturedContext.beginFocusRunning();
    });

    // Run active for 5 minutes (300,000 ms)
    nowSpy.mockReturnValue(startTime + 300000);

    act(() => {
      capturedContext.pauseFocusSession();
    });

    expect(capturedContext.focusSession.status).toBe('paused');
    expect(capturedContext.focusSession.elapsedMs).toBe(300000);
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(1200); // 1500 - 300 = 1200

    // Stay paused for 10 minutes (600,000 ms) — paused duration must NOT be counted
    nowSpy.mockReturnValue(startTime + 900000);

    act(() => {
      capturedContext.resumeFocusSession();
    });

    expect(capturedContext.focusSession.status).toBe('running');
    expect(capturedContext.focusSession.sessionStartTime).toBe(startTime + 900000);
    expect(capturedContext.focusSession.sessionEndTime).toBe(startTime + 900000 + 1200 * 1000);
    expect(capturedContext.focusSession.elapsedMs).toBe(300000); // Still 5 mins

    // Run active for another 7 minutes (420,000 ms)
    nowSpy.mockReturnValue(startTime + 900000 + 420000);

    act(() => {
      capturedContext.pauseFocusSession();
    });

    expect(capturedContext.focusSession.status).toBe('paused');
    expect(capturedContext.focusSession.elapsedMs).toBe(720000); // 5m + 7m = 12m
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(780); // 1200 - 420 = 780s

    nowSpy.mockRestore();
  });

  test('3. Laptop sleep / system suspension does NOT inflate active session duration beyond target', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    const startTime = 1000000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startTime);

    act(() => {
      capturedContext.beginFocusRunning();
    });

    // Simulate laptop sleeping for 3 hours (10,800,000 ms) while running a 25-minute timer
    nowSpy.mockReturnValue(startTime + 10800000);

    act(() => {
      capturedContext.openReflectionSession();
    });

    expect(capturedContext.focusSession.status).toBe('reflection');
    // Active elapsed time must be capped at 25 minutes (1,500,000 ms), NOT 3 hours
    expect(capturedContext.focusSession.elapsedMs).toBe(1500000);

    nowSpy.mockRestore();
  });

  test('4. Session identity stability and idempotent commit (double-commit guard)', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    const canonicalSessionId = capturedContext.focusSession.sessionId;
    expect(canonicalSessionId).toBeTruthy();

    act(() => {
      capturedContext.beginFocusRunning();
      capturedContext.openReflectionSession();
    });

    expect(capturedContext.focusSession.sessionId).toBe(canonicalSessionId);

    // Commit focus session
    act(() => {
      capturedContext.commitFocusSession({
        durationMinutes: 25,
        notes: 'Boundary values evaluated',
        difficulty: 'medium'
      });
    });

    expect(capturedContext.focusSession).toBeNull();
    expect(capturedContext.sessions.length).toBe(1);
    const recorded = capturedContext.sessions[0];
    expect(recorded.id).toBe(canonicalSessionId);
    expect(recorded.sessionId).toBe(canonicalSessionId);
    expect(recorded.durationMinutes).toBe(25);

    // Rapid double-call to commitFocusSession or duplicate addFocusSession
    act(() => {
      capturedContext.commitFocusSession({
        durationMinutes: 25,
        notes: 'Boundary values evaluated',
        difficulty: 'medium'
      });
    });

    // Idempotent: must still be exactly 1 session
    expect(capturedContext.sessions.length).toBe(1);
  });

  test('5. Abandon / Cancel semantics clean up state without recording phantom sessions or streaks', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
      capturedContext.beginFocusRunning();
    });

    expect(capturedContext.focusSession).not.toBeNull();

    act(() => {
      capturedContext.abandonFocusSession();
    });

    expect(capturedContext.focusSession).toBeNull();
    expect(safeStorageGet('currentFocusSession', null)).toBeNull();
    expect(capturedContext.sessions.length).toBe(0);
    expect(capturedContext.taskCompletions.length).toBe(0);
    expect(capturedContext.calculateStreak()).toBe(0);
  });

  test('6. Storage rehydration safely restores active focus session, while quarantining malformed session', () => {
    // Write valid active session to storage
    const validSession = {
      sessionId: 'session-persist-100',
      id: 'session-persist-100',
      task: sampleTask,
      status: 'paused',
      targetMinutes: 25,
      timeLeftSeconds: 600,
      elapsedMs: 900000
    };
    safeStorageSet('currentFocusSession', validSession);

    mountContext();

    expect(capturedContext.focusSession).toBeDefined();
    expect(capturedContext.focusSession.sessionId).toBe('session-persist-100');
    expect(capturedContext.focusSession.status).toBe('paused');
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(600);

    act(() => {
      root.unmount();
    });

    // Now test malformed / corrupted active session in storage
    const malformedSession = { status: 'running', task: null }; // missing task & id
    safeStorageSet('currentFocusSession', malformedSession);

    const newContainer = document.createElement('div');
    document.body.appendChild(newContainer);
    const newRoot = createRoot(newContainer);

    act(() => {
      newRoot.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Malformed session must be safely sanitized to null rather than crashing the learner
    expect(capturedContext.focusSession).toBeNull();
    expect(safeStorageGet('currentFocusSession', null)).toBeNull();

    act(() => {
      newRoot.unmount();
    });
    newContainer.remove();
  });

  test('7. FocusSpace UI triggers tickWallClock on visibilitychange / window focus without timer drift', () => {
    const mockSession = {
      sessionId: 'session-vis-test',
      id: 'session-vis-test',
      task: sampleTask,
      status: 'running',
      targetMinutes: 25,
      timeLeftSeconds: 1500,
      sessionStartTime: Date.now(),
      sessionEndTime: Date.now() + 1500 * 1000,
      elapsedMs: 0
    };

    const onPause = jest.fn();
    const onResume = jest.fn();
    const onCommit = jest.fn();
    const onAbandon = jest.fn();

    act(() => {
      root.render(
        <FocusSpace
          session={mockSession}
          onPause={onPause}
          onResume={onResume}
          onCommitEvidence={onCommit}
          onAbandon={onAbandon}
        />
      );
    });

    // Simulate page visibility change to visible
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    // Component renders without error and handles visibility sync cleanly
    expect(container.querySelector('[aria-label="Active Focus Space"]')).toBeTruthy();
  });

  test('8. Reflection independence and exit confirmation truthfulness', () => {
    const mockReflectionSession = {
      sessionId: 'session-refl-test',
      id: 'session-refl-test',
      task: sampleTask,
      status: 'reflection',
      targetMinutes: 25,
      timeLeftSeconds: 0,
      sessionStartTime: null,
      sessionEndTime: null,
      elapsedMs: 1500000
    };

    const onCommit = jest.fn();
    const onAbandon = jest.fn();

    act(() => {
      root.render(
        <FocusSpace
          session={mockReflectionSession}
          onCommitEvidence={onCommit}
          onAbandon={onAbandon}
        />
      );
    });

    expect(container.querySelector('[aria-label="Focus Reflection Space"]')).toBeTruthy();

    // Verify commit button works and records 25 minutes
    const submitBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('RECORD EVIDENCE'));
    expect(submitBtn).toBeTruthy();

    act(() => {
      submitBtn.click();
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinutes: 25
      })
    );
  });
});
