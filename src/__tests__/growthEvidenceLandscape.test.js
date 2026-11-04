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

describe('Growth Evidence Landscape & Developmental Mirror', () => {

  const sampleRoadmap = [
    {
      id: 'subj-electronics',
      name: 'Electronics Fundamentals',
      phases: [
        {
          id: 'phase-1',
          name: 'Basic Electrical Analysis',
          tasks: [
            {
              id: 'task-v',
              name: 'Voltage & Current',
              subtasks: [
                { id: 'st-v1', name: 'Electric Potential Definition', completed: true },
                { id: 'st-v2', name: 'Multimeter measurement', completed: true }
              ]
            },
            {
              id: 'task-ohm',
              name: 'Ohm\'s Law & Resistance',
              subtasks: [
                { id: 'st-o1', name: 'Linear V/I relationship', completed: true },
                { id: 'st-o2', name: 'Color code calculation', completed: true }
              ]
            }
          ]
        },
        {
          id: 'phase-2',
          name: 'Passive Components',
          tasks: [
            {
              id: 'task-cap',
              name: 'Capacitors in DC',
              subtasks: [
                { id: 'st-c1', name: 'RC time constant charging', completed: false }
              ]
            }
          ]
        }
      ]
    }
  ];

  // 1. Truthful Summary Resolution
  test('resolveDevelopmentSummary behaves truthfully with limited data (< 3 sessions)', () => {
    const sessions = [
      { id: 's1', durationMinutes: 20, explainWithoutNotes: 'no', date: '2026-10-01' }
    ];
    const summary = resolveDevelopmentSummary(sessions, [], sampleRoadmap, 'all');

    expect(summary.hasEnoughData).toBe(false);
    expect(summary.headline).toContain('Your development record is building');
    expect(summary.supportingEvidence).toContain('1 focused session recorded so far');
    expect(summary.domainName).toBe('Electronics Fundamentals');
  });

  test('resolveDevelopmentSummary recognizes independent recall when supported by real evidence', () => {
    const sessions = [
      { id: 's1', durationMinutes: 25, explainWithoutNotes: 'yes', date: '2026-09-01' },
      { id: 's2', durationMinutes: 30, explainWithoutNotes: 'yes', date: '2026-09-05' },
      { id: 's3', durationMinutes: 35, explainWithoutNotes: 'yes', date: '2026-09-10' }
    ];
    const summary = resolveDevelopmentSummary(sessions, [], sampleRoadmap, 'all');

    expect(summary.hasEnoughData).toBe(true);
    expect(summary.headline).toBe('You are working more independently than you were a month ago.');
    expect(summary.supportingEvidence).toContain('3 recent sessions required no reference notes');
  });

  test('resolveDevelopmentSummary filters by selected domain accurately', () => {
    const sessions = [
      { id: 's1', subjectId: 'subj-electronics', durationMinutes: 25, date: '2026-10-01' },
      { id: 's2', subjectId: 'other-subj', durationMinutes: 25, date: '2026-10-01' }
    ];
    const summary = resolveDevelopmentSummary(sessions, [], sampleRoadmap, 'subj-electronics');
    expect(summary.totalSessionsCount).toBe(1);
    expect(summary.domainName).toBe('Electronics Fundamentals');
  });

  // 2. Timeline and Recovery Generation
  test('buildDevelopmentTimeline injects non-punitive Recovery event after 3+ day gap', () => {
    const sessions = [
      {
        id: 's1',
        startedAt: '2026-10-01T10:00:00Z',
        durationMinutes: 25,
        notes: 'Calculated voltage divider',
        explainWithoutNotes: 'yes'
      },
      {
        id: 's2',
        startedAt: '2026-10-06T10:00:00Z', // 5-day lapse
        durationMinutes: 30,
        notes: 'Resumed circuit analysis',
        explainWithoutNotes: 'yes'
      }
    ];

    const timeline = buildDevelopmentTimeline(sessions, [], sampleRoadmap, 'all');
    expect(timeline.length).toBe(3); // s1, recovery, s2

    const recoveryEvent = timeline.find(e => e.type === 'RECOVERY');
    expect(recoveryEvent).toBeDefined();
    expect(recoveryEvent.title).toContain('Returned after 5-day lapse');
    expect(recoveryEvent.notes).toContain('without losing route continuity');
  });

  test('buildDevelopmentTimeline categorizes project builds and evidence derivations properly', () => {
    const sessions = [
      {
        id: 's1',
        startedAt: '2026-10-02T10:00:00Z',
        durationMinutes: 45,
        notes: 'Explained cutoff and saturation without notes from memory',
        explainWithoutNotes: 'yes'
      },
      {
        id: 's2',
        startedAt: '2026-10-04T10:00:00Z',
        durationMinutes: 75,
        notes: 'Built practical circuit build for Temperature Monitor prototype',
        explainWithoutNotes: 'partly'
      }
    ];

    const timeline = buildDevelopmentTimeline(sessions, [], sampleRoadmap, 'all');
    const evidenceEv = timeline.find(e => e.id === 's1');
    const projectEv = timeline.find(e => e.id === 's2');

    expect(evidenceEv.type).toBe('EVIDENCE');
    expect(evidenceEv.title).toContain('without notes');
    expect(projectEv.type).toBe('PROJECT');
  });

  test('buildDevelopmentTimeline derives milestone events from completed tasks when sessions are empty', () => {
    const timeline = buildDevelopmentTimeline([], [], sampleRoadmap, 'all');
    expect(timeline.length).toBeGreaterThan(0);
    const firstEv = timeline[0];
    expect(firstEv.conceptName).toBe('Electric Potential Definition');
    expect(firstEv.worldConnection).toBe('Basic Electrical Analysis → Voltage & Current');
  });

  // 3. Before → After Capability Scrubber Data
  test('resolveBeforeAndAfter categorizes concepts into baseline and current capability', () => {
    const res = resolveBeforeAndAfter(sampleRoadmap, [], [], 'all');
    expect(res.items.length).toBeGreaterThan(0);
    const completedItem = res.items.find(i => i.name === 'Electric Potential Definition');
    expect(completedItem.nowStatus).toBe('practiced');
    expect(completedItem.nowSymbol).toBe('△');

    const incompleteItem = res.items.find(i => i.name === 'RC time constant charging');
    expect(incompleteItem).toBeDefined();
    expect(incompleteItem.nowStatus).not.toBe('proven');
  });

  // 4. Concrete Proof of Growth
  test('resolveProofOfGrowth produces comparison between earlier baseline and current mastery', () => {
    const sessions = [
      {
        id: 's-proof',
        startedAt: '2026-10-02T10:00:00Z',
        durationMinutes: 35,
        notes: 'Derived cutoff & saturation equations on paper without notes.',
        explainWithoutNotes: 'yes'
      }
    ];

    const proofs = resolveProofOfGrowth([], sessions, sampleRoadmap, 'all');
    expect(proofs.length).toBeGreaterThan(0);
    expect(proofs[0].nowMoment).toContain('from memory without looking at notes');
    expect(proofs[0].evidenceSnippet).toContain('Derived cutoff & saturation');
  });

  // 5. Focus Signals Without Fake Brain Scores
  test('resolveFocusGrowthSignals computes real duration changes without fake IQ', () => {
    const sessions = [
      { durationMinutes: 15 },
      { durationMinutes: 20 },
      { durationMinutes: 34 }
    ];

    const signals = resolveFocusGrowthSignals(sessions);
    expect(signals.hasEnoughData).toBe(true);
    expect(signals.longestUninterruptedMinutes).toBe(34);
    expect(signals.weeklyStretches.length).toBe(3);
    // Explicitly verify no scientifically dishonest scores
    expect(signals.focusIQ).toBeUndefined();
    expect(signals.brainScore).toBeUndefined();
    expect(signals.learningPower).toBeUndefined();
  });

  // 6. Recovery Resiliency
  test('resolveRecoverySignal calculates return without punishment', () => {
    const sessions = [
      { date: '2026-09-20' },
      { date: '2026-09-26' } // 6 days gap
    ];

    const rec = resolveRecoverySignal(sessions);
    expect(rec.hasLapseRecord).toBe(true);
    expect(rec.missedDays).toBe(6);
    expect(rec.returnedSessionsCount).toBe(1);
    expect(rec.message).toContain('You are getting better at coming back');
  });

  // 7. Independence & Scaffolding Reduction
  test('resolveIndependenceSignals tracks reduction in system assistance', () => {
    const plan = [
      { id: 'p1', isAutoAssigned: true },
      { id: 'p2', isAutoAssigned: false },
      { id: 'p3', isAutoAssigned: false }
    ];

    const ind = resolveIndependenceSignals(plan, []);
    expect(ind.autoAssignedCount).toBe(1);
    expect(ind.selfSelectedCount).toBe(2);
    expect(ind.supportHistory.length).toBe(3);
    expect(ind.supportHistory[2].learnerPercent).toBeGreaterThan(ind.supportHistory[0].learnerPercent);
  });

  // 8. Practical Project Progression
  test('resolveProjectProgression stages practical build steps', () => {
    const projRoadmap = [
      {
        id: 'subj-1',
        name: 'Embedded Systems',
        phases: [
          {
            id: 'ph-build',
            name: 'Hardware Builds',
            tasks: [
              {
                id: 'tk-proj',
                name: 'Temperature Monitor ESP32 Build',
                subtasks: [
                  { id: 'st-1', name: 'Concept schematic', completed: true },
                  { id: 'st-2', name: 'Simulation in Wokwi', completed: true },
                  { id: 'st-3', name: 'Firmware C code', completed: true },
                  { id: 'st-4', name: 'Physical breadboard prototype', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    const projs = resolveProjectProgression(projRoadmap);
    expect(projs.length).toBe(1);
    expect(projs[0].name).toContain('Temperature Monitor');
    expect(projs[0].stages).toEqual(['Concept', 'Simulation', 'Code', 'Prototype', 'Measurement', 'Test']);
    expect(projs[0].currentStage).toBe('Measurement');
  });

});
