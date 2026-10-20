/**
 * syncEngine.js
 *
 * Local-First Outbox & Synchronization Engine.
 *
 * Core Invariants:
 * 1. Offline-First: Local writes are instantaneous and optimistic; outbox queues mutations.
 * 2. Idempotent: Safe to send mutations more than once.
 * 3. Immutable Events: Historical sessions and completions are append-only.
 * 4. Revocation Tombstones: Undoing an action produces an explicit revocation event.
 * 5. Additive State Merge: Resource inventory uses set union; settings use high-watermark versioning.
 * 6. Non-Destructive: Network errors never discard outbox items.
 */

import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { getOrCreateAccount, getOrCreateDeviceId } from './accountIdentityService';
import {
  SYNC_ENTITY_TYPES,
  SYNC_OPERATIONS,
  SYNC_STATUS_STATES,
  OUTBOX_MUTATION_STATUS,
  validateMutation
} from '../shared/accountSyncProtocol';
import { dispatchSyncRequest } from './syncTransport';
import { loadIdentity, saveIdentity } from '../utils/identityRealityResolver';

export const OUTBOX_STORAGE_KEY = 'learningTracker_syncOutbox';
export const SYNC_METADATA_KEY = 'learningTracker_syncMetadata';

/**
 * Returns current sync engine metadata
 */
export function getSyncMetadata() {
  return safeStorageGet(SYNC_METADATA_KEY, {
    lastSyncCursor: 0,
    lastSyncTime: null,
    status: SYNC_STATUS_STATES.IDLE,
    error: null,
    hasMigratedLocalData: false
  });
}

/**
 * Updates sync metadata safely
 */
export function updateSyncMetadata(patch) {
  const current = getSyncMetadata();
  const updated = { ...current, ...patch };
  safeStorageSet(SYNC_METADATA_KEY, updated);
  return updated;
}

/**
 * Retrieves all pending outbox mutations
 */
export function getOutbox() {
  return safeStorageGet(OUTBOX_STORAGE_KEY, []);
}

/**
 * Gets count of pending mutations
 */
export function getOutboxCount() {
  return getOutbox().length;
}

/**
 * Enqueues a mutation into the local outbox
 */
export function enqueueMutation({ entityType, operation, payload, eventId = null }) {
  const account = getOrCreateAccount();
  const deviceId = getOrCreateDeviceId();

  const mutation = {
    mutationId: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    accountId: account.accountId,
    deviceId,
    entityType,
    operation,
    payload: {
      ...payload,
      ...(eventId ? { eventId } : {})
    },
    syncStatus: OUTBOX_MUTATION_STATUS.PENDING_LOCAL_SYNC,
    timestamp: Date.now()
  };

  const validation = validateMutation(mutation);
  if (!validation.valid) {
    console.error('Invalid mutation rejected:', validation.error, mutation);
    return null;
  }

  const outbox = getOutbox();
  outbox.push(mutation);
  const writeResult = safeStorageSet(OUTBOX_STORAGE_KEY, outbox);
  if (!writeResult.ok) {
    console.error('Failed to persist mutation to outbox storage:', writeResult.error);
    return null;
  }

  const meta = getSyncMetadata();
  if (meta.status === SYNC_STATUS_STATES.IDLE) {
    updateSyncMetadata({ status: SYNC_STATUS_STATES.LOCAL_DATA_QUEUED });
  }

  return mutation;
}

/**
 * Clears the outbox (used in reset/tests)
 */
export function clearOutbox() {
  safeStorageSet(OUTBOX_STORAGE_KEY, []);
}

/**
 * Reassigns any pending outbox mutations to a new canonical account ID.
 * Called when an anonymous local user logs in to a real Google account,
 * ensuring their un-synced local mutations belong to their new accountId.
 */
export function reassignOutboxToAccount(targetAccountId) {
  if (!targetAccountId) return 0;
  const outbox = getOutbox();
  if (!Array.isArray(outbox) || outbox.length === 0) return 0;

  let changed = 0;
  const updatedOutbox = outbox.map(mutation => {
    if (mutation.accountId !== targetAccountId) {
      changed++;
      return {
        ...mutation,
        accountId: targetAccountId
      };
    }
    return mutation;
  });

  if (changed > 0) {
    safeStorageSet(OUTBOX_STORAGE_KEY, updatedOutbox);
  }
  return changed;
}

