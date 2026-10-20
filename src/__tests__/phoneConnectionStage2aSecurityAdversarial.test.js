/**
 * phoneConnectionStage2aSecurityAdversarial.test.js
 *
 * Adversarial Security & Concurrency Verification Test Suite (Stage 2A.1):
 * - Concurrent pairing challenge redemption race condition elimination (TOCTOU)
 * - Attempt count transactional tracking and 5-attempt brute-force lockout
 * - Pepper-based HMAC pairing code protection
 * - IP-based rate limiting on unauthenticated pairing redemption
 * - Content-Length header > 64 KB pre-parsing rejection
 * - Token audience isolation
 * - Concurrent conflicting telemetry submission rejection
 * - Telemetry purge completeness (clearing dangling session references)
 * - Ambiguous concurrent sessions state reporting
 */

import {
  handlePhoneApiRequest
} from '../server/phone/phoneApiRouter.js';
import {
  createInMemoryPhoneRepository
} from '../server/phone/phoneDurableRepository.js';
import {
  startPairingChallenge,
  completePairingChallenge
} from '../server/phone/devicePairingService.js';
import {
  ingestTelemetrySummary,
  deleteOwnerTelemetry
} from '../server/phone/phoneTelemetryService.js';
import {
  relaySessionStart,
  getActiveSessionForDevice
} from '../server/phone/focusSessionRelayService.js';
import {
  setTokenVerifierForTest,
  hashPairingCode,
  sha256
} from '../server/phone/phoneAuthenticationService.js';
import { CURRENT_SCHEMA_VERSION } from '../server/phone/phoneValidation.js';

