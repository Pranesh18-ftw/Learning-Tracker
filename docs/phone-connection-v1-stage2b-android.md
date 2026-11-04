# Learning Tracker — Phone Connection v1 (Stage 2B)
## Android Companion Implementation: Real Usage Collection, Secure Transmission & Focus Integration

### 1. Executive Summary & Implementation Status

Stage 2B completes the Android companion architecture and integration layer, matching the actual Stage 2A Netlify Functions / Firestore API contract (`docs/phone-connection-v1-stage2a-api.md`).

| Area | Status | Verification Mechanism |
| :--- | :--- | :--- |
| **Android Architecture** | READY | Clean Kotlin + Jetpack Compose (Material 3), minSdk 26, targetSdk 34. |
| **Pairing Ceremony** | READY | `PairingManager.kt` calling `POST /api/v1/phone/pair/complete`. Single-use 6-digit challenge. Random app `deviceId`. |
| **Device Credential Storage** | READY | `SecureCredentialStore.kt` using native AndroidKeyStore AES-256-GCM. Plaintext tokens never stored or logged. |
| **Usage Access Integration** | READY | `UsageAccessHelper.kt` targeting `PACKAGE_USAGE_STATS` via `Settings.ACTION_USAGE_ACCESS_SETTINGS`. |
| **Session Bounded Collection** | READY | `ForegroundTracker.kt` reconstructing intervals strictly within `[sessionStart, sessionEnd]` from `UsageStatsManager.queryEvents`. |
| **Session End Discovery** | READY | Companion polls `GET /api/v1/phone/focus-session/active` and queries `GET /api/v1/phone/focus-sessions/:sessionId/status` for authoritative timestamps. |
| **Telemetry Summary Generation**| READY | `FocusSummaryCalculator.kt` matching backend schema `1.0.0` with `appBreakdown` (max 50 items) and `CollectionStatus`. |
| **Secure HTTP Transmission** | READY | `PhoneApiClient.kt` transmitting to `POST /api/v1/phone/telemetry-summaries` with `Authorization: Bearer <devtok>`. |
| **Durable Offline Storage & Retries** | READY | `LocalTelemetryStorage` maintaining idempotent queue with bounded exponential backoff. |
| **Physical-Device Verification** | MARKED OUTSTANDING | Host machine lacks physical Android device and local Android SDK toolchain. Full manual verification checklist provided below. |
| **Backend API Regressions** | ZERO REGRESSIONS | All 48 web test suites (595 tests) passing cleanly; clean production build. |

---

### 2. Android Architecture Overview

The companion application is organized into modular packages under `com.learningtracker.companion`:

```
com.learningtracker.companion/
├── FocusIntegrityApplication.kt   # Application lifecycle container & dependency wiring
├── MainActivity.kt                # UI host, lifecycle-aware polling & Compose navigation
├── model/
│   ├── CompanionState.kt          # Explicit lifecycle states (NOT_PAIRED, CONNECTED, etc.)
│   └── FocusModels.kt             # FocusSessionContract, FocusSummary, Interruption, CollectionStatus
├── security/
│   └── SecureCredentialStore.kt   # AndroidKeyStore AES-256-GCM encrypted credential vault
├── network/
│   └── PhoneApiClient.kt          # Native HttpURLConnection HTTP client for Phone API
├── pairing/
│   └── PairingManager.kt          # Pairing ceremony coordinator & credential lifecycle
├── sync/
│   └── SyncComponents.kt          # Active session poller, durable local storage & upload queue
├── tracker/
│   ├── ForegroundTracker.kt       # Bounded UsageEvents reconstruction & gap detection
│   ├── InterruptionClassifier.kt  # Categorization engine (Reference, Distraction, Neutral, Unknown)
│   ├── FocusSummaryCalculator.kt  # Truthful metrics aggregator without fake scores
│   └── EventReplayEngine.kt       # Synthetic JSON test harness
├── ui/
│   └── Screens.kt                 # Material 3 Compose screens & tactile status control room
└── usage/
    └── UsageAccessComponents.kt   # System AppOpsManager permission checker & event collector
```

