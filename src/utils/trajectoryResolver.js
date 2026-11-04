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
import { calculateTopicRevisionStatus } from '../services/revisionReminderService';

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
    id: 'unified',
    type: 'UNIFIED',
    label: 'All Tracks',
    role: 'Multi-Discipline Engineering Polymath',
    statement: 'Synthesize demonstrable capability across all active learning tracks.',
    timeline: 'Continuous Growth',
    industry: 'Multidisciplinary Systems & Applied Sciences',
    organization: 'Self-Directed Master Polymath',
    mode: 'mastery'
  },
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
 * Resolves current trajectory destination metadata from identity, subjects, and selected domain.
 * Separates the user's permanent Primary Goal (Master Vision) from the Current Domain Goal (Active Track),
 * and provides a Unified Scope that covers all active subjects simultaneously.
 */
export function resolveTrajectoryDestination(subjects = [], selectedSubjectId = null) {
  const identity = loadIdentity();
  const dest = identity?.destination || {};

  // Master overarching primary goal (protected from being overwritten by individual domain imports)
  // Master overarching primary goal (protected from being overwritten by individual domain imports)
  let masterRole = dest.masterPrimaryGoal ||
    (dest.primaryGoal && !['magician', 'creative human'].includes(dest.primaryGoal.toLowerCase()) ? dest.primaryGoal : null) ||
    'Embedded Systems Internship';
  const masterStatement = dest.masterStatement ||
    (dest.statement && dest.statement.includes('real embedded') ? dest.statement : null) ||
    'I want to build real embedded systems and be ready for internship interviews.';
  const masterTimeline = dest.masterTimeline || dest.targetTimeline || 'June 2027';
  const masterOrg = dest.masterOrganization || dest.organization || 'Tier-1 Core Engineering';
  const masterIndustry = dest.masterIndustry || dest.industry || 'Consumer Hardware & Robotics';
  const masterMode = dest.masterMode || dest.mode || 'career';

  // Active Subject based on selectedSubjectId
  const activeSubject = selectedSubjectId
    ? (subjects || []).find(s => s.id === selectedSubjectId)
    : (subjects && subjects.length > 0 ? subjects[0] : null);

  const activeSubjectGoal = activeSubject?.learnerContext?.targetDestination ||
    activeSubject?.learnerContext?.destination ||
    activeSubject?.learnerContext?.primaryLearningGoal ||
    (activeSubject?.name ? `${activeSubject.name} Focus` : 'Active Domain Track');

  const activeSubjectStatement = activeSubject?.learnerContext?.statement ||
    (activeSubject?.name ? `Focused progression on ${activeSubject.name}.` : 'Active domain focus.');

  // Build dynamic trajectories list
  const trajectoriesList = [];

  // 1. ALL TRACKS (UNIFIED SCOPE - COVERS ALL)
  const allDomainNames = (subjects || []).map(s => s.name).filter(Boolean);
  const unifiedRole = allDomainNames.length > 1
    ? `Multi-Discipline Polymath (${allDomainNames.slice(0, 2).join(' + ')}${allDomainNames.length > 2 ? ' +' + (allDomainNames.length - 2) : ''})`
    : (allDomainNames[0] ? `Unified Synthesis (${allDomainNames[0]})` : 'Multi-Discipline Engineering Polymath');

  trajectoriesList.push({
    id: 'unified',
    type: 'UNIFIED',
    label: 'All Tracks (Covers All)',
    role: unifiedRole,
    statement: `Synthesize demonstrable capabilities across all ${(subjects || []).length || 1} active learning domains.`,
    timeline: 'Comprehensive Portfolio',
    industry: 'Multidisciplinary Systems & Applied Sciences',
    organization: 'Self-Directed Master Polymath',
    mode: 'mastery',
    subjectId: null
  });

  // Determine designated Primary Trajectory ID
  const savedList = dest.trajectoriesList || [];
  const designatedPrimaryId = dest.primaryTrajectoryId ||
    savedList.find(t => t.type === 'PRIMARY')?.id ||
    'primary';

  // Find saved primary or default primary
  const savedPrimary = savedList.find(t => t.id === 'primary');
  const defaultPrimaryTraj = {
    id: 'primary',
    type: designatedPrimaryId === 'primary' ? 'PRIMARY' : 'SECONDARY',
    label: designatedPrimaryId === 'primary' ? 'Primary Goal (Master Vision)' : 'Secondary Goal',
    role: savedPrimary?.role || masterRole,
    statement: savedPrimary?.statement || masterStatement,
    timeline: savedPrimary?.timeline || masterTimeline,
    industry: savedPrimary?.industry || masterIndustry,
    organization: savedPrimary?.organization || masterOrg,
    mode: savedPrimary?.mode || masterMode
  };
  trajectoriesList.push(defaultPrimaryTraj);

  // 3. CURRENT GOAL (Active Domain Track)
  if (activeSubject) {
    trajectoriesList.push({
      id: 'current',
      type: 'CURRENT',
      label: 'Current Goal (Active Track)',
      role: activeSubjectGoal,
      statement: activeSubjectStatement,
      timeline: activeSubject.learnerContext?.targetHorizon || 'Active Focus',
      industry: activeSubject.fieldIntelligence?.epistemicTier || activeSubject.name || 'Current Domain',
      organization: activeSubject.name,
      mode: 'career',
      subjectId: activeSubject.id
    });
  }

  // 4. Any other loaded domain subjects as individual track scopes
  if (subjects && subjects.length > 1) {
    subjects.forEach(s => {
      if (activeSubject && s.id === activeSubject.id) return; // already represented as CURRENT
      const sGoal = s.learnerContext?.targetDestination || s.learnerContext?.destination || `${s.name} Specialist`;
      trajectoriesList.push({
        id: `track-${s.id}`,
        type: 'TRACK',
        label: s.name,
        role: sGoal,
        statement: `Develop capability in ${s.name}.`,
        timeline: s.learnerContext?.targetHorizon || 'Domain Track',
        industry: s.name,
        organization: s.name,
        mode: 'career',
        subjectId: s.id
      });
    });
  }

  // 5. Load and preserve all secondary, project, and custom interests
  // (allows learner to add 10+ custom concepts/interests to scope)
  if (savedList && savedList.length > 0) {
    savedList.forEach(t => {
      if (['unified', 'current'].includes(t.id) || t.id.startsWith('track-')) return;
      if (t.id === 'primary') {
        // already handled by defaultPrimaryTraj
        return;
      }
      if (!trajectoriesList.some(item => item.id === t.id)) {
        trajectoriesList.push({
          ...t,
          type: t.id === designatedPrimaryId ? 'PRIMARY' : 'SECONDARY',
          label: t.id === designatedPrimaryId ? 'Primary Goal' : (t.label || 'Secondary Goal')
        });
      }
    });
  } else {
    // Default fallback secondary and project if no saved list exists
    if (!trajectoriesList.some(item => item.id === 'secondary')) {
      trajectoriesList.push({
        ...DEFAULT_TRAJECTORIES[2],
        type: designatedPrimaryId === 'secondary' ? 'PRIMARY' : 'SECONDARY'
      });
    }
    if (!trajectoriesList.some(item => item.id === 'project')) {
      trajectoriesList.push({
        ...DEFAULT_TRAJECTORIES[3],
        type: designatedPrimaryId === 'project' ? 'PRIMARY' : 'SECONDARY'
      });
    }
  }

  // Also include any custom interests saved in dest.customInterests not yet in list
  if (Array.isArray(dest.customInterests)) {
    dest.customInterests.forEach(ci => {
      if (!trajectoriesList.some(item => item.id === ci.id)) {
        trajectoriesList.push({
          ...ci,
          type: ci.id === designatedPrimaryId ? 'PRIMARY' : 'SECONDARY',
          label: ci.id === designatedPrimaryId ? 'Primary Goal' : (ci.label || 'Secondary Goal')
        });
      }
    });
  }

  // ENFORCE INVARIANT: Exactly ONE Primary trajectory, everything else (except UNIFIED, CURRENT, TRACK) is SECONDARY!
  let primaryFound = false;
  trajectoriesList.forEach(t => {
    if (t.id === 'unified') {
      t.type = 'UNIFIED';
      return;
    }
    if (t.id === designatedPrimaryId) {
      t.type = 'PRIMARY';
      primaryFound = true;
      masterRole = t.role || masterRole;
    } else {
      if (t.type === 'PRIMARY') {
        t.type = 'SECONDARY';
      }
      if (t.type !== 'CURRENT' && t.type !== 'TRACK') {
        t.type = 'SECONDARY';
      }
    }
  });

  // Guarantee that if designatedPrimaryId wasn't found, first non-unified becomes Primary
  if (!primaryFound) {
    const candidate = trajectoriesList.find(t => t.id !== 'unified' && t.type !== 'CURRENT' && t.type !== 'TRACK') || trajectoriesList[1];
    if (candidate) {
      candidate.type = 'PRIMARY';
      masterRole = candidate.role || masterRole;
    }
  }

  // Determine active trajectory ID
  let activeTrajectoryId = dest.activeTrajectoryId;

  if (selectedSubjectId && activeSubject) {
    // Specific subject is active in Topbar
    const isMasterSubject = activeSubject.name && masterRole &&
      (masterRole.toLowerCase().includes(activeSubject.name.toLowerCase()) ||
       activeSubject.name.toLowerCase().includes('embedded') ||
       activeSubject.name.toLowerCase().includes('electronics'));

    if (dest.activeTrajectoryId === 'unified') {
      activeTrajectoryId = 'unified';
    } else if (isMasterSubject && dest.activeTrajectoryId === designatedPrimaryId) {
      activeTrajectoryId = designatedPrimaryId;
    } else if (dest.activeTrajectoryId && trajectoriesList.some(t => t.id === dest.activeTrajectoryId && (t.isCustom || t.id === 'secondary' || t.id.startsWith('interest-')))) {
      activeTrajectoryId = dest.activeTrajectoryId;
    } else {
      activeTrajectoryId = 'current';
    }
  } else if (selectedSubjectId === null && subjects && subjects.length > 1) {
    if (dest.activeTrajectoryId && trajectoriesList.some(t => t.id === dest.activeTrajectoryId)) {
      activeTrajectoryId = dest.activeTrajectoryId;
    } else {
      activeTrajectoryId = 'unified';
    }
  } else if (dest.activeTrajectoryId && trajectoriesList.some(t => t.id === dest.activeTrajectoryId)) {
    activeTrajectoryId = dest.activeTrajectoryId;
  } else {
    activeTrajectoryId = designatedPrimaryId;
  }

  const activeTraj = trajectoriesList.find(t => t.id === activeTrajectoryId) || trajectoriesList[0];

  return {
    activeTrajectoryId,
    trajectories: trajectoriesList,
    primaryRole: activeTraj.role,
    targetRole: activeTraj.role,
    masterRole,
    currentRole: activeSubjectGoal,
    statement: activeTraj.statement,
    targetTimeline: activeTraj.timeline,
    industry: activeTraj.industry,
    organization: activeTraj.organization,
    secondaryGoals: dest.secondaryGoals || ['Master durable fundamentals', 'Build demonstrable projects'],
    mode: activeTraj.mode || 'career',
    activeSubjectId: activeTraj.subjectId !== undefined ? activeTraj.subjectId : (selectedSubjectId || null),
    scopeType: activeTraj.type
  };
}

