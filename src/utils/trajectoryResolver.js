/**
 * trajectoryResolver.js
 *
 * LEARNING TRACKER — TRAJECTORY & CAREER ENGINE
 *
 * Philosophy:
 * 1. Connects real-world intent ("I want this future") to genuine capability.
 * 2. Not a job board, recruitment platform, or resume generator.
 * 3. Never invents fake percentages ("84% C++", "92% job ready").
 * 4. Honest capability states:
 *    - DEMONSTRATED: Verified evidence in project or derivation.
 *    - APPLIED: Used in practical task or prototype.
 *    - PRACTICED: Completed exercises / subtasks.
 *    - EXPOSED: Encountered / in-progress.
 *    - NOT EXPLORED: Not yet started.
 * 5. Supports multiple trajectories (Primary, Secondary, Project) and non-career modes
 *    (Career, Academic, Research, Project, Personal Mastery, Exploration).
 * 6. Interactive capability inspector: "Why this matters" + evidence + single next step.
 */

import { loadIdentity, saveIdentity } from './identityRealityResolver';

export const TRAJECTORY_MODES = [
  { id: 'career', label: 'Career & Placement', icon: '💼', desc: 'Internship, campus placement, or core engineering role' },
  { id: 'academic', label: 'Academic & Master\'s', icon: '🎓', desc: 'Master\'s prep, graduate research, or competitive exams' },
  { id: 'research', label: 'Research & Science', icon: '🔬', desc: 'First-principles research and laboratory investigations' },
  { id: 'project', label: 'Physical Project', icon: '🛠️', desc: 'Building a specific hardware, robotics, or software product' },
  { id: 'mastery', label: 'Personal Mastery', icon: '⚡', desc: 'Deep technical intuition and multidisciplinary polymathy' },
  { id: 'exploration', label: 'Open Exploration', icon: '🔭', desc: 'Curiosity-driven open exploration without career pressure' }
];

