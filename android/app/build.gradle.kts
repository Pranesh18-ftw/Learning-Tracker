import java.net.URI
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

val configuredApiUrl: String = (project.findProperty("LEARNING_TRACKER_API_BASE_URL") as? String)
    ?: System.getenv("LEARNING_TRACKER_API_BASE_URL")
    ?: ""

val defaultDebugApiUrl = "https://deploy-preview-2--learningtracker001.netlify.app/api/v1/phone"
val defaultReleaseApiUrl = "https://learningtracker001.netlify.app/api/v1/phone"
val effectiveDebugApiUrl = configuredApiUrl.ifBlank { defaultDebugApiUrl }
val effectiveReleaseApiUrl = run {
    val candidate = configuredApiUrl.ifBlank { defaultReleaseApiUrl }
    try {
        val uri = URI(candidate)
        val host = uri.host?.lowercase() ?: ""
        if (uri.scheme != "https" || host in listOf("10.0.2.2", "localhost", "127.0.0.1") || candidate.contains("8888") || candidate.contains("deploy-preview-2")) {
            defaultReleaseApiUrl
        } else {
            candidate
        }
    } catch (_: Exception) {
        defaultReleaseApiUrl
    }
}


// Support local release-signing.properties or environment variables (outside Git)
val releaseSigningPropsFile = project.rootProject.file("release-signing.properties")
val releaseSigningProps = Properties()
if (releaseSigningPropsFile.exists()) {
    releaseSigningPropsFile.inputStream().use { releaseSigningProps.load(it) }
}

val releaseStoreFile = (releaseSigningProps.getProperty("RELEASE_STORE_FILE")
    ?: System.getenv("RELEASE_STORE_FILE"))?.takeIf { it.isNotBlank() }
val releaseStorePassword = (releaseSigningProps.getProperty("RELEASE_STORE_PASSWORD")
    ?: System.getenv("RELEASE_STORE_PASSWORD"))?.takeIf { it.isNotBlank() }
val releaseKeyAlias = (releaseSigningProps.getProperty("RELEASE_KEY_ALIAS")
    ?: System.getenv("RELEASE_KEY_ALIAS"))?.takeIf { it.isNotBlank() }
val releaseKeyPassword = (releaseSigningProps.getProperty("RELEASE_KEY_PASSWORD")
    ?: System.getenv("RELEASE_KEY_PASSWORD"))?.takeIf { it.isNotBlank() }

val hasReleaseSigning = releaseStoreFile != null &&
        releaseStorePassword != null &&
        releaseKeyAlias != null &&
        releaseKeyPassword != null

android {
    namespace = "com.learningtracker.companion"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.learningtracker.companion"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "1.0.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                val keystoreFile = file(releaseStoreFile!!)
                storeFile = keystoreFile
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "PHONE_API_BASE_URL", "\"${effectiveReleaseApiUrl.replace("\"", "\\\"")}\"")
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            buildConfigField("String", "PHONE_API_BASE_URL", "\"${effectiveDebugApiUrl.replace("\"", "\\\"")}\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        languageVersion = "1.9"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX Core & Lifecycle
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.04.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Kotlin Coroutines & Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // Unit Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
    testImplementation("org.json:json:20231013")
    testImplementation("androidx.room:room-testing:2.6.1")
    testImplementation("androidx.test:core:1.5.0")
    testImplementation("androidx.test.ext:junit:1.1.5")
    testImplementation("org.robolectric:robolectric:4.11.1")

    // Room 2.6.1, SQLCipher 4.20.0, AndroidX SQLite 2.7.0
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("net.zetetic:sqlcipher-android:4.20.0")
    implementation("androidx.sqlite:sqlite:2.7.0")

    // WorkManager 2.9.0
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    testImplementation("androidx.work:work-testing:2.9.0")

    // Instrumented Testing
    androidTestImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.test:rules:1.5.0")
    androidTestImplementation("androidx.test:core:1.5.0")
    androidTestImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
    androidTestImplementation("androidx.room:room-testing:2.6.1")

    // Compose Debugging
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

fun validateReleaseApiUrl(rawUrl: String) {
    if (rawUrl.isBlank()) {
        throw GradleException(
            "Missing required configuration: LEARNING_TRACKER_API_BASE_URL is not set. " +
            "Production release builds must specify a valid API base URL (e.g. -PLEARNING_TRACKER_API_BASE_URL=https://learningtracker001.netlify.app or env var)."
        )
    }
    val uri = try {
        URI(rawUrl.trim())
    } catch (e: Exception) {
        throw GradleException(
            "Invalid configuration: LEARNING_TRACKER_API_BASE_URL '$rawUrl' is not a valid URL. ${e.message}"
        )
    }
    val scheme = uri.scheme?.lowercase()
    if (scheme != "https") {
        throw GradleException(
            "Insecure configuration: LEARNING_TRACKER_API_BASE_URL must use the 'https' scheme for production release builds. Found scheme '$scheme' in '$rawUrl'."
        )
    }
    val host = uri.host
    if (host.isNullOrBlank()) {
        throw GradleException(
            "Invalid configuration: LEARNING_TRACKER_API_BASE_URL '$rawUrl' must contain a valid host."
        )
    }
}

val allowUnsigned: Boolean = project.hasProperty("ALLOW_UNSIGNED_RELEASE") ||
    System.getenv("ALLOW_UNSIGNED_RELEASE") == "true"

// Fail closed if release builds attempt to assemble without valid HTTPS URL or without signing credentials
tasks.matching { it.name == "packageRelease" || it.name == "assembleRelease" }.configureEach {
    doFirst {
        validateReleaseApiUrl(effectiveReleaseApiUrl)
        if (!hasReleaseSigning && !allowUnsigned) {
            throw GradleException(
                "Missing release signing credentials: A distributable release APK cannot be produced without production signing. " +
                "Provide credentials via 'android/release-signing.properties' or environment variables " +
                "(RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD). " +
                "To produce an unsigned development bundle for testing, pass -PALLOW_UNSIGNED_RELEASE=true."
            )
        }
    }
}

