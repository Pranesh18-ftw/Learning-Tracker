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

export const LEARNER_STYLES = {
  BALANCED: 'BALANCED',
  HANDS_ON: 'HANDS_ON',
  FIRST_PRINCIPLES: 'FIRST_PRINCIPLES',
  FAST_TRACK: 'FAST_TRACK'
};

export const LEARNER_STYLE_LABELS = {
  BALANCED: 'Balanced (Equal theory foundations and project synthesis)',
  HANDS_ON: 'Project-First (Build systems immediately, acquire theory just-in-time)',
  FIRST_PRINCIPLES: 'First-Principles (Mathematical rigor, derivations, and underlying mechanics first)',
  FAST_TRACK: 'Fast-Track Fluency (High-leverage core 20% driving 80% practical competence)'
};

export const STUDY_RHYTHMS = {
  DAILY_STANDARD: 'DAILY_STANDARD',
  DAILY_MICRO: 'DAILY_MICRO',
  WEEKEND_DEEP: 'WEEKEND_DEEP',
  FLEXIBLE: 'FLEXIBLE'
};

export const STUDY_RHYTHM_LABELS = {
  DAILY_STANDARD: 'Daily Standard (1-2 hours each day)',
  DAILY_MICRO: 'Daily Micro-Habit (30-45 mins every day)',
  WEEKEND_DEEP: 'Deep Weekend Sprints (4-8 hours on weekends)',
  FLEXIBLE: 'Flexible / Self-Paced asynchronous rhythm'
};

export const THEORY_PRACTICE_RATIOS = {
  BALANCED: 'BALANCED',
  PRACTICE_HEAVY: 'PRACTICE_HEAVY',
  THEORY_HEAVY: 'THEORY_HEAVY'
};

export const THEORY_PRACTICE_LABELS = {
  BALANCED: '50% Hands-on Application / 50% Conceptual Foundations',
  PRACTICE_HEAVY: '70% Practical Implementation & Debugging / 30% Theory',
  THEORY_HEAVY: '70% Rigorous Theory & Literature / 30% Practical Verification'
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
  const targetDeliverables = typeof raw.targetDeliverables === 'string' && raw.targetDeliverables.trim()
    ? raw.targetDeliverables.trim()
    : null;

  const currentLevel = Object.prototype.hasOwnProperty.call(LEARNER_LEVELS, raw.currentLevel)
    ? raw.currentLevel
    : LEARNER_LEVELS.BEGINNER;

  const purpose = Object.prototype.hasOwnProperty.call(LEARNER_PURPOSES, raw.purpose)
    ? raw.purpose
    : LEARNER_PURPOSES.CAREER;

  const learningStyle = Object.prototype.hasOwnProperty.call(LEARNER_STYLES, raw.learningStyle)
    ? raw.learningStyle
    : LEARNER_STYLES.BALANCED;

  const preferredStack = typeof raw.preferredStack === 'string' && raw.preferredStack.trim()
    ? raw.preferredStack.trim()
    : null;

  const targetHorizon = typeof raw.targetHorizon === 'string' && raw.targetHorizon.trim()
    ? raw.targetHorizon.trim()
    : '3-6 months';

  const studyRhythm = Object.prototype.hasOwnProperty.call(STUDY_RHYTHMS, raw.studyRhythm)
    ? raw.studyRhythm
    : STUDY_RHYTHMS.DAILY_STANDARD;

  const theoryVsPractice = Object.prototype.hasOwnProperty.call(THEORY_PRACTICE_RATIOS, raw.theoryVsPractice)
    ? raw.theoryVsPractice
    : THEORY_PRACTICE_RATIOS.BALANCED;

  const mustIncludeTopics = typeof raw.mustIncludeTopics === 'string' && raw.mustIncludeTopics.trim()
    ? raw.mustIncludeTopics.trim()
    : null;

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
    targetDeliverables,
    currentLevel,
    purpose,
    learningStyle,
    preferredStack,
    targetHorizon,
    studyRhythm,
    theoryVsPractice,
    mustIncludeTopics,
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
