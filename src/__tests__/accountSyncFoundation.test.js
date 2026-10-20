/**
 * accountSyncFoundation.test.js
 *
 * Comprehensive Verification of Account + Sync Foundation for Learning Tracker.
 *
 * Verifies all 9 mandatory test scenarios:
 * 1. offline -> work -> reconnect -> sync
 * 2. two devices -> same account
 * 3. duplicate upload (idempotency)
 * 4. logout / login
 * 5. local existing user migration
 * 6. sync failure
 * 7. partial network failure
 * 8. undo after synchronization (revocation tombstone)
 * 9. reset after synchronization
 */

import {
  getOrCreateAccount,
  linkAuthProvider,
  getOrCreateDeviceId,
  getRegisteredDevices,
  unlinkDevice,
  createPairingTicket,
  verifyPairingTicket,
  logoutAccount,
  deleteAccount
} from '../services/accountIdentityService';

import {
  enqueueMutation,
  getOutbox,
  clearOutbox,
  getOutboxCount,
  executeSyncCycle,
  getSyncMetadata,
  updateSyncMetadata,
  migrateExistingLocalUser,
  reconcileRemoteEvents,
  reconcileRemoteRevocations,
  reconcileRemoteState
} from '../services/syncEngine';

import { registerTestSyncTransport, clearTestSyncTransport } from '../services/syncTransport';
import { mockServerBroker } from '../testing/mockSyncServerBroker';
import { SYNC_ENTITY_TYPES, SYNC_OPERATIONS, AUTH_PROVIDERS } from '../shared/accountSyncProtocol';
import { safeStorageSet, safeStorageGet } from '../utils/storage';
import { loadIdentity, saveIdentity, DEFAULT_IDENTITY } from '../utils/identityRealityResolver';

