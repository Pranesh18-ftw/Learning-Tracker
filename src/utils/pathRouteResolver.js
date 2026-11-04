/**
 * pathRouteResolver.js
 *
 * Logic engine for the PATH (Learning Route) experience.
 * Connects the WORLD (knowledge landscape) with NOW (immediate challenge).
 *
 * Answers:
 * “Given where I am, what I want to achieve, and the reality of my life, what should I do next?”
 *
 * Supports:
 * - 3 levels: Destination -> Route Stages -> Next Action / Weekly Stops
 * - Reality-aware routing: Time budget (20m, 45m, 90m) & Equipment modes (Laptop, Kit, Lab)
 * - Pedagogical rationale: "Why this comes next"
 * - 4 Task Types: CORE, PRACTICE, PROJECT, REVIEW
 * - Missed session recovery (anti-cascade, non-punitive recalibration)
 * - Bounded detours with return-to-route capability
 */

import { compareDateKeys } from './dateUtils';
import { resolveConceptGlyph } from './conceptRelationshipResolver';

/**
 * Resolves destination metadata and evidence-based capability metrics
 */
export const resolveDestination = (subject, totalSubtasks = 0, completedSubtasks = 0) => {
  if (!subject) {
    return {
      title: "Stem Learning Journey",
      domain: "Engineering & Applied Sciences",
      targetCapability: "Solve authentic technical challenges with practical capability.",
      totalCapabilities: 12,
      developingCapabilities: completedSubtasks > 0 ? Math.min(3, completedSubtasks) : 0,
      establishedMilestones: completedSubtasks,
      evidenceProjects: Math.floor(completedSubtasks / 6)
    };
  }

  const name = (subject.name || '').toLowerCase();

  if (name.includes('electronic') || name.includes('circuit')) {
    return {
      title: "Embedded Hardware & Circuit Design",
      domain: subject.name,
      targetCapability: "Design, simulate, prototype, and debug mixed-signal electronic systems from transistor level to microcontroller peripherals.",
      totalCapabilities: 14,
      developingCapabilities: completedSubtasks > 0 ? Math.min(4, Math.max(1, subject.phases?.length || 3)) : 0,
      establishedMilestones: completedSubtasks,
      evidenceProjects: Math.floor(completedSubtasks / 6)
    };
  }

  if (name.includes('embed') || name.includes('micro') || name.includes('firmware')) {
    return {
      title: "Embedded Systems Engineer",
      domain: subject.name,
      targetCapability: "Write bare-metal C drivers, configure hardware timers and interrupts, and build real-time reactive firmware.",
      totalCapabilities: 16,
      developingCapabilities: completedSubtasks > 0 ? 4 : 0,
      establishedMilestones: completedSubtasks,
      evidenceProjects: Math.floor(completedSubtasks / 5)
    };
  }

  if (name.includes('code') || name.includes('python') || name.includes('software') || name.includes('system')) {
    return {
      title: "Production Systems Architect",
      domain: subject.name,
      targetCapability: "Architect robust concurrency, manage low-level memory lifecycles, and implement robust algorithms.",
      totalCapabilities: 15,
      developingCapabilities: completedSubtasks > 0 ? 3 : 0,
      establishedMilestones: completedSubtasks,
      evidenceProjects: Math.floor(completedSubtasks / 5)
    };
  }

  return {
    title: `${subject.name} Specialist`,
    domain: subject.name,
    targetCapability: `Demonstrate capability and deep conceptual intuition across all ${subject.phases?.length || 1} domains of ${subject.name}.`,
    totalCapabilities: (subject.phases?.length || 3) * 3,
    developingCapabilities: completedSubtasks > 0 ? Math.min(3, subject.phases?.length || 1) : 0,
    establishedMilestones: completedSubtasks,
    evidenceProjects: Math.floor(completedSubtasks / 6)
  };
};

/**
 * Resolves task mode based on practical resources available
 * Available modes: CONCEPT | SIMULATE | CODE | BUILD | MEASURE | EXPLAIN
 */