/**
 * Migrates existing local-first user data into initial outbox mutations
 * so that an existing user's data seamlessly follows them to the account.
 */
export function migrateExistingLocalUser() {
  const meta = getSyncMetadata();
  if (meta.hasMigratedLocalData) {
    return { migrated: false, count: 0 };
  }

  let count = 0;

  // 1. Migrate completed focus sessions
  const sessions = safeStorageGet('sessions', []);
  if (Array.isArray(sessions) && sessions.length > 0) {
    sessions.forEach(sess => {
      enqueueMutation({
        entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
        operation: SYNC_OPERATIONS.APPEND_EVENT,
        eventId: sess.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        payload: {
          sessionId: sess.id,
          subjectId: sess.subjectId,
          phaseId: sess.phaseId,
          taskId: sess.taskId,
          subtaskId: sess.subtaskId,
          durationMinutes: sess.durationMinutes || sess.duration || 25,
          notes: sess.notes || '',
          difficulty: sess.difficulty || 'medium',
          type: sess.type || 'focus-session',
          completedAt: sess.date || new Date().toISOString()
        }
      });
      count++;
    });
  }

  // 2. Migrate task completion events
  const completions = safeStorageGet('learningTracker_taskCompletions', []);
  if (Array.isArray(completions) && completions.length > 0) {
    completions.forEach(comp => {
      enqueueMutation({
        entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
        operation: SYNC_OPERATIONS.APPEND_EVENT,
        eventId: comp.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        payload: {
          completionId: comp.id,
          subjectId: comp.subjectId,
          phaseId: comp.phaseId,
          taskId: comp.taskId,
          subtaskId: comp.subtaskId,
          durationMinutes: comp.durationMinutes || 0,
          notes: comp.notes || '',
          completedAt: comp.completedAt || new Date().toISOString()
        }
      });
      count++;
    });
  }

  // 3. Migrate user identity / reality state
  const currentIdentity = loadIdentity();
  if (currentIdentity) {
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.USER_IDENTITY,
      operation: SYNC_OPERATIONS.UPDATE_STATE,
      payload: {
        ...currentIdentity,
        version: Date.now()
      }
    });
    count++;
  }

  updateSyncMetadata({ hasMigratedLocalData: true });
  return { migrated: true, count };
}

/**
 * Reconciles remote immutable events into local state
 */
export function reconcileRemoteEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) return;

  // 1. Reconcile Focus Sessions
  const localSessions = safeStorageGet('sessions', []);
  let sessionsUpdated = false;

  // 2. Reconcile Task Completions
  const localCompletions = safeStorageGet('learningTracker_taskCompletions', []);
  let completionsUpdated = false;

  // 3. Roadmap for reflecting completions
  const localRoadmap = safeStorageGet('roadmap', []);
  let roadmapUpdated = false;

  events.forEach(evt => {
    if (evt.type === 'SESSION_COMPLETED' || evt.sessionId) {
      const sessionId = evt.sessionId || evt.payload?.sessionId;
      if (sessionId && !localSessions.some(s => s.id === sessionId)) {
        localSessions.push({
          id: sessionId,
          subjectId: evt.subjectId || evt.payload?.subjectId,
          phaseId: evt.phaseId || evt.payload?.phaseId,
          taskId: evt.taskId || evt.payload?.taskId,
          subtaskId: evt.subtaskId || evt.payload?.subtaskId,
          durationMinutes: evt.durationMinutes || evt.payload?.durationMinutes || 25,
          notes: evt.notes || evt.payload?.notes || '',
          difficulty: evt.difficulty || evt.payload?.difficulty || 'medium',
          date: evt.completedAt || evt.payload?.completedAt || new Date().toISOString()
        });
        sessionsUpdated = true;
      }
    } else if (evt.type === 'TASK_COMPLETED' || evt.completionId) {
      const completionId = evt.completionId || evt.payload?.completionId;
      if (completionId && !localCompletions.some(c => c.id === completionId)) {
        const subtaskId = evt.subtaskId || evt.payload?.subtaskId;
        const taskId = evt.taskId || evt.payload?.taskId;

        localCompletions.push({
          id: completionId,
          subjectId: evt.subjectId || evt.payload?.subjectId,
          phaseId: evt.phaseId || evt.payload?.phaseId,
          taskId,
          subtaskId,
          durationMinutes: evt.durationMinutes || evt.payload?.durationMinutes || 0,
          notes: evt.notes || evt.payload?.notes || '',
          completedAt: evt.completedAt || evt.payload?.completedAt || new Date().toISOString()
        });
        completionsUpdated = true;

        // Mark corresponding task/subtask complete in roadmap
        if (Array.isArray(localRoadmap)) {
          localRoadmap.forEach(subject => {
            (subject.phases || []).forEach(phase => {
              (phase.tasks || []).forEach(task => {
                if (subtaskId && Array.isArray(task.subtasks)) {
                  const match = task.subtasks.find(st => st.id === subtaskId || st.name === subtaskId);
                  if (match && !match.completed) {
                    match.completed = true;
                    roadmapUpdated = true;
                  }
                } else if (task.id === taskId && !task.completed) {
                  task.completed = true;
                  roadmapUpdated = true;
                }
              });
            });
          });
        }
      }
    }
  });

  if (sessionsUpdated) {
    safeStorageSet('sessions', localSessions);
  }
  if (completionsUpdated) {
    safeStorageSet('learningTracker_taskCompletions', localCompletions);
  }
  if (roadmapUpdated) {
    safeStorageSet('roadmap', localRoadmap);
  }
}