export const CAPABILITY_STATUSES = {
  DEMONSTRATED: { label: 'Demonstrated', glyph: '✓', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' },
  APPLIED: { label: 'Applied in Project', glyph: '▲', color: 'text-electric-600 bg-electric-50 dark:bg-electric-950/40 border-electric-300 dark:border-electric-800' },
  PRACTICED: { label: 'Practiced', glyph: '◉', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800' },
  EXPOSED: { label: 'Developing', glyph: '◐', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
  NEEDS_REVIEW: { label: 'Needs Review', glyph: '△', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' },
  NOT_EXPLORED: { label: 'Not Yet Explored', glyph: '○', color: 'text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700' }
};

/**
 * Curated domain capability clusters mapping technical roles to required competencies
 */
export const ROLE_CAPABILITY_CLUSTERS = {
  'embedded systems': [
    {
      clusterName: 'Hardware & Circuits',
      domain: 'Electronics',
      color: 'blue',
      capabilities: [
        {
          id: 'cap-analog',
          name: 'Circuit Analysis & Ohm\'s Law',
          whyItMatters: 'Essential for calculating resistor pull-ups, current limits, and voltage divider rails for ADC inputs.',
          conceptMatch: ['voltage', 'current', 'ohm', 'circuit', 'resistor'],
          sampleEvidence: 'Derived node voltages without notes; wired thermistor voltage divider',
          nextStepLabel: 'Non-inverting Op-Amp buffer circuit',
          pathSteps: [
            'Understand Ohm\'s Law and potential drop across series resistances',
            'Derive voltage divider transfer ratio without opening notes',
            'Calculate resistor thermal dissipation under continuous load',
            'Simulate circuit in SPICE under variable sensor impedance',
            'Measure physical divider circuit with multimeter and calibrate'
          ]
        },
        {
          id: 'cap-rc',
          name: 'RC Timing & Capacitors',
          whyItMatters: 'Critical for sensor noise filtering, debounce circuits, and power supply decoupling.',
          conceptMatch: ['capacitor', 'rc', 'charging', 'filtering', 'decoupling'],
          sampleEvidence: 'Measured charging curve; explained time constant without reference',
          nextStepLabel: 'Active RC low-pass filter derivation',
          pathSteps: [
            'Understand capacitive charge accumulation (Q = CV)',
            'Derive charging equation V(t) = V0(1 - e^(-t/RC))',
            'Calculate RC time constant tau and cutoff frequency',
            'Simulate low-pass filter frequency response in SPICE',
            'Measure capacitor charge curve on oscilloscope'
          ]
        },
        {
          id: 'cap-digital',
          name: 'Digital Logic & Level Shifting',
          whyItMatters: 'Bridges 3.3V microcontrollers with 5V sensors safely without blowing GPIO pins.',
          conceptMatch: ['logic', 'gate', 'digital', 'transistor', 'level shift'],
          sampleEvidence: 'Simulated MOSFET level shifter in SPICE',
          nextStepLabel: 'Bidirectional I2C level shifter circuit',
          pathSteps: [
            'Understand Boolean truth tables and digital logic thresholds',
            'Analyze N-channel MOSFET switching characteristics',
            'Design bidirectional level shifter circuit with pull-up resistors',
            'Simulate level translation between 3.3V MCU and 5V device',
            'Verify signal integrity and rise times using logic analyzer'
          ]
        }
      ]
    },
    {
      clusterName: 'Firmware & Architecture',
      domain: 'Embedded Systems',
      color: 'emerald',
      capabilities: [
        {
          id: 'cap-c',
          name: 'Low-Level C & Memory',
          whyItMatters: 'The foundation of all embedded code. Demands strict awareness of pointer manipulation, bitwise masks, and stack limits.',
          conceptMatch: ['c', 'pointer', 'bitwise', 'memory', 'registers'],
          sampleEvidence: 'Configured bare-metal register masks without vendor HAL bloat',
          nextStepLabel: 'Static ring buffer with volatile pointers',
          pathSteps: [
            'Master pointer arithmetic and the volatile keyword',
            'Manipulate 8-bit and 32-bit hardware register masks',
            'Construct safe struct layouts for packet parsing',
            'Manage static memory pools without dynamic heap allocation',
            'Compile bare-metal firmware with GCC and inspect assembly'
          ]
        },
        {
          id: 'cap-gpio',
          name: 'Microcontroller GPIO & Peripherals',
          whyItMatters: 'Enables direct digital control of actuators, LEDs, and read states from physical switches.',
          conceptMatch: ['mcu', 'gpio', 'pin', 'peripherals', 'microcontroller'],
          sampleEvidence: 'Wired and toggled active-low hardware buttons with pull-ups',
          nextStepLabel: 'Interrupt-driven GPIO input',
          pathSteps: [
            'Understand push-pull vs open-drain pin architectures',
            'Configure bitwise direction and pull-up/down register masks',
            'Implement active-low switch read with debouncing logic',
            'Drive external transistor switch from GPIO output',
            'Trigger asynchronous ISR from GPIO state transition'
          ]
        },
        {
          id: 'cap-interrupts',
          name: 'Hardware Interrupts & Timers',
          whyItMatters: 'Allows reactive, event-driven firmware that responds to asynchronous external triggers within microseconds.',
          conceptMatch: ['interrupt', 'isr', 'timer', 'pwm', 'counter'],
          sampleEvidence: 'Handled push-button edge trigger with hardware debounce ISR',
          nextStepLabel: 'Hardware timer-triggered ADC sampling',
          pathSteps: [
            'Understand interrupt vector mechanisms and ISR lifecycles',
            'Recall priority registers and interrupt flag clearing discipline',
            'Implement simple edge-triggered button ISR',
            'Simulate timer interrupt in simulator without blocking delays',
            'Deploy interrupt-driven sensor capture on physical hardware'
          ]
        }
      ]
    },
    {
      clusterName: 'Protocols & Systems',
      domain: 'Systems & Protocols',
      color: 'violet',
      capabilities: [
        {
          id: 'cap-uart',
          name: 'Serial Communication (UART / SPI / I2C)',
          whyItMatters: 'The universal language connecting sensors, memory chips, and diagnostic consoles to microcontrollers.',
          conceptMatch: ['uart', 'serial', 'spi', 'i2c', 'communication', 'protocol'],
          sampleEvidence: 'Streamed telemetry packets from sensor to PC serial monitor at 115200 baud',
          nextStepLabel: 'Framed packet protocol with checksum validation',
          pathSteps: [
            'Understand baud rate timing and frame formatting (8N1)',
            'Configure baud divisor registers and parity settings',
            'Transmit debug string character-by-character',
            'Receive telemetry packets using circular ring buffer',
            'Stream sensor data to PC serial terminal'
          ]
        },
        {
          id: 'cap-debugging',
          name: 'Hardware Debugging & Signal Probing',
          whyItMatters: 'Distinguishes competent engineers: ability to isolate whether a failure is code, soldering, power, or noise.',
          conceptMatch: ['debug', 'multimeter', 'oscilloscope', 'probe', 'noise', 'logic analyzer'],
          sampleEvidence: 'Used multimeter & oscilloscope to diagnose floating ground issue',
          nextStepLabel: 'Logic analyzer packet decoding on I2C bus',
          pathSteps: [
            'Identify common failure signatures (floating pins, ground loops, ripple)',
            'Probe power rails with multimeter under full active load',
            'Inspect clock edges and rise times on oscilloscope',
            'Decode serial protocol packets with logic analyzer',
            'Document root cause and fix in Archive reflection note'
          ]
        },
        {
          id: 'cap-integration',
          name: 'Physical System Integration',
          whyItMatters: 'Combines analog sensing, firmware control, and telemetry into a functioning standalone device.',
          conceptMatch: ['project', 'build', 'prototype', 'integration', 'system'],
          sampleEvidence: 'Completed Temperature Monitor & Data Logger end-to-end',
          nextStepLabel: 'Autonomous Sensor Node with Low-Power Sleep',
          pathSteps: [
            'Define system architecture, pin allocation, and power budget',
            'Assemble mixed-signal circuit on breadboard or prototype PCB',
            'Write unified firmware loop with non-blocking tasks',
            'Calibrate analog measurements against reference standard',
            'Package standalone prototype and verify continuous execution'
          ]
        }
      ]
    }
  ],

  'software & systems': [
    {
      clusterName: 'Core Algorithms',
      domain: 'Computer Science',
      color: 'emerald',
      capabilities: [
        {
          id: 'cap-sw-ds',
          name: 'Data Structures & Algorithmic Complexity',
          whyItMatters: 'Essential for writing performant code with predictable memory and time boundaries.',
          conceptMatch: ['algorithm', 'structure', 'complexity', 'array', 'tree'],
          sampleEvidence: 'Implemented bounded circular buffer for streaming data'
        },
        {
          id: 'cap-sw-concurrency',
          name: 'Concurrency & Async Execution',
          whyItMatters: 'Prevents blocking UI and handles parallel network and IO requests safely.',
          conceptMatch: ['async', 'thread', 'concurrency', 'event', 'mutex'],
          sampleEvidence: 'Constructed non-blocking task queue with event loops'
        }
      ]
    },
    {
      clusterName: 'Systems Engineering',
      domain: 'Systems',
      color: 'violet',
      capabilities: [
        {
          id: 'cap-sw-testing',
          name: 'Verification & Automated Testing',
          whyItMatters: 'Guarantees systems operate correctly under edge cases and prevents regression bugs.',
          conceptMatch: ['test', 'verify', 'unit', 'integration', 'ci'],
          sampleEvidence: 'Constructed automated integration test suites for core logic'
        }
      ]
    }
  ]
};

export const DEFAULT_TRAJECTORIES = [
  {
    id: 'primary',
    type: 'PRIMARY',
    label: 'Primary Target',
    role: 'Embedded Systems Internship',
    statement: 'I want to build real embedded systems and be ready for internship interviews.',
    timeline: 'June 2027',
    industry: 'Consumer Hardware & Robotics',
    organization: 'Tier-1 Core Engineering',
    mode: 'career'
  },
  {
    id: 'secondary',
    type: 'SECONDARY',
    label: 'Secondary Target',
    role: 'Master\'s Degree Preparation',
    statement: 'Deepen theoretical mathematics, signal processing, and VLSI microarchitecture.',
    timeline: 'Autumn 2028',
    industry: 'Applied Research',
    organization: 'Graduate Research Lab',
    mode: 'academic'
  },
  {
    id: 'project',
    type: 'PROJECT',
    label: 'Physical Build',
    role: 'Custom Motor Controller PCB',
    statement: 'Design and fabricate an authentic dual-motor H-bridge driver with current sensing.',
    timeline: 'Next Month',
    industry: 'Robotics Actuation',
    organization: 'Personal Hardware Lab',
    mode: 'project'
  }
];

/**
 * Resolves current trajectory destination metadata from identity and roadmap
 */
export function resolveTrajectoryDestination() {
  const identity = loadIdentity();
  const dest = identity?.destination || {};
  const activeTrajectoryId = dest.activeTrajectoryId || 'primary';
  const trajectoriesList = dest.trajectoriesList || DEFAULT_TRAJECTORIES;
  const activeTraj = trajectoriesList.find(t => t.id === activeTrajectoryId) || trajectoriesList[0];
  const role = activeTraj.role || dest.primaryRole || dest.primaryGoal || 'Embedded Systems Internship';

  return {
    activeTrajectoryId,
    trajectories: trajectoriesList,
    primaryRole: role,
    statement: activeTraj.statement || dest.statement || 'I want to become genuinely capable of building embedded systems.',
    targetTimeline: activeTraj.timeline || dest.targetTimeline || '2027 Placement',
    targetRole: activeTraj.role || dest.targetRole || role,
    industry: activeTraj.industry || dest.industry || 'Consumer Hardware & Robotics',
    organization: activeTraj.organization || dest.targetOrganization || 'Core Engineering / Tier-1',
    secondaryGoals: dest.secondaryGoals || ['Build real physical hardware', 'Understand electronics deeply'],
    mode: activeTraj.mode || dest.mode || 'career'
  };
}

/**
 * Resolves capability map by cross-referencing required competencies
 * with the user's actual roadmap tasks, completed subtasks, and archive projects
 */
export function resolveCapabilityMap(roadmap = [], sessions = [], destination = null) {
  const identity = destination ? { destination } : loadIdentity();
  const roleKey = (destination?.primaryRole || identity?.destination?.primaryGoal || '').toLowerCase();

  // Pick matching cluster definition
  let clusters = ROLE_CAPABILITY_CLUSTERS['embedded systems'];
  if (roleKey.includes('software') || roleKey.includes('python') || roleKey.includes('web')) {
    clusters = ROLE_CAPABILITY_CLUSTERS['software & systems'];
  }

  // Flatten all tasks and subtasks from roadmap
  const allTasks = [];
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        allTasks.push({
          ...tk,
          subjectName: subj.name,
          phaseName: ph.name
        });
      });
    });
  });

  const allSubtasks = allTasks.flatMap(t => (t.subtasks || []).map(st => ({
    ...st,
    parentTaskName: t.name,
    parentCompleted: t.completed
  })));

  // Inspect completed projects
  const completedProjects = allTasks.filter(t => {
    const name = (t.name || '').toLowerCase();
    const isProj = name.includes('project') || name.includes('build') || name.includes('monitor') || name.includes('prototype');
    const hasSubtasksCompleted = (t.subtasks || []).some(st => st.completed);
    return isProj && (t.completed || hasSubtasksCompleted);
  });

  let demonstratedCount = 0;
  let developingCount = 0;
  let totalCount = 0;

  const resolvedClusters = clusters.map(cluster => {
    const resolvedCapabilities = cluster.capabilities.map(cap => {
      totalCount++;

      // Match capability against roadmap tasks
      const matchingTasks = allTasks.filter(t => {
        const text = (t.name + ' ' + (t.description || '')).toLowerCase();
        return cap.conceptMatch.some(m => text.includes(m));
      });

      const matchingSubtasks = allSubtasks.filter(st => {
        const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
        return cap.conceptMatch.some(m => text.includes(m));
      });

      const completedMatches = matchingTasks.filter(t => t.completed);
      const completedSubtaskMatches = matchingSubtasks.filter(st => st.completed);

      // Determine honest status based on real evidence
      let statusKey = 'NOT_EXPLORED';
      let evidenceList = [];

      // Check if demonstrated in completed project
      const matchingCompletedProj = completedProjects.find(p => {
        const pText = (p.name + ' ' + (p.description || '') + ' ' + (p.subtasks || []).map(s => s.name).join(' ')).toLowerCase();
        return cap.conceptMatch.some(m => pText.includes(m)) ||
               (cap.id === 'cap-analog' && (pText.includes('thermistor') || pText.includes('adc') || pText.includes('sensor') || pText.includes('circuit'))) ||
               (cap.id === 'cap-c' && (pText.includes('firmware') || pText.includes('c '))) ||
               cap.id === 'cap-integration';
      });

      // Check for verified unassisted session
      const matchingVerifiedSession = (sessions || []).find(s => {
        if (s.explainWithoutNotes !== 'yes') return false;
        const sMatchesTask = matchingTasks.some(t => t.id === s.taskId) || matchingSubtasks.some(st => st.id === s.subtaskId);
        const sText = ((s.notes || '') + ' ' + (s.subtaskName || '') + ' ' + (s.taskName || '')).toLowerCase();
        return sMatchesTask || cap.conceptMatch.some(m => sText.includes(m));
      });

      if (matchingCompletedProj) {
        statusKey = 'DEMONSTRATED';
        demonstratedCount++;
        evidenceList.push(`Demonstrated in practical project build: ${matchingCompletedProj.name}`);
        if (completedSubtaskMatches.length > 0) {
          evidenceList.push(`Completed ${completedSubtaskMatches.length} related problem-solving subtask(s)`);
        }
      } else if (matchingVerifiedSession) {
        statusKey = 'DEMONSTRATED';
        demonstratedCount++;
        evidenceList.push(`Demonstrated unassisted retrieval without reference notes: ${matchingVerifiedSession.notes?.slice(0, 45) || matchingVerifiedSession.subtaskName || 'Unassisted recall'}`);
      } else if (completedMatches.length > 0 || completedSubtaskMatches.length > 0) {
        statusKey = 'PRACTICED';
        developingCount++;
        evidenceList.push(`Practiced ${completedSubtaskMatches.length || completedMatches.length} core task(s) in active roadmap`);
      } else if (matchingTasks.some(t => t.inProgress || (t.subtasks || []).some(s => s.inProgress))) {
        statusKey = 'EXPOSED';
        developingCount++;
        evidenceList.push('Encountered in current learning phase; exercises underway');
      } else {
        statusKey = 'NOT_EXPLORED';
        evidenceList.push('No demonstrated capability yet.');
      }

      return {
        ...cap,
        statusKey,
        status: CAPABILITY_STATUSES[statusKey],
        matchingTasksCount: matchingTasks.length,
        completedSubtasksCount: completedSubtaskMatches.length,
        evidence: evidenceList.length > 0 ? evidenceList : ['No evidence recorded yet.'],
        relatedRoadmapPhase: matchingTasks[0]?.phaseName || cluster.domain,
        pathSteps: cap.pathSteps || [],
        nextStepLabel: cap.nextStepLabel || cap.name
      };
    });

    return {
      ...cluster,
      capabilities: resolvedCapabilities
    };
  });

  // Calculate gaps / developing capabilities
  const allResolvedCaps = resolvedClusters.flatMap(c => c.capabilities);
  const developingAreas = allResolvedCaps.filter(c => c.statusKey === 'EXPOSED' || c.statusKey === 'PRACTICED');
  const notExploredAreas = allResolvedCaps.filter(c => c.statusKey === 'NOT_EXPLORED');
  const practicedCount = allResolvedCaps.filter(c => c.statusKey === 'PRACTICED').length;

  // Single concrete next action
  let nextAction = null;
  if (developingAreas.length > 0) {
    const target = developingAreas[0];
    nextAction = {
      capabilityId: target.id,
      capabilityName: target.name,
      conceptMatch: target.conceptMatch || [],
      whyItMatters: target.whyItMatters,
      taskDescription: `Implement practical exercise for ${target.name}`,
      route: '/',
      buttonLabel: `Launch ${target.name} in Now`
    };
  } else if (notExploredAreas.length > 0) {
    const target = notExploredAreas[0];
    nextAction = {
      capabilityId: target.id,
      capabilityName: target.name,
      conceptMatch: target.conceptMatch || [],
      whyItMatters: target.whyItMatters,
      taskDescription: `Explore first principles and conceptual derivation of ${target.name}`,
      route: '/',
      buttonLabel: `Begin ${target.name} in Now`
    };
  } else {
    nextAction = {
      capabilityId: 'cap-integration',
      capabilityName: 'Full System Integration',
      conceptMatch: ['project', 'build', 'prototype'],
      whyItMatters: 'Demonstrate synthesized multidisciplinary capability across all embedded domains.',
      taskDescription: 'Plan and prototype advanced hardware sensor node',
      route: '/',
      buttonLabel: 'Launch Next Project in Now'
    };
  }

  return {
    clusters: resolvedClusters,
    metrics: {
      totalCapabilities: totalCount,
      demonstratedCount,
      practicedCount,
      developingCount,
      notExploredCount: Math.max(0, totalCount - demonstratedCount - developingCount)
    },
    developingAreas: developingAreas.length > 0 ? developingAreas.slice(0, 3) : notExploredAreas.slice(0, 3),
    nextAction
  };
}

