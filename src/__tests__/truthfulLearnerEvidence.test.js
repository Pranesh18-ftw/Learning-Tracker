import {
  buildArchiveArtifacts,
  filterArchiveArtifacts,
  calculateArchiveSummary
} from '../utils/archiveEvidenceResolver';

import {
  resolveDevelopmentSummary,
  buildDevelopmentTimeline,
  resolveBeforeAndAfter,
  resolveProofOfGrowth,
  resolveFocusGrowthSignals,
  resolveRecoverySignal,
  resolveIndependenceSignals,
  resolveProjectProgression
} from '../utils/growthEvidenceResolver';

import {
  resolveCapabilityMap,
  resolvePlacementExpectations
} from '../utils/trajectoryResolver';

import {
  resolveDestination
} from '../utils/pathRouteResolver';

import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';

describe('Truthful Learner Evidence — P0.2 Anti-Fabrication Invariants', () => {

  // =========================================================================
  // 1. FRESH LEARNER / ZERO-EVIDENCE INVARIANTS (Never manufacture default cards)
  // =========================================================================
  describe('Zero-evidence baseline (fresh learner)', () => {

    test('buildArchiveArtifacts returns empty array when no genuine evidence exists', () => {
      const artifacts = buildArchiveArtifacts({
        roadmap: [],
        sessions: [],
        taskCompletions: [],
        notes: []
      });

      expect(artifacts).toEqual([]);
      expect(artifacts.some(a => a.id && a.id.startsWith('art-default-'))).toBe(false);
      expect(artifacts.some(a => a.title && a.title.includes('Analog Filter'))).toBe(false);
      expect(artifacts.some(a => a.title && a.title.includes('Theoretical Derivation'))).toBe(false);
    });

    test('resolveProofOfGrowth returns empty array when no unassisted retrieval sessions exist', () => {
      const proofs = resolveProofOfGrowth([], [], [], 'all');
      expect(proofs).toEqual([]);
      expect(proofs.some(p => p.id === 'proof-grounded-1')).toBe(false);
      expect(proofs.some(p => p.concept && p.concept.includes('Operational Amplifier'))).toBe(false);
    });

    test('resolveProjectProgression returns empty array when no projects exist in roadmap', () => {
      const projs = resolveProjectProgression([]);
      expect(projs).toEqual([]);
      expect(projs.some(p => p.id === 'default-proj-1')).toBe(false);
    });

    test('resolveCapabilityMap produces exactly 0 demonstrated and 0 developing capabilities', () => {
      const result = resolveCapabilityMap([], [], []);
      expect(result.metrics.demonstratedCount).toBe(0);
      expect(result.metrics.developingCount).toBe(0);
      const allCaps = result.clusters.flatMap(c => c.capabilities);
      expect(allCaps.every(c => c.evidence[0] === 'No demonstrated capability yet.')).toBe(true);
    });

    test('resolveDestination reports 0 evidence projects when 0 subtasks are completed', () => {
      const destination = resolveDestination({
        roadmap: [{ id: 'sub-1', phases: [] }],
        currentPhaseIndex: 0,
        completedTasks: 0,
        completedSubtasks: 0,
        totalTasks: 10
      });

      expect(destination.evidenceProjects).toBe(0);
    });

    test('resolveBeforeAndAfter returns empty array when roadmap has no concepts', () => {
      const result = resolveBeforeAndAfter([], [], [], 'all');
      expect(result.items).toEqual([]);
    });

    test('resolveFocusGrowthSignals does not fabricate 12 or 15 minute weekly stretches', () => {
      const signals = resolveFocusGrowthSignals([]);
      expect(signals.hasEnoughData).toBe(false);
      expect(signals.weeklyStretches).toEqual([]);
      expect(signals.longestUninterruptedMinutes).toBe(0);
    });

    test('resolveRecoverySignal reports no lapse when no sessions exist', () => {
      const recovery = resolveRecoverySignal([]);
      expect(recovery.hasLapseRecord).toBe(false);
      expect(recovery.missedDays).toBe(0);
      expect(recovery.hasEnoughData).toBe(false);
      expect(recovery.message).toBe('Not enough history yet.');
    });

    test('resolveIndependenceSignals returns empty state when no plan or sessions exist', () => {
      const independence = resolveIndependenceSignals([], []);
      expect(independence.hasEnoughData).toBe(false);
      expect(independence.supportHistory).toEqual([]);
      expect(independence.autoAssignedCount).toBe(0);
      expect(independence.selfSelectedCount).toBe(0);
      expect(independence.headline).toBe('Not enough history yet.');
    });

    test('CURATED_ROADMAPS starter templates have zero pre-completed tasks or subtasks', () => {
      CURATED_ROADMAPS.forEach(roadmap => {
        (roadmap.subjects || []).forEach(subj => {
          (subj.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
              expect(task.completed).toBeFalsy();
              (task.subtasks || []).forEach(subtask => {
                expect(subtask.completed).toBeFalsy();
              });
            });
          });
        });
      });
    });

    test('fresh learner loading CURATED_ROADMAPS generates zero phantom timeline events, artifacts, or proven capabilities', () => {
      const freshCuratedRoadmap = CURATED_ROADMAPS[0].subjects;

      // 1. Timeline must be empty (no phantom completion events)
      const timeline = buildDevelopmentTimeline([], [], freshCuratedRoadmap, 'all');
      expect(timeline).toEqual([]);

      // 2. Archive must be empty (no phantom demonstrated concept artifacts)
      const artifacts = buildArchiveArtifacts({
        roadmap: freshCuratedRoadmap,
        sessions: [],
        taskCompletions: [],
        notes: []
      });
      expect(artifacts).toEqual([]);

      // 3. Before/After scrubber must have zero 'proven' concepts
      const beforeAfter = resolveBeforeAndAfter(freshCuratedRoadmap, [], [], 'all');
      const provenItems = beforeAfter.items.filter(i => i.nowStatus === 'proven');
      expect(provenItems).toHaveLength(0);

      // 4. Placement expectations must all be NOT_EXPLORED
      const placement = resolvePlacementExpectations(freshCuratedRoadmap);
      expect(placement.every(p => p.statusKey === 'NOT_EXPLORED')).toBe(true);
    });

    test('resolvePlacementExpectations returns NOT_EXPLORED with truthful statements for fresh learner', () => {
      const placement = resolvePlacementExpectations([], [], []);
      const foundations = placement.find(p => p.id === 'foundations');
      const communication = placement.find(p => p.id === 'communication');
      expect(foundations.statusKey).toBe('NOT_EXPLORED');
      expect(foundations.evidence).toContain('Not yet demonstrated');
      expect(communication.statusKey).toBe('NOT_EXPLORED');
      expect(communication.evidence).toContain('No reflection notes or documentation recorded yet');
    });
  });

  // =========================================================================
  // 2. EPISTEMIC STATE SEPARATION: PRACTICED vs DEMONSTRATED vs UNATTEMPTED
  // =========================================================================
  describe('Epistemic state separation: PRACTICED vs DEMONSTRATED', () => {

    const testRoadmap = [
      {
        id: 'subj-circuits',
        name: 'Electric Circuits',
        phases: [
          {
            id: 'phase-dc',
            name: 'DC Analysis',
            tasks: [
              {
                id: 'task-mesh',
                name: 'Mesh Current Analysis',
                completed: true,
                subtasks: [
                  { id: 'st-mesh-1', name: 'KVL Loop Equations', completed: true }
                ]
              },
              {
                id: 'task-thev',
                name: 'Thevenin Equivalent Circuit',
                completed: false,
                subtasks: [
                  { id: 'st-thev-1', name: 'Open circuit voltage', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    test('completed task without unassisted session is classified as PRACTICED, not DEMONSTRATED', () => {
      // Learner completed task-mesh, but has NOT done an unassisted recall session or project build
      const result = resolveCapabilityMap(testRoadmap, [], []);
      const allCaps = result.clusters.flatMap(c => c.capabilities);
      const meshCap = allCaps.find(c => c.name.toLowerCase().includes('circuit') || c.name.toLowerCase().includes('analysis'));

      expect(meshCap).toBeDefined();
      expect(meshCap.statusKey).toBe('PRACTICED');
      expect(meshCap.evidence[0]).toContain('Practiced');
      expect(result.metrics.demonstratedCount).toBe(0);
      expect(result.metrics.practicedCount).toBeGreaterThanOrEqual(1);
    });

    test('completed task WITH verified unassisted recall is classified as DEMONSTRATED', () => {
      const unassistedSessions = [
        {
          id: 'sess-recall-1',
          taskId: 'task-mesh',
          explainWithoutNotes: 'yes',
          durationMinutes: 30,
          notes: 'Derived mesh matrix independently from memory.'
        }
      ];

      const result = resolveCapabilityMap(testRoadmap, unassistedSessions);
      const allCaps = result.clusters.flatMap(c => c.capabilities);
      const meshCap = allCaps.find(c => c.name.toLowerCase().includes('circuit') || c.name.toLowerCase().includes('analysis'));

      expect(meshCap).toBeDefined();
      expect(meshCap.statusKey).toBe('DEMONSTRATED');
      expect(meshCap.evidence[0]).toContain('Demonstrated unassisted retrieval');
      expect(result.metrics.demonstratedCount).toBeGreaterThanOrEqual(1);
    });

    test('resolveBeforeAndAfter marks completed concept as practiced and incomplete as unattempted', () => {
      const res = resolveBeforeAndAfter(testRoadmap, [], [], 'all');
      const meshItem = res.items.find(i => i.name === 'KVL Loop Equations');
      expect(meshItem).toBeDefined();
      expect(meshItem.nowStatus).toBe('practiced');
      expect(meshItem.nowSymbol).toBe('△');

      // Unattempted task remains unattempted
      const thevItem = res.items.find(i => i.name === 'Open circuit voltage');
      expect(thevItem.nowStatus).toBe('unattempted');
      expect(thevItem.nowSymbol).toBe('✕');
    });

    test('resolveBeforeAndAfter marks concept WITH unassisted recall session as proven', () => {
      const unassistedSessions = [
        {
          id: 'sess-recall-1',
          subtaskId: 'st-mesh-1',
          explainWithoutNotes: 'yes',
          durationMinutes: 30,
          notes: 'Derived mesh matrix independently from memory.'
        }
      ];
      const res = resolveBeforeAndAfter(testRoadmap, unassistedSessions, [], 'all');
      const meshItem = res.items.find(i => i.name === 'KVL Loop Equations');
      expect(meshItem).toBeDefined();
      expect(meshItem.nowStatus).toBe('proven');
      expect(meshItem.nowSymbol).toBe('✓');
    });
  });

  // =========================================================================
  // 3. NO FABRICATED QUOTES, BADGES, OR REFLECTIONS
  // =========================================================================
  describe('Zero-fabrication of text and quotes', () => {

    test('buildArchiveArtifacts never injects fabricated oscilloscope quotes or synthetic note strings', () => {
      const realRoadmap = [
        {
          id: 'subj-code',
          name: 'Software Systems',
          phases: [
            {
              id: 'ph-1',
              name: 'Core Algorithms',
              tasks: [
                {
                  id: 'tk-bin',
                  name: 'Binary Search Implementation',
                  completed: true,
                  subtasks: [
                    { id: 'st-b1', name: 'Write loop invariant', completed: true }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const sessionsWithoutNotes = [
        {
          id: 's-no-notes',
          taskId: 'tk-bin',
          startedAt: '2026-10-03T10:00:00Z',
          durationMinutes: 25,
          explainWithoutNotes: 'yes'
          // note is undefined
        }
      ];

      const artifacts = buildArchiveArtifacts({
        roadmap: realRoadmap,
        sessions: sessionsWithoutNotes,
        taskCompletions: [],
        notes: []
      });

      // Verification quote should NOT be the hardcoded oscilloscope string
      const evArtifact = artifacts.find(a => a.type === 'evidence');
      if (evArtifact) {
        expect(evArtifact.quote).not.toContain('Measured ripple voltage on oscilloscope');
        expect(evArtifact.quote).not.toContain('Verified theoretical intuition from memory');
      }
    });

    test('cross-phase transfer artifact is not generated if learner has only worked in one phase', () => {
      const singlePhaseRoadmap = [
        {
          id: 'subj-1',
          name: 'Physics',
          phases: [
            {
              id: 'ph-1',
              name: 'Classical Mechanics',
              tasks: [
                { id: 't-1', name: 'Kinematics', completed: true, subtasks: [{ id: 'st-1', completed: true }] }
              ]
            },
            {
              id: 'ph-2',
              name: 'Electromagnetism',
              tasks: [
                { id: 't-2', name: 'Gauss Law', completed: false, subtasks: [{ id: 'st-2', completed: false }] }
              ]
            }
          ]
        }
      ];

      const artifacts = buildArchiveArtifacts({
        roadmap: singlePhaseRoadmap,
        sessions: [],
        taskCompletions: [],
        notes: []
      });

      const transferArtifact = artifacts.find(a => a.type === 'transfer');
      expect(transferArtifact).toBeUndefined();
    });

    test('project stageBadges reflect authentic subtask keywords, never hardcoded built/tested/measured', () => {
      const roadmapWithGenericSubtasks = [
        {
          id: 'subj-1',
          name: 'Mechanical Design',
          phases: [
            {
              id: 'ph-1',
              name: 'Projects',
              tasks: [
                {
                  id: 'tk-proj',
                  name: '3D Printed Bracket Project',
                  completed: true,
                  subtasks: [
                    { id: 'st-1', name: 'Model in FreeCAD', completed: true },
                    { id: 'st-2', name: 'Export STL slice', completed: true }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const artifacts = buildArchiveArtifacts({
        roadmap: roadmapWithGenericSubtasks,
        sessions: [],
        taskCompletions: [],
        notes: []
      });

      const projArtifact = artifacts.find(a => a.type === 'project');
      expect(projArtifact).toBeDefined();
      // Since neither 'test' nor 'measure' appear in subtasks, stageBadges must not falsely claim 'Tested' or 'Measured'
      expect(projArtifact.stageBadges).not.toContain('Tested');
      expect(projArtifact.stageBadges).not.toContain('Measured');
    });
  });

});
