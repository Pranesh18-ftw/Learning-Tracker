/**
 * conceptRelationshipResolver.js
 *
 * Derives relational dependencies, progression topology, schematic cues,
 * and pedagogical context from the underlying roadmap data structure.
 *
 * Answers:
 * - WHERE I STARTED
 * - WHAT I KNOW
 * - WHAT I'M LEARNING (YOU ARE HERE)
 * - WHAT CONNECTS (prerequisites, consequences)
 * - WHAT COMES NEXT
 */

export const resolveConceptGlyph = (name = '', taskName = '', domain = '') => {
  const text = `${name} ${taskName} ${domain}`.toLowerCase();

  if (text.includes('capacitor') || text.includes('capacitance') || text.includes('rc circuit')) {
    return 'capacitor';
  }
  if (text.includes('resistor') || text.includes("ohm's law") || text.includes('ohms law') || text.includes('resistance')) {
    return 'resistor';
  }
  if (text.includes('inductor') || text.includes('magnetic') || text.includes('flyback')) {
    return 'inductor';
  }
  if (text.includes('diode') || text.includes('zener') || text.includes('p-n junction') || text.includes('pn junction')) {
    return 'diode';
  }
  if (text.includes('transistor') || text.includes('bjt') || text.includes('mosfet') || text.includes('saturation')) {
    return 'transistor';
  }
  if (text.includes('memory') || text.includes('stack') || text.includes('heap') || text.includes('virtual address')) {
    return 'memory';
  }
  if (text.includes('concurrency') || text.includes('mutex') || text.includes('atomic') || text.includes('thread')) {
    return 'concurrency';
  }
  if (text.includes('code') || text.includes('algorithm') || text.includes('function') || text.includes('python')) {
    return 'code';
  }
  if (text.includes('gpio') || text.includes('hardware') || text.includes('uart') || text.includes('nvic')) {
    return 'hardware';
  }

  return 'generic';
};

export const resolveWhyItMatters = (conceptName = '', taskName = '', phaseName = '') => {
  const text = `${conceptName} ${taskName} ${phaseName}`.toLowerCase();

  if (text.includes('capacitor') || text.includes('capacitance')) {
    return 'Capacitors store potential energy in an electrostatic field between conductors and oppose instantaneous voltage changes. Essential for filtering, timing, and decoupled power rails.';
  }
  if (text.includes('resistor') || text.includes('ohm')) {
    return "Ohm's Law governs how charge carriers collide and dissipate thermal energy. Every circuit relies on resistance to establish operating points, divide voltages, and limit currents.";
  }
  if (text.includes('inductor') || text.includes('flyback')) {
    return 'Inductors store kinetic energy in magnetic fields and oppose changes in current. Crucial for switch-mode supplies, buck converters, and inductive spike suppression.';
  }
  if (text.includes('diode') || text.includes('p-n junction')) {
    return 'Semiconductor junctions allow asymmetric charge drift—conducting in forward bias while establishing a depletion barrier under reverse bias. Foundational for rectification and voltage clamping.';
  }
  if (text.includes('transistor') || text.includes('bjt')) {
    return 'Transistors act as electronically controlled switches and current amplifiers. Driving a BJT into saturation drops V_CE to near zero, enabling low-power control of high-current loads.';
  }
  if (text.includes('memory') || text.includes('virtual address') || text.includes('stack')) {
    return 'The memory model provides an illusion of dedicated linear address space. Mastering stack frame lifecycles vs heap allocation eliminates memory leaks, segfaults, and corruption.';
  }
  if (text.includes('concurrency') || text.includes('mutex') || text.includes('atomic')) {
    return 'Multi-core execution demands synchronized memory visibility. Atomic compare-and-swap (CAS) and memory barriers guarantee deterministic invariants without deadlocks.';
  }
  if (text.includes('gpio') || text.includes('interrupt')) {
    return 'Direct hardware registers bridge pure software abstractions to physical electrons. Push-pull drivers, Schmitt triggers, and NVIC interrupts enable microsecond responsiveness.';
  }

  return `Core foundational principle for ${phaseName || 'this domain'}. Understanding this concept provides the necessary intuition for downstream application design.`;
};

