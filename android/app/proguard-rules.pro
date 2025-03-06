# Keep React Native core classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.common.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Expo-related classes
-keep class expo.modules.** { *; }
-keep class org.unimodules.** { *; }

# Keep React Native Reanimated classes (you already had this)
-keep class com.swmansion.reanimated.** { *; }

# Keep React Native TurboModules
-keep class com.facebook.react.turbomodule.** { *; }

# Keep Lifecycle components
-keep class androidx.lifecycle.** { *; }
-keep class androidx.lifecycle.DefaultLifecycleObserver { *; }

# Keep Gson (if used)
-keep class com.google.gson.** { *; }

# Keep annotation processors
-keepattributes *Annotation*
