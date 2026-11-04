import {
  resolveDestination,
  resolveTaskMode,
  resolveRouteType,
  resolveWhyThisNext,
  buildWeeklyRouteStops,
  detectRecoveryNeeds,
  resolveDetoursForConcept
} from '../utils/pathRouteResolver';

describe('Path Route Landscape & Reality-Aware Routing', () => {
  const sampleSubject = {
    id: 'subj-electronics',
    name: 'Electronics Fundamentals',
    phases: [
      {
        id: 'phase-1',
        name: 'Basic Electrical Analysis',
        tasks: [
          {
            id: 'task-v',
            name: 'Voltage',
            subtasks: [
              { id: 'st-v1', name: 'Electric Potential Definition', completed: true },
              { id: 'st-v2', name: 'Multimeter measurement', completed: true }
            ]
          },
          {
            id: 'task-c',
            name: 'Current',
            subtasks: [
              { id: 'st-c1', name: 'Charge carrier flow', completed: true },
              { id: 'st-c2', name: 'Amperage measurement', completed: true }
            ]
          },
          {
            id: 'task-cap',
            name: 'Capacitors',
            subtasks: [
              { id: 'st-cap1', name: 'Electrostatic field storage', completed: false },
              { id: 'st-cap2', name: 'Build RC timing circuit', completed: false }
            ]
          },
          {
            id: 'task-ind',
            name: 'Inductors',
            subtasks: [
              { id: 'st-ind1', name: 'Magnetic energy storage', completed: false }
            ]
          }
        ]
      }
    ]
  };

  test('resolves truthful destination and evidence metrics without fake percentages', () => {
    const destination = resolveDestination(sampleSubject, 7, 4);

    expect(destination.title).toContain('Embedded Hardware');
    expect(destination.totalCapabilities).toBeGreaterThan(0);
    expect(destination.establishedMilestones).toBe(4);
    // Should NOT contain fake percentage string
    expect(destination.title).not.toContain('%');
  });

  test('reality-aware routing: adapts task mode when learner only has a laptop', () => {
    // When resource level is laptop, physical build is adapted to simulation
    const laptopMode = resolveTaskMode('Build RC timing circuit on breadboard', 'laptop');
    expect(laptopMode.mode).toBe('SIMULATE');
    expect(laptopMode.note).toContain('Adapted for Laptop');

    // When resource level is lab, physical build remains physical build
    const labMode = resolveTaskMode('Build RC timing circuit on breadboard', 'lab');
    expect(labMode.mode).toBe('BUILD');
    expect(labMode.note).toContain('hardware available');
  });

  test('resolves pedagogical rationale (why this comes next)', () => {
    const rationale = resolveWhyThisNext('Capacitors', 'Basic Electrical Analysis', 'Current');
    expect(rationale.toLowerCase()).toContain('voltage');
    expect(rationale.toLowerCase()).toContain('capacitors');
    expect(rationale.toLowerCase()).toContain('energy storage');
  });

  test('time budget allocates appropriate stops: 20 min sprint vs 45 min standard', () => {
    // 20 min sprint -> 2 concise stops
    const sprintStops = buildWeeklyRouteStops(sampleSubject, { taskId: 'task-cap' }, [], 20, 'laptop');
    expect(sprintStops.length).toBe(2);
    expect(sprintStops[0].isCurrentStop).toBe(true);

    // 45 min standard -> 4 structured stops
    const standardStops = buildWeeklyRouteStops(sampleSubject, { taskId: 'task-cap' }, [], 45, 'laptop');
    expect(standardStops.length).toBe(4);
    expect(standardStops[0].stageHeader).toBe('BUILD A BASE');
    expect(standardStops[1].stageHeader).toBe('TEST THE IDEA');
  });

  test('detects overdue tasks and creates non-punitive recovery info', () => {
    const learningPlan = [
      { id: 'lp-1', taskId: 'task-v', scheduledDate: '2026-09-28' }, // past date
      { id: 'lp-2', taskId: 'task-c', scheduledDate: '2026-10-02' }  // today
    ];

    const recovery = detectRecoveryNeeds(learningPlan, '2026-10-02');
    expect(recovery.hasMissed).toBe(true);
    expect(recovery.overdueCount).toBe(1);
    expect(recovery.overdueTasks[0].id).toBe('lp-1');
  });

  test('generates bounded, reversible detours for concepts', () => {
    const detours = resolveDetoursForConcept('Capacitors');
    expect(detours.length).toBeGreaterThan(0);
    expect(detours[0].title).toBeDefined();
    expect(detours[0].duration).toBeDefined();
    expect(detours[0].consequence).toBeDefined();
  });
});