export const resolveConceptCapabilities = (conceptName = '', taskName = '') => {
  const text = `${conceptName} ${taskName}`.toLowerCase();

  if (text.includes('capacitor')) {
    return [
      'Calculate RC time constant (τ = R·C) and 63.2% rise point',
      'Select decoupling capacitor values to suppress supply ripple',
      'Derive stored electrostatic energy (E = ½ C V²)'
    ];
  }
  if (text.includes('resistor') || text.includes('ohm')) {
    return [
      'Determine current draw across multi-branch divider networks',
      'Calculate thermal dissipation in watts to avoid burnt components',
      'Establish precise biasing reference voltages'
    ];
  }
  if (text.includes('diode')) {
    return [
      'Design diode protection clamps for reverse polarity',
      'Select Zener breakdown ratings for stable voltage regulation',
      'Predict forward threshold drops across Silicon and Germanium'
    ];
  }
  if (text.includes('transistor') || text.includes('bjt')) {
    return [
      'Calculate base resistor value (R_B) to force full saturation',
      'Identify boundary between linear active mode and full saturation',
      'Implement flyback protection for inductive loads driven by BJT'
    ];
  }
  if (text.includes('memory')) {
    return [
      'Trace pointer dereferences through virtual address space',
      'Distinguish automatic stack lifecycles from explicit heap bounds',
      'Detect alignment padding and memory leaks before production'
    ];
  }

  return [
    'Explain the governing principle clearly without consulting notes',
    'Demonstrate working application and solve practical numerical derivations',
    'Explain how this concept unlocks the next milestone in sequence'
  ];
};

/**
 * Builds the unified concept topology graph for a given subject.
 * Flattens phases and tasks into structured progression nodes while preserving
 * parent-child relations and dependencies.
 */
