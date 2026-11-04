/**
 * accountIdentityService.js
 *
 * Canonical User Identity & Device Association Engine.
 *
 * Invariants:
 * 1. Canonical Identity: One user identity (usr_xxx) separate from UI state.
 * 2. Auth Independent: Google login or passkey is an authentication mechanism,
 *    not the owner of learning data.
 * 3. Additive Device Association: Desktop and Android companion associate cleanly.
 * 4. Zero-loss Local Migration: Existing local learners seamlessly inherit their
 *    data when an account is initialized or linked.
 */

import { safeStorageGet, safeStorageSet, safeStorageRemove } from '../utils/storage';
import { AUTH_PROVIDERS, DEVICE_TYPES } from '../shared/accountSyncProtocol';

export const ACCOUNT_STORAGE_KEY = 'learningTracker_account';
export const DEVICE_STORAGE_KEY = 'learningTracker_deviceId';
export const DEVICE_REGISTRY_KEY = 'learningTracker_deviceRegistry';
export const PAIRING_TICKETS_KEY = 'learningTracker_pairingTickets';

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Returns or creates the stable unique device identifier for this client
 */
export function getOrCreateDeviceId() {
  let deviceId = safeStorageGet(DEVICE_STORAGE_KEY, null);
  if (!deviceId) {
    deviceId = generateId('dev_web');
    safeStorageSet(DEVICE_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Retrieves the current canonical user account.
 * Automatically initializes an anonymous local identity if none exists.
 */
export function getOrCreateAccount() {
  let account = safeStorageGet(ACCOUNT_STORAGE_KEY, null);
  if (!account || !account.accountId) {
    const currentDeviceId = getOrCreateDeviceId();
    account = {
      accountId: generateId('usr_local'),
      displayName: 'Independent Learner',
      email: null,
      authProvider: AUTH_PROVIDERS.ANONYMOUS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      primaryDeviceId: currentDeviceId
    };
    safeStorageSet(ACCOUNT_STORAGE_KEY, account);

    // Register current client device in device registry
    registerDevice({
      deviceId: currentDeviceId,
      name: 'Web Workstation (Current)',
      type: DEVICE_TYPES.WEB,
      isCurrent: true,
      pairedAt: Date.now(),
      lastSeenAt: Date.now()
    });
  }
  return account;
}

/**
 * Link an external authentication provider (e.g. Google OAuth)
 * Attaches the auth credentials without destroying existing learning data.
 */
export function linkAuthProvider({ provider = AUTH_PROVIDERS.GOOGLE, email, displayName, externalId, uid, accountId }) {
  const current = getOrCreateAccount();
  const derivedAccountId = accountId || (uid ? `usr_${uid}` : (externalId ? `usr_${externalId}` : current.accountId));
  const updatedAccount = {
    ...current,
    accountId: derivedAccountId,
    authProvider: provider,
    email: email || current.email,
    displayName: displayName || current.displayName,
    externalAuthId: externalId || uid || current.externalAuthId,
    updatedAt: Date.now()
  };
  safeStorageSet(ACCOUNT_STORAGE_KEY, updatedAccount);
  return updatedAccount;
}

/**
 * Retrieves all registered devices associated with this account
 */
export function getRegisteredDevices() {
  const currentDeviceId = getOrCreateDeviceId();
  const list = safeStorageGet(DEVICE_REGISTRY_KEY, []);
  return list.map(d => ({
    ...d,
    isCurrent: d.deviceId === currentDeviceId
  }));
}

/**
 * Registers or updates a device record in the device registry
 */
export function registerDevice(deviceData) {
  if (!deviceData || !deviceData.deviceId) return null;
  const currentDeviceId = getOrCreateDeviceId();
  const existing = safeStorageGet(DEVICE_REGISTRY_KEY, []);
  const updated = existing.filter(d => d.deviceId !== deviceData.deviceId);

  const newRecord = {
    deviceId: deviceData.deviceId,
    name: deviceData.name || 'Connected Device',
    type: deviceData.type || DEVICE_TYPES.WEB,
    capabilities: deviceData.capabilities || {},
    pairedAt: deviceData.pairedAt || Date.now(),
    lastSeenAt: Date.now(),
    isCurrent: deviceData.deviceId === currentDeviceId
  };

  updated.push(newRecord);
  safeStorageSet(DEVICE_REGISTRY_KEY, updated);
  return newRecord;
}

/**
 * Unlinks a device from the account
 */
export function unlinkDevice(targetDeviceId) {
  const existing = safeStorageGet(DEVICE_REGISTRY_KEY, []);
  const filtered = existing.filter(d => d.deviceId !== targetDeviceId);
  safeStorageSet(DEVICE_REGISTRY_KEY, filtered);
  return { success: true, unlinkedDeviceId: targetDeviceId };
}

/**
 * Generates a short-lived pairing ticket for Android companion
 */
export function createPairingTicket() {
  const account = getOrCreateAccount();
  const currentDeviceId = getOrCreateDeviceId();
  const code = `LT-${Math.floor(1000 + Math.random() * 9000)}`;

  const ticket = {
    ticketId: generateId('tkt'),
    pairingCode: code,
    accountId: account.accountId,
    requestedByDeviceId: currentDeviceId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  };

  const existing = safeStorageGet(PAIRING_TICKETS_KEY, []);
  const valid = existing.filter(t => t.expiresAt > Date.now());
  safeStorageSet(PAIRING_TICKETS_KEY, [...valid, ticket]);

  return ticket;
}

/**
 * Verifies a pairing ticket and associates the companion device
 */
export function verifyPairingTicket(code, deviceMetadata = {}) {
  const tickets = safeStorageGet(PAIRING_TICKETS_KEY, []);
  const match = tickets.find(t => t.pairingCode === code && t.expiresAt > Date.now());

  if (!match) {
    return { success: false, error: 'Invalid or expired pairing code.' };
  }

  // Consume used ticket
  safeStorageSet(PAIRING_TICKETS_KEY, tickets.filter(t => t.pairingCode !== code));

  // Register the new companion device
  const companionDeviceId = deviceMetadata.deviceId || generateId('dev_android');
  const registered = registerDevice({
    deviceId: companionDeviceId,
    name: deviceMetadata.name || 'Android Companion Phone',
    type: DEVICE_TYPES.ANDROID,
    capabilities: {
      hasUsageAccess: Boolean(deviceMetadata.hasUsageAccess ?? true),
      model: deviceMetadata.model || 'Android Phone'
    },
    pairedAt: Date.now()
  });

  return {
    success: true,
    accountId: match.accountId,
    device: registered
  };
}

/**
 * Logs out of current account.
 * Reverts to a fresh anonymous local user.
 */
export function logoutAccount() {
  safeStorageRemove(ACCOUNT_STORAGE_KEY);
  safeStorageRemove(DEVICE_REGISTRY_KEY);
  safeStorageRemove(PAIRING_TICKETS_KEY);
  // Re-initialize clean local identity
  return getOrCreateAccount();
}

/**
 * Completely purges account credentials
 */
export function deleteAccount() {
  safeStorageRemove(ACCOUNT_STORAGE_KEY);
  safeStorageRemove(DEVICE_REGISTRY_KEY);
  safeStorageRemove(PAIRING_TICKETS_KEY);
  safeStorageRemove(DEVICE_STORAGE_KEY);
  return { success: true };
}
