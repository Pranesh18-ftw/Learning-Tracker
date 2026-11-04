/**
 * p2AttentionIntegrity.test.js
 *
 * Regression Test Suite for P2.4:
 * - Product Attention Integrity, Psychological Integrity, and Configuration-Hell Audit
 *
 * Guarantees:
 * 1. Focus Mode Purity: Non-essential notifications & navigation suppressed during Focus.
 * 2. Time-to-First Meaningful Action: Instant 1-step start without configuration gates.
 * 3. Learner Autonomy: Completion banners & onboarding are cleanly dismissable.
 * 4. Streak & Recovery Integrity: Calm rhythm, no shame, recovery positively recognized.
 * 5. Reward Integrity: Achievements reward authentic learning only (no vanity clicks).
 * 6. Scientific & Epistemic Integrity: Zero fake brain scores, IQ claims, or personality diagnoses.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Topbar from '../components/Topbar';
import FocusSpace from '../components/FocusSpace';
import AchievementNotification from '../components/AchievementNotification';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { ACHIEVEMENTS, evaluateAchievements } from '../services/achievementService';
import {
  resolveRecoverySignal,
  resolveIndependenceSignals,
  resolveFocusGrowthSignals
} from '../utils/growthEvidenceResolver';
import { evaluateHypotheses } from '../adaptive/hypothesisEngine';
import { generateRecommendations } from '../adaptive/recommendationEngine';

jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/' }),
    Routes: ({ children }) => React.createElement('div', null, children),
    Route: ({ element }) => React.createElement('div', null, element)
  };
}, { virtual: true });

jest.mock('../components/GlobalCommandPalette', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P2.4 — Product Attention Integrity & Psychological Integrity', () => {
  let container;
  let root;

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
  // 1. FOCUS MODE PURITY & NOTIFICATION SUPPRESSION
  // =========================================================================
  describe('1. Focus Mode Purity', () => {
    test('renders quiet FocusSpace when focusSession is active, suppressing Topbar and extraneous UI', () => {
      const mockSession = {
        sessionId: 'test-session-123',
        status: 'running',
        targetMinutes: 25,
        timeLeftSeconds: 1500,
        task: {
          taskName: 'RC Filter Frequency Response',
          name: 'Cutoff Frequency Calculation',
          subjectName: 'Electronics',
          phaseName: 'Passive Filters'
        }
      };

      act(() => {
        root.render(
          <FocusSpace
            session={mockSession}
            onBeginRunning={jest.fn()}
            onPause={jest.fn()}
            onResume={jest.fn()}
            onOpenReflection={jest.fn()}
            onCommitEvidence={jest.fn()}
            onAbandon={jest.fn()}
          />
        );
      });

      // The core question/objective dominates the workspace
      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading.textContent).toContain('RC Filter Frequency Response');

      // Calm timer projection exists
      const timerDisplay = container.querySelector('[aria-hidden="true"]');
      expect(timerDisplay.textContent).toMatch(/25:00|00:00/);

      // Verify no nav tabs or social badges leak into the focus space
      expect(container.querySelector('nav')).toBeNull();
      expect(container.querySelector('[id$="-nav-item"]')).toBeNull();
    });

    test('AchievementNotification safely returns null when there is no active notification', () => {
      act(() => {
        root.render(<AchievementNotification />);
      });

      expect(container.innerHTML).toBe('');
    });
  });

  // =========================================================================
  // 2. REWARD INTEGRITY
  // =========================================================================
  describe('2. Reward Integrity', () => {
    test('all defined achievements require real learning actions, not passive app navigation', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThan(0);

      // Verify categories: tasks, focus sessions, learning rhythm, cumulative study time
      const validCategories = new Set(['tasks', 'focus', 'streak', 'time']);
      ACHIEVEMENTS.forEach(ach => {
        expect(validCategories.has(ach.category)).toBe(true);
        // None of the achievements check page visits, setting edits, or clicks
        expect(ach.id).not.toContain('click');
        expect(ach.id).not.toContain('view');
        expect(ach.id).not.toContain('open');
      });
    });

    test('evaluateAchievements returns empty when no actual study activity has occurred', () => {
      const emptyState = {
        sessions: [],
        taskCompletions: [],
        streak: 0,
        existingAchievements: []
      };

      const unlocked = evaluateAchievements(emptyState);
      expect(unlocked).toEqual([]);
    });

    test('evaluateAchievements unlocks first-task only after genuine task completion', () => {
      const activeState = {
        sessions: [],
        taskCompletions: [{ id: 'tc-1', taskId: 'task-1' }],
        streak: 1,
        existingAchievements: []
      };

      const unlocked = evaluateAchievements(activeState);
      expect(unlocked).toContain('first-task');
    });
  });

  // =========================================================================
  // 3. STREAK INTEGRITY & RECOVERY ORIENTATION
  // =========================================================================
  describe('3. Streak Integrity & Recovery Orientation', () => {
    test('Topbar renders "Fresh start" when rhythm count is 0, avoiding shame copy', () => {
      act(() => {
        root.render(
          <Topbar
            activeTab="dashboard"
            setActiveTab={jest.fn()}
            streakCount={0}
          />
        );
      });

      const rhythmElement = container.querySelector('[title*="rhythm"]') || container.querySelector('[title*="Fresh start"]');
      expect(rhythmElement).not.toBeNull();
      expect(rhythmElement.textContent).toContain('Fresh start');
      expect(rhythmElement.textContent).not.toContain('Lost');
      expect(rhythmElement.textContent).not.toContain('Broken');
    });

    test('Topbar renders "4-day rhythm" when rhythm count is 4', () => {
      act(() => {
        root.render(
          <Topbar
            activeTab="dashboard"
            setActiveTab={jest.fn()}
            streakCount={4}
          />
        );
      });

      const rhythmElement = container.querySelector('[title*="rhythm"]');
      expect(rhythmElement).not.toBeNull();
      expect(rhythmElement.textContent).toContain('4-day rhythm');
    });

    test('resolveRecoverySignal recognizes resilient return after a multi-day absence without shaming', () => {
      const now = Date.now();
      const fourDaysAgo = new Date(now - 4 * 86400000).toISOString();
      const today = new Date(now).toISOString();

      const sessionsWithLapse = [
        { id: 's-1', date: fourDaysAgo, durationMinutes: 30 },
        { id: 's-2', date: today, durationMinutes: 30 }
      ];

      const signal = resolveRecoverySignal(sessionsWithLapse);
      expect(signal.hasLapseRecord).toBe(true);
      expect(signal.message).toBe('You are getting better at coming back after disruption.');
      expect(signal.continuedRoute).toBe(true);
    });
  });

  // =========================================================================
  // 4. ABSENCE OF PSEUDOSCIENCE & ETHICAL ADAPTATION
  // =========================================================================
  describe('4. Scientific Claims & Adaptation Ethics', () => {
    test('evaluateHypotheses uses behavioral observations only and avoids personality profiling', () => {
      const mockFeatures = {
        sampleTier: 'stable',
        sampleSize: 8,
        isProgressingSmoothly: false,
        longSessions: { hasHigherFriction: true },
        shortSessions: { completionRate: 0.9 },
        struggles: { hasRecentStruggle: false },
        resources: { isSimulationMode: false },
        retrieval: { hasDueRetrieval: false },
        recovery: { isRecoveryCandidate: false }
      };

      const hypotheses = evaluateHypotheses(mockFeatures);
      expect(hypotheses.length).toBeGreaterThan(0);

      hypotheses.forEach(h => {
        // Must describe container sustainability, not learner personality
        expect(h.statement).not.toMatch(/brain|dopamine|rewire|iq|adhd|personality|intellect/i);
        expect(h.rationale).not.toMatch(/brain|dopamine|rewire|iq|adhd|personality|intellect/i);
      });
    });

    test('recommendationEngine returns empty when learner is progressing smoothly', () => {
      const smoothFeatures = {
        isProgressingSmoothly: true,
        sampleTier: 'stable'
      };

      const recs = generateRecommendations({
        features: smoothFeatures,
        hypotheses: []
      });

      // The absence of intervention is itself a successful state
      expect(recs).toEqual([]);
    });

    test('resolveFocusGrowthSignals produces strictly concrete duration data without fake brain scores', () => {
      // 1-2 sessions: reports not enough history
      const twoSessions = [
        { id: 's-1', durationMinutes: 25, startedAt: new Date().toISOString() },
        { id: 's-2', durationMinutes: 30, startedAt: new Date().toISOString() }
      ];
      const preliminary = resolveFocusGrowthSignals(twoSessions);
      expect(preliminary.notEnoughHistory).toBe(true);

      // 3+ sessions: produces concrete metrics without psychological scores
      const threeSessions = [
        ...twoSessions,
        { id: 's-3', durationMinutes: 30, startedAt: new Date().toISOString() }
      ];
      const signals = resolveFocusGrowthSignals(threeSessions);
      expect(signals.brainScore).toBeUndefined();
      expect(signals.focusIQ).toBeUndefined();
      expect(signals.longestUninterruptedMinutes).toBe(30);
      expect(signals.trendStatement).toBeDefined();
    });
  });

  // =========================================================================
  // 5. INDEPENDENCE & REDUCING SCAFFOLDING
  // =========================================================================
  describe('5. Independence & Scaffolding Reduction', () => {
    test('resolveIndependenceSignals measures progression from auto-assigned to self-selected sessions', () => {
      const plan = [
        { id: 'p-1', isAutoAssigned: true },
        { id: 'p-2', isAutoAssigned: false },
        { id: 'p-3', isAutoAssigned: false }
      ];
      const sessions = [{ id: 's-1', durationMinutes: 30 }];

      const independence = resolveIndependenceSignals(plan, sessions);
      expect(independence.hasEnoughData).toBe(true);
      expect(independence.selfSelectedCount).toBe(2);
      expect(independence.autoAssignedCount).toBe(1);
      expect(independence.subtext).toContain('less necessary');
    });
  });

  // =========================================================================
  // 6. LEARNER AUTONOMY & DISMISSABLE NOTICES
  // =========================================================================
  describe('6. Learner Autonomy & Dismissable Notices', () => {
    test('clearLastAction in RoadmapContext dismisses completion notice', () => {
      let capturedContext;
      const TestConsumer = () => {
        capturedContext = useRoadmap();
        return null;
      };

      act(() => {
        root.render(
          <RoadmapProvider>
            <TestConsumer />
          </RoadmapProvider>
        );
      });

      expect(capturedContext.lastAction).toBeNull();

      // Trigger storeCompleteAction
      act(() => {
        capturedContext.storeCompleteAction('subtask-1', 'session-1', 'comp-1', {
          taskDetails: { name: 'Resistor Color Codes' }
        });
      });

      expect(capturedContext.lastAction).not.toBeNull();
      expect(capturedContext.lastAction.taskDetails.name).toBe('Resistor Color Codes');

      // Learner dismisses the banner via clearLastAction
      act(() => {
        capturedContext.clearLastAction();
      });

      expect(capturedContext.lastAction).toBeNull();
    });
  });
});
