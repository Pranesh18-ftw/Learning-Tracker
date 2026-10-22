/**
 * roadmapProgressResolver.js
 *
 * Canonical Roadmap Hierarchy, Invariant, and Progress Derivation Engine (P1.2).
 *
 * Hierarchy:
 * SUBJECT -> PHASE -> TASK -> SUBTASK
 *
 * Invariants:
 * - SUBTASK: Complete only when explicitly marked completed (subtask.completed === true).
 * - TASK: Complete iff:
 *     A. Atomic (no subtasks): task.completed === true
 *     B. Has subtasks: all subtasks are complete (task.subtasks.every(st => st.completed === true))
 * - PHASE: Complete iff phase.tasks.length > 0 && phase.tasks.every(isTaskCompleted)
 * - SUBJECT: Complete iff subject.phases.length > 0 && subject.phases.every(isPhaseCompleted)
 *
 * Progress Rules:
 * - TASK: Completed subtasks / total subtasks (or 100% / 0% for atomic)
 * - PHASE: Completed tasks / total tasks (0% for empty phase, state = NO_REQUIRED_WORK)
 * - SUBJECT: Completed phases / total phases (0% for empty subject, state = NO_REQUIRED_WORK)
 * - OVERALL: Completed leaf work units / total leaf work units
 */

export const ROADMAP_STATES = {
  NO_REQUIRED_WORK: 'NO_REQUIRED_WORK',
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE'
};

/**
 * Normalizes a roadmap object or array of subjects idempotently.
 * Guarantees that every subject, phase, task, and subtask has a stable, unique ID
 * and that task.completed reflects canonical subtask invariants.
 *
 * @param {Array|Object} rawRoadmap - Subjects array or roadmap container object
 * @returns {Array} Normalized subjects array
 */
export const normalizeRoadmap = (rawRoadmap) => {
  if (!rawRoadmap) return [];
  const subjectsArray = Array.isArray(rawRoadmap)
    ? rawRoadmap
    : Array.isArray(rawRoadmap.subjects)
      ? rawRoadmap.subjects
      : [];

  return subjectsArray.map((subject, sIdx) => {
    const subjectId = subject.id || `subj-${sIdx + 1}`;
    const phases = (subject.phases || []).map((phase, pIdx) => {
      const phaseId = phase.id || `${subjectId}-phase-${pIdx + 1}`;
      const tasks = (phase.tasks || []).map((task, tIdx) => {
        const taskId = task.id || `${phaseId}-task-${tIdx + 1}`;
        const rawSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const normalizedSubtasks = rawSubtasks.map((st, stIdx) => {
          if (typeof st === 'string') {
            return {
              id: `${taskId}-sub-${stIdx + 1}`,
              name: st,
              completed: false,
              completedAt: null
            };
          }
          return {
            ...st,
            id: st.id || `${taskId}-sub-${stIdx + 1}`,
            name: st.name || `Subtask ${stIdx + 1}`,
            completed: Boolean(st.completed),
            completedAt: st.completed ? (st.completedAt || null) : null
          };
        });

        const hasSubtasks = normalizedSubtasks.length > 0;
        const isComplete = hasSubtasks
          ? normalizedSubtasks.every(st => st.completed === true)
          : Boolean(task.completed);

        return {
          ...task,
          id: taskId,
          name: task.name || `Task ${tIdx + 1}`,
          subtasks: normalizedSubtasks,
          completed: isComplete,
          completedAt: isComplete ? (task.completedAt || null) : null
        };
      });

      return {
        ...phase,
        id: phaseId,
        name: phase.name || `Phase ${pIdx + 1}`,
        tasks
      };
    });

    return {
      ...subject,
      id: subjectId,
      name: subject.name || `Subject ${sIdx + 1}`,
      phases
    };
  });
};

/**
 * Authoritative task completion invariant checker.
 *
 * @param {Object} task
 * @returns {boolean}
 */
export const isTaskCompleted = (task) => {
  if (!task) return false;
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    return task.subtasks.every(subtask => subtask.completed === true);
  }
  return task.completed === true;
};

/**
 * Authoritative phase completion invariant checker.
 *
 * @param {Object} phase
 * @returns {boolean}
 */
export const isPhaseCompleted = (phase) => {
  if (!phase || !Array.isArray(phase.tasks) || phase.tasks.length === 0) {
    return false;
  }
  return phase.tasks.every(isTaskCompleted);
};

/**
 * Authoritative subject completion invariant checker.
 *
 * @param {Object} subject
 * @returns {boolean}
 */
export const isSubjectCompleted = (subject) => {
  if (!subject || !Array.isArray(subject.phases) || subject.phases.length === 0) {
    return false;
  }
  return subject.phases.every(isPhaseCompleted);
};

/**
 * Resolves progress and state for an individual task.
 *
 * @param {Object} task
 * @returns {{ percent: number, state: string, completedUnits: number, totalUnits: number }}
 */
export const getTaskProgressDetails = (task) => {
  if (!task) {
    return { percent: 0, state: ROADMAP_STATES.NO_REQUIRED_WORK, completedUnits: 0, totalUnits: 0 };
  }

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  if (subtasks.length > 0) {
    const totalUnits = subtasks.length;
    const completedUnits = subtasks.filter(st => st.completed === true).length;
    const percent = Math.round((completedUnits / totalUnits) * 100);
    const state = completedUnits === totalUnits
      ? ROADMAP_STATES.COMPLETE
      : completedUnits > 0
        ? ROADMAP_STATES.IN_PROGRESS
        : ROADMAP_STATES.NOT_STARTED;

    return { percent, state, completedUnits, totalUnits };
  }

  // Atomic task
  const done = isTaskCompleted(task);
  return {
    percent: done ? 100 : 0,
    state: done ? ROADMAP_STATES.COMPLETE : ROADMAP_STATES.NOT_STARTED,
    completedUnits: done ? 1 : 0,
    totalUnits: 1
  };
};

