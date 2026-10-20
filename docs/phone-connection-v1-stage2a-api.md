# Learning Tracker — Phone Connection v1 (Stage 2A)
## Secure Receiver, Device Pairing, Focus Session Relay & Durable Telemetry Specification

### 1. Architectural Overview

The Learning Tracker Phone Connection architecture provides a secure, serverless bridge between the local-first web application and a companion Android device.

```
+------------------------------------+          +------------------------------------+
|  Learning Tracker Web Client       |          |    Android Companion (Stage 2B)    |
|  (Local-First React SPA)           |          |    (Kotlin Foreground Tracker)     |
+-----------------+------------------+          +-----------------+------------------+
                  |                                               |
        Firebase ID Token (Bearer)                      Device Credential (devtok_...)
                  |                                               |
                  v                                               v
+------------------------------------------------------------------------------------+
|                       Netlify Functions Serverless Backend                         |
|                     (/api/v1/phone/* -> netlify/functions/phone.js)                |
+------------------------------------------------------------------------------------+
|  - Authentication & Authorization (Firebase Admin verifyIdToken / SHA-256 Lookup)  |
|  - Input Validation (64 KB bounds, schema 1.0.0, timestamp monotonic order)       |
|  - Domain Services (Pairing, Session Relay, Telemetry Ingestion, Reconciliation)   |
|  - Atomic Transactions & Anti-Enumeration / Anti-Abuse Guards                      |
+-----------------------------------------+------------------------------------------+
                                          |
                      Admin SDK (Bypasses Client Firestore Rules)
                                          |
                                          v
+------------------------------------------------------------------------------------+
|                         Durable Cloud Firestore Storage                            |
|             (Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, etc.)            |
+------------------------------------------------------------------------------------+
```

#### Architectural Invariants
1. **Local-First Learner Sovereignty**: Network or serverless failures **never** block or abort local Focus sessions or roadmap completions.
2. **Authoritative Server Identity**: Web users are identified strictly by verified Firebase ID tokens (extracting the authoritative `uid`). Client-supplied UIDs in request bodies are ignored.
3. **High-Entropy Hashed Device Credentials**: Companion devices authenticate via random 32-byte bearer tokens (`devtok_...`). Only their SHA-256 cryptographic hashes are stored durably. Raw credentials cannot be retrieved by the server once issued.
4. **Honest Unconfigured State**: If Firebase Admin credentials or Firestore are unconfigured in production, endpoints immediately return `503 SERVICE_UNAVAILABLE` with `STORAGE_UNCONFIGURED`. The server **never** silently falls back to in-memory dictionaries or browser `localStorage`.
5. **Strict Telemetry Enrichment Invariant**: Late-arriving phone telemetry enriches **only** the `companionTelemetry` property of a Focus session. It is mathematically forbidden from altering `durationMinutes`, marking tasks complete, changing roadmap mastery, or manufacturing evidence.

---

### 2. Durable Storage Schema (Cloud Firestore)

When durable persistence is configured, the serverless backend accesses Cloud Firestore exclusively via the Firebase Admin SDK using the following root collections:

#### Collection: `phone_pairing_challenges`
- **Document ID**: `challengeId` (`pch_${timestamp}_${hex}`)
- **Fields**:
  - `challengeId`: `string`
  - `ownerUid`: `string` (authoritative Firebase UID)
  - `pairingCodeHash`: `string` (SHA-256 hash of 6-digit code)
  - `createdAt`: `number` (epoch ms)
  - `expiresAt`: `number` (epoch ms, exactly 5 minutes from creation)
  - `status`: `'PENDING' | 'CONSUMED' | 'EXPIRED' | 'REVOKED'`
  - `attempts`: `number` (max 5 attempts allowed before invalidation)
  - `consumedAt`: `number | null`
  - `consumedByDeviceId`: `string | null`

#### Collection: `phone_devices`
- **Document ID**: `deviceId` (`dev_${random}`)
- **Fields**:
  - `deviceId`: `string`
  - `ownerUid`: `string`
  - `deviceName`: `string` (sanitized, max 64 chars)
  - `model`: `string` (max 64 chars)
  - `protocolVersion`: `string` (e.g. `'1.0.0'`)
  - `consentVersion`: `string` (e.g. `'1.0.0'`)
  - `status`: `'ACTIVE' | 'REVOKED'`
  - `pairedAt`: `number` (epoch ms)
  - `lastActiveAt`: `number` (epoch ms)
  - `revokedAt`: `number | null`