/**
 * Updates destination fields in identity storage
 */
export function updateTrajectoryDestination(updates) {
  const identity = loadIdentity();
  const dest = identity.destination || {};
  const activeId = updates.activeTrajectoryId || dest.activeTrajectoryId || 'primary';
  const role = updates.primaryRole || updates.role || updates.primaryGoal || dest.primaryGoal;

  let list = dest.trajectoriesList ? [...dest.trajectoriesList] : [...DEFAULT_TRAJECTORIES];
  const idx = list.findIndex(t => t.id === activeId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates,
      role: updates.primaryRole || updates.role || list[idx].role,
      timeline: updates.targetTimeline || updates.timeline || list[idx].timeline,
      statement: updates.statement || list[idx].statement,
      industry: updates.industry || list[idx].industry,
      organization: updates.organization || list[idx].organization,
      mode: updates.mode || list[idx].mode
    };
  }

  const updated = {
    ...identity,
    destination: {
      ...identity.destination,
      ...updates,
      activeTrajectoryId: activeId,
      trajectoriesList: list,
      primaryGoal: role,
      primaryRole: role
    }
  };
  saveIdentity(updated);
  return updated;
}

/**
 * Resolves placement / employer expectation mirror for Career Mode (Prompt #17)
 * Maps what technical engineering employers look for against real evidence records in the tracker.
 */