export const buildSubjectTopology = (subject, nextTask = null, isTaskCompleted = null) => {
  if (!subject || !Array.isArray(subject.phases)) {
    return {
      domainName: 'No Domain Loaded',
      orientationLine: 'No concepts available',
      regions: [],
      allConcepts: [],
      currentConcept: null,
      stats: { total: 0, established: 0, activeName: '' }
    };
  }

  const allConcepts = [];
  const regions = [];

  subject.phases.forEach((phase, phaseIdx) => {
    const regionConcepts = [];

    (phase.tasks || []).forEach((task, taskIdx) => {
      // Determine completion status
      const completed = isTaskCompleted
        ? isTaskCompleted(task)
        : (task.subtasks && task.subtasks.length > 0
            ? task.subtasks.every(s => s.completed)
            : Boolean(task.completed));

      const subtasks = task.subtasks || [];
      const completedSubtasksCount = subtasks.filter(s => s.completed).length;

      // Check if this task is the current milestone
      const isCurrent = Boolean(
        nextTask && (
          (nextTask.taskId && nextTask.taskId === task.id) ||
          (nextTask.id && nextTask.id === task.id) ||
          (nextTask.taskName && nextTask.taskName === task.name) ||
          (subtasks.some(s => s.id === nextTask.id || s.id === nextTask.subtaskId || s.name === nextTask.name))
        )
      );

      const glyph = resolveConceptGlyph(task.name, '', subject.name);
      const whyItMatters = task.whyItMatters || resolveWhyItMatters(task.name, '', phase.name);
      const capabilities = (Array.isArray(task.capabilities) && task.capabilities.length > 0)
        ? task.capabilities
        : resolveConceptCapabilities(task.name, '');

      const explicitPrereqs = Array.isArray(task.prerequisites) ? [...task.prerequisites] : [];
      const explicitConsequences = Array.isArray(task.consequences) ? [...task.consequences] : [];

      const conceptNode = {
        id: task.id || `concept-${phaseIdx}-${taskIdx}`,
        taskId: task.id,
        name: task.name,
        phaseId: phase.id,
        phaseName: phase.name,
        subjectId: subject.id,
        subjectName: subject.name,
        glyph,
        completed,
        isCurrent,
        subtasks,
        totalSubtasks: subtasks.length,
        completedSubtasksCount,
        time: task.time || 25,
        difficulty: task.difficulty || 'medium',
        whyItMatters,
        capabilities,
        learningUnits: Array.isArray(task.learningUnits) ? task.learningUnits : [],
        doingTasks: Array.isArray(task.doingTasks) ? task.doingTasks : [],
        depth: task.depth || null,
        practicalFailureModes: Array.isArray(task.practicalFailureModes) ? task.practicalFailureModes : [],
        highLeverageConcepts: Array.isArray(task.highLeverageConcepts) ? task.highLeverageConcepts : [],
        sourceRoadmapInfluences: Array.isArray(task.sourceRoadmapInfluences) ? task.sourceRoadmapInfluences : [],
        evidenceExpected: task.evidenceExpected || null,
        isOptional: Boolean(task.isOptional || task.optional),
        prerequisites: explicitPrereqs,
        consequences: explicitConsequences,
        connectsTo: []
      };

      regionConcepts.push(conceptNode);
      allConcepts.push(conceptNode);
    });

    const regionEstablished = regionConcepts.filter(c => c.completed).length;

    regions.push({
      id: phase.id || `region-${phaseIdx}`,
      index: phaseIdx + 1,
      name: phase.name,
      purpose: phase.purpose || phase.description || null,
      capabilitiesDeveloped: Array.isArray(phase.capabilitiesDeveloped) ? phase.capabilitiesDeveloped : [],
      whyThisAreaMatters: phase.whyThisAreaMatters || null,
      importantConcepts: Array.isArray(phase.importantConcepts) ? phase.importantConcepts : [],
      associatedProjects: Array.isArray(phase.associatedProjects) ? phase.associatedProjects : [],
      relevantResearchFindings: Array.isArray(phase.relevantResearchFindings) ? phase.relevantResearchFindings : [],
      prerequisites: Array.isArray(phase.prerequisites) ? phase.prerequisites : [],
      concepts: regionConcepts,
      totalConcepts: regionConcepts.length,
      establishedCount: regionEstablished,
      isFullyEstablished: regionConcepts.length > 0 && regionEstablished === regionConcepts.length,
      hasCurrent: regionConcepts.some(c => c.isCurrent)
    });
  });

  // Wire dependencies (linear and regional continuity, retaining explicit edges)
  allConcepts.forEach((concept, idx) => {
    // If no explicit prerequisites, link to immediate predecessor in sequence
    if (concept.prerequisites.length === 0 && idx > 0) {
      concept.prerequisites.push(allConcepts[idx - 1].name);
    }
    // If no explicit consequences, link to immediate successor in sequence
    if (concept.consequences.length === 0 && idx < allConcepts.length - 1) {
      concept.consequences.push(allConcepts[idx + 1].name);
    }
    // Connects to peers in same region
    concept.connectsTo = allConcepts
      .filter(c => c.phaseId === concept.phaseId && c.id !== concept.id)
      .map(c => c.name);
  });

  // Find or resolve current concept
  let currentConcept = allConcepts.find(c => c.isCurrent);
  if (!currentConcept) {
    currentConcept = allConcepts.find(c => !c.completed) || allConcepts[allConcepts.length - 1];
    if (currentConcept) {
      currentConcept.isCurrent = true;
    }
  }

  const establishedCount = allConcepts.filter(c => c.completed).length;
  const totalCount = allConcepts.length;
  const activeName = currentConcept?.name || 'All milestones established';

  const orientationLine = `${totalCount} concepts · ${establishedCount} established · currently learning ${activeName}`;

  return {
    subject,
    domainName: subject.name,
    orientationLine,
    regions,
    allConcepts,
    currentConcept,
    fieldIntelligence: subject.fieldIntelligence || null,
    projects: Array.isArray(subject.projects) ? subject.projects : [],
    competencies: Array.isArray(subject.competencies) ? subject.competencies : [],
    specializations: Array.isArray(subject.specializations) ? subject.specializations : [],
    learnerContext: subject.learnerContext || null,
    adaptationRules: subject.adaptationRules || null,
    dependencyGraph: subject.dependencyGraph || null,
    stats: {
      total: totalCount,
      established: establishedCount,
      activeName
    }
  };
};
