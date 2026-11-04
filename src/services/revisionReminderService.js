/**
 * revisionReminderService.js
 *
 * Deterministic Revision Scheduling & Spider Reminder Engine
 *
 * Requirements:
 * - Default interval: 10 days (configurable by learner in Settings)
 * - Deterministic due-date calculation using learner's actual topic, task, completion, and session history
 * - Per-topic interval override support
 * - Manual next revision date override support
 * - Topics without sufficient study/completion history are NEVER falsely marked overdue
 * - Prioritizes most overdue eligible topic first, reports count of waiting topics
 * - Never shows during active Focus session, auth dialog, phone pairing, or open modal
 * - Supports snooze (temporary pause) and "Not now" (session dismissal without clearing due state)
 * - Confirmation workflow: revision is recorded only upon genuine action or confirmation
 * - Strictly zero AI, predictive models, or fabricated data
 */

import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';
import { safeStorageGet, safeStorageSet } from '../utils/storage';

export const DEFAULT_REVISION_INTERVAL_DAYS = 10;
export const MIN_REVISION_INTERVAL_DAYS = 1;
export const MAX_REVISION_INTERVAL_DAYS = 365;

const STORAGE_KEY_SNOOZED_UNTIL = 'lt_revision_snoozed_until';
const STORAGE_KEY_DISMISSED_SESSION = 'lt_revision_dismissed_session';

/**
 * Calculates calendar day difference between two YYYY-MM-DD date keys.
 */
