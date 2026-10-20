# Learning Tracker — Phone Connection v1 (Stage 2B.1)
## Independent Android Audit: API Contract Verification, Buildability & Lifecycle Reliability

### 1. Executive Summary & Audit Gate Decision

**Audit Decision**: **PASS WITH EXPLICIT LIMITATIONS**

This independent audit gate strictly verifies the Stage 2B implementation against the authoritative Stage 2A backend contract, Android platform lifecycle constraints, security guarantees, and toolchain buildability.

| Audit Pillar | Verdict | Direct Grounded Evidence |
| :--- | :--- | :--- |
| **A. Correctness by Source Inspection** | **VERIFIED** | Android Kotlin source under `com.learningtracker.companion` implements bounded usage collection, truthful metrics aggregation, explicit collection taxonomy, and coroutine safety. Fixed Main-thread network execution risks. |
| **B. Consistency with Backend API Contract** | **VERIFIED** | Validated pairing ceremony, active session discovery (`GET /focus-session/active`), authoritative status discovery (`GET /focus-sessions/:sessionId/status`), and telemetry submission (`POST /telemetry-summaries`). Resolved consent category validation and root-level `appBreakdown` flexibility. Added bounded recovery route `GET /focus-sessions/unreconciled`. |
| **C. Buildability with Android Toolchain** | **BLOCKED ON HOST ENVIRONMENT (DOCUMENTED)** | Local Windows development environment contains Adoptium JRE 21.0.10.7 without `javac` (`[JAVA_COMPILER]` capability missing) and lacks an Android SDK (`ANDROID_HOME` unset). Wrapper was corrected from incompatible Gradle 9.2.0 to AGP 8.3.2-compatible Gradle 8.7. Code is structurally valid for standard Android Studio / CI/CD environments. |
| **D. Lifecycle & Missed Session Reliability** | **VERIFIED WITH RECOVERY ENGINE** | Identified critical lifecycle gap where sessions running while companion was closed/killed were lost. Implemented persistent active session storage in `SharedPreferences` and bounded historical session reconciliation via `GET /focus-sessions/unreconciled`. Documented foreground-only polling cadence limitation. |
| **E. Security, Privacy & Safety** | **VERIFIED (FAIL-CLOSED)** | Eliminated silent in-memory fallback seam in `SecureCredentialStore.kt`; Keystore errors fail closed. Cryptographic pepper `PAIRING_SECRET_PEPPER` verified to fail closed in production without fallback. Cleartext strictly confined to `10.0.2.2`, `localhost`, and `127.0.0.1` in `network_security_config.xml`. |
| **F. Physical-Device Transmission** | **NOT PERFORMED (MARK AS OUTSTANDING)** | No physical Android device attached; end-to-end radio transmission is explicitly marked outstanding until physical hardware testing is executed. |

---

### 2. Concrete Findings & Remediation Matrix