/**
 * Reconciles remote revocation tombstones (Undo applied on other devices)
 */
export function reconcileRemoteRevocations(revocations = []) {
  if (!Array.isArray(revocations) || revocations.length === 0) return;

  const targetIds = new Set(revocations.map(r => r.targetEventId || r.payload?.targetEventId).filter(Boolean));
  if (targetIds.size === 0) return;

  // 1. Remove revoked sessions
  const localSessions = safeStorageGet('sessions', []);
  const filteredSessions = localSessions.filter(s => !targetIds.has(s.id));
  if (filteredSessions.length !== localSessions.length) {
    safeStorageSet('sessions', filteredSessions);
  }

  // 2. Remove revoked task completions
  const localCompletions = safeStorageGet('learningTracker_taskCompletions', []);
  const removedCompletions = localCompletions.filter(c => targetIds.has(c.id));
  const filteredCompletions = localCompletions.filter(c => !targetIds.has(c.id));

  if (filteredCompletions.length !== localCompletions.length) {
    safeStorageSet('learningTracker_taskCompletions', filteredCompletions);

    // Rollback task completion flag in roadmap
    const localRoadmap = safeStorageGet('roadmap', []);
    let roadmapChanged = false;

    removedCompletions.forEach(comp => {
      if (Array.isArray(localRoadmap)) {
        localRoadmap.forEach(subject => {
          (subject.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
              if (comp.subtaskId && Array.isArray(task.subtasks)) {
                const match = task.subtasks.find(st => st.id === comp.subtaskId || st.name === comp.subtaskId);
                if (match && match.completed) {
                  match.completed = false;
                  roadmapChanged = true;
                }
              } else if (task.id === comp.taskId && task.completed) {
                task.completed = false;
                roadmapChanged = true;
              }
            });
          });
        });
      }
    });

    if (roadmapChanged) {
      safeStorageSet('roadmap', localRoadmap);
    }
  }
}

/**
 * Reconciles remote mutable state updates using conflict resolution rules:
 * - User Identity Resources: Set union (Equipment isn't deleted by second device)
 * - User Identity Reality / Settings: High-watermark timestamp per field
 */
