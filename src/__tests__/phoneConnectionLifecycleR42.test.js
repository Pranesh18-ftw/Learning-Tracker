/**
 * phoneConnectionLifecycleR42.test.js
 *
 * Dedicated Regression Test Suite for R4.2 Part A — Connection Lifecycle & Authoritative Presence.
 *
 * 10 Required Test Scenarios:
 * 1. Successful pairing.
 * 2. Active browser + active Companion = Connected.
 * 3. Browser closes = connection expires.
 * 4. Companion sleeps = connection expires.
 * 5. Both are inactive = Offline.
 * 6. Website reopening does not resurrect stale Connected status.
 * 7. Companion resume restores presence.
 * 8. Temporary network interruptions recover without re-pairing.
 * 9. Multiple browser tabs behave correctly.
 * 10. Explicit unpairing still removes registration.
 */

import crypto from 'crypto';
import {
  handlePhoneApiRequest
} from '../server/phone/phoneApiRouter';
import {
  createMockPhoneRepository,
  setPhoneRepositoryForTest
} from '../server/phone/phoneDurableRepository';
import {
  setTokenVerifierForTest
} from '../server/phone/phoneAuthenticationService';
import {
  startPairingChallenge,
  completePairingChallenge,
  listOwnerDevices,
  revokeDevice
} from '../server/phone/devicePairingService';
import {
  isCompanionPaired,
  isCompanionConnected,
  getCompanionConnectionState,
  setPairedDeviceRecord,
  clearFocusIntegrityData
} from '../services/focusIntegrityService';