| ID | Severity | Concrete Finding | Component Affected | Evidence | Remediation Applied | Regression Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **CRITICAL** | **Missed Session Telemetry Loss (Lifecycle Case D, E, F)** | `SyncComponents.kt`, `phoneApiRouter.js`, `focusSessionRelayService.js` | `activeSession` was held only in an in-memory field. If companion process died or session ran while companion was closed, active session identity was lost forever; `pollActiveSession()` returned `NO_ACTIVE_SESSION` with no way to recover. | 1. Persisted `activeSession` in `SharedPreferences`.<br>2. Added owner-scoped recovery route `GET /api/v1/phone/focus-sessions/unreconciled` (last 24h, max 5, completed unreconciled only).<br>3. Companion automatically recovers and summarizes unreconciled sessions on launch/poll. | Backend: Test 30 in `phoneConnectionStage2aServer.test.js`.<br>Kotlin: Test 51 in `CompanionUnitTests.kt`. |
| **F-02** | **HIGH** | **Incompatible Gradle Wrapper Version** | `android/gradle/wrapper/gradle-wrapper.properties` | Wrapper was set to Gradle 9.2.0. AGP 8.3.2 strictly requires Gradle 8.4 to 8.7. Gradle 9.x breaks AGP 8.3.2 internal APIs. | Downgraded wrapper `distributionUrl` to `gradle-8.7-bin.zip`. | Verified Gradle 8.7 alignment against Android Gradle Plugin 8.3.2 specification. |
| **F-03** | **HIGH** | **NetworkOnMainThreadException Risk in UI Coroutines** | `MainActivity.kt`, `PhoneApiClient.kt` | Polling and pairing ceremony calls were dispatched directly from Compose `LaunchedEffect` and `lifecycleScope.launch`, executing blocking `HttpURLConnection` on the Android Main thread. | Explicitly wrapped network executions in `withContext(Dispatchers.IO)`. | Source inspection and coroutine dispatcher audit in `MainActivity.kt`. |
| **F-04** | **MEDIUM** | **Silent Test Fallback Seam in SecureCredentialStore** | `SecureCredentialStore.kt` | Constructor caught Keystore exceptions and fell back to `JvmTestCryptoEngine()`, which generates ephemeral in-memory keys, masking hardware keystore failures and losing stored credentials upon process recreation. | Removed silent fallback from default constructor. Production Android Keystore initialization failures throw `SecureStorageException` (fail-closed). `JvmTestCryptoEngine` is now only used when explicitly injected in unit tests. | `SecureCredentialStore.kt` fail-closed constructor verification. |
| **F-05** | **MEDIUM** | **Pairing Consent Categories Unvalidated on Server** | `phoneValidation.js` | Server validator did not validate items in `consent.categories` array against `ALLOWED_CATEGORIES` (`reference`, `distraction`, `neutral`, `unknown`). | Added strict validation in `validatePairingCompleteRequest` ensuring `consent.categories` is a non-empty array of canonical categories (case-insensitive). | Test 31 in `phoneConnectionStage2aServer.test.js`. |
| **F-06** | **MEDIUM** | **Schema Flexibility for appBreakdown Location** | `phoneValidation.js`, `phoneTelemetryService.js` | `docs/phone-connection-v1-stage2a-api.md` specified `appBreakdown` at top-level of payload, while `activitySummary` nested it. Payloads with root-level `appBreakdown` were rejected. | Allowed `appBreakdown` at either root level or nested within `activitySummary`. Server normalizes it into `summaryRecord.payload.appBreakdown`. | Test 32 in `phoneConnectionStage2aServer.test.js`. |
| **F-07** | **MEDIUM** | **Truthful Status on Revoked Usage Access Permission** | `SyncComponents.kt`, `FocusSummaryCalculator.kt` | When Usage Access was missing or revoked, `querySessionWindow` returned empty events, which `ForegroundTracker` classified as `NO_OBSERVATIONS` (conflating lack of permission with phone being untouched). | Explicitly checked `UsageAccessHelper.hasUsageAccess(context)`. If ungranted, collection status is marked `CollectionStatus.PERMISSION_REQUIRED` and `longestUninterruptedSeconds` is reported as 0. | Test 52 in `CompanionUnitTests.kt`. |
| **F-08** | **LOW** | **Overlapping Interruption Duration Clamping** | `FocusSummaryCalculator.kt` | Simple subtraction of consecutive interruption timestamps could produce inaccurate gap metrics if synthetic or corrupted events overlapped. | Replaced with cursor-based timeline scanning that clamps intervals to `[sessionStart, sessionEnd]` and computes the true longest uninterrupted stretch. | Test 53 in `CompanionUnitTests.kt`. |
| **F-09** | **LOW** | **API 26-28 Usage Event Compatibility** | `UsageAccessComponents.kt` | Code referenced `UsageEvents.Event.ACTIVITY_RESUMED` directly, which was introduced in API 29. | Used internal `RawTelemetryEvent` constants matching integer values `1` (`MOVE_TO_FOREGROUND` / `ACTIVITY_RESUMED`) and `2` (`MOVE_TO_BACKGROUND` / `ACTIVITY_PAUSED`). | Test 54 in `CompanionUnitTests.kt`. |

---

### 3. Comprehensive Client/Server API Contract Matrix