/**
 * Helper to dynamically extract capability clusters for ANY domain subject
 * from its competencies and/or phases and tasks.
 */
export function generateDynamicSubjectClusters(subject) {
  if (!subject) return [];

  const subjectName = subject.name || 'Domain Track';
  const colors = ['violet', 'emerald', 'blue', 'amber', 'rose', 'cyan'];

  // 1. If subject has explicit competencies array (e.g. from Universal Deep Research Charter)
  if (Array.isArray(subject.competencies) && subject.competencies.length > 0) {
    const groups = {};
    subject.competencies.forEach((comp, idx) => {
      const groupKey = comp.domain || comp.category || `${subjectName} Competencies`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(comp);
    });

    return Object.entries(groups).map(([clusterName, comps], groupIdx) => {
      return {
        clusterName,
        domain: subjectName,
        subjectId: subject.id,
        color: colors[groupIdx % colors.length],
        capabilities: comps.map((c, cIdx) => {
          const capId = c.id || `cap-${subject.id || 'subj'}-${groupIdx}-${cIdx}`;
          const name = c.name || `Competency ${cIdx + 1}`;
          const words = (name + ' ' + (c.indicators || []).join(' ')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
          const conceptMatch = Array.from(new Set(words)).slice(0, 8);

          return {
            id: capId,
            subjectId: subject.id,
            name,
            whyItMatters: c.whyItMatters || c.description || `Demonstrates core operational capability in ${name}.`,
            conceptMatch: conceptMatch.length > 0 ? conceptMatch : [name.toLowerCase()],
            sampleEvidence: c.sampleEvidence || (c.indicators && c.indicators[0]) || `Demonstrated ${name} unassisted`,
            nextStepLabel: c.nextStepLabel || name,
            pathSteps: Array.isArray(c.pathSteps) && c.pathSteps.length > 0
              ? c.pathSteps
              : [
                  `Study theoretical foundation of ${name}`,
                  `Practice fundamental drill in ${name}`,
                  `Apply ${name} in an authentic exercise`,
                  `Verify unassisted recall and execution`
                ]
          };
        })
      };
    });
  }

  // 2. If subject has phases and tasks (standard roadmap structure)
  if (Array.isArray(subject.phases) && subject.phases.length > 0) {
    return subject.phases.map((phase, pIdx) => {
      const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
      const capabilities = tasks.slice(0, 5).map((task, tIdx) => {
        const capId = `cap-${subject.id || 'subj'}-${phase.id || pIdx}-${task.id || tIdx}`;
        const name = task.name || `Task ${tIdx + 1}`;
        const taskWords = (name + ' ' + (task.description || '')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
        const conceptMatch = Array.from(new Set(taskWords)).slice(0, 8);
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

        return {
          id: capId,
          taskId: task.id,
          phaseId: phase.id,
          subjectId: subject.id,
          name,
          whyItMatters: task.description || phase.description || `Core milestone capability for ${name} in ${phase.name}.`,
          conceptMatch: conceptMatch.length > 0 ? conceptMatch : [name.toLowerCase()],
          sampleEvidence: subtasks.length > 0 ? `Completed subtask: ${subtasks[0].name}` : `Completed ${name}`,
          nextStepLabel: name,
          pathSteps: subtasks.length > 0
            ? subtasks.map(st => st.name)
            : [
                `Review first principles of ${name}`,
                `Execute practical hands-on implementation`,
                `Retain without opening reference notes`
              ]
        };
      });

      return {
        clusterName: phase.name || `Phase ${pIdx + 1}`,
        domain: subjectName,
        subjectId: subject.id,
        phaseId: phase.id,
        color: colors[pIdx % colors.length],
        capabilities: capabilities.length > 0 ? capabilities : [
          {
            id: `cap-${subject.id || 'subj'}-${pIdx}-core`,
            name: `${phase.name} Derivation`,
            whyItMatters: `Master fundamental derivations and exercises in ${phase.name}.`,
            conceptMatch: [subjectName.toLowerCase(), (phase.name || '').toLowerCase()],
            sampleEvidence: `Practiced exercises in ${phase.name}`,
            nextStepLabel: `${phase.name} Practice`,
            pathSteps: [`Explore ${phase.name}`, `Execute exercises`]
          }
        ]
      };
    });
  }

  return [];
}

/**
 * Filter out generic stop words and filler terms from concept matching
 */
export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'more', 'into',
  'some', 'will', 'when', 'what', 'are', 'was', 'were', 'how', 'all', 'any',
  'can', 'use', 'using', 'uses', 'used', 'has', 'not', 'but', 'out', 'get',
  'its', 'one', 'our', 'had', 'may', 'who', 'see', 'did', 'say', 'let',
  'per', 'via', 'about', 'across', 'after', 'also', 'down', 'each', 'even',
  'most', 'such', 'than', 'then', 'them', 'they', 'well', 'would', 'could',
  'should', 'first', 'second', 'third', 'basic', 'basics', 'fundamental',
  'fundamentals', 'study', 'learn', 'overview', 'intro', 'introduction',
  'guide', 'course', 'step', 'steps', 'week', 'phase', 'task', 'subtask',
  'module', 'chapter', 'unit', 'lesson', 'practice', 'exercise', 'drill'
]);