describe('R4.2 PART A — Connection Lifecycle & Authoritative Server Presence', () => {
  let repository;
  const OWNER_UID = 'user_test_presence_owner';

  beforeEach(() => {
    repository = createMockPhoneRepository();
    setPhoneRepositoryForTest(repository);
    setTokenVerifierForTest(async (token) => token ? { uid: OWNER_UID, email: 'test@example.com' } : null);
    clearFocusIntegrityData();
  });

  afterEach(() => {
    setTokenVerifierForTest(null);
    setPhoneRepositoryForTest(null);
    clearFocusIntegrityData();
  });

  // Helper to create web auth header
  function makeWebEvent(method, path, body = null, token = 'valid_token') {
    return {
      httpMethod: method,
      path: `/api/v1/phone${path}`,
      headers: {
        authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : null
    };
  }

  // 1. Successful pairing
  test('1. Successful pairing: device registration exists with valid credentials and initial presence lease', async () => {
    // Web initiates pairing challenge
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    expect(challengeRes.success).toBe(true);
    expect(challengeRes.pairingCode).toBeDefined();

    // Phone completes pairing
    const completeRes = await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test1',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE', 'DISTRACTION', 'UNKNOWN'] }
    }, repository);

    expect(completeRes.success).toBe(true);
    expect(completeRes.deviceId).toBe('dev_galaxy_s25_test1');
    expect(completeRes.deviceToken).toBeDefined();

    // Verify stored device
    const stored = await repository.getDevice('dev_galaxy_s25_test1');
    expect(stored).not.toBeNull();
    expect(stored.status).toBe('active');
    expect(stored.presenceExpiresAt).toBeGreaterThan(Date.now());
  });

  // 2. Active browser + active Companion = Connected
  test('2. Active browser + active Companion = Connected', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test2',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Browser sends presence heartbeat
    await repository.renewBrowserPresence(OWNER_UID, 'tab_main', 60000);
    // Companion sends presence heartbeat
    await repository.renewDevicePresence('dev_galaxy_s25_test2', 75000);

    const listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.success).toBe(true);
    expect(listRes.devices.length).toBe(1);

    const dev = listRes.devices[0];
    expect(dev.status).toBe('active'); // Paired
    expect(dev.deviceOnline).toBe(true);
    expect(dev.browserOnline).toBe(true);
    expect(dev.connectionState).toBe('CONNECTED');
  });

  // 3. Browser closes = connection expires
  test('3. Browser closes = connection expires: Companion active but browser offline results in OFFLINE', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test3',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Browser tab opened then closed
    await repository.renewBrowserPresence(OWNER_UID, 'tab_closing', 60000);
    await repository.renewDevicePresence('dev_galaxy_s25_test3', 75000);

    // Browser tab closes: sends disconnect
    await repository.clearBrowserPresence(OWNER_UID, 'tab_closing');

    const listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices[0];
    expect(dev.status).toBe('active'); // Still paired!
    expect(dev.browserOnline).toBe(false);
    expect(dev.deviceOnline).toBe(true);
    expect(dev.connectionState).toBe('OFFLINE'); // NOT Connected!
  });

  // 4. Companion sleeps = connection expires
  test('4. Companion sleeps = connection expires: Browser active but Companion lease expired results in OFFLINE', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test4',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Browser active
    await repository.renewBrowserPresence(OWNER_UID, 'tab_active', 60000);

    // Companion went to sleep: presence lease expired in the past
    const past = Date.now() - 10000;
    await repository.updateDevice('dev_galaxy_s25_test4', { presenceExpiresAt: past });

    const listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices[0];
    expect(dev.status).toBe('active'); // Still paired!
    expect(dev.browserOnline).toBe(true);
    expect(dev.deviceOnline).toBe(false);
    expect(dev.connectionState).toBe('OFFLINE');
  });

  // 5. Both are inactive = Offline
  test('5. Both are inactive = Offline: device remains paired with valid credentials', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test5',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Both leases expired
    const past = Date.now() - 5000;
    await repository.updateDevice('dev_galaxy_s25_test5', { presenceExpiresAt: past });

    const listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices[0];
    expect(dev.status).toBe('active'); // Paired!
    expect(dev.deviceOnline).toBe(false);
    expect(dev.browserOnline).toBe(false);
    expect(dev.connectionState).toBe('OFFLINE');
  });

  // 6. Website reopening does not resurrect stale Connected status
  test('6. Website reopening does not resurrect stale Connected status', async () => {
    // Phone was previously paired hours ago
    const hoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test6',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    await repository.updateDevice('dev_galaxy_s25_test6', {
      lastSeenAt: hoursAgo,
      presenceExpiresAt: hoursAgo + 75000 // Expired long ago
    });

    // User opens new website tab now
    await repository.renewBrowserPresence(OWNER_UID, 'new_tab_morning', 60000);

    // Fresh query to server
    const listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices[0];
    expect(dev.connectionState).toBe('OFFLINE');
    expect(dev.deviceOnline).toBe(false);

    // Client-side helper check
    setPairedDeviceRecord(dev);
    expect(isCompanionPaired(dev)).toBe(true);
    expect(isCompanionConnected(dev)).toBe(false); // Stale Connected is NOT resurrected!
  });

  // 7. Companion resume restores presence
  test('7. Companion resume restores presence without requiring users to pair again', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    const pairResult = await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test7',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Simulate companion was asleep and expired
    await repository.updateDevice('dev_galaxy_s25_test7', {
      presenceExpiresAt: Date.now() - 1000
    });

    // Browser is open
    await repository.renewBrowserPresence(OWNER_UID, 'tab_main', 60000);

    // Verify it is OFFLINE while sleeping
    let listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.devices[0].connectionState).toBe('OFFLINE');

    // Phone resumes! Companion sends heartbeat / active poll with device token
    const heartbeatEvent = {
      httpMethod: 'POST',
      path: '/api/v1/phone/presence/heartbeat',
      headers: {
        authorization: `Bearer ${pairResult.deviceToken}`
      },
      body: JSON.stringify({ action: 'heartbeat' })
    };

    const hbRes = await handlePhoneApiRequest(heartbeatEvent, repository);
    expect(hbRes.statusCode).toBe(200);

    // Now check status again: restored to CONNECTED!
    listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices[0];
    expect(dev.connectionState).toBe('CONNECTED');
    expect(dev.deviceOnline).toBe(true);
    expect(dev.browserOnline).toBe(true);
  });

  // 8. Temporary network interruptions recover without re-pairing
  test('8. Temporary network interruptions recover without re-pairing', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    const pairResult = await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test8',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Browser is active
    await repository.renewBrowserPresence(OWNER_UID, 'tab_main', 60000);

    // Network hiccup: companion lease momentarily drops past expiration
    await repository.updateDevice('dev_galaxy_s25_test8', {
      presenceExpiresAt: Date.now() - 2000
    });

    let listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.devices[0].connectionState).toBe('OFFLINE');
    expect(listRes.devices[0].status).toBe('active'); // Still paired!

    // Network recovers: companion next poll restores presence
    await repository.renewDevicePresence('dev_galaxy_s25_test8', 75000);

    listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.devices[0].connectionState).toBe('CONNECTED');
    expect(listRes.devices[0].status).toBe('active');
  });

  // 9. Multiple browser tabs behave correctly
  test('9. Multiple browser tabs behave correctly: closing one tab does not disconnect another tab', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test9',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    await repository.renewDevicePresence('dev_galaxy_s25_test9', 75000);

    // User opens Tab A and Tab B
    await repository.renewBrowserPresence(OWNER_UID, 'tab_A', 60000);
    await repository.renewBrowserPresence(OWNER_UID, 'tab_B', 60000);

    expect(await repository.isBrowserOnline(OWNER_UID)).toBe(true);

    // User closes Tab A -> sends disconnect for tab_A only
    await repository.clearBrowserPresence(OWNER_UID, 'tab_A');

    // Tab B is still open, so browser presence remains active!
    expect(await repository.isBrowserOnline(OWNER_UID)).toBe(true);
    let listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.devices[0].connectionState).toBe('CONNECTED');

    // User now closes Tab B -> sends disconnect for tab_B
    await repository.clearBrowserPresence(OWNER_UID, 'tab_B');
    expect(await repository.isBrowserOnline(OWNER_UID)).toBe(false);

    listRes = await listOwnerDevices(OWNER_UID, repository);
    expect(listRes.devices[0].connectionState).toBe('OFFLINE');
  });

  // 10. Explicit unpairing still removes registration
  test('10. Explicit unpairing still removes registration and revokes credentials', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    const pairResult = await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test10',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    await repository.renewBrowserPresence(OWNER_UID, 'tab_main', 60000);
    await repository.renewDevicePresence('dev_galaxy_s25_test10', 75000);

    // Explicit unpair (revocation)
    const revokeRes = await revokeDevice(OWNER_UID, 'dev_galaxy_s25_test10', repository);
    expect(revokeRes.success).toBe(true);

    // Credentials revoked
    const tokenHash = crypto.createHash('sha256').update(pairResult.deviceToken).digest('hex');
    const cred = await repository.getDeviceCredentialByHash(tokenHash);
    expect(cred?.status).toBe('revoked');

    // Query devices: state is UNPAIRED
    const listRes = await listOwnerDevices(OWNER_UID, repository);
    const dev = listRes.devices.find(d => d.deviceId === 'dev_galaxy_s25_test10');
    expect(dev.status).toBe('revoked');
    expect(dev.connectionState).toBe('UNPAIRED');

    // FocusIntegrityService helper verification
    expect(isCompanionPaired(dev)).toBe(false);
    expect(isCompanionConnected(dev)).toBe(false);
    expect(getCompanionConnectionState(dev)).toBe('UNPAIRED');
  });

  // 11. Heartbeat edge cases: beacon disconnect with body authHeader
  test('11. Heartbeat edge cases: beacon disconnect with body authHeader clears browser presence without HTTP Authorization header', async () => {
    // Browser tab connects
    await repository.renewBrowserPresence(OWNER_UID, 'tab_beacon_test', 60000);
    expect(await repository.isBrowserOnline(OWNER_UID)).toBe(true);

    // Browser fires disconnect beacon without Authorization header (e.g. navigator.sendBeacon)
    // but carries the auth token / authHeader in the payload body
    const beaconEvent = {
      httpMethod: 'POST',
      path: '/api/v1/phone/presence/heartbeat',
      headers: {
        'content-type': 'application/json'
        // NOTE: No authorization header!
      },
      body: JSON.stringify({
        clientId: 'tab_beacon_test',
        action: 'disconnect',
        authHeader: 'Bearer valid_token'
      })
    };

    const res = await handlePhoneApiRequest(beaconEvent, repository);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.action).toBe('disconnected');
    expect(body.clientId).toBe('tab_beacon_test');

    // Confirm browser is now marked offline
    const isOnline = await repository.isBrowserOnline(OWNER_UID);
    expect(isOnline).toBe(false);
  });

  // 12. Heartbeat edge cases: explicit companion sendHeartbeat endpoint invocation renews device lease
  test('12. Heartbeat edge cases: companion sendHeartbeat endpoint invocation renews device lease', async () => {
    const challengeRes = await startPairingChallenge(OWNER_UID, repository);
    const pairResult = await completePairingChallenge({
      pairingCode: challengeRes.pairingCode,
      deviceId: 'dev_galaxy_s25_test12',
      deviceName: 'Samsung Galaxy S25',
      protocolVersion: '1.0.0',
      consent: { consentVersion: '1.0.0', categories: ['REFERENCE'] }
    }, repository);

    // Force expire companion presence
    await repository.updateDevice('dev_galaxy_s25_test12', { presenceExpiresAt: Date.now() - 10000 });
    let dev = await repository.getDevice('dev_galaxy_s25_test12');
    expect(dev.presenceExpiresAt).toBeLessThan(Date.now());

    // Companion calls explicit /presence/heartbeat with device token
    const companionHbEvent = {
      httpMethod: 'POST',
      path: '/api/v1/phone/presence/heartbeat',
      headers: {
        authorization: `Bearer ${pairResult.deviceToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ action: 'heartbeat' })
    };

    const res = await handlePhoneApiRequest(companionHbEvent, repository);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.role).toBe('companion');
    expect(body.deviceId).toBe('dev_galaxy_s25_test12');
    expect(body.deviceOnline).toBe(true);

    // Verify lease is now renewed on server
    dev = await repository.getDevice('dev_galaxy_s25_test12');
    expect(dev.presenceExpiresAt).toBeGreaterThan(Date.now());
  });
});
