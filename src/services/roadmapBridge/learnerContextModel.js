/**
 * learnerContextModel.js
 *
 * Lightweight Learner-Intent & Context Model for Universal AI Roadmap Bridge v2.
 *
 * Captures learner goal, horizon, purpose, and constraints with minimal friction.
 * Invariants:
 * - Never manufactures learner data.
 * - Missing fields remain null or UNKNOWN.
 * - Does not alter application state without explicit import.
 */

export const LEARNER_LEVELS = {
  ABSOLUTE_BEGINNER: 'ABSOLUTE_BEGINNER',
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  UNSURE: 'UNSURE'
};

export const LEARNER_LEVEL_LABELS = {
  ABSOLUTE_BEGINNER: 'Absolute Beginner (no prior exposure)',
  BEGINNER: 'Beginner (basic awareness, little practice)',
  INTERMEDIATE: 'Intermediate (working knowledge, practical gaps)',
  ADVANCED: 'Advanced (deep experience, seeking mastery)',
  UNSURE: 'Unsure (evaluate from fundamentals)'
};

export const LEARNER_PURPOSES = {
  CAREER: 'CAREER',
  RESEARCH: 'RESEARCH',
  BUILD: 'BUILD',
  ACADEMIC: 'ACADEMIC',
  CREATIVE: 'CREATIVE',
  PERSONAL: 'PERSONAL',
  MIXED: 'MIXED'
};

export const LEARNER_PURPOSE_LABELS = {
  CAREER: 'Career transition / Industry readiness',
  RESEARCH: 'Academic or Industrial Research',
  BUILD: 'Building a real system / product',
  ACADEMIC: 'Coursework / Degree preparation',
  CREATIVE: 'Creative exploration / Personal innovation',
  PERSONAL: 'Intellectual curiosity / Lifelong learning',
  MIXED: 'Mixed / Multi-disciplinary'
};

/**
 * Creates a clean learner context record with validated defaults.
 *
 * @param {Object} raw - User inputs or overrides
 * @returns {Object} Sanitized learner context
 */
export function createLearnerContext(raw = {}) {
  const goal = typeof raw.goal === 'string' ? raw.goal.trim() : '';
  const destination = typeof raw.destination === 'string' ? raw.destination.trim() : '';

  const currentLevel = Object.prototype.hasOwnProperty.call(LEARNER_LEVELS, raw.currentLevel)
    ? raw.currentLevel
    : LEARNER_LEVELS.BEGINNER;

  const purpose = Object.prototype.hasOwnProperty.call(LEARNER_PURPOSES, raw.purpose)
    ? raw.purpose
    : LEARNER_PURPOSES.CAREER;

  const targetHorizon = typeof raw.targetHorizon === 'string' && raw.targetHorizon.trim()
    ? raw.targetHorizon.trim()
    : '3-6 months';

  let weeklyHours = 10;
  if (typeof raw.weeklyHours === 'number' && !isNaN(raw.weeklyHours) && raw.weeklyHours > 0) {
    weeklyHours = Math.min(100, Math.max(1, Math.round(raw.weeklyHours)));
  } else if (typeof raw.weeklyHours === 'string' && raw.weeklyHours.trim()) {
    const parsed = parseInt(raw.weeklyHours.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      weeklyHours = Math.min(100, Math.max(1, parsed));
    }
  }

  const constraints = typeof raw.constraints === 'string' && raw.constraints.trim()
    ? raw.constraints.trim()
    : null;

  const priorKnowledge = typeof raw.priorKnowledge === 'string' && raw.priorKnowledge.trim()
    ? raw.priorKnowledge.trim()
    : null;

  return {
    goal,
    destination,
    currentLevel,
    purpose,
    targetHorizon,
    weeklyHours,
    constraints,
    priorKnowledge,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

/**
 * Validates whether the minimum required learner context exists.
 *
 * @param {Object} context
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLearnerContext(context) {
  const errors = [];
  if (!context || typeof context !== 'object') {
    return { valid: false, errors: ['Learner context is required.'] };
  }

  if (!context.goal || typeof context.goal !== 'string' || !context.goal.trim()) {
    errors.push('Learning goal cannot be empty.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
