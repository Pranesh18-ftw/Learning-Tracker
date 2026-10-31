import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_REVISION_INTERVAL_DAYS,
  getGlobalRevisionInterval,
  getTopicRevisionConfig,
  calculateTopicRevisionStatus,
  getDueRevisionTopics,
  isRevisionOverlayPermitted,
  snoozeRevisionReminder,
  dismissRevisionReminderForSession,
  recordTopicRevisionConfirmed,
  resetRevisionReminderSuppression
} from '../services/revisionReminderService';
import SpiderRevisionOverlay from '../components/SpiderRevisionOverlay';
import Topbar from '../components/Topbar';
import * as RoadmapContextModule from '../context/RoadmapContext';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' })
}), { virtual: true });
jest.mock('../components/GlobalCommandPalette', () => () => null);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Part 4: Spider-Inspired Revision Reminder & Scheduling Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRevisionReminderSuppression();
  });

  test('1. Default revision policy is exactly 10 days unless customized', () => {
    expect(DEFAULT_REVISION_INTERVAL_DAYS).toBe(10);
    expect(getGlobalRevisionInterval({})).toBe(10);
    expect(getGlobalRevisionInterval(null)).toBe(10);
    expect(getGlobalRevisionInterval({ revisionIntervalDays: 14 })).toBe(14);
    expect(getGlobalRevisionInterval({ revisionIntervalDays: 7 })).toBe(7);
    // Out of bounds / invalid fallback to 10
    expect(getGlobalRevisionInterval({ revisionIntervalDays: -5 })).toBe(10);
    expect(getGlobalRevisionInterval({ revisionIntervalDays: 'invalid' })).toBe(10);
  });

  test('2. Per-topic interval override and manual next revision date take precedence', () => {
    const settings = {
      revisionIntervalDays: 10,
      revisionOverrides: {
        'topic-capacitors': {
          intervalDays: 5,
          manualNextDate: null
        },
        'topic-inductors': {
          intervalDays: null,
          manualNextDate: '2026-11-05'
        }
      }
    };

    const configCap = getTopicRevisionConfig(settings, 'topic-capacitors');
    expect(configCap.intervalDays).toBe(5);
    expect(configCap.manualNextDate).toBeNull();

    const configInd = getTopicRevisionConfig(settings, 'topic-inductors');
    expect(configInd.intervalDays).toBeNull();
    expect(configInd.manualNextDate).toBe('2026-11-05');
  });

  test('3. Topics without previous study or completion history are NEVER falsely overdue', () => {
    const unstudiedTopic = {
      id: 'topic-quantum-mechanics',
      name: 'Quantum Tunneling',
      subjectName: 'Physics'
    };

    const status = calculateTopicRevisionStatus({
      topic: unstudiedTopic,
      taskCompletions: [],
      sessions: [],
      settings: { revisionIntervalDays: 10 },
      currentDateKey: '2026-10-23'
    });

    expect(status.isEligible).toBe(false);
    expect(status.isDue).toBe(false);
    expect(status.reason).toBe('NO_PREVIOUS_STUDY_RECORD');
  });

  test('4. Topic completed exactly 10 days ago is deterministically due today under default policy', () => {
    const currentDateKey = '2026-10-23';
    const tenDaysAgoKey = '2026-10-13';

    const completedTopic = {
      id: 'topic-rc-circuits',
      name: 'RC Step Response',
      subjectName: 'Electronics'
    };

    const taskCompletions = [
      {
        id: 'comp-1',
        taskId: 'topic-rc-circuits',
        date: tenDaysAgoKey
      }
    ];

    const status = calculateTopicRevisionStatus({
      topic: completedTopic,
      taskCompletions,
      sessions: [],
      settings: { revisionIntervalDays: 10 },
      currentDateKey
    });

    expect(status.isEligible).toBe(true);
    expect(status.isDue).toBe(true);
    expect(status.daysSinceLastActivity).toBe(10);
    expect(status.daysOverdue).toBe(0);
    expect(status.nextDueDate).toBe(currentDateKey);
  });

  test('5. Topic completed 5 days ago is NOT yet due under default 10-day policy', () => {
    const currentDateKey = '2026-10-23';
    const fiveDaysAgoKey = '2026-10-18';

    const recentTopic = {
      id: 'topic-thevenin',
      name: 'Thevenin Equivalence',
      subjectName: 'Electronics'
    };

    const taskCompletions = [
      {
        id: 'comp-2',
        taskId: 'topic-thevenin',
        date: fiveDaysAgoKey
      }
    ];

    const status = calculateTopicRevisionStatus({
      topic: recentTopic,
      taskCompletions,
      sessions: [],
      settings: { revisionIntervalDays: 10 },
      currentDateKey
    });

    expect(status.isEligible).toBe(true);
    expect(status.isDue).toBe(false);
    expect(status.daysSinceLastActivity).toBe(5);
    expect(status.daysOverdue).toBe(-5);
  });

  test('6. Sorts multiple due topics with most overdue topic first and counts waiting topics', () => {
    const currentDateKey = '2026-10-23';

    const subjects = [
      {
        id: 'sub-1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph-1',
            tasks: [
              { id: 't-1', name: 'Ohm Law', subtasks: [] },
              { id: 't-2', name: 'Kirchhoff Voltage Law', subtasks: [] }
            ]
          }
        ]
      }
    ];

    const taskCompletions = [
      // Ohm law: studied 25 days ago (15 days overdue)
      { id: 'c-1', taskId: 't-1', date: '2026-09-28' },
      // KVL: studied 12 days ago (2 days overdue)
      { id: 'c-2', taskId: 't-2', date: '2026-10-11' }
    ];

    const result = getDueRevisionTopics({
      subjects,
      taskCompletions,
      sessions: [],
      settings: { revisionIntervalDays: 10 },
      currentDateKey
    });

    expect(result.totalDueCount).toBe(2);
    expect(result.mostOverdueTopic.id).toBe('t-1');
    expect(result.mostOverdueTopic.revisionStatus.daysOverdue).toBe(15);
    expect(result.dueTopics[1].id).toBe('t-2');
  });

  test('7. Revision overlay is suppressed during active Focus session or modal interaction', () => {
    expect(isRevisionOverlayPermitted({ isFocusActive: false, isModalOpen: false, isPairingActive: false })).toBe(true);
    expect(isRevisionOverlayPermitted({ isFocusActive: true, isModalOpen: false, isPairingActive: false })).toBe(false);
    expect(isRevisionOverlayPermitted({ isFocusActive: false, isModalOpen: true, isPairingActive: false })).toBe(false);
    expect(isRevisionOverlayPermitted({ isFocusActive: false, isModalOpen: false, isPairingActive: true })).toBe(false);
  });

  test('8. Snoozing temporarily suppresses reminders without modifying revision history', () => {
    expect(isRevisionOverlayPermitted({ isFocusActive: false, isModalOpen: false, isPairingActive: false })).toBe(true);
    snoozeRevisionReminder(4);
    expect(isRevisionOverlayPermitted({ isFocusActive: false, isModalOpen: false, isPairingActive: false })).toBe(false);
  });

  test('9. Confirming revision records revision date and increments revisionCount', () => {
    let currentSettings = {
      revisionIntervalDays: 10,
      revisionHistory: {},
      revisionOverrides: {
        'topic-rc': { manualNextDate: '2026-10-23' }
      }
    };

    const updateSettings = (updater) => {
      currentSettings = updater(currentSettings);
    };

    recordTopicRevisionConfirmed({
      updateSettings,
      topicId: 'topic-rc',
      currentDateKey: '2026-10-23'
    });

    expect(currentSettings.revisionHistory['topic-rc']).toBeDefined();
    expect(currentSettings.revisionHistory['topic-rc'].lastRevisedDate).toBe('2026-10-23');
    expect(currentSettings.revisionHistory['topic-rc'].revisionCount).toBe(1);
    expect(currentSettings.revisionOverrides['topic-rc'].manualNextDate).toBeNull();
  });
});

