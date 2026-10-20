# Learning Tracker — Phone Connection v1 (Stage 2A.1)
## Adversarial Security, Concurrency & Data-Integrity Audit Report

---

### 1. Executive Decision
**READY FOR STAGE 2B INTEGRATION — DEPLOYMENT CONFIGURATION REQUIRED FOR PRODUCTION**

All identified **P0 (Critical)** and **P1 (High)** vulnerabilities and concurrency defects have been fixed in the codebase and verified with **593 passing automated tests (100%)**, zero regressions, and an optimized production build. The server contract, transactional boundaries, cryptographic defenses, and reconciliation invariants are secure and ready for the Android companion client implementation (Stage 2B).

> [!IMPORTANT]
> **Audit Reality Gate**: Local automated adversarial testing verifies architectural correctness, concurrency race elimination, and cryptographic defense implementation. However:
> 1. Netlify Functions cloud deployment still requires manual configuration of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
> 2. No live physical Android companion has transmitted telemetry yet (scheduled for Stage 2B).

---

### 2. Security Architecture Reviewed

```
+------------------------------------+          +------------------------------------+
|  Learning Tracker Web Client       |          |    Android Companion (Stage 2B)    |
|  (Local-First React SPA)           |          |    (Kotlin Foreground Tracker)     |
+-----------------+------------------+          +-----------------+------------------+
                  |                                               |
        Firebase ID Token (Bearer)                      Bearer Credential (devtok_...)
                  |                                               |
                  v                                               v
+------------------------------------------------------------------------------------+
|                 Netlify Functions Handler & Security Dispatcher                    |
|                        (netlify/functions/phone.js)                                |
+------------------------------------------------------------------------------------+
|  - Pre-parsing Content-Length Header Guard (<= 64 KB)                             |
|  - Real IP Extraction (x-nf-client-connection-ip) & Anti-Brute-Force Rate Limiting |
|  - Token Verification: Admin SDK verifyIdToken + aud/project isolation             |
|  - Token Credential Hashing: SHA-256 Hashed Index Lookup                           |
|  - Pairing Secrets: Keyed HMAC-SHA256 (Peppered) Anti-Rainbow-Table Storage        |
|  - Atomic Concurrency: Firestore runTransaction on Redemption & Ingestion         |
+-----------------------------------------+------------------------------------------+
                                          |
                              Firebase Admin SDK
                                          |
                                          v
+------------------------------------------------------------------------------------+
|                         Durable Cloud Firestore Storage                            |
|             (Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, etc.)            |
+------------------------------------------------------------------------------------+
```

---

### 3. Audit Findings (Severity & Reproduction)

#### Finding 1 (P0 — Critical): Concurrency Race Condition in Pairing Challenge Redemption (TOCTOU)
- **Component**: `devicePairingService.js` / `phoneDurableRepository.js`
- **Vulnerability**: `completePairingChallenge` performed a non-atomic `getPairingChallengeByHash()` followed by `updatePairingChallenge({ status: 'CONSUMED' })`. Two concurrent requests with the identical pairing code from different devices could both observe `status: 'PENDING'` and simultaneously create two separate active device credentials from a single one-time challenge.
- **Classification**: **P0 (Critical Concurrency & Authentication Defect)**

#### Finding 2 (P0 — Critical): Unsalted SHA-256 Pairing Code Rainbow-Table Vulnerability
- **Component**: `phoneAuthenticationService.js` / `devicePairingService.js`
- **Vulnerability**: 6-digit numeric pairing codes ($10^6$ combinations) were stored as plain SHA-256 hashes (`codeHash = sha256(rawCode)`). If the database or backup snapshots were read or leaked, an attacker could invert all active pairing codes using a ~64 MB precomputed rainbow table in $<50$ milliseconds, allowing unauthorized device pairing before challenge expiration.
- **Classification**: **P0 (Cryptographic Insecurity)**