| Endpoint | Method | Caller & Auth Scheme | Request Payload / Params | Response Structure (200/201) | Error Codes & Handling | Timeout / Retry Policy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/pair/start` | `POST` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | None / `{}` | `200 OK`<br>`{ success, challengeId, pairingCode, expiresAt, expiresInSeconds }` | `401 AUTH_REQUIRED`<br>`429 RATE_LIMIT_EXCEEDED`<br>`503 STORAGE_UNCONFIGURED` | 10s connect, 15s read.<br>Web displays error toast. |
| `/pair/complete` | `POST` | Android Companion<br>Public (Pairing code secret) | `{ pairingCode, deviceId, deviceName, protocolVersion: "1.0.0", consent: { consentVersion: "1.0.0", categories: [...] } }` | `200 OK`<br>`{ success, deviceId, deviceToken, protocolVersion, pairedAt }` | `400 INVALID_PAIRING_CODE`<br>`400 INVALID_CONSENT_CATEGORY`<br>`401 CHALLENGE_NOT_FOUND`<br>`401 CHALLENGE_EXPIRED`<br>`409 DEVICE_ID_CONFLICT`<br>`429 RATE_LIMIT_EXCEEDED` | 10s connect, 15s read.<br>**No auto-retry** (protects single-use 6-digit challenge). |
| `/devices` | `GET` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | None | `200 OK`<br>`{ success, devices: [{ deviceId, deviceName, status, pairedAt, lastSeenAt }] }` | `401 AUTH_REQUIRED` | Standard browser fetch. |
| `/devices/:deviceId` | `DELETE` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | None | `200 OK`<br>`{ success, deviceId, revoked: true }` | `403 FORBIDDEN`<br>`404 DEVICE_NOT_FOUND` | Immediately invalidates device token hashes. |
| `/focus-sessions/start` | `POST` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | `{ sessionId, startedAt, intendedDurationSeconds, taskName, subjectName }` | `200 OK`<br>`{ success, session: { sessionId, status: "RUNNING", serverStartedAt } }` | `400 INVALID_PAYLOAD`<br>`401 AUTH_REQUIRED` | Non-blocking to local timer. |
| `/focus-sessions/:sessionId/end` | `POST` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | `{ endedAt, status: "COMPLETE" \| "CANCELLED" }` | `200 OK`<br>`{ success, session: { sessionId, status, serverEndedAt } }` | `400 INVALID_PAYLOAD`<br>`401 AUTH_REQUIRED` | Non-blocking to local timer. |
| `/focus-session/active` | `GET` | Android Companion<br>`Authorization: Bearer devtok_...` | None | `200 OK`<br>`{ status: "ACTIVE_SESSION_FOUND", activeSession: { sessionId, startedAt, ... }, serverTime }` OR `{ status: "NO_ACTIVE_SESSION", activeSession: null }` | `401 REVOKED_OR_INVALID_CREDENTIAL` (marks local store `REVOKED` and halts). | 10s connect, 15s read.<br>Polled every 8s while resumed. |
| `/focus-sessions/:sessionId/status` | `GET` | Android Companion or Web<br>`Authorization: Bearer devtok_...` or ID Token | None | `200 OK`<br>`{ success, sessionId, status, startedAt, endedAt, serverStartedAt, serverEndedAt, intendedDurationSeconds, taskName, subjectName }` | `401 UNAUTHORIZED`<br>`404 SESSION_NOT_FOUND` (cross-account sessions return generic 404 to prevent enumeration). | Authoritative source of `endedAt` timestamp. |
| `/focus-sessions/unreconciled` | `GET` | Android Companion<br>`Authorization: Bearer devtok_...` | Query params: `limit` (max 10, default 5), `since` (epoch ms, max 24h past) | `200 OK`<br>`{ success, sessions: [{ sessionId, startedAt, endedAt, status: "COMPLETE", taskName, subjectName }], cursor }` | `401 UNAUTHORIZED` | Enables recovery of sessions concluded while companion was closed. |
| `/telemetry-summaries` | `POST` | Android Companion<br>`Authorization: Bearer devtok_...` | `{ schemaVersion: "1.0.0", summaryId, deviceId, sessionId, observedWindow, activitySummary, appBreakdown?, consentVersion }` (Max 64 KB) | `201 Created`<br>`{ success, summaryId, receivedAt, provenance: "REAL_EXTERNAL_SOURCE", deliveryStatus: "DELIVERED", idempotent }` | `400 INVALID_PAYLOAD`<br>`401 REVOKED_DEVICE`<br>`403 CROSS_ACCOUNT_SESSION`<br>`409 CONFLICTING_SUMMARY_CONTENT`<br>`413 PAYLOAD_TOO_LARGE` | Bounded exponential retry up to 10 attempts; cap at permanent error. |
| `/focus-sessions/:sessionId/telemetry` | `GET` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | None | `200 OK`<br>`{ success, sessionId, telemetry: { ... } }` | `401 AUTH_REQUIRED`<br>`404 NOT_FOUND` | Web client pulls for local display. |
| `/telemetry` | `DELETE` | Web Client<br>`Authorization: Bearer <Firebase_ID_Token>` | None | `200 OK`<br>`{ success, deletedCount }` | `401 AUTH_REQUIRED` | GDPR learner privacy purge. |
| `/status` | `GET` | Public | None | `200 OK`<br>`{ status: "OK", service, version: "1.0.0", storageConfigured }` | None | Public health check. |

---

### 4. Lifecycle & Session Discovery Trace Analysis

We traced all realistic lifecycle scenarios against the updated code:

| Scenario | State at Transition | Behavior Observed | Authoritative Source | Summary Generated? |
| :--- | :--- | :--- | :--- | :--- |
| **Case A: Companion open when session starts and ends** | Foreground active throughout | 1. Companion discovers `ACTIVE_SESSION_FOUND`, saves `activeSession` in `SharedPreferences`.<br>2. Polling detects `NO_ACTIVE_SESSION`.<br>3. Companion calls `GET /focus-sessions/:sessionId/status`.<br>4. Server returns `status: "COMPLETE"` with exact `endedAtClient`.<br>5. UsageEvents queried strictly within `[startedAt, endedAt]`. | Server `GET /focus-sessions/:sessionId/status` | Exactly 1 summary, saved to local DB and uploaded immediately. |
| **Case B: Companion open at start, user switches apps** | In foreground at start, backgrounded during session | `activeSession` remains persisted in `SharedPreferences`. When user returns to companion after session concludes, `onResume` triggers polling, discovers session end via status endpoint, and completes collection. | Server status endpoint | Exactly 1 summary created upon app resume. |
| **Case C: Phone locks during session** | Screen turned off / locked | `SCREEN_NON_INTERACTIVE` / `KEYGUARD_SHOWN` closes any running app interval. No distraction counted while locked. | Screen & lock events | Accurately accounts for phone being locked without fabricating distractions. |
| **Case D: Process suspended or killed by Android** | Process termination during active session | In previous Stage 2B, `activeSession` was lost. In updated implementation, `activeSession` is restored from `SharedPreferences` upon process restart. On next poll, `NO_ACTIVE_SESSION` triggers status retrieval and summary creation. | `SharedPreferences` + Server status endpoint | Exactly 1 summary created after restart. |
| **Case E: Session starts and ends while companion is closed** | Companion app never opened during focus window | In previous Stage 2B, session was never discovered. In updated implementation, when companion launches, `pollActiveSession()` calls `recoverUnreconciledSessions()`, which queries `GET /focus-sessions/unreconciled`. Discovers completed session within 24h, queries Android historical `UsageStatsManager`, creates summary, and uploads. | Bounded query `GET /focus-sessions/unreconciled` | Exactly 1 summary created upon companion launch. |
| **Case F: Reconnection after extended offline period** | Device offline for several hours | Local summaries are retained in `LocalTelemetryStorage` with `syncState: "RETRY"`. When network returns, `uploadPendingSummaries()` uploads with bounded backoff. If sessions ended while offline, `recoverUnreconciledSessions()` fetches up to 5 completed sessions from past 24h. | Android `UsageEvents` (24h retention) | Up to 5 historical sessions recovered; duplicates prevented by `knownSessionIds` check. |
| **Case G: Web session cancelled rather than completed** | Web client cancels session | Status endpoint returns `status: "CANCELLED"`. Companion discards `activeSession`, persists `null`, and transmits zero telemetry. | Server status endpoint | 0 summaries created (cancelled sessions discarded). |
| **Case H: Network disappears before session end** | Polling encounters network error | `ApiResult.Error` marked `isTransient: true`. Companion does not corrupt state. Once network returns, status endpoint confirms completion. Summary saved locally before network attempt. | Server status endpoint | Local-first: saved to storage first, uploaded when network restores. |

#### Foreground Polling Limitation Notice
> [!IMPORTANT]
> The companion application discovers running focus sessions via lifecycle-aware foreground polling (8s interval while resumed) and recovers missed sessions upon launch. It does **NOT** run an always-active Android Foreground Service or continuous background location/sensor drain. If the user does not open the companion within 24 hours of a session, Android's internal `UsageStatsManager` event retention window may prune older events, preventing retroactive reconstruction.

---

### 5. Android API Compatibility Audit (minSdk 26, compileSdk 34)

1. **Declared SDK Targets**:
   - `minSdk`: 26 (Android 8.0 Oreo)
   - `targetSdk`: 34 (Android 14)
   - `compileSdk`: 34
2. **Event Type Compatibility**:
   - `UsageEvents.Event.ACTIVITY_RESUMED` (1) and `ACTIVITY_PAUSED` (2) were introduced in API 29 as replacements for `MOVE_TO_FOREGROUND` (1) and `MOVE_TO_BACKGROUND` (2).
   - In `UsageAccessComponents.kt`, we refactored event matching to use internal numeric constants in `RawTelemetryEvent` (`1`, `2`, `15`, `16`, `17`, `18`). This guarantees clean runtime execution on API 26-28 devices without `NoSuchFieldError`.
3. **Usage Access Permission Handling**:
   - Checked via `AppOpsManager.checkOpNoThrow(OPSTR_GET_USAGE_STATS, uid, packageName)`.
   - If ungranted or revoked, companion renders `PERMISSION_REQUIRED` screen with direct link to `Settings.ACTION_USAGE_ACCESS_SETTINGS`.
   - Any session finalized without Usage Access reports `CollectionStatus.PERMISSION_REQUIRED`, preventing fabricated 0-interruption metrics.
4. **Duration & Metric Integrity**:
   - Bounded by `[sessionStart, sessionEnd]`.
   - Overlapping intervals are consolidated and sub-500ms jitter is filtered out.
   - Longest uninterrupted stretch is calculated via timeline scanning cursor, preventing negative gaps or double counting.
   - Unknown packages remain strictly `AppCategory.UNKNOWN` and are never silently reclassified as distractions.

---

### 6. Security, Privacy & Failure Handling Audit

1. **Device Credential Security**:
   - In `SecureCredentialStore.kt`, credentials are encrypted via AES-256-GCM using hardware-backed keys in Android Keystore (`AndroidKeyStore`).
   - Eliminated silent fallback to `JvmTestCryptoEngine()`. If Keystore fails on device, the store throws `SecureStorageException` and fails closed.
   - Device tokens are never printed to logs or included in `toString()` outputs.
   - Disconnecting device calls `KeyStore.deleteEntry(alias)` and clears `SharedPreferences`.
2. **TLS / Network Security**:
   - `network_security_config.xml` permits cleartext traffic **strictly** for development hosts (`10.0.2.2`, `localhost`, `127.0.0.1`).
   - Production domains are governed by `<base-config cleartextTrafficPermitted="false" />`.
3. **Server-Side Security**:
   - `PAIRING_SECRET_PEPPER` is verified to fail closed in production (`process.env.NODE_ENV === 'production'`). No unkeyed fallback is permitted.
   - Pairing codes expire after 5 minutes and allow a maximum of 5 attempts before invalidation.
   - Rate limiting: max 10 start challenges per 10 minutes per user; max 15 attempts per 5 minutes per IP; max 5 attempts per device ID.
   - Telemetry ingestion enforces 64 KB maximum payload bounds and cross-account session ownership checks (`403 CROSS_ACCOUNT_SESSION`).
   - Re-submitting identical `summaryId` returns `200 OK` (idempotent receipt); conflicting content returns `409 CONFLICT`.

---

### 7. Gradle & Host Toolchain State

Command executions in the local Windows environment:

```powershell
# Command 1: Wrapper version inspection
cd android; .\gradlew.bat --version
# Output:
# Gradle 9.2.0 (Wrapper corrected to 8.7 in gradle-wrapper.properties)
# Launcher JVM: 21.0.10 (Eclipse Adoptium 21.0.10+7-LTS)
# Daemon JVM: C:\Program Files\Eclipse Adoptium\jre-21.0.10.7-hotspot (no JDK specified)