#### Collection: `phone_device_tokens`
- **Document ID**: `tokenHash` (SHA-256 hash of bearer token `devtok_...`)
- **Fields**:
  - `tokenHash`: `string`
  - `deviceId`: `string`
  - `ownerUid`: `string`
  - `createdAt`: `number` (epoch ms)
  - `revoked`: `boolean`
  - `revokedAt`: `number | null`

#### Collection: `phone_focus_sessions`
- **Document ID**: `sessionId` (Canonical session ID from web client)
- **Fields**:
  - `sessionId`: `string`
  - `ownerUid`: `string`
  - `taskName`: `string`
  - `subjectName`: `string`
  - `clientStartedAt`: `number` (client timestamp)
  - `serverStartedAt`: `number` (receipt timestamp)
  - `intendedDurationSeconds`: `number`
  - `status`: `'RUNNING' | 'COMPLETE' | 'CANCELLED'`
  - `clientEndedAt`: `number | null`
  - `serverEndedAt`: `number | null`
  - `updatedAt`: `number`

#### Collection: `phone_telemetry_summaries`
- **Document ID**: `summaryId` (Stable UUID from companion device)
- **Fields**:
  - `summaryId`: `string`
  - `ownerUid`: `string`
  - `deviceId`: `string`
  - `sessionId`: `string`
  - `schemaVersion`: `'1.0.0'`
  - `receivedAt`: `number` (server timestamp)
  - `provenance`: `'REAL_EXTERNAL_SOURCE'`
  - `observedWindow`: `{ startedAt: number, endedAt: number }`
  - `activitySummary`: `{ interruptionCount, interruptionSeconds, referenceSeconds, distractionSeconds, longestUninterruptedSeconds }`
  - `appBreakdown`: `Array<{ packageName, category, durationSeconds }>`
  - `consentVersion`: `string`
  - `reconciledWithSession`: `boolean`
  - `reconciledAt`: `number | null`

---

### 3. API Endpoints Specification

Base Path: `/api/v1/phone`

#### 3.1 `POST /pair/start`
- **Description**: Generates a short-lived 6-digit pairing challenge for the authenticated web user.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**: None (or optional `{}`)
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "challengeId": "pch_1728581000000_a1b2c3d4",
    "pairingCode": "489123",
    "expiresAt": 1728581300000,
    "expiresInSeconds": 300
  }
  ```
- **Error Codes**:
  - `401 AUTH_REQUIRED`: Missing or invalid Firebase ID token.
  - `503 STORAGE_UNCONFIGURED`: Cloud storage backend credentials missing.

#### 3.2 `POST /pair/complete`
- **Description**: Redeems a pairing challenge from the Android companion device, returning a high-entropy device credential.
- **Authentication**: Public (pairing code acts as short-lived single-use secret).
- **Request Body**:
  ```json
  {
    "pairingCode": "489123",
    "deviceId": "dev_phone_abc12345",
    "deviceName": "Pixel 8 Pro",
    "model": "Google Pixel 8 Pro",
    "protocolVersion": "1.0.0",
    "consentVersion": "1.0.0"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "deviceId": "dev_phone_abc12345",
    "deviceCredential": "devtok_9f83b2...[high entropy 64 hex chars]",
    "protocolVersion": "1.0.0"
  }
  ```
- **Error Codes**:
  - `400 INVALID_REQUEST`: Malformed request, invalid 6-digit code format, or missing consent.
  - `401 CHALLENGE_NOT_FOUND` / `CHALLENGE_EXPIRED` / `CHALLENGE_ALREADY_USED` / `TOO_MANY_ATTEMPTS`: Code failure.
  - `409 DEVICE_ID_CONFLICT`: Device ID is already registered to another user account.

#### 3.3 `GET /devices`
- **Description**: Lists all registered companion devices for the authenticated web user.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "devices": [
      {
        "deviceId": "dev_phone_abc12345",
        "deviceName": "Pixel 8 Pro",
        "model": "Google Pixel 8 Pro",
        "status": "ACTIVE",
        "pairedAt": 1728581000000,
        "lastActiveAt": 1728582000000
      }
    ]
  }
  ```