export function resolvePlacementExpectations(roadmap = []) {
  const allTasks = [];
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        allTasks.push({
          ...tk,
          subjectName: subj.name,
          phaseName: ph.name
        });
      });
    });
  });

  const allSubtasks = allTasks.flatMap(t => (t.subtasks || []).map(st => ({
    ...st,
    parentTaskName: t.name,
    parentCompleted: t.completed
  })));

  // 1. Technical Foundations (circuits, physics, math, ohm, capacitor, diode)
  const foundationMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return ['circuit', 'ohm', 'resistor', 'capacitor', 'diode', 'semiconductor', 'physics', 'math'].some(k => text.includes(k));
  });
  const completedFoundations = foundationMatches.filter(st => st.completed);
  let foundationsStatusKey = 'NOT_EXPLORED';
  let foundationsEvidence = 'Not yet demonstrated. Complete foundational derivations in World/Now.';
  if (completedFoundations.length >= 2 || allTasks.some(t => t.completed && ['circuit', 'ohm', 'diode', 'capacitor'].some(k => t.name.toLowerCase().includes(k)))) {
    foundationsStatusKey = 'DEMONSTRATED';
    foundationsEvidence = `Derived node equations & circuit principles across ${completedFoundations.length || 1} completed milestone(s).`;
  } else if (completedFoundations.length === 1 || foundationMatches.some(st => st.inProgress)) {
    foundationsStatusKey = 'PRACTICED';
    foundationsEvidence = `Practicing foundational circuit theory; ${completedFoundations.length} subtask completed.`;
  }

  // 2. Practical Capability (breadboard, wiring, gpio, register, c, peripheral, calibrate)
  const practicalMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return ['breadboard', 'wiring', 'gpio', 'pin', 'register', 'c', 'peripheral', 'driver', 'mcu', 'calibrate'].some(k => text.includes(k));
  });
  const completedPractical = practicalMatches.filter(st => st.completed);
  let practicalStatusKey = 'NOT_EXPLORED';
  let practicalEvidence = 'No hands-on implementation evidence recorded yet.';
  if (completedPractical.length >= 2 || allTasks.some(t => t.completed && ['gpio', 'hardware', 'register', 'driver'].some(k => t.name.toLowerCase().includes(k)))) {
    practicalStatusKey = 'DEMONSTRATED';
    practicalEvidence = `Demonstrated hands-on hardware/register manipulation across ${completedPractical.length || 1} milestone(s).`;
  } else if (completedPractical.length >= 1) {
    practicalStatusKey = 'PRACTICED';
    practicalEvidence = `Direct bitwise register or bench wiring practiced in active roadmap (${completedPractical.length} milestone).`;
  }

  // 3. Systematic Problem Solving & Debugging
  const debugMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return ['debug', 'oscilloscope', 'multimeter', 'probe', 'noise', 'measure', 'ground', 'isolation', 'signal'].some(k => text.includes(k));
  });
  const completedDebug = debugMatches.filter(st => st.completed);
  let debugStatusKey = 'NOT_EXPLORED';
  let debugEvidence = 'No instrumentation or root-cause measurement sessions recorded yet.';
  if (completedDebug.length >= 2) {
    debugStatusKey = 'DEMONSTRATED';
    debugEvidence = `Signal probing and debugging practiced across ${completedDebug.length} exercises.`;
  } else if (completedDebug.length === 1) {
    debugStatusKey = 'PRACTICED';
    debugEvidence = `Practiced hardware measurement across ${completedDebug.length} exercise.`;
  }

  // 4. Working Engineering Projects
  const projectTasks = allTasks.filter(t => {
    const name = (t.name || '').toLowerCase();
    return name.includes('project') || name.includes('build') || name.includes('monitor') || name.includes('prototype');
  });
  const completedProjects = projectTasks.filter(t => t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(s => s.completed)));
  const inProgressProjects = projectTasks.filter(t => (t.subtasks || []).some(s => s.completed));
  let projectStatusKey = 'NOT_EXPLORED';
  let projectEvidence = 'No completed hardware or software project in Archive yet.';
  if (completedProjects.length > 0) {
    projectStatusKey = 'DEMONSTRATED';
    projectEvidence = `Completed project: ${completedProjects[0].name}`;
  } else if (inProgressProjects.length > 0) {
    projectStatusKey = 'APPLIED';
    projectEvidence = `Working prototype in active development: ${inProgressProjects[0].name}`;
  }

  // 5. Technical Communication & Documentation
  const notesCount = allTasks.reduce((acc, t) => acc + (t.notes ? 1 : 0) + (t.subtasks || []).filter(s => s.notes).length, 0);
  let commStatusKey = 'NOT_EXPLORED';
  let commEvidence = 'No reflection notes or documentation recorded yet.';
  if (notesCount >= 2) {
    commStatusKey = 'DEMONSTRATED';
    commEvidence = `Documented ${notesCount} technical reflection notes and design tradeoffs.`;
  } else if (notesCount === 1) {
    commStatusKey = 'PRACTICED';
    commEvidence = 'Recorded 1 technical reflection note.';
  }

  return [
    {
      id: 'foundations',
      area: 'Technical Foundations',
      description: 'First-principles circuit theory, Ohm\'s law, semiconductor physics, and mathematical derivation.',
      statusKey: foundationsStatusKey,
      status: CAPABILITY_STATUSES[foundationsStatusKey],
      evidence: foundationsEvidence
    },
    {
      id: 'practical',
      area: 'Practical Capability',
      description: 'Breadboard wiring, register-level C programming, and MCU peripheral configuration.',
      statusKey: practicalStatusKey,
      status: CAPABILITY_STATUSES[practicalStatusKey],
      evidence: practicalEvidence
    },
    {
      id: 'debugging',
      area: 'Systematic Problem Solving & Debugging',
      description: 'Isolating root causes using oscilloscope, multimeter, and logic analyzer under noise.',
      statusKey: debugStatusKey,
      status: CAPABILITY_STATUSES[debugStatusKey],
      evidence: debugEvidence
    },
    {
      id: 'projects',
      area: 'Working Engineering Projects',
      description: 'Standalone integrated hardware/software prototypes with measured physical outcomes.',
      statusKey: projectStatusKey,
      status: CAPABILITY_STATUSES[projectStatusKey],
      evidence: projectEvidence
    },
    {
      id: 'communication',
      area: 'Technical Communication & Documentation',
      description: 'Clear written architecture records, failure retrospectives, and reflection notes in Archive.',
      statusKey: commStatusKey,
      status: CAPABILITY_STATUSES[commStatusKey],
      evidence: commEvidence
    }
  ];
}
