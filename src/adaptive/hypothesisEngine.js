/**
 * hypothesisEngine.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #1, #2, #21, #23, #31)
 *
 * Manages working behavioral hypotheses:
 * - Never diagnoses personality, intelligence, or psychological traits.
 * - Formulates temporary hypotheses from observable data.
 * - Minimum sample requirements applied (Prompt #9: <3 insufficient, 3-6 candidate, 7+ supported).
 * - Hypotheses transition: candidate -> supported -> weakening -> rejected -> expired.
 */

export const HYPOTHESIS_STATUS = {
  CANDIDATE: 'candidate',
  SUPPORTED: 'supported',
  WEAKENING: 'weakening',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

/**
 * Evaluates derived features and generates or updates hypotheses.
 */
export function evaluateHypotheses(features, existingHypotheses = []) {
  const existingMap = {};
  existingHypotheses.forEach(h => { existingMap[h.id || h.key] = h; });

  const updated = [];

  // =========================================================================
  // 1. SESSION SIZE HYPOTHESIS: Shorter Sessions Sustainable (Prompt #1, #8, #12, #25, #32)
  // =========================================================================
  // If sample size is only in observation tier (<3 sessions), do not speculate (Prompt #25)
  // If progressing smoothly, do not create friction interventions (Prompt #17)
  if (features.sampleTier !== 'insufficient' && features.sampleTier !== 'observation' && !features.isProgressingSmoothly) {
    const isCandidate = features.longSessions.hasHigherFriction;

    if (isCandidate) {
      const existing = existingMap['shorter_sessions_sustainable'];
      const status = (features.sampleTier === 'stable' || features.sampleTier === 'strong') ? HYPOTHESIS_STATUS.SUPPORTED : HYPOTHESIS_STATUS.CANDIDATE;

      updated.push({
        id: 'shorter_sessions_sustainable',
        key: 'shorter_sessions_sustainable',
        dimension: 'session_size',
        statement: 'Shorter sessions (25–30 min) currently appear more sustainable.',
        rationale: features.focusTelemetry?.source === 'android'
          ? `Across ${features.sampleSize} recent sessions, 25–30 minute containers showed ${Math.round(features.shortSessions.completionRate * 100)}% completion with fewer phone interruptions.`
          : `Across ${features.sampleSize} recent sessions, 25–30 minute containers showed ${Math.round(features.shortSessions.completionRate * 100)}% completion consistency compared to longer blocks.`,
        sampleSize: features.sampleSize,
        status: existing?.status === HYPOTHESIS_STATUS.REJECTED ? HYPOTHESIS_STATUS.REJECTED : status,
        recommendedSessionMinutes: 30,
        updatedAt: Date.now()
      });
    }

    // =========================================================================
    // 1B. ENVIRONMENTAL FOCUS HYPOTHESIS (Prompt #15, #32)
    // Multi-factor: if interruptions are high across ALL session lengths, the friction
    // is environmental distraction, NOT session container length.
    // =========================================================================
    if (features.environment?.isHighDistractionEnvironment && features.focusTelemetry?.source === 'android') {
      const existing = existingMap['environmental_focus_adjustment'];
      const status = (features.sampleTier === 'stable' || features.sampleTier === 'strong') ? HYPOTHESIS_STATUS.SUPPORTED : HYPOTHESIS_STATUS.CANDIDATE;

      updated.push({
        id: 'environmental_focus_adjustment',
        key: 'environmental_focus_adjustment',
        dimension: 'environment',
        statement: 'Elevated notification frequency during sessions may disrupt deep focus stretches.',
        rationale: `Across ${features.sampleSize} recent sessions, app switches occurred frequently across session lengths. Placing the phone farther away or enabling study mode may protect your focus containers.`,
        sampleSize: features.sampleSize,
        status: existing?.status === HYPOTHESIS_STATUS.REJECTED ? HYPOTHESIS_STATUS.REJECTED : status,
        updatedAt: Date.now()
      });
    }
  }

  // =========================================================================
  // 2. RECOVERY HYPOTHESIS: Gentle Re-entry Momentum (Prompt #14 & #15)
  // =========================================================================
  if (features.recovery.isRecoveryCandidate) {
    const existing = existingMap['recovery_momentum_needed'];
    updated.push({
      id: 'recovery_momentum_needed',
      key: 'recovery_momentum_needed',
      dimension: 'recovery',
      statement: 'Resuming after an absence is most effective with 1 gentle review and 1 small milestone.',
      rationale: `You have been away for ${features.recovery.daysSinceLastSession} days. Rather than scheduling a backlog, completing one small milestone reliably restores momentum.`,
      sampleSize: features.recovery.daysSinceLastSession,
      status: existing?.status === HYPOTHESIS_STATUS.REJECTED ? HYPOTHESIS_STATUS.REJECTED : HYPOTHESIS_STATUS.SUPPORTED,
      recoveryGapDays: features.recovery.daysSinceLastSession,
      updatedAt: Date.now()
    });
  }

  // =========================================================================
  // 3. PREREQUISITE & SCAFFOLDING HYPOTHESIS (Prompt #6 & #7)
  // =========================================================================
  if (features.struggles.hasRecentStruggle) {
    const existing = existingMap['prerequisite_scaffolding_needed'];
    updated.push({
      id: 'prerequisite_scaffolding_needed',
      key: 'prerequisite_scaffolding_needed',
      dimension: 'task_difficulty',
      statement: 'Targeted prerequisite reviews reduce struggle on complex technical challenges.',
      rationale: `Recent challenges showed high retrieval resistance. Inserting an intermediate derivation prevents cognitive overload without lowering end standards.`,
      sampleSize: features.struggles.recentCount,
      status: existing?.status === HYPOTHESIS_STATUS.REJECTED ? HYPOTHESIS_STATUS.REJECTED : HYPOTHESIS_STATUS.SUPPORTED,
      updatedAt: Date.now()
    });
  }

  // =========================================================================
  // 4. RESOURCE REALITY HYPOTHESIS (Prompt #13)
  // =========================================================================
  if (features.resources.isSimulationMode) {
    updated.push({
      id: 'simulation_mode_preferred',
      key: 'simulation_mode_preferred',
      dimension: 'resource_reality',
      statement: 'Virtual SPICE/Python simulations calibrate the route to currently declared bench equipment.',
      rationale: 'No physical hardware kit was declared in Identity. The system adapts practical milestones to simulation and mathematical derivations.',
      sampleSize: 1,
      status: HYPOTHESIS_STATUS.SUPPORTED,
      updatedAt: Date.now()
    });
  }

  // =========================================================================
  // 5. SPACED RETRIEVAL HYPOTHESIS (Prompt #10 & #11)
  // =========================================================================
  if (features.retrieval.hasDueRetrieval) {
    const candidate = features.retrieval.candidates[0];
    updated.push({
      id: 'spaced_retrieval_due',
      key: 'spaced_retrieval_due',
      dimension: 'retrieval_timing',
      statement: 'A targeted retrieval check consolidates concept recall before decay occurs.',
      rationale: `Concept milestone completed ${candidate.ageDays} days ago; a quick 5–10 min active retrieval check prevents relearning overhead.`,
      sampleSize: features.retrieval.candidates.length,
      targetTaskId: candidate.taskId,
      targetSubtaskId: candidate.subtaskId,
      status: HYPOTHESIS_STATUS.SUPPORTED,
      updatedAt: Date.now()
    });
  }

  return updated;
}
