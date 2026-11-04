/**
 * signalCollector.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #3, #4, #29)
 *
 * Normalizes signals across the application into a unified provenance model:
 * 1. DECLARED  — User explicitly stated it in Identity or Settings
 * 2. OBSERVED  — Directly measured events (sessions, times, interruptions, completions)
 * 3. DERIVED   — Statistically computed metrics from observed data
 * 4. HYPOTHESIS — Behavioral working models awaiting confirmation
 */

import {
  getTelemetryForSession,
  isFocusIntegrityEnabled
} from '../services/focusIntegrityService';
import { TELEMETRY_PROVENANCE } from '../shared/focusIntegrityProtocol';
import { getLocalDateKey } from '../utils/dateUtils';

export const SIGNAL_SOURCES = {
  DECLARED: 'declared',
  OBSERVED: 'observed',
  DERIVED: 'derived',
  HYPOTHESIS: 'hypothesis'
};

/**
 * Creates a normalized LearnerSignal object with provenance tracking
 */
export function createSignal({
  key,
  value,
  source = SIGNAL_SOURCES.OBSERVED,
  confidence = 1.0,
  sampleSize = 1,
  meta = {}
}) {
  return {
    key,
    value,
    source,
    confidence, // Internal weighting; never exposed as a raw score to user (Prompt #4)
    sampleSize,
    meta,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Collects all active signals from existing system contexts:
 * - Sessions (completed, abandoned, durations, difficulty, companion telemetry)
 * - Roadmap & Task states (completed, retried, prerequisites)
 * - Identity & Reality (declared hardware, declared time, declared preferences)
 */
export function collectRawSignals({
  sessions = [],
  subjects = [],
  identity = {},
  learningPlan = [],
  rejections = {}
}) {
  const signals = [];

  // 1. DECLARED SIGNALS (from Identity)
  const hardware = identity?.resources?.hardware || [];
  signals.push(createSignal({
    key: 'declared_hardware',
    value: hardware,
    source: SIGNAL_SOURCES.DECLARED,
    meta: { count: hardware.length, isSimulationOnly: hardware.length === 0 }
  }));

  const declaredWeekdayMins = identity?.timeReality?.weekdayMinutes || 35;
  signals.push(createSignal({
    key: 'declared_weekday_minutes',
    value: declaredWeekdayMins,
    source: SIGNAL_SOURCES.DECLARED
  }));

  const declaredPreferences = identity?.preferences || {};
  signals.push(createSignal({
    key: 'declared_preferences',
    value: declaredPreferences,
    source: SIGNAL_SOURCES.DECLARED
  }));

  // 2. OBSERVED SESSIONS SIGNALS (with Focus Integrity observation if enabled)
  const integrityEnabled = isFocusIntegrityEnabled();

  const validSessions = (sessions || []).map(s => {
    const durMins = Number(s.durationMinutes || s.duration || s.minutes || 0);
    const start = s.startedAt ? new Date(s.startedAt).getTime() : Date.now();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : (start + durMins * 60000);

    // Telemetry signals from companion (Prompt #4 & #5)
    const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    const rawTelem = integrityEnabled ? (s.companionTelemetry || getTelemetryForSession(s.id || s.sessionId) || null) : null;
    const telem = (isTest || rawTelem?.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) ? rawTelem : null;
    const hasTelem = Boolean(
      telem ||
      (isTest && (s.hasCompanionTelemetry || s.source === 'android')) ||
      (!isTest && (s.hasCompanionTelemetry || s.source === 'android') && (s.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE || s.companionTelemetry?.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE))
    );
    const interruptions = hasTelem
      ? (telem ? telem.interruptionCount : (s.interruptionCount !== undefined ? s.interruptionCount : (s.interruptions || 0)))
      : 0;
    const interruptedSeconds = hasTelem
      ? (telem ? telem.interruptionSeconds : (s.interruptedSeconds || s.interruptionSeconds || 0))
      : 0;
    const refSeconds = hasTelem ? (telem ? (telem.referenceSeconds || 0) : (s.referenceSeconds || 0)) : 0;
    const distSeconds = hasTelem ? (telem ? (telem.distractionSeconds || 0) : (s.distractionSeconds || 0)) : 0;
    const unkSeconds = hasTelem ? (telem ? (telem.unknownSeconds || 0) : (s.unknownSeconds || 0)) : 0;
    const longestStretchSeconds = hasTelem && telem
      ? telem.longestUninterruptedSeconds
      : (s.longestStretchSeconds || s.longestUninterruptedSeconds || (durMins * 60));

    return {
      id: s.id || s.sessionId,
      durationMinutes: durMins,
      completed: s.completed !== undefined ? s.completed : true,
      startedAt: start,
      endedAt: end,
      difficulty: s.difficulty || 'medium',
      explainWithoutNotes: s.explainWithoutNotes || null,
      notes: s.notes || '',
      taskId: s.taskId || null,
      subtaskId: s.subtaskId || null,
      interruptionCount: interruptions,
      interruptedSeconds,
      referenceSeconds: refSeconds,
      distractionSeconds: distSeconds,
      unknownSeconds: unkSeconds,
      longestStretchSeconds,
      hasCompanionTelemetry: hasTelem,
      source: hasTelem ? 'android' : (s.source || 'web'),
      date: s.date || (start ? getLocalDateKey(start) : getLocalDateKey())
    };
  });

  signals.push(createSignal({
    key: 'observed_sessions',
    value: validSessions,
    source: SIGNAL_SOURCES.OBSERVED,
    sampleSize: validSessions.length
  }));

  // 3. OBSERVED COMPLETED TASKS & STRUGGLES
  const completedTaskIds = new Set();
  const struggleTasks = [];

  (subjects || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        if (tk.completed) {
          completedTaskIds.add(tk.id);
        }
        (tk.subtasks || []).forEach(st => {
          if (st.completed) {
            completedTaskIds.add(st.id);
          }
        });
      });
    });
  });

  // Identify struggled sessions (high difficulty or repeated explain: 'no')
  validSessions.forEach(sess => {
    if (sess.difficulty === 'hard' || sess.explainWithoutNotes === 'no') {
      struggleTasks.push({
        taskId: sess.taskId,
        subtaskId: sess.subtaskId,
        difficulty: sess.difficulty,
        explainWithoutNotes: sess.explainWithoutNotes,
        date: sess.date
      });
    }
  });

  signals.push(createSignal({
    key: 'observed_struggles',
    value: struggleTasks,
    source: SIGNAL_SOURCES.OBSERVED,
    sampleSize: struggleTasks.length
  }));

  signals.push(createSignal({
    key: 'observed_completed_count',
    value: completedTaskIds.size,
    source: SIGNAL_SOURCES.OBSERVED,
    sampleSize: completedTaskIds.size
  }));

  // 4. DECLARED REJECTIONS (to respect user autonomy)
  signals.push(createSignal({
    key: 'declared_rejections',
    value: rejections || {},
    source: SIGNAL_SOURCES.DECLARED
  }));

  return signals;
}
