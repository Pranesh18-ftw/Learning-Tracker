/**
 * completionEvidenceVerificationTruthfulness.test.js
 *
 * P0.4 Verification Suite:
 * ENFORCE COMPLETION ≠ EVIDENCE ≠ VERIFICATION
 *
 * Invariants Proven:
 * 1. complete task → COMPLETED only
 * 2. complete task + no notes → no evidence
 * 3. complete task + reflection → reflection recorded, not verified
 * 4. focus session complete → session recorded, not verified
 * 5. evidence artifact recorded → evidence exists
 * 6. evidence without verification → VERIFICATION_PENDING / equivalent
 * 7. verification event → VERIFIED
 * 8. undo completion removes/invalidates derived claims appropriately
 * 9. completion cannot create mastery
 * 10. completion cannot create demonstrated capability
 * 11. completion cannot create proof-of-understanding
 * 12. fake/default verification phrases cannot appear in empty states
 */

import {
  EVIDENCE_STATES,
  COMPLETION_STATES,
  resolveEvidenceState
} from '../shared/evidenceVerificationProtocol';

import {
  buildArchiveArtifacts
} from '../utils/archiveEvidenceResolver';

import {
  buildDevelopmentTimeline,
  resolveBeforeAndAfter,
  resolveProofOfGrowth
} from '../utils/growthEvidenceResolver';

import {
  resolveCapabilityMap,
  resolvePlacementExpectations
} from '../utils/trajectoryResolver';

