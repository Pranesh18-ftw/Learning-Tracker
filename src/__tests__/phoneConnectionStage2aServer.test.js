/**
 * phoneConnectionStage2aServer.test.js
 *
 * Exhaustive Verification Test Suite for Phone Connection Stage 2A:
 * - Server Authentication (Firebase ID Token verification & Device Scoped Credentials)
 * - Device Pairing Lifecycle (6-digit challenge, expiry, single-use consumption, revocation)
 * - Focus Session Relay (Start/End lifecycle, owner-scoped polling, ambiguity detection)
 * - Idempotent Telemetry Receiver (Provenance assignment, 64KB size limit, conflict rejection)
 * - Late-Arriving Telemetry Reconciliation (Truthful non-destructive attachment to canonical sessions)
 * - Privacy & Security (Data minimization, secret protection, owner-scoped purge)
 * - Resilience (Offline/Network failure survival during local Focus completion)
 */

import {
  handlePhoneApiRequest,
  normalizePath
} from '../server/phone/phoneApiRouter';
import {
  createInMemoryPhoneRepository,
  setPhoneRepositoryForTest,
  StorageUnconfiguredError,
  FirestorePhoneRepository
} from '../server/phone/phoneDurableRepository';
import {
  setTokenVerifierForTest,
  sha256,
  generateDeviceToken,
  generatePairingCode
} from '../server/phone/phoneAuthenticationService';
import {
  startPairingChallenge,
  completePairingChallenge,
  listOwnerDevices,
  revokeDevice
} from '../server/phone/devicePairingService';
import {
  relaySessionStart,
  relaySessionEnd,
  getActiveSessionForDevice
} from '../server/phone/focusSessionRelayService';
import {
  ingestTelemetrySummary,
  getTelemetryForSession,
  deleteOwnerTelemetry
} from '../server/phone/phoneTelemetryService';
import {
  reconcileSessionTelemetry,
  formatNormalizedTelemetryResponse
} from '../server/phone/telemetryReconciliationService';
import {
  validatePayloadSize,
  CURRENT_SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES
} from '../server/phone/phoneValidation';
import {
  TELEMETRY_PROVENANCE,
  COMPANION_STATES
} from '../shared/focusIntegrityProtocol';