describe('Part 4: SpiderRevisionOverlay UI Component & A11y', () => {
  let container;
  let root;

  const mockDueTopic = {
    id: 'topic-rlc',
    name: 'RLC Resonant Damping',
    subjectName: 'Circuits & Signals',
    revisionStatus: {
      daysSinceLastActivity: 12,
      intervalDays: 10,
      lastActivityDateKey: '2026-10-11'
    }
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('10. Renders "REVISION TIME", topic title, days since last study, and waiting count', async () => {
    await act(async () => {
      root.render(
        <SpiderRevisionOverlay
          isOpen={true}
          dueTopic={mockDueTopic}
          totalWaitingCount={3}
          onStartRevision={jest.fn()}
          onSnooze={jest.fn()}
          onDismiss={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('REVISION TIME');
    expect(container.textContent).toContain('RLC Resonant Damping');
    expect(container.textContent).toContain('Circuits & Signals');
    expect(container.textContent).toContain('12 days since last study');
    expect(container.textContent).toContain('+ 2 more topics waiting in your revision queue');
  });

  test('11. Action buttons trigger respective callbacks', async () => {
    const onStart = jest.fn();
    const onSnooze = jest.fn();
    const onDismiss = jest.fn();

    await act(async () => {
      root.render(
        <SpiderRevisionOverlay
          isOpen={true}
          dueTopic={mockDueTopic}
          totalWaitingCount={1}
          onStartRevision={onStart}
          onSnooze={onSnooze}
          onDismiss={onDismiss}
        />
      );
    });

    const startBtn = container.querySelector('#start-revision-btn');
    expect(startBtn).not.toBeNull();
    await act(async () => {
      startBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onStart).toHaveBeenCalledWith(mockDueTopic);

    const snoozeBtn = container.querySelector('#snooze-revision-btn');
    expect(snoozeBtn).not.toBeNull();
    await act(async () => {
      snoozeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onSnooze).toHaveBeenCalledTimes(1);

    const dismissBtn = container.querySelector('#dismiss-revision-btn');
    expect(dismissBtn).not.toBeNull();
    await act(async () => {
      dismissBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('12. Escape key dismisses the overlay with "Not now" semantics', async () => {
    const onDismiss = jest.fn();

    await act(async () => {
      root.render(
        <SpiderRevisionOverlay
          isOpen={true}
          dueTopic={mockDueTopic}
          totalWaitingCount={1}
          onStartRevision={jest.fn()}
          onSnooze={jest.fn()}
          onDismiss={onDismiss}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('13. Renders accessible dialog semantics and label', async () => {
    await act(async () => {
      root.render(
        <SpiderRevisionOverlay
          isOpen={true}
          dueTopic={mockDueTopic}
          totalWaitingCount={1}
          onStartRevision={jest.fn()}
          onSnooze={jest.fn()}
          onDismiss={jest.fn()}
        />
      );
    });

    const dialog = container.querySelector('div[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('revision-time-title');
  });
});

describe('Parts 1, 2 & 3: Full-Width Layout, Glass Surfaces & Navigation Integrity', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('14. Topbar navigation contains glass-workbench class and full-width container', async () => {
    const mockContext = {
      isDarkMode: false,
      toggleTheme: jest.fn(),
      subjects: [{ id: 's1', name: 'Electronics' }],
      selectedSubjectId: 's1',
      setSelectedSubjectId: jest.fn(),
      streakCount: 3,
      account: null,
      isAuthInitializing: false
    };

    jest.spyOn(RoadmapContextModule, 'useRoadmap').mockReturnValue(mockContext);

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header.className).toContain('glass-workbench');

    const innerContainer = header.querySelector('div');
    expect(innerContainer.className).toContain('max-w-[min(96vw,1680px)]');
  });

  test('15. Navigation preserves min-w-0 and overflow-x-auto for layout squeeze resilience', async () => {
    const mockContext = {
      isDarkMode: false,
      toggleTheme: jest.fn(),
      subjects: [],
      selectedSubjectId: null,
      setSelectedSubjectId: jest.fn(),
      streakCount: 0,
      account: null,
      isAuthInitializing: false
    };

    jest.spyOn(RoadmapContextModule, 'useRoadmap').mockReturnValue(mockContext);

    await act(async () => {
      root.render(<Topbar activeTab="dashboard" setActiveTab={jest.fn()} />);
    });

    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav.className).toContain('min-w-0');
    expect(nav.className).toContain('overflow-x-auto');
  });
});