export const resolveTaskMode = (taskName = '', resourceLevel = 'laptop') => {
  const text = taskName.toLowerCase();

  // If user only has laptop (no physical hardware)
  if (resourceLevel === 'laptop') {
    if (text.includes('build') || text.includes('breadboard') || text.includes('solder') || text.includes('wire')) {
      return {
        mode: 'SIMULATE',
        label: 'Simulation Route',
        tagColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        note: 'Adapted for Laptop: Model and simulate in SPICE / simulator. Reserve physical assembly for bench day.'
      };
    }
    if (text.includes('measure') || text.includes('probe') || text.includes('oscilloscope')) {
      return {
        mode: 'SIMULATE',
        label: 'Virtual Measurement',
        tagColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        note: 'Adapted for Laptop: Inspect virtual waveforms and transient response plots.'
      };
    }
  }

  // If user has full lab
  if (resourceLevel === 'lab') {
    if (text.includes('measure') || text.includes('oscilloscope') || text.includes('probe')) {
      return {
        mode: 'MEASURE',
        label: 'Lab Instrumentation',
        tagColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800',
        note: 'Hardware bench available: Probe real physical signals and record oscilloscope traces.'
      };
    }
    if (text.includes('build') || text.includes('breadboard') || text.includes('circuit')) {
      return {
        mode: 'BUILD',
        label: 'Hardware Assembly',
        tagColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
        note: 'Full hardware available: Assemble on physical breadboard and test with live power supply.'
      };
    }
  }

  // Standard kit or software modes
  if (text.includes('code') || text.includes('program') || text.includes('driver') || text.includes('firmware')) {
    return {
      mode: 'CODE',
      label: 'Implementation',
      tagColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800',
      note: 'Write, compile, and execute clean working implementations.'
    };
  }

  if (text.includes('simulate') || text.includes('model') || text.includes('spice')) {
    return {
      mode: 'SIMULATE',
      label: 'Circuit Simulation',
      tagColor: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800',
      note: 'Run transient and frequency sweeps to verify behavior before commitment.'
    };
  }

  if (text.includes('explain') || text.includes('derive') || text.includes('feynman') || text.includes('intuition')) {
    return {
      mode: 'EXPLAIN',
      label: 'Active Retrieval',
      tagColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
      note: 'Articulate the underlying physics and equations from memory without consulting notes.'
    };
  }

  if (text.includes('build') || text.includes('breadboard') || text.includes('project')) {
    return {
      mode: 'BUILD',
      label: 'Physical Build',
      tagColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
      note: 'Tactile construction and breadboard wiring.'
    };
  }

  return {
    mode: 'CONCEPT',
    label: 'Core Concept',
    tagColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800',
    note: 'Deconstruct theoretical principles and core mental models.'
  };
};

/**
 * Resolves the 4 route task types: CORE | PRACTICE | PROJECT | REVIEW
 */
export const resolveRouteType = (taskName = '', index = 0) => {
  const text = taskName.toLowerCase();

  if (text.includes('project') || text.includes('build') || text.includes('divider') || text.includes('power supply')) {
    return {
      type: 'PROJECT',
      badge: 'Project Application',
      color: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
    };
  }

  if (text.includes('review') || text.includes('recall') || text.includes('explain') || text.includes('quiz')) {
    return {
      type: 'REVIEW',
      badge: 'Retrieval Review',
      color: 'border-purple-500 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50'
    };
  }

  if (text.includes('problem') || text.includes('practice') || text.includes('calculate') || text.includes('exercise')) {
    return {
      type: 'PRACTICE',
      badge: 'Deliberate Practice',
      color: 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50'
    };
  }

  // By default, alternate core and practice
  if (index % 3 === 0) {
    return {
      type: 'CORE',
      badge: 'Core Foundation',
      color: 'border-coral-500 text-coral-700 dark:text-coral-300 bg-coral-50 dark:bg-coral-950/50'
    };
  }

  return {
    type: 'PRACTICE',
    badge: 'Deliberate Practice',
    color: 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50'
  };
};

/**
 * Explains WHY a stop exists on the route (pedagogical rationale)
 */
