import React, { useContext, act } from 'react';
import { createRoot } from 'react-dom/client';
import { safeStorageSet, safeStorageGet } from '../utils/storage';
import { RoadmapProvider, RoadmapContext } from '../context/RoadmapContext';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P1.1 — Part 14: Real Learner Time, Session, Streak, and Metric Workflow', () => {
  let container = null;
  let root = null;
  let ctx = null;

  const TestConsumer = () => {
    ctx = useContext(RoadmapContext);
    return <div id="test-root">Learner Tracker Mounted</div>;
  };

  const initialRoadmap = [
    {
      id: 'subj-embedded',
      name: 'Embedded Systems',
      phases: [
        {
          id: 'phase-timers',
          name: 'Hardware Timers',
          tasks: [
            {
              id: 'task-pwm',
              name: 'Configure PWM Prescaler',
              completed: false,
              subtasks: [
                { id: 'st-prescaler', name: 'Set timer register division ratio', completed: false },
                { id: 'st-duty', name: 'Calculate 50% duty cycle register value', completed: false }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    safeStorageSet('roadmap', initialRoadmap);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    ctx = null;
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

  test('executes full learner lifecycle: task complete -> focus session -> stats -> reload -> undo', () => {
    // Mount the real application provider
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(ctx).not.toBeNull();
    const today = getLocalDateKey();

    // Initial state: 0 streak, 0 sessions, 0 completed tasks
    expect(ctx.calculateStreak()).toBe(0);
    const initialStats = ctx.getStats();
    expect(initialStats.completedTasks).toBe(0);
    expect(initialStats.totalFocusMinutes).toBe(0);

    // Step 1: Complete one learning subtask
    act(() => {
      ctx.toggleSubtaskComplete('subj-embedded', 'phase-timers', 'task-pwm', 'st-prescaler');
    });

    const afterSubtaskStats = ctx.getStats();
    expect(afterSubtaskStats.completedSubtasks).toBe(1);
    expect(ctx.taskCompletions.length).toBe(1);
    expect(ctx.taskCompletions[0].subtaskId).toBe('st-prescaler');
    expect(ctx.taskCompletions[0].date).toBe(today);

    // Step 2: Start and complete a focus session
    const taskObj = {
      id: 'st-duty',
      name: 'Calculate 50% duty cycle register value',
      taskId: 'task-pwm',
      subtaskId: 'st-duty',
      subjectId: 'subj-embedded',
      phaseId: 'phase-timers'
    };

    act(() => {
      ctx.startFocusSession(taskObj, 30);
    });

    expect(ctx.focusSession).not.toBeNull();
    expect(ctx.focusSession.status).toBe('ready');
    expect(ctx.focusSession.targetMinutes).toBe(30);

    act(() => {
      ctx.beginFocusRunning();
    });

    expect(ctx.focusSession.status).toBe('running');
    expect(ctx.focusSession.initialStartTime).toBeDefined();

    // Commit focus session with reflection notes
    act(() => {
      ctx.commitFocusSession({
        durationMinutes: 30,
        notes: 'Calculated ARR and CCR1 registers accurately',
        difficulty: 'medium'
      });
    });

    // Step 3 & 4: Inspect Statistics & Streak
    expect(ctx.focusSession).toBeNull();
    expect(ctx.sessions.length).toBe(1);
    const recordedSession = ctx.sessions[0];
    expect(recordedSession.durationMinutes).toBe(30);
    expect(recordedSession.date).toBe(today);
    expect(recordedSession.startedAt).toBeDefined();
    expect(recordedSession.endedAt).toBeDefined();

    // Streak should now be 1 because learner studied today
    expect(ctx.calculateStreak()).toBe(1);

    const stats = ctx.getStats();
    expect(stats.totalFocusMinutes).toBe(30);
    expect(stats.totalFocusSessions).toBe(1);
    expect(stats.dailyGoalStats.completedMinutes).toBe(30);

    // Step 5: Reload resilience simulation (unmount and re-mount provider with persisted localStorage)
    act(() => {
      root.unmount();
    });

    // Re-mount fresh root to simulate full page refresh
    const newContainer = document.createElement('div');
    document.body.appendChild(newContainer);
    const newRoot = createRoot(newContainer);
    let reloadedCtx = null;

    const ReloadConsumer = () => {
      reloadedCtx = useContext(RoadmapContext);
      return <div id="reloaded">Reloaded</div>;
    };

    act(() => {
      newRoot.render(
        <RoadmapProvider>
          <ReloadConsumer />
        </RoadmapProvider>
      );
    });

    // Verify reloaded state matches exactly without drift or duplicate records
    expect(reloadedCtx.sessions.length).toBe(1);
    expect(reloadedCtx.sessions[0].durationMinutes).toBe(30);
    expect(reloadedCtx.calculateStreak()).toBe(1);
    const reloadedStats = reloadedCtx.getStats();
    expect(reloadedStats.totalFocusMinutes).toBe(30);
    expect(reloadedStats.totalFocusSessions).toBe(1);
    expect(reloadedCtx.taskCompletions.length).toBe(2); // st-prescaler + st-duty from focus session

    // Step 6: Test undoing/uncompleting a task and verify derived values update cleanly
    act(() => {
      reloadedCtx.toggleSubtaskComplete('subj-embedded', 'phase-timers', 'task-pwm', 'st-prescaler');
    });

    // Completion count decreases by 1
    expect(reloadedCtx.taskCompletions.length).toBe(1);
    expect(reloadedCtx.getStats().completedSubtasks).toBe(1);

    // Cleanup
    act(() => {
      newRoot.unmount();
    });
    if (newContainer.parentNode) {
      newContainer.parentNode.removeChild(newContainer);
    }
  });

  test('deterministic date crossing: verifies consecutive streak and gap reset', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    const today = getLocalDateKey();
    const yesterday = addDaysToDateKey(today, -1);
    const twoDaysAgo = addDaysToDateKey(today, -2);

    // Add session for yesterday
    act(() => {
      ctx.addFocusSession({
        date: yesterday,
        durationMinutes: 45
      });
    });

    // Today not yet studied: streak is 1 (preserved from yesterday)
    expect(ctx.calculateStreak()).toBe(1);

    // Add session for today
    act(() => {
      ctx.addFocusSession({
        date: today,
        durationMinutes: 30
      });
    });

    // Consecutive 2 days: streak becomes 2
    expect(ctx.calculateStreak()).toBe(2);

    // Test with simulated future gap: if 2 days pass without studying, streak drops to 0
    const threeDaysLater = addDaysToDateKey(today, 2);
    expect(ctx.calculateStreak(ctx.sessions, threeDaysLater)).toBe(0);
  });
});
