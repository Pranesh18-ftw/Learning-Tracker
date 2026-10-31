/**
 * trajectoryCareerLandscape.test.js
 *
 * Test suite for LEARNING TRACKER — TRAJECTORY & CAREER REDESIGN
 */

import {
  resolveTrajectoryDestination,
  resolveCapabilityMap,
  updateTrajectoryDestination,
  addTrajectoryInterest,
  removeTrajectoryInterest,
  setPrimaryTrajectory,
  ROLE_CAPABILITY_CLUSTERS,
  CAPABILITY_STATUSES
} from '../utils/trajectoryResolver';

describe('Trajectory & Career Engine — trajectoryResolver', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('resolveTrajectoryDestination returns grounded default destination', () => {
    const dest = resolveTrajectoryDestination();
    expect(dest.primaryRole).toBeDefined();
    expect(dest.targetRole).toContain('Embedded Systems');
    expect(dest.statement).toContain('real embedded systems');
    expect(dest.targetTimeline).toBeDefined();
  });

  test('updateTrajectoryDestination persists updates without wiping learning history', () => {
    updateTrajectoryDestination({
      primaryRole: 'Autonomous Robotics Engineer',
      targetTimeline: '2026 Winter',
      mode: 'research'
    });

    const updated = resolveTrajectoryDestination();
    expect(updated.primaryRole).toBe('Autonomous Robotics Engineer');
    expect(updated.targetTimeline).toBe('2026 Winter');
    expect(updated.mode).toBe('research');
  });

  test('resolveCapabilityMap structures domain clusters with honest capability states', () => {
    const mockRoadmap = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'ph1',
            name: 'Basic Electrical Principles',
            tasks: [
              {
                id: 't1',
                name: 'Voltage, Current & Ohm\'s Law',
                completed: true,
                subtasks: [
                  { id: 'st1', name: 'Derive V=IR', completed: true },
                  { id: 'st2', name: 'Voltage divider rule', completed: true }
                ]
              },
              {
                id: 't2',
                name: 'Capacitor Charging Dynamics',
                completed: false,
                subtasks: [
                  { id: 'st3', name: 'RC curve calculation', completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityData = resolveCapabilityMap(mockRoadmap, []);

    expect(capabilityData.clusters).toBeDefined();
    expect(capabilityData.clusters.length).toBeGreaterThanOrEqual(2);

    // Verify clusters contain capabilities with honest states (no arbitrary percentage numbers)
    const allCaps = capabilityData.clusters.flatMap(c => c.capabilities);
    allCaps.forEach(cap => {
      expect(['DEMONSTRATED', 'PRACTICED', 'EXPOSED', 'NOT_EXPLORED']).toContain(cap.statusKey);
      expect(cap.whyItMatters).toBeDefined();
      expect(cap.whyItMatters.length).toBeGreaterThan(10);
    });

    // Verify metrics exist and are non-falsified
    expect(capabilityData.metrics.totalCapabilities).toBeGreaterThan(0);
    expect(capabilityData.metrics.practicedCount).toBeGreaterThanOrEqual(1);
    expect(capabilityData.metrics.demonstratedCount).toBe(0);

    // Verify single concrete next action is provided
    expect(capabilityData.nextAction).toBeDefined();
    expect(capabilityData.nextAction.route).toBe('/');
    expect(capabilityData.nextAction.buttonLabel).toContain('Now');
  });

  test('projects provide first-class career evidence without duplicating records', () => {
    const mockRoadmapWithProject = [
      {
        id: 'subj-proj',
        name: 'Embedded Systems',
        phases: [
          {
            id: 'ph2',
            name: 'Microcontroller Peripherals',
            tasks: [
              {
                id: 't-proj-1',
                name: 'Temperature Monitor & Data Logger Project',
                completed: true,
                subtasks: [
                  { id: 'st-p1', name: 'Wire ADC Thermistor', completed: true },
                  { id: 'st-p2', name: 'Write Bare-Metal C firmware', completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityData = resolveCapabilityMap(mockRoadmapWithProject, []);
    const analogCap = capabilityData.clusters
      .flatMap(c => c.capabilities)
      .find(c => c.id === 'cap-analog' || c.id === 'cap-c');

    expect(analogCap).toBeDefined();
    expect(analogCap.evidence.some(e => e.includes('Temperature Monitor') || e.includes('practical') || e.includes('Verified'))).toBe(true);
  });

  test('developing areas are limited to 1-3 items to prevent deficit overwhelm', () => {
    const capabilityData = resolveCapabilityMap([], []);
    expect(capabilityData.developingAreas.length).toBeLessThanOrEqual(3);
    expect(capabilityData.developingAreas.length).toBeGreaterThanOrEqual(1);
  });

  test('resolvePlacementExpectations returns 5 grounded employer evaluation pillars', () => {
    const mockRoadmap = [
      {
        id: 'subj-1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph1',
            name: 'Circuits',
            tasks: [
              {
                id: 't-proj',
                name: 'Temperature Monitor Project',
                completed: true,
                subtasks: [{ id: 'st1', name: 'Calibrate thermistor', completed: true }]
              }
            ]
          }
        ]
      }
    ];

    const expectations = require('../utils/trajectoryResolver').resolvePlacementExpectations(mockRoadmap);
    expect(expectations.length).toBe(5);

    const areas = expectations.map(e => e.area);
    expect(areas).toContain('Technical Foundations');
    expect(areas).toContain('Practical Capability');
    expect(areas).toContain('Systematic Problem Solving & Debugging');
    expect(areas).toContain('Working Engineering Projects');
    expect(areas).toContain('Technical Communication & Documentation');

    // Projects pillar should be marked demonstrated given the completed project
    const projectItem = expectations.find(e => e.id === 'projects');
    expect(projectItem.statusKey).toBe('DEMONSTRATED');
    expect(projectItem.evidence).toContain('Temperature Monitor Project');
  });

  test('multi-trajectory switching works seamlessly and persists organization and industry', () => {
    updateTrajectoryDestination({
      activeTrajectoryId: 'secondary',
      role: 'Master\'s in Robotics & Control',
      timeline: '2028 Fall',
      organization: 'MIT Robotics Lab',
      industry: 'Autonomous Systems',
      mode: 'academic'
    });

    const dest = resolveTrajectoryDestination();
    expect(dest.activeTrajectoryId).toBe('secondary');
    expect(dest.primaryRole).toBe('Master\'s in Robotics & Control');
    expect(dest.organization).toBe('MIT Robotics Lab');
    expect(dest.industry).toBe('Autonomous Systems');
    expect(dest.mode).toBe('academic');
  });

  test('preserves lifelong master primary goal and creates current goal for imported tracks like Magician', () => {
    // Simulate initial state with lifelong embedded systems primary goal
    updateTrajectoryDestination({
      activeTrajectoryId: 'primary',
      primaryRole: 'Embedded Systems Internship',
      masterPrimaryGoal: 'Embedded Systems Internship',
      statement: 'I want to build real embedded systems and be ready for internship interviews.'
    });

    // Simulate importing an auxiliary track (e.g. Stage Magic & Illusion Architecture)
    const mockSubjects = [
      {
        id: 'subj-elec',
        name: 'Electronics & Embedded',
        phases: [{ id: 'p1', name: 'Circuits', tasks: [{ id: 't1', name: 'Ohm Law', completed: true }] }]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        learnerContext: {
          targetDestination: 'Professional Illusionist & Stage Magician',
          primaryLearningGoal: 'Stage Magic & Sleight of Hand'
        },
        phases: [
          {
            id: 'p-magic-1',
            name: 'Sleight of Hand Fundamentals',
            tasks: [
              { id: 'tm1', name: 'French Drop Coin Vanish', description: 'Master optical retention vanish', completed: true },
              { id: 'tm2', name: 'Classic Pass Card Control', description: 'Execute invisible deck shift', completed: false }
            ]
          }
        ]
      }
    ];

    // When viewing Magician domain
    const magicDest = resolveTrajectoryDestination(mockSubjects, 'subj-magic');
    expect(magicDest.activeTrajectoryId).toBe('current');
    expect(magicDest.currentRole).toBe('Professional Illusionist & Stage Magician');
    // Lifelong Master Primary Goal remains protected
    expect(magicDest.masterRole).toBe('Embedded Systems Internship');

    // Scope list includes Unified, Primary, and Current
    const trajectoryTypes = magicDest.trajectories.map(t => t.type);
    expect(trajectoryTypes).toContain('UNIFIED');
    expect(trajectoryTypes).toContain('PRIMARY');
    expect(trajectoryTypes).toContain('CURRENT');
  });

  test('UNIFIED scope synthesizes capability clusters across all loaded domains (covers all)', () => {
    const mockMultiDomain = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [{ id: 'p1', name: 'Circuits', tasks: [{ id: 't1', name: 'Ohm Law', completed: true }] }]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        phases: [
          {
            id: 'p-magic',
            name: 'Sleight of Hand Manipulation',
            tasks: [
              { id: 'tm1', name: 'Coin Vanish Technique', description: 'Optical retention coin vanish', completed: true },
              { id: 'tm2', name: 'Misdirection Timing', description: 'Gaze direction management', completed: false }
            ]
          }
        ]
      }
    ];

    const unifiedDest = resolveTrajectoryDestination(mockMultiDomain, null);
    expect(unifiedDest.activeTrajectoryId).toBe('unified');
    expect(unifiedDest.primaryRole).toContain('Multi-Discipline Polymath');

    // Resolve capabilities in UNIFIED mode: covers BOTH Electronics and Stage Magic
    const unifiedCaps = resolveCapabilityMap(mockMultiDomain, [], unifiedDest, null);
    const domainNames = unifiedCaps.clusters.map(c => c.domain);
    expect(domainNames).toContain('Electronics');
    expect(domainNames).toContain('Stage Magic');

    // Both electronic capabilities and stage magic capabilities are present
    const allCapNames = unifiedCaps.clusters.flatMap(c => c.capabilities).map(c => c.name);
    expect(allCapNames.some(name => name.includes('Circuit') || name.includes('Ohm'))).toBe(true);
    expect(allCapNames.some(name => name.includes('Coin Vanish') || name.includes('Sleight'))).toBe(true);
  });

  test('CURRENT scope dynamically generates domain capability clusters from subject phases without hardcoding circuits', () => {
    const magicSubject = {
      id: 'subj-magic',
      name: 'Stage Magic',
      learnerContext: {
        targetDestination: 'Stage Magician'
      },
      phases: [
        {
          id: 'p-magic-1',
          name: 'Psychological Misdirection',
          tasks: [
            { id: 'tm1', name: 'Off-beat Timing Relaxation', description: 'Create cognitive tension release', completed: true },
            { id: 'tm2', name: 'Eyeline & Gaze Synchronization', description: 'Lead spectator focal point', completed: false }
          ]
        }
      ]
    };

    const dest = resolveTrajectoryDestination([magicSubject], 'subj-magic');
    const capData = resolveCapabilityMap([magicSubject], [], dest, 'subj-magic');

    expect(capData.clusters.length).toBeGreaterThanOrEqual(1);
    expect(capData.clusters[0].domain).toBe('Stage Magic');
    expect(capData.clusters[0].clusterName).toBe('Psychological Misdirection');

    const capNames = capData.clusters[0].capabilities.map(c => c.name);
    expect(capNames).toContain('Off-beat Timing Relaxation');
    expect(capNames).toContain('Eyeline & Gaze Synchronization');

    // Does NOT default to electronics / circuits for Magic!
    expect(capNames.some(name => name.includes('Ohm'))).toBe(false);
  });

  test('recommended actions and next action are derived directly from genuine imported tasks for the active domain', () => {
    const multiDomain = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'p-elec',
            name: 'Circuits',
            tasks: [
              { id: 'te1', name: 'Derive Voltage Divider Rule', description: 'Calculate series potential drops', completed: true },
              { id: 'te2', name: 'RC Low-Pass Filter SPICE Simulation', description: 'Verify -3dB cutoff frequency', completed: false }
            ]
          }
        ]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        phases: [
          {
            id: 'p-magic',
            name: 'Sleight of Hand Fundamentals',
            tasks: [
              { id: 'tm1', name: 'French Drop Coin Vanish', description: 'Master optical retention vanish and relaxation', completed: false },
              { id: 'tm2', name: 'Classic Pass Card Control', description: 'Execute invisible deck shift', completed: false }
            ]
          }
        ]
      }
    ];

    // 1. When in Stage Magic domain:
    const magicDest = resolveTrajectoryDestination(multiDomain, 'subj-magic');
    const magicCaps = resolveCapabilityMap(multiDomain, [], magicDest, 'subj-magic');

    // Next Action MUST be from Stage Magic and use genuine task details
    expect(magicCaps.nextAction).toBeDefined();
    expect(magicCaps.nextAction.domain).toBe('Stage Magic');
    expect(magicCaps.nextAction.taskName).toBe('French Drop Coin Vanish');
    expect(magicCaps.nextAction.taskDescription).toBe('French Drop Coin Vanish');
    expect(magicCaps.nextAction.whyItMatters).toContain('optical retention');
    expect(magicCaps.nextAction.buttonLabel).toContain('French Drop Coin Vanish');

    // Recommended Actions must contain Stage Magic tasks
    expect(magicCaps.recommendedActions.length).toBe(2);
    expect(magicCaps.recommendedActions[0].taskName).toBe('French Drop Coin Vanish');
    expect(magicCaps.recommendedActions[1].taskName).toBe('Classic Pass Card Control');
    // None should be electronics
    magicCaps.recommendedActions.forEach(a => {
      expect(a.domain).toBe('Stage Magic');
      expect(a.taskName).not.toContain('SPICE');
    });

    // 2. When in Electronics domain:
    const elecDest = resolveTrajectoryDestination(multiDomain, 'subj-elec');
    const elecCaps = resolveCapabilityMap(multiDomain, [], elecDest, 'subj-elec');

    expect(elecCaps.nextAction.domain).toBe('Electronics');
    expect(elecCaps.nextAction.taskName).toBe('RC Low-Pass Filter SPICE Simulation');
    expect(elecCaps.recommendedActions[0].domain).toBe('Electronics');
    expect(elecCaps.recommendedActions[0].taskName).toBe('RC Low-Pass Filter SPICE Simulation');
  });

  test('interdisciplinary learning isolates domains cleanly: tasks from Stage Magic never match Low-Level C despite containing words with c', () => {
    const multiDomain = [
      {
        id: 'subj-elec',
        name: 'Electronics & Embedded',
        phases: [
          {
            id: 'p-c',
            name: 'Firmware Architecture',
            tasks: [
              { id: 't-e1', name: 'Resistor Voltage Divider', description: 'Calculate node voltages without notes', completed: false }
            ]
          }
        ]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        phases: [
          {
            id: 'p-magic',
            name: 'Sleight of Hand Fundamentals',
            tasks: [
              // Has 'c' in coin, 'c' in retention, 'c' in classic, 'c' in control
              { id: 'tm1', name: 'French Drop Coin Vanish', description: 'Master optical retention vanish and muscle relaxation', completed: true },
              { id: 'tm2', name: 'Classic Pass Card Control', description: 'Execute invisible deck shift under psychological cover', completed: false }
            ]
          }
        ]
      }
    ];

    // In UNIFIED mode:
    const unifiedDest = resolveTrajectoryDestination(multiDomain, null);
    const capData = resolveCapabilityMap(multiDomain, [], unifiedDest, null);

    // Find C capability cluster from embedded systems
    const cCluster = capData.clusters.find(c => c.clusterName === 'Firmware & Architecture');
    expect(cCluster).toBeDefined();

    const cCap = cCluster.capabilities.find(c => c.id === 'cap-c');
    expect(cCap).toBeDefined();

    // Since 'French Drop Coin Vanish' is completed in Magic, it must NOT mark Low-Level C as demonstrated or practiced!
    expect(cCap.statusKey).toBe('NOT_EXPLORED');
    expect(cCap.evidence).toContain('No demonstrated capability yet.');
    expect(cCap.matchingTasksCount).toBe(0);
  });

  test('UNIFIED scope generates Cross-Discipline Synthesis cluster and balances cross-domain recommended actions', () => {
    const multiDomain = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'p1',
            name: 'Circuits',
            tasks: [
              { id: 't1', name: 'Ohm Law Derivation', completed: true },
              { id: 't2', name: 'RC Filter Design', completed: false }
            ]
          }
        ]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        phases: [
          {
            id: 'p2',
            name: 'Sleight Mechanics',
            tasks: [
              { id: 't3', name: 'French Drop Coin Vanish', completed: true },
              { id: 't4', name: 'Classic Pass Card Control', completed: false }
            ]
          }
        ]
      }
    ];

    const dest = resolveTrajectoryDestination(multiDomain, null);
    const capData = resolveCapabilityMap(multiDomain, [], dest, null);

    // 1. Cross-Discipline Synthesis Cluster exists
    const synthesisCluster = capData.clusters.find(c => c.clusterName === 'Cross-Discipline Synthesis');
    expect(synthesisCluster).toBeDefined();
    expect(synthesisCluster.capabilities.length).toBe(3);

    // Because progress was made in both Electronics (Ohm Law) and Stage Magic (French Drop):
    const transferCap = synthesisCluster.capabilities.find(c => c.id === 'cap-interdisciplinary-transfer');
    expect(transferCap.statusKey).toBe('DEMONSTRATED');
    expect(transferCap.evidence[0]).toContain('Electronics and Stage Magic');

    // 2. Recommended actions round-robin interleave across the two disciplines
    expect(capData.recommendedActions.length).toBe(2);
    const domainsInRecommended = capData.recommendedActions.map(a => a.domain);
    expect(domainsInRecommended).toContain('Electronics');
    expect(domainsInRecommended).toContain('Stage Magic');
  });

  test('resolvePlacementExpectations accurately evaluates multidisciplinary milestones across active domains', () => {
    const multiDomainWithWork = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'p1',
            name: 'Circuits Foundation',
            tasks: [
              { id: 't1', name: 'Ohm Law Derivation', completed: true, subtasks: [{ id: 'st1', name: 'Derive V=IR', completed: true }] }
            ]
          }
        ]
      },
      {
        id: 'subj-magic',
        name: 'Stage Magic',
        phases: [
          {
            id: 'p2',
            name: 'Performance Capstones',
            tasks: [
              { id: 't2', name: 'Coin Vanish Routine Capstone', completed: true, subtasks: [{ id: 'st2', name: 'Perform without angles', completed: true }] }
            ]
          }
        ]
      }
    ];

    const placement = require('../utils/trajectoryResolver').resolvePlacementExpectations(multiDomainWithWork);
    expect(placement.length).toBe(5);

    const foundations = placement.find(p => p.id === 'foundations');
    const projects = placement.find(p => p.id === 'projects');

    expect(foundations.statusKey).toBe('DEMONSTRATED');
    expect(foundations.evidence).toContain('completed milestone(s) across active disciplines');

    expect(projects.statusKey).toBe('DEMONSTRATED');
    expect(projects.evidence).toContain('Coin Vanish Routine Capstone');
  });

  test('allows user to add multiple custom interests (e.g. 10 concepts) into Trajectory Scope and enforces exactly one Primary', () => {
    // 10 distinct technical concepts / interests
    const tenConcepts = [
      'Circuit Analysis & Ohm\'s Law',
      'RC Timing & Filter Synthesis',
      'Digital Logic & Level Shifting',
      'Low-Level C & Register Masks',
      'Microcontroller GPIO & Peripherals',
      'UART Serial Communication',
      'SPI & I2C Bus Arbitration',
      'RTOS Task Scheduling & Semaphores',
      'Bare-Metal Interrupt Handlers',
      'Closed-Loop PID Motor Actuation'
    ];

    // Add all 10 concepts as secondary interests
    tenConcepts.forEach((conceptName) => {
      addTrajectoryInterest({
        role: conceptName,
        statement: `Master genuine derivation and bench execution for ${conceptName}.`,
        timeline: '3 Months',
        industry: 'Embedded Hardware & Systems',
        mode: 'career',
        setAsPrimary: false
      });
    });

    const dest = resolveTrajectoryDestination();
    // Scope includes Unified + 1 Primary + Default Secondary + Default Project + 10 custom concepts = 14 items
    expect(dest.trajectories.length).toBeGreaterThanOrEqual(12);

    // Exactly ONE trajectory is PRIMARY
    const primaryItems = dest.trajectories.filter(t => t.type === 'PRIMARY');
    expect(primaryItems.length).toBe(1);
    expect(primaryItems[0].id).toBe('primary');

    // All custom concepts are marked SECONDARY
    const secondaryItems = dest.trajectories.filter(t => t.type === 'SECONDARY');
    expect(secondaryItems.length).toBeGreaterThanOrEqual(10);
    tenConcepts.forEach((name) => {
      const found = dest.trajectories.find(t => t.role === name);
      expect(found).toBeDefined();
      expect(found.type).toBe('SECONDARY');
    });
  });

  test('marking any Secondary interest as Primary promotes it and automatically reclassifies former Primary as Secondary', () => {
    // Add a specific custom interest: "FPGA Digital Signal Processing"
    addTrajectoryInterest({
      id: 'interest-fpga',
      role: 'FPGA Digital Signal Processing',
      statement: 'Synthesize pipeline FFTs and systolic matrix multipliers on Xilinx UltraScale.',
      timeline: '2027 Autumn',
      mode: 'research',
      setAsPrimary: false
    });

    let dest = resolveTrajectoryDestination();
    const fpgaBefore = dest.trajectories.find(t => t.id === 'interest-fpga');
    expect(fpgaBefore.type).toBe('SECONDARY');

    // Now promote FPGA to Primary
    setPrimaryTrajectory('interest-fpga');

    dest = resolveTrajectoryDestination();

    // Verify FPGA is now the ONE and ONLY Primary
    const primaryItems = dest.trajectories.filter(t => t.type === 'PRIMARY');
    expect(primaryItems.length).toBe(1);
    expect(primaryItems[0].id).toBe('interest-fpga');
    expect(dest.masterRole).toBe('FPGA Digital Signal Processing');

    // The former Primary ('primary') is now reclassified as SECONDARY
    const formerPrimary = dest.trajectories.find(t => t.id === 'primary');
    expect(formerPrimary.type).toBe('SECONDARY');
  });

  test('removing a custom secondary interest removes it from scope without disturbing Primary', () => {
    addTrajectoryInterest({
      id: 'interest-temp-delete',
      role: 'Temporary Quantum Computing Exploration',
      statement: 'Short term curiosity.',
      setAsPrimary: false
    });

    let dest = resolveTrajectoryDestination();
    expect(dest.trajectories.some(t => t.id === 'interest-temp-delete')).toBe(true);

    // Remove the interest
    removeTrajectoryInterest('interest-temp-delete');

    dest = resolveTrajectoryDestination();
    expect(dest.trajectories.some(t => t.id === 'interest-temp-delete')).toBe(false);

    // Primary remains intact
    const primaryItems = dest.trajectories.filter(t => t.type === 'PRIMARY');
    expect(primaryItems.length).toBe(1);
  });
});


