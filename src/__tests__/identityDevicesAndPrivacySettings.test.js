/**
 * identityDevicesAndPrivacySettings.test.js
 *
 * Focused Regression Test Suite for Settings UI Companion Device Synchronization:
 * 1. Server-registered device appearing in Settings (via listPairedDevices).
 * 2. Device registered after initial component load becoming visible after refresh.
 * 3. Successful empty server response showing empty state honestly without inventing devices.
 * 4. API / network / auth failure preserving local state as unverified fallback.
 * 5. Registered device treated honestly as REGISTERED, not misrepresented as verified ONLINE.
 * 6. Multi-device support without silently hiding additional registered devices.
 * 7. Existing revoke, unpair, and pairing behaviors remaining intact.
 * 8. Bounded polling / status check discovery when pairing modal is open.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import IdentityDevicesAndPrivacy from '../components/IdentityDevicesAndPrivacy';
import * as phoneClient from '../services/phoneConnectionClient';
import * as RoadmapContextModule from '../context/RoadmapContext';
import { COMPANION_STATES } from '../shared/focusIntegrityProtocol';
import {
  getPairedDevice,
  setPairedDeviceRecord,
  unpairCompanionDevice,
  isCompanionConnected,
  recordFocusTelemetry,
  getAllFocusTelemetry
} from '../services/focusIntegrityService';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('IdentityDevicesAndPrivacy — Server Device Synchronization & Settings UI', () => {
  let container = null;
  let root = null;
  let listPairedDevicesSpy = null;
  let revokePairedDeviceSpy = null;
  let startPairingSessionSpy = null;

  beforeEach(() => {
    localStorage.clear();
    unpairCompanionDevice();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    listPairedDevicesSpy = jest.spyOn(phoneClient, 'listPairedDevices').mockResolvedValue({
      success: true,
      devices: []
    });
    revokePairedDeviceSpy = jest.spyOn(phoneClient, 'revokePairedDevice').mockResolvedValue({
      success: true
    });
    startPairingSessionSpy = jest.spyOn(phoneClient, 'startPairingSession').mockResolvedValue({
      success: true,
      pairingCode: '123456',
      expiresAt: Date.now() + 300000
    });
  });

  afterEach(() => {
    if (listPairedDevicesSpy) listPairedDevicesSpy.mockRestore();
    if (revokePairedDeviceSpy) revokePairedDeviceSpy.mockRestore();
    if (startPairingSessionSpy) startPairingSessionSpy.mockRestore();

    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    localStorage.clear();
  });

  test('1. A server-registered device appears in the Settings UI with server-verified status', async () => {
    const mockServerDevice = {
      deviceId: 'dev_galaxy_s25_001',
      deviceName: 'Samsung Galaxy S25 Ultra',
      status: 'active',
      protocolVersion: 1,
      pairedAt: Date.now() - 86400000,
      lastSeenAt: Date.now() - 300000,
      revokedAt: null
    };

    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [mockServerDevice]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Samsung Galaxy S25 Ultra');
    expect(container.textContent).toContain('Registered (Server Verified)');
    expect(container.textContent).not.toContain('No phone connected');

    // Confirm local focusIntegrityService was synchronized for offline session continuity
    const localDevice = getPairedDevice();
    expect(localDevice).not.toBeNull();
    expect(localDevice.deviceId).toBe('dev_galaxy_s25_001');
    expect(localDevice.deviceAssociationId).toBe('dev_galaxy_s25_001');
    expect(localDevice.deviceName).toBe('Samsung Galaxy S25 Ultra');
  });

  test('2. A device registered after initial component load becomes visible after refresh', async () => {
    // Initial mount: 0 devices
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: []
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('No phone connected');
    expect(container.textContent).not.toContain('Pixel 9 Pro');

    // Server-side pairing happens in background on mobile phone
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_pixel_999',
        deviceName: 'Pixel 9 Pro',
        status: 'active',
        protocolVersion: 1,
        pairedAt: Date.now(),
        lastSeenAt: Date.now()
      }]
    });

    // User clicks the Refresh button in Settings header
    const refreshBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Refresh')
    );
    expect(refreshBtn).toBeDefined();

    await act(async () => {
      refreshBtn.click();
    });

    expect(container.textContent).toContain('Pixel 9 Pro');
    expect(container.textContent).toContain('Registered (Server Verified)');
    expect(container.textContent).not.toContain('No phone connected');
  });

  test('3. A successful empty server response shows empty state honestly without inventing a device', async () => {
    // Pre-populate stale local storage to simulate old browser residue
    setPairedDeviceRecord({
      deviceAssociationId: 'dev_stale_ghost_phone',
      deviceName: 'Phantom Ghost Device'
    });

    // Server says 0 devices
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: []
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('No phone connected');
    expect(container.textContent).not.toContain('Phantom Ghost Device');
    // Stale local device must be cleared
    expect(getPairedDevice()).toBeNull();
  });

  test('4. API / network failure preserves local state as fallback without falsely claiming server verification', async () => {
    // Local device exists in offline cache
    setPairedDeviceRecord({
      deviceAssociationId: 'dev_local_offline_01',
      deviceName: 'Local Offline Phone'
    });

    // Server call fails (e.g. offline or unauthenticated)
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: false,
      error: 'Network error connecting to phone service.'
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    // Device should remain visible as fallback
    expect(container.textContent).toContain('Local Offline Phone');
    // But must NOT be represented as verified
    expect(container.textContent).not.toContain('Registered (Server Verified)');
    expect(container.textContent).toContain('Registered (Local Fallback · Unverified)');
  });

  test('5. Registered status is treated as REGISTERED and not misrepresented as verified ONLINE', async () => {
    const twoHoursAgo = Date.now() - 7200000;
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_galaxy_s25_truth',
        deviceName: 'Galaxy S25 Truth',
        status: 'active',
        lastSeenAt: twoHoursAgo
      }]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Registered (Server Verified)');
    expect(container.textContent).toContain('Last seen 2h ago');
    // The workstation computer card is "Active", but the phone card must NOT be labeled as "Active" or "Online"
    const phoneCard = container.querySelector('[title="dev_galaxy_s25_truth"]')?.closest('.p-4') || container;
    expect(phoneCard.textContent).toContain('Registered');
    expect(phoneCard.textContent).not.toContain('● Active');
  });

  test('6. Multi-device support renders all registered devices without hiding any', async () => {
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [
        {
          deviceId: 'dev_phone_1',
          deviceName: 'Galaxy S25 Primary',
          status: 'active',
          pairedAt: Date.now()
        },
        {
          deviceId: 'dev_tablet_2',
          deviceName: 'Pixel Tablet Secondary',
          status: 'active',
          pairedAt: Date.now()
        }
      ]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Galaxy S25 Primary');
    expect(container.textContent).toContain('Pixel Tablet Secondary');
  });

  test('7. Existing revoke flow calls revokePairedDevice and removes device from display', async () => {
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_revoke_target',
        deviceName: 'Device To Revoke',
        status: 'active',
        pairedAt: Date.now()
      }]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Device To Revoke');

    // Click Manage
    const manageBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Manage'
    );
    expect(manageBtn).toBeDefined();

    await act(async () => {
      manageBtn.click();
    });

    // Manage modal is open, find Revoke Access button
    const revokeBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Revoke Access')
    );
    expect(revokeBtn).toBeDefined();

    await act(async () => {
      revokeBtn.click();
    });

    expect(revokePairedDeviceSpy).toHaveBeenCalledWith('dev_revoke_target');
    expect(container.textContent).not.toContain('Device To Revoke');
    expect(container.textContent).toContain('No phone connected');
  });

  test('8. Pairing modal provides explicit "Check status" button that discovers device', async () => {
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: []
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    // Open pairing modal
    const connectBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Connect Phone'
    );
    expect(connectBtn).toBeDefined();

    await act(async () => {
      connectBtn.click();
    });

    expect(container.textContent).toContain('Connect Android Companion');
    expect(container.textContent).toContain('Check status');

    // Phone completes pairing on backend
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_fresh_pair_01',
        deviceName: 'Companion Phone Fresh',
        status: 'active',
        pairedAt: Date.now()
      }]
    });

    // User clicks "Check status" inside the modal
    const checkStatusBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Check status')
    );
    expect(checkStatusBtn).toBeDefined();

    await act(async () => {
      checkStatusBtn.click();
    });

    // Modal closes upon successful pairing discovery and device appears in Settings
    expect(container.textContent).toContain('Companion Phone Fresh');
    expect(container.textContent).not.toContain('Connect Android Companion');
  });

  test('9. Missing status, pairedAt, and unknown permission state are preserved truthfully without fabricating values', async () => {
    // Calling setPairedDeviceRecord with minimal payload
    const minimalRecord = setPairedDeviceRecord({
      deviceId: 'dev_minimal_truth',
      deviceName: 'Minimal Phone'
    });

    // Invariants: do not fabricate permission status, pairing timestamps, or active status
    expect(minimalRecord.status).toBeNull();
    expect(minimalRecord.pairedAt).toBeNull();
    expect(minimalRecord.hasUsageAccess).toBeNull();
    // Invariant: registered device must not automatically be represented as READY / online
    expect(minimalRecord.state).toBe(COMPANION_STATES.PAIRED);

    // Verify UI rendering in Settings
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_sparse_001',
        deviceName: 'Sparse Device'
        // status, pairedAt, hasUsageAccess omitted
      }]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Sparse Device');

    // Open manage modal to inspect truthful diagnostics
    const manageBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Manage'
    );
    expect(manageBtn).toBeDefined();

    await act(async () => {
      manageBtn.click();
    });

    expect(container.textContent).toContain('PairedUnknown');
    expect(container.textContent).toContain('Usage AccessUnknown');
  });

  test('10. Registered state defaults to COMPANION_STATES.PAIRED and preserves specific states without fabricating READY', () => {
    // Default registration without telemetry activity
    const registeredDevice = setPairedDeviceRecord({
      deviceId: 'dev_paired_only',
      deviceName: 'Unconnected Companion'
    });
    expect(registeredDevice.state).toBe(COMPANION_STATES.PAIRED);
    expect(registeredDevice.state).not.toBe(COMPANION_STATES.READY);
    expect(registeredDevice.state).not.toBe(COMPANION_STATES.SESSION_ACTIVE);

    // Device with revoked status defaults state to REVOKED
    const revokedDevice = setPairedDeviceRecord({
      deviceId: 'dev_revoked_01',
      status: 'revoked'
    });
    expect(revokedDevice.state).toBe(COMPANION_STATES.REVOKED);

    // Device missing usage access defaults state to PERMISSION_NEEDED
    const permissionNeededDevice = setPairedDeviceRecord({
      deviceId: 'dev_no_permission',
      hasUsageAccess: false
    });
    expect(permissionNeededDevice.state).toBe(COMPANION_STATES.PERMISSION_NEEDED);
    expect(permissionNeededDevice.hasUsageAccess).toBe(false);

    // Backward compatibility: isCompanionConnected remains true for valid paired device
    setPairedDeviceRecord({ deviceId: 'dev_compat_test' });
    expect(isCompanionConnected()).toBe(true);
  });

  test('11. Device rename semantics: Server-backed rename is disabled with explicit explanation, local-only rename is supported', async () => {
    // 11A: Server-backed device
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'dev_server_rename_target',
        deviceName: 'Server Phone Original',
        status: 'active'
      }]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    const manageBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Manage'
    );
    await act(async () => {
      manageBtn.click();
    });

    const nameInput = container.querySelector('#manage-device-name-input');
    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Save'
    );

    // Server-backed device must NOT allow rename and must explain why
    expect(nameInput.disabled).toBe(true);
    expect(saveBtn.disabled).toBe(true);
    expect(container.textContent).toContain('Renaming is disabled for server-backed devices');
    expect(container.textContent).toContain('remote name updates are not supported by the phone API');

    // Close modal
    const closeBtn = container.querySelector('button[aria-label="Close device manager"]');
    await act(async () => {
      closeBtn.click();
    });

    // Cleanly unmount before testing independent local fallback component state
    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);

    // 11B: Local fallback device allows local-only rename with explicit explanation
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: false,
      error: 'Offline'
    });
    setPairedDeviceRecord({
      deviceAssociationId: 'dev_local_fallback_target',
      deviceName: 'Old Local Name'
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    const localManageBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Manage'
    );
    await act(async () => {
      localManageBtn.click();
    });

    const localInput = container.querySelector('#manage-device-name-input');
    const localSaveBtn = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Save'
    );

    expect(localInput.disabled).toBe(false);
    expect(localSaveBtn.disabled).toBe(false);
    expect(container.textContent).toContain('Local rename only. Changes apply to this browser workstation only.');

    // Rename local device
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(localInput, 'Renamed Local Device');
      localInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      localSaveBtn.click();
    });

    expect(container.textContent).toContain('Renamed Local Device');
    expect(getPairedDevice().deviceName).toBe('Renamed Local Device');
  });

  test('12. Account isolation: empty response for current account does not erase another account device or damage focus history', async () => {
    // Account A pairs a device and records focus telemetry
    setPairedDeviceRecord({
      deviceId: 'dev_account_a_phone',
      deviceName: 'Alice Phone',
      ownerAccountId: 'usr_account_a'
    }, 'usr_account_a');

    recordFocusTelemetry({
      sessionId: 'session_account_a_001',
      sessionName: 'Calculus Session',
      startedAt: Date.now() - 3600000,
      endedAt: Date.now() - 1800000,
      intendedDurationSeconds: 1800,
      observedSeconds: 1800,
      interruptionCount: 0,
      interruptionSeconds: 0,
      totalDurationSeconds: 1800,
      focusDurationSeconds: 1600,
      distractionDurationSeconds: 200,
      categorySummaries: {},
      events: []
    });

    // Verify telemetry is stored
    expect(getAllFocusTelemetry({ includeAllForTesting: true }).length).toBeGreaterThanOrEqual(1);

    // Mock RoadmapContext with Account B (logged in as Bob)
    const useRoadmapSpy = jest.spyOn(RoadmapContextModule, 'useRoadmap').mockReturnValue({
      account: {
        accountId: 'usr_account_b',
        displayName: 'Bob Learner',
        authProvider: 'google'
      }
    });

    // Account B gets empty response from server
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: []
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    // 1. Bob's UI truthfully shows empty state
    expect(container.textContent).toContain('No phone connected');
    expect(container.textContent).not.toContain('Alice Phone');

    // 2. Alice's device record was NOT erased from storage
    const storedDevice = getPairedDevice();
    expect(storedDevice).not.toBeNull();
    expect(storedDevice.deviceId).toBe('dev_account_a_phone');
    expect(storedDevice.ownerAccountId).toBe('usr_account_a');

    // 3. Focus history was NOT erased or damaged
    const history = getAllFocusTelemetry({ includeAllForTesting: true });
    expect(history.some(t => t.sessionId === 'session_account_a_001')).toBe(true);

    useRoadmapSpy.mockRestore();
  });
});