#### 3.4 `DELETE /devices/:deviceId`
- **Description**: Revokes a paired device. Immediately invalidates device credential lookup.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "deviceId": "dev_phone_abc12345",
    "revoked": true
  }
  ```
- **Error Codes**:
  - `403 FORBIDDEN`: Device does not belong to the authenticated owner.
  - `404 NOT_FOUND`: Device ID does not exist.

#### 3.5 `POST /focus-sessions/start`
- **Description**: Relays the start of a Focus session from the web browser to the server.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "sessionId": "session-1728581000-xyz",
    "startedAt": 1728581000000,
    "intendedDurationSeconds": 1500,
    "taskName": "Implement SPI Bus Driver",
    "subjectName": "Embedded Systems"
  }
  ```
- **Response `200 OK` / `201 Created`**:
  ```json
  {
    "success": true,
    "session": {
      "sessionId": "session-1728581000-xyz",
      "status": "RUNNING",
      "serverStartedAt": 1728581000120
    }
  }
  ```

#### 3.6 `POST /focus-sessions/:sessionId/end`
- **Description**: Relays the completion or cancellation of a Focus session from the web browser.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**:
  ```json
  {
    "endedAt": 1728582500000,
    "status": "COMPLETE"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "session": {
      "sessionId": "session-1728581000-xyz",
      "status": "COMPLETE",
      "serverEndedAt": 1728582500150
    }
  }
  ```

#### 3.7 `GET /focus-session/active`
- **Description**: Polling endpoint for the paired Android companion to discover running session state.
- **Authentication**: `Authorization: Bearer devtok_...`
- **Response `200 OK` (Active Session Found)**:
  ```json
  {
    "status": "ACTIVE_SESSION",
    "session": {
      "sessionId": "session-1728581000-xyz",
      "protocolVersion": "1.0.0",
      "taskName": "Implement SPI Bus Driver",
      "subjectName": "Embedded Systems",
      "startedAt": 1728581000000,
      "intendedDurationSeconds": 1500
    },
    "serverTime": 1728581005000
  }
  ```
- **Response `200 OK` (No Active Session)**:
  ```json
  {
    "status": "NO_ACTIVE_SESSION",
    "session": null,
    "serverTime": 1728581005000
  }
  ```

#### 3.7b `GET /focus-sessions/:sessionId/status`
- **Description**: Retrieves authoritative session status and start/end timestamps. Authenticated for paired companion devices and web owners to reliably discover session completion or cancellation without guessing.
- **Authentication**: `Authorization: Bearer devtok_...` or `Authorization: Bearer <Firebase_ID_Token>`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "sessionId": "session-1728581000-xyz",
    "status": "COMPLETE",
    "startedAt": 1728581000000,
    "endedAt": 1728582500000,
    "serverStartedAt": 1728581000120,
    "serverEndedAt": 1728582500150,
    "intendedDurationSeconds": 1500,
    "taskName": "Implement SPI Bus Driver",
    "subjectName": "Embedded Systems"
  }
  ```
- **Error Codes**:
  - `401 UNAUTHORIZED`: Invalid or revoked device credential or ID token.
  - `404 SESSION_NOT_FOUND`: Session does not exist or does not belong to the authenticated owner.


#### 3.8 `POST /telemetry-summaries`
- **Description**: Ingests a `FOCUS_WINDOW_SUMMARY` from the authenticated Android companion.
- **Authentication**: `Authorization: Bearer devtok_...`
- **Payload Bounds**: Max 64 KB JSON payload.
- **Request Body**:
  ```json
  {
    "schemaVersion": "1.0.0",
    "summaryId": "sum_550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "dev_phone_abc12345",
    "sessionId": "session-1728581000-xyz",
    "observedWindow": {
      "startedAt": 1728581000000,
      "endedAt": 1728582500000
    },
    "activitySummary": {
      "interruptionCount": 2,
      "interruptionSeconds": 45,
      "referenceSeconds": 180,
      "distractionSeconds": 45,
      "longestUninterruptedSeconds": 1275
    },
    "appBreakdown": [
      {
        "packageName": "com.android.chrome",
        "category": "REFERENCE",
        "durationSeconds": 180
      },
      {
        "packageName": "com.instagram.android",
        "category": "DISTRACTION",
        "durationSeconds": 45
      }
    ],
    "consentVersion": "1.0.0"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "summaryId": "sum_550e8400-e29b-41d4-a716-446655440000",
    "receivedAt": 1728582502000,
    "provenance": "REAL_EXTERNAL_SOURCE",
    "status": "ACCEPTED"
  }
  ```
- **Idempotency**: Submitting the identical payload with the same `summaryId` returns `200 OK` with the existing receipt. Submitting conflicting payload content with an existing `summaryId` returns `409 CONFLICT`.

#### 3.9 `GET /focus-sessions/:sessionId/telemetry`
- **Description**: Allows the web client to retrieve accepted telemetry for reconciliation.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "sessionId": "session-1728581000-xyz",
    "telemetry": {
      "id": "telem-session-1728581000-xyz",
      "summaryId": "sum_550e8400-e29b-41d4-a716-446655440000",
      "sessionId": "session-1728581000-xyz",
      "interruptionCount": 2,
      "interruptionSeconds": 45,
      "referenceSeconds": 180,
      "distractionSeconds": 45,
      "longestUninterruptedSeconds": 1275,
      "appBreakdown": [...],
      "receivedAt": 1728582502000,
      "provenance": "REAL_EXTERNAL_SOURCE"
    }
  }
  ```

