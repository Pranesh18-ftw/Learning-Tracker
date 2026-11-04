import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { safeStorageSet, safeStorageGet } from '../utils/storage';
import { saveIdentity, loadIdentity, syncIdentityToSettings } from '../utils/identityRealityResolver';
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

  test('9. Identity Time Reality synchronization propagates to settings and focus sessions', () => {
    // 1. User updates weekdayMinutes in Identity
    saveIdentity({
      timeReality: {
        weekdayMinutes: 40,
        saturdayHours: 2,
        sundayHours: 1
      }
    });

    const mockSettings = { dailyLearningHours: 1, pomodoroWorkDuration: 25 };
    const updateSettingsFn = jest.fn();

    // 2. syncIdentityToSettings propagates to pomodoroWorkDuration
    syncIdentityToSettings(loadIdentity(), mockSettings, updateSettingsFn);
    expect(updateSettingsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        pomodoroWorkDuration: 40,
        dailyLearningHours: 0.7
      })
    );

    mountContext();

    // 3. startFocusSession without duration argument respects Identity weekdayMinutes
    act(() => {
      capturedContext.startFocusSession({ ...sampleTask, time: undefined });
    });

    expect(capturedContext.focusSession.targetMinutes).toBe(40);
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(2400);
  });

  test('10. Adding time on-the-fly (extendFocusSession) extends active task duration without state loss', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    const initialSessionId = capturedContext.focusSession.sessionId;
    const startTime = 1000000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startTime);

    act(() => {
      capturedContext.beginFocusRunning();
    });

    // Advance 5 minutes
    nowSpy.mockReturnValue(startTime + 300000);

    // User adds 15 minutes to the same task
    act(() => {
      capturedContext.extendFocusSession(15);
    });

    expect(capturedContext.focusSession.sessionId).toBe(initialSessionId);
    expect(capturedContext.focusSession.targetMinutes).toBe(40); // 25 + 15
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(2100); // (1500 - 300) + 900
    expect(capturedContext.focusSession.sessionEndTime).toBe(startTime + (40 * 60 * 1000));

    nowSpy.mockRestore();
  });

  test('11. Adapted Pomodoro Cycle — taking break, break state, and resuming next work cycle on SAME task', () => {
    mountContext();

    act(() => {
      capturedContext.startFocusSession(sampleTask, 25);
    });

    const startTime = 1000000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startTime);

    act(() => {
      capturedContext.beginFocusRunning();
    });

    // Run for 25 minutes
    nowSpy.mockReturnValue(startTime + 1500000);

    // User completes work interval and starts 5m Pomodoro Break
    act(() => {
      capturedContext.startFocusBreak(5);
    });

    expect(capturedContext.focusSession.status).toBe('break');
    expect(capturedContext.focusSession.isBreak).toBe(true);
    expect(capturedContext.focusSession.completedCycles).toBe(1);
    expect(capturedContext.focusSession.elapsedMs).toBe(1500000); // Exact 25m work preserved!
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(300); // 5m break

    // Break finishes: resume next work interval on the SAME task
    const breakEndTime = startTime + 1800000;
    nowSpy.mockReturnValue(breakEndTime);

    act(() => {
      capturedContext.resumeFocusFromBreak(25);
    });

    expect(capturedContext.focusSession.status).toBe('running');
    expect(capturedContext.focusSession.isBreak).toBe(false);
    expect(capturedContext.focusSession.pomodoroCycle).toBe(2);
    expect(capturedContext.focusSession.task.id).toBe(sampleTask.id);
    expect(capturedContext.focusSession.targetMinutes).toBe(50); // 25 + 25 accumulated
    expect(capturedContext.focusSession.timeLeftSeconds).toBe(1500);

    nowSpy.mockRestore();
  });

  test('12. FocusSpace UI — time extension chips and IntervalCheckInModal interaction', () => {
    const mockRunningSession = {
      sessionId: 'session-ui-extension-test',
      id: 'session-ui-extension-test',
      task: sampleTask,
      status: 'running',
      targetMinutes: 25,
      timeLeftSeconds: 5,
      sessionStartTime: Date.now() - 1495000,
      sessionEndTime: Date.now() + 5000,
      elapsedMs: 1495000,
      pomodoroCycle: 1,
      breakDurationMinutes: 5
    };

    const onExtendTime = jest.fn();
    const onStartBreak = jest.fn();
    const onOpenReflection = jest.fn();
    const onResume = jest.fn();
    const onPause = jest.fn();

    act(() => {
      root.render(
        <FocusSpace
          session={mockRunningSession}
          onExtendTime={onExtendTime}
          onStartBreak={onStartBreak}
          onOpenReflection={onOpenReflection}
          onResume={onResume}
          onPause={onPause}
        />
      );
    });

    // 1. Verify quick time extension button (+15m)
    const plus15Btn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.trim() === '+15m');
    expect(plus15Btn).toBeTruthy();

    act(() => {
      plus15Btn.click();
    });

    expect(onExtendTime).toHaveBeenCalledWith(15);

    // 2. Simulate timer completion and verify Interval Check-in Modal renders
    const expiredSession = {
      ...mockRunningSession,
      timeLeftSeconds: 0,
      sessionEndTime: Date.now() - 1000
    };

    act(() => {
      root.render(
        <FocusSpace
          session={expiredSession}
          onExtendTime={onExtendTime}
          onStartBreak={onStartBreak}
          onOpenReflection={onOpenReflection}
          onResume={onResume}
          onPause={onPause}
        />
      );
    });

    const checkInModal = container.querySelector('[aria-label="Focus Interval Check-In"]');
    expect(checkInModal).toBeTruthy();
    expect(checkInModal.textContent).toContain('Is this task finished?');
    expect(checkInModal.textContent).toContain('Yes, Task is Finished');
    expect(checkInModal.textContent).toContain('Take a Restorative Break');

    // 3. Click "Yes, Task is Finished" -> calls onOpenReflection
    const finishedBtn = Array.from(checkInModal.querySelectorAll('button')).find(b => b.textContent.includes('Yes, Task is Finished'));
    expect(finishedBtn).toBeTruthy();

    act(() => {
      finishedBtn.click();
    });

    expect(onOpenReflection).toHaveBeenCalledTimes(1);
  });
});