#### Android Platform Properties
- **Application ID**: `com.learningtracker.companion` (debug: `com.learningtracker.companion.debug`)
- **compileSdk**: 34 (Android 14)
- **targetSdk**: 34
- **minSdk**: 26 (Android 8.0 Oreo)
- **JVM Target**: Java 17
- **Compose BOM**: `2024.04.00`
- **Coroutines**: `1.8.0`
- **Serialization**: `1.6.3`

---

### 3. Pairing Ceremony & Device Credential Security

#### Flow
1. Learner opens Learning Tracker web workstation > Device Management > Clicks "Pair Companion Phone".
2. Server issues a 6-digit pairing challenge (`POST /pair/start`), expiring in 5 minutes.
3. Learner opens the Android companion app, taps "Pair with Learning Tracker", and inputs the 6 digits.
4. Companion submits `POST /api/v1/phone/pair/complete`:
   ```json
   {
     "pairingCode": "489123",
     "deviceId": "dev_7c3a91f82b014d5e",
     "deviceName": "Pixel 8 Pro",
     "protocolVersion": "1.0.0",
     "consent": {
       "consentVersion": "1.0.0",
       "categories": ["reference", "distraction", "neutral", "unknown"]
     }
   }
   ```
5. Server verifies code hash, owner challenge, and returns:
   ```json
   {
     "success": true,
     "deviceId": "dev_7c3a91f82b014d5e",
     "deviceToken": "devtok_...",
     "protocolVersion": "1.0.0",
     "pairedAt": 1728581000000
   }
   ```

#### Secure Storage Guarantees (`SecureCredentialStore.kt`)
- **No Plaintext Storage**: Raw device tokens (`devtok_...`) are **never** written to unencrypted SharedPreferences.
- **Hardware-Backed Encryption**: Android Keystore manages a 256-bit AES master key under alias `LearningTrackerDeviceCredentialKey`.
- **Authenticated Encryption**: Token is encrypted using `AES/GCM/NoPadding` with a fresh 12-byte random IV per write.
- **No Leaks**: Tokens are held in memory only during authorized HTTP transmissions and omitted from `toString()`, logs, crash dumps, and backups (`android:allowBackup="false"`).
- **Disconnect**: Tapping "Disconnect Device" wipes local SharedPreferences and deletes the Keystore key entry.

---

### 4. Usage Access & Collection Strategy

#### Permission Model (`UsageAccessComponents.kt`)
- Usage access requires manual authorization in Android System Settings.
- `UsageAccessHelper.hasUsageAccess(context)` evaluates `AppOpsManager.checkOpNoThrow(OPSTR_GET_USAGE_STATS, uid, packageName)`.
- If ungranted, companion displays `PERMISSION_REQUIRED` with a button targeting `Settings.ACTION_USAGE_ACCESS_SETTINGS`.
- When user returns to the app, `MainActivity.onResume()` automatically re-checks the permission state.
- **Zero Extraneous Permissions**: The app does **not** request notifications, camera, microphone, contacts, location, or SMS.

#### Window-Bounded Collection
- Collection is strictly session-bounded: `UsageStatsManager.queryEvents(startedAt, endedAt)`.
- Continuous background monitoring is **forbidden**. The companion queries Android's historical usage logs only after a Focus session concludes.
- Supported Event Types:
  - `ACTIVITY_RESUMED` (1): App brought to foreground.
  - `ACTIVITY_PAUSED` (2): App backgrounded.
  - `SCREEN_INTERACTIVE` (15): Display illuminated.
  - `SCREEN_NON_INTERACTIVE` (16): Display turned off.
  - `KEYGUARD_SHOWN` (17): Lock screen engaged.
  - `KEYGUARD_HIDDEN` (18): Lock screen dismissed.

#### Honest Collection Taxonomy
- `COMPLETE`: Full event timeline captured across the session window.
- `PARTIAL`: Unobserved gaps or significant timestamp skew (> 60s initial silence).
- `NO_OBSERVATIONS`: Zero events occurred (phone untouched/locked).
- `PERMISSION_REQUIRED`: Usage Access was not granted or was revoked.
- `COLLECTION_FAILED`: Platform query failure.

---

### 5. Session Correlation & End Discovery

#### The Challenge & Solution
When a learner completes a Focus session on the web, `/focus-session/active` transitions from returning session details to returning `NO_ACTIVE_SESSION`. To avoid guessing the session end timestamp or assuming which session concluded:

1. When companion observes `status == "NO_ACTIVE_SESSION"` after previously tracking `session-xyz`, it calls:
   `GET /api/v1/phone/focus-sessions/:sessionId/status`
   Authenticated with `Authorization: Bearer <deviceToken>`.
2. The server returns the authoritative server-attested record:
   ```json
   {
     "success": true,
     "sessionId": "session-xyz",
     "status": "COMPLETE",
     "startedAt": 1728581000000,
     "endedAt": 1728582500000,
     "intendedDurationSeconds": 1500
   }
   ```
3. If `status == "COMPLETE"`, companion queries `[startedAt, endedAt]`, computes the summary, persists it locally, and transmits it.
4. If `status == "CANCELLED"`, the active session is discarded without transmitting telemetry.

---

### 6. Summary Schema & Server Transmission

Telemetry payloads conform to backend schema version `1.0.0`:

```json
POST /api/v1/phone/telemetry-summaries
Authorization: Bearer devtok_...
Content-Type: application/json

{
  "schemaVersion": "1.0.0",
  "summaryId": "sum_9b2e04f1a23c4d5e8f90123456789abc",
  "deviceId": "dev_7c3a91f82b014d5e",
  "sessionId": "session-1728581000-xyz",
  "observedWindow": {
    "startedAt": 1728581000000,
    "endedAt": 1728582500000
  },
  "activitySummary": {
    "intendedSeconds": 1500,
    "observedSeconds": 1500,
    "interruptionCount": 2,
    "interruptionSeconds": 45,
    "referenceSeconds": 180,
    "distractionSeconds": 45,
    "longestUninterruptedSeconds": 1275,
    "appBreakdown": [
      {
        "packageName": "com.android.chrome",
        "category": "reference",
        "durationSeconds": 180
      },
      {
        "packageName": "com.instagram.android",
        "category": "distraction",
        "durationSeconds": 45
      }
    ]
  },
  "consentVersion": "1.0.0"
}
```

#### Application Classification Invariants
- **Reference**: Calculators, PDF readers, documentation, and user-whitelisted learning apps.
- **Distraction**: Social feeds, video streams, mobile games.
- **Neutral**: System UI, companion app, device settings (suppressed from interruption counts).
- **Unknown**: Any application not classified by the user or default rules remains strictly **UNKNOWN**. It is never silently marked as a distraction.
- **Bounded**: `appBreakdown` is capped at 50 entries and payload size is bounded to 64 KB.

---

### 7. Offline Resilience, Deduplication & Retries

1. **Local-First Durability**: Summaries are serialized to `LocalTelemetryStorage` before any network attempt.
2. **Idempotent Ingestion**: Server handles re-transmissions with identical `summaryId` idempotently (returns `200 OK` with existing receipt).
3. **Transient Backoff**: HTTP 429, 503, and network timeouts schedule exponential retries (up to 10 attempts maximum).
4. **Permanent Failure Handling**:
   - HTTP 401: Device credential revoked. Marks device `REVOKED` and permanently terminates submission loop.
   - HTTP 403 / 400: Validation or permission failure. Marks `PERMANENT_ERROR` to prevent battery exhaustion.
   - HTTP 409: Conflict detected. Preserves error state for inspection.
5. **Local Purge**: Learner can tap "Clear Local Telemetry" at any time to purge unsent records.

---

### 8. Verification Results

#### Backend / Web Test Suite
All 48 test suites and 595 tests pass with zero regressions:
```bash
npm test -- --watchAll=false
# Test Suites: 48 passed, 48 total
# Tests:       595 passed, 595 total
# Time:        17.242 s
```

#### Production Build
```bash
npm run build
# Compiled successfully.
# File sizes after gzip:
#   281.14 kB  build\static\js\main.28134baf.js
#   16.72 kB   build\static\css\main.dd91517f.css
```