#### Finding 3 (P1 — High): Online Brute-Force Rate Limiting Bypass via DeviceId Rotation
- **Component**: `devicePairingService.js`
- **Vulnerability**: The rate limit on pairing redemption was keyed solely by client-supplied `deviceId` (`pair_attempt_${deviceId}`). An attacker could cycle `deviceId` per request (`dev_1`, `dev_2`, etc.) and attempt all 1,000,000 pairing codes without triggering the rate limiter. Furthermore, failed attempts did not increment the challenge document's `attemptsCount`.
- **Classification**: **P1 (Authentication Brute-Force Risk)**

#### Finding 4 (P1 — High): Concurrent Submission Conflict Race Condition
- **Component**: `phoneTelemetryService.js` / `phoneDurableRepository.js`
- **Vulnerability**: When checking summary idempotency, `getTelemetrySummary` followed by `saveTelemetrySummary` permitted a race condition where two simultaneous requests with identical `summaryId` but conflicting telemetry payloads could overwrite each other rather than rejecting the conflict with `409 Conflict`.
- **Classification**: **P1 (Data Integrity Defect)**

#### Finding 5 (P1 — High): Dangling Session References on Telemetry Purge
- **Component**: `phoneTelemetryService.js` / `phoneDurableRepository.js`
- **Vulnerability**: `deleteOwnerTelemetry` purged summaries from `phone_telemetry_summaries` but left `reconciledTelemetryId` pointers inside `phone_focus_sessions`, creating dangling pointers and incomplete GDPR/privacy deletions.
- **Classification**: **P1 (Privacy & Referential Integrity Defect)**

#### Finding 6 (P2 — Medium): Missing Token Audience Isolation
- **Component**: `phoneAuthenticationService.js`
- **Vulnerability**: `verifyIdToken` did not explicitly check that the token audience (`decodedToken.aud`) matched `FIREBASE_PROJECT_ID`.
- **Classification**: **P2 (Cross-Project Token Isolation)**

#### Finding 7 (P2 — Medium): Payload Size Only Checked After In-Memory Body Buffering
- **Component**: `phoneApiRouter.js` / `phoneValidation.js`
- **Vulnerability**: 64 KB size limits checked `event.body` string length but did not check `Content-Length` header beforehand.
- **Classification**: **P2 (Resource Exhaustion)**

---

### 4. Fixes Implemented

1. **Transactional Challenge Redemption (`redeemPairingChallengeTransaction`)**:
   - Implemented atomic `db.runTransaction` in `FirestorePhoneRepository` and synchronized transaction handler in `createInMemoryPhoneRepository`.
   - Atomically reads the challenge, verifies `status === 'PENDING'`, verifies `attemptsCount < 5`, checks expiry, increments attempts, updates `status = 'CONSUMED'`, and writes both `phone_devices` and `phone_device_credentials` in a single atomic commit.
   - Eliminates TOCTOU race conditions: concurrent redemption requests fail with `400 INVALID_PAIRING_CODE`.
2. **Keyed HMAC-SHA256 (Peppered) Pairing Code Storage**:
   - Added `hashPairingCode(rawCode, salt)` using server-side secret pepper (`PAIRING_SECRET_PEPPER` / derived server key).
   - Eliminates offline rainbow table attacks: without the server's private pepper, precomputation is impossible.
3. **Dual-Layer Anti-Enumeration & IP Rate Limiting**:
   - Added IP-based rate limiting on `POST /pair/complete` (`pair_attempt_ip_${clientIp}`, max 15 attempts / 5 min).
   - Transactionally increments `attemptsCount` on failed attempts; locks out and expires the challenge after 5 failures (`TOO_MANY_ATTEMPTS`).
4. **Transactional Telemetry Ingestion (`ingestTelemetrySummaryTransaction`)**:
   - Atomically evaluates existing summaries inside a transaction.
   - Matching summary ID with identical payload returns idempotent success (`200 OK`).
   - Matching summary ID with conflicting payload is rejected with `409 CONFLICT`.
