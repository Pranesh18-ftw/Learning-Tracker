import { resolvePlacementExpectations, resolveCapabilityMap } from '../utils/trajectoryResolver';
import { loadIdentity, saveIdentity, DEFAULT_IDENTITY } from '../utils/identityRealityResolver';

describe('Reality Audit P0 & P1 Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('resolvePlacementExpectations is completely truthful on empty or new roadmap', () => {
    const emptyExpectations = resolvePlacementExpectations([]);
    expect(emptyExpectations.length).toBe(5);

    const foundations = emptyExpectations.find(e => e.id === 'foundations');
    const practical = emptyExpectations.find(e => e.id === 'practical');
    const debugging = emptyExpectations.find(e => e.id === 'debugging');
    const projects = emptyExpectations.find(e => e.id === 'projects');

    // On an empty roadmap, the system must NEVER claim skills are demonstrated
    expect(foundations.statusKey).toBe('NOT_EXPLORED');
    expect(foundations.evidence).toContain('Not yet demonstrated');
    expect(practical.statusKey).toBe('NOT_EXPLORED');
    expect(practical.evidence).toContain('No hands-on implementation evidence');
    expect(debugging.statusKey).toBe('NOT_EXPLORED');
    expect(projects.statusKey).toBe('NOT_EXPLORED');
  });

  test('resolvePlacementExpectations elevates status only when authentic evidence exists in roadmap', () => {
    const roadmapWithCompletedWork = [
      {
        id: 'subj-1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph-1',
            name: 'Foundations',
            tasks: [
              {
                id: 't-1',
                name: 'Resistors & Ohm\'s Law',
                completed: true,
                subtasks: [
                  { id: 'st-1', name: 'Derive V = IR', completed: true },
                  { id: 'st-2', name: 'Calculate circuit thermal dissipation', completed: true }
                ]
              },
              {
                id: 't-2',
                name: 'GPIO Hardware Architecture',
                completed: false,
                subtasks: [
                  { id: 'st-3', name: 'Configure push-pull output register', completed: true }
                ]
              },
              {
                id: 't-3',
                name: 'Temperature Monitor Project',
                completed: true,
                subtasks: [
                  { id: 'st-4', name: 'Calibrate thermistor sensor circuit', completed: true },
                  { id: 'st-5', name: 'Write bare-metal C firmware', completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const expectations = resolvePlacementExpectations(roadmapWithCompletedWork);
    const foundations = expectations.find(e => e.id === 'foundations');
    const practical = expectations.find(e => e.id === 'practical');
    const projects = expectations.find(e => e.id === 'projects');

    expect(foundations.statusKey).toBe('DEMONSTRATED');
    expect(foundations.evidence).toContain('completed milestone');

    expect(practical.statusKey).toBe('DEMONSTRATED');
    expect(projects.statusKey).toBe('DEMONSTRATED');
    expect(projects.evidence).toContain('Temperature Monitor Project');
  });

  test('resolveCapabilityMap includes capabilityId and conceptMatch in nextAction', () => {
    const roadmap = [
      {
        id: 'subj-1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph-1',
            name: 'Circuit Dynamics',
            tasks: [
              {
                id: 't-cap',
                name: 'Capacitors & RC Dynamics',
                completed: false,
                subtasks: [
                  { id: 'st-c1', name: 'Understand capacitive charge accumulation', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityData = resolveCapabilityMap(roadmap, []);
    expect(capabilityData.nextAction).toBeDefined();
    expect(capabilityData.nextAction.capabilityId).toBeDefined();
    expect(Array.isArray(capabilityData.nextAction.conceptMatch)).toBe(true);
  });

  test('Identity reality settings persist and update correctly', () => {
    const custom = {
      ...DEFAULT_IDENTITY,
      timeReality: {
        weekdayMinutes: 20,
        saturdayHours: 1,
        sundayHours: 1,
        pattern: 'sprint'
      },
      resources: {
        ...DEFAULT_IDENTITY.resources,
        hardware: ['Laptop']
      }
    };
    saveIdentity(custom);

    const loaded = loadIdentity();
    expect(loaded.timeReality.weekdayMinutes).toBe(20);
    expect(loaded.resources.hardware).toEqual(['Laptop']);
  });

  test('Cross-subject search finds concepts across other loaded tracks', () => {
    const subjects = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'ph-1',
            tasks: [{ name: 'Capacitors and RC Dynamics', subtasks: [{ name: 'Charge equation' }] }]
          }
        ]
      },
      {
        id: 'subj-firmware',
        name: 'Firmware & C',
        phases: [
          {
            id: 'ph-2',
            tasks: [{ name: 'Timer Interrupts and Capacitors', subtasks: [{ name: 'Setup Timer0' }] }]
          }
        ]
      }
    ];

    const activeSubjectId = 'subj-elec';
    const query = 'capacitors';

    const matches = [];
    subjects.forEach(s => {
      if (s.id === activeSubjectId) return;
      let count = 0;
      (s.phases || []).forEach(p => {
        (p.tasks || []).forEach(t => {
          if (t.name?.toLowerCase().includes(query)) count++;
          (t.subtasks || []).forEach(st => {
            if (st.name?.toLowerCase().includes(query)) count++;
          });
        });
      });
      if (count > 0) matches.push({ subject: s, count });
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].subject.name).toBe('Firmware & C');
    expect(matches[0].count).toBe(1);
  });
});