export const resolveWhyThisNext = (currentTaskName = '', phaseName = '', prevTaskName = '') => {
  const cur = currentTaskName.toLowerCase();
  const prev = prevTaskName.toLowerCase();

  if (cur.includes('capacitor')) {
    return "You have established voltage, current, and steady-state resistance. Capacitors introduce electrostatic energy storage and dynamic time-dependent behavior (dV/dt).";
  }

  if (cur.includes('inductor')) {
    return "Capacitors handle changing voltage; inductors mirror this by opposing instantaneous current changes through magnetic flux (dI/dt). Together they form resonators and filters.";
  }

  if (cur.includes('diode')) {
    return "Following passive linear elements (R, L, C), diodes introduce your first non-linear semiconductor barrier, permitting one-way current flow.";
  }

  if (cur.includes('transistor') || cur.includes('bjt') || cur.includes('mosfet')) {
    return "Diodes established p-n junctions. Transistors add a control terminal, unlocking electronic amplification and digital switching.";
  }

  if (cur.includes('ohm')) {
    return "Voltage is pressure and current is charge flow. Ohm's Law (V = IR) binds them into a calculable relationship required for all subsequent analysis.";
  }

  if (cur.includes('timer') || cur.includes('interrupt')) {
    return "Polling code wastes cycles. Hardware timers and interrupts allow the microcontroller to respond deterministically to asynchronous physical events.";
  }

  if (prev) {
    return `Builds directly on your work in "${prevTaskName}" by extending principles into practical application in ${phaseName}.`;
  }

  return `Core foundation milestone for ${phaseName}. Establishes prerequisite mental models needed before tackling complex circuits.`;
};

/**
 * Builds the editorial weekly route stops (01 BUILD A BASE -> 02 TEST THE IDEA -> 03 APPLY IT -> 04 REVIEW)
 * Fits into the user's available time budget (20m, 45m, 90m) and resource level.
 */
export const buildWeeklyRouteStops = (
  subject,
  activeNextTask,
  learningPlan = [],
  timeBudgetMinutes = 45,
  resourceLevel = 'laptop',
  isTaskCompleted = () => false
) => {
  if (!subject || !subject.phases) return [];

  // Flatten all tasks into a structured sequence
  const allTasks = [];
  subject.phases.forEach((phase, pIdx) => {
    (phase.tasks || []).forEach((task, tIdx) => {
      const isCompleted = isTaskCompleted(task);
      const subtasks = task.subtasks || [];
      const completedSubtasks = subtasks.filter(s => s.completed).length;
      const firstIncompleteSubtask = subtasks.find(s => !s.completed);

      // Check if scheduled in learningPlan
      const scheduledEntry = learningPlan.find(lp =>
        lp.taskId === task.id && lp.phaseId === phase.id
      );

      allTasks.push({
        id: task.id,
        taskId: task.id,
        phaseId: phase.id,
        subjectId: subject.id,
        name: task.name,
        phaseName: phase.name,
        phaseIndex: pIdx + 1,
        isCompleted,
        totalSubtasks: subtasks.length,
        completedSubtasks,
        subtasks,
        targetSubtask: firstIncompleteSubtask || subtasks[0] || null,
        scheduledDate: scheduledEntry?.scheduledDate || null,
        planEntryId: scheduledEntry?.id || null,
        glyph: resolveConceptGlyph(task.name, '', subject.name)
      });
    });
  });

  // Find index of current milestone
  let currentIndex = 0;
  if (activeNextTask) {
    const foundIdx = allTasks.findIndex(t => t.id === activeNextTask.taskId);
    if (foundIdx !== -1) currentIndex = foundIdx;
  } else {
    const firstIncompleteIdx = allTasks.findIndex(t => !t.isCompleted);
    if (firstIncompleteIdx !== -1) currentIndex = firstIncompleteIdx;
  }

  // Determine how many route stops to show based on time budget:
  // 20 min (Sprint): 2 concise stops (Core + 1 retrieval/practice)
  // 45 min (Standard): 4 structured stops (Base -> Test -> Apply -> Review)
  // 90 min (Deep Work): 5-6 expansive stops
  const stopCount = timeBudgetMinutes <= 25 ? 2 : timeBudgetMinutes <= 50 ? 4 : 5;

  const stageTemplates = [
    { code: "01", header: "BUILD A BASE", timing: "Today · Priority Stop", defaultType: "CORE" },
    { code: "02", header: "TEST THE IDEA", timing: "Next 24h · Practice Stop", defaultType: "PRACTICE" },
    { code: "03", header: "APPLY & BUILD", timing: "Milestone Stop", defaultType: "PROJECT" },
    { code: "04", header: "RETRIEVE & REVIEW", timing: "Consolidation Stop", defaultType: "REVIEW" },
    { code: "05", header: "SYNTHESIS", timing: "Capability Verification", defaultType: "PROJECT" }
  ];

  const candidateTasks = allTasks.slice(currentIndex, currentIndex + stopCount);

  // If candidate tasks ran out, fallback to earlier completed ones for reviews
  while (candidateTasks.length < stopCount && candidateTasks.length < allTasks.length) {
    const nextIdx = (currentIndex + candidateTasks.length) % allTasks.length;
    candidateTasks.push(allTasks[nextIdx]);
  }

  return candidateTasks.map((t, idx) => {
    const template = stageTemplates[idx] || stageTemplates[0];
    const prevTask = idx > 0 ? candidateTasks[idx - 1] : allTasks[Math.max(0, currentIndex - 1)];
    const why = resolveWhyThisNext(t.name, t.phaseName, prevTask?.name);
    const modeInfo = resolveTaskMode(t.name, resourceLevel);
    const routeType = resolveRouteType(t.name, idx);

    // Dynamic duration based on time budget allocation
    let estimatedMinutes = 25;
    if (timeBudgetMinutes <= 25) {
      estimatedMinutes = idx === 0 ? 15 : 10;
    } else if (timeBudgetMinutes <= 50) {
      estimatedMinutes = idx === 0 ? 20 : idx === 1 ? 15 : 10;
    } else {
      estimatedMinutes = idx === 0 ? 35 : idx === 1 ? 25 : 20;
    }

    return {
      ...t,
      stageCode: template.code,
      stageHeader: template.header,
      stageTiming: template.timing,
      whyItComesNext: why,
      modeInfo,
      routeType,
      estimatedMinutes,
      isCurrentStop: idx === 0
    };
  });
};