5. **Referential Integrity on Telemetry Purge**:
   - Updated `deleteOwnerTelemetry` to delete summary documents and atomically clear `reconciledTelemetryId` and `reconciledAtServer` on the owner's sessions.
6. **Token Audience Isolation**:
   - Added `decodedToken.aud === process.env.FIREBASE_PROJECT_ID` check to `authenticateWebRequest`.
7. **Pre-Parsing Content-Length Header Guard**:
   - Added `validateContentLengthHeader` in `phoneValidation.js` and `phoneApiRouter.js`, rejecting bodies $>64$ KB immediately with `413 Payload Too Large`.

---

### 5. Transactional Integrity Review
- **Pairing Redemption**: Strictly atomic via `redeemPairingChallengeTransaction`.
- **Telemetry Ingestion**: Strictly atomic via `ingestTelemetrySummaryTransaction`.
- **Device Revocation**: Atomically updates device status and batch-invalidates all token records in `phone_device_credentials`.
- **Rate Limiting**: Enforced across serverless instances via Firestore transactions on `phone_rate_limits`.

---

### 6. Pairing-Code Review
- **Format**: 6-digit numeric (or 6–12 alphanumeric with hyphens).
- **Entropy**: Cryptographically secure `crypto.randomInt(100000, 1000000)`.
- **Validity Window**: Exactly 5 minutes (`300000` ms).
- **Attempt Budget**: 5 attempts maximum before permanent challenge expiration.
- **Replay Protection**: Single-use status transition to `CONSUMED` is atomic.
- **Storage**: Keyed HMAC-SHA256 digest with server-only pepper; raw code is never persisted or logged.

---

### 7. Device-Credential Review
- **Entropy**: 32 cryptographically random bytes (`crypto.randomBytes(32)`), formatted as `devtok_<base64url>` (256 bits of entropy).
- **Storage**: Only SHA-256 hashes are persisted in `phone_device_credentials`.
- **Lookup**: Fast indexed lookup by `tokenHash`.
- **Revocation**: Immediately sets `status = 'revoked'` and `revokedAt = Date.now()`. Lookup returns 401.
- **Redaction**: Authorization headers and credentials are never printed to logs or returned in device inventory DTOs.

---

### 8. Session-Correlation Review
- **Lifecycle Relay**: Distinguishes `startedAtClient` vs `startedAtServer` and `endedAtClient` vs `endedAtServer`.
- **Owner Scoping**: Devices poll sessions belonging **only** to their verified owner UID.
- **Truthful Ambiguity**: If multiple active sessions exist concurrently for an owner, `getActiveSessionForDevice` reports `AMBIGUOUS_ACTIVE_SESSIONS` instead of guessing or arbitrarily associating telemetry.

---

### 9. Telemetry Authorization Review
- **Device Verification**: Device must exist and have `status === 'active'`.
- **Owner Binding**: Telemetry `ownerUid` is derived strictly from the device record, not the request payload.
- **Cross-Account Session Isolation**: Referencing a session owned by another UID returns `403 Forbidden (CROSS_ACCOUNT_SESSION)`.
- **Server-Assigned Provenance**: Server assigns `REAL_EXTERNAL_SOURCE` and `receivedAt`. Client provenance claims are discarded.

---

### 10. Reconciliation and Deletion Review
- **Invariant Guarantee**: Late telemetry enriches **only** `companionTelemetry`. It **never** alters session duration, marks tasks complete, or changes roadmap mastery.
- **Window Drift Enforcement**: Telemetry starting $>15$ minutes away from session start is rejected (`WINDOW_DRIFT_EXCEEDED`).
- **Complete Deletion**: `DELETE /api/v1/phone/telemetry` permanently purges all summary records and clears session telemetry references.

---