export function differenceInDays(dateKeyA, dateKeyB) {
  if (!dateKeyA || !dateKeyB) return 0;
  const dateA = new Date(dateKeyA + 'T00:00:00');
  const dateB = new Date(dateKeyB + 'T00:00:00');
  const diffMs = dateA.getTime() - dateB.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validates and retrieves the global revision interval from settings.
 */
export function getGlobalRevisionInterval(settings) {
  const raw = settings?.revisionIntervalDays;
  if (typeof raw === 'number' && !isNaN(raw) && raw >= MIN_REVISION_INTERVAL_DAYS && raw <= MAX_REVISION_INTERVAL_DAYS) {
    return Math.floor(raw);
  }
  return DEFAULT_REVISION_INTERVAL_DAYS;
}

/**
 * Retrieves per-topic revision configuration (override interval or manual next date).
 */
export function getTopicRevisionConfig(settings, topicId) {
  if (!settings?.revisionOverrides || !topicId) return { intervalDays: null, manualNextDate: null };
  const override = settings.revisionOverrides[topicId];
  if (!override || typeof override !== 'object') return { intervalDays: null, manualNextDate: null };

  const intervalDays = typeof override.intervalDays === 'number' && override.intervalDays >= MIN_REVISION_INTERVAL_DAYS
    ? Math.floor(override.intervalDays)
    : null;

  const manualNextDate = typeof override.manualNextDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(override.manualNextDate)
    ? override.manualNextDate
    : null;

  return { intervalDays, manualNextDate };
}

/**
 * Finds the latest recorded activity date key for a given topic/task from completions, sessions, and revision history.
 */
export function findLastActivityDateKey({ topicId, taskId, subtaskId, taskCompletions = [], sessions = [], revisionHistory = {} }) {
  const dates = [];

  // 1. Explicit revision history record
  if (topicId && revisionHistory[topicId]?.lastRevisedDate) {
    dates.push(revisionHistory[topicId].lastRevisedDate);
  }
  if (taskId && revisionHistory[taskId]?.lastRevisedDate) {
    dates.push(revisionHistory[taskId].lastRevisedDate);
  }

  // 2. Task completions
  const completionList = Array.isArray(taskCompletions) ? taskCompletions : [];
  for (const c of completionList) {
    if (!c) continue;
    const matchesTopic = (topicId && (c.id === topicId || c.subtaskId === topicId || c.taskId === topicId)) ||
      (taskId && (c.taskId === taskId || c.id === taskId)) ||
      (subtaskId && (c.subtaskId === subtaskId || c.id === subtaskId));

    if (matchesTopic) {
      if (c.date && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
        dates.push(c.date);
      } else if (c.timestamp) {
        dates.push(getLocalDateKey(new Date(c.timestamp)));
      }
    }
  }

  // 3. Focus sessions
  const sessionList = Array.isArray(sessions) ? sessions : [];
  for (const s of sessionList) {
    if (!s) continue;
    const matchesSession = (topicId && (s.subtaskId === topicId || s.taskId === topicId || s.taskName === topicId)) ||
      (taskId && (s.taskId === taskId || s.id === taskId)) ||
      (subtaskId && (s.subtaskId === subtaskId));

    if (matchesSession && s.timestamp) {
      dates.push(getLocalDateKey(new Date(s.timestamp)));
    }
  }

  if (dates.length === 0) return null;

  // Return the most recent date key
  dates.sort();
  return dates[dates.length - 1];
}

/**
 * Calculates the revision status for a single topic.
 */
export function calculateTopicRevisionStatus({
  topic,
  taskCompletions = [],
  sessions = [],
  settings = {},
  currentDateKey = getLocalDateKey()
}) {
  if (!topic) {
    return { isEligible: false, isDue: false };
  }

  const topicId = topic.subtaskId || topic.taskId || topic.id;
  const taskId = topic.taskId || topic.id;
  const subtaskId = topic.subtaskId || (topic.taskId && topic.id !== topic.taskId ? topic.id : null);
  const revisionHistory = settings?.revisionHistory || {};

  const lastActivityDateKey = findLastActivityDateKey({
    topicId,
    taskId,
    subtaskId,
    taskCompletions,
    sessions,
    revisionHistory
  });

  // If the learner has never studied or completed this topic, it is NOT eligible or due
  if (!lastActivityDateKey) {
    return {
      isEligible: false,
      isDue: false,
      reason: 'NO_PREVIOUS_STUDY_RECORD'
    };
  }

  const globalInterval = getGlobalRevisionInterval(settings);
  const { intervalDays: overrideInterval, manualNextDate } = getTopicRevisionConfig(settings, topicId);
  const effectiveInterval = overrideInterval || globalInterval;

  let nextDueDate;
  if (manualNextDate) {
    nextDueDate = manualNextDate;
  } else {
    nextDueDate = addDaysToDateKey(lastActivityDateKey, effectiveInterval);
  }

  const daysSinceLastActivity = differenceInDays(currentDateKey, lastActivityDateKey);
  const daysOverdue = differenceInDays(currentDateKey, nextDueDate);
  const isDue = daysOverdue >= 0;

  return {
    isEligible: true,
    isDue,
    topicId,
    topicName: topic.name || topic.taskName || 'Topic',
    subjectName: topic.subjectName || topic.domainName || 'General',
    lastActivityDateKey,
    nextDueDate,
    daysSinceLastActivity,
    daysOverdue,
    intervalDays: effectiveInterval,
    hasManualOverride: Boolean(manualNextDate || overrideInterval)
  };
}

/**
 * Scans all topics across subjects/roadmap to find those due for revision.
 * Returns sorted list with the most overdue topic first.
 */
export function getDueRevisionTopics({
  subjects = [],
  roadmap = [],
  taskCompletions = [],
  sessions = [],
  settings = {},
  currentDateKey = getLocalDateKey()
}) {
  const candidateTopics = [];
  const seenIds = new Set();

  const registerCandidate = (topic, subjectName) => {
    const id = topic.subtaskId || topic.taskId || topic.id;
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    candidateTopics.push({ ...topic, subjectName: topic.subjectName || subjectName });
  };

  // Inspect roadmap subjects
  const subjectList = Array.isArray(subjects) && subjects.length > 0 ? subjects : (Array.isArray(roadmap) ? roadmap : []);
  for (const subject of subjectList) {
    const sName = subject.name || subject.title || 'Domain';
    const phases = subject.phases || [];
    for (const phase of phases) {
      const tasks = phase.tasks || [];
      for (const task of tasks) {
        if (task.subtasks && task.subtasks.length > 0) {
          for (const sub of task.subtasks) {
            registerCandidate({
              ...sub,
              taskId: task.id,
              taskName: task.name,
              subjectId: subject.id,
              subjectName: sName,
              phaseId: phase.id
            }, sName);
          }
        } else {
          registerCandidate({
            ...task,
            taskId: task.id,
            subjectId: subject.id,
            subjectName: sName,
            phaseId: phase.id
          }, sName);
        }
      }
    }
  }

  // Also inspect any completed topics recorded in completions that might not be in active subjects
  for (const c of (Array.isArray(taskCompletions) ? taskCompletions : [])) {
    if (!c) continue;
    const id = c.subtaskId || c.taskId || c.id;
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      candidateTopics.push({
        id,
        taskId: c.taskId || id,
        subtaskId: c.subtaskId || null,
        name: c.name || c.taskName || 'Topic',
        subjectName: c.subjectName || 'Knowledge World'
      });
    }
  }

  const dueTopics = [];

  for (const topic of candidateTopics) {
    const status = calculateTopicRevisionStatus({
      topic,
      taskCompletions,
      sessions,
      settings,
      currentDateKey
    });

    if (status.isEligible && status.isDue) {
      dueTopics.push({
        ...topic,
        revisionStatus: status
      });
    }
  }

  // Sort: most overdue first (highest daysOverdue descending)
  dueTopics.sort((a, b) => b.revisionStatus.daysOverdue - a.revisionStatus.daysOverdue);

  return {
    dueTopics,
    mostOverdueTopic: dueTopics[0] || null,
    totalDueCount: dueTopics.length
  };
}

