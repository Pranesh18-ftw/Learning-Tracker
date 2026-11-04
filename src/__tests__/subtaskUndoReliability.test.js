import React, { useContext, act } from 'react';
import { createRoot } from 'react-dom/client';
import { safeStorageSet } from '../utils/storage';
import { RoadmapProvider, RoadmapContext } from '../context/RoadmapContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Subtask & Undo Reliability Suite', () => {
  let container = null;
  let root = null;
  let capturedContext = null;

  const TestConsumer = () => {
    capturedContext = useContext(RoadmapContext);
    return <div>Test</div>;
  };

  const initialRoadmap = [
    {
      id: 'subj-1',
      name: 'Electronics',
      phases: [
        {
          id: 'phase-1',
          name: 'Circuits',
          tasks: [
            {
              id: 'task-1',
              name: 'Capacitor Fundamentals',
              completed: false,
              subtasks: [
                { id: 'st-1', name: 'Charge dynamics', completed: false },
                { id: 'st-2', name: 'Discharge curve', completed: false }
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

  test('getNextSubtask includes subtaskId property', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(capturedContext).not.toBeNull();
    const next = capturedContext.getNextSubtask();
    expect(next).not.toBeNull();
    expect(next.id).toBe('st-1');
    expect(next.subtaskId).toBe('st-1');
    expect(next.name).toBe('Charge dynamics');
    expect(next.taskId).toBe('task-1');
  });

  test('completing a subtask and calling undoLastAction restores subtask and roadmap state cleanly', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    let completion = null;
    act(() => {
      completion = capturedContext.completeSubtask({
        subjectId: 'subj-1',
        phaseId: 'phase-1',
        taskId: 'task-1',
        subtaskId: 'st-1',
        durationMinutes: 25,
        notes: 'Verified capacitor charge curve.'
      });
    });

    expect(completion).not.toBeNull();
    expect(capturedContext.taskCompletions).toHaveLength(1);

    // Storing complete action as DashboardTasks does
    act(() => {
      capturedContext.storeCompleteAction('st-1', null, completion.id, {
        subjectId: 'subj-1',
        phaseId: 'phase-1',
        taskId: 'task-1',
        subtaskId: 'st-1',
        taskDetails: {
          id: 'st-1',
          subtaskId: 'st-1',
          name: 'Charge dynamics',
          taskId: 'task-1'
        }
      });
    });

    expect(capturedContext.lastAction).not.toBeNull();
    expect(capturedContext.lastAction.subtaskId).toBe('st-1');

    // Verify subtask is completed in roadmap
    const subjectAfter = capturedContext.subjects.find(s => s.id === 'subj-1');
    const subtaskAfter = subjectAfter.phases[0].tasks[0].subtasks[0];
    expect(subtaskAfter.completed).toBe(true);

    // Now Undo
    act(() => {
      capturedContext.undoLastAction();
    });

    // Verify subtask is reverted
    const subjectRestored = capturedContext.subjects.find(s => s.id === 'subj-1');
    const subtaskRestored = subjectRestored.phases[0].tasks[0].subtasks[0];
    expect(subtaskRestored.completed).toBe(false);
    expect(subtaskRestored.completedAt).toBeNull();
    expect(subjectRestored.phases[0].tasks[0].completed).toBe(false);

    // Verify completion event removed
    expect(capturedContext.taskCompletions).toHaveLength(0);
    // Verify lastAction cleared
    expect(capturedContext.lastAction).toBeNull();

    // Verify getNextSubtask points back to this subtask
    const nextSubtask = capturedContext.getNextSubtask();
    expect(nextSubtask.subtaskId).toBe('st-1');
  });

  test('unchecking subtask with toggleSubtask removes completion from taskCompletions', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Check / complete
    act(() => {
      capturedContext.toggleSubtask('subj-1', 'phase-1', 'task-1', 'st-1');
    });

    expect(capturedContext.taskCompletions).toHaveLength(1);

    // Uncheck / reopen
    act(() => {
      capturedContext.toggleSubtask('subj-1', 'phase-1', 'task-1', 'st-1');
    });

    expect(capturedContext.taskCompletions).toHaveLength(0);
    const subtask = capturedContext.subjects[0].phases[0].tasks[0].subtasks[0];
    expect(subtask.completed).toBe(false);
  });

  test('undoing scheduled subtask restores learning plan entry', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    const planEntry = {
      id: 'plan-101',
      subjectId: 'subj-1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      subtaskId: 'st-2',
      scheduledDate: '2026-10-02'
    };

    act(() => {
      capturedContext.setLearningPlan([planEntry]);
    });

    // Complete subtask
    let completion = null;
    act(() => {
      completion = capturedContext.completeSubtask({
        subjectId: 'subj-1',
        phaseId: 'phase-1',
        taskId: 'task-1',
        subtaskId: 'st-2'
      });
      capturedContext.storeCompleteAction('st-2', null, completion.id, {
        subjectId: 'subj-1',
        phaseId: 'phase-1',
        taskId: 'task-1',
        subtaskId: 'st-2',
        learningPlanEntry: planEntry
      });
      capturedContext.setLearningPlan([]);
    });

    expect(capturedContext.learningPlan).toHaveLength(0);

    // Undo
    act(() => {
      capturedContext.undoLastAction();
    });

    // Verify learning plan entry is restored
    expect(capturedContext.learningPlan).toHaveLength(1);
    expect(capturedContext.learningPlan[0].id).toBe('plan-101');
  });
});
