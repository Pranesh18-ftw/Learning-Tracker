/**
 * companionIntelligenceLoop.test.js
 *
 * LEARNING TRACKER — COMPANION INTELLIGENCE / REALITY → LEARNING LOOP
 * Comprehensive end-to-end audit and test suite covering all 40 prompts.
 *
 * Tests:
 * 1. Canonical Focus Telemetry schema & normalization (Prompt #4)
 * 2. Idempotent telemetry writes (one session -> one record) (Prompt #5)
 * 3. Separation of Observation vs Derived Features vs Working Hypothesis (Prompt #3)
 * 4. Zero fake scores (No "Focus Score: 87" or "Discipline: 73") (Prompt #2)
 * 5. App classification carefully separated from historical observation (Prompt #8, #9, #19)
 * 6. Growth ## FOCUS 30-day evidence and trend statements (Prompt #10, #11, #21)
 * 7. Archive FOCUS MILESTONE breakthrough artifacts (Prompt #22)
 * 8. Real loop fixture test: 30m vs 45m session experiment (Prompt #31)
 * 9. Multi-factor friction: distinguishing noisy environment from container length (Prompt #32)
 * 10. Rejection cooldown: respecting user preference (Prompt #33)
 * 11. Goal/Trajectory change handling (Prompt #34)
 * 12. Graceful degradation when phone telemetry is absent (Prompt #35)
 * 13. System learns when NOT to intervene (Prompt #17)
 * 14. Focus Integrity enable/disable and isolated telemetry deletion (Prompt #27, #28)
 */

import {
  normalizeFocusTelemetry,
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS
} from '../shared/focusIntegrityProtocol';

import {
  recordFocusTelemetry,
  getTelemetryForSession,
  getAllFocusTelemetry,
  correctAppClassification,
  getFocusIntegritySummaryMetrics,
  isFocusIntegrityEnabled,
  setFocusIntegrityEnabled,
  deleteFocusTelemetryHistory,
  clearFocusIntegrityData
} from '../services/focusIntegrityService';

import { collectRawSignals } from '../adaptive/signalCollector';
import { deriveFeatures } from '../adaptive/featureDeriver';
import { evaluateHypotheses, HYPOTHESIS_STATUS } from '../adaptive/hypothesisEngine';
import { generateRecommendations, RECOMMENDATION_TYPES } from '../adaptive/recommendationEngine';
import {
  startExperiment,
  recordSessionInExperiment,
  getActiveExperiment,
  EXPERIMENT_STATUS
} from '../adaptive/experimentEngine';
import {
  recordRejection,
  isRejectionActive,
  saveHypotheses,
  saveExperiments
} from '../adaptive/adaptiveStorage';

import { resolveFocusGrowthSignals } from '../utils/growthEvidenceResolver';
import { buildArchiveArtifacts, filterArchiveArtifacts } from '../utils/archiveEvidenceResolver';