/**
 * Convenience helper returning numeric percentage (0-100) for a task.
 */
export const getTaskProgress = (task) => {
  return getTaskProgressDetails(task).percent;
};

/**
 * Resolves progress and state for an individual phase.
 *
 * @param {Object} phase
 * @returns {{ percent: number, state: string, completedTasks: number, totalTasks: number }}
 */
export const getPhaseProgressDetails = (phase) => {
  if (!phase || !Array.isArray(phase.tasks) || phase.tasks.length === 0) {
    return { percent: 0, state: ROADMAP_STATES.NO_REQUIRED_WORK, completedTasks: 0, totalTasks: 0 };
  }

  const totalTasks = phase.tasks.length;
  const completedTasks = phase.tasks.filter(isTaskCompleted).length;
  const percent = Math.round((completedTasks / totalTasks) * 100);
  const state = completedTasks === totalTasks
    ? ROADMAP_STATES.COMPLETE
    : completedTasks > 0
      ? ROADMAP_STATES.IN_PROGRESS
      : ROADMAP_STATES.NOT_STARTED;

  return { percent, state, completedTasks, totalTasks };
};

/**
 * Convenience helper returning numeric percentage (0-100) for a phase.
 */
export const getPhaseProgress = (phase) => {
  return getPhaseProgressDetails(phase).percent;
};

/**
 * Resolves progress and state for an individual subject based on completed phases.
 *
 * @param {Object} subject
 * @returns {{ percent: number, state: string, completedPhases: number, totalPhases: number }}
 */
export const getSubjectProgressDetails = (subject) => {
  if (!subject || !Array.isArray(subject.phases) || subject.phases.length === 0) {
    return { percent: 0, state: ROADMAP_STATES.NO_REQUIRED_WORK, completedPhases: 0, totalPhases: 0 };
  }

  const totalPhases = subject.phases.length;
  const completedPhases = subject.phases.filter(isPhaseCompleted).length;
  const percent = Math.round((completedPhases / totalPhases) * 100);
  const state = completedPhases === totalPhases
    ? ROADMAP_STATES.COMPLETE
    : completedPhases > 0
      ? ROADMAP_STATES.IN_PROGRESS
      : ROADMAP_STATES.NOT_STARTED;

  return { percent, state, completedPhases, totalPhases };
};

/**
 * Convenience helper returning numeric percentage (0-100) for a subject.
 */
export const getSubjectProgress = (subject) => {
  return getSubjectProgressDetails(subject).percent;
};

/**
 * Subject task-level progress (completed tasks in subject / total tasks in subject).
 * Useful for high-granularity views.
 *
 * @param {Object} subject
 * @returns {number}
 */
export const getSubjectTaskProgress = (subject) => {
  const allTasks = (subject?.phases || []).flatMap(p => p.tasks || []);
  if (allTasks.length === 0) return 0;
  const completed = allTasks.filter(isTaskCompleted).length;
  return Math.round((completed / allTasks.length) * 100);
};

/**
 * Authoritative overall roadmap metrics derivation.
 * Eliminates bug where roadmaps with mixed atomic and subtask tasks dropped atomic tasks.
 *
 * @param {Array} subjects - Normalized or raw subjects array
 * @returns {Object} Comprehensive canonical metrics
 */
export const calculateOverallRoadmapStats = (subjects = []) => {
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const allPhases = safeSubjects.flatMap(s => s.phases || []);
  const allTasks = allPhases.flatMap(p => p.tasks || []);
  const allSubtasks = allTasks.flatMap(t => t.subtasks || []);
  const atomicTasks = allTasks.filter(t => !t.subtasks || t.subtasks.length === 0);

  const completedSubtasks = allSubtasks.filter(st => st.completed === true).length;
  const completedAtomicTasks = atomicTasks.filter(isTaskCompleted).length;
  const completedTasksCount = allTasks.filter(isTaskCompleted).length;
  const completedPhasesCount = allPhases.filter(isPhaseCompleted).length;
  const completedSubjectsCount = safeSubjects.filter(isSubjectCompleted).length;

  // Leaf work units: each subtask is 1 unit, each atomic task is 1 unit
  const totalWorkUnits = allSubtasks.length + atomicTasks.length;
  const completedWorkUnits = completedSubtasks + completedAtomicTasks;

  const completionRate = totalWorkUnits > 0
    ? Math.round((completedWorkUnits / totalWorkUnits) * 100)
    : 0;

  const taskCompletionRate = allTasks.length > 0
    ? Math.round((completedTasksCount / allTasks.length) * 100)
    : 0;

  const phaseCompletionRate = allPhases.length > 0
    ? Math.round((completedPhasesCount / allPhases.length) * 100)
    : 0;

  const subjectCompletionRate = safeSubjects.length > 0
    ? Math.round((completedSubjectsCount / safeSubjects.length) * 100)
    : 0;

  return {
    totalSubjects: safeSubjects.length,
    completedSubjects: completedSubjectsCount,
    subjectCompletionRate,

    totalPhases: allPhases.length,
    completedPhases: completedPhasesCount,
    phaseCompletionRate,

    totalTasks: allTasks.length,
    completedTasks: completedTasksCount,
    taskCompletionRate,

    totalSubtasks: allSubtasks.length > 0 ? allSubtasks.length : allTasks.length,
    completedSubtasks: allSubtasks.length > 0 ? completedSubtasks : completedTasksCount,

    totalWorkUnits,
    completedWorkUnits,
    completionRate
  };
};