/**
 * Detects overdue/missed tasks from past dates and creates a non-punitive recovery route
 */
export const detectRecoveryNeeds = (learningPlan = [], todayKey) => {
  if (!learningPlan || learningPlan.length === 0 || !todayKey) {
    return { hasMissed: false, overdueCount: 0, overdueTasks: [] };
  }

  const overdue = learningPlan.filter(task => {
    if (!task.scheduledDate) return false;
    return compareDateKeys(task.scheduledDate, todayKey) < 0;
  });

  return {
    hasMissed: overdue.length > 0,
    overdueCount: overdue.length,
    overdueTasks: overdue
  };
};

/**
 * Curated STEM Detours:
 * Bounded, curious, reversible deep dives that don't destroy the main route.
 */
export const resolveDetoursForConcept = (conceptName = '') => {
  const name = (conceptName || '').toLowerCase();

  if (name.includes('capacitor')) {
    return [
      {
        id: 'detour-dielectric',
        title: "Why does dielectric breakdown happen?",
        duration: "15 min",
        mode: "CONCEPT",
        description: "Explore why ceramic, electrolytic, and tantalum capacitors behave differently at high frequencies and voltages.",
        consequence: "Deepens component selection intuition."
      },
      {
        id: 'detour-esr',
        title: "Parasitic ESR & Decoupling resonance",
        duration: "20 min",
        mode: "SIMULATE",
        description: "Simulate why real capacitors behave as inductors above their self-resonant frequency (SRF).",
        consequence: "Essential for clean digital power distribution."
      }
    ];
  }

  if (name.includes('resistor') || name.includes('ohm')) {
    return [
      {
        id: 'detour-tempco',
        title: "Thermal Coefficient & Johnson-Nyquist Noise",
        duration: "15 min",
        mode: "CONCEPT",
        description: "How temperature drift and thermal agitation create fundamental white noise in precision analog circuits.",
        consequence: "Prepares you for low-noise sensor design."
      }
    ];
  }

  if (name.includes('diode')) {
    return [
      {
        id: 'detour-reverse-recovery',
        title: "Diode Reverse Recovery Time (trr)",
        duration: "15 min",
        mode: "SIMULATE",
        description: "Observe why silicon p-n diodes fail in high-speed switching and why Schottky diodes avoid stored minority carriers.",
        consequence: "Key for switch-mode converter design."
      }
    ];
  }

  return [
    {
      id: 'detour-history',
      title: "How was this principle experimentally discovered?",
      duration: "15 min",
      mode: "EXPLAIN",
      description: "Step through the historical experiment that forced physicists to formulate this fundamental relationship.",
      consequence: "Anchors durable memory."
    }
  ];
};
