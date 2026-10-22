/**
 * adaptiveLearningEngine.test.js
 *
 * Comprehensive Unit and Integration Test Suite for:
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE
 *
 * Verifies:
 * 1. Provenance tracking: DECLARED vs OBSERVED vs DERIVED vs HYPOTHESIS (Prompt #3 & #4)
 * 2. Minimum sample requirements (<3 insufficient, 3-6 weak, 7+ stable) (Prompt #9)
 * 3. Session duration adaptation (30m vs 45m friction) (Prompt #1, #8, #37)
 * 4. Prerequisite scaffolding on repeated struggle without lowering standards (Prompt #6 & #7)
 * 5. Recovery adaptation (anti-cascade on 7-day absence) (Prompt #14 & #37)
 * 6. Resource reality adaptation (no hardware -> simulation mode) (Prompt #13 & #37)
 * 7. User autonomy: Accept, Reject (cooldown muting), Why (evidence drawer), Revert (Prompt #18, #19, #35, #38)
 * 8. Behavioral experiment engine (Prompt #20)
 * 9. UI rendering integration across NOW, PATH, GROWTH, and IDENTITY (Prompt #40)
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  collectRawSignals,
  deriveFeatures,
  evaluateHypotheses,
  generateRecommendations,
  resolveAdaptiveState,
  acceptAdaptiveRecommendation,
  rejectAdaptiveRecommendation,
  revertAdaptiveRecommendation,
  startExperiment,
  recordSessionInExperiment,
  getActiveExperiment,
  cancelActiveExperiment,
  isRejectionActive,
  HYPOTHESIS_STATUS,
  RECOMMENDATION_TYPES
} from '../adaptive';
import AdaptiveInterventionCard from '../components/AdaptiveInterventionCard';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Adaptive Learning Engine Subsystem', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    localStorage.clear();
  });

  // =========================================================================
  // TEST GROUP 1: Signal Collection & Provenance (Prompt #3 & #4)
  // =========================================================================
  describe('Signal Collection & Provenance Tracking', () => {
    test('separates declared, observed, and derived signals with source tags', () => {
      const mockIdentity = {
        resources: { hardware: ['Laptop', 'ESP32'] },
        timeReality: { weekdayMinutes: 30 },
        preferences: { executionBias: 'build-to-understand' }
      };

      const mockSessions = [
        { id: 'sess-1', durationMinutes: 30, difficulty: 'medium', startedAt: new Date().toISOString() }
      ];

      const signals = collectRawSignals({
        sessions: mockSessions,
        identity: mockIdentity,
        subjects: []
      });

      const hardwareSignal = signals.find(s => s.key === 'declared_hardware');
      expect(hardwareSignal).toBeDefined();
      expect(hardwareSignal.source).toBe('declared');
      expect(hardwareSignal.value).toEqual(['Laptop', 'ESP32']);

      const sessionsSignal = signals.find(s => s.key === 'observed_sessions');
      expect(sessionsSignal).toBeDefined();
      expect(sessionsSignal.source).toBe('observed');
      expect(sessionsSignal.value.length).toBe(1);
    });
  });

  // =========================================================================
  // TEST GROUP 2: Sample Size Gating & No Overfitting (Prompt #9 & #36)
  // =========================================================================
  describe('Sample Size Gating (Don’t Overfit)', () => {
    test('< 3 observations is insufficient evidence and produces no speculative recommendations', () => {
      const signals = collectRawSignals({
        sessions: [
          { id: 'sess-1', durationMinutes: 45, startedAt: Date.now() - 3600000 }
        ],
        identity: { resources: { hardware: ['ESP32'] } }
      });

      const features = deriveFeatures(signals);
      expect(features.sampleTier).toBe('insufficient');

      const hypotheses = evaluateHypotheses(features);
      const recommendations = generateRecommendations({ features, hypotheses });

      // No aggressive or speculative recommendations generated from only 1 session
      const durationRec = recommendations.find(r => r.type === RECOMMENDATION_TYPES.SESSION_DURATION);
      expect(durationRec).toBeUndefined();
    });

    test('7+ observations provides stable pattern confidence', () => {
      const now = Date.now();
      const mockSessions = [
        { id: 's1', durationMinutes: 28, startedAt: now - 7 * 86400000 },
        { id: 's2', durationMinutes: 30, startedAt: now - 6 * 86400000 },
        { id: 's3', durationMinutes: 32, startedAt: now - 5 * 86400000 },
        { id: 's4', durationMinutes: 30, startedAt: now - 4 * 86400000 },
        { id: 's5', durationMinutes: 25, startedAt: now - 3 * 86400000 },
        { id: 's6', durationMinutes: 45, startedAt: now - 2 * 86400000, companionTelemetry: { interruptionCount: 4 } },
        { id: 's7', durationMinutes: 45, startedAt: now - 1 * 86400000, companionTelemetry: { interruptionCount: 5 } }
      ];

      const signals = collectRawSignals({ sessions: mockSessions });
      const features = deriveFeatures(signals);

      expect(features.sampleTier).toBe('stable');
      expect(features.sampleSize).toBe(7);
      expect(features.longSessions.hasHigherFriction).toBe(true);

      const hypotheses = evaluateHypotheses(features);
      const sessionHypo = hypotheses.find(h => h.key === 'shorter_sessions_sustainable');
      expect(sessionHypo).toBeDefined();
      expect(sessionHypo.status).toBe(HYPOTHESIS_STATUS.SUPPORTED);
      expect(sessionHypo.statement).toContain('Shorter sessions');
    });
  });

  // =========================================================================
  // TEST GROUP 3: Session Length Adaptation (Prompt #8, #18, #37 Example A)
  // =========================================================================
  describe('Session Length Adaptation (Example A)', () => {
    test('recommends 30m when 45m has high friction and 25-30m is consistent', () => {
      const now = Date.now();
      const sessions = [
        { id: 's1', durationMinutes: 30, startedAt: now - 5 * 86400000 },
        { id: 's2', durationMinutes: 30, startedAt: now - 4 * 86400000 },
        { id: 's3', durationMinutes: 30, startedAt: now - 3 * 86400000 },
        { id: 's4', durationMinutes: 45, startedAt: now - 2 * 86400000, companionTelemetry: { interruptionCount: 4 } },
        { id: 's5', durationMinutes: 45, startedAt: now - 1 * 86400000, companionTelemetry: { interruptionCount: 5 } }
      ];

      const state = resolveAdaptiveState({ sessions, identity: { resources: { hardware: ['ESP32'] } } });
      const rec = state.recommendations.find(r => r.type === RECOMMENDATION_TYPES.SESSION_DURATION);

      expect(rec).toBeDefined();
      expect(rec.title).toBe('Try 30 minutes today?');
      expect(rec.suggestedValue).toBe(30);
      expect(rec.reason).toContain('Your recent 25–30 minute sessions have been completed more consistently');
      // Verifies no fake psychological claims (Prompt #23)
      expect(rec.reason).not.toContain('procrastinator');
      expect(rec.reason).not.toContain('short attention span');
    });
  });

  // =========================================================================
  // TEST GROUP 4: Recovery Adaptation (Prompt #14, #15, #37 Example C)
  // =========================================================================
  describe('Recovery Adaptation (Anti-Cascade after Absence)', () => {
    test('user absent 7 days triggers recovery recommendation without a guilt pile', () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const sessions = [
        { id: 'old-1', durationMinutes: 30, startedAt: sevenDaysAgo }
      ];

      const state = resolveAdaptiveState({ sessions });
      expect(state.recoveryState.isRecovery).toBe(true);
      expect(state.recoveryState.gapDays).toBeGreaterThanOrEqual(7);

      const recoveryRec = state.recommendations.find(r => r.type === RECOMMENDATION_TYPES.RECOVERY_MOMENTUM);
      expect(recoveryRec).toBeDefined();
      expect(recoveryRec.title).toContain('Welcome back');
      expect(recoveryRec.reason).toContain('completing 1 gentle milestone today restores consistency');
      // Must not dump backlog
      expect(recoveryRec.actions.acceptLabel).toBe('Focus on 1 Core Milestone');
    });
  });

  // =========================================================================
  // TEST GROUP 5: Resource Reality Adaptation (Prompt #13, #37 Example D)
  // =========================================================================
  describe('Resource Reality Adaptation (Example D)', () => {
    test('when no hardware is available in Identity, route adapts to Simulation Mode', () => {
      const identityNoHardware = {
        resources: { hardware: [] } // Empty list = simulation mode
      };

      const state = resolveAdaptiveState({ sessions: [], identity: identityNoHardware });
      const resourceRec = state.recommendations.find(r => r.type === RECOMMENDATION_TYPES.RESOURCE_MODE);

      expect(resourceRec).toBeDefined();
      expect(resourceRec.title).toContain('Simulation & Derivation Mode Active');
      expect(resourceRec.reason).toContain('No physical hardware kit was declared in Identity');

      const simHypothesis = state.hypotheses.find(h => h.key === 'simulation_mode_preferred');
      expect(simHypothesis).toBeDefined();
      expect(simHypothesis.status).toBe(HYPOTHESIS_STATUS.SUPPORTED);
    });
  });

  // =========================================================================
  // TEST GROUP 6: Prerequisite Scaffolding (Prompt #6 & #7, Example B)
  // =========================================================================
  describe('Prerequisite Scaffolding (Never Auto-Lower Standards)', () => {
    test('struggled sessions trigger scaffolding check rather than trivializing difficulty', () => {
      const now = Date.now();
      const sessions = [
        { id: 's1', taskId: 'rc-transient', durationMinutes: 30, difficulty: 'hard', explainWithoutNotes: 'no', startedAt: now - 3 * 86400000 },
        { id: 's2', taskId: 'rc-transient', durationMinutes: 30, difficulty: 'hard', explainWithoutNotes: 'no', startedAt: now - 2 * 86400000 },
        { id: 's3', taskId: 'rc-transient', durationMinutes: 30, difficulty: 'hard', explainWithoutNotes: 'no', startedAt: now - 1 * 86400000 }
      ];

      const state = resolveAdaptiveState({ sessions });
      const scaffoldRec = state.recommendations.find(r => r.type === RECOMMENDATION_TYPES.PREREQUISITE_SCAFFOLD);

      expect(scaffoldRec).toBeDefined();
      expect(scaffoldRec.title).toContain('Recommended: 10-min Prerequisite Review');
      expect(scaffoldRec.expectedBenefit).toContain('Prevents repeated dead-ends while maintaining full high standards');
    });
  });

  // =========================================================================
  // TEST GROUP 7: User Autonomy, Rejection Cooldown & Reversibility (Prompt #19, #35, #38)
  // =========================================================================
  describe('User Autonomy, Rejections & Reversibility', () => {
    test('rejecting recommendation mutes it and does not immediately repeat it', () => {
      const now = Date.now();
      const sessions = [
        { id: 's1', durationMinutes: 30, startedAt: now - 5 * 86400000 },
        { id: 's2', durationMinutes: 30, startedAt: now - 4 * 86400000 },
        { id: 's3', durationMinutes: 30, startedAt: now - 3 * 86400000 },
        { id: 's4', durationMinutes: 45, startedAt: now - 2 * 86400000, companionTelemetry: { interruptionCount: 4 } },
        { id: 's5', durationMinutes: 45, startedAt: now - 1 * 86400000, companionTelemetry: { interruptionCount: 5 } }
      ];

      const initial = resolveAdaptiveState({ sessions });
      expect(initial.recommendations.some(r => r.id === 'rec_session_duration_30m')).toBe(true);

      // User rejects suggestion
      rejectAdaptiveRecommendation('rec_session_duration_30m', 'shorter_sessions_sustainable');
      expect(isRejectionActive('shorter_sessions_sustainable')).toBe(true);

      // Subsequent resolution honors rejection cooldown
      const afterReject = resolveAdaptiveState({ sessions });
      expect(afterReject.recommendations.some(r => r.id === 'rec_session_duration_30m')).toBe(false);
    });

    test('accepting recommendation records action and supports reversibility', () => {
      acceptAdaptiveRecommendation('rec_session_duration_30m', { newDuration: 30 });

      // Revert action restores state
      const revertRes = revertAdaptiveRecommendation('rec_session_duration_30m');
      expect(revertRes.success).toBe(true);
    });
  });

  // =========================================================================
  // TEST GROUP 8: Behavioral Experiment Engine (Prompt #20, #42 Phase B)
  // =========================================================================
  describe('Behavioral Experiment Engine', () => {
    test('runs structured experiment trials and evaluates empirical outcome', () => {
      expect(getActiveExperiment()).toBeNull();

      const exp = startExperiment({
        id: 'exp-30m-test',
        title: 'Test 30-min blocks',
        hypothesisKey: 'shorter_sessions_sustainable',
        targetTrials: 2,
        parameterValue: 30
      });

      expect(exp.status).toBe('active');
      expect(getActiveExperiment().id).toBe('exp-30m-test');

      // Record trial 1 (30m, 0 interruptions)
      recordSessionInExperiment({
        id: 'trial-1',
        durationMinutes: 30,
        interruptionCount: 0,
        difficulty: 'medium'
      });
      expect(getActiveExperiment().trialsCompleted).toBe(1);

      // Record trial 2 (30m, 1 interruption)
      recordSessionInExperiment({
        id: 'trial-2',
        durationMinutes: 30,
        interruptionCount: 1,
        difficulty: 'medium'
      });

      // Target trials reached: experiment concludes and evaluates
      expect(getActiveExperiment()).toBeNull(); // No active experiment remaining
    });
  });

  // =========================================================================
  // TEST GROUP 9: UI Component Rendering (AdaptiveInterventionCard)
  // =========================================================================
  describe('UI Component Rendering', () => {
    test('AdaptiveInterventionCard renders title, reason, and expandable Why evidence drawer', () => {
      const mockRec = {
        id: 'rec-test-1',
        type: RECOMMENDATION_TYPES.SESSION_DURATION,
        title: 'Try 30 minutes today?',
        badge: 'Session Calibration',
        reason: 'Your recent 25–30 minute sessions have been completed more consistently.',
        evidenceSummary: '4 of 4 short sessions completed without interruption.',
        expectedBenefit: 'Higher attention integrity.',
        isAccepted: false,
        actions: {
          acceptLabel: 'Try 30 min',
          rejectLabel: 'Keep 45 min',
          whyLabel: 'Why this suggestion?'
        }
      };

      act(() => {
        root.render(
          <AdaptiveInterventionCard
            recommendation={mockRec}
            onAccept={jest.fn()}
            onReject={jest.fn()}
            onRevert={jest.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Try 30 minutes today?');
      expect(container.textContent).toContain('Your recent 25–30 minute sessions');
      expect(container.textContent).toContain('Try 30 min');
      expect(container.textContent).toContain('Keep 45 min');

      // Expand evidence drawer
      const whyButton = container.querySelector('button[title="Inspect evidence behind this recommendation"]');
      expect(whyButton).not.toBeNull();

      act(() => {
        whyButton.click();
      });

      expect(container.textContent).toContain('OBSERVED BEHAVIORAL EVIDENCE');
      expect(container.textContent).toContain('4 of 4 short sessions completed without interruption');
      expect(container.textContent).toContain('Higher attention integrity');
    });

    test('AdaptiveInterventionCard renders accepted state with Revert action', () => {
      const mockAcceptedRec = {
        id: 'rec-test-2',
        type: RECOMMENDATION_TYPES.PREREQUISITE_SCAFFOLD,
        title: 'Recommended: 10-min Prerequisite Review',
        badge: 'Scaffolding Check',
        reason: 'Reviewing core principles first strengthens your foundation.',
        isAccepted: true,
        actions: {
          revertLabel: 'Revert Route Adjustment'
        }
      };

      act(() => {
        root.render(
          <AdaptiveInterventionCard
            recommendation={mockAcceptedRec}
            onRevert={jest.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Active Calibration');
      expect(container.textContent).toContain('Revert Route Adjustment');
    });
  });

});
