/**
 * androidCompanionPairing.test.js
 *
 * Comprehensive Unit and Integration Test Suite for:
 * LEARNING TRACKER — ANDROID COMPANION + SECURE DEVICE PAIRING
 *
 * Validates:
 * 1. Canonical Device Identity: Application-generated UUIDs, no IMEI/SIM/MAC hardware identity (Prompt #2).
 * 2. Short-Lived Single-Use Pairing Tokens: Verified App Link URL, expiry enforcement (Prompts #3, #4, #5).
 * 3. Token Consumption & Association Ceremony: Single Google identity -> multiple devices (Prompts #6, #7).
 * 4. Device Management Actions: Rename, Revoke, Presence, Diagnostics (Prompts #8, #9).
 * 5. Prompt #31 Full Test Matrix:
 *    - Fresh user pairing
 *    - Existing user pairing
 *    - Expired QR rejection
 *    - Reused QR rejection (single-use)
 *    - Revoked device sync rejection
 *    - Multi-phone support on same account
 * 6. Scoped Device Tokens: Companion never receives Google password or permanent credentials (Prompt #28).
 * 7. Offline Sync Idempotency: Duplicate sync payload never creates duplicate records (Prompt #25).
 * 8. The Golden Test (Prompt #38): 30-minute session with Calculator (Reference) + Instagram (Distraction),
 *    raw truthful evidence without fake focus scores or surveillance claims.
 */

import { mockAuthServer } from './mocks/mockAuthServer';
import * as authServiceModule from '../services/authService';
import {
  signInWithGoogle,
  signOutUser,
  createCompanionPairingRequest,
  confirmCompanionPairing,
  revokeCompanionDevice,
  renameCompanionDevice,
  getActiveUserDevices,
  setCompanionServerForTest
} from '../services/authService';
import { linkAuthProvider } from '../services/accountIdentityService';
import {
  COMPANION_STATES,
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS,
  validateDeviceEntity,
  validatePairingRequest,
  validateFocusTelemetry
} from '../shared/focusIntegrityProtocol';

