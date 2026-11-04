/**
 * experimentEngine.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #20, #36, #42 Phase B)
 *
 * Conducts structured, intellectual-honest behavioral experiments:
 * "Let's test something."
 * E.g., Testing 30-minute focus blocks for the next 4 sessions.
 *
 * Observes results over the trial window and strengthens or weakens
 * the associated hypothesis based on empirical evidence.
 */

import { loadExperiments, saveExperiments } from './adaptiveStorage';

export const EXPERIMENT_STATUS = {
  ACTIVE: 'active',
  CONCLUDED: 'concluded',
  CANCELLED: 'cancelled'
};

/**
 * Creates and starts a new behavioral experiment
 */
export function startExperiment({
  id = `exp-${Date.now()}`,
  title = 'Test 30-minute focus blocks',
  hypothesisKey = 'shorter_sessions_sustainable',
  targetTrials = 4,
  parameterName = 'targetMinutes',
  parameterValue = 30,
  controlValue = 45,
  description = 'Testing whether 30-minute sessions reduce phone interruptions and improve completion.'
}) {
  const current = loadExperiments();
  // Conclude any existing active experiment for same hypothesis
  const updated = current.map(exp =>
    exp.hypothesisKey === hypothesisKey && exp.status === EXPERIMENT_STATUS.ACTIVE
      ? { ...exp, status: EXPERIMENT_STATUS.CONCLUDED, concludedAt: Date.now() }
      : exp
  );

  const newExp = {
    id,
    title,
    hypothesisKey,
    targetTrials,
    parameterName,
    parameterValue,
    controlValue,
    description,
    trialsCompleted: 0,
    trialResults: [],
    status: EXPERIMENT_STATUS.ACTIVE,
    startedAt: Date.now()
  };

  saveExperiments([...updated, newExp]);
  return newExp;
}

/**
 * Records a session outcome into active experiments
 */
export function recordSessionInExperiment(sessionData) {
  const current = loadExperiments();
  let updatedAny = false;

  const updated = current.map(exp => {
    if (exp.status !== EXPERIMENT_STATUS.ACTIVE) return exp;

    const hasPhoneTelemetry = Boolean(sessionData.hasPhoneTelemetry && typeof sessionData.interruptionCount === 'number');
    const trial = {
      sessionId: sessionData.id || sessionData.sessionId,
      durationMinutes: sessionData.durationMinutes || 0,
      interruptionCount: hasPhoneTelemetry ? sessionData.interruptionCount : (typeof sessionData.interruptionCount === 'number' ? sessionData.interruptionCount : null),
      hasPhoneTelemetry,
      difficulty: sessionData.difficulty || 'medium',
      explainWithoutNotes: sessionData.explainWithoutNotes || 'yes',
      completedAt: Date.now()
    };

    const newTrials = [...exp.trialResults, trial];
    const newCount = exp.trialsCompleted + 1;
    const isFinished = newCount >= exp.targetTrials;

    let conclusion = null;
    if (isFinished) {
      // Evaluate outcome
      const trialsWithTelemetry = newTrials.filter(t => t.hasPhoneTelemetry && typeof t.interruptionCount === 'number');
      const hasTelemetry = trialsWithTelemetry.length > 0;
      const avgInterruptions = hasTelemetry
        ? (trialsWithTelemetry.reduce((sum, t) => sum + t.interruptionCount, 0) / trialsWithTelemetry.length)
        : null;
      const completedTrials = newTrials.filter(t => t.durationMinutes >= (exp.parameterValue * 0.8)).length;
      const completionRate = completedTrials / newTrials.length;

      const improved = completionRate >= 0.75 && (avgInterruptions === null || avgInterruptions <= 1.5);
      conclusion = {
        outcome: improved ? 'strengthened' : 'neutral',
        completionRate,
        avgInterruptions,
        summary: improved
          ? (hasTelemetry
              ? `30-minute sessions produced ${Math.round(completionRate * 100)}% completion with minimal interruptions.`
              : `30-minute sessions produced ${Math.round(completionRate * 100)}% completion consistency.`)
          : 'No statistically significant difference in attention stability was detected.'
      };
    }

    updatedAny = true;
    return {
      ...exp,
      trialsCompleted: newCount,
      trialResults: newTrials,
      status: isFinished ? EXPERIMENT_STATUS.CONCLUDED : EXPERIMENT_STATUS.ACTIVE,
      concludedAt: isFinished ? Date.now() : null,
      conclusion
    };
  });

  if (updatedAny) {
    saveExperiments(updated);
  }

  return updated.find(e => e.status === EXPERIMENT_STATUS.ACTIVE) || null;
}

/**
 * Gets the current active experiment if any
 */
export function getActiveExperiment() {
  const current = loadExperiments();
  return current.find(e => e.status === EXPERIMENT_STATUS.ACTIVE) || null;
}

/**
 * Cancels or ends an active experiment early
 */
export function cancelActiveExperiment(id) {
  const current = loadExperiments();
  const updated = current.map(e => e.id === id ? { ...e, status: EXPERIMENT_STATUS.CANCELLED } : e);
  saveExperiments(updated);
}