/**
 * Strict token and phrase concept matcher to prevent random cross-domain collisions
 */
export function matchesConcept(text = '', keywords = []) {
  if (!text || !keywords || keywords.length === 0) return false;
  const lowerText = text.toLowerCase();
  const textWords = lowerText.split(/[^a-z0-9_+-]+/).filter(Boolean);
  const wordSet = new Set(textWords);

  return keywords.some(rawKey => {
    const key = (rawKey || '').toLowerCase().trim();
    if (!key || STOP_WORDS.has(key)) return false;

    // Single-letter or short acronym: must be an exact standalone word (e.g. 'c', 'rc', 'ui')
    if (key.length <= 2) {
      return wordSet.has(key);
    }

    // Exact phrase match if key has multiple words
    if (key.includes(' ') || key.includes('-')) {
      return lowerText.includes(key);
    }

    // Exact word match
    if (wordSet.has(key)) return true;

    // Common plural and morphological endings for words >= 4 chars
    if (key.length >= 4) {
      if (wordSet.has(key + 's') || wordSet.has(key.replace(/s$/, ''))) return true;
      if (wordSet.has(key + 'es') || wordSet.has(key.replace(/es$/, ''))) return true;
      if (wordSet.has(key + 'ing') || wordSet.has(key.replace(/ing$/, ''))) return true;
      if (wordSet.has(key + 'ed') || wordSet.has(key.replace(/ed$/, ''))) return true;
    }

    return false;
  });
}

/**
 * Resolves capability map by cross-referencing required competencies
 * with the user's actual roadmap tasks, completed subtasks, and archive projects.
 * Supports Unified scope (covers all domains) as well as specific domain focuses.
 */