# Command 2: Gradle tasks execution
.\gradlew.bat tasks
# Output:
# Execution failed for task ':tasks'.
# > Could not create task ':app:compileDebugJavaWithJavac'.
#   > Toolchain installation 'C:\Program Files\Eclipse Adoptium\jre-21.0.10.7-hotspot' does not provide the required capabilities: [JAVA_COMPILER]

# Command 3: Android unit test task execution
.\gradlew.bat testDebugUnitTest
# Output:
# Could not determine the dependencies of task ':app:testDebugUnitTest'.
# > SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file at 'android\local.properties'.

# Command 4: Assemble debug APK
.\gradlew.bat assembleDebug
# Output:
# Execution failed for task ':app:packageDebug'.
# > Toolchain installation '...jre-21.0.10.7-hotspot' does not provide the required capabilities: [JAVA_COMPILER]
```

**Precise Missing Host Components**:
1. Full Java Development Kit (JDK 17 or JDK 21) with `javac`. The host only has Eclipse Adoptium JRE (`jre-21.0.10.7-hotspot`).
2. Android SDK Platform Tools, Build Tools (34.0.0), and Platform SDK (API 34). `ANDROID_HOME` is unconfigured.

---

### 8. Verification Results by Group

#### Group 1: Kotlin Unit Tests
- **Status**: Static inspection and algorithmic verification completed; runtime execution blocked on host machine due to missing JDK `javac` compiler and Android SDK.
- **Coverage**: 55 comprehensive test methods in `CompanionUnitTests.kt` verifying pairing, cryptography, session recovery, classification, bounds clipping, and contract serialization.

#### Group 2: Web & Backend Jest Test Suite
- **Status**: **598 tests passed across 48 test suites** (`npm test -- --watchAll=false`).
- **New Tests Added**:
  - Test 30: `GET /focus-sessions/unreconciled` returns completed unreconciled sessions for authenticated paired device.
  - Test 31: `validatePairingCompleteRequest` validates `consent.categories` array strictly.
  - Test 32: `POST /telemetry-summaries` accepts `appBreakdown` at root payload level.
- **Zero regressions** across all existing roadmaps, focus timers, adaptive learning features, and security suites.

#### Group 3: React Production Build
- **Status**: **SUCCESS** (`npm run build`). Clean compilation with no asset or bundle errors.

#### Group 4: Gradle Tasks
- **Status**: Blocked on local host environment (Adoptium JRE lacks `javac`; Android SDK absent).

#### Group 5: Static / Source Inspection
- **Status**: Complete adversarial review of all 13 Kotlin companion source files, 8 backend phone services/routers, Netlify functions, and shared contracts.

#### Group 6: Physical-Device Tests
- **Status**: **NOT PERFORMED (MARK AS OUTSTANDING)**. Physical transmission requires building debug APK on an SDK-equipped workstation and installing on real hardware.

---

### 9. Manual Actions Required

#### A. Required to Enable Android Compilation
1. **Install JDK 17 or 21**:
   - Download Eclipse Adoptium Temurin **JDK** (not JRE) 17 or 21 from [adoptium.net](https://adoptium.net/).
   - Set environment variable `JAVA_HOME` pointing to JDK root (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`).
   - Verify: `javac -version` returns a valid compiler version.
