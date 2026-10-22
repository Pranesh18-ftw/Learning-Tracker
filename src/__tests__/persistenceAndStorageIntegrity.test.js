import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  safeStorageInspect,
  safeStorageQuarantine,
  safeStorageClear,
  STORAGE_STATUS,
  getQuarantinedKeys,
  getQuarantinedData
} from '../utils/storage';
import { enqueueMutation, clearOutbox, getOutbox, OUTBOX_STORAGE_KEY } from '../services/syncEngine';
import { SYNC_ENTITY_TYPES, SYNC_OPERATIONS } from '../shared/accountSyncProtocol';
import { signOutUser } from '../services/authService';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('P1.3 — Persistence, Storage, Migration, Reset, and Recovery Integrity', () => {
  let container;
  let root;
  let capturedContext;

  const TestConsumer = () => {
    capturedContext = useRoadmap();
    return (
      <div data-testid="test-consumer">
        <span id="subjects-count">{capturedContext.roadmap?.length || 0}</span>
        <span id="sessions-count">{capturedContext.sessions?.length || 0}</span>
        <span id="completions-count">{capturedContext.taskCompletions?.length || 0}</span>
        <span id="plan-count">{capturedContext.learningPlan?.length || 0}</span>
        <span id="storage-error">{capturedContext.storageError || 'none'}</span>
        <span id="corrupted-keys">{capturedContext.corruptedDataKeys?.join(',') || 'none'}</span>
      </div>
    );
  };

  const mountProvider = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });
  };

  const unmountProvider = async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    capturedContext = null;
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await unmountProvider();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  // 1. Distinguishable storage statuses
  test('safeStorageInspect distinguishes SUCCESS, MISSING, and MALFORMED statuses', () => {
    // Missing
    const missing = safeStorageInspect('non_existent_key');
    expect(missing.status).toBe(STORAGE_STATUS.MISSING);
    expect(missing.ok).toBe(true);
    expect(missing.data).toBeNull();

    // Success
    safeStorageSet('valid_key', { foo: 'bar' });
    const success = safeStorageInspect('valid_key');
    expect(success.status).toBe(STORAGE_STATUS.SUCCESS);
    expect(success.ok).toBe(true);
    expect(success.data).toEqual({ foo: 'bar' });

    // Malformed JSON
    localStorage.setItem('broken_json', '{"incomplete": true');
    const malformed = safeStorageInspect('broken_json');
    expect(malformed.status).toBe(STORAGE_STATUS.MALFORMED);
    expect(malformed.ok).toBe(false);
    expect(malformed.raw).toBe('{"incomplete": true');
  });

  // 2. Quarantine mechanism prevents silent overwrite of corrupted roadmap
  test('corrupted roadmap is quarantined and NOT immediately overwritten with [] on render', async () => {
    const brokenRoadmapString = '{"invalid_roadmap_data": [';
    localStorage.setItem('roadmap', brokenRoadmapString);

    await mountProvider();

    // Initial render detects corruption
    expect(capturedContext.roadmap).toHaveLength(0);
    expect(capturedContext.corruptedDataKeys).toContain('roadmap');

    // Quarantine record exists in localStorage
    const quarantinedKeys = getQuarantinedKeys();
    expect(quarantinedKeys).toContain('roadmap');
    const quarantinedData = getQuarantinedData('roadmap');
    expect(quarantinedData.raw).toBe(brokenRoadmapString);

    // The raw corrupted value was NOT silently overwritten with "[]" in localStorage on initial mount
    const rawAfterMount = localStorage.getItem('roadmap');
    expect(rawAfterMount).toBe(brokenRoadmapString);
  });

  // 3. Storage write failure / quota reporting
  test('safeStorageSet truthfully reports QUOTA_EXCEEDED without claiming success', () => {
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceeded', 'QuotaExceededError');
      throw err;
    });

    const res = safeStorageSet('large_data', { test: 'value' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('quota');
    expect(res.status).toBe(STORAGE_STATUS.QUOTA_EXCEEDED);
  });

  // 4. Outbox storage failure handling
  test('enqueueMutation returns null and does not claim success when outbox write fails', () => {
    // First setup account/device before mocking setItem failure
    getOutbox();

    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation((k) => {
      if (k === OUTBOX_STORAGE_KEY) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
    });

    const mutation = enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.USER_SETTINGS,
      operation: SYNC_OPERATIONS.UPDATE_STATE,
      payload: { data: 123 }
    });

    expect(mutation).toBeNull();
  });

  // 5. Scoped reset safety (daily reset does NOT delete roadmap or session history)
  test('resetDailyProgress deletes only today\'s goals and does not delete roadmap, sessions, or completions', async () => {
    const existingRoadmap = [{
      id: 'subj-1',
      title: 'Digital Electronics',
      phases: [{ id: 'p-1', name: 'Phase 1', tasks: [{ id: 't-1', title: 'Logic Gates', completed: false }] }]
    }];
    const existingSessions = [{
      id: 'sess-old',
      durationMinutes: 45,
      date: '2026-10-01'
    }];
    const existingCompletions = [{
      id: 'comp-old',
      taskId: 't-1',
      date: '2026-10-01'
    }];
    safeStorageSet('roadmap', existingRoadmap);
    safeStorageSet('sessions', existingSessions);
    safeStorageSet('learningTracker_taskCompletions', existingCompletions);
    safeStorageSet('dailyGoals', { '2026-10-07': { completedMinutes: 30 } });

    await mountProvider();

    expect(capturedContext.roadmap).toHaveLength(1);
    expect(capturedContext.sessions).toHaveLength(1);
    expect(capturedContext.taskCompletions).toHaveLength(1);

    await act(async () => {
      capturedContext.resetDailyProgress();
    });

    // Roadmap, sessions, completions are untouched
    expect(capturedContext.roadmap).toHaveLength(1);
    expect(capturedContext.sessions).toHaveLength(1);
    expect(capturedContext.taskCompletions).toHaveLength(1);
  });

  // 6. Complete destructive reset safety and scope
  test('resetEverything purges domain state but preserves device identity and theme', async () => {
    safeStorageSet('roadmap', [{ id: 's-1', title: 'Subject 1', phases: [] }]);
    safeStorageSet('sessions', [{ id: 'sess-1', durationMinutes: 20 }]);
    safeStorageSet('theme', 'dark');
    safeStorageSet('learningTracker_deviceId', 'dev_persistent_test_id');

    await mountProvider();

    expect(capturedContext.roadmap).toHaveLength(1);

    await act(async () => {
      capturedContext.resetEverything();
    });

    expect(capturedContext.roadmap).toHaveLength(0);
    expect(capturedContext.sessions).toHaveLength(0);

    // Roadmap and sessions keys removed
    expect(localStorage.getItem('roadmap')).toBeNull();
    expect(localStorage.getItem('sessions')).toBeNull();

    // Device ID and theme preserved
    expect(safeStorageGet('learningTracker_deviceId')).toBe('dev_persistent_test_id');
    expect(safeStorageGet('theme')).toBe('dark');
  });

  // 7. Legacy data migration protects against empty canonical overwriting legacy data
  test('legacy migration prioritizes non-empty legacy data when canonical is empty array', async () => {
    // Canonical is empty array [], but legacy has real subjects
    localStorage.setItem('roadmap', JSON.stringify([]));
    localStorage.setItem('learningTracker_roadmap', JSON.stringify([{
      id: 'subj-legacy-1',
      title: 'Embedded Firmware',
      phases: []
    }]));

    await mountProvider();

    // The legacy subject was preserved and migrated into canonical
    expect(capturedContext.roadmap).toHaveLength(1);
    const migrated = safeStorageGet('roadmap');
    expect(migrated).toHaveLength(1);
    expect(migrated[0].id).toBe('subj-legacy-1');

    // Legacy key is cleanly retired after successful migration
    expect(localStorage.getItem('learningTracker_roadmap')).toBeNull();
  });

  // 8. Migration idempotency: running migration multiple times causes zero duplicates
  test('migration is idempotent: reloading with migrated data causes no duplicate records', async () => {
    const canonical = [{
      id: 'subj-clean',
      title: 'Signals',
      phases: []
    }];
    safeStorageSet('roadmap', canonical);

    await mountProvider();
    expect(capturedContext.roadmap).toHaveLength(1);
    await unmountProvider();

    // Re-mount (second pass)
    await mountProvider();
    expect(capturedContext.roadmap).toHaveLength(1);
    const stored = safeStorageGet('roadmap');
    expect(stored).toHaveLength(1);
  });

  // 9. Sign-out preservation: signing out does NOT destroy local learner work
  test('signOutUser preserves local learner work unless explicit destructive clear is requested', async () => {
    safeStorageSet('roadmap', [{ id: 'rm_preserve_test', title: 'FPGA' }]);
    safeStorageSet('sessions', [{ id: 'sess_preserve_test', durationMinutes: 30 }]);
    safeStorageSet('learningTracker_taskCompletions', [{ id: 'comp_preserve_test', taskId: 't-1' }]);

    await signOutUser({ clearLocalData: false });

    // Learner data remains fully intact in storage
    expect(safeStorageGet('roadmap')).toHaveLength(1);
    expect(safeStorageGet('sessions')).toHaveLength(1);
    expect(safeStorageGet('learningTracker_taskCompletions')).toHaveLength(1);
  });

  // 10. Cross-tab storage change synchronization
  test('storage event with newValue null clears memory state without resurrecting stale data', async () => {
    safeStorageSet('roadmap', [{ id: 'rm-synctab', title: 'Robotics', phases: [] }]);

    await mountProvider();
    expect(capturedContext.roadmap).toHaveLength(1);

    // Simulate another tab clearing the roadmap
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'roadmap',
        newValue: null
      }));
    });

    expect(capturedContext.roadmap).toHaveLength(0);
  });
});
