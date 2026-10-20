# Direct APK Distribution & Release Signing Guide

## Overview

Learning Tracker Companion is distributed directly as an Android APK (outside the Google Play Store). Because Google Play App Signing is not utilized, **the developer-managed private signing key is the application's permanent root of trust**.

---

## 1. Generating the Release Keystore

Run the standard Java `keytool` command in a secure terminal (outside the repository or in an ignored directory):

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias companion-release \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storetype PKCS12
```

> [!WARNING]
> Back up your `release.keystore` securely. If lost, existing users cannot upgrade without uninstalling the companion (which destroys local un-synced telemetry and pairing associations).

---

## 2. Extracting the SHA-256 Fingerprint for App Links

To establish Android App Links (`https://learningtracker001.netlify.app`), extract the SHA-256 fingerprint:

```bash
keytool -list -v -keystore release.keystore -alias companion-release
```

Locate the `SHA256:` fingerprint line:
```
Certificate fingerprints:
  SHA1:   ...
  SHA256: 14:6D:E9:7F:... (Example)
```

Update `public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.learningtracker.companion",
      "sha256_cert_fingerprints": [
        "PASTE_GENUINE_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Deploy the updated web application to Netlify and confirm that `https://learningtracker001.netlify.app/.well-known/assetlinks.json` responds with `Content-Type: application/json`.

---

## 3. Configuring Local Gradle Signing

Copy `android/release-signing.properties.example` to `android/release-signing.properties`:

```bash
cp android/release-signing.properties.example android/release-signing.properties
```

Edit `android/release-signing.properties` with your actual keystore details:
```properties
RELEASE_STORE_FILE=../release.keystore
RELEASE_STORE_PASSWORD=your_actual_keystore_password
RELEASE_KEY_ALIAS=companion-release
RELEASE_KEY_PASSWORD=your_actual_key_password
```

*(Alternatively, define environment variables `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, and `RELEASE_KEY_PASSWORD` in your build environment).*

---

## 4. Building the Signed Production APK

Run the Gradle release task specifying the canonical production URL:

```bash
cd android
./gradlew assembleRelease -PLEARNING_TRACKER_API_BASE_URL=https://learningtracker001.netlify.app
```

The signed release APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

Verify signature:
```bash
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Security & Fail-Closed Invariants

1. **Keystore Git Exclusion**: `.gitignore` explicitly excludes `*.jks`, `*.keystore`, `*.key`, and `release-signing.properties`.
2. **Fail-Closed Packaging**: `packageRelease` fails closed if:
   - `LEARNING_TRACKER_API_BASE_URL` is omitted.
   - `LEARNING_TRACKER_API_BASE_URL` does not use the `https://` scheme.
   - Release signing credentials are missing (unless `-PALLOW_UNSIGNED_RELEASE=true` is explicitly provided for testing).
3. **Debug Builds**: Debug builds (`assembleDebug`) remain completely independent and usable with the default Android debug keystore and emulator localhost fallback.