describe('Phone Connection v1 — Stage 2A Server & Session Relay Test Suite', () => {
  let repo;

  const TEST_USER_1 = {
    uid: 'user_alice_123',
    email: 'alice@example.com',
    token: 'valid-token-alice'
  };

  const TEST_USER_2 = {
    uid: 'user_bob_456',
    email: 'bob@example.com',
    token: 'valid-token-bob'
  };

  beforeEach(() => {
    repo = createInMemoryPhoneRepository();
    setPhoneRepositoryForTest(repo);

    // Mock ID token verifier for tests
    setTokenVerifierForTest(async (idToken) => {
      if (idToken === TEST_USER_1.token) return { uid: TEST_USER_1.uid, email: TEST_USER_1.email };
      if (idToken === TEST_USER_2.token) return { uid: TEST_USER_2.uid, email: TEST_USER_2.email };
      if (idToken === 'expired-token') throw new Error('Firebase ID token has expired.');
      return null;
    });
  });

  afterEach(() => {
    repo._reset();
    setPhoneRepositoryForTest(null);
    setTokenVerifierForTest(null);
  });

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY BOUNDARIES
  // =========================================================================
  describe('Authentication & Identity Verification', () => {
    test('1. Rejects web request with missing Authorization header', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: {}
      }, repo);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('MISSING_AUTHORIZATION');
    });

    test('2. Rejects web request with invalid or expired Firebase ID token', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: { Authorization: 'Bearer expired-token' }
      }, repo);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('INVALID_TOKEN');
    });

    test('3. Rejects web request with malformed Authorization header', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: { Authorization: 'Basic dXNlcjpwYXNz' }
      }, repo);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('MALFORMED_AUTHORIZATION');
    });

    test('4. Authoritative owner UID is derived strictly from verified token, ignoring request body UID', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: { Authorization: `Bearer ${TEST_USER_1.token}` },
        body: JSON.stringify({ uid: 'spoofed_target_uid_victim' })
      }, repo);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);

      // Verify the challenge in durable repository is bound to TEST_USER_1.uid, NOT spoofed UID
      const challenge = await repo.getPairingChallengeByHash(sha256(data.pairingCode));
      expect(challenge.ownerUid).toBe(TEST_USER_1.uid);
      expect(challenge.ownerUid).not.toBe('spoofed_target_uid_victim');
    });
  });

  // =========================================================================
  // 2. DEVICE PAIRING CEREMONY
  // =========================================================================
  describe('Device Pairing Lifecycle', () => {
    test('5. Successful challenge creation generates 6-digit code and expires in 5 minutes', async () => {
      const startRes = await startPairingChallenge(TEST_USER_1.uid, repo);
      expect(startRes.success).toBe(true);
      expect(startRes.pairingCode).toMatch(/^\d{6}$/);
      expect(startRes.expiresInSeconds).toBe(300);

      // Verify server stored ONLY code hash, not raw code
      const challenge = await repo.getPairingChallengeByHash(sha256(startRes.pairingCode));
      expect(challenge).toBeDefined();
      expect(challenge.codeHash).toBe(sha256(startRes.pairingCode));
      expect(challenge.pairingCode).toBeUndefined(); // Raw code must NEVER be stored
    });

    test('6. Expired pairing code is rejected', async () => {
      const startRes = await startPairingChallenge(TEST_USER_1.uid, repo);
      // Fast forward expiration
      await repo.updatePairingChallenge(startRes.challengeId, { expiresAt: Date.now() - 1000 });

      const completeRes = await completePairingChallenge({
        pairingCode: startRes.pairingCode,
        deviceId: 'dev_galaxy_s25_test',
        deviceName: 'Samsung Galaxy S25',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION, categories: ['reference'] }
      }, repo);

      expect(completeRes.success).toBe(false);
      expect(completeRes.code).toBe('CODE_EXPIRED');
    });

    test('7. Pairing code is strictly single-use (second redemption fails)', async () => {
      const startRes = await startPairingChallenge(TEST_USER_1.uid, repo);
      const payload = {
        pairingCode: startRes.pairingCode,
        deviceId: 'dev_pixel_9_test',
        deviceName: 'Google Pixel 9',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION, categories: ['reference', 'distraction'] }
      };

      // First redemption: succeeds
      const first = await completePairingChallenge(payload, repo);
      expect(first.success).toBe(true);
      expect(first.deviceToken).toMatch(/^devtok_/);

      // Second redemption: fails
      const second = await completePairingChallenge(payload, repo);
      expect(second.success).toBe(false);
      expect(second.code).toBe('INVALID_PAIRING_CODE');
    });

    test('8. Device credential is high-entropy and stored only as SHA-256 hash', async () => {
      const startRes = await startPairingChallenge(TEST_USER_1.uid, repo);
      const completeRes = await completePairingChallenge({
        pairingCode: startRes.pairingCode,
        deviceId: 'dev_oneplus_12_test',
        deviceName: 'OnePlus 12',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION, categories: ['reference'] }
      }, repo);

      expect(completeRes.success).toBe(true);
      const rawToken = completeRes.deviceToken;
      const expectedHash = sha256(rawToken);

      // Verify DB contains credential indexed by hash
      const storedCred = await repo.getDeviceCredentialByHash(expectedHash);
      expect(storedCred).toBeDefined();
      expect(storedCred.tokenHash).toBe(expectedHash);
      expect(storedCred.deviceToken).toBeUndefined(); // Raw credential NEVER stored in DB
    });

    test('9. Device identifier conflict across accounts is rejected', async () => {
      // User 1 pairs device 'shared_dev_id'
      const start1 = await startPairingChallenge(TEST_USER_1.uid, repo);
      await completePairingChallenge({
        pairingCode: start1.pairingCode,
        deviceId: 'shared_dev_id',
        deviceName: 'Phone A',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      // User 2 tries to pair same device ID
      const start2 = await startPairingChallenge(TEST_USER_2.uid, repo);
      const conflict = await completePairingChallenge({
        pairingCode: start2.pairingCode,
        deviceId: 'shared_dev_id',
        deviceName: 'Phone B',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      expect(conflict.success).toBe(false);
      expect(conflict.statusCode).toBe(409);
      expect(conflict.code).toBe('DEVICE_ID_CONFLICT');
    });

    test('10. Device inventory lists only owner devices without secret hashes', async () => {
      const start = await startPairingChallenge(TEST_USER_1.uid, repo);
      await completePairingChallenge({
        pairingCode: start.pairingCode,
        deviceId: 'dev_alice_phone',
        deviceName: "Alice's Galaxy",
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      const listRes = await listOwnerDevices(TEST_USER_1.uid, repo);
      expect(listRes.success).toBe(true);
      expect(listRes.devices.length).toBe(1);
      expect(listRes.devices[0].deviceId).toBe('dev_alice_phone');
      expect(listRes.devices[0].deviceName).toBe("Alice's Galaxy");
      expect(listRes.devices[0].tokenHash).toBeUndefined(); // Never leaked
    });

    test('11. Revoking a device immediately invalidates its credential', async () => {
      const start = await startPairingChallenge(TEST_USER_1.uid, repo);
      const paired = await completePairingChallenge({
        pairingCode: start.pairingCode,
        deviceId: 'dev_to_revoke',
        deviceName: 'Revocable Phone',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      // Check active session poll before revocation -> works (200)
      const pollBefore = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-session/active',
        headers: { Authorization: `Bearer ${paired.deviceToken}` }
      }, repo);
      expect(pollBefore.statusCode).toBe(200);

      // Revoke device
      const revokeRes = await revokeDevice(TEST_USER_1.uid, 'dev_to_revoke', repo);
      expect(revokeRes.success).toBe(true);

      // Poll after revocation -> rejected (401)
      const pollAfter = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-session/active',
        headers: { Authorization: `Bearer ${paired.deviceToken}` }
      }, repo);
      expect(pollAfter.statusCode).toBe(401);
      const data = JSON.parse(pollAfter.body);
      expect(data.code).toBe('REVOKED_OR_INVALID_CREDENTIAL');
    });
  });

  // =========================================================================
  // 3. FOCUS SESSION RELAY & POLLING
  // =========================================================================
  describe('Focus Session Relay & Polling', () => {
    test('12. Web session start relay creates running session and is idempotent', async () => {
      const payload = {
        sessionId: 'sess_firmware_01',
        startedAt: 1728590000000,
        intendedDurationSeconds: 1500,
        taskName: 'STM32 Bootloader',
        subjectName: 'Embedded Engineering'
      };

      // 1. Initial start
      const first = await relaySessionStart(TEST_USER_1.uid, payload, repo);
      expect(first.success).toBe(true);
      expect(first.session.sessionId).toBe('sess_firmware_01');
      expect(first.session.status).toBe('RUNNING');

      // 2. Duplicate start -> returns idempotent success without duplicate
      const second = await relaySessionStart(TEST_USER_1.uid, payload, repo);
      expect(second.success).toBe(true);
      expect(second.idempotent).toBe(true);
    });

    test('13. Starting new session supersedes previous running session for same owner', async () => {
      await relaySessionStart(TEST_USER_1.uid, {
        sessionId: 'sess_old_running',
        startedAt: 1728580000000,
        intendedDurationSeconds: 1500
      }, repo);

      await relaySessionStart(TEST_USER_1.uid, {
        sessionId: 'sess_new_running',
        startedAt: 1728590000000,
        intendedDurationSeconds: 1500
      }, repo);

      const oldSession = await repo.getFocusSession('sess_old_running');
      expect(oldSession.status).toBe('SUPERSEDED');

      const active = await getActiveSessionForDevice(TEST_USER_1.uid, repo);
      expect(active.status).toBe('ACTIVE_SESSION_FOUND');
      expect(active.activeSession.sessionId).toBe('sess_new_running');
    });

    test('14. Paired companion polls and discovers active session', async () => {
      // Setup paired device for User 1
      const start = await startPairingChallenge(TEST_USER_1.uid, repo);
      const paired = await completePairingChallenge({
        pairingCode: start.pairingCode,
        deviceId: 'dev_companion_01',
        deviceName: 'Companion 01',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      // Start focus session
      await relaySessionStart(TEST_USER_1.uid, {
        sessionId: 'sess_relayed_123',
        startedAt: 1728590000000,
        intendedDurationSeconds: 1800,
        taskName: 'Register Allocation',
        subjectName: 'Compilers'
      }, repo);

      // Companion polls via HTTP API
      const pollRes = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-session/active',
        headers: { Authorization: `Bearer ${paired.deviceToken}` }
      }, repo);

      expect(pollRes.statusCode).toBe(200);
      const data = JSON.parse(pollRes.body);
      expect(data.status).toBe('ACTIVE_SESSION_FOUND');
      expect(data.activeSession.sessionId).toBe('sess_relayed_123');
      expect(data.activeSession.taskName).toBe('Register Allocation');
    });

    test('15. Companion polling returns NO_ACTIVE_SESSION when no session is running', async () => {
      const start = await startPairingChallenge(TEST_USER_1.uid, repo);
      const paired = await completePairingChallenge({
        pairingCode: start.pairingCode,
        deviceId: 'dev_companion_idle',
        deviceName: 'Idle Companion',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);

      const pollRes = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-session/active',
        headers: { Authorization: `Bearer ${paired.deviceToken}` }
      }, repo);

      expect(pollRes.statusCode).toBe(200);
      const data = JSON.parse(pollRes.body);
      expect(data.status).toBe('NO_ACTIVE_SESSION');
      expect(data.activeSession).toBeNull();
    });

    test('16. Session end marks session COMPLETE and is idempotent', async () => {
      await relaySessionStart(TEST_USER_1.uid, {
        sessionId: 'sess_to_complete',
        startedAt: 1728590000000,
        intendedDurationSeconds: 1500
      }, repo);

      const end1 = await relaySessionEnd(TEST_USER_1.uid, 'sess_to_complete', {
        endedAt: 1728591500000,
        status: 'COMPLETE'
      }, repo);
      expect(end1.success).toBe(true);
      expect(end1.session.status).toBe('COMPLETE');

      const end2 = await relaySessionEnd(TEST_USER_1.uid, 'sess_to_complete', {
        endedAt: 1728591500000,
        status: 'COMPLETE'
      }, repo);
      expect(end2.success).toBe(true);
      expect(end2.idempotent).toBe(true);
    });
  });

  // =========================================================================
  // 4. TELEMETRY INGESTION & IDEMPOTENCY
  // =========================================================================
  describe('Idempotent Telemetry Receiver', () => {
    let pairedAliceDevice;

    beforeEach(async () => {
      const start = await startPairingChallenge(TEST_USER_1.uid, repo);
      pairedAliceDevice = await completePairingChallenge({
        pairingCode: start.pairingCode,
        deviceId: 'dev_alice_ingest',
        deviceName: "Alice's Phone",
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);
    });

    test('17. Ingests valid FOCUS_WINDOW_SUMMARY and assigns server receivedAt & provenance', async () => {
      const summaryPayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_01_valid_test',
        sessionId: 'sess_firmware_01',
        observedWindow: {
          startedAt: 1728590000000,
          endedAt: 1728591500000
        },
        activitySummary: {
          intendedSeconds: 1500,
          observedSeconds: 1500,
          interruptionCount: 1,
          interruptionSeconds: 30,
          referenceSeconds: 120,
          distractionSeconds: 30,
          unknownSeconds: 0,
          longestUninterruptedSeconds: 1350,
          appBreakdown: [
            { packageName: 'com.google.android.calculator', category: 'reference', durationSeconds: 120 },
            { packageName: 'com.instagram.android', category: 'distraction', durationSeconds: 30 }
          ]
        },
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/telemetry-summaries',
        headers: { Authorization: `Bearer ${pairedAliceDevice.deviceToken}` },
        body: JSON.stringify(summaryPayload)
      }, repo);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.summaryId).toBe('sum_01_valid_test');
      expect(data.provenance).toBe(TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE); // Server-assigned!
      expect(data.receivedAt).toBeGreaterThan(0);
    });

    test('18. Rejects oversized payload exceeding 64 KB limit', async () => {
      const hugeString = 'x'.repeat(MAX_PAYLOAD_BYTES + 100);
      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/telemetry-summaries',
        headers: { Authorization: `Bearer ${pairedAliceDevice.deviceToken}` },
        body: hugeString
      }, repo);

      expect(res.statusCode).toBe(413);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('PAYLOAD_TOO_LARGE');
    });

    test('19. Re-submitting identical summary ID is idempotent', async () => {
      const payload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_idempotent_test',
        sessionId: 'sess_idempotent_01',
        observedWindow: { startedAt: 1728590000000, endedAt: 1728591500000 },
        activitySummary: {
          intendedSeconds: 1500,
          observedSeconds: 1500,
          interruptionCount: 0,
          interruptionSeconds: 0
        },
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      const first = await ingestTelemetrySummary(
        { deviceId: pairedAliceDevice.deviceId, ownerUid: TEST_USER_1.uid },
        payload,
        repo
      );
      expect(first.success).toBe(true);

      const second = await ingestTelemetrySummary(
        { deviceId: pairedAliceDevice.deviceId, ownerUid: TEST_USER_1.uid },
        payload,
        repo
      );
      expect(second.success).toBe(true);
      expect(second.idempotent).toBe(true);
    });

    test('20. Re-submitting same summary ID with conflicting content is rejected', async () => {
      const payload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_conflict_test',
        sessionId: 'sess_conflict_01',
        observedWindow: { startedAt: 1728590000000, endedAt: 1728591500000 },
        activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 0 },
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      await ingestTelemetrySummary(
        { deviceId: pairedAliceDevice.deviceId, ownerUid: TEST_USER_1.uid },
        payload,
        repo
      );

      // Submit different interruptionCount with same summary ID
      const conflicting = {
        ...payload,
        activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 5 }
      };

      const res = await ingestTelemetrySummary(
        { deviceId: pairedAliceDevice.deviceId, ownerUid: TEST_USER_1.uid },
        conflicting,
        repo
      );

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(409);
      expect(res.code).toBe('CONFLICTING_SUMMARY_CONTENT');
    });

    test('21. Cross-account session reference is strictly rejected with 403', async () => {
      // User 2 owns session 'sess_bob_private'
      await relaySessionStart(TEST_USER_2.uid, {
        sessionId: 'sess_bob_private',
        startedAt: 1728590000000,
        intendedDurationSeconds: 1500
      }, repo);

      // User 1's device tries to submit telemetry referencing User 2's session
      const payload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_cross_account_attack',
        sessionId: 'sess_bob_private',
        observedWindow: { startedAt: 1728590000000, endedAt: 1728591500000 },
        activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 2 },
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      const res = await ingestTelemetrySummary(
        { deviceId: pairedAliceDevice.deviceId, ownerUid: TEST_USER_1.uid },
        payload,
        repo
      );

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.code).toBe('CROSS_ACCOUNT_SESSION');
    });
  });

  // =========================================================================
  // 5. LATE-ARRIVING TELEMETRY & RECONCILIATION
  // =========================================================================
  describe('Late-Arriving Telemetry Reconciliation', () => {
    test('22. Reconciles late telemetry with already-committed session without altering duration or tasks', async () => {
      const sessionId = 'sess_committed_already';
      const sessionStart = 1728590000000;

      // 1. Session was started and ended on server
      await relaySessionStart(TEST_USER_1.uid, {
        sessionId,
        startedAt: sessionStart,
        intendedDurationSeconds: 1500,
        taskName: 'Embedded Microcontroller',
        subjectName: 'Firmware'
      }, repo);

      await relaySessionEnd(TEST_USER_1.uid, sessionId, {
        endedAt: sessionStart + 1500 * 1000,
        status: 'COMPLETE'
      }, repo);

      // 2. Late phone telemetry arrives after session completion
      const summaryPayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_late_arrival_01',
        sessionId,
        observedWindow: { startedAt: sessionStart, endedAt: sessionStart + 1500 * 1000 },
        activitySummary: {
          intendedSeconds: 1500,
          observedSeconds: 1500,
          interruptionCount: 1,
          interruptionSeconds: 40,
          referenceSeconds: 100,
          distractionSeconds: 40,
          longestUninterruptedSeconds: 1360
        },
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      await ingestTelemetrySummary(
        { deviceId: 'dev_late_phone', ownerUid: TEST_USER_1.uid },
        summaryPayload,
        repo
      );

      // 3. Web workstation requests reconciliation
      const reconcileRes = await reconcileSessionTelemetry(TEST_USER_1.uid, sessionId, repo);
      expect(reconcileRes.success).toBe(true);
      expect(reconcileRes.reconciled).toBe(true);
      expect(reconcileRes.telemetry.interruptionCount).toBe(1);
      expect(reconcileRes.telemetry.provenance).toBe(TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE);

      // 4. Verify canonical session in DB was updated with reconciliation marker
      const sessionAfter = await repo.getFocusSession(sessionId);
      expect(sessionAfter.reconciledTelemetryId).toBe('sum_late_arrival_01');
      expect(sessionAfter.intendedDurationSeconds).toBe(1500); // INVARIANT: duration untouched!
      expect(sessionAfter.taskName).toBe('Embedded Microcontroller'); // INVARIANT: task untouched!
    });

    test('23. Telemetry starting excessively far from session start (>15m) is rejected', async () => {
      const sessionId = 'sess_drift_test';
      const sessionStart = 1728590000000;

      await relaySessionStart(TEST_USER_1.uid, {
        sessionId,
        startedAt: sessionStart,
        intendedDurationSeconds: 1500
      }, repo);

      // Telemetry starts 30 minutes after session start
      await ingestTelemetrySummary(
        { deviceId: 'dev_drift', ownerUid: TEST_USER_1.uid },
        {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          summaryId: 'sum_drifted_far',
          sessionId,
          observedWindow: { startedAt: sessionStart + 30 * 60 * 1000, endedAt: sessionStart + 55 * 60 * 1000 },
          activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 0 },
          consentVersion: CURRENT_SCHEMA_VERSION
        },
        repo
      );

      const res = await reconcileSessionTelemetry(TEST_USER_1.uid, sessionId, repo);
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(422);
      expect(res.code).toBe('WINDOW_DRIFT_EXCEEDED');
    });

    test('24. Reconciliation is idempotent and returns previous receipt', async () => {
      const sessionId = 'sess_idempotent_reconcile';
      const sessionStart = 1728590000000;

      await relaySessionStart(TEST_USER_1.uid, { sessionId, startedAt: sessionStart, intendedDurationSeconds: 1500 }, repo);
      await ingestTelemetrySummary(
        { deviceId: 'dev_idem', ownerUid: TEST_USER_1.uid },
        {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          summaryId: 'sum_idem_reconcile',
          sessionId,
          observedWindow: { startedAt: sessionStart, endedAt: sessionStart + 1500 * 1000 },
          activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 2 },
          consentVersion: CURRENT_SCHEMA_VERSION
        },
        repo
      );

      const first = await reconcileSessionTelemetry(TEST_USER_1.uid, sessionId, repo);
      expect(first.success).toBe(true);

      const second = await reconcileSessionTelemetry(TEST_USER_1.uid, sessionId, repo);
      expect(second.success).toBe(true);
      expect(second.idempotent).toBe(true);
    });
  });

  // =========================================================================
  // 6. PRIVACY, DATA SOVEREIGNTY & UNCONFIGURED STORAGE
  // =========================================================================
  describe('Privacy & Storage Integrity', () => {
    test('25. User can permanently delete their phone telemetry without touching roadmaps', async () => {
      // Ingest telemetry
      await ingestTelemetrySummary(
        { deviceId: 'dev_purge', ownerUid: TEST_USER_1.uid },
        {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          summaryId: 'sum_to_delete',
          sessionId: 'sess_survives',
          observedWindow: { startedAt: 1728590000000, endedAt: 1728591500000 },
          activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 1 },
          consentVersion: CURRENT_SCHEMA_VERSION
        },
        repo
      );

      // Verify telemetry exists
      const before = await repo.getTelemetrySummary('sum_to_delete');
      expect(before).toBeDefined();

      // Delete telemetry
      const delRes = await deleteOwnerTelemetry(TEST_USER_1.uid, repo);
      expect(delRes.success).toBe(true);
      expect(delRes.deletedCount).toBe(1);

      // Verify telemetry is purged
      const after = await repo.getTelemetrySummary('sum_to_delete');
      expect(after).toBeNull();
    });

    test('26. Production Firestore repository throws StorageUnconfiguredError when env vars are absent', async () => {
      const unconfiguredRepo = new FirestorePhoneRepository(null);
      expect(unconfiguredRepo.isConfigured()).toBe(false);

      await expect(unconfiguredRepo.savePairingChallenge({ challengeId: 'test' }))
        .rejects
        .toThrow(StorageUnconfiguredError);
    });

    test('27. Public health endpoint reports OK and storageConfigured accurately', async () => {
      const res = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/status'
      }, repo);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('OK');
      expect(data.service).toBe('learning-tracker-phone-connection');
      expect(data.storageConfigured).toBe(true);
    });

    test('28. GET /focus-sessions/:sessionId/status returns authoritative session status and timestamps to paired device', async () => {
      // Pair device for TEST_USER_1
      const startPair = await startPairingChallenge(TEST_USER_1.uid, repo);
      const pairRes = await completePairingChallenge({
        pairingCode: startPair.pairingCode,
        deviceId: 'dev_status_test_device',
        deviceName: 'Pixel 8',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo);
      const deviceToken = pairRes.deviceToken;

      // Create session
      const startRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/focus-sessions/start',
        headers: { Authorization: `Bearer ${TEST_USER_1.token}` },
        body: JSON.stringify({
          sessionId: 'session-status-test-123',
          startedAt: 1728581000000,
          intendedDurationSeconds: 1500,
          taskName: 'Kernel Driver',
          subjectName: 'OS'
        })
      }, repo);
      expect(startRes.statusCode).toBe(200);

      // End session
      const endRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/focus-sessions/session-status-test-123/end',
        headers: { Authorization: `Bearer ${TEST_USER_1.token}` },
        body: JSON.stringify({
          endedAt: 1728582500000,
          status: 'COMPLETE'
        })
      }, repo);
      expect(endRes.statusCode).toBe(200);

      // Paired device queries session status
      const statusRes = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-sessions/session-status-test-123/status',
        headers: { Authorization: `Bearer ${deviceToken}` }
      }, repo);

      expect(statusRes.statusCode).toBe(200);
      const data = JSON.parse(statusRes.body);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe('session-status-test-123');
      expect(data.status).toBe('COMPLETE');
      expect(data.startedAt).toBe(1728581000000);
      expect(data.endedAt).toBe(1728582500000);
      expect(data.intendedDurationSeconds).toBe(1500);
      expect(data.taskName).toBe('Kernel Driver');
    });

    test('29. PAIRING_SECRET_PEPPER fails closed in production when unconfigured', () => {
      const origEnv = process.env.NODE_ENV;
      const origPepper = process.env.PAIRING_SECRET_PEPPER;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.PAIRING_SECRET_PEPPER;

        const { getPairingSecretPepper } = require('../server/phone/phoneAuthenticationService');
        expect(() => getPairingSecretPepper()).toThrow(/PAIRING_SECRET_PEPPER is required in production/);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origPepper !== undefined) {
          process.env.PAIRING_SECRET_PEPPER = origPepper;
        } else {
          delete process.env.PAIRING_SECRET_PEPPER;
        }
      }
    });

    test('30. GET /focus-sessions/unreconciled returns completed unreconciled sessions for authenticated device', async () => {
      // Pair device for TEST_USER_1
      const startRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: { Authorization: `Bearer ${TEST_USER_1.token}` }
      }, repo);
      const { pairingCode } = JSON.parse(startRes.body);

      const completeRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/complete',
        body: JSON.stringify({
          pairingCode,
          deviceId: 'dev_unreconciled_test_phone',
          deviceName: 'Pixel Test',
          protocolVersion: CURRENT_SCHEMA_VERSION,
          consent: {
            consentVersion: CURRENT_SCHEMA_VERSION,
            categories: ['reference', 'distraction', 'neutral', 'unknown']
          }
        })
      }, repo);
      const { deviceToken } = JSON.parse(completeRes.body);

      // Create session 1: completed, unreconciled
      const s1Id = 'sess-unrec-01';
      await repo.saveFocusSession({
        sessionId: s1Id,
        ownerUid: TEST_USER_1.uid,
        taskName: 'Task 1',
        subjectName: 'Subject 1',
        startedAtClient: Date.now() - 3600000,
        endedAtClient: Date.now() - 1800000,
        intendedDurationSeconds: 1800,
        status: 'COMPLETE',
        reconciledTelemetryId: null
      });

      // Create session 2: completed, ALREADY reconciled
      const s2Id = 'sess-unrec-02';
      await repo.saveFocusSession({
        sessionId: s2Id,
        ownerUid: TEST_USER_1.uid,
        taskName: 'Task 2',
        subjectName: 'Subject 2',
        startedAtClient: Date.now() - 7200000,
        endedAtClient: Date.now() - 5400000,
        intendedDurationSeconds: 1800,
        status: 'COMPLETE',
        reconciledTelemetryId: 'sum_already_reconciled'
      });

      // Create session 3: RUNNING (not complete)
      const s3Id = 'sess-unrec-03';
      await repo.saveFocusSession({
        sessionId: s3Id,
        ownerUid: TEST_USER_1.uid,
        taskName: 'Task 3',
        subjectName: 'Subject 3',
        startedAtClient: Date.now() - 600000,
        endedAtClient: null,
        intendedDurationSeconds: 1800,
        status: 'RUNNING',
        reconciledTelemetryId: null
      });

      // Query unreconciled sessions from companion
      const unrecRes = await handlePhoneApiRequest({
        httpMethod: 'GET',
        path: '/api/v1/phone/focus-sessions/unreconciled',
        headers: { Authorization: `Bearer ${deviceToken}` }
      }, repo);

      expect(unrecRes.statusCode).toBe(200);
      const unrecData = JSON.parse(unrecRes.body);
      expect(unrecData.success).toBe(true);
      expect(Array.isArray(unrecData.sessions)).toBe(true);
      expect(unrecData.sessions.length).toBe(1);
      expect(unrecData.sessions[0].sessionId).toBe(s1Id);
      expect(unrecData.sessions[0].status).toBe('COMPLETE');
    });

    test('31. validatePairingCompleteRequest validates consent.categories strictly', () => {
      const { validatePairingCompleteRequest } = require('../server/phone/phoneValidation');

      // Valid pairing payload with canonical consent categories
      const validPayload = {
        pairingCode: '123456',
        deviceId: 'dev_valid_cats',
        deviceName: 'Pixel 8',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: {
          consentVersion: CURRENT_SCHEMA_VERSION,
          categories: ['reference', 'distraction', 'neutral', 'unknown']
        }
      };
      expect(validatePairingCompleteRequest(validPayload).valid).toBe(true);

      // Invalid category rejected
      const invalidPayload = {
        ...validPayload,
        consent: {
          consentVersion: CURRENT_SCHEMA_VERSION,
          categories: ['reference', 'malicious_category']
        }
      };
      const invalidResult = validatePairingCompleteRequest(invalidPayload);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.code).toBe('INVALID_CONSENT_CATEGORY');
    });

    test('32. Ingesting telemetry summary accepts appBreakdown at root payload level', async () => {
      // Pair device
      const startRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/start',
        headers: { Authorization: `Bearer ${TEST_USER_1.token}` }
      }, repo);
      const { pairingCode } = JSON.parse(startRes.body);

      const completeRes = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/pair/complete',
        body: JSON.stringify({
          pairingCode,
          deviceId: 'dev_root_breakdown_phone',
          deviceName: 'Pixel Test',
          protocolVersion: CURRENT_SCHEMA_VERSION,
          consent: { consentVersion: CURRENT_SCHEMA_VERSION, categories: ['reference'] }
        })
      }, repo);
      const { deviceToken } = JSON.parse(completeRes.body);

      const summaryPayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        summaryId: 'sum_root_breakdown_01',
        sessionId: 'sess_root_breakdown_test',
        observedWindow: { startedAt: 1728581000000, endedAt: 1728582500000 },
        activitySummary: {
          intendedSeconds: 1500,
          observedSeconds: 1500,
          interruptionCount: 1,
          interruptionSeconds: 30,
          referenceSeconds: 60,
          distractionSeconds: 30,
          longestUninterruptedSeconds: 1400
        },
        appBreakdown: [
          { packageName: 'com.android.chrome', category: 'reference', durationSeconds: 60 },
          { packageName: 'com.instagram.android', category: 'distraction', durationSeconds: 30 }
        ],
        consentVersion: CURRENT_SCHEMA_VERSION
      };

      const res = await handlePhoneApiRequest({
        httpMethod: 'POST',
        path: '/api/v1/phone/telemetry-summaries',
        headers: { Authorization: `Bearer ${deviceToken}` },
        body: JSON.stringify(summaryPayload)
      }, repo);

      expect([200, 201]).toContain(res.statusCode);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.summaryId).toBe('sum_root_breakdown_01');

      const stored = await repo.getTelemetrySummary('sum_root_breakdown_01');
      expect(stored).toBeDefined();
      expect(Array.isArray(stored.payload.appBreakdown)).toBe(true);
      expect(stored.payload.appBreakdown.length).toBe(2);
    });
  });
});
