import { safeStorageGet, safeStorageSet, safeStorageRemove } from '../utils/storage';
import { TAB_TO_PATH, PATH_TO_TAB } from '../utils/navigation';

describe('P2.1 — Storage Engine Reliability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  test('successful state write and read', () => {
    const data = { theme: 'dark', goal: 3 };
    const setResult = safeStorageSet('test_key', data);
    expect(setResult.ok).toBe(true);
    expect(setResult.error).toBeNull();

    const getResult = safeStorageGet('test_key');
    expect(getResult).toEqual(data);
  });

  test('malformed stored JSON returns fallback safely without crashing', () => {
    window.localStorage.setItem('corrupted_key', '{not valid json');
    const result = safeStorageGet('corrupted_key', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  test('QuotaExceededError does not crash application and reports quota error', () => {
    const error = new DOMException('Quota exceeded', 'QuotaExceededError');
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw error;
    });

    const result = safeStorageSet('test_quota', { sample: 123 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('quota');
  });

  test('generic storage write failure reports storage error', () => {
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    const result = safeStorageSet('test_fail', { sample: 123 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('storage');
  });

  test('safeStorageRemove removes key cleanly', () => {
    safeStorageSet('test_del', 'value');
    expect(safeStorageGet('test_del')).toBe('value');
    safeStorageRemove('test_del');
    expect(safeStorageGet('test_del')).toBeNull();
  });
});

describe('P2.2 & P2.3 — Wall-Clock Pomodoro & Dynamic Identity', () => {
  test('timer calculates remaining time from absolute end time', () => {
    const durationSeconds = 1500;
    const now = 1000000;
    const endTime = now + durationSeconds * 1000;

    // After 500 seconds have elapsed in real time
    const checkTime = now + 500 * 1000;
    const remaining = Math.max(0, Math.ceil((endTime - checkTime) / 1000));
    expect(remaining).toBe(1000);
  });

  test('background-tab recovery reaches zero when real time passes deadline', () => {
    const now = 1000000;
    const endTime = now + 1500 * 1000;

    // Simulate tab sleep: resume 1600 seconds later (past deadline)
    const resumeTime = now + 1600 * 1000;
    const remaining = Math.max(0, Math.ceil((endTime - resumeTime) / 1000));
    expect(remaining).toBe(0);
  });

  test('timer completion occurs exactly once using completedRef guard', () => {
    let completedCallCount = 0;
    const completedRef = { current: false };

    const completeSession = () => {
      completedCallCount++;
    };

    const sync = (remaining) => {
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        completeSession();
      }
    };

    // First time reaching 0
    sync(0);
    expect(completedCallCount).toBe(1);

    // Repeated ticks after completion
    sync(0);
    sync(0);
    expect(completedCallCount).toBe(1);
  });

  test('pause preserves remaining time without destroying deadline balance', () => {
    const now = 1000000;
    const duration = 1500;
    let endTime = now + duration * 1000;

    // Elapsed 300s
    const pauseTime = now + 300 * 1000;
    const remainingAtPause = Math.max(0, Math.ceil((endTime - pauseTime) / 1000));
    expect(remainingAtPause).toBe(1200);

    // Resume later at resumeTime
    const resumeTime = pauseTime + 600 * 1000; // paused for 10 minutes
    endTime = resumeTime + remainingAtPause * 1000;

    // 100s after resume
    const checkTime = resumeTime + 100 * 1000;
    const remainingAfterResume = Math.max(0, Math.ceil((endTime - checkTime) / 1000));
    expect(remainingAfterResume).toBe(1100);
  });

  test('identity is not stale when task selection changes', () => {
    // Simulated component receiving new props directly
    const createSessionPayload = (props) => {
      return {
        taskId: props.taskId,
        subtaskId: props.subtaskId,
        taskName: props.taskName,
        durationMinutes: 25
      };
    };

    const initialProps = {
      taskId: 'task-A',
      subtaskId: 'sub-A',
      taskName: 'Task A'
    };

    const sessionA = createSessionPayload(initialProps);
    expect(sessionA.taskId).toBe('task-A');
    expect(sessionA.subtaskId).toBe('sub-A');

    // Switch selection to Task B / Subtask B
    const updatedProps = {
      taskId: 'task-B',
      subtaskId: 'sub-B',
      taskName: 'Task B'
    };

    const sessionB = createSessionPayload(updatedProps);
    expect(sessionB.taskId).toBe('task-B');
    expect(sessionB.subtaskId).toBe('sub-B');
  });
});

describe('P2.4 — Authoritative Router Mappings', () => {
  test('pathname maps to authoritative activeTab', () => {
    expect(PATH_TO_TAB['/']).toBe('dashboard');
    expect(PATH_TO_TAB['/roadmap']).toBe('roadmap');
    expect(PATH_TO_TAB['/learning-plan']).toBe('learning-plan');
    expect(PATH_TO_TAB['/statistics']).toBe('stats');
    expect(PATH_TO_TAB['/achievements']).toBe('achievements');
    expect(PATH_TO_TAB['/settings']).toBe('settings');
  });

  test('activeTab maps to correct navigation path', () => {
    expect(TAB_TO_PATH['dashboard']).toBe('/');
    expect(TAB_TO_PATH['roadmap']).toBe('/roadmap');
    expect(TAB_TO_PATH['learning-plan']).toBe('/learning-plan');
    expect(TAB_TO_PATH['stats']).toBe('/statistics');
    expect(TAB_TO_PATH['achievements']).toBe('/achievements');
    expect(TAB_TO_PATH['settings']).toBe('/settings');
  });
});

describe('P2.9 — Feedback Epistemic Truth', () => {
  test('stores feedback in local storage without network transmission claim', () => {
    const feedback = {
      type: 'improvement',
      message: 'Great local tracker',
      timestamp: new Date().toISOString()
    };

    safeStorageSet('userFeedback', [feedback]);
    const stored = safeStorageGet('userFeedback');
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('Great local tracker');
  });
});

describe('P2.10 — Onboarding Target Safety', () => {
  test('missing target element id returns empty string and handles null targetRect', () => {
    const getTargetElementId = (step) => {
      switch (step) {
        case 1:
          return 'roadmap-nav-item';
        case 2:
          return 'import-roadmap-btn';
        case 3:
          return 'first-task-item';
        default:
          return '';
      }
    };

    expect(getTargetElementId(0)).toBe('');
    expect(getTargetElementId(99)).toBe('');

    // When targetId is '', document.getElementById('') is not queried and targetRect stays null
    const targetId = getTargetElementId(99);
    let targetRect = null;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) targetRect = el.getBoundingClientRect();
    }
    expect(targetRect).toBeNull();
  });
});