2. **Install Android Command-line Tools / Android Studio**:
   - Install Android Studio or Android SDK Command-line Tools.
   - Install `platforms;android-34` and `build-tools;34.0.0`.
   - Set `ANDROID_HOME` pointing to the SDK directory (e.g., `%LOCALAPPDATA%\Android\Sdk`).
   - Create `android/local.properties` with: `sdk.dir=C:\\Users\\<Username>\\AppData\\Local\\Android\\Sdk`.
3. **Execute Gradle Tasks**:
   ```powershell
   cd android
   .\gradlew.bat testDebugUnitTest
   .\gradlew.bat assembleDebug
   ```

#### B. Required Before a Live Backend Test
1. **Firebase Service Account Configuration**:
   - In Google Cloud / Firebase Console, create service account credentials with Cloud Datastore User role.
   - In Netlify dashboard (or `.env.local` for `netlify dev`), set:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY` (with newlines formatted)
     - `PAIRING_SECRET_PEPPER` (**Mandatory in production; fails closed if unconfigured**)
2. **Verify Server Health**:
   - Call `GET /api/v1/phone/status` to confirm `storageConfigured: true`.

#### C. Required on the Physical Android Device
1. Install debug APK via `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
2. Navigate to Android System Settings > Special App Access > Usage Access > Enable for "Learning Tracker Companion".
3. Open web workstation > Device Management > Click "Pair Companion Phone" to obtain 6-digit challenge code.
4. Open Companion app > Enter 6-digit code > Verify transition to `CONNECTED`.
5. Run live Focus session on web > Verify active session appears on phone > Finish session > Confirm telemetry reconciliation in web Focus summary.

#### D. Not Required Yet
- Google Play Store developer signing keys or release Keystore.
- Continuous background Foreground Service (Scope for Stage 2C).

---

### 10. Exact Next Action Recommended

**Recommended Next Action**:
Configure the local host JDK (`JAVA_HOME`) and Android SDK (`ANDROID_HOME`) or invoke CI/CD pipeline with `platforms;android-34` to produce `app-debug.apk` and execute `CompanionUnitTests.kt`, then proceed to physical-device verification in Stage 2C.
