/**
 * adaptiveStorage.js
 *
 * Safe local persistence for the Adaptive Learning Engine.
 * Manages hypotheses, recommendations, experiments, and user rejections.
 *
 * Philosophy:
 * - Local-first, privacy-respecting (Prompt #39)
 * - Remembers user rejections so the engine never pesters the user repeatedly (Prompt #19, #36)
 * - Safe fallbacks for corrupted keys or storage quotas
 */

import { safeStorageGet, safeStorageSet } from '../utils/storage';

export const ADAPTIVE_KEYS = {
  HYPOTHESES: 'learningTracker_adaptiveHypotheses',
  RECOMMENDATIONS: 'learningTracker_adaptiveRecommendations',
  REJECTIONS: 'learningTracker_adaptiveRejections',
  EXPERIMENTS: 'learningTracker_adaptiveExperiments',
  ACCEPTED_ACTIONS: 'learningTracker_adaptiveAcceptedActions'
};

export function loadHypotheses() {
  return safeStorageGet(ADAPTIVE_KEYS.HYPOTHESES, []);
}

export function saveHypotheses(hypotheses) {
  safeStorageSet(ADAPTIVE_KEYS.HYPOTHESES, Array.isArray(hypotheses) ? hypotheses : []);
}

export function loadRecommendations() {
  return safeStorageGet(ADAPTIVE_KEYS.RECOMMENDATIONS, []);
}

export function saveRecommendations(recommendations) {
  safeStorageSet(ADAPTIVE_KEYS.RECOMMENDATIONS, Array.isArray(recommendations) ? recommendations : []);
}

export function loadRejections() {
  return safeStorageGet(ADAPTIVE_KEYS.REJECTIONS, {});
}

export function recordRejection(rejectionKey, ttlDays = 7) {
  const current = loadRejections();
  const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const updated = {
    ...current,
    [rejectionKey]: {
      rejectedAt: Date.now(),
      expiresAt
    }
  };
  safeStorageSet(ADAPTIVE_KEYS.REJECTIONS, updated);
  return updated;
}

export function isRejectionActive(rejectionKey) {
  const current = loadRejections();
  const record = current[rejectionKey];
  if (!record) return false;
  if (record.expiresAt && Date.now() > record.expiresAt) {
    return false;
  }
  return true;
}

export function loadExperiments() {
  return safeStorageGet(ADAPTIVE_KEYS.EXPERIMENTS, []);
}

export function saveExperiments(experiments) {
  safeStorageSet(ADAPTIVE_KEYS.EXPERIMENTS, Array.isArray(experiments) ? experiments : []);
}

export function loadAcceptedActions() {
  return safeStorageGet(ADAPTIVE_KEYS.ACCEPTED_ACTIONS, {});
}

export function recordAcceptedAction(actionId, actionPayload) {
  const current = loadAcceptedActions();
  const updated = {
    ...current,
    [actionId]: {
      ...actionPayload,
      acceptedAt: Date.now()
    }
  };
  safeStorageSet(ADAPTIVE_KEYS.ACCEPTED_ACTIONS, updated);
  return updated;
}

export function removeAcceptedAction(actionId) {
  const current = loadAcceptedActions();
  const updated = { ...current };
  delete updated[actionId];
  safeStorageSet(ADAPTIVE_KEYS.ACCEPTED_ACTIONS, updated);
  return updated;
}