### 11. Privacy Review
- **Prohibited Data**: Keystrokes, notifications, SMS/messages, passwords, screenshots, clipboard data, and hardware identifiers (IMEI/MAC) are excluded.
- **Payload Bound**: Strictly capped at 64 KB.
- **Package Categorization**: Only package names, approved categories (`reference`, `distraction`, `unknown`), and duration seconds are accepted.

---

### 12. Tests Executed & Exact Results

1. **Adversarial Security Test Suite** (`phoneConnectionStage2aSecurityAdversarial.test.js`):
   - Command: `npm test -- --watchAll=false src/__tests__/phoneConnectionStage2aSecurityAdversarial.test.js`
   - Result: **PASS (8 passed, 8 total)**
2. **Server & Domain Services Test Suite** (`phoneConnectionStage2aServer.test.js`):
   - Command: `npm test -- --watchAll=false src/__tests__/phoneConnectionStage2aServer.test.js`
   - Result: **PASS (27 passed, 27 total)**
3. **Client Integration Test Suite** (`phoneConnectionStage2aClientIntegration.test.js`):
   - Command: `npm test -- --watchAll=false src/__tests__/phoneConnectionStage2aClientIntegration.test.js`
   - Result: **PASS (8 passed, 8 total)**
4. **Full Repository Regression Suite**:
   - Command: `npm test -- --watchAll=false`
   - Result: **PASS (48 test suites passed, 593 tests passed, 0 failures)**

---

### 13. Build Result
- Command: `npm run build`
- Result: **Clean Build (Exit Code 0)**
- Bundle: `main.28134baf.js` (281.14 kB gzip), `main.dd91517f.css` (16.72 kB gzip).

---

### 14. MANUAL ACTIONS REQUIRED

#### A. Required Before Production Deployment
1. **Google Cloud / Firebase Console**:
   - **Console**: Firebase Console > Project Settings > Service Accounts.
   - **Action**: Generate and download a new Private Key JSON.
   - **Reason**: Serverless Admin SDK requires credentials to authenticate to Firestore.
   - **Verification**: Ensure the service account has the *Cloud Datastore User* role.
2. **Netlify Site Dashboard**:
   - **Console**: Netlify Dashboard > Site configuration > Environment variables.
   - **Action**: Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (PEM format with newlines), and mandatory `PAIRING_SECRET_PEPPER`.
   - **Reason**: Enables durable persistence on Netlify Functions and keyed HMAC-SHA256 pairing code protection (server fails closed in production if pepper is missing).
   - **Verification**: Calling `GET /api/v1/phone/status` returns `storageConfigured: true`.

#### B. Required Before Stage 2B Physical-Device Testing
1. **Android Device Settings**:
   - **Settings**: Settings > Apps > Special app access > Usage access.
   - **Action**: Grant "Usage access" to Learning Tracker Companion.
   - **Reason**: Android OS restricts `UsageStatsManager` access unless granted manually.
   - **Verification**: Companion app reports `hasUsageAccess: true` during pairing ceremony.

#### C. Not Required Yet
- Google Play Store licensing or release signing (development and debug builds are sufficient for Stage 2B).

---

### 15. Deployment Configuration Still Missing
- Cloud environment variables on live Netlify host (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). The server responds with `503 STORAGE_UNCONFIGURED` until configured.

---

### 16. Physical-Device Verification Still Missing
- Physical Bluetooth/Wi-Fi communication from a real Android smartphone (deferred to Stage 2B).

---

### 17. Unresolved Risks
- **Clock Drift**: Client timestamps that drift significantly from network time rely on server-side `receivedAt` and `startedAtServer` as the authoritative source of truth.

---

### 18. Decision on Whether Stage 2B Can Proceed
**PROCEED TO STAGE 2B (ANDROID COMPANION IMPLEMENTATION)**

The server contract, cryptographic primitives, race-condition defenses, and transactional persistence are verified. Engineering may proceed to implement the Android Kotlin companion integration.
