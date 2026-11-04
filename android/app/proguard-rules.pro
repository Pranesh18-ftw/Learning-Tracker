# Proguard rules for Learning Tracker Companion
-keepattributes *Annotation*
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}

# WorkManager ListenableWorker reflection
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class com.learningtracker.companion.work.** { *; }

