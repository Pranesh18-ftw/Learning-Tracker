/**
 * storageValidators.js
 *
 * Minimal Structural Validation & Shape Verification for Persisted State (P1.3).
 *
 * Responsibilities:
 * - Validate minimal structure of critical domain state before use.
 * - Distinguish DATA_MALFORMED from DATA_EMPTY.
 * - Repair/filter minor item corruption non-destructively without wiping valid data.
 * - Ensure corrupted data is quarantined rather than blindly discarded or overwritten.
 */

/**
 * Validates roadmap subject array structure.
 * Expected: Array of subjects with minimal subject shape.
 */
export function validateRoadmapShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  const subjectsArray = Array.isArray(data)
    ? data
    : (data && Array.isArray(data.subjects) ? data.subjects : null);

  if (!subjectsArray) {
    return { valid: false, reason: 'NOT_AN_ARRAY', isEmpty: false };
  }

  if (subjectsArray.length === 0) {
    return { valid: true, isEmpty: true, data: [] };
  }

  // Validate each subject has minimal required properties
  const validSubjects = [];
  let corruptedCount = 0;

  for (const item of subjectsArray) {
    if (item && typeof item === 'object' && !Array.isArray(item) && (item.id || item.title || item.phases)) {
      validSubjects.push(item);
    } else {
      corruptedCount++;
    }
  }

  if (validSubjects.length === 0 && corruptedCount > 0) {
    return { valid: false, reason: 'ALL_SUBJECTS_CORRUPTED', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: validSubjects.length === 0,
    data: validSubjects,
    hadCorruptedItems: corruptedCount > 0
  };
}

/**
 * Validates session history records.
 * Expected: Array of session objects with valid identifiers and numeric duration.
 */
export function validateSessionsShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  if (!Array.isArray(data)) {
    return { valid: false, reason: 'NOT_AN_ARRAY', isEmpty: false };
  }

  if (data.length === 0) {
    return { valid: true, isEmpty: true, data: [] };
  }

  const validSessions = [];
  let corruptedCount = 0;

  for (const item of data) {
    if (item && typeof item === 'object' && !Array.isArray(item) && item.id) {
      // Normalize duration to numeric
      const duration = Math.max(0, Number(item.durationMinutes || item.duration) || 0);
      validSessions.push({
        ...item,
        durationMinutes: duration
      });
    } else {
      corruptedCount++;
    }
  }

  if (validSessions.length === 0 && corruptedCount > 0) {
    return { valid: false, reason: 'ALL_SESSIONS_CORRUPTED', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: validSessions.length === 0,
    data: validSessions,
    hadCorruptedItems: corruptedCount > 0
  };
}

/**
 * Validates task completion event log.
 * Expected: Array of completion records with taskId and completedAt.
 */
export function validateTaskCompletionsShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  if (!Array.isArray(data)) {
    return { valid: false, reason: 'NOT_AN_ARRAY', isEmpty: false };
  }

  if (data.length === 0) {
    return { valid: true, isEmpty: true, data: [] };
  }

  const validCompletions = [];
  let corruptedCount = 0;

  for (const item of data) {
    if (item && typeof item === 'object' && !Array.isArray(item) && (item.id || item.taskId || item.subtaskId)) {
      validCompletions.push(item);
    } else {
      corruptedCount++;
    }
  }

  if (validCompletions.length === 0 && corruptedCount > 0) {
    return { valid: false, reason: 'ALL_COMPLETIONS_CORRUPTED', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: validCompletions.length === 0,
    data: validCompletions,
    hadCorruptedItems: corruptedCount > 0
  };
}

/**
 * Validates Learning Plan entries.
 * Expected: Array of plan objects.
 */
export function validateLearningPlanShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  if (!Array.isArray(data)) {
    return { valid: false, reason: 'NOT_AN_ARRAY', isEmpty: false };
  }

  if (data.length === 0) {
    return { valid: true, isEmpty: true, data: [] };
  }

  const validItems = [];
  let corruptedCount = 0;

  for (const item of data) {
    if (item && typeof item === 'object' && !Array.isArray(item) && (item.id || item.taskId || item.subjectId)) {
      validItems.push(item);
    } else {
      corruptedCount++;
    }
  }

  if (validItems.length === 0 && corruptedCount > 0) {
    return { valid: false, reason: 'ALL_PLAN_ITEMS_CORRUPTED', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: validItems.length === 0,
    data: validItems,
    hadCorruptedItems: corruptedCount > 0
  };
}

/**
 * Validates Daily Goals dictionary.
 * Expected: Plain object keyed by date strings (e.g. 'YYYY-MM-DD').
 */
export function validateDailyGoalsShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'NOT_A_PLAIN_OBJECT', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: Object.keys(data).length === 0,
    data
  };
}

/**
 * Validates Settings object.
 * Expected: Plain object (not an Array).
 */
export function validateSettingsShape(data) {
  if (data === null || data === undefined) {
    return { valid: false, reason: 'NIL_DATA', isEmpty: true };
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'NOT_A_PLAIN_OBJECT', isEmpty: false };
  }

  return {
    valid: true,
    isEmpty: Object.keys(data).length === 0,
    data
  };
}
