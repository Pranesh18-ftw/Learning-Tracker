import React, { useContext, act } from 'react';
import { createRoot } from 'react-dom/client';
import { safeStorageSet } from '../utils/storage';
import { RoadmapProvider, RoadmapContext } from '../context/RoadmapContext';
import {
  buildDevelopmentTimeline,
  resolveDevelopmentSummary
} from '../utils/growthEvidenceResolver';
import { buildArchiveArtifacts } from '../utils/archiveEvidenceResolver';
import { resolveCapabilityMap } from '../utils/trajectoryResolver';
import { buildWeeklyRouteStops } from '../utils/pathRouteResolver';
import { buildSubjectTopology } from '../utils/conceptRelationshipResolver';
import { assertSingleRealityConsistency, SYSTEM_TRUTH_TABLE } from '../utils/truthTable';
import { resolveTaskWhyTrace } from '../utils/whyResolver';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Learning Tracker — System Integration Pass (One Reality, Many Views)', () => {
  let container = null;
  let root = null;
  let capturedContext = null;

  const TestConsumer = () => {
    capturedContext = useContext(RoadmapContext);
    return <div id="test-consumer">Ready</div>;
  };

  const canonicalRoadmap = [
    {
      id: 'subj-embedded',
      title: 'Embedded Systems',
      name: 'Embedded Systems',
      phases: [
        {
          id: 'phase-circuits',
          name: 'Circuits & Signals',
          tasks: [
            {
              id: 'task-resistors',
              name: 'Resistors & Ohm\'s Law',
              completed: true,
              subtasks: [
                { id: 'st-res1', name: 'Potential difference', completed: true },
                { id: 'st-res2', name: 'Current limiting', completed: true }
              ]
            },
            {
              id: 'task-capacitors',
              name: 'Capacitors',
              completed: false,
              subtasks: [
                { id: 'st-cap1', name: 'Electrostatic field dynamics', completed: false },
                { id: 'st-cap2', name: 'RC charging curve measurement', completed: false }
              ]
            },
            {
              id: 'task-gpio',
              name: 'GPIO & Level Shifting',
              completed: false,
              subtasks: [
                { id: 'st-gpio1', name: 'Input/Output register configuration', completed: false }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    safeStorageSet('roadmap', canonicalRoadmap);
    safeStorageSet('subjects', canonicalRoadmap);
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

  const mountContext = () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });
  };

  test('Truth Table Invariant Integrity: guarantees no contradictory surfaces exist', () => {
    expect(SYSTEM_TRUTH_TABLE).toBeDefined();
    expect(SYSTEM_TRUTH_TABLE.length).toBeGreaterThanOrEqual(7);

    const completeEvent = SYSTEM_TRUTH_TABLE.find(e => e.event.includes('COMPLETE'));
    expect(completeEvent).toBeDefined();
    expect(completeEvent.world).toContain('Updated');
    expect(completeEvent.path).toContain('Updated');
    expect(completeEvent.now).toContain('Updated');
    expect(completeEvent.growth).toContain('Received');
    expect(completeEvent.archive).toContain('Preserved');

    const itemA = { id: 'task-capacitors', completed: false };
    const itemB = { id: 'task-capacitors', completed: false };
    const itemC = { id: 'task-capacitors', completed: true };

    expect(assertSingleRealityConsistency(itemA, itemB)).toBe(true);
    expect(assertSingleRealityConsistency(itemA, itemC)).toBe(false);
  });

  test('Flow 1 & Flow 2: WORLD / PATH Context Selection propagates seamlessly into NOW and FOCUS', () => {
    mountContext();
    expect(capturedContext).not.toBeNull();

    // Select context from WORLD or PATH
    act(() => {
      capturedContext.selectLearningContext({
        id: 'task-capacitors',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap1',
        name: 'Capacitors',
        taskName: 'Capacitors',
        subjectId: 'subj-embedded',
        subjectName: 'Embedded Systems',
        phaseId: 'phase-circuits',
        phaseName: 'Circuits & Signals'
      });
    });

    // NOW consumes canonical currentLearningContext
    expect(capturedContext.currentLearningContext).toBeDefined();
    expect(capturedContext.currentLearningContext.taskId).toBe('task-capacitors');
    expect(capturedContext.currentLearningContext.subtaskId).toBe('st-cap1');

    // Launch FOCUS on this exact object
    act(() => {
      capturedContext.startFocusSession(
        {
          id: capturedContext.currentLearningContext.taskId,
          taskId: capturedContext.currentLearningContext.taskId,
          subtaskId: capturedContext.currentLearningContext.subtaskId,
          name: 'Capacitors',
          taskName: 'Capacitors',
          subjectId: 'subj-embedded',
          phaseId: 'phase-circuits'
        },
        25
      );
    });

    expect(capturedContext.focusSession).toBeDefined();
    expect(capturedContext.focusSession.status).toBe('ready');

    act(() => {
      capturedContext.beginFocusRunning();
    });

    // FOCUS enters quiet active state with matching object identity
    expect(capturedContext.focusSession.status).toBe('running');
    expect(capturedContext.focusSession.task.taskId).toBe('task-capacitors');
  });

  test('Flow 3: NOW → COMPLETE → WORLD reflects immediate progress', () => {
    mountContext();

    // Verify initially incomplete in World
    const initialTopology = buildSubjectTopology(capturedContext.roadmap[0]);
    const capConcept = initialTopology.allConcepts.find(c => c.id === 'task-capacitors');
    expect(capConcept.completed).toBe(false);

    // Complete subtask from Now
    act(() => {
      capturedContext.completeSubtask({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap1',
        durationMinutes: 25
      });
    });

    // World reflects updated subtask completion
    const updatedSubj = capturedContext.roadmap.find(s => s.id === 'subj-embedded');
    const updatedTask = updatedSubj.phases[0].tasks.find(t => t.id === 'task-capacitors');
    const updatedSubtask = updatedTask.subtasks.find(st => st.id === 'st-cap1');
    expect(updatedSubtask.completed).toBe(true);

    // Complete second subtask to fully complete concept
    act(() => {
      capturedContext.completeSubtask({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 25
      });
    });

    const finalSubj = capturedContext.roadmap.find(s => s.id === 'subj-embedded');
    const finalTask = finalSubj.phases[0].tasks.find(t => t.id === 'task-capacitors');
    expect(finalTask.completed).toBe(true);

    // Concept in World now truthful
    const finalTopology = buildSubjectTopology(capturedContext.roadmap[0]);
    const finalCapConcept = finalTopology.allConcepts.find(c => c.id === 'task-capacitors');
    expect(finalCapConcept.completed).toBe(true);
  });

  test('Flow 4: NOW → COMPLETE → GROWTH receives verified evidence without fake stats', () => {
    mountContext();

    // Complete with verified focus session
    act(() => {
      capturedContext.addFocusSession({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 30,
        notes: 'RC charging curve measurement with oscilloscope',
        explainWithoutNotes: 'yes'
      });
      capturedContext.completeSubtask({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 30,
        explainWithoutNotes: 'yes'
      });
    });

    // Resolve Growth directly from canonical data
    const summary = resolveDevelopmentSummary(
      capturedContext.sessions,
      capturedContext.taskCompletions,
      capturedContext.roadmap
    );

    const timeline = buildDevelopmentTimeline(
      capturedContext.sessions,
      capturedContext.taskCompletions,
      capturedContext.roadmap
    );

    expect(summary).toBeDefined();
    expect(summary.totalSessionsCount).toBe(1);

    // Timeline event recorded with real quote, no fabricated metrics
    expect(timeline.length).toBeGreaterThan(0);
    const capEvent = timeline.find(e =>
      e.title?.toLowerCase().includes('rc') ||
      e.conceptName?.toLowerCase().includes('rc') ||
      e.notes?.toLowerCase().includes('oscilloscope')
    );
    expect(capEvent).toBeDefined();
  });

  test('Flow 5: NOW → COMPLETE → ARCHIVE preserves meaningful artifact/evidence', () => {
    mountContext();

    act(() => {
      capturedContext.addFocusSession({
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 35,
        taskName: 'Capacitors',
        subtaskName: 'Build RC timing circuit',
        subjectName: 'Embedded Systems',
        notes: 'Constructed 555 astable oscillator on breadboard, observed square wave output.',
        difficulty: 'solid'
      });
      capturedContext.completeSubtask({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 35,
        notes: 'Constructed 555 astable oscillator on breadboard, observed square wave output.'
      });
    });

    // Resolve Archive directly from canonical roadmap + sessions
    const artifacts = buildArchiveArtifacts({
      roadmap: capturedContext.roadmap,
      sessions: capturedContext.sessions,
      taskCompletions: capturedContext.taskCompletions
    });

    expect(artifacts.length).toBeGreaterThan(0);
    const capArtifact = artifacts.find(a =>
      a.title?.toLowerCase().includes('capacitors') ||
      a.subheading?.toLowerCase().includes('capacitors') ||
      a.domain?.toLowerCase().includes('embedded')
    );
    expect(capArtifact).toBeDefined();
  });

  test('Flow 6: NOW → COMPLETE → TRAJECTORY updates capability evidence', () => {
    mountContext();

    // Check baseline capability status
    const initialTrajectory = resolveCapabilityMap(
      capturedContext.roadmap,
      capturedContext.sessions,
      { primaryRole: 'Embedded Systems Engineer' }
    );
    const rcCapBefore = initialTrajectory.clusters
      .flatMap(c => c.capabilities)
      .find(cap => cap.id === 'cap-rc');
    expect(rcCapBefore).toBeDefined();
    expect(rcCapBefore.statusKey).toBe('NOT_EXPLORED');

    // Complete capacitors practical task with verified telemetry
    act(() => {
      capturedContext.addFocusSession({
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 40,
        taskName: 'Capacitors',
        subtaskName: 'RC charging curve measurement',
        subjectName: 'Embedded Systems',
        explainWithoutNotes: 'tau = R * C. At 1 tau, voltage reaches 63.2% of max.'
      });
      capturedContext.completeSubtask({
        subjectId: 'subj-embedded',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-cap2',
        durationMinutes: 40,
        explainWithoutNotes: 'tau = R * C. At 1 tau, voltage reaches 63.2% of max.'
      });
    });

    // Re-resolve Trajectory: it dynamically picks up the canonical session & completion
    const updatedTrajectory = resolveCapabilityMap(
      capturedContext.roadmap,
      capturedContext.sessions,
      { primaryRole: 'Embedded Systems Engineer' }
    );

    const rcCapAfter = updatedTrajectory.clusters
      .flatMap(c => c.capabilities)
      .find(cap => cap.id === 'cap-rc');

    expect(rcCapAfter).toBeDefined();
    // Capability advances to PRACTICED
    expect(rcCapAfter.statusKey).toBe('PRACTICED');
    expect(rcCapAfter.evidence.length).toBeGreaterThan(0);
  });

  test('Flow 7: COMPLETE → UNDO → all connected views revert appropriately without orphaned state', () => {
    mountContext();

    // 1. Initially uncompleted
    expect(capturedContext.taskCompletions.length).toBe(0);

    // 2. Start and commit focus session (which sets up atomic undo state via commitFocusSession)
    act(() => {
      capturedContext.startFocusSession(
        {
          id: 'task-capacitors',
          taskId: 'task-capacitors',
          subtaskId: 'st-cap1',
          name: 'Capacitors',
          taskName: 'Capacitors',
          subjectId: 'subj-embedded',
          phaseId: 'phase-circuits'
        },
        20
      );
    });

    act(() => {
      capturedContext.commitFocusSession({
        durationMinutes: 20,
        notes: 'Verified capacitor electrostatic dynamics.'
      });
    });

    let currentSubj = capturedContext.roadmap.find(s => s.id === 'subj-embedded');
    let currentTask = currentSubj.phases[0].tasks.find(t => t.id === 'task-capacitors');
    expect(currentTask.subtasks[0].completed).toBe(true);
    expect(capturedContext.taskCompletions.length).toBe(1);

    // 3. Trigger global UNDO
    act(() => {
      capturedContext.undoLastAction();
    });

    // 4. Verify Roadmap (World/Now/Path) reverted
    let revertedSubj = capturedContext.roadmap.find(s => s.id === 'subj-embedded');
    let revertedTask = revertedSubj.phases[0].tasks.find(t => t.id === 'task-capacitors');
    expect(revertedTask.subtasks[0].completed).toBe(false);

    // 5. Verify taskCompletions reverted
    expect(capturedContext.taskCompletions.length).toBe(0);

    // 6. Growth recalculates cleanly without orphaned evidence
    const summaryAfterUndo = resolveDevelopmentSummary(
      capturedContext.sessions,
      capturedContext.taskCompletions,
      capturedContext.roadmap
    );
    expect(summaryAfterUndo.totalSessionsCount).toBe(0);
  });

  test('The Single Object Journey: CAPACITORS traces across all 8 surfaces with consistent identity', () => {
    mountContext();

    // 1. WORLD: Concept is defined in knowledge landscape
    const topology = buildSubjectTopology(capturedContext.roadmap[0]);
    const worldConcept = topology.allConcepts.find(c => c.id === 'task-capacitors');
    expect(worldConcept).toBeDefined();
    expect(worldConcept.name).toBe('Capacitors');

    // 2. PATH: Appears as an active route stop
    const routeStops = buildWeeklyRouteStops(capturedContext.roadmap[0], null, [], 45, 'laptop');
    const pathStop = routeStops.find(s => s.id === 'task-capacitors');
    expect(pathStop).toBeDefined();
    expect(pathStop.name).toBe('Capacitors');

    // 3. NOW: Context resolves "Why" and provides actionable next challenge
    const whyTrace = resolveTaskWhyTrace(worldConcept);
    expect(whyTrace).toBeDefined();
    expect(whyTrace.capabilityName).toContain('RC');
    expect(whyTrace.targetRole).toBeDefined();

    // 4. FOCUS: Starts with exact identity
    act(() => {
      capturedContext.startFocusSession(
        {
          id: 'task-capacitors',
          taskId: 'task-capacitors',
          subtaskId: 'st-cap1',
          name: 'Capacitors',
          taskName: 'Capacitors',
          subjectId: 'subj-embedded',
          phaseId: 'phase-circuits'
        },
        25
      );
    });
    expect(capturedContext.focusSession.task.name).toBe('Capacitors');

    // 5. EVIDENCE: Recorded without notes
    act(() => {
      capturedContext.commitFocusSession({
        notes: 'Exploration of dielectric permitivity and plate separation.',
        explainWithoutNotes: 'yes'
      });
    });

    // 6. GROWTH: Timeline derives this evidence
    const timeline = buildDevelopmentTimeline(capturedContext.sessions, capturedContext.taskCompletions, capturedContext.roadmap);
    expect(timeline.length).toBeGreaterThanOrEqual(1);

    // 7. ARCHIVE: Artifact created for this milestone
    const artifacts = buildArchiveArtifacts({
      roadmap: capturedContext.roadmap,
      sessions: capturedContext.sessions,
      taskCompletions: capturedContext.taskCompletions
    });
    expect(artifacts.length).toBeGreaterThan(0);

    // 8. TRAJECTORY: Capability linked to same concept
    const trajectory = resolveCapabilityMap(capturedContext.roadmap, capturedContext.sessions, { primaryRole: 'Embedded Systems Engineer' });
    const cap = trajectory.clusters.flatMap(c => c.capabilities).find(c => c.id === 'cap-rc');
    expect(cap).toBeDefined();
  });
});