export function reconcileRemoteState(remoteState = {}) {
  if (!remoteState || typeof remoteState !== 'object') return;

  // 1. User Identity Merge
  const remoteIdentity = remoteState[SYNC_ENTITY_TYPES.USER_IDENTITY];
  if (remoteIdentity && typeof remoteIdentity === 'object') {
    const localIdentity = loadIdentity();
    const localVersion = localIdentity.version || 0;
    const remoteVersion = remoteIdentity.version || 0;

    // Union merge for physical hardware and software resources
    const mergedHardware = Array.from(new Set([
      ...(localIdentity.resources?.hardware || []),
      ...(remoteIdentity.resources?.hardware || [])
    ]));

    const mergedSoftware = Array.from(new Set([
      ...(localIdentity.resources?.software || []),
      ...(remoteIdentity.resources?.software || [])
    ]));

    const merged = {
      ...localIdentity,
      ...(remoteVersion >= localVersion ? remoteIdentity : {}),
      resources: {
        ...(remoteVersion >= localVersion ? remoteIdentity.resources : localIdentity.resources),
        hardware: mergedHardware,
        software: mergedSoftware
      },
      version: Math.max(localVersion, remoteVersion)
    };

    saveIdentity(merged);
  }

  // 2. Settings Merge
  const remoteSettings = remoteState[SYNC_ENTITY_TYPES.USER_SETTINGS];
  if (remoteSettings && typeof remoteSettings === 'object') {
    const localSettings = safeStorageGet('learningTracker_settings', {});
    const localVersion = localSettings.version || 0;
    const remoteVersion = remoteSettings.version || 0;

    if (remoteVersion >= localVersion) {
      safeStorageSet('learningTracker_settings', {
        ...localSettings,
        ...remoteSettings,
        version: remoteVersion
      });
    }
  }
}

/**
 * Executes a full synchronization cycle
 */
export async function executeSyncCycle() {
  const account = getOrCreateAccount();
  const deviceId = getOrCreateDeviceId();
  const meta = getSyncMetadata();
  const outbox = getOutbox();

  // If browser is explicitly offline, stay calm and keep outbox
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    updateSyncMetadata({ status: SYNC_STATUS_STATES.OFFLINE, error: null });
    return { success: false, offline: true, error: 'Device is offline' };
  }

  updateSyncMetadata({ status: SYNC_STATUS_STATES.SYNCING, error: null });

  try {
    const payload = {
      accountId: account.accountId,
      deviceId,
      lastSyncCursor: meta.lastSyncCursor || 0,
      mutations: outbox
    };

    const res = await dispatchSyncRequest(payload);

    if (res && res.success) {
      // 1. Remove successfully acknowledged mutations from outbox
      const ackSet = new Set(res.acknowledgedMutationIds || []);
      const remainingOutbox = outbox.filter(m => !ackSet.has(m.mutationId));
      safeStorageSet(OUTBOX_STORAGE_KEY, remainingOutbox);

      // 2. Apply remote events
      if (res.serverChanges?.events) {
        reconcileRemoteEvents(res.serverChanges.events);
      }

      // 3. Apply remote revocations (Undo tombstones)
      if (res.serverChanges?.revocations) {
        reconcileRemoteRevocations(res.serverChanges.revocations);
      }

      // 4. Apply remote state updates
      if (res.serverChanges?.state) {
        reconcileRemoteState(res.serverChanges.state);
      }

      // 5. Update sync metadata with new high-watermark cursor
      updateSyncMetadata({
        lastSyncCursor: res.newCursor || meta.lastSyncCursor,
        lastSyncTime: res.serverTime || Date.now(),
        status: SYNC_STATUS_STATES.IDLE,
        error: null
      });

      return {
        success: true,
        syncedCount: ackSet.size,
        remainingOutboxCount: remainingOutbox.length
      };
    } else {
      throw new Error(res?.error || 'Sync request was not successful');
    }
  } catch (err) {
    const isUnavailable = err.code === 'SYNC_UNAVAILABLE' || err.status === 'SYNC_UNAVAILABLE';
    const isOffline = err.code === 'NETWORK_OFFLINE' || err.message?.includes('offline');

    if (isUnavailable) {
      console.info('Cloud sync unavailable; mutations safely queued in local outbox.');
    } else {
      console.warn('Sync cycle aborted; mutations safely retained in outbox:', err.message);
    }

    const nextStatus = isUnavailable
      ? SYNC_STATUS_STATES.SYNC_UNAVAILABLE
      : isOffline
        ? SYNC_STATUS_STATES.OFFLINE
        : SYNC_STATUS_STATES.ERROR;

    updateSyncMetadata({
      status: nextStatus,
      error: err.message
    });
    return {
      success: false,
      unavailable: isUnavailable,
      offline: isOffline,
      status: isUnavailable ? 'SYNC_UNAVAILABLE' : (isOffline ? 'OFFLINE' : 'ERROR'),
      error: err.message,
      remainingOutboxCount: outbox.length
    };
  }
}
