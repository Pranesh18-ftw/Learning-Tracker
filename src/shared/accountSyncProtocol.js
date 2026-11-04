/**
 * accountSyncProtocol.js
 *
 * Shared Contract for Learning Tracker Account, Identity, Device Pairing, and Sync.
 *
 * Invariants:
 * 1. Offline-First: All operations are valid without network connectivity.
 * 2. Idempotent: Every event and mutation has a stable client-generated UUID.
 * 3. Immutable Events vs. Mutable State:
 *    - Events (sessions, completions, evidence, tombstones) are append-only.
 *    - State (identity reality, settings, routes) uses high-watermark versioning.
 * 4. Separation of Concerns:
 *    auth -> user identity -> learning domain data -> device associations.
 */

export const SYNC_ENTITY_TYPES = {
  USER_IDENTITY: 'USER_IDENTITY',
  ROADMAP_CURRICULUM: 'ROADMAP_CURRICULUM',
  FOCUS_SESSION: 'FOCUS_SESSION',
  TASK_COMPLETION: 'TASK_COMPLETION',
  EVIDENCE_ARTIFACT: 'EVIDENCE_ARTIFACT',
  UNDO_REVOCATION: 'UNDO_REVOCATION',
  USER_SETTINGS: 'USER_SETTINGS',
  LEARNING_PLAN: 'LEARNING_PLAN',
  DEVICE_REGISTRATION: 'DEVICE_REGISTRATION',
  COMPANION_TELEMETRY: 'COMPANION_TELEMETRY'
};

export const SYNC_OPERATIONS = {
  APPEND_EVENT: 'APPEND_EVENT',     // For immutable events
  UPDATE_STATE: 'UPDATE_STATE',     // For mutable state
  REVOKE_EVENT: 'REVOKE_EVENT'      // Explicit tombstone
};

/**
 * Invariant 3: Explicit non-equivalent synchronization states.
 * A local outbox entry is NOT proof that data reached a server.
 */
export const SYNC_STATUS_STATES = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
  LOCAL_DATA_QUEUED: 'local_data_queued',
  SYNC_UNAVAILABLE: 'sync_unavailable',
  SYNC_IN_PROGRESS: 'sync_in_progress',
  SYNC_SUCCEEDED: 'sync_succeeded',
  SYNC_FAILED: 'sync_failed'
};

/**
 * Mutation queue lifecycle state in local outbox.
 */
export const OUTBOX_MUTATION_STATUS = {
  PENDING_LOCAL_SYNC: 'pending_local_sync',
  SYNC_IN_PROGRESS: 'sync_in_progress',
  SYNC_ACKNOWLEDGED: 'sync_acknowledged'
};

export const AUTH_PROVIDERS = {
  ANONYMOUS: 'anonymous',
  GOOGLE: 'google',
  PASSKEY: 'passkey'
};

export const DEVICE_TYPES = {
  WEB: 'web',
  ANDROID: 'android',
  DESKTOP: 'desktop'
};

/**
 * Validates a mutation before it enters the outbox
 */
export function validateMutation(mutation) {
  if (!mutation || typeof mutation !== 'object') {
    return { valid: false, error: 'Mutation must be an object' };
  }
  if (!mutation.mutationId) {
    return { valid: false, error: 'Missing mutationId' };
  }
  if (!mutation.accountId) {
    return { valid: false, error: 'Missing accountId' };
  }
  if (!mutation.entityType || !SYNC_ENTITY_TYPES[mutation.entityType]) {
    return { valid: false, error: `Invalid entityType: ${mutation.entityType}` };
  }
  if (!mutation.operation || !SYNC_OPERATIONS[mutation.operation]) {
    return { valid: false, error: `Invalid operation: ${mutation.operation}` };
  }
  if (!mutation.payload) {
    return { valid: false, error: 'Missing mutation payload' };
  }
  return { valid: true };
}

/**
 * Validates an immutable event record
 */
export function validateSyncEvent(event) {
  if (!event || typeof event !== 'object') {
    return { valid: false, error: 'Event must be an object' };
  }
  if (!event.eventId) {
    return { valid: false, error: 'Missing eventId' };
  }
  if (!event.type) {
    return { valid: false, error: 'Missing event type' };
  }
  if (typeof event.timestamp !== 'number') {
    return { valid: false, error: 'Missing numeric timestamp' };
  }
  return { valid: true };
}