export function resolveCapabilityMap(roadmap = [], sessions = [], destination = null, selectedSubjectId = null) {
  const isDestValidObj = Boolean(destination && typeof destination === 'object' && !Array.isArray(destination));
  const storedIdentity = loadIdentity() || {};
  const identity = isDestValidObj
    ? { ...storedIdentity, destination: { ...(storedIdentity.destination || {}), ...destination } }
    : storedIdentity;
  const dest = identity?.destination || {};
  const activeScopeType = dest.scopeType || (dest.activeTrajectoryId === 'unified' ? 'UNIFIED' : (dest.activeTrajectoryId === 'primary' ? 'PRIMARY' : 'CURRENT'));
  const isUnified = activeScopeType === 'UNIFIED' || dest.activeTrajectoryId === 'unified';

  const allSubjects = Array.isArray(roadmap) ? roadmap : [];

  // Determine clusters based on scope
  let clusters = [];

  if (isUnified) {
    // UNIFIED (COVERS ALL): Synthesize clusters across all loaded subjects
    if (allSubjects.length > 0) {
      allSubjects.forEach(subj => {
        const sName = (subj.name || '').toLowerCase();
        if (sName.includes('embedded') || sName.includes('electronics') || sName.includes('circuit')) {
          clusters.push(...ROLE_CAPABILITY_CLUSTERS['embedded systems'].map(c => ({ ...c, subjectId: subj.id, domain: subj.name || c.domain })));
        } else if (sName.includes('software') || sName.includes('python') || sName.includes('web') || sName.includes('frontend')) {
          clusters.push(...ROLE_CAPABILITY_CLUSTERS['software & systems'].map(c => ({ ...c, subjectId: subj.id, domain: subj.name || c.domain })));
        } else {
          const dynamic = generateDynamicSubjectClusters(subj);
          if (dynamic.length > 0) {
            clusters.push(...dynamic);
          }
        }
      });

      // When multiple distinct disciplines exist, add dedicated Cross-Discipline Synthesis cluster
      if (allSubjects.length > 1) {
        const subjectNames = allSubjects.map(s => s.name).filter(Boolean);
        const crossDomainName = subjectNames.slice(0, 2).join(' & ');

        const subjectsWithProgress = allSubjects.filter(subj => {
          return (subj.phases || []).some(p => (p.tasks || []).some(t => t.completed || (t.subtasks || []).some(st => st.completed)));
        });

        const hasCrossDomainEvidence = subjectsWithProgress.length >= 2;
        const progressNames = subjectsWithProgress.map(s => s.name).join(' and ');

        clusters.push({
          clusterName: 'Cross-Discipline Synthesis',
          domain: 'Interdisciplinary Integration',
          color: 'violet',
          isCrossDiscipline: true,
          capabilities: [
            {
              id: 'cap-interdisciplinary-transfer',
              name: 'Cross-Domain Mental Model Transfer',
              whyItMatters: `Transfer first-principles models and structural heuristics across ${crossDomainName} without conceptual confusion.`,
              conceptMatch: ['synthesis', 'interdisciplinary', 'bridge', 'integration', 'transfer', 'hybrid', 'cross-domain'],
              sampleEvidence: `Synthesized foundational principles between ${crossDomainName}`,
              nextStepLabel: `Cross-domain analysis between ${crossDomainName}`,
              pathSteps: [
                `Identify structural isomorphisms between ${subjectNames[0]} and ${subjectNames[1]}`,
                `Map core operational invariants across both fields`,
                `Construct unassisted cross-domain derivation`
              ],
              customStatus: hasCrossDomainEvidence ? 'DEMONSTRATED' : (subjectsWithProgress.length === 1 ? 'PRACTICED' : 'EXPOSED'),
              customEvidence: hasCrossDomainEvidence
                ? `Demonstrated multi-disciplinary progress across ${progressNames}.`
                : (subjectsWithProgress.length === 1 ? `Practiced foundational milestones in ${progressNames}; auxiliary domain underway.` : `Cross-domain curriculum active across ${crossDomainName}.`)
            },
            {
              id: 'cap-interdisciplinary-methods',
              name: 'Multi-Disciplinary Method Synthesis',
              whyItMatters: `Combine investigative methods, rigorous problem-solving, and domain mechanics across ${crossDomainName}.`,
              conceptMatch: ['methods', 'methodology', 'heuristics', 'interdisciplinary', 'synthesis', 'polymath'],
              sampleEvidence: `Combined investigative methods from ${crossDomainName}`,
              nextStepLabel: `Synthesize dual-domain methodology`,
              pathSteps: [
                `Contrast analytical techniques between ${subjectNames[0]} and ${subjectNames[1]}`,
                `Apply problem-solving heuristics from ${subjectNames[0]} to an authentic problem in ${subjectNames[1]}`,
                `Document multi-disciplinary tradeoffs in Archive`
              ],
              customStatus: hasCrossDomainEvidence ? 'DEMONSTRATED' : (subjectsWithProgress.length === 1 ? 'PRACTICED' : 'EXPOSED'),
              customEvidence: hasCrossDomainEvidence
                ? `Applied dual-domain methods with authentic completion records in ${progressNames}.`
                : `Methodology synthesis active across ${crossDomainName}.`
            },
            {
              id: 'cap-interdisciplinary-capstone',
              name: 'Integrated Multidisciplinary Artifact',
              whyItMatters: `Design and deliver an integrated deliverable coupling techniques from both ${crossDomainName}.`,
              conceptMatch: ['capstone', 'project', 'build', 'prototype', 'artifact', 'integrated', 'mechatronic', 'hybrid'],
              sampleEvidence: `Delivered integrated artifact combining ${crossDomainName}`,
              nextStepLabel: `Design unified capstone bridging ${crossDomainName}`,
              pathSteps: [
                `Define functional requirements spanning ${subjectNames[0]} and ${subjectNames[1]}`,
                `Prototype practical demonstration with verified physical outcome`,
                `Document cross-disciplinary tradeoff retrospectives in Archive`
              ],
              customStatus: hasCrossDomainEvidence ? 'PRACTICED' : 'NOT_EXPLORED',
              customEvidence: hasCrossDomainEvidence
                ? `Integrated milestone execution active across ${progressNames}.`
                : `Awaiting completed projects bridging ${crossDomainName}.`
            }
          ]
        });
      }
    }

    if (clusters.length === 0) {
      clusters = [...ROLE_CAPABILITY_CLUSTERS['embedded systems']];
    }
  } else {
    // CURRENT / PRIMARY / TRACK SCOPE
    let targetSubject = null;

    if (dest.activeTrajectoryId?.startsWith('track-')) {
      const tId = dest.activeTrajectoryId.replace('track-', '');
      targetSubject = allSubjects.find(s => s.id === tId);
    } else if (dest.activeTrajectoryId === 'current') {
      const activeId = dest.activeSubjectId || selectedSubjectId;
      targetSubject = activeId ? allSubjects.find(s => s.id === activeId) : allSubjects[0];
    } else if (selectedSubjectId) {
      targetSubject = allSubjects.find(s => s.id === selectedSubjectId);
    } else if (allSubjects.length > 0) {
      targetSubject = allSubjects[0];
    }

    const roleKey = (dest.primaryRole || dest.role || dest.primaryGoal || '').toLowerCase();
    const isExplicitSoftwareRole = roleKey.includes('software') || roleKey.includes('python') || roleKey.includes('web') || roleKey.includes('frontend') || roleKey.includes('backend');

    if (isExplicitSoftwareRole) {
      clusters = ROLE_CAPABILITY_CLUSTERS['software & systems'];
    } else if (targetSubject) {
      const sName = (targetSubject.name || '').toLowerCase();
      if (sName.includes('embedded') || sName.includes('electronics') || sName.includes('circuit')) {
        clusters = ROLE_CAPABILITY_CLUSTERS['embedded systems'].map(c => ({ ...c, subjectId: targetSubject.id, domain: targetSubject.name || c.domain }));
      } else if (sName.includes('software') || sName.includes('python') || sName.includes('web') || sName.includes('frontend')) {
        clusters = ROLE_CAPABILITY_CLUSTERS['software & systems'].map(c => ({ ...c, subjectId: targetSubject.id, domain: targetSubject.name || c.domain }));
      } else {
        clusters = generateDynamicSubjectClusters(targetSubject);
      }
    }

    if (!clusters || clusters.length === 0) {
      if (isExplicitSoftwareRole) {
        clusters = ROLE_CAPABILITY_CLUSTERS['software & systems'];
      } else {
        clusters = ROLE_CAPABILITY_CLUSTERS['embedded systems'];
      }
    }
  }

  // Flatten all tasks and subtasks from roadmap with subjectId and subjectName
  const allTasks = [];
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        allTasks.push({
          ...tk,
          subjectId: subj.id,
          subjectName: subj.name,
          phaseId: ph.id,
          phaseName: ph.name
        });
      });
    });
  });

  const allSubtasks = allTasks.flatMap(t => (t.subtasks || []).map(st => ({
    ...st,
    parentTaskId: t.id,
    parentTaskName: t.name,
    parentCompleted: t.completed,
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    phaseId: t.phaseId,
    phaseName: t.phaseName
  })));

  // Inspect completed projects
  const completedProjects = allTasks.filter(t => {
    const name = (t.name || '').toLowerCase();
    const isProj = name.includes('project') || name.includes('build') || name.includes('monitor') || name.includes('prototype') || name.includes('capstone');
    const hasSubtasksCompleted = (t.subtasks || []).some(st => st.completed);
    return isProj && (t.completed || hasSubtasksCompleted);
  });

  let demonstratedCount = 0;
  let developingCount = 0;
  let totalCount = 0;

  const resolvedClusters = clusters.map(cluster => {
    const isCrossDomainCluster = Boolean(cluster.isCrossDiscipline);

    // Guard task candidate matching to the cluster's specific domain (no random cross-domain contamination)
    const isTaskInClusterDomain = (task) => {
      if (isCrossDomainCluster) return true;
      if (cluster.subjectId && task.subjectId) {
        return cluster.subjectId === task.subjectId;
      }
      if (cluster.domain && task.subjectName) {
        const cDom = cluster.domain.toLowerCase();
        const sDom = task.subjectName.toLowerCase();
        if (cDom === sDom) return true;
        if (cDom.includes('electronics') || cDom.includes('embedded')) {
          return sDom.includes('electronics') || sDom.includes('embedded') || sDom.includes('circuit');
        }
        return cDom.includes(sDom) || sDom.includes(cDom);
      }
      return true;
    };

    const resolvedCapabilities = cluster.capabilities.map(cap => {
      totalCount++;

      // If capability has customStatus and customEvidence (e.g. Interdisciplinary Synthesis)
      if (cap.customStatus) {
        if (cap.customStatus === 'DEMONSTRATED') demonstratedCount++;
        else if (cap.customStatus === 'PRACTICED' || cap.customStatus === 'EXPOSED') developingCount++;

        return {
          ...cap,
          statusKey: cap.customStatus,
          status: CAPABILITY_STATUSES[cap.customStatus],
          evidence: [cap.customEvidence],
          relatedRoadmapPhase: cluster.clusterName,
          pathSteps: cap.pathSteps || [],
          nextStepLabel: cap.nextStepLabel || cap.name
        };
      }

      // Domain-guarded task matching:
      const candidateTasks = allTasks.filter(isTaskInClusterDomain);
      const candidateSubtasks = allSubtasks.filter(st => isTaskInClusterDomain(st));

      const matchingTasks = candidateTasks.filter(t => {
        if (cap.taskId && t.id === cap.taskId) return true;
        const text = `${t.name} ${t.description || ''}`;
        return matchesConcept(text, cap.conceptMatch);
      });

      const matchingSubtasks = candidateSubtasks.filter(st => {
        if (cap.taskId && st.parentTaskId === cap.taskId) return true;
        const text = `${st.name} ${st.parentTaskName}`;
        return matchesConcept(text, cap.conceptMatch);
      });

      const completedMatches = matchingTasks.filter(t => t.completed);
      const completedSubtaskMatches = matchingSubtasks.filter(st => st.completed);

      // Determine honest status based on real evidence
      let statusKey = 'NOT_EXPLORED';
      let evidenceList = [];

      // Check if demonstrated in completed project strictly from the cluster's domain
      const matchingCompletedProj = completedProjects
        .filter(isTaskInClusterDomain)
        .find(p => {
          const pText = `${p.name} ${p.description || ''} ${(p.subtasks || []).map(s => s.name).join(' ')}`;
          return matchesConcept(pText, cap.conceptMatch) ||
                 (cap.id === 'cap-analog' && (pText.toLowerCase().includes('thermistor') || pText.toLowerCase().includes('adc') || pText.toLowerCase().includes('sensor') || pText.toLowerCase().includes('circuit'))) ||
                 (cap.id === 'cap-c' && (pText.toLowerCase().includes('firmware') || pText.toLowerCase().includes('c '))) ||
                 (cap.id === 'cap-integration' && isTaskInClusterDomain(p));
        });

      // Check for verified unassisted session
      const matchingVerifiedSession = (sessions || []).find(s => {
        if (s.explainWithoutNotes !== 'yes') return false;
        const sMatchesTask = matchingTasks.some(t => t.id === s.taskId) || matchingSubtasks.some(st => st.id === s.subtaskId);
        const sText = `${s.notes || ''} ${s.subtaskName || ''} ${s.taskName || ''}`;
        return sMatchesTask || (isTaskInClusterDomain({ subjectName: s.subjectName, subjectId: s.subjectId }) && matchesConcept(sText, cap.conceptMatch));
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
        const primeTaskName = completedMatches[0]?.name || completedSubtaskMatches[0]?.name;
        const totalCompleted = completedMatches.length || completedSubtaskMatches.length || 1;
        evidenceList.push(`Practiced ${totalCompleted} core task milestone(s): ${primeTaskName || 'Active roadmap exercise'}`);
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

  // ── IDENTIFY PRIMARY TRAJECTORY, PRIMARY DOMAIN & PRIMARY TARGET ──
  const savedTrajectories = dest.trajectories || dest.trajectoriesList || [];
  const designatedPrimaryTraj = savedTrajectories.find(t => t.type === 'PRIMARY') ||
    (dest.primaryTrajectoryId && savedTrajectories.find(t => t.id === dest.primaryTrajectoryId)) ||
    savedTrajectories.find(t => t.id === 'primary') ||
    savedTrajectories[0];

  const primaryTargetRole = (
    designatedPrimaryTraj?.role ||
    dest.masterPrimaryGoal ||
    dest.primaryGoal ||
    dest.primaryRole ||
    ''
  ).trim();

  const primaryTargetLower = primaryTargetRole.toLowerCase();

  // Find the primary domain subject
  let primaryDomainSubject = null;
  if (designatedPrimaryTraj?.subjectId) {
    primaryDomainSubject = allSubjects.find(s => s.id === designatedPrimaryTraj.subjectId);
  }
  if (!primaryDomainSubject && designatedPrimaryTraj?.id?.startsWith('track-')) {
    const tSubjId = designatedPrimaryTraj.id.replace('track-', '');
    primaryDomainSubject = allSubjects.find(s => s.id === tSubjId);
  }
  if (!primaryDomainSubject && primaryTargetLower) {
    primaryDomainSubject = allSubjects.find(s => {
      const sName = (s.name || '').toLowerCase();
      if (!sName) return false;
      return primaryTargetLower.includes(sName) || sName.includes(primaryTargetLower) ||
        ((primaryTargetLower.includes('embedded') || primaryTargetLower.includes('firmware')) &&
         (sName.includes('embedded') || sName.includes('electronics') || sName.includes('circuit') || sName.includes('hardware'))) ||
        ((primaryTargetLower.includes('software') || primaryTargetLower.includes('web') || primaryTargetLower.includes('frontend')) &&
         (sName.includes('software') || sName.includes('python') || sName.includes('web') || sName.includes('computer'))) ||
        ((primaryTargetLower.includes('magic') || primaryTargetLower.includes('sleight')) && sName.includes('magic'));
    });
  }
  if (!primaryDomainSubject && allSubjects.length > 0) {
    primaryDomainSubject = allSubjects[0];
  }

  const activeTraj = savedTrajectories.find(t => t.id === dest.activeTrajectoryId) ||
    savedTrajectories.find(t => t.type === 'PRIMARY') ||
    savedTrajectories[0];

  const activeScopeRole = (activeTraj?.role || dest.primaryRole || primaryTargetRole).trim();

  const isScopeUnified = isUnified || activeTraj?.type === 'UNIFIED' || dest.activeTrajectoryId === 'unified';
  const isScopePrimary = !isScopeUnified && (
    activeTraj?.type === 'PRIMARY' ||
    dest.activeTrajectoryId === 'primary' ||
    dest.activeTrajectoryId === designatedPrimaryTraj?.id
  );

  let inScopeSubjects = [];

  if (isScopeUnified) {
    // "All Tracks (Covers All)": examine all subjects across the whole system
    inScopeSubjects = allSubjects;
  } else if (isScopePrimary) {
    // "Primary Goal (Master Vision)": strictly prioritize the Primary Domain
    inScopeSubjects = primaryDomainSubject ? [primaryDomainSubject] : allSubjects;
  } else if (dest.activeTrajectoryId?.startsWith('track-')) {
    // Specific domain track
    const tId = dest.activeTrajectoryId.replace('track-', '');
    const found = allSubjects.find(s => s.id === tId);
    inScopeSubjects = found ? [found] : (primaryDomainSubject ? [primaryDomainSubject] : allSubjects);
  } else if (dest.activeTrajectoryId === 'current') {
    // Current subject from Topbar
    const activeId = dest.activeSubjectId || selectedSubjectId;
    const found = activeId ? allSubjects.find(s => s.id === activeId) : allSubjects[0];
    inScopeSubjects = found ? [found] : allSubjects;
  } else if (activeTraj) {
    // Custom Secondary interest
    let matched = null;
    if (activeTraj.subjectId) {
      matched = allSubjects.find(s => s.id === activeTraj.subjectId);
    }
    if (!matched) {
      const q = ((activeTraj.role || '') + ' ' + (activeTraj.industry || '') + ' ' + (activeTraj.label || '')).toLowerCase();
      matched = allSubjects.find(s => {
        const sName = (s.name || '').toLowerCase();
        return sName && (q.includes(sName) || sName.includes(q));
      });
    }
    inScopeSubjects = matched ? [matched] : (primaryDomainSubject ? [primaryDomainSubject] : allSubjects);
  } else if (selectedSubjectId) {
    const found = allSubjects.find(s => s.id === selectedSubjectId);
    inScopeSubjects = found ? [found] : allSubjects;
  } else {
    inScopeSubjects = primaryDomainSubject ? [primaryDomainSubject] : allSubjects;
  }

  // ── COLLECT & SCORE CANDIDATE TASKS (Primary Target, Inactive Concepts, Primary Domain) ──
  const primaryKeywords = primaryTargetLower
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  const activeScopeKeywords = (activeScopeRole || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  const completions = Array.isArray(identity?.taskCompletions) ? identity.taskCompletions : [];
  const settings = identity?.settings || {};
  const activeSessions = (Array.isArray(sessions) && sessions.length > 0) ? sessions : (identity.sessions || []);

  const buildTaskAction = (t, s, p, pIdx, isRevision = false, existingRevStatus = null) => {
    const uncompletedSubtasks = (t.subtasks || []).filter(st => !st.completed);
    const completedSubtasks = (t.subtasks || []).filter(st => st.completed);
    const inProgress = Boolean(t.inProgress || (t.subtasks || []).some(st => st.inProgress));

    // Calculate revision / inactivity status using calculateTopicRevisionStatus
    const revStatus = existingRevStatus || calculateTopicRevisionStatus({
      topic: t,
      taskCompletions: completions,
      sessions: activeSessions,
      settings
    });

    let daysInactive = revStatus.isEligible ? revStatus.daysSinceLastActivity : null;
    let isRevisionDue = Boolean(revStatus.isEligible && revStatus.isDue);
    let isInactiveConcept = Boolean(isRevisionDue || (daysInactive !== null && daysInactive >= 5));

    // Also check subtasks if task itself had no direct date
    if (!daysInactive && (t.subtasks || []).length > 0) {
      for (const st of t.subtasks) {
        const subRev = calculateTopicRevisionStatus({
          topic: st,
          taskCompletions: completions,
          sessions: activeSessions,
          settings
        });
        if (subRev.isEligible && subRev.daysSinceLastActivity !== null) {
          if (daysInactive === null || subRev.daysSinceLastActivity > daysInactive) {
            daysInactive = subRev.daysSinceLastActivity;
          }
          if (subRev.isDue) {
            isRevisionDue = true;
            isInactiveConcept = true;
          }
        }
      }
    }

    if (!daysInactive && completedSubtasks.length > 0) {
      // Partial completion in past with no recent recorded sessions -> dormant concept
      isInactiveConcept = true;
      daysInactive = 7;
    }

    // Concept text matching
    const textToMatch = `${t.name} ${t.description || ''} ${(t.subtasks || []).map(st => st.name).join(' ')}`;
    const matchesPrimary = matchesConcept(textToMatch, primaryKeywords);
    const matchesScope = matchesConcept(textToMatch, activeScopeKeywords);
    const isPrimaryDomain = Boolean(primaryDomainSubject && s.id === primaryDomainSubject.id);

    // Compute priority score
    let priorityScore = 0;
    let priorityBadge = null;

    if (isRevisionDue) {
      priorityScore += 80 + Math.min(20, (revStatus.daysOverdue || 0) * 3);
      priorityBadge = (revStatus.daysOverdue || 0) > 0
        ? `Revision Due (${revStatus.daysOverdue}d)`
        : 'Revision Due';
    } else if (isInactiveConcept) {
      priorityScore += 65 + Math.min(25, (daysInactive ? daysInactive - 5 : 0) * 3);
      priorityBadge = daysInactive ? `Inactive Concept (${daysInactive}d)` : 'Inactive Concept';
    } else if (inProgress) {
      priorityScore += 35;
      priorityBadge = 'In Progress';
    }

    if (matchesPrimary || matchesScope) {
      priorityScore += 50;
      if (!priorityBadge) priorityBadge = 'Primary Target Focus';
    }

    if (isPrimaryDomain) {
      priorityScore += 45;
      if (!priorityBadge) priorityBadge = 'Primary Domain';
    }

    // Phase sequence weighting (earlier foundations first)
    priorityScore += Math.max(0, 15 - (pIdx * 4));

    // Momentum on partially completed tasks
    if (completedSubtasks.length > 0 && !isRevision) {
      priorityScore += 10;
    }

    // Human-grounded why-it-matters explanation
    const baseWhy = t.description || p.description || `Builds practical capability in ${s.name} (${p.name}).`;
    let whyItMatters = baseWhy;
    if (isRevisionDue) {
      const overdueText = (revStatus.daysOverdue || 0) > 0 ? `${revStatus.daysOverdue}d overdue` : 'due today';
      whyItMatters = `Revision due (${overdueText}): Last practiced ${daysInactive || 10}d ago. Review now to prevent memory decay for ${primaryTargetRole || s.name}.`;
    } else if (isInactiveConcept && daysInactive) {
      whyItMatters = `Inactive concept (${daysInactive}d dormant): ${baseWhy} Practice now to preserve durable retention for ${primaryTargetRole || 'your goal'}.`;
    } else if (matchesPrimary || matchesScope) {
      whyItMatters = `Primary Target milestone for ${primaryTargetRole || s.name}: ${baseWhy}`;
    } else if (isPrimaryDomain) {
      whyItMatters = `Core foundational competency in your primary domain (${s.name}): ${baseWhy}`;
    }

    const taskTitle = isRevision ? `Revision: ${t.name}` : t.name;
    const taskDesc = isRevision
      ? `Revision drill: retain unassisted recall on ${t.name}`
      : (t.description || (uncompletedSubtasks[0]?.name ? `Focus: ${uncompletedSubtasks[0].name}` : `Milestone task in ${p.name}`));

    return {
      taskId: t.id,
      taskName: taskTitle,
      taskDescription: taskDesc,
      domain: s.name,
      subjectId: s.id,
      phaseName: p.name,
      phaseId: p.id,
      subtaskId: uncompletedSubtasks[0]?.id || null,
      subtaskName: uncompletedSubtasks[0]?.name || null,
      totalSubtasks: (t.subtasks || []).length,
      completedSubtasks: completedSubtasks.length,
      inProgress,
      isInactive: isInactiveConcept,
      daysInactive,
      isRevision,
      isPrimaryDomain,
      matchesPrimaryTarget: matchesPrimary || matchesScope,
      priorityScore,
      priorityBadge,
      whyItMatters,
      conceptMatch: (t.name + ' ' + (t.description || '')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    };
  };

  const allCandidateTasks = [];
  inScopeSubjects.forEach(s => {
    (s.phases || []).forEach((p, pIdx) => {
      (p.tasks || []).forEach(t => {
        if (!t.completed) {
          allCandidateTasks.push(buildTaskAction(t, s, p, pIdx, false));
        } else {
          // If task completed, evaluate whether it's due for revision
          const revStatus = calculateTopicRevisionStatus({
            topic: t,
            taskCompletions: completions,
            sessions: activeSessions,
            settings
          });
          if (revStatus.isEligible && (revStatus.isDue || (revStatus.daysSinceLastActivity !== null && revStatus.daysSinceLastActivity >= 10))) {
            allCandidateTasks.push(buildTaskAction(t, s, p, pIdx, true, revStatus));
          }
        }
      });
    });
  });

  // Sort candidateActionTasks by priorityScore descending
  allCandidateTasks.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (b.isPrimaryDomain !== a.isPrimaryDomain) {
      return (b.isPrimaryDomain ? 1 : 0) - (a.isPrimaryDomain ? 1 : 0);
    }
    if (b.isInactive !== a.isInactive) {
      return (b.isInactive ? 1 : 0) - (a.isInactive ? 1 : 0);
    }
    return 0;
  });
  const candidateActionTasks = allCandidateTasks;

  // Build authentic recommendedActions list directly from imported roadmap
  const recommendedActions = candidateActionTasks.slice(0, 4).map(action => ({
    id: action.taskId,
    taskId: action.taskId,
    taskName: action.taskName,
    title: action.taskName,
    taskDescription: action.taskDescription,
    description: action.taskDescription,
    domain: action.domain,
    subjectId: action.subjectId,
    phaseName: action.phaseName,
    phaseId: action.phaseId,
    subtaskId: action.subtaskId,
    subtaskName: action.subtaskName,
    inProgress: action.inProgress,
    totalSubtasks: action.totalSubtasks,
    completedSubtasks: action.completedSubtasks,
    whyItMatters: action.whyItMatters,
    conceptMatch: action.conceptMatch,
    priorityScore: action.priorityScore,
    priorityBadge: action.priorityBadge,
    isInactive: action.isInactive,
    daysInactive: action.daysInactive,
    isRevision: action.isRevision,
    isPrimaryDomain: action.isPrimaryDomain,
    matchesPrimaryTarget: action.matchesPrimaryTarget,
    buttonLabel: action.isRevision ? `Review "${action.taskName}" in Now` : `Launch "${action.taskName}" in Now`,
    route: '/'
  }));

  // Determine concrete primary next action (truthful, non-fabricated)
  let nextAction = null;
  if (recommendedActions.length > 0) {
    const top = recommendedActions[0];
    nextAction = {
      capabilityId: top.taskId,
      capabilityName: top.taskName,
      taskId: top.taskId,
      taskName: top.taskName,
      subjectId: top.subjectId,
      domain: top.domain,
      phaseId: top.phaseId,
      phaseName: top.phaseName,
      subtaskId: top.subtaskId,
      subtaskName: top.subtaskName,
      conceptMatch: top.conceptMatch,
      whyItMatters: top.whyItMatters,
      taskDescription: top.taskName,
      priorityBadge: top.priorityBadge,
      isInactive: top.isInactive,
      daysInactive: top.daysInactive,
      isRevision: top.isRevision,
      isPrimaryDomain: top.isPrimaryDomain,
      matchesPrimaryTarget: top.matchesPrimaryTarget,
      route: '/',
      buttonLabel: top.isRevision ? `Review "${top.taskName}" in Now` : `Launch ${top.taskName} in Now`
    };
  } else if (developingAreas.length > 0) {
    const target = developingAreas[0];
    nextAction = {
      capabilityId: target.id,
      capabilityName: target.name,
      conceptMatch: target.conceptMatch || [],
      whyItMatters: target.whyItMatters,
      taskDescription: target.name,
      route: '/',
      buttonLabel: `Launch ${target.name} in Now`
    };
  } else {
    const activeDomain = inScopeSubjects[0]?.name || (dest.primaryRole || 'Active Domain');
    nextAction = {
      capabilityId: 'cap-review',
      capabilityName: `${activeDomain} Mastery Verification`,
      conceptMatch: ['review', 'mastery', 'practice'],
      whyItMatters: `All foundational tasks in ${activeDomain} are completed. Verify durable unassisted recall.`,
      taskDescription: `${activeDomain} Comprehensive Review`,
      route: '/',
      buttonLabel: `Review ${activeDomain} in Now`
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
    nextAction,
    recommendedActions
  };
}

/**
 * Updates destination fields in identity storage while safely preserving master primary goal.
 */
export function updateTrajectoryDestination(updates = {}) {
  const identity = loadIdentity();
  const dest = identity.destination || {};
  let list = dest.trajectoriesList ? [...dest.trajectoriesList] : [...DEFAULT_TRAJECTORIES];
  let primaryId = dest.primaryTrajectoryId ||
    list.find(t => t.type === 'PRIMARY')?.id ||
    'primary';
  let activeId = updates.activeTrajectoryId || dest.activeTrajectoryId || primaryId;
  const role = updates.primaryRole || updates.role || updates.primaryGoal || dest.primaryGoal;

  // Master primary goal: preserve from overwrite when user or imported tracks are modifying current/unified
  let masterPrimaryGoal = dest.masterPrimaryGoal ||
    (dest.primaryGoal && !['magician', 'creative human'].includes(dest.primaryGoal.toLowerCase()) ? dest.primaryGoal : null) ||
    'Embedded Systems Internship';

  // 1. ACTION: ADD_TRAJECTORY
  if (updates.action === 'ADD_TRAJECTORY' || updates.newTrajectory) {
    const raw = updates.newTrajectory || updates;
    const isNewPrimary = Boolean(raw.setAsPrimary || raw.type === 'PRIMARY');
    const newId = raw.id || `interest-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTraj = {
      id: newId,
      type: isNewPrimary ? 'PRIMARY' : 'SECONDARY',
      label: raw.label || raw.role || 'Secondary Interest',
      role: raw.role || 'New Interest',
      statement: raw.statement || 'Explore and develop genuine capability.',
      timeline: raw.timeline || raw.targetTimeline || 'Flexible Horizon',
      industry: raw.industry || 'Technical Practice',
      organization: raw.organization || 'Independent Pursuit',
      mode: raw.mode || 'career',
      conceptKeywords: raw.conceptKeywords || [],
      isCustom: true
    };

    if (isNewPrimary) {
      primaryId = newId;
      masterPrimaryGoal = newTraj.role;
      // Demote existing primary
      list = list.map(t => t.type === 'PRIMARY' ? { ...t, type: 'SECONDARY' } : t);
    } else {
      newTraj.type = 'SECONDARY';
    }

    list.push(newTraj);
    activeId = newId;
  }
  // 2. ACTION: SET_PRIMARY
  else if (updates.action === 'SET_PRIMARY' || updates.setPrimaryId) {
    const targetId = updates.setPrimaryId || updates.targetId;
    primaryId = targetId;
    list = list.map(t => {
      if (t.id === targetId) return { ...t, type: 'PRIMARY' };
      if (t.type === 'PRIMARY') return { ...t, type: 'SECONDARY' };
      return t;
    });
    const promoted = list.find(t => t.id === targetId);
    if (promoted) {
      masterPrimaryGoal = promoted.role;
    }
    activeId = targetId;
  }
  // 3. ACTION: REMOVE_TRAJECTORY
  else if (updates.action === 'REMOVE_TRAJECTORY' || updates.removeTrajectoryId) {
    const removeId = updates.removeTrajectoryId || updates.targetId;
    list = list.filter(t => t.id !== removeId);
    if (primaryId === removeId) {
      const fallback = list.find(t => t.id !== 'unified') || list[0];
      if (fallback) {
        primaryId = fallback.id;
        list = list.map(t => t.id === primaryId ? { ...t, type: 'PRIMARY' } : t);
        masterPrimaryGoal = fallback.role;
      }
    }
    if (activeId === removeId) {
      activeId = primaryId || 'primary';
    }
  }
  // 4. Standard updates to active trajectory or explicit primary promotion
  else {
    if (updates.setAsPrimary) {
      primaryId = activeId;
      list = list.map(t => {
        if (t.id === activeId) return { ...t, type: 'PRIMARY' };
        if (t.type === 'PRIMARY') return { ...t, type: 'SECONDARY' };
        return t;
      });
      masterPrimaryGoal = role || masterPrimaryGoal;
    }

    if (activeId === primaryId && role) {
      masterPrimaryGoal = role;
    }

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
  }

  // Strict invariant: only ONE is PRIMARY, all other non-unified are SECONDARY
  let hasPrimary = false;
  list = list.map(t => {
    if (t.id === 'unified') return { ...t, type: 'UNIFIED' };
    if (t.id === primaryId) {
      hasPrimary = true;
      return { ...t, type: 'PRIMARY' };
    }
    return { ...t, type: 'SECONDARY' };
  });

  if (!hasPrimary && list.length > 0) {
    const candidate = list.find(t => t.id !== 'unified') || list[0];
    if (candidate) {
      primaryId = candidate.id;
      candidate.type = 'PRIMARY';
      masterPrimaryGoal = candidate.role;
    }
  }

  const activeTraj = list.find(t => t.id === activeId) || list[0];

  const updated = {
    ...identity,
    destination: {
      ...identity.destination,
      ...updates,
      activeTrajectoryId: activeId,
      primaryTrajectoryId: primaryId,
      masterPrimaryGoal: updates.primaryGoal || masterPrimaryGoal,
      trajectoriesList: list,
      customInterests: list.filter(t => t.isCustom),
      primaryGoal: updates.primaryGoal || masterPrimaryGoal,
      targetRole: updates.targetRole || updates.primaryRole || updates.role || identity.destination?.targetRole || activeTraj?.role,
      primaryRole: activeTraj?.role || role || masterPrimaryGoal
    }
  };
  saveIdentity(updated);
  return updated;
}

/**
 * Add a new interest / concept to Trajectory Scope
 */
export function addTrajectoryInterest(newTrajectory) {
  return updateTrajectoryDestination({
    action: 'ADD_TRAJECTORY',
    newTrajectory
  });
}

/**
 * Remove an interest from Trajectory Scope
 */
export function removeTrajectoryInterest(trajectoryId) {
  return updateTrajectoryDestination({
    action: 'REMOVE_TRAJECTORY',
    removeTrajectoryId: trajectoryId
  });
}

/**
 * Designate a specific interest as the single Primary Trajectory (demoting previous primary to secondary)
 */
export function setPrimaryTrajectory(trajectoryId) {
  return updateTrajectoryDestination({
    action: 'SET_PRIMARY',
    setPrimaryId: trajectoryId
  });
}

/**
 * Resolves placement / employer expectation mirror for Career Mode (Prompt #17)
 * Maps what technical engineering employers look for against real evidence records in the tracker.
 */
export function resolvePlacementExpectations(roadmap = [], targetRole = null) {
  const subjects = Array.isArray(roadmap) ? roadmap : [];
  const isMultiDomain = subjects.length > 1;
  const isHardwareFocus = subjects.some(s => {
    const sName = (s.name || '').toLowerCase();
    return sName.includes('embedded') || sName.includes('electronics') || sName.includes('circuit') || sName.includes('firmware') || sName.includes('hardware');
  });

  const allTasks = [];
  subjects.forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        allTasks.push({
          ...tk,
          subjectId: subj.id,
          subjectName: subj.name,
          phaseId: ph.id,
          phaseName: ph.name
        });
      });
    });
  });

  const allSubtasks = allTasks.flatMap(t => (t.subtasks || []).map(st => ({
    ...st,
    parentTaskId: t.id,
    parentTaskName: t.name,
    parentCompleted: t.completed,
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    phaseId: t.phaseId,
    phaseName: t.phaseName
  })));

  // If single hardware subject, preserve legacy hardware strings for exact backward-compatibility
  if (!isMultiDomain && isHardwareFocus) {
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

  // MULTI-DISCIPLINARY OR NON-HARDWARE GENERAL EXPECTATIONS
  const domainNames = subjects.map(s => s.name).filter(Boolean);
  const domainSummary = domainNames.length > 1
    ? domainNames.slice(0, 2).join(' and ')
    : (domainNames[0] || 'active discipline');

  // 1. Technical & Theoretical Foundations
  const foundationKeywords = ['theory', 'principle', 'law', 'concept', 'foundation', 'mechanics', 'psychology', 'math', 'physics', 'model', 'axiom', 'core', 'circuit', 'ohm', 'resistor'];
  const foundationMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return foundationKeywords.some(k => text.includes(k)) || st.phaseName?.toLowerCase().includes('foundation');
  });
  const completedFoundations = foundationMatches.filter(st => st.completed);
  const completedFoundationTasks = allTasks.filter(t => t.completed && (foundationKeywords.some(k => t.name.toLowerCase().includes(k)) || t.phaseName?.toLowerCase().includes('foundation')));
  const foundationEvidenceCount = completedFoundations.length || completedFoundationTasks.length;

  let foundationsStatusKey = 'NOT_EXPLORED';
  let foundationsEvidence = 'Not yet demonstrated. Complete foundational derivations in World/Now.';
  if (foundationEvidenceCount >= 1) {
    foundationsStatusKey = 'DEMONSTRATED';
    foundationsEvidence = isMultiDomain
      ? `Mastered foundational principles across ${foundationEvidenceCount} completed milestone(s) across active disciplines.`
      : `Mastered foundational principles across ${foundationEvidenceCount} completed milestone(s) in ${domainSummary}.`;
  } else if (foundationMatches.some(st => st.inProgress)) {
    foundationsStatusKey = 'PRACTICED';
    foundationsEvidence = `Practicing foundational principles in ${domainSummary}.`;
  }

  // 2. Practical Capability & Execution
  const practicalKeywords = ['drill', 'practice', 'technique', 'execution', 'wiring', 'coding', 'routine', 'mechanics', 'protocol', 'implementation', 'gpio', 'breadboard', 'register', 'vanish', 'pass'];
  const practicalMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return practicalKeywords.some(k => text.includes(k));
  });
  const completedPractical = practicalMatches.filter(st => st.completed);
  const completedPracticalTasks = allTasks.filter(t => t.completed && practicalKeywords.some(k => t.name.toLowerCase().includes(k)));
  const practicalEvidenceCount = completedPractical.length || completedPracticalTasks.length;

  let practicalStatusKey = 'NOT_EXPLORED';
  let practicalEvidence = 'No hands-on implementation evidence recorded yet.';
  if (practicalEvidenceCount >= 1) {
    practicalStatusKey = 'DEMONSTRATED';
    practicalEvidence = isMultiDomain
      ? `Demonstrated hands-on execution across ${practicalEvidenceCount} milestone(s) spanning ${domainSummary}.`
      : `Demonstrated hands-on execution across ${practicalEvidenceCount} milestone(s) in ${domainSummary}.`;
  }

  // 3. Problem Solving, Debugging & Diagnostic Mastery
  const debugKeywords = ['debug', 'diagnose', 'troubleshoot', 'timing', 'angle', 'misdirection', 'isolate', 'refine', 'oscilloscope', 'multimeter', 'probe', 'noise', 'measure', 'signal', 'review', 'audit'];
  const debugMatches = allSubtasks.filter(st => {
    const text = (st.name + ' ' + st.parentTaskName).toLowerCase();
    return debugKeywords.some(k => text.includes(k));
  });
  const completedDebug = debugMatches.filter(st => st.completed);
  const completedDebugTasks = allTasks.filter(t => t.completed && debugKeywords.some(k => t.name.toLowerCase().includes(k)));
  const debugEvidenceCount = completedDebug.length || completedDebugTasks.length;

  let debugStatusKey = 'NOT_EXPLORED';
  let debugEvidence = 'No instrumentation or root-cause measurement sessions recorded yet.';
  if (debugEvidenceCount >= 1) {
    debugStatusKey = 'DEMONSTRATED';
    debugEvidence = `Systematic debugging and diagnostic refinement practiced across ${debugEvidenceCount} exercise(s).`;
  }

  // 4. Working Projects & Capstone Deliverables
  const projectTasks = allTasks.filter(t => {
    const name = (t.name || '').toLowerCase();
    const phName = (t.phaseName || '').toLowerCase();
    return name.includes('project') || name.includes('capstone') || name.includes('prototype') || name.includes('routine') || name.includes('deliverable') || name.includes('build') || phName.includes('capstone') || phName.includes('project');
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
      description: isMultiDomain
        ? `First-principles models, core theory, and structural laws across ${domainSummary}.`
        : `First-principles theory, axioms, and structural models in ${domainSummary}.`,
      statusKey: foundationsStatusKey,
      status: CAPABILITY_STATUSES[foundationsStatusKey],
      evidence: foundationsEvidence
    },
    {
      id: 'practical',
      area: 'Practical Capability',
      description: isMultiDomain
        ? `Hands-on execution, authentic technique implementation, and operational drills across disciplines.`
        : `Hands-on execution and practical drills in ${domainSummary}.`,
      statusKey: practicalStatusKey,
      status: CAPABILITY_STATUSES[practicalStatusKey],
      evidence: practicalEvidence
    },
    {
      id: 'debugging',
      area: 'Systematic Problem Solving & Debugging',
      description: isMultiDomain
        ? `Root-cause isolation, error diagnostics, refinement, and cross-domain debugging under constraints.`
        : `Root-cause isolation, error diagnostics, and systematic refinement in ${domainSummary}.`,
      statusKey: debugStatusKey,
      status: CAPABILITY_STATUSES[debugStatusKey],
      evidence: debugEvidence
    },
    {
      id: 'projects',
      area: 'Working Engineering Projects',
      description: isMultiDomain
        ? `Standalone integrated projects, cross-domain capstones, and functioning deliverables with verified outcomes.`
        : `Standalone integrated projects and demonstrable deliverables with verified outcomes.`,
      statusKey: projectStatusKey,
      status: CAPABILITY_STATUSES[projectStatusKey],
      evidence: projectEvidence
    },
    {
      id: 'communication',
      area: 'Technical Communication & Documentation',
      description: 'Clear written architecture records, failure retrospectives, cross-disciplinary design tradeoffs, and reflection notes in Archive.',
      statusKey: commStatusKey,
      status: CAPABILITY_STATUSES[commStatusKey],
      evidence: commEvidence
    }
  ];
}