/**
 * Checks whether the Spider Revision Overlay is permitted to open.
 */
export function isRevisionOverlayPermitted({
  isFocusActive = false,
  isModalOpen = false,
  isPairingActive = false,
  currentDateKey = getLocalDateKey()
}) {
  if (isFocusActive) return false;
  if (isModalOpen) return false;
  if (isPairingActive) return false;

  // Check snooze timestamp
  const snoozedUntil = safeStorageGet(STORAGE_KEY_SNOOZED_UNTIL);
  if (typeof snoozedUntil === 'number' && Date.now() < snoozedUntil) {
    return false; // currently snoozed
  }

  // Check session dismissal
  const dismissedSession = safeStorageGet(STORAGE_KEY_DISMISSED_SESSION);
  if (dismissedSession === currentDateKey) {
    return false; // dismissed for today's session
  }

  return true;
}

/**
 * Temporarily snoozes the revision reminder for N hours.
 */
export function snoozeRevisionReminder(hours = 4) {
  const snoozeUntilMs = Date.now() + Math.max(1, hours) * 60 * 60 * 1000;
  safeStorageSet(STORAGE_KEY_SNOOZED_UNTIL, snoozeUntilMs);
}

/**
 * Dismisses the revision reminder for the current session without resetting topic due state.
 */
export function dismissRevisionReminderForSession(currentDateKey = getLocalDateKey()) {
  safeStorageSet(STORAGE_KEY_DISMISSED_SESSION, currentDateKey);
}

/**
 * Clears snooze / dismissal markers (useful for manual trigger or testing).
 */
export function resetRevisionReminderSuppression() {
  safeStorageSet(STORAGE_KEY_SNOOZED_UNTIL, 0);
  safeStorageSet(STORAGE_KEY_DISMISSED_SESSION, null);
}

/**
 * Records confirmed revision of a topic, resetting its interval cycle.
 */
export function recordTopicRevisionConfirmed({
  updateSettings,
  topicId,
  currentDateKey = getLocalDateKey()
}) {
  if (!updateSettings || !topicId) return;

  updateSettings((prev) => {
    const existingHistory = prev?.revisionHistory || {};
    const existingOverrides = prev?.revisionOverrides || {};

    const prevCount = existingHistory[topicId]?.revisionCount || 0;

    const nextHistory = {
      ...existingHistory,
      [topicId]: {
        lastRevisedDate: currentDateKey,
        revisionCount: prevCount + 1,
        lastConfirmedAt: new Date().toISOString()
      }
    };

    // If there was a one-time manualNextDate override, clear it so deterministic interval resumes
    const nextOverrides = { ...existingOverrides };
    if (nextOverrides[topicId]?.manualNextDate) {
      nextOverrides[topicId] = {
        ...nextOverrides[topicId],
        manualNextDate: null
      };
    }

    return {
      ...prev,
      revisionHistory: nextHistory,
      revisionOverrides: nextOverrides
    };
  });
}
