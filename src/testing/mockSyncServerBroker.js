/**
 * mockSyncServerBroker.js
 *
 * In-Memory / Simulated Multi-Device Server Broker strictly for AUTOMATED TESTS.
 *
 * Phase 11: Production runtime must NEVER import this test utility.
 * Isolate from production module graph.
 */

import { SYNC_OPERATIONS } from '../shared/accountSyncProtocol';

export class MockSyncServerBroker {
  constructor() {
    this.accounts = new Map(); // accountId -> { events: [], state: {}, cursor: 1000 }
    this.networkAvailable = true;
    this.forceFailure = false;
    this.failureType = null; // 'offline' | '500' | 'partial'
  }

  reset() {
    this.accounts.clear();
    this.networkAvailable = true;
    this.forceFailure = false;
    this.failureType = null;
  }

  setFaultInjection({ offline = false, force500 = false, partial = false }) {
    if (offline) {
      this.networkAvailable = false;
      this.failureType = 'offline';
    } else if (force500) {
      this.forceFailure = true;
      this.failureType = '500';
    } else if (partial) {
      this.forceFailure = true;
      this.failureType = 'partial';
    } else {
      this.networkAvailable = true;
      this.forceFailure = false;
      this.failureType = null;
    }
  }

  getAccountStore(accountId) {
    if (!this.accounts.has(accountId)) {
      this.accounts.set(accountId, {
        events: [],
        state: {},
        cursor: 1000,
        registeredDeviceIds: new Set()
      });
    }
    return this.accounts.get(accountId);
  }

  async sync({ accountId, deviceId, lastSyncCursor = 0, mutations = [] }) {
    // 1. Fault injection checks
    if (!this.networkAvailable || this.failureType === 'offline') {
      const err = new Error('Network offline');
      err.code = 'NETWORK_OFFLINE';
      throw err;
    }

    if (this.forceFailure && this.failureType === '500') {
      const err = new Error('Internal Server Error (500)');
      err.status = 500;
      throw err;
    }

    const store = this.getAccountStore(accountId);
    store.registeredDeviceIds.add(deviceId);

    const acknowledgedMutationIds = [];
    const partialLimit = this.failureType === 'partial' ? Math.floor(mutations.length / 2) : mutations.length;

    // 2. Process incoming mutations from client outbox
    for (let i = 0; i < mutations.length; i++) {
      if (this.failureType === 'partial' && i >= partialLimit) {
        break; // Simulate partial processing before connection dropped
      }

      const mut = mutations[i];
      acknowledgedMutationIds.push(mut.mutationId);

      if (mut.operation === SYNC_OPERATIONS.APPEND_EVENT) {
        // Idempotent event append: avoid duplicates
        const exists = store.events.some(e => e.eventId === mut.payload.eventId);
        if (!exists) {
          store.cursor += 1;
          store.events.push({
            ...mut.payload,
            serverSequence: store.cursor,
            receivedFromDevice: deviceId,
            receivedAt: Date.now()
          });
        }
      } else if (mut.operation === SYNC_OPERATIONS.REVOKE_EVENT) {
        // Undo Tombstone event
        store.cursor += 1;
        store.events.push({
          eventId: mut.payload.eventId,
          type: 'ACTION_REVOKED',
          targetEventId: mut.payload.targetEventId,
          timestamp: mut.timestamp,
          serverSequence: store.cursor,
          receivedFromDevice: deviceId
        });
      } else if (mut.operation === SYNC_OPERATIONS.UPDATE_STATE) {
        // State update with high-watermark versioning
        store.cursor += 1;
        const currentEntityState = store.state[mut.entityType] || {};
        const incomingVersion = mut.payload.version || Date.now();
        const currentVersion = currentEntityState.version || 0;

        if (incomingVersion >= currentVersion) {
          store.state[mut.entityType] = {
            ...currentEntityState,
            ...mut.payload,
            version: incomingVersion,
            serverSequence: store.cursor,
            updatedAt: Date.now()
          };
        }
      }
    }

    // 3. Collect remote events and state updates for this device
    const newEvents = store.events.filter(e =>
      e.serverSequence > lastSyncCursor && e.receivedFromDevice !== deviceId
    );

    const newRevocations = newEvents.filter(e => e.type === 'ACTION_REVOKED');
    const regularEvents = newEvents.filter(e => e.type !== 'ACTION_REVOKED');

    return {
      success: true,
      serverTime: Date.now(),
      newCursor: store.cursor,
      acknowledgedMutationIds,
      serverChanges: {
        events: regularEvents,
        revocations: newRevocations,
        state: store.state
      }
    };
  }
}

export const mockServerBroker = new MockSyncServerBroker();