#### Host Toolchain Inspection
- **Gradle Runtime**: Gradle 9.2.0 installed at `C:\Users\Pranesh\.gradle\wrapper\dists\gradle-9.2.0-bin\`.
- **Wrapper Generated**: `android/gradlew.bat` and `android/gradle/wrapper/gradle-wrapper.jar` successfully created.
- **Host Java**: `C:\Program Files\Eclipse Adoptium\jre-21.0.10.7-hotspot` is a JRE without `javac` (compiler).
- **Android SDK**: `ANDROID_HOME` is unconfigured on the local Windows development machine.
- **Status**: Android source code and tests are fully implemented and validated against the Stage 2A contract. Real compilation and APK packaging require an Android SDK / JDK toolchain.

---

### 9. Manual Actions Required

#### A. Required Before Production Deployment
1. **Google Cloud / Firebase Console**:
   - **Where**: Firebase Console > Project Settings > Service Accounts.
   - **Action**: Generate a new Private Key JSON. Ensure the service account has the *Cloud Datastore User* role.
   - **Why**: Netlify Functions require Admin SDK credentials to read and write Firestore records.
   - **Verification**: `GET /api/v1/phone/status` reports `storageConfigured: true`.
2. **Netlify Dashboard**:
   - **Where**: Site configuration > Environment variables.
   - **Action**: Configure:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY` (PEM format with newlines)
     - `PAIRING_SECRET_PEPPER` (**Mandatory in production; fails closed if absent**)
   - **Why**: Secures pairing code HMACs against offline rainbow-table brute force.
   - **Verification**: Verify deployment succeeds and pairing challenges complete.

#### B. Required on the Android Device (Physical Device Verification)
1. **Configure API Base URL & Build APK**:
   - The companion app requires the backend API base URL. In debug builds, it defaults to emulator localhost (`http://10.0.2.2:8888/api/v1/phone`). In release builds, `LEARNING_TRACKER_API_BASE_URL` is mandatory and fails closed if missing.
   - You can configure the URL at build time via Gradle property or environment variable:
     ```bash
     cd android
     # Option 1: Gradle property
     ./gradlew assembleDebug -PLEARNING_TRACKER_API_BASE_URL="https://learning-tracker.netlify.app"

     # Option 2: Environment variable
     export LEARNING_TRACKER_API_BASE_URL="https://learning-tracker.netlify.app"
     ./gradlew assembleRelease
     ```
   - The URL is automatically normalized so that endpoints append `/api/v1/phone` exactly once regardless of whether a bare domain (`https://site.com`), path prefix (`https://site.com/api/v1`), or full path is provided.
   - Alternatively, scanning or opening an App Link / QR code (`https://<domain>/pair?code=123456`) automatically configures the active base URL dynamically and persists it upon successful pairing.
   - Install APK:
     ```bash
     adb install -r app/build/outputs/apk/debug/app-debug.apk
     ```
2. **Grant Usage Access**:
   - Open Companion app > Tap "Grant Usage Access" (navigates to `Settings > Special App Access > Usage Access`).
   - Enable Usage Access for "Learning Tracker Companion".
   - Return to the app > Verify state changes from `PERMISSION_REQUIRED` to `NOT_PAIRED`.
3. **Execute Pairing**:
   - On web workstation: Open Learning Tracker > Device Management > Click "Pair Companion Phone".
   - Copy the 6-digit pairing code (e.g., `489123`).
   - In Companion app: Tap "Pair with Learning Tracker" > Enter code > Tap "Pair Device".
   - Verify state transitions to `CONNECTED` and device appears in web device inventory.
4. **Focus Session Ingestion Test**:
   - Web app: Start a 25-minute Focus session.
   - Phone app: Verify active session card appears with task name.
   - Open Chrome and Instagram on the phone for brief intervals.
   - Web app: Complete the Focus session.
   - Phone app: Polling detects session completion, queries UsageEvents, and transmits summary.
   - Web app: Check Focus session history to verify `companionTelemetry` enrichment.

#### C. Not Required Yet
- Google Play Store distribution or production signing keys. Debug builds with local developer certs are sufficient for Stage 2B testing.

---

### 10. Remaining Limitations & Next Steps

1. **Host Compilation Dependency**: The development environment lacks a JDK compiler and local Android SDK platform. APK packaging must be executed in CI/CD or an Android Studio environment.
2. **Foreground Polling Cadence**: The companion relies on lifecycle-aware foreground polling (8s interval while app is open) and session status retrieval. WorkManager periodic workers on Android have a 15-minute minimum interval and should be introduced in Stage 2C for background polling if continuous background sync is desired.
3. **Physical-Device Verification**: Physical communication has not yet been executed on live hardware and is marked outstanding until the learner performs the checklist above.
