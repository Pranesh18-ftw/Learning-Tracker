import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { safeStorageSet, safeStorageGet } from '../utils/storage';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import {
  isTaskCompleted,
  isPhaseCompleted,
  isSubjectCompleted,
  getTaskProgress,
  getPhaseProgress,
  getSubjectProgress
} from '../utils/roadmapProgressResolver';
import { buildSubjectTopology } from '../utils/conceptRelationshipResolver';
import { buildWeeklyRouteStops, resolveDestination } from '../utils/pathRouteResolver';
import { resolveCapabilityMap } from '../utils/trajectoryResolver';
import { resolveDevelopmentSummary, buildDevelopmentTimeline } from '../utils/growthEvidenceResolver';
import { buildArchiveArtifacts } from '../utils/archiveEvidenceResolver';
import { generateRecommendations } from '../adaptive/recommendationEngine';
import { loadIdentity, saveIdentity, DEFAULT_IDENTITY } from '../utils/identityRealityResolver';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P1.6 Cross-Surface Integration and Canonical-Reality Audit', () => {
  let container;
  let root;
  let capturedContext;

  const TestConsumer = () => {
    capturedContext = useRoadmap();
    return <div data-testid="test-consumer">Ready</div>;
  };

  const GOLDEN_SUBJECT_ID = 'subj-electronics';
  const GOLDEN_PHASE_ID = 'phase-analog-fundamentals';
  const GOLDEN_TASK_ID = 'task-rc-charging';
  const SUBTASK_1_ID = 'sub-understand-tau';
  const SUBTASK_2_ID = 'sub-calculate-tau';
  const SUBTASK_3_ID = 'sub-predict-voltage';

  const createGoldenRoadmap = () => [
    {
      id: GOLDEN_SUBJECT_ID,
      name: 'Electronics',
      phases: [
        {
          id: GOLDEN_PHASE_ID,
          name: 'Analog Fundamentals',
          tasks: [
            {
              id: GOLDEN_TASK_ID,
              name: 'RC Charging',
              time: 25,
              completed: false,
              subtasks: [
                {
                  id: SUBTASK_1_ID,
                  name: 'Understand time constant',
                  completed: false,
                  completedAt: null
                },
                {
                  id: SUBTASK_2_ID,
                  name: 'Calculate tau',
                  completed: false,
                  completedAt: null
                },
                {
                  id: SUBTASK_3_ID,
                  name: 'Predict voltage at tau',
                  completed: false,
                  completedAt: null
                }
              ]
            }
          ]
        }
      ]
    }
  ];

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

  // Helper to mount with golden dataset
  const mountWithGoldenRoadmap = () => {
    const goldenRoadmap = createGoldenRoadmap();
    safeStorageSet('roadmap', goldenRoadmap);
    safeStorageSet('learningTracker_roadmap', goldenRoadmap);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });
  };

  // ============================================================
  // 1. CANONICAL ID STABILITY & SINGLE LEARNER REALITY
  // ============================================================
  test('entity identifiers remain identical across WORLD, PATH, NOW, FOCUS, PLAN, and TRAJECTORY', () => {
    mountWithGoldenRoadmap();

    const subject = capturedContext.subjects[0];
    const phase = subject.phases[0];
    const task = phase.tasks[0];
    const nextSubtask = capturedContext.getNextSubtask();

    // 1. NOW: nextSubtask holds canonical identifiers
    expect(nextSubtask.subjectId).toBe(GOLDEN_SUBJECT_ID);
    expect(nextSubtask.phaseId).toBe(GOLDEN_PHASE_ID);
    expect(nextSubtask.taskId).toBe(GOLDEN_TASK_ID);
    expect(nextSubtask.subtaskId).toBe(SUBTASK_1_ID);

    // 2. WORLD: topology preserves canonical node and subtask IDs
    const topology = buildSubjectTopology(subject, nextSubtask, capturedContext.isTaskCompleted);
    const conceptNode = topology.allConcepts.find(c => c.taskId === GOLDEN_TASK_ID);
    expect(conceptNode).toBeDefined();
    expect(conceptNode.id).toBe(GOLDEN_TASK_ID);
    expect(conceptNode.subjectId).toBe(GOLDEN_SUBJECT_ID);
    expect(conceptNode.phaseId).toBe(GOLDEN_PHASE_ID);
    expect(conceptNode.subtasks[0].id).toBe(SUBTASK_1_ID);

    // 3. PATH: weekly route stops preserve canonical IDs
    const weeklyStops = buildWeeklyRouteStops(subject, nextSubtask, [], 45, 'laptop', capturedContext.isTaskCompleted);
    expect(weeklyStops.length).toBeGreaterThan(0);
    const primaryStop = weeklyStops[0];
    expect(primaryStop.taskId).toBe(GOLDEN_TASK_ID);
    expect(primaryStop.phaseId).toBe(GOLDEN_PHASE_ID);
    expect(primaryStop.subjectId).toBe(GOLDEN_SUBJECT_ID);
    expect(primaryStop.targetSubtask.id).toBe(SUBTASK_1_ID);

    // 4. LEARNING PLAN: scheduling uses canonical IDs
    act(() => {
      capturedContext.scheduleSubtask(GOLDEN_SUBJECT_ID, GOLDEN_PHASE_ID, GOLDEN_TASK_ID, SUBTASK_1_ID, '2026-10-08');
    });
    expect(capturedContext.learningPlan.length).toBe(1);
    const planEntry = capturedContext.learningPlan[0];
    expect(planEntry.subjectId).toBe(GOLDEN_SUBJECT_ID);
    expect(planEntry.phaseId).toBe(GOLDEN_PHASE_ID);
    expect(planEntry.taskId).toBe(GOLDEN_TASK_ID);
    expect(planEntry.subtaskId).toBe(SUBTASK_1_ID);

    // 5. FOCUS: launch focus session with canonical entity
    act(() => {
      capturedContext.startFocusSession(nextSubtask, 25);
    });
    expect(capturedContext.focusSession).toBeDefined();
    expect(capturedContext.focusSession.task.subjectId).toBe(GOLDEN_SUBJECT_ID);
    expect(capturedContext.focusSession.task.phaseId).toBe(GOLDEN_PHASE_ID);
    expect(capturedContext.focusSession.task.taskId).toBe(GOLDEN_TASK_ID);
    expect(capturedContext.focusSession.task.subtaskId).toBe(SUBTASK_1_ID);
  });

  // ============================================================
  // 2. CONTROLLED GOLDEN LEARNER SEQUENTIAL PASS (STATE 0 -> 9)
  // ============================================================
  test('controlled golden learner maintains coherent canonical reality across states 0 through 9', () => {
    mountWithGoldenRoadmap();

    // ------------------------------------------------------------
    // STATE 0: Nothing complete
    // ------------------------------------------------------------
    let subject = capturedContext.subjects[0];
    let phase = subject.phases[0];
    let task = phase.tasks[0];

    expect(capturedContext.isTaskCompleted(task)).toBe(false);
    expect(capturedContext.isPhaseCompleted(phase)).toBe(false);
    expect(getTaskProgress(task)).toBe(0);

    let nextTask = capturedContext.getNextSubtask();
    expect(nextTask.subtaskId).toBe(SUBTASK_1_ID);

    let trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions);
    let rcCap = trajectory.clusters.flatMap(c => c.capabilities).find(cap => cap.id === 'cap-rc');
    expect(rcCap.statusKey).toBe('NOT_EXPLORED');
    expect(rcCap.evidence[0]).toMatch(/No demonstrated capability yet/i);

    let archiveArtifacts = buildArchiveArtifacts({
      roadmap: capturedContext.subjects,
      sessions: capturedContext.sessions,
      taskCompletions: capturedContext.taskCompletions
    });
    expect(archiveArtifacts.length).toBe(0);

    let growthSummary = resolveDevelopmentSummary(capturedContext.sessions, capturedContext.taskCompletions, capturedContext.subjects);
    expect(growthSummary.hasEnoughData).toBe(false);
    expect(growthSummary.totalSessionsCount).toBe(0);

    let stats = capturedContext.getStats();
    expect(stats.completedTasks).toBe(0);
    expect(stats.totalFocusMinutes).toBe(0);

    // ------------------------------------------------------------
    // STATE 1: Subtask 1 completed
    // ------------------------------------------------------------
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_1_ID,
        durationMinutes: 25,
        notes: 'Explored time constant tau = R*C'
      });
    });

    subject = capturedContext.subjects[0];
    phase = subject.phases[0];
    task = phase.tasks[0];

    expect(task.subtasks[0].completed).toBe(true);
    expect(task.subtasks[1].completed).toBe(false);
    expect(capturedContext.isTaskCompleted(task)).toBe(false); // Parent still incomplete (1/3)
    expect(getTaskProgress(task)).toBe(33);

    // NOW points to subtask 2
    nextTask = capturedContext.getNextSubtask();
    expect(nextTask.subtaskId).toBe(SUBTASK_2_ID);

    // TRAJECTORY updates to PRACTICED
    trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions);
    rcCap = trajectory.clusters.flatMap(c => c.capabilities).find(cap => cap.id === 'cap-rc');
    expect(rcCap.statusKey).toBe('PRACTICED');
    expect(rcCap.evidence[0]).toMatch(/Practiced 1 core task/i);

    // GROWTH records the subtask completion
    let growthTimeline = buildDevelopmentTimeline(capturedContext.sessions, capturedContext.taskCompletions, capturedContext.subjects);
    expect(growthTimeline.length).toBe(1);
    expect(growthTimeline[0].conceptName).toBe('Understand time constant');

    // ------------------------------------------------------------
    // STATE 2: Subtask 2 completed
    // ------------------------------------------------------------
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_2_ID,
        durationMinutes: 20,
        notes: 'Calculated tau for 10k resistor and 100uF capacitor'
      });
    });

    subject = capturedContext.subjects[0];
    task = subject.phases[0].tasks[0];
    expect(getTaskProgress(task)).toBe(67);
    expect(capturedContext.isTaskCompleted(task)).toBe(false);

    // NOW points to subtask 3
    nextTask = capturedContext.getNextSubtask();
    expect(nextTask.subtaskId).toBe(SUBTASK_3_ID);

    // ------------------------------------------------------------
    // STATE 3 & 4: Subtask 3 completed -> Parent task complete
    // ------------------------------------------------------------
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_3_ID,
        durationMinutes: 25,
        notes: 'Predicted 63.2% voltage asymptote at t = tau'
      });
    });

    subject = capturedContext.subjects[0];
    phase = subject.phases[0];
    task = phase.tasks[0];

    // Parent task automatically complete because all subtasks are complete
    expect(task.completed).toBe(true);
    expect(capturedContext.isTaskCompleted(task)).toBe(true);
    expect(capturedContext.isPhaseCompleted(phase)).toBe(true);
    expect(capturedContext.isSubjectCompleted(subject)).toBe(true);
    expect(getTaskProgress(task)).toBe(100);

    // NOW: All tasks complete in roadmap
    nextTask = capturedContext.getNextSubtask();
    expect(nextTask).toBeNull();

    // ------------------------------------------------------------
    // STATE 5 & 6: Focus session with unassisted recall (explainWithoutNotes = 'yes')
    // ------------------------------------------------------------
    act(() => {
      capturedContext.startFocusSession({
        id: SUBTASK_1_ID,
        subtaskId: SUBTASK_1_ID,
        name: 'Understand time constant',
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        time: 30
      }, 30);
    });

    act(() => {
      capturedContext.beginFocusRunning();
      capturedContext.openReflectionSession();
      capturedContext.commitFocusSession({
        notes: 'Derived differential equation and time constant from first principles without looking at notes',
        difficulty: 'hard',
        explainWithoutNotes: 'yes',
        durationMinutes: 30
      });
    });

    // Sessions record has unassisted recall verification
    expect(capturedContext.sessions.length).toBe(1);
    const session = capturedContext.sessions[0];
    expect(session.explainWithoutNotes).toBe('yes');
    expect(session.durationMinutes).toBe(30);

    // TRAJECTORY elevates capability to DEMONSTRATED because of verified recall!
    trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions);
    rcCap = trajectory.clusters.flatMap(c => c.capabilities).find(cap => cap.id === 'cap-rc');
    expect(rcCap.statusKey).toBe('DEMONSTRATED');
    expect(rcCap.evidence[0]).toMatch(/Demonstrated unassisted retrieval without reference notes/i);

    // ------------------------------------------------------------
    // STATE 7: Real evidence in Archive & Growth
    // ------------------------------------------------------------
    archiveArtifacts = buildArchiveArtifacts({
      roadmap: capturedContext.subjects,
      sessions: capturedContext.sessions,
      taskCompletions: capturedContext.taskCompletions
    });
    expect(archiveArtifacts.length).toBeGreaterThan(0);
    const recallArtifact = archiveArtifacts.find(a => a.type?.toLowerCase() === 'evidence');
    expect(recallArtifact).toBeDefined();

    growthSummary = resolveDevelopmentSummary(capturedContext.sessions, capturedContext.taskCompletions, capturedContext.subjects);
    expect(growthSummary.explainedWithoutNotesCount).toBe(1);

    // ------------------------------------------------------------
    // STATE 8: Undo one action (undoLastAction)
    // ------------------------------------------------------------
    act(() => {
      capturedContext.undoLastAction();
    });

    // Session removed
    expect(capturedContext.sessions.length).toBe(0);

    // TRAJECTORY rolls back from DEMONSTRATED to PRACTICED
    trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions);
    rcCap = trajectory.clusters.flatMap(c => c.capabilities).find(cap => cap.id === 'cap-rc');
    expect(rcCap.statusKey).toBe('PRACTICED');

    // ------------------------------------------------------------
    // STATE 9: Re-complete with focus session
    // ------------------------------------------------------------
    act(() => {
      capturedContext.startFocusSession({
        id: SUBTASK_1_ID,
        subtaskId: SUBTASK_1_ID,
        name: 'Understand time constant',
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        time: 25
      }, 25);
    });

    act(() => {
      capturedContext.beginFocusRunning();
      capturedContext.openReflectionSession();
      capturedContext.commitFocusSession({
        notes: 'Re-verified RC derivation without reference notes',
        difficulty: 'medium',
        explainWithoutNotes: 'yes',
        durationMinutes: 25
      });
    });

    expect(capturedContext.sessions.length).toBe(1);
    trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions);
    rcCap = trajectory.clusters.flatMap(c => c.capabilities).find(cap => cap.id === 'cap-rc');
    expect(rcCap.statusKey).toBe('DEMONSTRATED');
  });

  // ============================================================
  // 3. ADAPTATION PANEL PURITY & AUTONOMY
  // ============================================================
  test('generating recommendations does not mutate roadmap, sessions, or identity', () => {
    mountWithGoldenRoadmap();

    const identityBefore = loadIdentity();
    const roadmapBefore = JSON.stringify(capturedContext.subjects);
    const sessionsBefore = JSON.stringify(capturedContext.sessions);

    // Query adaptive recommendations
    const recs = generateRecommendations({
      features: { isProgressingSmoothly: false, sampleTier: 'observation', shortSessions: { count: 3, completionRate: 1 } },
      hypotheses: [{ key: 'shorter_sessions_sustainable', status: 'SUPPORTED', dimension: 'session_duration' }],
      currentContext: {}
    });

    // Panel opening/viewing does not mutate underlying domain state
    const identityAfter = loadIdentity();
    expect(JSON.stringify(identityBefore)).toEqual(JSON.stringify(identityAfter));
    expect(JSON.stringify(capturedContext.subjects)).toBe(roadmapBefore);
    expect(JSON.stringify(capturedContext.sessions)).toBe(sessionsBefore);
  });

  // ============================================================
  // 4. GOAL CHANGE PRESERVES HISTORY WHILE UPDATING RELEVANCE
  // ============================================================
  test('changing destination goal recalculates trajectory relevance without destroying history', () => {
    mountWithGoldenRoadmap();

    // Complete subtask 1 in electronics
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_1_ID,
        durationMinutes: 25,
        notes: 'Electronics practice'
      });
    });

    expect(capturedContext.taskCompletions.length).toBe(1);

    // Learner updates destination to Software Engineering
    act(() => {
      const updated = {
        ...loadIdentity(),
        destination: {
          primaryGoal: 'Software Engineer',
          primaryRole: 'Software Engineer',
          statement: 'I want to build software systems.',
          mode: 'career'
        }
      };
      saveIdentity(updated);
    });

    // 1. Historical completions remain intact
    expect(capturedContext.taskCompletions.length).toBe(1);
    expect(capturedContext.subjects[0].phases[0].tasks[0].subtasks[0].completed).toBe(true);

    // 2. Trajectory now switches cluster to software & systems
    const trajectory = resolveCapabilityMap(capturedContext.subjects, capturedContext.sessions, loadIdentity().destination);
    expect(trajectory.clusters[0].domain).toMatch(/Computer Science|Systems/i);
  });

  // ============================================================
  // 5. LOCAL-FIRST OFFLINE REHYDRATION
  // ============================================================
  test('offline local storage rehydration restores exact canonical state without phantom mutations', () => {
    mountWithGoldenRoadmap();

    // Perform operations
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_1_ID,
        durationMinutes: 30,
        notes: 'Offline completion'
      });
    });

    // Unmount root (simulating tab close / reload)
    act(() => {
      root.unmount();
    });

    // Re-mount new root from localStorage
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    // Rehydrated state is identical
    const rehydratedSubject = capturedContext.subjects[0];
    const rehydratedTask = rehydratedSubject.phases[0].tasks[0];
    expect(rehydratedTask.subtasks[0].completed).toBe(true);
    expect(rehydratedTask.subtasks[1].completed).toBe(false);
    expect(capturedContext.taskCompletions.length).toBe(1);
    expect(capturedContext.taskCompletions[0].subtaskId).toBe(SUBTASK_1_ID);
  });

  // ============================================================
  // 6. LEARNING PLAN & NOW SYNCHRONIZATION WITH UNDO RESTORATION
  // ============================================================
  test('learning plan entry synchronization is bi-directional and transactional with undo', () => {
    mountWithGoldenRoadmap();

    // 1. Schedule subtask 1 for today
    act(() => {
      capturedContext.scheduleSubtask(
        GOLDEN_SUBJECT_ID,
        GOLDEN_PHASE_ID,
        GOLDEN_TASK_ID,
        SUBTASK_1_ID,
        '2026-10-08'
      );
    });

    expect(capturedContext.learningPlan.length).toBe(1);
    const planId = capturedContext.learningPlan[0].id;

    // 2. Complete subtask 1
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_1_ID,
        durationMinutes: 25
      });
    });

    // Learning plan entry for this subtask is automatically removed upon completion
    expect(capturedContext.learningPlan.length).toBe(0);

    // 3. Undo completion
    act(() => {
      capturedContext.undoLastAction();
    });

    // Learning plan entry is atomically restored with identical id
    expect(capturedContext.learningPlan.length).toBe(1);
    expect(capturedContext.learningPlan[0].id).toBe(planId);
  });

  // ============================================================
  // 7. ACHIEVEMENTS ARE PURE CONSUMERS OF CANONICAL EVENTS
  // ============================================================
  test('achievements do not double-trigger and never act as an independent source of progress', () => {
    mountWithGoldenRoadmap();

    expect(capturedContext.unlockedAchievements.length).toBe(0);

    // Complete first task
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_1_ID,
        durationMinutes: 25
      });
    });

    // 'first-task' achievement unlocked
    expect(capturedContext.unlockedAchievements).toContain('first-task');
    const countAfterFirst = capturedContext.unlockedAchievements.length;

    // Complete another subtask
    act(() => {
      capturedContext.completeSubtask({
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        subtaskId: SUBTASK_2_ID,
        durationMinutes: 25
      });
    });

    // 'first-task' is NOT duplicated
    const firstTaskOccurrences = capturedContext.unlockedAchievements.filter(id => id === 'first-task').length;
    expect(firstTaskOccurrences).toBe(1);
  });

  // ============================================================
  // 8. TELEMETRY & NO-PHONE HONESTY
  // ============================================================
  test('absence of phone companion leaves phone-dependent telemetry null without inventing distraction data', () => {
    mountWithGoldenRoadmap();

    // Start and commit focus session without companion
    act(() => {
      capturedContext.startFocusSession({
        id: SUBTASK_1_ID,
        subtaskId: SUBTASK_1_ID,
        name: 'Understand time constant',
        subjectId: GOLDEN_SUBJECT_ID,
        phaseId: GOLDEN_PHASE_ID,
        taskId: GOLDEN_TASK_ID,
        time: 25
      }, 25);
    });

    act(() => {
      capturedContext.beginFocusRunning();
      capturedContext.openReflectionSession();
      capturedContext.commitFocusSession({
        notes: 'Autonomous session without phone companion',
        difficulty: 'medium',
        explainWithoutNotes: 'no',
        durationMinutes: 25
      });
    });

    expect(capturedContext.sessions.length).toBe(1);
    const session = capturedContext.sessions[0];
    expect(session.companionTelemetry).toBeNull();

    // Growth timeline reflects no fake phone distractions
    const growthTimeline = buildDevelopmentTimeline(capturedContext.sessions, capturedContext.taskCompletions, capturedContext.subjects);
    expect(growthTimeline[0].interruptionCount).toBeUndefined();
  });
});
