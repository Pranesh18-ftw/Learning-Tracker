/**
 * recommendationEngine.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #18, #19, #32, #33, #34, #35, #38)
 *
 * Generates structured, deterministic recommendations from supported hypotheses.
 * - Always includes a concise, empirical "Why"
 * - Reversible & customizable: Accept, Reject, Why, Revert
 * - Respects previous user rejections to avoid notification annoyance
 * - Never makes large automatic changes from single data points
 */

import { isRejectionActive, loadAcceptedActions } from './adaptiveStorage';
import { HYPOTHESIS_STATUS } from './hypothesisEngine';

export const RECOMMENDATION_TYPES = {
  SESSION_DURATION: 'session_duration',
  ENVIRONMENT_FOCUS: 'environment_focus',
  PREREQUISITE_SCAFFOLD: 'prerequisite_scaffold',
  RECOVERY_MOMENTUM: 'recovery_momentum',
  SPACED_RETRIEVAL: 'spaced_retrieval',
  RESOURCE_MODE: 'resource_mode'
};

export function generateRecommendations({
  features,
  hypotheses = [],
  currentContext = {}
}) {
  // Prompt #17: If the learner is progressing smoothly, completing sessions,
  // retaining material, and adapting independently: DO NOTHING.
  // The absence of intervention is itself a successful state.
  if (features.isProgressingSmoothly) {
    return [];
  }

  const recommendations = [];
  const acceptedActions = loadAcceptedActions();

  // If sample size is insufficient (<3 sessions), do not make speculative behavioral recommendations (Prompt #25, #35)
  // However, declared reality calibrations (hardware/resource mode) and recovery gaps are always applicable.
  const isBehavioralGated = features.sampleTier === 'observation';

  // Find active, non-rejected hypotheses
  const activeHypotheses = hypotheses.filter(h =>
    h.status === HYPOTHESIS_STATUS.SUPPORTED || h.status === HYPOTHESIS_STATUS.CANDIDATE
  );

  activeHypotheses.forEach(hypo => {
    // For speculative behavioral hypotheses, require sufficient sample size (Prompt #25)
    if (isBehavioralGated && hypo.dimension !== 'resource_reality' && hypo.dimension !== 'recovery') {
      return;
    }

    // Check if user previously rejected this recommendation key (Prompt #33)
    if (isRejectionActive(hypo.key)) {
      return;
    }

    // Trajectory / Goal change check (Prompt #34)
    // If context indicates a trajectory change, suppress outdated career-specific recommendations
    if (currentContext.trajectoryChanged && hypo.dimension === 'career_alignment') {
      return;
    }

    // =======================================================================
    // 1. SESSION DURATION RECOMMENDATION — EXPERIMENT (Prompt #12, #13, #14)
    // =======================================================================
    if (hypo.key === 'shorter_sessions_sustainable') {
      const recId = 'rec_session_duration_30m';
      const isAlreadyAccepted = Boolean(acceptedActions[recId]);

      recommendations.push({
        id: recId,
        hypothesisKey: hypo.key,
        type: RECOMMENDATION_TYPES.SESSION_DURATION,
        surface: 'NOW',
        title: 'Try 30 minutes today?',
        experimentTitle: 'Try 30-minute sessions for the next 5 sessions?',
        suggestedValue: 30,
        badge: 'Focus Experiment',
        reason: 'Your recent 25–30 minute sessions have been completed more consistently with fewer interruptions.',
        evidenceSummary: `${features.shortSessions.count} recent 30m sessions had ${Math.round(features.shortSessions.completionRate * 100)}% completion with minimal interruptions.`,
        expectedBenefit: 'Higher attention integrity and lower cognitive fatigue.',
        isAccepted: isAlreadyAccepted,
        experiment: {
          hypothesisKey: hypo.key,
          targetTrials: 5,
          parameterValue: 30,
          controlValue: 45
        },
        actions: {
          acceptLabel: 'Try it',
          deferLabel: 'Not now',
          rejectLabel: 'Keep current plan',
          whyLabel: 'Why?'
        },
        whyExplanation: 'Evidence shows shorter 30-minute focus containers had fewer interruptions and higher completion compared to longer 45-minute blocks.'
      });
    }

    // =======================================================================
    // 1B. ENVIRONMENTAL FOCUS ADJUSTMENT (Prompt #15, #32)
    // =======================================================================
    if (hypo.key === 'environmental_focus_adjustment') {
      const recId = 'rec_environment_focus';
      const isAlreadyAccepted = Boolean(acceptedActions[recId]);

      recommendations.push({
        id: recId,
        hypothesisKey: hypo.key,
        type: RECOMMENDATION_TYPES.ENVIRONMENT_FOCUS,
        surface: 'NOW',
        title: 'Try placing companion phone out of reach?',
        badge: 'Environment',
        reason: 'Your interruptions are elevated across sessions; placing the phone farther away or setting Do Not Disturb may protect your deep focus periods.',
        evidenceSummary: `${features.environment?.distractionRate ? Math.round(features.environment.distractionRate * 100) : 50}% of recent sessions experienced phone app switches.`,
        expectedBenefit: 'Reduces involuntary glances and maintains working memory.',
        isAccepted: isAlreadyAccepted,
        actions: {
          acceptLabel: 'Try it',
          deferLabel: 'Not now',
          rejectLabel: 'Keep current setup',
          whyLabel: 'Why?'
        },
        whyExplanation: 'Observations across multiple sessions indicate app notifications or switches fragmented your attention, regardless of session length.'
      });
    }

    // =======================================================================
    // 2. RECOVERY MOMENTUM RECOMMENDATION (Prompt #14 & #15)
    // =======================================================================
    if (hypo.key === 'recovery_momentum_needed') {
      const recId = 'rec_recovery_momentum';
      const isAlreadyAccepted = Boolean(acceptedActions[recId]);

      recommendations.push({
        id: recId,
        type: RECOMMENDATION_TYPES.RECOVERY_MOMENTUM,
        surface: 'NOW',
        title: 'Welcome back. Let’s restore momentum.',
        badge: 'Momentum Recovery',
        reason: `You've been away for ${hypo.recoveryGapDays} days. Instead of facing a pile of postponed work, completing 1 gentle milestone today restores consistency.`,
        evidenceSummary: `Previous absences show that completing 1 small task immediately restores learning continuity.`,
        expectedBenefit: 'Regains momentum without overwhelm or guilt.',
        isAccepted: isAlreadyAccepted,
        actions: {
          acceptLabel: 'Focus on 1 Core Milestone',
          rejectLabel: 'Show Full Roadmap',
          whyLabel: 'Why this approach?'
        }
      });
    }

    // =======================================================================
    // 3. PREREQUISITE SCAFFOLDING RECOMMENDATION (Prompt #6 & #7)
    // =======================================================================
    if (hypo.key === 'prerequisite_scaffolding_needed') {
      const recId = 'rec_prerequisite_scaffold';
      const isAlreadyAccepted = Boolean(acceptedActions[recId]);

      recommendations.push({
        id: recId,
        type: RECOMMENDATION_TYPES.PREREQUISITE_SCAFFOLD,
        surface: 'PATH',
        title: 'Recommended: 10-min Prerequisite Review',
        badge: 'Scaffolding Check',
        reason: 'Recent challenges indicated friction with fundamental derivations. Reviewing the core principle first strengthens your foundation before the next build.',
        evidenceSummary: `${features.struggles.recentCount} recent attempts reported high retrieval resistance.`,
        expectedBenefit: 'Prevents repeated dead-ends while maintaining full high standards.',
        isAccepted: isAlreadyAccepted,
        actions: {
          acceptLabel: 'Insert Prerequisite Check',
          rejectLabel: 'Proceed Directly',
          revertLabel: 'Revert Route Adjustment',
          whyLabel: 'Why this review?'
        }
      });
    }

    // =======================================================================
    // 4. RESOURCE REALITY RECOMMENDATION (Prompt #13)
    // =======================================================================
    if (hypo.key === 'simulation_mode_preferred') {
      const recId = 'rec_resource_simulation';
      recommendations.push({
        id: recId,
        type: RECOMMENDATION_TYPES.RESOURCE_MODE,
        surface: 'PATH',
        title: 'Simulation & Derivation Mode Active',
        badge: 'Bench Calibration',
        reason: 'No physical hardware kit was declared in Identity. Practical milestones are adapted to SPICE circuits and mathematical modeling.',
        evidenceSummary: 'Declared inventory in Identity has 0 physical hardware bench tools.',
        expectedBenefit: 'Enables complete STEM progress without requiring physical hardware purchases.',
        isAccepted: true, // Auto-reflected by identity reality
        actions: {
          acceptLabel: 'Acknowledged',
          rejectLabel: 'Declare Hardware Kit',
          whyLabel: 'How is this calibrated?'
        }
      });
    }

    // =======================================================================
    // 5. SPACED RETRIEVAL RECOMMENDATION (Prompt #10 & #11)
    // =======================================================================
    if (hypo.key === 'spaced_retrieval_due') {
      const recId = 'rec_spaced_retrieval';
      const isAlreadyAccepted = Boolean(acceptedActions[recId]);

      recommendations.push({
        id: recId,
        type: RECOMMENDATION_TYPES.SPACED_RETRIEVAL,
        surface: 'NOW',
        title: 'Spaced Retrieval: Quick 5-Min Memory Check',
        badge: 'Active Recall',
        reason: 'A concept you worked on several days ago is ready for memory consolidation.',
        evidenceSummary: 'Previous reflection indicated recall effort; spaced retrieval locks it into long-term memory.',
        expectedBenefit: 'Cuts future relearning time in half.',
        isAccepted: isAlreadyAccepted,
        actions: {
          acceptLabel: 'Quick Retrieval Check',
          rejectLabel: 'Skip for Today',
          whyLabel: 'Why retrieve now?'
        }
      });
    }
  });

  return recommendations;
}