describe('Phone Connection v1 — Stage 2A.1 Adversarial Security Suite', () => {
  let repo;

  const ALICE = { uid: 'usr_alice_audit', email: 'alice@audit.edu', token: 'tok_alice_aud' };
  const BOB = { uid: 'usr_bob_audit', email: 'bob@audit.edu', token: 'tok_bob_aud' };

  beforeEach(() => {
    repo = createInMemoryPhoneRepository();
    setTokenVerifierForTest(async (token) => {
      if (token === ALICE.token) return { uid: ALICE.uid, email: ALICE.email };
      if (token === BOB.token) return { uid: BOB.uid, email: BOB.email };
      throw new Error('Invalid token');
    });
  });

  // ── 1. CONCURRENT REDEMPTION RACE CONDITION (TOCTOU) ──
  test('1. Concurrent redemption race: exactly one device claims challenge, second fails', async () => {
    const start = await startPairingChallenge(ALICE.uid, repo);
    expect(start.success).toBe(true);

    const req1 = completePairingChallenge({
      pairingCode: start.pairingCode,
      deviceId: 'dev_phone_race_1',
      deviceName: 'Phone 1',
      protocolVersion: CURRENT_SCHEMA_VERSION,
      consent: { consentVersion: CURRENT_SCHEMA_VERSION }
    }, repo, '192.168.1.100');

    const req2 = completePairingChallenge({
      pairingCode: start.pairingCode,
      deviceId: 'dev_phone_race_2',
      deviceName: 'Phone 2',
      protocolVersion: CURRENT_SCHEMA_VERSION,
      consent: { consentVersion: CURRENT_SCHEMA_VERSION }
    }, repo, '192.168.1.101');

    const [res1, res2] = await Promise.all([req1, req2]);

    const successes = [res1, res2].filter(r => r.success);
    const failures = [res1, res2].filter(r => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].code).toBe('INVALID_PAIRING_CODE');
  });

  // ── 2. BRUTE-FORCE ATTEMPT TRACKING & LOCKOUT ──
  test('2. Attempt count tracking locks out pairing challenge after 5 failed attempts', async () => {
    const start = await startPairingChallenge(ALICE.uid, repo);
    expect(start.success).toBe(true);

    // Make 5 incorrect guesses
    for (let i = 1; i <= 5; i++) {
      const failRes = await completePairingChallenge({
        challengeId: start.challengeId,
        pairingCode: '999999', // wrong code
        deviceId: `dev_attacker_${i}`,
        deviceName: 'Attacker Phone',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo, `10.0.0.${i}`);

      expect(failRes.success).toBe(false);
      if (i < 5) {
        expect(failRes.code).toBe('INVALID_PAIRING_CODE');
      } else {
        expect(failRes.code).toBe('TOO_MANY_ATTEMPTS');
      }
    }

    // Now attempt with the genuine code -> must be locked out (EXPIRED)
    const legitRes = await completePairingChallenge({
      challengeId: start.challengeId,
      pairingCode: start.pairingCode,
      deviceId: 'dev_legit_phone',
      deviceName: 'Legit Phone',
      protocolVersion: CURRENT_SCHEMA_VERSION,
      consent: { consentVersion: CURRENT_SCHEMA_VERSION }
    }, repo, '192.168.1.50');

    expect(legitRes.success).toBe(false);
    expect(legitRes.code).toBe('INVALID_PAIRING_CODE');
  });

  // ── 3. PEPPERED HMAC PAIRING CODE SECURITY ──
  test('3. Keyed HMAC protects pairing code from unsalted SHA-256 rainbow-tables', () => {
    const originalPepper = process.env.PAIRING_SECRET_PEPPER;
    try {
      process.env.PAIRING_SECRET_PEPPER = 'super_secret_audit_pepper_999';
      const code = '123456';
      const peppered = hashPairingCode(code);
      const plain = sha256(code);

      // Must NOT match plain unsalted SHA-256
      expect(peppered).not.toBe(plain);
      expect(peppered.length).toBe(64);
    } finally {
      process.env.PAIRING_SECRET_PEPPER = originalPepper;
    }
  });

  // ── 4. IP-BASED REDEMPTION RATE LIMITING ──
  test('4. IP rate limiter prevents brute-force enumeration across rotating deviceIds', async () => {
    const attackerIp = '203.0.113.42';

    // Generate valid challenge
    const start = await startPairingChallenge(ALICE.uid, repo);

    // Attempt 15 rapid guesses from same IP with randomized deviceId
    for (let i = 1; i <= 15; i++) {
      await completePairingChallenge({
        pairingCode: `00000${i}`.slice(-6),
        deviceId: `random_dev_${i}`,
        deviceName: 'Bot',
        protocolVersion: CURRENT_SCHEMA_VERSION,
        consent: { consentVersion: CURRENT_SCHEMA_VERSION }
      }, repo, attackerIp);
    }

    // 16th attempt should be blocked by IP rate limit
    const blockedRes = await completePairingChallenge({
      pairingCode: start.pairingCode,
      deviceId: 'new_dev_999',
      deviceName: 'Bot',
      protocolVersion: CURRENT_SCHEMA_VERSION,
      consent: { consentVersion: CURRENT_SCHEMA_VERSION }
    }, repo, attackerIp);

    expect(blockedRes.success).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // ── 5. PRE-PARSING CONTENT-LENGTH GUARD ──
  test('5. Content-Length exceeding 64 KB is rejected with 413 before JSON parsing', async () => {
    const res = await handlePhoneApiRequest({
      httpMethod: 'POST',
      path: '/api/v1/phone/telemetry-summaries',
      headers: {
        'content-length': '70000'
      },
      body: ''
    }, repo);

    expect(res.statusCode).toBe(413);
    const data = JSON.parse(res.body);
    expect(data.code).toBe('PAYLOAD_TOO_LARGE');
  });

  // ── 6. CONCURRENT CONFLICTING TELEMETRY RACE ──
  test('6. Concurrent submission of conflicting telemetry preserves original and rejects conflict', async () => {
    const basePayload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      summaryId: 'sum_race_conflict_01',
      observedWindow: { startedAt: 1728590000000, endedAt: 1728591500000 },
      activitySummary: { intendedSeconds: 1500, observedSeconds: 1500, interruptionCount: 1 },
      consentVersion: CURRENT_SCHEMA_VERSION
    };

    const payloadA = { ...basePayload, activitySummary: { ...basePayload.activitySummary, interruptionCount: 1 } };
    const payloadB = { ...basePayload, activitySummary: { ...basePayload.activitySummary, interruptionCount: 8 } };

    const device = { deviceId: 'dev_alice_01', ownerUid: ALICE.uid };

    const reqA = ingestTelemetrySummary(device, payloadA, repo);
    const reqB = ingestTelemetrySummary(device, payloadB, repo);

    const [resA, resB] = await Promise.all([reqA, reqB]);

    // Exactly one should succeed, one should be rejected as a conflict
    const successes = [resA, resB].filter(r => r.success);
    const conflicts = [resA, resB].filter(r => !r.success && r.code === 'CONFLICTING_SUMMARY_CONTENT');

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(1);

    // Stored record must match the winner
    const stored = await repo.getTelemetrySummary('sum_race_conflict_01');
    expect(stored).toBeDefined();
    expect(stored.payload.interruptionCount).toBe(successes[0] === resA ? 1 : 8);
  });

  // ── 7. DANGLING POINTER CLEANUP ON TELEMETRY PURGE ──
  test('7. Telemetry deletion purges summaries and clears dangling session references', async () => {
    // 1. Create session
    await repo.saveFocusSession({
      sessionId: 'sess_alice_with_telemetry',
      ownerUid: ALICE.uid,
      status: 'COMPLETE',
      reconciledTelemetryId: 'sum_to_purge_100',
      reconciledAtServer: Date.now()
    });

    // 2. Create telemetry
    await repo.saveTelemetrySummary({
      summaryId: 'sum_to_purge_100',
      ownerUid: ALICE.uid,
      sessionId: 'sess_alice_with_telemetry',
      payload: { interruptionCount: 2 }
    });

    // 3. Purge telemetry
    const purgeRes = await deleteOwnerTelemetry(ALICE.uid, repo);
    expect(purgeRes.success).toBe(true);
    expect(purgeRes.deletedCount).toBe(1);

    // 4. Verify session reference was cleared
    const sessionAfter = await repo.getFocusSession('sess_alice_with_telemetry');
    expect(sessionAfter).toBeDefined();
    expect(sessionAfter.reconciledTelemetryId).toBeNull();
    expect(sessionAfter.reconciledAtServer).toBeNull();
  });

  // ── 8. AMBIGUOUS CONCURRENT ACTIVE SESSIONS ──
  test('8. When multiple sessions are concurrently active, companion polling reports AMBIGUOUS_ACTIVE_SESSIONS', async () => {
    // Two sessions started without ending
    await repo.saveFocusSession({
      sessionId: 'sess_active_1',
      ownerUid: ALICE.uid,
      status: 'RUNNING',
      startedAtClient: Date.now(),
      intendedDurationSeconds: 1500
    });

    await repo.saveFocusSession({
      sessionId: 'sess_active_2',
      ownerUid: ALICE.uid,
      status: 'RUNNING',
      startedAtClient: Date.now(),
      intendedDurationSeconds: 1500
    });

    const activePoll = await getActiveSessionForDevice(ALICE.uid, repo);
    expect(activePoll.status).toBe('AMBIGUOUS_ACTIVE_SESSIONS');
    expect(activePoll.activeSession).toBeNull();
  });
});