#### 3.10 `DELETE /telemetry`
- **Description**: GDPR/Learner Privacy deletion endpoint. Deletes all phone telemetry summaries belonging to the authenticated learner.
- **Authentication**: `Authorization: Bearer <Firebase_ID_Token>`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "deletedCount": 14
  }
  ```

#### 3.11 `GET /status`
- **Description**: Health check endpoint.
- **Authentication**: Public
- **Response `200 OK`**:
  ```json
  {
    "status": "OK",
    "storageConfigured": false,
    "protocolVersion": "1.0.0",
    "timestamp": 1728582600000
  }
  ```

---

### 4. Telemetry Privacy & Data Boundaries

To adhere strictly to privacy guidelines, the receiving endpoint enforces:
- **Zero Content Storage**: Keystrokes, notifications, SMS/messages, passwords, screenshots, and clipboard contents are completely excluded.
- **No Hardware Identifiers**: Hardware serials, MAC addresses, and IMEI are rejected. The Android app generates a UUID for `deviceId`.
- **Package Categorization**: Only `packageName`, user-approved `category` (`REFERENCE`, `DISTRACTION`, `UNKNOWN`), and `durationSeconds` are accepted.
- **Bounded Payload**: Total HTTP body must not exceed 64 KB.

---

### 5. Deployment and Environment Configuration

#### Netlify Configuration (`netlify.toml`)
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/v1/phone/*"
  to = "/.netlify/functions/phone/:splat"
  status = 200
  force = true
```

#### Required Environment Variables
Configure these in the Netlify site dashboard under **Site configuration > Environment variables**:
- `FIREBASE_PROJECT_ID`: The Firebase project identifier (e.g. `learning-tracker-prod`).
- `FIREBASE_CLIENT_EMAIL`: The Firebase service account email address.
- `FIREBASE_PRIVATE_KEY`: The PEM-formatted service account private key (with escaped `\n`).
- `PAIRING_SECRET_PEPPER`: Secret cryptographic pepper for keyed HMAC-SHA256 hashing of 6-digit pairing codes. **Mandatory in production (fails closed if unconfigured)** to prevent offline rainbow-table brute-force attacks against pairing challenge records.

*Note: In local development, these variables can be placed in `.env.local` for testing with `netlify dev`.*

---

### 6. Stage 2B Hand-off: Android Companion Integration

Stage 2B will complete the client implementation inside `PairingManager.kt` and `SyncComponents.kt` on Android:
1. **Pairing**: Call `POST /api/v1/phone/pair/complete` with user-entered 6-digit code. Store returned `deviceCredential` in Android Keystore (`EncryptedSharedPreferences`).
2. **Session Polling**: Background coroutine or WorkManager periodically polls `GET /api/v1/phone/focus-session/active` with `Authorization: Bearer devtok_...`.
3. **Observation & Summarization**: When `status == "ACTIVE_SESSION"`, monitor foreground usage using `UsageStatsManager`.
4. **Summary Submission**: On session completion, submit `POST /api/v1/phone/telemetry-summaries`.
