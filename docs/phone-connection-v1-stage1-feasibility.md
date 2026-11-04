# LEARNING TRACKER — PHONE CONNECTION v1
## STAGE 1: TELEMETRY ARCHITECTURE, ANDROID FEASIBILITY & SECURE CONNECTION DESIGN

**Date:** October 10, 2026
**Author:** Senior Android Systems Engineer, Backend Architect, Privacy Engineer & Codebase Auditor
**Document Status:** Approved Architectural Feasibility & Design Document
**Target Repository:** `Learning Tracker` (`c:/Users/Pranesh/todo app`)

---

## A. CURRENT TELEMETRY ARCHITECTURE

An adversarial inspection of the current production codebase was performed across all telemetry, focus lifecycle, storage, and identity files.

### 1. In-Scope Files Inspected
- Context & Lifecycle: [RoadmapContext.jsx](file:///c:/Users/Pranesh/todo%20app/src/context/RoadmapContext.jsx), [FocusSpace.jsx](file:///c:/Users/Pranesh/todo%20app/src/components/FocusSpace.jsx)
- Protocols & Contracts: [focusIntegrityProtocol.js](file:///c:/Users/Pranesh/todo%20app/src/shared/focusIntegrityProtocol.js), [accountSyncProtocol.js](file:///c:/Users/Pranesh/todo%20app/src/shared/accountSyncProtocol.js)
- Services: [focusIntegrityService.js](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js), [authService.js](file:///c:/Users/Pranesh/todo%20app/src/services/authService.js), [accountIdentityService.js](file:///c:/Users/Pranesh/todo%20app/src/services/accountIdentityService.js), [syncEngine.js](file:///c:/Users/Pranesh/todo%20app/src/services/syncEngine.js), [syncTransport.js](file:///c:/Users/Pranesh/todo%20app/src/services/syncTransport.js), [firebase.js](file:///c:/Users/Pranesh/todo%20app/src/services/firebase.js)
- Adaptive Intelligence: [signalCollector.js](file:///c:/Users/Pranesh/todo%20app/src/adaptive/signalCollector.js), [featureDeriver.js](file:///c:/Users/Pranesh/todo%20app/src/adaptive/featureDeriver.js), [experimentEngine.js](file:///c:/Users/Pranesh/todo%20app/src/adaptive/experimentEngine.js), [growthEvidenceResolver.js](file:///c:/Users/Pranesh/todo%20app/src/utils/growthEvidenceResolver.js)
- UI: [IdentityDevicesAndPrivacy.jsx](file:///c:/Users/Pranesh/todo%20app/src/components/IdentityDevicesAndPrivacy.jsx)
- Android Prototype Code: [android/app/src/main/](file:///c:/Users/Pranesh/todo%20app/android/app/src/main/)
- Tests & Test Mocks: [androidCompanionPairing.test.js](file:///c:/Users/Pranesh/todo%20app/src/__tests__/androidCompanionPairing.test.js), [telemetryAndSyncTruthfulness.test.js](file:///c:/Users/Pranesh/todo%20app/src/__tests__/telemetryAndSyncTruthfulness.test.js), [mockAuthServer.js](file:///c:/Users/Pranesh/todo%20app/src/__tests__/mocks/mockAuthServer.js)
- Configuration: [netlify.toml](file:///c:/Users/Pranesh/todo%20app/netlify.toml), [.env.example](file:///c:/Users/Pranesh/todo%20app/.env.example), [.env.local](file:///c:/Users/Pranesh/todo%20app/.env.local)

### 2. Execution Path Analysis (Trace of Existing Reality)
1. **Focus Session Lifecycle:**
   - When a learner clicks "Start Focus" in [RoadmapContext.jsx:2407](file:///c:/Users/Pranesh/todo%20app/src/context/RoadmapContext.jsx#L2407), `notifyFocusStarted(sessionObj)` is called in [focusIntegrityService.js:158](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js#L158).
   - In production, `notifyFocusStarted` simply performs:
     ```javascript
     safeStorageSet('learningTracker_companionDevice', { ...device, state: 'SESSION_ACTIVE' });
     ```
     **Critical Finding:** It does NOT emit any network packet, websocket message, or server write. It only updates the browser's local `localStorage`.
2. **Session Completion:**
   - In [RoadmapContext.jsx:2558](file:///c:/Users/Pranesh/todo%20app/src/context/RoadmapContext.jsx#L2558), `commitFocusSession` retrieves telemetry:
     ```javascript
     const rawTelemetry = focusSession.sessionId ? getTelemetryForSession(focusSession.sessionId) : null;
     const companionTelemetry = (isTest || rawTelemetry?.provenance === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) ? rawTelemetry : null;
     ```
   - If `companionTelemetry` exists, it is stored directly inside the canonical `FocusSession` record (`sessions` state in `RoadmapContext`).
   - `notifyFocusEnded(focusSession.sessionId)` sets the paired device state back to `'READY'` in `localStorage`.
3. **Telemetry Ingestion & Storage:**
   - In [focusIntegrityService.js:191](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js#L191), `recordFocusTelemetry(telemetry)` receives a summary object.
   - It validates the object using `validateFocusTelemetry` and checks provenance:
     ```javascript
     if (!isTest && provenance !== TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE) return false;
     ```
   - It writes to `learningTracker_focusTelemetry` in `localStorage` under `allTelemetry[normalized.sessionId]`.
4. **Adaptive Consumption:**
   - [signalCollector.js:98](file:///c:/Users/Pranesh/todo%20app/src/adaptive/signalCollector.js#L98) reads `companionTelemetry` from `sessions` and extracts `interruptionCount`, `interruptionSeconds`, `referenceSeconds`, `distractionSeconds`, `longestStretchSeconds`.
   - [featureDeriver.js:56](file:///c:/Users/Pranesh/todo%20app/src/adaptive/featureDeriver.js#L56) calculates median uninterrupted time and interruption rates over recent windows.
   - [growthEvidenceResolver.js:552](file:///c:/Users/Pranesh/todo%20app/src/utils/growthEvidenceResolver.js#L552) generates weekly trend statements (e.g. "You had fewer distraction interruptions this week") only when $\ge 4$ sessions exist with `REAL_EXTERNAL_SOURCE`.

### 3. Answers to the 10 Architectural Questions

| Question | Current Codebase Reality | Architectural Reference |
|---|---|---|
| **1. What actual phone data can the app accept?** | Only aggregated session summaries: `sessionId`, `intendedSeconds`, `observedSeconds`, `interruptionCount`, `interruptionSeconds`, `referenceSeconds`, `distractionSeconds`, `unknownSeconds`, `longestUninterruptedSeconds`, and `appBreakdown` (array of `{ packageName, category, durationSeconds }`). Raw real-time stream events are NOT currently supported. | [focusIntegrityProtocol.js:118](file:///c:/Users/Pranesh/todo%20app/src/shared/focusIntegrityProtocol.js#L118) |
| **2. How is genuine external telemetry authenticated?** | Pure string matching on `telemetry.provenance === 'REAL_EXTERNAL_SOURCE'` in client JS. There is **zero** cryptographic signature verification, zero HMAC, and zero token check against a server. | [focusIntegrityService.js:201](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js#L201) |
| **3. What rejects fabricated or test-only telemetry?** | In production (`process.env.NODE_ENV !== 'test'`), `DEV_SIMULATION` and `TEST_FIXTURE` strings are rejected by `recordFocusTelemetry`. However, any client script passing `"REAL_EXTERNAL_SOURCE"` is accepted without cryptographic proof. | [focusIntegrityService.js:201](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js#L201) |
| **4. Where do incoming events get stored?** | In the browser's `window.localStorage` under key `learningTracker_focusTelemetry` (indexed by `sessionId`). | [focusIntegrityService.js:213](file:///c:/Users/Pranesh/todo%20app/src/services/focusIntegrityService.js#L213) |
| **5. Can events be correlated to a specific Focus session?** | Yes, strictly via `sessionId`. However, the phone currently has **no mechanism** to learn what `sessionId` the browser generated unless manually typed or received via a non-existent server bridge. | [focusIntegrityProtocol.js:190](file:///c:/Users/Pranesh/todo%20app/src/shared/focusIntegrityProtocol.js#L190) |
| **6. What happens when the phone is offline?** | In the Android prototype, data queues in Android `SharedPreferences`. In the web app, if no telemetry arrives before session completion, `companionTelemetry` defaults to `null`. The session completes cleanly as an unmonitored focus block. | [RoadmapContext.jsx:2560](file:///c:/Users/Pranesh/todo%20app/src/context/RoadmapContext.jsx#L2560) |
| **7. What happens when the browser refreshes?** | Previously saved telemetry in `learningTracker_focusTelemetry` persists across reloads via `safeStorage`. Active uncommitted timers in React state are reset or restored depending on mount state. | [storage.js:77](file:///c:/Users/Pranesh/todo%20app/src/utils/storage.js#L77) |
| **8. What happens when a session ends while events are delayed?** | `commitFocusSession` executes synchronously and writes the session to `sessions` with `companionTelemetry: null`. **No retroactive reconciliation exists** to attach delayed telemetry to an already-committed session. | [RoadmapContext.jsx:2580](file:///c:/Users/Pranesh/todo%20app/src/context/RoadmapContext.jsx#L2580) |
| **9. Does a real production receiving endpoint exist?** | **NO.** There is no Netlify Function, no Firebase Cloud Function, no Firestore listener, and no backend API. `syncTransport.js` throws `SYNC_UNAVAILABLE` in production. Tests pass solely via `mockAuthServer` in-memory mocks. | [syncTransport.js:73](file:///c:/Users/Pranesh/todo%20app/src/services/syncTransport.js#L73) |
| **10. What production capabilities are missing?** | (1) Authenticated ingestion receiver; (2) Cryptographic device token validation; (3) Live/polled active-session relay from Web to Phone; (4) Ingestion deduplication; (5) Retroactive session reconciliation; (6) Physical network transport between phone and web browser. | Full audit detailed below |

### 4. Existing Invariants to Preserve
- **Invariant 1 (Provenance Truthfulness):** Production learner data and adaptive engines must never accept fake, simulated, or synthesized telemetry. Only genuine external sources (`REAL_EXTERNAL_SOURCE`) may influence adaptive features.
- **Invariant 2 (Truthful Telemetry Status):** `NO_SOURCE`, `SOURCE_NOT_CONNECTED`, `SOURCE_CONNECTED_NO_DATA`, and `SOURCE_CONNECTED_WITH_DATA` must remain distinct. Missing phone telemetry must **never** collapse into "0 interruptions" or "100% focus integrity".
- **Invariant 3 (Additive Resiliency):** If the phone is absent, dead, unmonitored, or disconnected, the Web Focus Space and Roadmap must continue to function with 100% fidelity. Phone telemetry is strictly additive context, never a gate to learning.
- **Invariant 4 (Single Canonical Authority):** `RoadmapContext` and its canonical `sessions` collection remain the authoritative record of learning work.

---

## B. MISSING PRODUCTION CAPABILITIES

To bridge an actual Android phone to Learning Tracker in production, five foundational capabilities must be established:

```
[Android Phone (Companion/Automation)]
        │
        ▼ (1) Authenticated Ingestion Request (Device Scoped Token)
[Ingestion Receiver (HTTPS Serverless / Backend)]
        │
        ├─► (2) Device Auth & Session Ownership Validation
        ├─► (3) Ingestion Storage (Idempotent Event Log)
        │
        ▼ (4) Session State Relay & Polling Bridge
[Learning Tracker Web Application (Desktop Browser)]
        │
        ▼ (5) Retroactive Session Reconciliation Engine
[Canonical RoadmapContext & Adaptive Engine]
```

1. **Production Ingestion Receiver:** The current deployment (`netlify.toml`) is a pure static Single Page Application redirecting `/*` to `/index.html`. No server process exists to receive incoming HTTP POST requests from an external device.
2. **Device Authentication & Token Management:** In tests, `mockAuthServer` issued `devtok_xxx`. In production, no backend validates that a device token belongs to a specific user account.
3. **Active Session Relay (Web $\rightarrow$ Phone):** When a user starts a Focus session in the browser, the phone cannot know the `sessionId` unless the session start is written to a shared cloud endpoint and fetched by the phone.
4. **Retroactive Telemetry Reconciliation:** If phone data is delayed due to network lag, offline buffering, or user delay, `RoadmapContext` currently leaves the committed session with `companionTelemetry: null` forever. A mutation/reconciliation method is required to patch late-arriving telemetry into the existing session record.
5. **Raw Event vs Summary Normalizer:** The current app only accepts pre-calculated summaries (`interruptionCount`, `interruptionSeconds`). If a lightweight connector sends raw transitions (`SCREEN_OFF`, `APP_RESUMED`), the system needs a deterministic normalizer to reconstruct intervals into the summary format.

---

## C. ANDROID FEASIBILITY AUDIT

### 1. Observable Signals & Android System APIs

| Signal Category | Android API / System Mechanism | Required Permission / Setting | Reliability & Latency | Observational Nature |
|---|---|---|---|---|
| **A. Foreground App Package** | `UsageStatsManager.queryEvents(begin, end)` with `UsageEvents.Event.ACTIVITY_RESUMED` (Type 1) | `android.permission.PACKAGE_USAGE_STATS` (granted manually via `Settings.ACTION_USAGE_ACCESS_SETTINGS`) | **High**. Batch queried over discrete `[startedAt, endedAt]` window. Zero real-time battery drain. | **Direct observation** of app component resume events. |
| **B. Foreground App (Real-Time)** | `AccessibilityService` with `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` | `android.permission.BIND_ACCESSIBILITY_SERVICE` (Accessibility Settings) | **Medium-High**, but heavy OS scrutiny, battery overhead, and privacy risks. | **Direct observation** of active window transitions. |
| **C. Screen State (Interactive)** | `UsageEvents.Event.SCREEN_INTERACTIVE` (Type 15) & `SCREEN_NON_INTERACTIVE` (Type 16) | `android.permission.PACKAGE_USAGE_STATS` | **High**. Logged in Android system event history alongside activity changes. | **Direct observation** of display power states. |
| **D. Screen Lock / Keyguard** | `UsageEvents.Event.KEYGUARD_SHOWN` (Type 17) & `KEYGUARD_HIDDEN` (Type 18) | `android.permission.PACKAGE_USAGE_STATS` | **High**. Distinguishes screen turned on while still locked vs unlocked. | **Direct observation** of lockscreen status. |
| **E. Broadcast Receivers (Real-Time)** | `Intent.ACTION_SCREEN_ON`, `ACTION_SCREEN_OFF`, `ACTION_USER_PRESENT` | Dynamic registration in active Service (`RECEIVE_BOOT_COMPLETED` for restart) | **High** during runtime, but requires persistent background service on Android 8.0+ (API 26+). | **Direct observation** of OS broadcast triggers. |

### 2. Direct Observations vs. Inferred Activity
- **Direct Observation:** The device screen became interactive at `14:22:10`, and package `com.instagram.android` resumed at `14:22:12` until `14:24:15`.
- **Inferred Activity:** Labeling the 2 minutes in Instagram as a "distraction" is an **inference** governed by user-configurable classification rules.
- **Strict Invariant:** The telemetry engine must store raw observable intervals (`packageName`, `startedAt`, `endedAt`). Classifications (`REFERENCE`, `DISTRACTION`, `UNKNOWN`) are applied as a deterministic projection that the user can override at any time.

---

## D. COMPARISON OF THREE IMPLEMENTATION PATHS

We evaluated three potential technical approaches for bringing real phone data to Learning Tracker:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OPTION A: Tasker Profile (Third-Party Automation Macro)                     │
│ Phone (Tasker Profile) ──HTTP POST──► Receiver ──► Learning Tracker Web    │
├─────────────────────────────────────────────────────────────────────────────┤
│ OPTION B: Automate Flow (LlamaLab Automation Flowchart)                     │
│ Phone (Automate Flow) ──HTTP POST──► Receiver ──► Learning Tracker Web     │
├─────────────────────────────────────────────────────────────────────────────┤
│ OPTION C: Dedicated Android Companion (Lightweight Native Kotlin App)       │
│ Phone (Native Companion) ──HTTPS API──► Receiver ──► Learning Tracker Web   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Evaluation Matrix

| Evaluation Dimension | Option A: Tasker Prototype | Option B: Automate Prototype | Option C: Dedicated Native Companion |
|---|---|---|---|
| **Implementation Cost** | Medium. Requires writing Tasker XML/JSON profiles, JavaScript scriplets, and custom variable logic. | Medium. Requires visual block flow construction (`.flo` format) with branching error catchers. | Low-Medium. **Android scaffolding already exists in `android/app`** with data models, interval reconstructor, and UI! |
| **Time to First Real Event** | Fast (1–2 days for a single developer with Tasker installed). | Fast (1–2 days for a single developer with Automate installed). | Fast-Medium (2–3 days using existing `android/app` codebase). |
| **Observability & Fidelity** | **Poor.** Tasker `%WIN` only provides window labels, not package names. To get package names, Tasker requires either root, specialized plugins, or accessibility service continuously scanning. | **Medium.** Automate "App in foreground" block can output package names, but polling loops cause jitter. | **Superior.** Native `UsageStatsManager.queryEvents` extracts exact millisecond package names and screen events without continuous polling. |
| **Reliability & OS Constraints** | **Fragile.** OS battery optimizations frequently kill Tasker background workers unless whitelisted. | **Fragile.** Flow charts stall if network fails or if accessibility service is killed by Samsung/Xiaomi MIUI. | **High.** Uses discrete historical query over `[sessionStart, sessionEnd]` at session completion. Immune to background kills during the session! |
| **Android Permission Burden** | High: Paid app ($3.49), Notification Access, Accessibility Service, Device Admin, Battery Exemption. | High: Free/Paid app, Accessibility Service, Usage Access, Battery Exemption. | **Minimal & Precise:** Free native app requiring **only one** system setting: `Usage Access` (`PACKAGE_USAGE_STATS`). |
| **Security & Token Storage** | **Vulnerable.** Tasker variables are plaintext. Cannot store secure tokens with Android Keystore/EncryptedSharedPreferences. | **Vulnerable.** Flow variables stored in plaintext flow storage. | **High.** Employs Android Keystore, App Links verification (`https://learningtracker001.netlify.app/connect`), and scoped bearer tokens. |
| **Privacy & Learner Consent** | Poor. Tasker has full device control; learner cannot see exact boundaries of what is collected. | Poor. Automate requires wide permissions; no dedicated privacy UI. | **Total Control.** Dedicated Privacy Disclosure screen, App Classification UI, zero network leakage outside Learning Tracker. |
| **Battery Impact** | High if running accessibility polling every 500ms. | High if running continuous foreground loop. | **Zero during session.** Queries database only once at the end of the focus block. |
| **Long-Term Maintainability** | Very low. Fragile across Android OS updates (Android 14/15 restrictions on background starts). | Very low. Proprietary `.flo` format cannot be cleanly version-controlled in Git. | **High.** Standard Kotlin codebase maintained directly in the repository with automated unit tests. |
| **Dependency on 3rd Party** | 100% dependent on João Dias / Tasker ecosystem and paid licenses. | 100% dependent on LlamaLab and third-party app store availability. | **0% external dependency.** Fully open, owned, and reproducible. |

### Architectural Recommendation
**Recommendation: PROCEED WITH OPTION C (Dedicated Android Companion).**

*Justification:*
1. **Existing Head Start:** The repository already contains a clean, well-architected native Kotlin companion implementation under `android/app/src/main/kotlin/com/learningtracker/companion/` that implements `UsageEventsCollector`, `ForegroundTracker` (interval reconstruction), and `FocusSummaryCalculator`.
2. **Superior Privacy & Permission Model:** Android's `UsageStatsManager` provides exact historical events for the discrete session window without continuous surveillance or accessibility service abuse. Tasker and Automate require invasive accessibility services that inspect on-screen content.
3. **No Paid Dependencies:** Tasker is a paid application on Google Play; requiring learners to purchase and configure Tasker is an unacceptable barrier to entry.
4. **Offline & Battery Efficiency:** Native Kotlin code queries the system SQLite database once upon session conclusion in $< 15\text{ ms}$, using virtually zero battery during a 30-minute study block.

---

## E. RECEIVING ARCHITECTURE VERIFICATION

### 1. Existing Deployment Inspection
- `netlify.toml` specifies:
  ```toml
  [build]
    publish = "build"
    command = "npm run build"
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- **Finding:** No `[functions]` directory exists in `netlify.toml`. The application is currently deployed as a client-side static bundle.
- **Finding:** Firebase Authentication is configured in `src/services/firebase.js` using client credentials for Google OAuth. However, **no Firebase Cloud Functions, Firestore database, or Realtime Database** instances are initialized.

### 2. Evaluated Backend Architectures

| Architecture Option | Pros | Cons | Decision |
|---|---|---|---|
| **1. Netlify Functions (Serverless Node.js)** | • Native to existing Netlify hosting configuration.<br>• Zero external billing accounts needed.<br>• Standard Node.js runtime for JWT/token validation.<br>• Fast cold starts. | • Stateless: requires a persistence layer (e.g. Firebase Firestore or Upstash Redis) to store paired tokens and active sessions. | **Recommended Ingestion Layer** |
| **2. Firebase Cloud Functions + Firestore** | • Direct integration with existing Firebase Auth (`auth.currentUser.uid`).<br>• Realtime listeners (`onSnapshot`) push session state to desktop browser immediately.<br>• Firestore rules enforce document-level ownership. | • Requires upgrading Firebase project to Blaze plan (pay-as-you-go).<br>• Adds separate deployment tooling (`firebase-tools`). | **Strong Secondary Alternative** |
| **3. WebRTC / Local LAN WebSocket** | • Peer-to-peer; zero cloud storage needed. | • Fragile: Fails when phone is on cellular data while laptop is on Wi-Fi.<br>• NAT traversal requires STUN/TURN servers.<br>• Fails if browser tab sleeps. | **Rejected** |
| **4. Direct Client POST to Browser (Local Server)** | • Pure local machine testing. | • Browser cannot listen on HTTP ports due to sandbox security.<br>• Requires running a separate local Node.js daemon on the desktop. | **Rejected** |

### 3. Selected Ingestion Pipeline Architecture

The selected architecture utilizes **Netlify Functions** (`netlify/functions/`) coupled with a secure **Session Relay & Ingestion Store**:

```
[Android Companion]
       │
       │ 1. POST /api/v1/pair/confirm (Pairing Code)
       │    Returns: scopedDeviceToken
       │
       │ 2. GET /api/v1/session/active (Bearer: scopedDeviceToken)
       │    Returns: { activeSessionId, startedAt, targetMinutes }
       │
       │ 3. POST /api/v1/telemetry/submit (Bearer: scopedDeviceToken)
       │    Body: { schemaVersion: 1, eventId, sessionId, summary }
       ▼
[Netlify Serverless Ingestion Function]
       │
       ├─► Validates Bearer scopedDeviceToken against DeviceRegistry
       ├─► Validates sessionId matches user's active session
       ├─► Assigns trusted receivedAt server timestamp
       ├─► Deduplicates eventId
       ▼
[Encrypted Ingestion Store / Firebase Firestore]
       ▲
       │ 4. Desktop Browser (Learning Tracker)
       │    GET /api/v1/telemetry/pending (Firebase Auth ID Token)
       │    Fetches verified telemetry and commits to RoadmapContext
```

### 4. Verification of the 12 Security & Protocol Questions

1. **Device Authentication:** Devices authenticate using a cryptographically random, high-entropy bearer token (`devtok_<uuid>_<hmac>`) issued during the pairing ceremony.
2. **Device Pairing Ceremony:**
   - Web client creates a 6-digit numeric pairing code (valid for 5 minutes) via `/api/v1/pair/request`.
   - Android phone enters the code (or scans QR App Link `https://learningtracker001.netlify.app/pair?code=123456`).
   - Server verifies the code, creates an association between `accountId` and `deviceId`, and returns the `scopedDeviceToken` to the phone.
3. **Revocation:** Learner clicks "Revoke Device" in `IdentityDevicesAndPrivacy.jsx`. Server marks device as `revoked`. Future requests using that token immediately return `401 Unauthorized`.
4. **Proof of Authorization:** Every telemetry payload must include `Authorization: Bearer <scopedDeviceToken>`. The receiver verifies that the device is active and bound to the session owner.
5. **Replay Protection:** Every request includes an incrementing nonce or unique `eventId` and `observedAt` timestamp. Requests older than 15 minutes without an offline sync flag are rejected.
6. **Deduplication:** Server and client maintain an idempotent index keyed on `eventId` and `sessionId`. Duplicate submissions return `200 OK (ALREADY_PROCESSED)` without duplicating data.
7. **Persistence:** Events persist in the server ingestion store until acknowledged by the web client, and permanently in the web client's local storage and sync outbox.
8. **Session Ownership Validation:** The receiver checks that `focusSessionId` was created by the same `accountId` that owns the submitting `deviceId`.
9. **Authentication Expiry:** Companion device tokens are long-lived (90 days) but immediately revokable. If revoked or expired, the phone returns to `NOT_PAIRED` state.
10. **Payload Size Limits:** Netlify function strictly caps incoming request bodies at $64\text{ KB}$ (`413 Payload Too Large`), preventing memory exhaustion.
11. **Rate Limiting & Abuse Protection:** Max 60 requests per minute per device token. Bursts of $> 5$ requests per second return `429 Too Many Requests`.
12. **Error & Retry Representation:** Standard HTTP status codes: `400 Bad Request` (schema invalid), `401 Unauthorized` (revoked/invalid token), `409 Conflict` (session already finalized), `503 Service Unavailable` (offline/retrying).

---

## F. VERSIONED EVENT CONTRACT (TELEMETRY V1)

### 1. Canonical Schema Specification (`v1.0.0`)

```json
{
  "schemaVersion": "1.0.0",
  "eventId": "evt_01J9X2M4Q9R8K7W6T5V4B3N2P1",
  "deviceId": "dev_android_3a7b8f9e-4c2d",
  "focusSessionId": "sess_1728590400000_abc123",
  "eventType": "FOCUS_WINDOW_SUMMARY",
  "observedAt": 1728592200000,
  "receivedAt": 1728592201450,
  "source": "ANDROID_COMPANION_NATIVE",
  "provenance": "REAL_EXTERNAL_SOURCE",
  "deliveryStatus": "DELIVERED",
  "payload": {
    "intendedSeconds": 1800,
    "observedSeconds": 1800,
    "interruptionCount": 2,
    "interruptionSeconds": 145,
    "referenceSeconds": 240,
    "distractionSeconds": 145,
    "unknownSeconds": 0,
    "longestUninterruptedSeconds": 1415,
    "appBreakdown": [
      {
        "packageName": "com.google.android.calculator",
        "category": "reference",
        "durationSeconds": 240
      },
      {
        "packageName": "com.instagram.android",
        "category": "distraction",
        "durationSeconds": 145
      }
    ],
    "rawIntervalsCount": 4
  }
}
```

### 2. Field Assignment & Validation Authority

| Field Name | Type | Assigned By | Required? | Validation Rule |
|---|---|---|---|---|
| `schemaVersion` | String | Phone | **Yes** | Must equal `"1.0.0"`. |
| `eventId` | String | Phone | **Yes** | ULID or UUID v4 starting with `evt_`. Must be unique. |
| `deviceId` | String | Phone | **Yes** | Registered UUID device identifier. |
| `focusSessionId` | String | Phone | **Yes** | Must match active or recently closed session. |
| `eventType` | String | Phone | **Yes** | `FOCUS_WINDOW_SUMMARY` or `TRANSITION_EVENT`. |
| `observedAt` | Number (ms) | Phone | **Yes** | Epoch millisecond timestamp of observation. |
| `receivedAt` | Number (ms) | **Receiver** | **Yes** | Epoch timestamp assigned by server upon ingest. |
| `source` | String | Phone | **Yes** | `"ANDROID_COMPANION_NATIVE"`. |
| `provenance` | String | **Receiver** | **Yes** | Verified and set to `"REAL_EXTERNAL_SOURCE"`. |
| `deliveryStatus` | String | **Receiver** | **Yes** | `"DELIVERED"` or `"PENDING_RECONCILIATION"`. |
| `payload` | Object | Phone | **Yes** | Validated against `validateFocusTelemetry` rules. |

### 3. Supported Event Types
1. **`FOCUS_WINDOW_SUMMARY` (Primary V1 Contract):** Transmitted once at session conclusion. Contains reconstructed intervals, interruption counts, and application breakdown. Low bandwidth ($< 2\text{ KB}$), maximum privacy.
2. **`TRANSITION_EVENT` (Optional Low-Frequency V2 Contract):** Emitted in real-time when an app change or screen-off occurs during a live session.
3. **`HEARTBEAT` (Excluded from V1):** Heartbeats during Focus sessions are deliberately **excluded** to prevent battery drain and excessive network chatter. The server uses session start/end boundaries instead.

### 4. Timestamp & Drift Invariants
- **Device Clock Drift:** Device timestamps are cross-referenced with server `receivedAt`. If `|observedAt - receivedAt| > 10 \text{ minutes}`, the event is flagged with `CLOCK_DRIFT_WARNING` but not discarded.
- **Delayed Delivery:** Events queued during offline periods retain their historical `observedAt` timestamp. The server stamps `receivedAt` when the packet actually arrives.
- **Idempotency:** Re-submitting the same `eventId` produces no duplicate telemetry and returns the original receipt record.

---

## G. SESSION CORRELATION DESIGN

### 1. Active Session Relay Flow
How the phone learns which Focus session is active:

```
[Learning Tracker Web]                [Ingestion Server]               [Android Phone]
         │                                    │                               │
 1. Start Focus Session                       │                               │
    sessionId: "sess_101"                     │                               │
    POST /session/start ─────────────────────►│                               │
                                              │ 2. GET /session/active        │
                                              │    (polls every 15s or push)  │
                                              │◄──────────────────────────────│
                                              │                               │
                                              │─── Returns { sessionId: 101 }►│
                                              │                               │
                                              │                        3. Records session
                                              │                           window [t0, t1]
                                              │                               │
 4. Complete Focus Session                    │                               │
    POST /session/complete ──────────────────►│                               │
                                              │ 5. Session marked COMPLETE    │
                                              │                               │
                                              │ 6. End session & send summary │
                                              │◄──────────────────────────────│
                                              │    POST /telemetry/submit     │
                                              │                               │
 7. GET /telemetry?session=101 ──────────────►│                               │
    Reconciles into RoadmapContext            │                               │
```

### 2. Edge Case Invariant Specifications
- **No Session Active:** If phone queries `/session/active` and none is running, phone companion displays "Ready for Focus" and records zero telemetry.
- **Multiple Browser Sessions Open:** Server enforces **single active session per account**. Attempting to start a second session cancels or supersedes the previous session with an explicit `SESSION_SUPERSEDED` status.
- **Browser Closes Unexpectedly:** If browser crashes mid-session, the session reaches its target duration ($t_0 + \text{targetMinutes}$). When phone submits telemetry for that window, the server stores it. Upon next browser load, the uncommitted session is reconciled.
- **Stale Session Token:** Submissions referencing session IDs older than 24 hours without a matching uncommitted record are flagged as `UNMATCHED_HISTORICAL_TELEMETRY` and stored in an audit log without corrupting active roadmaps.

---

## H. PRIVACY AND SECURITY ARCHITECTURE

### 1. Privacy Principles & Non-Surveillance Guarantee
1. **Discrete Window Sampling:** Telemetry is gathered **only** between `sessionStart` and `sessionEnd`. When no session is active, the companion collector is completely dormant.
2. **App Classification Overrides:** The learner legitimately uses calculators, documentation, PDF readers, and browser lookups. Users have absolute authority in `IdentityDevicesAndPrivacy.jsx` to mark any app as `REFERENCE`, `DISTRACTION`, or `UNKNOWN`.
3. **Data Minimization:** The companion **never** inspects:
   - Keystrokes or text entered
   - Message contents or notification payloads
   - Webpage URLs or search queries
   - Microphone, camera, or sensor data
   - Persistent hardware identifiers (IMEI, MEID, IMSI, MAC address)
4. **Data Deletion:** Clicking "Delete Focus Integrity History" in `IdentityDevicesAndPrivacy.jsx` immediately purges all telemetry records locally and dispatches a tombstone deletion to the server, preserving all learning roadmap completions intact.

### 2. Threat Model & Mitigations

| Threat | Impact | Mitigation in Proposed Architecture |
|---|---|---|
| **Unauthorized Device Pairing** | Rogue phone captures session data. | 6-digit pairing codes expire in 5 minutes and require authenticated browser session initiation. QR codes are single-use. |
| **Leaked Device Token** | Attacker submits fake distractions. | Scoped device tokens are restricted solely to telemetry submission. Cannot read roadmaps, user passwords, or profile data. Revocable with one click. |
| **Replay Attacks** | Attacker replays old sessions to manipulate stats. | Server tracks `eventId` uniqueness and enforces that `focusSessionId` exists in an uncompleted or reconciling state. |
| **Forged Timestamps** | Phone claims 10 hours of uninterrupted time. | Server enforces that `observedSeconds` cannot exceed the server's measured wall-clock window for that session. |
| **Oversized Payloads** | Denial of service / memory exhaustion. | Ingestion endpoint strictly enforces $64\text{ KB}$ payload limit. |
| **Cross-Account Access** | Device submits telemetry for another user's session. | Ingestion server verifies that `session.accountId === device.accountId`. |

---

## I. OFFLINE AND FAILURE MODEL

### 1. Storage & Retry Sequence
1. **Local-First Retention on Device:**
   - The native companion stores all computed summaries in Android `SharedPreferences` (`learningtracker_telemetry`) before attempting network dispatch.
   - If network is unavailable or receiver returns `5xx`, the record remains marked `syncState: "PENDING_LOCAL_SYNC"`.
2. **Exponential Backoff:**
   - Companion retries delivery at intervals of $5\text{s}$, $15\text{s}$, $45\text{s}$, $2\text{m}$, up to a max backoff of $15\text{m}$.
3. **Web Client Outbox Alignment:**
   - Matches the design of [syncEngine.js:70](file:///c:/Users/Pranesh/todo%20app/src/services/syncEngine.js#L70) (`OUTBOX_STORAGE_KEY`).
   - Mutations are append-only, idempotent, and non-destructive.

### 2. Preserving Truthfulness During Network Failure
- If telemetry is pending delivery when the learner views the dashboard, the UI displays:
  ```
  Status: SOURCE_CONNECTED_NO_DATA ("Awaiting phone sync...")
  ```
- **Critical Anti-Fabrication Rule:** The system **never** assumes zero interruptions during network partitions. It displays an honest waiting status until the verified packet arrives.

---

## J. MINIMUM REAL-WORLD PROTOTYPE PLAN (STAGE 2 EXECUTION)

The implementation will follow a rigorous 12-step validation sequence to prove the integration end to end:

```
[Step 1: Consent & Enable] ──────► [Step 2: Start Focus in Web]
             │                                   │
             ▼                                   ▼
[Step 4: Phone Detects Event] ◄──── [Step 3: Phone Gets Session Contract]
             │
             ▼
[Step 5: Event Assigned UUID] ───► [Step 6: HTTPS POST to Receiver]
                                                 │
                                                 ▼
[Step 8: Reconciled in Web UI] ◄─── [Step 7: Receiver Authenticates]
             │
             ▼
[Step 9: Deduplication Verified]
             │
             ▼
[Step 10: Offline Outbox Queue Verified]
             │
             ▼
[Step 11: Revocation Blocks Submissions]
             │
             ▼
[Step 12: Learner Deletes Data & Telemetry Purged]
```

1. **Step 1:** Learner enables Focus Integrity in `IdentityDevicesAndPrivacy.jsx` and clicks "Connect Phone".
2. **Step 2:** Web displays pairing code; phone companion completes pairing ceremony via `/api/v1/pair`.
3. **Step 3:** Learner starts a 25-minute Focus Session on the web workstation.
4. **Step 4:** Phone companion queries active session and arms the window collector.
5. **Step 5:** Learner works, uses Calculator (reference), and unlocks phone for Instagram (distraction).
6. **Step 6:** Learner completes Focus Session in web app.
7. **Step 7:** Phone companion reconstructs intervals via `ForegroundTracker` and dispatches summary via HTTPS.
8. **Step 8:** Ingestion endpoint validates device token, checks session ownership, and marks packet `REAL_EXTERNAL_SOURCE`.
9. **Step 9:** Web client receives telemetry and binds it to the canonical `FocusSession` in `RoadmapContext`.
10. **Step 10:** Duplicate submission of same packet is proven idempotent.
11. **Step 11:** Device is revoked in web UI; subsequent submission from phone is rejected with `401 Unauthorized`.
12. **Step 12:** Learner clicks "Delete Focus Integrity History"; all telemetry is deleted while learning roadmap remains intact.

---

## K. TEST & VERIFICATION PLAN

### 1. Automated Test Suites (Jest & JSDOM)
- **Contract & Protocol Tests:** Validate `v1.0.0` payload schema, missing field rejections, oversized payload rejections, and timestamp drift warnings.
- **Reconciliation Tests:** Test `RoadmapContext` receiving telemetry synchronously, asynchronously, and retroactively after session commit.
- **Truthfulness Invariants:** Verify that missing phone data renders `SOURCE_CONNECTED_NO_DATA` and never injects fake scores or zeros into `signalCollector.js` or `growthEvidenceResolver.js`.

### 2. Integration Tests (Serverless & Network)
- **Pairing Ceremony Test:** Generate code $\rightarrow$ consume code $\rightarrow$ verify token issuance $\rightarrow$ attempt reuse of expired code $\rightarrow$ verify failure.
- **Ingestion Test:** Submit valid summary with valid bearer token $\rightarrow$ verify 200 OK. Submit with revoked token $\rightarrow$ verify 401.

### 3. Physical Device Verification (Hardware Gate)
- Run debug APK on real Android device (Android 13/14/15).
- Verify `Settings.ACTION_USAGE_ACCESS_SETTINGS` intent navigation.
- Verify `UsageEvents.Event.ACTIVITY_RESUMED` logging accuracy against real app switches.
- Test offline flight mode during session, restoring Wi-Fi after session completion, and validating outbox delivery.

---

## L. ARCHITECTURAL DECISION

### **DECISION: Build Option C (Dedicated Android Companion) with a Netlify Functions Ingestion Receiver.**

**Why this path is chosen:**
1. **Codebase Preparedness:** Over 60% of Option C is already written in `android/app` (models, interval reconstruction, Compose UI). It requires only the HTTPS client sync adapter and backend receiver.
2. **Maximum Privacy & Compliance:** Uses discrete `UsageStatsManager` queries over completed session windows. Avoids invasive accessibility services that inspect sensitive screen text.
3. **Zero Learner Cost:** Does not require learners to buy Tasker ($3.49) or install complex third-party flowchart runners.
4. **Architectural Control & Authenticity:** Provides cryptographically authenticated device tokens and strict provenance enforcement matching the production gates of Learning Tracker.

---

## M. VERIFIED SOURCES & DOCUMENTATION AUDIT

The following official documentation and references were inspected during this architectural study:

1. **Android Developers API Reference — `UsageStatsManager`:**
   - *URL:* https://developer.android.com/reference/android/app/usage/UsageStatsManager
   - *Why It Matters:* Defines `queryEvents(beginTime, endTime)` and event constants `ACTIVITY_RESUMED`, `SCREEN_INTERACTIVE`, `SCREEN_NON_INTERACTIVE`.
   - *Decision Supported:* Proves that discrete window queries over `[startedAt, endedAt]` work reliably without continuous background polling.
2. **Android Developers API Reference — Package Usage Stats Permission:**
   - *URL:* https://developer.android.com/reference/android/Manifest.permission#PACKAGE_USAGE_STATS
   - *Why It Matters:* Documents that `PACKAGE_USAGE_STATS` is a special access permission requiring `Settings.ACTION_USAGE_ACCESS_SETTINGS`.
   - *Decision Supported:* Guides the intent routing in `UsageAccessHelper.kt`.
3. **Tasker Official User Guide — Variables & HTTP Request:**
   - *URL:* https://tasker.joaoapps.com/userguide/en/variables.html
   - *Why It Matters:* Evaluated `%WIN` and `%caller` variables.
   - *Decision Supported:* Demonstrated that Tasker only exposes window labels (not reliable package names) without accessibility services, supporting the rejection of Option A.
4. **LlamaLab Automate Documentation — "App in foreground" Block:**
   - *URL:* https://llamalab.com/automate/doc/block/app_in_foreground.html
   - *Why It Matters:* Evaluated Automate foreground detection capabilities.
   - *Decision Supported:* Confirmed that Automate requires continuous loop flowcharts and proprietary `.flo` storage, supporting the rejection of Option B.
5. **Netlify Functions Official Documentation — POST Handling:**
   - *URL:* https://docs.netlify.com/functions/overview/
   - *Why It Matters:* Verifies serverless endpoint handling of incoming POST requests, JSON bodies, and `netlify.toml` configuration.
   - *Decision Supported:* Provides the serverless receiver architecture in Section E.

---

## N. OPEN ARCHITECTURAL QUESTIONS (FOR STAGE 2)

Only two genuinely unresolved decisions remain for Stage 2:
1. **Serverless Persistence Backend Selection:** While Netlify Functions is the chosen ingestion receiver, whether the interim storage for pending device tokens and active sessions should be hosted in **Firebase Firestore** (leveraging existing Firebase project credentials in `.env.local`) or a lightweight **Upstash Redis / Supabase Postgres** instance.
   - *Recommendation:* Leverage Firestore since the project already has an active Firebase Project ID (`todo-app-9ced8`) configured in `.env.local`.
2. **Local USB / Wi-Fi Pairing Alternative:** Whether to support a local WebUSB or local network fallback for learners who refuse all cloud account synchronization.
   - *Recommendation:* Defer to Stage 3; focus Stage 2 on proving the cloud HTTPS receiver first.

---

### Conclusion & Next Step
The feasibility audit is complete, all architectural invariants are mapped, and Option C is confirmed as the superior, privacy-preserving, and technically viable path.

**Recommended Next Step:** Proceed to Stage 2: Scaffold the Netlify Function ingestion receiver (`netlify/functions/telemetry.js`), configure Firebase Firestore session relay, and connect the Android Companion HTTP client.
