import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { safeStorageSet } from '../utils/storage';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import {
  normalizeRoadmap,
  isTaskCompleted,
  isPhaseCompleted,
  isSubjectCompleted,
  getTaskProgress,
  getPhaseProgress,
  getSubjectProgress,
  getTaskProgressDetails,
  getPhaseProgressDetails,
  getSubjectProgressDetails,
  calculateOverallRoadmapStats,
  ROADMAP_STATES
} from '../utils/roadmapProgressResolver';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P1.2 Canonical Roadmap, Completion, Progress, and Learning-Plan Integrity', () => {
  let container;
  let root;
  let capturedContext;

  const TestConsumer = () => {
    capturedContext = useRoadmap();
    return <div data-testid="test-consumer">Ready</div>;
  };

  beforeEach(() => {
    localStorage.clear();
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
    localStorage.clear();
  });

  // ============================================================
  // 1. CANONICAL ROADMAP MODEL & NORMALIZATION IDEMPOTENCY
  // ============================================================
  test('normalizeRoadmap idempotently assigns deterministic IDs without mutating existing IDs', () => {
    const rawData = [
      {
        name: 'Embedded Systems',
        phases: [
          {
            name: 'Foundations',
            tasks: [
              {
                name: 'Ohm Law',
                subtasks: [
                  'Measure voltage',
                  { name: 'Calculate resistance' }
                ]
              },
              {
                id: 'custom-task-atomic',
                name: 'Read Datasheet'
              }
            ]
          }
        ]
      }
    ];

    const pass1 = normalizeRoadmap(rawData);
    expect(pass1).toHaveLength(1);
    expect(pass1[0].id).toBe('subj-1');
    expect(pass1[0].phases[0].id).toBe('subj-1-phase-1');
    expect(pass1[0].phases[0].tasks[0].id).toBe('subj-1-phase-1-task-1');
    expect(pass1[0].phases[0].tasks[0].subtasks[0].id).toBe('subj-1-phase-1-task-1-sub-1');
    expect(pass1[0].phases[0].tasks[0].subtasks[1].id).toBe('subj-1-phase-1-task-1-sub-2');
    expect(pass1[0].phases[0].tasks[1].id).toBe('custom-task-atomic'); // preserves existing ID

    // Running second time (idempotency check)
    const pass2 = normalizeRoadmap(pass1);
    expect(pass2).toEqual(pass1);
  });

  // ============================================================
  // 2. ATOMIC TASKS VS SUBTASK TASKS INVARIANTS & CASING
  // ============================================================
  test('atomic task completion, idempotency, and undo', () => {
    const controlledRoadmap = [
      {
        id: 'subj-1',
        name: 'Embedded',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              {
                id: 'atomic-task-1',
                name: 'Datasheet Review',
                subtasks: [],
                completed: false
              }
            ]
          }
        ]
      }
    ];

    safeStorageSet('roadmap', controlledRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    const task = capturedContext.subjects[0].phases[0].tasks[0];
    expect(capturedContext.isTaskCompleted(task)).toBe(false);

    // Complete atomic task
    act(() => {
      capturedContext.toggleTaskCompletion('subj-1', 'phase-1', 'atomic-task-1');
    });

    const completedTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(capturedContext.isTaskCompleted(completedTask)).toBe(true);
    expect(capturedContext.taskCompletions).toHaveLength(1);
    expect(capturedContext.taskCompletions[0].taskId).toBe('atomic-task-1');

    // Undo atomic task
    act(() => {
      capturedContext.undoLastAction();
    });

    const undoneTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(capturedContext.isTaskCompleted(undoneTask)).toBe(false);
    expect(capturedContext.taskCompletions).toHaveLength(0);
  });

  test('subtask completion cascade: parent complete iff all subtasks complete, reverts on undo', () => {
    const controlledRoadmap = [
      {
        id: 'subj-1',
        name: 'Hardware',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              {
                id: 'task-1',
                name: 'RC Circuit',
                subtasks: [
                  { id: 'st-1', name: 'Charge curve', completed: false },
                  { id: 'st-2', name: 'Time constant', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    safeStorageSet('roadmap', controlledRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    let currentTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(capturedContext.isTaskCompleted(currentTask)).toBe(false);
    expect(getTaskProgress(currentTask)).toBe(0);

    // Complete subtask 1 (1/2)
    act(() => {
      capturedContext.toggleSubtask('subj-1', 'phase-1', 'task-1', 'st-1');
    });

    currentTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(currentTask.subtasks[0].completed).toBe(true);
    expect(currentTask.subtasks[1].completed).toBe(false);
    expect(capturedContext.isTaskCompleted(currentTask)).toBe(false);
    expect(getTaskProgress(currentTask)).toBe(50);

    // Complete subtask 2 (2/2) -> Parent completes!
    act(() => {
      capturedContext.toggleSubtask('subj-1', 'phase-1', 'task-1', 'st-2');
    });

    currentTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(currentTask.subtasks[0].completed).toBe(true);
    expect(currentTask.subtasks[1].completed).toBe(true);
    expect(capturedContext.isTaskCompleted(currentTask)).toBe(true);
    expect(getTaskProgress(currentTask)).toBe(100);

    // Undo subtask 2 -> Parent reverts to incomplete!
    act(() => {
      capturedContext.undoLastAction();
    });

    currentTask = capturedContext.subjects[0].phases[0].tasks[0];
    expect(currentTask.subtasks[0].completed).toBe(true);
    expect(currentTask.subtasks[1].completed).toBe(false);
    expect(capturedContext.isTaskCompleted(currentTask)).toBe(false);
    expect(getTaskProgress(currentTask)).toBe(50);
  });

  // ============================================================
  // 3. PHASE AND SUBJECT INVARIANTS
  // ============================================================
  test('phase complete iff all tasks complete, subject complete iff all phases complete', () => {
    const controlledRoadmap = [
      {
        id: 'subj-1',
        name: 'Hardware',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              { id: 't-1', name: 'Task 1', subtasks: [], completed: false },
              { id: 't-2', name: 'Task 2', subtasks: [], completed: false }
            ]
          }
        ]
      }
    ];

    safeStorageSet('roadmap', controlledRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    let currentPhase = capturedContext.subjects[0].phases[0];
    let currentSubject = capturedContext.subjects[0];
    expect(capturedContext.isPhaseCompleted(currentPhase)).toBe(false);
    expect(capturedContext.isSubjectCompleted(currentSubject)).toBe(false);
    expect(capturedContext.getPhaseProgress(currentPhase)).toBe(0);

    // Complete 1 of 2 tasks
    act(() => {
      capturedContext.toggleTaskCompletion('subj-1', 'phase-1', 't-1');
    });

    currentPhase = capturedContext.subjects[0].phases[0];
    currentSubject = capturedContext.subjects[0];
    expect(capturedContext.isPhaseCompleted(currentPhase)).toBe(false);
    expect(capturedContext.isSubjectCompleted(currentSubject)).toBe(false);
    expect(capturedContext.getPhaseProgress(currentPhase)).toBe(50);

    // Complete second task (2/2) -> Phase and Subject complete!
    act(() => {
      capturedContext.toggleTaskCompletion('subj-1', 'phase-1', 't-2');
    });

    currentPhase = capturedContext.subjects[0].phases[0];
    currentSubject = capturedContext.subjects[0];
    expect(capturedContext.isPhaseCompleted(currentPhase)).toBe(true);
    expect(capturedContext.isSubjectCompleted(currentSubject)).toBe(true);
    expect(capturedContext.getPhaseProgress(currentPhase)).toBe(100);
    expect(capturedContext.getSubjectProgress(currentSubject)).toBe(100);
  });

  // ============================================================
  // 4. EMPTY / PARTIAL / COMPLETE STATES
  // ============================================================
  test('empty states do not manufacture progress or NaN', () => {
    // 0/0 empty phase
    const emptyPhase = { id: 'empty-p', name: 'Empty Phase', tasks: [] };
    const pDetails = getPhaseProgressDetails(emptyPhase);
    expect(pDetails.percent).toBe(0);
    expect(pDetails.state).toBe(ROADMAP_STATES.NO_REQUIRED_WORK);
    expect(isPhaseCompleted(emptyPhase)).toBe(false);

    // 0/0 empty subject
    const emptySubject = { id: 'empty-s', name: 'Empty Subject', phases: [] };
    const sDetails = getSubjectProgressDetails(emptySubject);
    expect(sDetails.percent).toBe(0);
    expect(sDetails.state).toBe(ROADMAP_STATES.NO_REQUIRED_WORK);
    expect(isSubjectCompleted(emptySubject)).toBe(false);

    // Partial states
    const partialTask = {
      id: 't-part',
      name: 'Partial',
      subtasks: [
        { id: 's1', completed: true },
        { id: 's2', completed: false }
      ]
    };
    const tDetails = getTaskProgressDetails(partialTask);
    expect(tDetails.percent).toBe(50);
    expect(tDetails.state).toBe(ROADMAP_STATES.IN_PROGRESS);
  });

  // ============================================================
  // 5. OVERALL PROGRESS DERIVATION WITH MIXED ROADMAPS
  // ============================================================
  test('overall progress does not ignore atomic tasks when subtasks exist', () => {
    const mixedRoadmap = [
      {
        id: 'subj-1',
        phases: [
          {
            id: 'p-1',
            tasks: [
              {
                id: 't-with-subtasks',
                name: 'Task with 2 subtasks',
                subtasks: [
                  { id: 'st-1', completed: false },
                  { id: 'st-2', completed: false }
                ]
              },
              {
                id: 't-atomic',
                name: 'Atomic Task',
                subtasks: [],
                completed: true // 1 atomic task completed
              }
            ]
          }
        ]
      }
    ];

    const stats = calculateOverallRoadmapStats(mixedRoadmap);
    // 2 subtasks + 1 atomic task = 3 leaf work units
    // 1 completed (the atomic task) -> 1/3 = 33%
    expect(stats.totalWorkUnits).toBe(3);
    expect(stats.completedWorkUnits).toBe(1);
    expect(stats.completionRate).toBe(33);
    expect(stats.completedTasks).toBe(1);
    expect(stats.totalTasks).toBe(2);
  });

  // ============================================================
  // 6. LEARNING PLAN SYNCHRONIZATION AND UNDO RESTORATION
  // ============================================================
  test('completing a roadmap subtask removes it from learningPlan and undo restores it', () => {
    const controlledRoadmap = [
      {
        id: 'subj-1',
        name: 'Hardware',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              {
                id: 'task-1',
                name: 'Transistor',
                subtasks: [
                  { id: 'st-gate', name: 'Gate threshold', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    const planEntry = {
      id: 'plan-gate-101',
      subjectId: 'subj-1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      subtaskId: 'st-gate',
      scheduledDate: '2026-10-07'
    };

    safeStorageSet('roadmap', controlledRoadmap);
    safeStorageSet('learningPlan', [planEntry]);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext.learningPlan).toHaveLength(1);
    expect(capturedContext.learningPlan[0].id).toBe('plan-gate-101');

    // Complete the subtask via toggleSubtask (from Roadmap page)
    act(() => {
      capturedContext.toggleSubtask('subj-1', 'phase-1', 'task-1', 'st-gate');
    });

    // Subtask is complete and removed from learning plan
    expect(capturedContext.subjects[0].phases[0].tasks[0].subtasks[0].completed).toBe(true);
    expect(capturedContext.learningPlan).toHaveLength(0);

    // Undo action restores it to learning plan!
    act(() => {
      capturedContext.undoLastAction();
    });

    expect(capturedContext.subjects[0].phases[0].tasks[0].subtasks[0].completed).toBe(false);
    expect(capturedContext.learningPlan).toHaveLength(1);
    expect(capturedContext.learningPlan[0].id).toBe('plan-gate-101');
  });

  test('completing an atomic roadmap task synchronizes learningPlan and restores on undo', () => {
    const controlledRoadmap = [
      {
        id: 'subj-1',
        name: 'Software',
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            tasks: [
              {
                id: 'task-atomic-read',
                name: 'Read RFC',
                subtasks: [],
                completed: false
              }
            ]
          }
        ]
      }
    ];

    const planEntry = {
      id: 'plan-rfc-202',
      subjectId: 'subj-1',
      phaseId: 'phase-1',
      taskId: 'task-atomic-read',
      subtaskId: null,
      scheduledDate: '2026-10-07'
    };

    safeStorageSet('roadmap', controlledRoadmap);
    safeStorageSet('learningPlan', [planEntry]);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext.learningPlan).toHaveLength(1);

    // Complete atomic task
    act(() => {
      capturedContext.toggleTaskCompletion('subj-1', 'phase-1', 'task-atomic-read');
    });

    expect(capturedContext.isTaskCompleted(capturedContext.subjects[0].phases[0].tasks[0])).toBe(true);
    expect(capturedContext.learningPlan).toHaveLength(0);

    // Undo restores plan entry
    act(() => {
      capturedContext.undoLastAction();
    });

    expect(capturedContext.isTaskCompleted(capturedContext.subjects[0].phases[0].tasks[0])).toBe(false);
    expect(capturedContext.learningPlan).toHaveLength(1);
    expect(capturedContext.learningPlan[0].id).toBe('plan-rfc-202');
  });

  // ============================================================
  // 7. PERSISTENCE ACROSS RELOAD
  // ============================================================
  test('persisted roadmap and completions reload with exact invariant and progress', () => {
    const controlledRoadmap = [
      {
        id: 'subj-embedded',
        name: 'Embedded Systems',
        phases: [
          {
            id: 'phase-pwm',
            name: 'Timers and PWM',
            tasks: [
              {
                id: 'task-pwm-config',
                name: 'PWM Configuration',
                subtasks: [
                  { id: 'sub-prescaler', name: 'Configure Prescaler', completed: true, completedAt: '2026-10-07T10:00:00Z' },
                  { id: 'sub-duty', name: 'Set Duty Cycle', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    safeStorageSet('roadmap', controlledRoadmap);
    safeStorageSet('learningTracker_taskCompletions', [
      {
        id: 'comp-1',
        subjectId: 'subj-embedded',
        phaseId: 'phase-pwm',
        taskId: 'task-pwm-config',
        subtaskId: 'sub-prescaler',
        completedAt: '2026-10-07T10:00:00Z',
        date: '2026-10-07'
      }
    ]);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    const stats = capturedContext.getStats();
    expect(stats.completedSubtasks).toBe(1);
    expect(stats.totalSubtasks).toBe(2);
    expect(stats.completionRate).toBe(50);
    expect(stats.completedTasks).toBe(0);
    expect(capturedContext.isTaskCompleted(capturedContext.subjects[0].phases[0].tasks[0])).toBe(false);
  });
});