describe('P0.4 — COMPLETION ≠ EVIDENCE ≠ VERIFICATION Invariant Suite', () => {

  const testSubject = {
    id: 'subj-circuits',
    name: 'Circuit Analysis',
    phases: [
      {
        id: 'phase-1',
        name: 'DC Fundamentals',
        tasks: [
          {
            id: 'task-kvl',
            name: 'Kirchhoff Voltage Law',
            completed: false,
            subtasks: [
              { id: 'st-kvl-1', name: 'Derive loop equation on paper', completed: false }
            ]
          }
        ]
      }
    ]
  };

  // 1. complete task → COMPLETED only
  test('1. complete task produces COMPLETED status and never VERIFIED', () => {
    const completedTask = {
      ...testSubject.phases[0].tasks[0],
      completed: true,
      completedAt: '2026-10-06T12:00:00Z'
    };

    const completionRecord = {
      id: 'comp-1',
      taskId: 'task-kvl',
      completedAt: '2026-10-06T12:00:00Z',
      durationMinutes: 20
    };

    const evidenceState = resolveEvidenceState({
      taskOrSubtask: completedTask,
      completion: completionRecord
    });

    expect(evidenceState).toBe(EVIDENCE_STATES.NO_EVIDENCE);
    expect(evidenceState).not.toBe(EVIDENCE_STATES.VERIFIED);
  });

  // 2. complete task + no notes → no evidence
  test('2. complete task with no notes records NO_EVIDENCE', () => {
    const completionNoNotes = {
      id: 'comp-2',
      taskId: 'task-kvl',
      notes: 'Completed without notes.',
      durationMinutes: 15
    };

    const state = resolveEvidenceState({
      completion: completionNoNotes
    });

    expect(state).toBe(EVIDENCE_STATES.NO_EVIDENCE);
  });

  // 3. complete task + reflection → reflection recorded, not verified
  test('3. complete task with reflection notes records EVIDENCE_RECORDED, never VERIFIED', () => {
    const completionWithReflection = {
      id: 'comp-3',
      taskId: 'task-kvl',
      notes: 'Sum of voltage drops across closed loop equals source voltage.',
      durationMinutes: 25
    };

    const state = resolveEvidenceState({
      completion: completionWithReflection
    });

    expect(state).toBe(EVIDENCE_STATES.EVIDENCE_RECORDED);
    expect(state).not.toBe(EVIDENCE_STATES.VERIFIED);
  });

  // 4. focus session complete → session recorded, not verified
  test('4. focus session complete records session occurrence, never verified understanding', () => {
    const focusSession = {
      id: 'sess-focus-1',
      taskId: 'task-kvl',
      durationMinutes: 45,
      type: 'focus',
      date: '2026-10-06'
    };

    const state = resolveEvidenceState({
      session: focusSession
    });

    expect(state).toBe(EVIDENCE_STATES.NO_EVIDENCE);
    expect(state).not.toBe(EVIDENCE_STATES.VERIFIED);
  });

  // 5. evidence artifact recorded → evidence exists
  test('5. explicit learner evidence artifact registers EVIDENCE_RECORDED', () => {
    const artifact = {
      id: 'art-kvl-circuit',
      url: 'blob:simulated-schematic.png',
      caption: 'SPICE loop simulation waveform'
    };

    const state = resolveEvidenceState({
      evidenceArtifact: artifact
    });

    expect(state).toBe(EVIDENCE_STATES.EVIDENCE_RECORDED);
  });

  // 6. evidence without verification → VERIFICATION_PENDING
  test('6. evidence artifact requiring verification registers VERIFICATION_PENDING, not VERIFIED', () => {
    const pendingArtifact = {
      id: 'art-cap-project',
      requiresVerification: true,
      verified: false
    };

    const state = resolveEvidenceState({
      evidenceArtifact: pendingArtifact
    });

    expect(state).toBe(EVIDENCE_STATES.VERIFICATION_PENDING);
    expect(state).not.toBe(EVIDENCE_STATES.VERIFIED);
  });

  // 7. verification event → VERIFIED
  test('7. explicit verification record evaluates to VERIFIED only with explicit verification record', () => {
    const verificationRecord = {
      id: 'verif-1',
      evaluatorId: 'bench-check',
      criterion: 'KVL sum deviation <= 1%',
      status: 'verified',
      evaluatedAt: '2026-10-06T12:30:00Z'
    };

    const state = resolveEvidenceState({
      verificationRecord
    });

    expect(state).toBe(EVIDENCE_STATES.VERIFIED);
  });

  // 8. undo completion removes/invalidates derived claims appropriately
  test('8. undo completion restores empty baseline across resolvers', () => {
    const completedRoadmap = [
      {
        ...testSubject,
        phases: [
          {
            ...testSubject.phases[0],
            tasks: [
              {
                ...testSubject.phases[0].tasks[0],
                completed: true,
                subtasks: [
                  { ...testSubject.phases[0].tasks[0].subtasks[0], completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    // Before undo: completed tasks exist
    const artifactsBeforeUndo = buildArchiveArtifacts({
      roadmap: completedRoadmap,
      sessions: [],
      taskCompletions: []
    });
    expect(artifactsBeforeUndo.length).toBeGreaterThan(0);

    // After undo: reverted back to testSubject (incomplete)
    const revertedRoadmap = [testSubject];
    const artifactsAfterUndo = buildArchiveArtifacts({
      roadmap: revertedRoadmap,
      sessions: [],
      taskCompletions: []
    });
    expect(artifactsAfterUndo).toHaveLength(0);
  });

  // 9. completion cannot create mastery
  test('9. roadmap task completion alone produces PRACTICED, never MASTERED or DEMONSTRATED capability', () => {
    const completedRoadmap = [
      {
        ...testSubject,
        phases: [
          {
            ...testSubject.phases[0],
            tasks: [
              {
                ...testSubject.phases[0].tasks[0],
                completed: true,
                subtasks: [
                  { ...testSubject.phases[0].tasks[0].subtasks[0], completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityResult = resolveCapabilityMap(completedRoadmap, [], []);
    expect(capabilityResult.metrics.demonstratedCount).toBe(0);
    expect(capabilityResult.metrics.practicedCount).toBeGreaterThanOrEqual(1);

    const allCaps = capabilityResult.clusters.flatMap(c => c.capabilities);
    const kvlCap = allCaps.find(c => c.name.toLowerCase().includes('circuit'));
    expect(kvlCap?.statusKey).toBe('PRACTICED');
    expect(kvlCap?.statusKey).not.toBe('DEMONSTRATED');
  });

  // 10. completion cannot create demonstrated capability
  test('10. completing subtask in Before/After scrubber produces practiced (△), not proven (✓)', () => {
    const completedRoadmap = [
      {
        ...testSubject,
        phases: [
          {
            ...testSubject.phases[0],
            tasks: [
              {
                ...testSubject.phases[0].tasks[0],
                completed: true,
                subtasks: [
                  { ...testSubject.phases[0].tasks[0].subtasks[0], completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const scrubber = resolveBeforeAndAfter(completedRoadmap, [], [], 'all');
    const kvlItem = scrubber.items.find(i => i.name === 'Derive loop equation on paper');
    expect(kvlItem).toBeDefined();
    expect(kvlItem.nowStatus).toBe('practiced');
    expect(kvlItem.nowSymbol).toBe('△');
    expect(kvlItem.nowStatus).not.toBe('proven');
  });

  // 11. completion cannot create proof-of-understanding
  test('11. completing task without unassisted session generates 0 Proof of Growth cards', () => {
    const taskCompletions = [
      {
        id: 'comp-kvl',
        taskId: 'task-kvl',
        durationMinutes: 30,
        completedAt: '2026-10-06T12:00:00Z'
      }
    ];

    const proofs = resolveProofOfGrowth(taskCompletions, [], [testSubject], 'all');
    expect(proofs).toHaveLength(0);
  });

  // 12. fake/default verification phrases cannot appear in empty states
  test('12. fresh learner state has zero occurrences of fake verification phrases', () => {
    // A. Empty archive
    const artifacts = buildArchiveArtifacts({
      roadmap: [testSubject],
      sessions: [],
      taskCompletions: []
    });
    expect(artifacts).toHaveLength(0);

    // B. Empty timeline
    const timeline = buildDevelopmentTimeline([], [], [testSubject], 'all');
    expect(timeline).toHaveLength(0);

    // C. Placement expectations on empty roadmap
    const placement = resolvePlacementExpectations([testSubject]);
    placement.forEach(pillar => {
      expect(pillar.evidence).not.toContain('verified milestone');
      expect(pillar.evidence).not.toContain('Verified physical principle');
      expect(pillar.evidence).not.toContain('Verified theoretical intuition');
    });
  });

});
