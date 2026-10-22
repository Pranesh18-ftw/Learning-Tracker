/**
 * index.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Coordinator)
 *
 * Central coordinator for:
 * OBSERVE → MEASURE → INTERPRET → FORM HYPOTHESIS → MAKE SMALL ADJUSTMENT → OBSERVE RESULT (Prompt #2)
 *
 * Exports the complete adaptive subsystem API.
 */

import { collectRawSignals } from './signalCollector';
import { deriveFeatures } from './featureDeriver';
import { evaluateHypotheses, HYPOTHESIS_STATUS } from './hypothesisEngine';
import { generateRecommendations, RECOMMENDATION_TYPES } from './recommendationEngine';
import {
  startExperiment,
  recordSessionInExperiment,
  getActiveExperiment,
  cancelActiveExperiment,
  EXPERIMENT_STATUS
} from './experimentEngine';
import {
  loadHypotheses,
  saveHypotheses,
  loadRecommendations,
  saveRecommendations,
  loadRejections,
  recordRejection,
  isRejectionActive,
  recordAcceptedAction,
  removeAcceptedAction,
  loadAcceptedActions
} from './adaptiveStorage';

export {
  HYPOTHESIS_STATUS,
  RECOMMENDATION_TYPES,
  EXPERIMENT_STATUS,
  collectRawSignals,
  deriveFeatures,
  evaluateHypotheses,
  generateRecommendations,
  startExperiment,
  recordSessionInExperiment,
  getActiveExperiment,
  cancelActiveExperiment,
  recordRejection,
  isRejectionActive,
  loadRecommendations,
  loadAcceptedActions
};

/**
 * Master resolution function: runs the full adaptive pipeline from current state.
 */
export function resolveAdaptiveState({
  sessions = [],
  subjects = [],
  identity = {},
  learningPlan = [],
  persist = false
}) {
  const rejections = loadRejections();
  const existingHypotheses = loadHypotheses();

  // 1. OBSERVE: Collect normalized raw signals
  const signals = collectRawSignals({
    sessions,
    subjects,
    identity,
    learningPlan,
    rejections
  });

  // 2. MEASURE: Derive objective features
  const features = deriveFeatures(signals);

  // 3. INTERPRET & FORM HYPOTHESIS: Evaluate patterns into working hypotheses
  const hypotheses = evaluateHypotheses(features, existingHypotheses);
  if (persist) {
    saveHypotheses(hypotheses);
  }

  // 4. MAKE SMALL ADJUSTMENTS: Generate structured, explainable recommendations
  const recommendations = generateRecommendations({
    features,
    hypotheses,
    currentContext: { identity }
  });
  if (persist) {
    saveRecommendations(recommendations);
  }

  // 5. Active Experiment State
  const activeExperiment = getActiveExperiment();

  return {
    signals,
    features,
    hypotheses,
    recommendations,
    activeExperiment,
    recoveryState: {
      isRecovery: features.recovery.isRecoveryCandidate,
      gapDays: features.recovery.daysSinceLastSession
    }
  };
}

/**
 * User accepts a recommendation
 */
export function acceptAdaptiveRecommendation(recommendationId, actionPayload = {}) {
  recordAcceptedAction(recommendationId, actionPayload);
  return { success: true, id: recommendationId };
}

/**
 * User rejects a recommendation ("Not for me" / "Keep my current plan")
 * Records a cooldown so the engine does not pester the user repeatedly (Prompt #19, #36).
 */
export function rejectAdaptiveRecommendation(recommendationId, hypothesisKey = null) {
  const keyToMute = hypothesisKey || recommendationId;
  recordRejection(keyToMute, 7); // Muted for 7 days
  removeAcceptedAction(recommendationId);
  return { success: true, mutedKey: keyToMute };
}

/**
 * User reverts a previously accepted route adjustment (Prompt #35)
 */
export function revertAdaptiveRecommendation(recommendationId) {
  removeAcceptedAction(recommendationId);
  return { success: true, revertedId: recommendationId };
}
