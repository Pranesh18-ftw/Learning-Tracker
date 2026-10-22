import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { safeStorageSet } from '../utils/storage';
import { resolveAdaptiveState } from '../adaptive';
import { buildArchiveArtifacts } from '../utils/archiveEvidenceResolver';
import { resolveDevelopmentSummary } from '../utils/growthEvidenceResolver';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock audio to avoid jsdom failures
window.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockRejectedValue(new Error('Audio playback blocked'))
}));

describe('P1.4 — Event, Achievement, Derived-State, and Side-Effect Integrity', () => {
  let container;
  let root;
  let capturedContext = null;

  const TestConsumer = () => {
    capturedContext = useRoadmap();
    return <div data-testid="test-consumer">Ready</div>;
  };

  const sampleRoadmap = [
    {
      id: 'subj-circuits',
      name: 'Circuits & Signals',
      phases: [
        {
          id: 'phase-analog',
          name: 'Analog Foundations',
          tasks: [
            {
              id: 'task-atomic-rc',
              name: 'RC Filter Analysis',
              completed: false,
              subtasks: []
            },
            {
              id: 'task-parent-opamp',
              name: 'Op-Amp Circuits',
              completed: false,
              subtasks: [
                { id: 'st-inverting', name: 'Inverting Configuration', completed: false },
                { id: 'st-noninverting', name: 'Non-Inverting Configuration', completed: false }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    capturedContext = null;
    jest.clearAllMocks();
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
    window.localStorage.clear();
  });

  test('1. Action Once → One Semantic Event & One Canonical Completion Record', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext.taskCompletions).toEqual([]);

    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    expect(capturedContext.taskCompletions.length).toBe(1);
    expect(capturedContext.taskCompletions[0].taskId).toBe('task-atomic-rc');
    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(true);
  });

  test('2. Duplicate Action When Already Complete → Idempotent, No Duplicate Record', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    expect(capturedContext.taskCompletions.length).toBe(1);

    // Call completeTask again on already-completed task
    let secondResult = null;
    act(() => {
      secondResult = capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    // Idempotent return is null; no duplicate record appended
    expect(secondResult).toBeNull();
    expect(capturedContext.taskCompletions.length).toBe(1);
    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(true);
  });

  test('3. Rehydration on Boot → Does NOT Trigger False Achievement Unlock Notification', () => {
    // Pre-populate completed sessions and tasks in storage
    const pastCompletions = [
      { id: 'c-1', taskId: 'task-atomic-rc', completedAt: '2026-10-06T10:00:00Z' }
    ];
    const pastSessions = [
      { id: 's-1', durationMinutes: 25, date: '2026-10-06' }
    ];

    safeStorageSet('roadmap', sampleRoadmap);
    safeStorageSet('learningTracker_taskCompletions', pastCompletions);
    safeStorageSet('sessions', pastSessions);
    // Explicitly simulate missing achievements key in storage
    window.localStorage.removeItem('learningTracker_achievements');

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Initial mount silently synchronizes unlockedAchievements without pop-up
    expect(capturedContext.newlyUnlocked).toBeNull();
    expect(capturedContext.unlockedAchievements).toContain('first-task');
    expect(capturedContext.unlockedAchievements).toContain('first-session');
  });

  test('4. Live User Action That Unlocks Achievement → Triggers NewlyUnlocked Once', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext.newlyUnlocked).toBeNull();

    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    // The first task completion during an active session triggers the unlock notification
    expect(capturedContext.newlyUnlocked).not.toBeNull();
    const active = Array.isArray(capturedContext.newlyUnlocked)
      ? capturedContext.newlyUnlocked[0]
      : capturedContext.newlyUnlocked;
    expect(active.id).toBe('first-task');

    // Dismiss notification
    act(() => {
      capturedContext.clearAchievementNotification(active.id);
    });

    expect(capturedContext.newlyUnlocked).toBeNull();
  });

  test('5. Focus Session Commit on Completed Task → Does NOT Uncomplete Task (Idempotency)', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Complete task first
    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(true);

    // Start a focus session on this same task
    act(() => {
      capturedContext.startFocusSession(
        {
          id: 'task-atomic-rc',
          taskId: 'task-atomic-rc',
          subjectId: 'subj-circuits',
          phaseId: 'phase-analog'
        },
        25
      );
    });

    // Commit focus session with reflection
    act(() => {
      capturedContext.commitFocusSession({
        durationMinutes: 25,
        notes: 'Reviewing RC filter resonance frequency'
      });
    });

    // The task must REMAIN completed, NOT toggled to incomplete
    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(true);
    expect(capturedContext.sessions.length).toBe(1);
  });

  test('6. Undo Last Action → Cleanly Reverts Task and Session Bound by Focus Commit', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    act(() => {
      capturedContext.startFocusSession(
        {
          id: 'task-atomic-rc',
          taskId: 'task-atomic-rc',
          subjectId: 'subj-circuits',
          phaseId: 'phase-analog'
        },
        30
      );
    });

    act(() => {
      capturedContext.commitFocusSession({
        durationMinutes: 30,
        notes: 'Calculated cutoff frequency'
      });
    });

    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(true);
    expect(capturedContext.sessions.length).toBe(1);
    expect(capturedContext.taskCompletions.length).toBe(1);

    // Single undo reverts both the completion and the session created during the commit
    act(() => {
      capturedContext.undoLastAction();
    });

    expect(capturedContext.isTaskCompleted({ id: 'task-atomic-rc' })).toBe(false);
    expect(capturedContext.sessions.length).toBe(0);
    expect(capturedContext.taskCompletions.length).toBe(0);
  });

  test('7. Pure Derivation: Statistics, Archive, and Growth do NOT Mutate on View', () => {
    const completions = [
      { id: 'c-1', taskId: 'task-atomic-rc', completedAt: '2026-10-06T10:00:00Z', notes: 'Measured with scope' }
    ];
    const sessions = [
      { id: 's-1', durationMinutes: 45, date: '2026-10-06' }
    ];

    // Read initial local storage keys
    const initialKeys = Object.keys(window.localStorage);

    // Call Archive Resolver
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions,
      taskCompletions: completions
    });
    expect(Array.isArray(artifacts)).toBe(true);

    // Call Growth Resolver
    const summary = resolveDevelopmentSummary(sessions, completions, sampleRoadmap, 'all');
    expect(summary).toBeDefined();

    // Call Adaptive State Resolver purely
    const adaptive = resolveAdaptiveState({
      sessions,
      subjects: sampleRoadmap,
      persist: false
    });
    expect(adaptive).toBeDefined();

    // Verification: Zero additional storage keys were written simply by calculating views
    const postKeys = Object.keys(window.localStorage);
    expect(postKeys.length).toBe(initialKeys.length);
  });

  test('8. Multi-Entry-Point Completion Consistency: Dashboard & LearningPlan use Canonical Mutation', () => {
    safeStorageSet('roadmap', sampleRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Direct invocation via context completeTask
    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc',
        durationMinutes: 15,
        notes: 'Consistent completion note'
      });
    });

    expect(capturedContext.taskCompletions.length).toBe(1);
    expect(capturedContext.taskCompletions[0].durationMinutes).toBe(15);
    expect(capturedContext.taskCompletions[0].notes).toBe('Consistent completion note');

    // Calling it again from another simulated surface (e.g. Dashboard) is safely idempotent
    act(() => {
      capturedContext.completeTask({
        subjectId: 'subj-circuits',
        phaseId: 'phase-analog',
        taskId: 'task-atomic-rc'
      });
    });

    expect(capturedContext.taskCompletions.length).toBe(1);
  });
});