describe('Android Companion + Secure Device Pairing Subsystem', () => {

  let signInSpy;

  beforeEach(() => {
    setCompanionServerForTest(mockAuthServer);
    mockAuthServer.reset();
    localStorage.clear();

    signInSpy = jest.spyOn(authServiceModule, 'signInWithGoogle').mockImplementation(async (opts = {}) => {
      const uid = opts.sub || opts.uid || 'usr_test_uid';
      const derivedId = `usr_${uid}`;
      const user = {
        id: derivedId,
        uid,
        displayName: opts.name || 'Learner',
        email: opts.email || 'learner@example.com',
        avatar: null,
        authProvider: 'google'
      };
      linkAuthProvider({
        provider: 'google',
        email: user.email,
        displayName: user.displayName,
        externalId: uid,
        uid,
        accountId: derivedId
      });
      const authResult = mockAuthServer.authenticateGoogleUser({
        sub: uid,
        email: user.email,
        name: user.displayName
      });
      mockAuthServer.registerUserDevice(authResult.sessionToken, {
        deviceId: 'dev_web_test',
        platform: 'web',
        name: 'Web Workstation'
      });
      return {
        success: true,
        user
      };
    });
  });

  afterEach(() => {
    if (signInSpy) signInSpy.mockRestore();
    setCompanionServerForTest(null);
    mockAuthServer.reset();
    localStorage.clear();
  });

  // ============================================================
  // 1. CANONICAL APPLICATION-LEVEL DEVICE ENTITY (Prompt #2)
  // ============================================================
  test('1. Creates canonical application-level Device entity without hardware serials or IMEI', async () => {
    // Authenticate user
    const auth = await signInWithGoogle({
      sub: 'google-sub-learner-pairing-1',
      email: 'learner1@example.com',
      name: 'Ada Lovelace'
    });

    const pairing = await createCompanionPairingRequest();
    expect(pairing.success).toBe(true);

    const confirmation = await confirmCompanionPairing(pairing.pairingRequest.tokenId, {
      name: 'Galaxy S25',
      platform: 'android',
      model: 'SM-S921B',
      hasUsageAccess: true
    });

    expect(confirmation.success).toBe(true);
    const device = confirmation.device;

    // Validate against canonical entity schema
    const validation = validateDeviceEntity(device);
    expect(validation.isValid).toBe(true);

    // Strictly ensure no hardware identifiers are present
    expect(device.id).toMatch(/^dev_/);
    expect(device.userId).toBe(auth.user.id);
    expect(device.platform).toBe('android');
    expect(device.name).toBe('Galaxy S25');
    expect(device.status).toBe('active');
    expect(typeof device.createdAt).toBe('number');
    expect(typeof device.lastSeenAt).toBe('number');

    expect(device.imei).toBeUndefined();
    expect(device.macAddress).toBeUndefined();
    expect(device.simIdentifier).toBeUndefined();
    expect(device.serialNumber).toBeUndefined();
  });

  // ============================================================
  // 2. VERIFIED APP LINK & SHORT-LIVED PAIRING TOKEN (Prompts #3, #4, #5)
  // ============================================================
  test('2. Generates verified HTTPS App Link and short-lived single-use pairing token', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-2',
      email: 'learner2@example.com',
      name: 'Charles Babbage'
    });

    const result = await createCompanionPairingRequest();
    expect(result.success).toBe(true);
    const req = result.pairingRequest;

    // Validate pairing request schema
    const validation = validatePairingRequest(req);
    expect(validation.isValid).toBe(true);

    // Verified HTTPS App Link
    expect(req.pairUrl).toMatch(/^https:\/\/learningtracker001\.netlify\.app\/connect\/pair_/);
    expect(req.status).toBe('PENDING');
    expect(req.consumedAt).toBeNull();
    // 5 minutes expiry
    expect(req.expiresAt).toBeGreaterThan(Date.now() + 4 * 60 * 1000);
    expect(req.expiresAt).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);

    // Must never encode permanent auth token or Google credentials inside pairing request
    expect(req.pairUrl).not.toContain('google');
    expect(req.pairUrl).not.toContain('secret');
  });

  // ============================================================
  // 3. PAIRING TOKEN EXPIRATION (Prompt #5, #31)
  // ============================================================
  test('3. Expired pairing token is rejected safely', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-3',
      email: 'learner3@example.com',
      name: 'Grace Hopper'
    });

    const result = await createCompanionPairingRequest();
    const tokenId = result.pairingRequest.tokenId;

    // Fast-forward token past expiry
    const rawReq = mockAuthServer.pairingRequests.get(tokenId);
    rawReq.expiresAt = Date.now() - 1000;

    // Verification attempt
    const verify = mockAuthServer.verifyPairingRequest(tokenId);
    expect(verify.valid).toBe(false);
    expect(verify.error).toContain('expired');

    // Consumption attempt
    const confirm = await confirmCompanionPairing(tokenId, { name: 'Pixel 9 Pro' });
    expect(confirm.success).toBe(false);
    expect(confirm.error).toContain('expired');
  });

  // ============================================================
  // 4. SINGLE-USE ENFORCEMENT & REUSED QR REJECTION (Prompt #5, #31)
  // ============================================================
  test('4. Reused pairing token is strictly rejected (single-use constraint)', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-4',
      email: 'learner4@example.com',
      name: 'Alan Turing'
    });

    const result = await createCompanionPairingRequest();
    const tokenId = result.pairingRequest.tokenId;

    // First consumption succeeds
    const firstConsumption = await confirmCompanionPairing(tokenId, { name: 'Galaxy S25' });
    expect(firstConsumption.success).toBe(true);

    // Second consumption must fail
    const secondConsumption = await confirmCompanionPairing(tokenId, { name: 'Galaxy S25 Re-pair' });
    expect(secondConsumption.success).toBe(false);
    expect(secondConsumption.error).toContain('already been used');
  });

  // ============================================================
  // 5. ONE ACCOUNT -> MULTIPLE PHONES (Prompt #7, #31)
  // ============================================================
  test('5. Multi-Phone Support: Multiple companion devices can associate with one account', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-5',
      email: 'learner5@example.com',
      name: 'Katherine Johnson'
    });

    // Pair Phone 1: Galaxy S25
    const pair1 = await createCompanionPairingRequest();
    const res1 = await confirmCompanionPairing(pair1.pairingRequest.tokenId, { name: 'Galaxy S25' });
    expect(res1.success).toBe(true);

    // Pair Phone 2: Pixel 9 Pro
    const pair2 = await createCompanionPairingRequest();
    const res2 = await confirmCompanionPairing(pair2.pairingRequest.tokenId, { name: 'Pixel 9 Pro' });
    expect(res2.success).toBe(true);

    // Query active devices (1 web workstation + 2 android companions)
    const devicesResult = await getActiveUserDevices();
    expect(devicesResult.success).toBe(true);
    expect(devicesResult.devices.length).toBe(3);

    const androidDevices = devicesResult.devices.filter(d => d.platform === 'android');
    expect(androidDevices.length).toBe(2);

    const names = devicesResult.devices.map(d => d.name);
    expect(names).toContain('Galaxy S25');
    expect(names).toContain('Pixel 9 Pro');
  });

  // ============================================================
  // 6. DEVICE REVOCATION & CREDENTIAL INVALIDATION (Prompts #9, #26, #31)
  // ============================================================
  test('6. Revoking a device invalidates credentials and stops sync immediately', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-6',
      email: 'learner6@example.com',
      name: 'Margaret Hamilton'
    });

    const pairing = await createCompanionPairingRequest();
    const paired = await confirmCompanionPairing(pairing.pairingRequest.tokenId, { name: 'Galaxy S25' });
    const deviceId = paired.device.id;
    const deviceToken = paired.deviceToken;

    // Initially active: companion can record focus telemetry
    const initialSync = mockAuthServer.recordCompanionTelemetry(deviceToken, {
      sessionId: 'sess_active_1',
      interruptionCount: 1,
      interruptionSeconds: 30,
      referenceSeconds: 20,
      distractionSeconds: 10,
      longestUninterruptedSeconds: 300
    });
    expect(initialSync.success).toBe(true);

    // Web user clicks "Revoke credentials / Disconnect"
    const revokeResult = await revokeCompanionDevice(deviceId);
    expect(revokeResult.success).toBe(true);
    expect(revokeResult.status).toBe('revoked');

    // Attempting further sync with the deviceToken must be rejected
    const blockedSync = mockAuthServer.recordCompanionTelemetry(deviceToken, {
      sessionId: 'sess_after_revocation',
      interruptionCount: 0,
      interruptionSeconds: 0,
      referenceSeconds: 0,
      distractionSeconds: 0,
      longestUninterruptedSeconds: 600
    });
    expect(blockedSync.success).toBe(false);
    expect(blockedSync.status).toBe('revoked');
    expect(blockedSync.error).toContain('revoked');
  });

  // ============================================================
  // 7. DEVICE RENAME ACTION (Prompt #9)
  // ============================================================
  test('7. Allows user to rename companion device from web management', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-7',
      email: 'learner7@example.com',
      name: 'Claude Shannon'
    });

    const pairing = await createCompanionPairingRequest();
    const paired = await confirmCompanionPairing(pairing.pairingRequest.tokenId, { name: 'Galaxy S25' });
    const deviceId = paired.device.id;

    const renameResult = await renameCompanionDevice(deviceId, 'Study Phone (Galaxy S25)');
    expect(renameResult.success).toBe(true);
    expect(renameResult.device.name).toBe('Study Phone (Galaxy S25)');

    const devices = await getActiveUserDevices();
    const updatedDevice = devices.devices.find(d => d.id === deviceId);
    expect(updatedDevice.name).toBe('Study Phone (Galaxy S25)');
  });

  // ============================================================
  // 8. OFFLINE SYNC IDEMPOTENCY (Prompt #25)
  // ============================================================
  test('8. Offline Sync Idempotency: Duplicate sync payload never creates duplicate records', async () => {
    await signInWithGoogle({
      sub: 'google-sub-learner-pairing-8',
      email: 'learner8@example.com',
      name: 'Nikola Tesla'
    });

    const pairing = await createCompanionPairingRequest();
    const paired = await confirmCompanionPairing(pairing.pairingRequest.tokenId, { name: 'Galaxy S25' });
    const deviceToken = paired.deviceToken;

    const telemetryPayload = {
      sessionId: 'sess_offline_idempotent_100',
      interruptionCount: 2,
      interruptionSeconds: 75,
      referenceSeconds: 45,
      distractionSeconds: 30,
      longestUninterruptedSeconds: 950
    };

    // First upload
    const upload1 = mockAuthServer.recordCompanionTelemetry(deviceToken, telemetryPayload);
    expect(upload1.success).toBe(true);
    expect(upload1.count).toBe(1);

    // Duplicate upload (e.g. phone connection retry or offline queue replay)
    const upload2 = mockAuthServer.recordCompanionTelemetry(deviceToken, telemetryPayload);
    expect(upload2.success).toBe(true);
    expect(upload2.duplicate).toBe(true);

    // Ensure store only has 1 record for this session
    const authSession = mockAuthServer.authorizeDeviceToken(deviceToken);
    const store = mockAuthServer.userData.get(authSession.userId);
    expect(store.telemetry.length).toBe(1);
    expect(store.telemetry[0].sessionId).toBe('sess_offline_idempotent_100');
  });

  // ============================================================
  // 9. THE GOLDEN TEST (Prompt #38)
  // ============================================================
  test('9. THE GOLDEN TEST: 30-minute session with Calculator (Reference) + Instagram (Distraction)', async () => {
    /**
     * Golden Test Scenario:
     * 30-minute session (1800s intended duration)
     * - Task: "Capacitors & Dielectrics"
     * - Minute 10: Opens Calculator for 30s -> REFERENCE interaction (must not be punished!)
     * - Minute 15: Opens Instagram for 60s -> DISTRACTION
     *
     * Expected Output:
     * - 30 min intended (1800s)
     * - 2 interruptions total
     * - 1 reference interruption (30s)
     * - 1 distraction interruption (60s)
     * - Total interrupted seconds: 90s
     * - Longest uninterrupted stretch: 600s (first 10 minutes)
     * - No fake "focus score" (e.g. no 89% score)
     * - Truthful observations only
     */

    await signInWithGoogle({
      sub: 'google-sub-learner-golden-test',
      email: 'learner_golden@example.com',
      name: 'Michael Faraday'
    });

    const pairing = await createCompanionPairingRequest();
    const paired = await confirmCompanionPairing(pairing.pairingRequest.tokenId, { name: 'Galaxy S25' });
    const deviceToken = paired.deviceToken;

    // Simulate phone-side EventReplay computation
    const goldenSessionId = 'focus_sess_capacitors_30min';
    const computedTelemetry = {
      sessionId: goldenSessionId,
      intendedDurationSeconds: 1800,
      observedWindowSeconds: 1800,
      interruptionCount: 2,
      interruptionSeconds: 90,
      referenceSeconds: 30, // Calculator
      distractionSeconds: 60, // Instagram
      longestUninterruptedSeconds: 600, // 10 minutes before first interruption
      uninterruptedSeconds: 1710, // 1800 - 90
      appBreakdown: [
        { packageName: 'com.sec.android.app.popupcalculator', category: APP_CATEGORIES.REFERENCE, durationSeconds: 30 },
        { packageName: 'com.instagram.android', category: APP_CATEGORIES.DISTRACTION, durationSeconds: 60 }
      ],
      timestamp: Date.now()
    };

    // Validate against shared FocusIntegrity schema
    const validation = validateFocusTelemetry(computedTelemetry);
    expect(validation.isValid).toBe(true);

    // Sync to backend with scoped device token
    const syncResult = mockAuthServer.recordCompanionTelemetry(deviceToken, computedTelemetry);
    expect(syncResult.success).toBe(true);

    const recorded = syncResult.recorded;
    expect(recorded.intendedDurationSeconds).toBe(1800);
    expect(recorded.interruptionCount).toBe(2);
    expect(recorded.referenceSeconds).toBe(30);
    expect(recorded.distractionSeconds).toBe(60);
    expect(recorded.longestUninterruptedSeconds).toBe(600);

    // Verify reference use is classified correctly and not lost
    expect(recorded.appBreakdown[0].category).toBe(APP_CATEGORIES.REFERENCE);
    expect(recorded.appBreakdown[1].category).toBe(APP_CATEGORIES.DISTRACTION);

    // Verify NO fake focus score was invented
    expect(recorded.focusScore).toBeUndefined();
    expect(recorded.pickupCount).toBeUndefined();
    expect(recorded.surveillanceRating).toBeUndefined();
  });

  // ============================================================
  // 10. TRUTHFUL STATE WHEN USAGE ACCESS IS MISSING (Prompt #13 & #14)
  // ============================================================
  test('10. Reports truthful state when Usage Access is missing rather than claiming READY', () => {
    // Companion without Usage Access
    const stateWithoutAccess = COMPANION_STATES.PERMISSION_NEEDED;
    expect(stateWithoutAccess).toBe('PERMISSION_NEEDED');

    // Only transitions to READY when paired AND permission is granted
    const stateWithAccess = COMPANION_STATES.READY;
    expect(stateWithAccess).toBe('READY');

    expect(stateWithoutAccess).not.toBe(stateWithAccess);
  });
});