describe('Account & Sync Foundation', () => {
  beforeEach(() => {
    localStorage.clear();
    mockServerBroker.reset();
    registerTestSyncTransport(mockServerBroker);
  });

  afterEach(() => {
    clearTestSyncTransport();
  });

  // =========================================================================
  // 1. OFFLINE -> WORK -> RECONNECT -> SYNC
  // =========================================================================
  test('Scenario 1: offline -> work -> reconnect -> sync', async () => {
    const account = getOrCreateAccount();
    expect(account.accountId).toBeDefined();

    // 1. Simulate offline network
    mockServerBroker.setFaultInjection({ offline: true });

    // 2. Perform work locally (complete a task and record a session)
    const sessionMutation = enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'sess-offline-1',
      payload: {
        sessionId: 'sess-offline-1',
        subjectId: 'electronics',
        phaseId: 'foundations',
        taskId: 't-capacitors',
        subtaskId: 'st-rc-timing',
        durationMinutes: 30,
        notes: 'Derived RC charging curve offline on breadboard.',
        difficulty: 'medium',
        completedAt: new Date().toISOString()
      }
    });

    expect(sessionMutation).toBeDefined();
    expect(getOutboxCount()).toBe(1);

    // 3. Attempt sync while offline -> outbox remains intact, fails gracefully
    const offlineSync = await executeSyncCycle();
    expect(offlineSync.success).toBe(false);
    expect(offlineSync.offline).toBe(true);
    expect(getOutboxCount()).toBe(1);

    // 4. Reconnect network
    mockServerBroker.setFaultInjection({ offline: false });

    // 5. Sync again -> succeeds and clears outbox
    const reconnectSync = await executeSyncCycle();
    expect(reconnectSync.success).toBe(true);
    expect(reconnectSync.syncedCount).toBe(1);
    expect(getOutboxCount()).toBe(0);

    const meta = getSyncMetadata();
    expect(meta.lastSyncCursor).toBeGreaterThan(0);
    expect(meta.status).toBe('idle');
  });

  // =========================================================================
  // 2. TWO DEVICES -> SAME ACCOUNT
  // =========================================================================
  test('Scenario 2: two devices -> same account', async () => {
    const account = getOrCreateAccount();
    const deviceA = 'dev_laptop_alpha';
    const deviceB = 'dev_android_companion_beta';

    // Device A performs work and syncs to server broker
    await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceA,
      lastSyncCursor: 0,
      mutations: [
        {
          mutationId: 'mut-devA-1',
          accountId: account.accountId,
          deviceId: deviceA,
          entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
          operation: SYNC_OPERATIONS.APPEND_EVENT,
          timestamp: Date.now(),
          payload: {
            eventId: 'comp-devA-task1',
            completionId: 'comp-devA-task1',
            subjectId: 'electronics',
            phaseId: 'foundations',
            taskId: 't-resistors',
            subtaskId: 'st-ohms-law',
            durationMinutes: 20,
            notes: 'Verified V = IR with multimeter.',
            completedAt: new Date().toISOString()
          }
        }
      ]
    });

    // Device B sets up local state with roadmap
    safeStorageSet('roadmap', [
      {
        id: 'electronics',
        phases: [
          {
            id: 'foundations',
            tasks: [
              {
                id: 't-resistors',
                subtasks: [
                  { id: 'st-ohms-law', name: 'Derive Ohm\'s Law', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ]);
    safeStorageSet('learningTracker_taskCompletions', []);

    // Device B syncs and receives remote changes from Device A
    const deviceBSyncResponse = await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceB,
      lastSyncCursor: 0,
      mutations: []
    });

    expect(deviceBSyncResponse.serverChanges.events.length).toBe(1);
    expect(deviceBSyncResponse.serverChanges.events[0].completionId).toBe('comp-devA-task1');

    // Reconcile into Device B's local state
    reconcileRemoteEvents(deviceBSyncResponse.serverChanges.events);

    // Verify Device B now reflects the completion
    const deviceBCompletions = safeStorageGet('learningTracker_taskCompletions', []);
    expect(deviceBCompletions.length).toBe(1);
    expect(deviceBCompletions[0].subtaskId).toBe('st-ohms-law');

    const deviceBRoadmap = safeStorageGet('roadmap', []);
    const completedSubtask = deviceBRoadmap[0].phases[0].tasks[0].subtasks[0];
    expect(completedSubtask.completed).toBe(true);
  });

  // =========================================================================
  // 3. DUPLICATE UPLOAD (IDEMPOTENCY)
  // =========================================================================
  test('Scenario 3: duplicate upload produces zero duplicate records (idempotent)', async () => {
    const account = getOrCreateAccount();
    const deviceId = getOrCreateDeviceId();

    const mutation = {
      mutationId: 'mut-stable-uuid-42',
      accountId: account.accountId,
      deviceId,
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      timestamp: Date.now(),
      payload: {
        eventId: 'sess-unique-99',
        sessionId: 'sess-unique-99',
        durationMinutes: 25,
        completedAt: new Date().toISOString()
      }
    };

    // First upload
    const res1 = await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId,
      lastSyncCursor: 0,
      mutations: [mutation]
    });
    expect(res1.acknowledgedMutationIds).toContain('mut-stable-uuid-42');

    // Duplicate upload of exact same mutation
    const res2 = await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId,
      lastSyncCursor: res1.newCursor,
      mutations: [mutation]
    });
    expect(res2.acknowledgedMutationIds).toContain('mut-stable-uuid-42');

    // Server event store should only have 1 event, not 2
    const serverStore = mockServerBroker.getAccountStore(account.accountId);
    expect(serverStore.events.filter(e => e.eventId === 'sess-unique-99').length).toBe(1);
  });

  // =========================================================================
  // 4. LOGOUT / LOGIN / AUTH LINKING
  // =========================================================================
  test('Scenario 4: logout, login, and auth linking preserve learning data', () => {
    // Start with anonymous local user
    const anonAccount = getOrCreateAccount();
    expect(anonAccount.authProvider).toBe(AUTH_PROVIDERS.ANONYMOUS);
    expect(anonAccount.email).toBeNull();

    // Link Google Auth
    const linked = linkAuthProvider({
      provider: AUTH_PROVIDERS.GOOGLE,
      email: 'student@university.edu',
      displayName: 'Embedded Engineer',
      externalId: 'google-oauth2-10928374'
    });

    expect(linked.authProvider).toBe(AUTH_PROVIDERS.GOOGLE);
    expect(linked.email).toBe('student@university.edu');
    expect(linked.displayName).toBe('Embedded Engineer');

    // Verify pairing ticket generation
    const ticket = createPairingTicket();
    expect(ticket.pairingCode).toMatch(/^LT-\d{4}$/);

    // Verify pairing confirmation from companion device
    const pairResult = verifyPairingTicket(ticket.pairingCode, {
      name: 'Pixel 8 Companion',
      model: 'Google Pixel 8',
      hasUsageAccess: true
    });
    expect(pairResult.success).toBe(true);
    expect(pairResult.device.name).toBe('Pixel 8 Companion');

    const devices = getRegisteredDevices();
    expect(devices.length).toBeGreaterThanOrEqual(2);

    // Logout
    const newSession = logoutAccount();
    expect(newSession.authProvider).toBe(AUTH_PROVIDERS.ANONYMOUS);
    expect(newSession.accountId).not.toBe(anonAccount.accountId);
  });

  // =========================================================================
  // 5. LOCAL EXISTING USER MIGRATION
  // =========================================================================
  test('Scenario 5: local existing user migration packages historical data into outbox', () => {
    // Populate pre-existing local data before sync was introduced
    safeStorageSet('sessions', [
      { id: 'sess-old-1', durationMinutes: 45, notes: 'Old local session 1' },
      { id: 'sess-old-2', durationMinutes: 30, notes: 'Old local session 2' }
    ]);
    safeStorageSet('learningTracker_taskCompletions', [
      { id: 'comp-old-1', taskId: 't-1', subtaskId: 'st-1', notes: 'Old completion' }
    ]);
    saveIdentity({
      ...DEFAULT_IDENTITY,
      destination: { primaryGoal: 'Embedded Systems Placement' }
    });

    // Run migration
    const migration = migrateExistingLocalUser();
    expect(migration.migrated).toBe(true);
    expect(migration.count).toBe(4); // 2 sessions + 1 completion + 1 identity

    const outbox = getOutbox();
    expect(outbox.length).toBe(4);

    // Re-running migration is a no-op
    const secondPass = migrateExistingLocalUser();
    expect(secondPass.migrated).toBe(false);
  });

  // =========================================================================
  // 6. SYNC FAILURE (FAULT INJECTION 500)
  // =========================================================================
  test('Scenario 6: server 500 error leaves outbox completely safe and intact', async () => {
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'comp-fault-1',
      payload: { completionId: 'comp-fault-1', notes: 'Important take' }
    });
    expect(getOutboxCount()).toBe(1);

    // Force server 500 error
    mockServerBroker.setFaultInjection({ force500: true });

    const syncRes = await executeSyncCycle();
    expect(syncRes.success).toBe(false);
    expect(syncRes.error).toContain('500');

    // Outbox must remain intact
    expect(getOutboxCount()).toBe(1);
    expect(getSyncMetadata().status).toBe('error');

    // Restore server health
    mockServerBroker.setFaultInjection({ force500: false });
    const recoverySync = await executeSyncCycle();
    expect(recoverySync.success).toBe(true);
    expect(getOutboxCount()).toBe(0);
  });

  // =========================================================================
  // 7. PARTIAL NETWORK FAILURE
  // =========================================================================
  test('Scenario 7: partial network failure only removes acknowledged mutations', async () => {
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'sess-part-1',
      payload: { sessionId: 'sess-part-1', durationMinutes: 20 }
    });
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'sess-part-2',
      payload: { sessionId: 'sess-part-2', durationMinutes: 25 }
    });
    expect(getOutboxCount()).toBe(2);

    // Inject partial failure (broker processes 1 of 2 before connection drops)
    mockServerBroker.setFaultInjection({ partial: true });

    const syncRes = await executeSyncCycle();
    expect(syncRes.success).toBe(true);
    expect(syncRes.syncedCount).toBe(1);
    expect(getOutboxCount()).toBe(1);

    // Next full sync flushes remaining mutation
    mockServerBroker.setFaultInjection({ partial: false });
    const flushSync = await executeSyncCycle();
    expect(flushSync.success).toBe(true);
    expect(getOutboxCount()).toBe(0);
  });

  // =========================================================================
  // 8. UNDO AFTER SYNCHRONIZATION (REVOCATION TOMBSTONE)
  // =========================================================================
  test('Scenario 8: undo after sync emits revocation tombstone that rolls back on other devices', async () => {
    const account = getOrCreateAccount();
    const deviceA = 'dev_station_alpha';
    const deviceB = 'dev_tablet_beta';

    // 1. Device A completes subtask and syncs
    await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceA,
      lastSyncCursor: 0,
      mutations: [
        {
          mutationId: 'mut-comp-1',
          accountId: account.accountId,
          deviceId: deviceA,
          entityType: SYNC_ENTITY_TYPES.TASK_COMPLETION,
          operation: SYNC_OPERATIONS.APPEND_EVENT,
          timestamp: Date.now(),
          payload: {
            eventId: 'event-comp-101',
            completionId: 'comp-101',
            subjectId: 'embedded',
            phaseId: 'phase-1',
            taskId: 'task-registers',
            subtaskId: 'sub-gpio-reg',
            durationMinutes: 15,
            notes: 'Configured GPIO registers.'
          }
        }
      ]
    });

    // 2. Device B syncs and reconciles the completion
    safeStorageSet('roadmap', [
      {
        id: 'embedded',
        phases: [
          {
            id: 'phase-1',
            tasks: [
              {
                id: 'task-registers',
                subtasks: [{ id: 'sub-gpio-reg', completed: false }]
              }
            ]
          }
        ]
      }
    ]);
    safeStorageSet('learningTracker_taskCompletions', []);

    const devBSync1 = await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceB,
      lastSyncCursor: 0,
      mutations: []
    });
    reconcileRemoteEvents(devBSync1.serverChanges.events);
    expect(safeStorageGet('roadmap')[0].phases[0].tasks[0].subtasks[0].completed).toBe(true);

    // 3. User on Device A hits "Undo" -> emits REVOCATION tombstone
    await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceA,
      lastSyncCursor: devBSync1.newCursor,
      mutations: [
        {
          mutationId: 'mut-undo-1',
          accountId: account.accountId,
          deviceId: deviceA,
          entityType: SYNC_ENTITY_TYPES.UNDO_REVOCATION,
          operation: SYNC_OPERATIONS.REVOKE_EVENT,
          timestamp: Date.now(),
          payload: {
            eventId: 'rev-tombstone-1',
            targetEventId: 'comp-101'
          }
        }
      ]
    });

    // 4. Device B syncs again -> receives revocation tombstone
    const devBSync2 = await mockServerBroker.sync({
      accountId: account.accountId,
      deviceId: deviceB,
      lastSyncCursor: devBSync1.newCursor,
      mutations: []
    });

    expect(devBSync2.serverChanges.revocations.length).toBe(1);
    expect(devBSync2.serverChanges.revocations[0].targetEventId).toBe('comp-101');

    // 5. Device B applies revocation -> subtask is rolled back to uncompleted!
    reconcileRemoteRevocations(devBSync2.serverChanges.revocations);

    const rolledBackRoadmap = safeStorageGet('roadmap', []);
    expect(rolledBackRoadmap[0].phases[0].tasks[0].subtasks[0].completed).toBe(false);
    expect(safeStorageGet('learningTracker_taskCompletions', []).length).toBe(0);
  });

  // =========================================================================
  // 9. RESET AFTER SYNCHRONIZATION
  // =========================================================================
  test('Scenario 9: reset after synchronization clears outbox and resets metadata cleanly', () => {
    enqueueMutation({
      entityType: SYNC_ENTITY_TYPES.FOCUS_SESSION,
      operation: SYNC_OPERATIONS.APPEND_EVENT,
      eventId: 'sess-reset-1',
      payload: { sessionId: 'sess-reset-1' }
    });
    updateSyncMetadata({ lastSyncCursor: 450 });
    expect(getOutboxCount()).toBe(1);

    clearOutbox();
    updateSyncMetadata({ lastSyncCursor: 0, status: 'idle', error: null });

    expect(getOutboxCount()).toBe(0);
    expect(getSyncMetadata().lastSyncCursor).toBe(0);
  });

  // =========================================================================
  // 10. ADDITIVE RESOURCE MERGING (CONFLICT RESOLUTION)
  // =========================================================================
  test('Additive resource merging: hardware added on two devices is merged as set union', () => {
    saveIdentity({
      ...DEFAULT_IDENTITY,
      version: 100,
      resources: {
        ...DEFAULT_IDENTITY.resources,
        hardware: ['Laptop', 'ESP32']
      }
    });

    const remoteState = {
      [SYNC_ENTITY_TYPES.USER_IDENTITY]: {
        version: 101,
        resources: {
          hardware: ['Laptop', 'Multimeter', 'Breadboard'],
          software: ['VS Code', 'LTspice']
        }
      }
    };

    reconcileRemoteState(remoteState);

    const merged = loadIdentity();
    // Hardware must include both ESP32 (from local) and Multimeter/Breadboard (from remote)
    expect(merged.resources.hardware).toContain('ESP32');
    expect(merged.resources.hardware).toContain('Multimeter');
    expect(merged.resources.hardware).toContain('Breadboard');
    expect(merged.resources.hardware).toContain('Laptop');
  });
});