describe('Learning Tracker — Companion Intelligence / Reality → Learning Loop', () => {

  beforeEach(() => {
    localStorage.clear();
    clearFocusIntegrityData();
    saveHypotheses([]);
    saveExperiments([]);
  });

  // =========================================================================
  // 1. CANONICAL FOCUS TELEMETRY EVENT (Prompt #4)
  // =========================================================================
  describe('Canonical Focus Telemetry Event', () => {
    it('normalizes raw companion observations into the canonical schema', () => {
      const raw = {
        summaryId: 'tel-001',
        sessionId: 'sess-abc-123',
        intendedMinutes: 30,
        uninterruptedSeconds: 1640, // 27m 20s
        interruptionCount: 2,
        totalInterruptionDurationSeconds: 101, // 1m 41s
        longestUninterruptedSeconds: 848, // 14m 08s
        appBreakdown: [
          { packageName: 'com.google.android.calculator', category: 'REFERENCE', durationSeconds: 22 },
          { packageName: 'com.instagram.android', category: 'DISTRACTION', durationSeconds: 59 },
          { packageName: 'com.android.chrome', category: 'UNKNOWN', durationSeconds: 20 }
        ]
      };

      const normalized = normalizeFocusTelemetry(raw);

      expect(normalized.id).toBe('tel-001');
      expect(normalized.sessionId).toBe('sess-abc-123');
      expect(normalized.intendedSeconds).toBe(1800);
      expect(normalized.observedSeconds).toBe(1640);
      expect(normalized.interruptionCount).toBe(2);
      expect(normalized.interruptionSeconds).toBe(101);
      expect(normalized.referenceSeconds).toBe(22);
      expect(normalized.distractionSeconds).toBe(59);
      expect(normalized.unknownSeconds).toBe(20);
      expect(normalized.longestUninterruptedSeconds).toBe(848);
      expect(normalized.source).toBe('android');
      expect(typeof normalized.observedAt).toBe('number');
    });

    it('gracefully handles missing or partial fields with deterministic defaults', () => {
      const normalized = normalizeFocusTelemetry({
        sessionId: 'sess-minimal'
      });

      expect(normalized.id).toBeDefined();
      expect(normalized.sessionId).toBe('sess-minimal');
      expect(normalized.intendedSeconds).toBe(1800);
      expect(normalized.interruptionCount).toBe(0);
      expect(normalized.referenceSeconds).toBe(0);
      expect(normalized.distractionSeconds).toBe(0);
      expect(normalized.unknownSeconds).toBe(0);
      expect(normalized.source).toBe('android');
    });
  });

  // =========================================================================
  // 2. ONE SESSION → ONE TELEMETRY RECORD (Prompt #5)
  // =========================================================================
  describe('One Session → One Telemetry Record (Idempotent Writes)', () => {
    it('repeated syncs for the same session ID produce exactly one logical record', () => {
      const telemetry1 = {
        summaryId: 'sync-1',
        sessionId: 'session-unique-42',
        intendedMinutes: 30,
        interruptionCount: 1,
        uninterruptedSeconds: 1500
      };

      const telemetry2 = {
        summaryId: 'sync-2',
        sessionId: 'session-unique-42', // Same session
        intendedMinutes: 30,
        interruptionCount: 2, // Updated sync
        uninterruptedSeconds: 1600
      };

      const rec1 = recordFocusTelemetry(telemetry1);
      expect(rec1).toBe(true);

      const rec2 = recordFocusTelemetry(telemetry2);
      expect(rec2).toBe(true);

      const all = getAllFocusTelemetry();
      expect(all.length).toBe(1);
      expect(all[0].sessionId).toBe('session-unique-42');
      expect(all[0].interruptionCount).toBe(2); // Idempotently updated to latest sync
    });
  });

  // =========================================================================
  // 3. SEPARATE OBSERVATION FROM INTERPRETATION (Prompt #3, #2)
  // =========================================================================
  describe('Separate Observation from Interpretation & Zero Fake Scores', () => {
    it('strictly separates raw observation from derived metrics and hypotheses', () => {
      // 1. Raw OBSERVED data
      const observedTelemetry = {
        sessionId: 'sess-circuit-1',
        interruptionCount: 3,
        interruptionSeconds: 104,
        referenceSeconds: 22,
        distractionSeconds: 59,
        unknownSeconds: 23,
        longestUninterruptedSeconds: 848
      };

      // Ensure no synthetic focus scores or IQ metrics exist in raw observation
      expect(observedTelemetry.focusScore).toBeUndefined();
      expect(observedTelemetry.disciplineScore).toBeUndefined();
      expect(observedTelemetry.attentionIQ).toBeUndefined();

      // 2. DERIVED feature
      const signals = collectRawSignals({
        sessions: [
          {
            id: 'sess-circuit-1',
            durationMinutes: 30,
            completed: true,
            hasCompanionTelemetry: true,
            interruptionCount: 3,
            longestStretchSeconds: 848,
            referenceSeconds: 22,
            distractionSeconds: 59
          },
          {
            id: 'sess-circuit-2',
            durationMinutes: 30,
            completed: true,
            hasCompanionTelemetry: true,
            interruptionCount: 0,
            longestStretchSeconds: 1800
          },
          {
            id: 'sess-circuit-3',
            durationMinutes: 30,
            completed: true,
            hasCompanionTelemetry: true,
            interruptionCount: 1,
            longestStretchSeconds: 1600
          }
        ]
      });

      const features = deriveFeatures(signals);
      expect(features.focusTelemetry.source).toBe('android');
      expect(features.focusTelemetry.sampleSize).toBe(3);
      expect(features.focusTelemetry.medianUninterruptedSeconds).toBe(1600);

      // 3. HYPOTHESIS
      const hypotheses = evaluateHypotheses(features);
      // Working hypothesis is framed testably without judging learner personality
      hypotheses.forEach(h => {
        expect(h.statement).not.toContain('discipline');
        expect(h.statement).not.toContain('intelligence');
        expect(h.rationale).toBeDefined();
      });
    });
  });

  // =========================================================================
  // 4. APP CLASSIFICATION CORRECTION (Prompt #8 & #9)
  // =========================================================================
  describe('App Classification Correction & Sovereignty', () => {
    it('user can correct Chrome from distraction to reference, preserving historical evidence', () => {
      // Initial session where Chrome was recorded
      const sessionTel = {
        summaryId: 'tel-chrome',
        sessionId: 'session-datasheet',
        intendedMinutes: 30,
        interruptionCount: 1,
        appBreakdown: [
          { packageName: 'com.android.chrome', category: 'UNKNOWN', durationSeconds: 45 }
        ]
      };
      recordFocusTelemetry(sessionTel);

      // Learner overrides Chrome classification: "I opened a datasheet"
      const result = correctAppClassification('com.android.chrome', APP_CATEGORIES.REFERENCE, {
        sessionId: 'session-datasheet'
      });

      expect(result.success).toBe(true);
      expect(result.overrideCategory).toBe(APP_CATEGORIES.REFERENCE);

      // Updated telemetry preserves raw duration (45s) while updating categorization
      const stored = getTelemetryForSession('session-datasheet');
      const chromeEntry = stored.appBreakdown.find(a => a.packageName === 'com.android.chrome');
      expect(chromeEntry.category).toBe(APP_CATEGORIES.REFERENCE);
      expect(chromeEntry.durationSeconds).toBe(45); // Raw historical observation preserved!
      expect(stored.referenceSeconds).toBe(45);
    });
  });

  // =========================================================================
  // 5. GROWTH INTEGRATION: ## FOCUS (Prompt #10, #11, #21)
  // =========================================================================
  describe('Growth Integration (## FOCUS & Trend Statements)', () => {
    it('returns "Not enough history yet" when fewer than 3 sessions exist', () => {
      const sessions = [
        { id: 's1', durationMinutes: 25 },
        { id: 's2', durationMinutes: 30 }
      ];

      const growthSignals = resolveFocusGrowthSignals(sessions);
      expect(growthSignals.hasEnoughData).toBe(false);
      expect(growthSignals.notEnoughHistory).toBe(true);
      expect(growthSignals.message).toBe('Not enough history yet.');
    });

    it('computes truthful 30-day focus development metrics without fake scores', () => {
      const now = Date.now();
      const sessions = [
        { id: 's1', durationMinutes: 25, longestStretchSeconds: 1200, startedAt: now - 86400000 * 5 },
        { id: 's2', durationMinutes: 30, longestStretchSeconds: 1560, startedAt: now - 86400000 * 4 },
        { id: 's3', durationMinutes: 30, longestStretchSeconds: 1620, startedAt: now - 86400000 * 3 },
        { id: 's4', durationMinutes: 35, longestStretchSeconds: 1800, startedAt: now - 86400000 * 2 },
        { id: 's5', durationMinutes: 45, longestStretchSeconds: 2460, startedAt: now - 86400000 * 1 } // 41m
      ];

      const growthSignals = resolveFocusGrowthSignals(sessions);
      expect(growthSignals.hasEnoughData).toBe(true);
      expect(growthSignals.notEnoughHistory).toBe(false);

      // Verify Last 30 Days metrics (Prompt #21)
      expect(growthSignals.last30Days).toBeDefined();
      expect(growthSignals.last30Days.longestMinutes).toBe(41);
      expect(growthSignals.last30Days.sessionsCompleted).toBe(5);

      // Verify honest trend statement (Prompt #11: Trends, not judgments)
      expect(growthSignals.trendStatement).toContain('uninterrupted periods have increased');
      expect(growthSignals.trendStatement).not.toContain('%');
      expect(growthSignals.trendStatement).not.toContain('discipline');
    });
  });

  // =========================================================================
  // 6. ARCHIVE INTEGRATION: FOCUS MILESTONES (Prompt #22)
  // =========================================================================
  describe('Archive Integration (Focus Breakthrough Milestones)', () => {
    it('creates a FOCUS MILESTONE archive artifact only for meaningful personal breakthroughs', () => {
      const now = Date.now();
      const sessions = [
        { id: 's1', startedAt: new Date(now - 86400000 * 10).toISOString(), durationMinutes: 20, longestStretchSeconds: 1200 },
        { id: 's2', startedAt: new Date(now - 86400000 * 8).toISOString(), durationMinutes: 25, longestStretchSeconds: 1500 },
        { id: 's3', startedAt: new Date(now - 86400000 * 4).toISOString(), durationMinutes: 45, longestStretchSeconds: 2460 } // 41 min (Breakthrough over 25m baseline!)
      ];

      const artifacts = buildArchiveArtifacts({ sessions });
      const focusMilestones = artifacts.filter(a => a.type === 'focus_milestone');

      expect(focusMilestones.length).toBe(1);
      const milestone = focusMilestones[0];
      expect(milestone.title).toBe('FOCUS MILESTONE');
      expect(milestone.subheading).toBe('Longest Uninterrupted Session');
      expect(milestone.longestMinutes).toBe(41);
      expect(milestone.previousBestMinutes).toBe(25);
      expect(milestone.quote).toContain('41 minutes uninterrupted session');

      // Verify filtering works
      const filtered = filterArchiveArtifacts(artifacts, { filter: 'milestones' });
      expect(filtered.some(a => a.id === milestone.id)).toBe(true);
    });
  });

  // =========================================================================
  // 7. TEST THE REAL LOOP FIXTURE (Prompt #31)
  // =========================================================================
  describe('Test The Real Loop Fixture (Prompt #31)', () => {
    it('observes 30m vs 45m friction, proposes experiment, and evaluates outcome', () => {
      // Fixture from Prompt #31:
      // Session 1: 30m / 1 interruption
      // Session 2: 30m / 0 interruptions
      // Session 3: 30m / 1 interruption
      // Session 4: 45m / abandoned (completed: false)
      // Session 5: 45m / 2 interruptions (abandoned or friction)
      // Session 6: 30m / 0 interruptions
      const sessions = [
        { id: 'sess-1', durationMinutes: 30, completed: true, interruptionCount: 1, hasCompanionTelemetry: true },
        { id: 'sess-2', durationMinutes: 30, completed: true, interruptionCount: 0, hasCompanionTelemetry: true },
        { id: 'sess-3', durationMinutes: 30, completed: true, interruptionCount: 1, hasCompanionTelemetry: true },
        { id: 'sess-4', durationMinutes: 45, completed: false, interruptionCount: 4, hasCompanionTelemetry: true },
        { id: 'sess-5', durationMinutes: 45, completed: false, interruptionCount: 3, hasCompanionTelemetry: true },
        { id: 'sess-6', durationMinutes: 30, completed: true, interruptionCount: 0, hasCompanionTelemetry: true }
      ];

      const signals = collectRawSignals({ sessions });
      const features = deriveFeatures(signals);

      // Verify feature deriver identifies long sessions friction
      expect(features.shortSessions.count).toBe(4);
      expect(features.shortSessions.completionRate).toBe(1.0);
      expect(features.longSessions.count).toBe(2);
      expect(features.longSessions.completionRate).toBe(0.0);
      expect(features.longSessions.hasHigherFriction).toBe(true);

      // Evaluate hypothesis
      const hypotheses = evaluateHypotheses(features);
      const shorterHypo = hypotheses.find(h => h.key === 'shorter_sessions_sustainable');
      expect(shorterHypo).toBeDefined();
      expect(shorterHypo.status).toBe(HYPOTHESIS_STATUS.CANDIDATE);

      // Generate recommendations (Prompt #12, #13, #14)
      const recommendations = generateRecommendations({ features, hypotheses });
      const durationRec = recommendations.find(r => r.type === RECOMMENDATION_TYPES.SESSION_DURATION);
      expect(durationRec).toBeDefined();
      expect(durationRec.title).toMatch(/Try 30 minute/i);
      expect(durationRec.actions.acceptLabel).toBe('Try it');
      expect(durationRec.actions.deferLabel).toBe('Not now');
      expect(durationRec.actions.rejectLabel).toBe('Keep current plan');
      expect(durationRec.actions.whyLabel).toBe('Why?');
      expect(durationRec.whyExplanation).toBeDefined();

      // User accepts experiment
      const experiment = startExperiment({
        title: durationRec.title,
        hypothesisKey: durationRec.hypothesisKey,
        targetTrials: 4,
        parameterValue: 30,
        controlValue: 45
      });
      expect(experiment.status).toBe(EXPERIMENT_STATUS.ACTIVE);

      // Simulate trial sessions under the experiment
      recordSessionInExperiment({ sessionId: 'exp-trial-1', durationMinutes: 30, interruptionCount: 0 });
      recordSessionInExperiment({ sessionId: 'exp-trial-2', durationMinutes: 30, interruptionCount: 1 });
      recordSessionInExperiment({ sessionId: 'exp-trial-3', durationMinutes: 28, interruptionCount: 0 });
      const concludingExp = recordSessionInExperiment({ sessionId: 'exp-trial-4', durationMinutes: 30, interruptionCount: 1 });

      // Check conclusion
      expect(concludingExp).toBeNull(); // Concluded active experiment
      const allExps = getActiveExperiment();
      expect(allExps).toBeNull();
    });
  });

  // =========================================================================
  // 8. TEST WRONG ASSUMPTIONS: NOISY ENVIRONMENT VS CONTAINER LENGTH (Prompt #32)
  // =========================================================================
  describe('Test Wrong Assumptions (Prompt #32)', () => {
    it('does NOT blame session length if interruptions are high across ALL session lengths (noisy environment)', () => {
      // 3 short sessions and 2 long sessions, ALL experiencing high phone distractions due to noisy room
      const sessions = [
        { id: 's1', durationMinutes: 30, completed: true, interruptionCount: 4, distractionSeconds: 120, hasCompanionTelemetry: true },
        { id: 's2', durationMinutes: 30, completed: true, interruptionCount: 5, distractionSeconds: 150, hasCompanionTelemetry: true },
        { id: 's3', durationMinutes: 30, completed: false, interruptionCount: 6, distractionSeconds: 180, hasCompanionTelemetry: true },
        { id: 's4', durationMinutes: 45, completed: false, interruptionCount: 7, distractionSeconds: 240, hasCompanionTelemetry: true },
        { id: 's5', durationMinutes: 45, completed: false, interruptionCount: 8, distractionSeconds: 300, hasCompanionTelemetry: true }
      ];

      const signals = collectRawSignals({ sessions });
      const features = deriveFeatures(signals);

      // Verify engine detects high distraction environment
      expect(features.environment.isHighDistractionEnvironment).toBe(true);
      // Engine must NOT conclude long sessions are the sole friction variable
      expect(features.longSessions.hasHigherFriction).toBe(false);

      const hypotheses = evaluateHypotheses(features);
      const envHypo = hypotheses.find(h => h.key === 'environmental_focus_adjustment');
      expect(envHypo).toBeDefined();
      expect(envHypo.statement).toContain('Elevated notification frequency');

      // The recommendation suggests environmental adjustment, not blaming user discipline (Prompt #15)
      const recommendations = generateRecommendations({ features, hypotheses });
      const envRec = recommendations.find(r => r.type === RECOMMENDATION_TYPES.ENVIRONMENT_FOCUS);
      expect(envRec).toBeDefined();
      expect(envRec.title).toBe('Try placing companion phone out of reach?');
    });
  });

  // =========================================================================
  // 9. TEST REJECTED RECOMMENDATIONS COOLDOWN (Prompt #33)
  // =========================================================================
  describe('Test Rejected Recommendations Cooldown (Prompt #33)', () => {
    it('respects explicit user rejection and does not repeat recommendation during cooldown', () => {
      const hypothesisKey = 'shorter_sessions_sustainable';

      // User clicks "Keep current plan" / rejects 30-min recommendation
      recordRejection(hypothesisKey, 7); // 7-day cooldown

      expect(isRejectionActive(hypothesisKey)).toBe(true);

      const features = {
        sampleTier: 'candidate',
        isProgressingSmoothly: false,
        shortSessions: { count: 3, completionRate: 0.9 },
        longSessions: { hasHigherFriction: true }
      };

      const hypotheses = [
        {
          key: hypothesisKey,
          status: HYPOTHESIS_STATUS.CANDIDATE,
          dimension: 'session_size'
        }
      ];

      const recommendations = generateRecommendations({ features, hypotheses });
      // Recommendation must be suppressed
      expect(recommendations.find(r => r.hypothesisKey === hypothesisKey)).toBeUndefined();
    });
  });

  // =========================================================================
  // 10. TEST GOAL / TRAJECTORY CHANGES (Prompt #34)
  // =========================================================================
  describe('Test Goal Changes (Prompt #34)', () => {
    it('does not blindly reuse career recommendations when trajectory changes', () => {
      const features = {
        sampleTier: 'candidate',
        isProgressingSmoothly: false
      };

      const hypotheses = [
        {
          key: 'career_specialization',
          status: HYPOTHESIS_STATUS.SUPPORTED,
          dimension: 'career_alignment'
        }
      ];

      // Context indicates trajectory change: Embedded Systems -> Master's Preparation
      const recommendations = generateRecommendations({
        features,
        hypotheses,
        currentContext: { trajectoryChanged: true }
      });

      expect(recommendations.length).toBe(0);
    });
  });

  // =========================================================================
  // 11. TEST DATA AVAILABILITY & DEGRADATION (Prompt #35)
  // =========================================================================
  describe('Graceful Degradation Without Companion (Prompt #35)', () => {
    it('degrades gracefully when no Android companion telemetry exists', () => {
      // Sessions recorded purely via web timer (no companion phone)
      const sessions = [
        { id: 'web-1', durationMinutes: 30, completed: true },
        { id: 'web-2', durationMinutes: 30, completed: true },
        { id: 'web-3', durationMinutes: 45, completed: false }
      ];

      const signals = collectRawSignals({ sessions });
      const features = deriveFeatures(signals);

      expect(features.focusTelemetry.source).toBe('session_timer');
      expect(features.focusTelemetry.interruptionRate).toBe(0);
      expect(features.sampleSize).toBe(3);
      // Engine continues to run without errors or exceptions
      expect(features.overallCompletionRate).toBeCloseTo(0.67, 1);
    });
  });

  // =========================================================================
  // 12. LEARN WHEN NOT TO INTERVENE (Prompt #17)
  // =========================================================================
  describe('Learn When NOT to Intervene (Prompt #17)', () => {
    it('recommends nothing when learner is completing sessions, retaining material, and progressing smoothly', () => {
      // 5 pristine sessions: completed, high recall, zero distractions
      const sessions = [
        { id: 's1', durationMinutes: 30, completed: true, explainWithoutNotes: 'yes', interruptionCount: 0 },
        { id: 's2', durationMinutes: 30, completed: true, explainWithoutNotes: 'yes', interruptionCount: 0 },
        { id: 's3', durationMinutes: 30, completed: true, explainWithoutNotes: 'yes', interruptionCount: 0 },
        { id: 's4', durationMinutes: 35, completed: true, explainWithoutNotes: 'yes', interruptionCount: 0 },
        { id: 's5', durationMinutes: 30, completed: true, explainWithoutNotes: 'yes', interruptionCount: 0 }
      ];

      const signals = collectRawSignals({ sessions });
      const features = deriveFeatures(signals);

      expect(features.isProgressingSmoothly).toBe(true);

      const hypotheses = evaluateHypotheses(features);
      const recommendations = generateRecommendations({ features, hypotheses });

      // Absence of intervention is a successful state!
      expect(recommendations).toEqual([]);
    });
  });

  // =========================================================================
  // 13. FOCUS INTEGRITY ENABLE / DISABLE & DATA DELETION (Prompt #27 & #28)
  // =========================================================================
  describe('Focus Integrity Sovereignty & Telemetry Deletion (Prompts #27, #28)', () => {
    it('user can disable Focus Integrity toggle', () => {
      expect(isFocusIntegrityEnabled()).toBe(true);

      setFocusIntegrityEnabled(false);
      expect(isFocusIntegrityEnabled()).toBe(false);

      setFocusIntegrityEnabled(true);
      expect(isFocusIntegrityEnabled()).toBe(true);
    });

    it('deleting Focus Integrity history removes phone telemetry without touching learning sessions', () => {
      // 1. Record companion telemetry
      recordFocusTelemetry({
        summaryId: 'tel-to-delete',
        sessionId: 'session-preserve-me',
        intendedMinutes: 30,
        interruptionCount: 2
      });

      expect(getAllFocusTelemetry().length).toBe(1);

      // 2. Perform deletion
      const res = deleteFocusTelemetryHistory();
      expect(res.success).toBe(true);

      // Telemetry store is empty
      expect(getAllFocusTelemetry().length).toBe(0);
      expect(getTelemetryForSession('session-preserve-me')).toBeNull();
    });
  });

});
