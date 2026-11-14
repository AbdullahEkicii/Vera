package com.abdllhekc.vera

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class AlarmChannelModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmChannelModule"

    // Explicit static references to ensure raw sound resources are NOT stripped by R8 / ProGuard in Release builds
    private fun keepRawResources() {
        val dummy1 = R.raw.azizallah
        val dummy2 = R.raw.adhan_25minutes
        val dummy3 = R.raw.allahu_akbar
        Log.d("AlarmChannelModule", "Raw resources kept: $dummy1, $dummy2, $dummy3")
    }

    @ReactMethod
    fun createAlarmChannel(channelId: String, channelName: String, channelDescription: String, soundName: String, promise: Promise) {
        try {
            keepRawResources()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val context = reactApplicationContext
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                // Always delete and recreate to apply fresh USAGE_ALARM settings
                try { notificationManager.deleteNotificationChannel(channelId) } catch (e: Exception) {}

                val soundResId = context.resources.getIdentifier(soundName, "raw", context.packageName)
                val soundUri: Uri = if (soundResId != 0) {
                    Uri.Builder()
                        .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
                        .authority(context.packageName)
                        .appendPath(soundResId.toString())
                        .build()
                } else {
                    Uri.parse("android.resource://${context.packageName}/raw/$soundName")
                }

                Log.d("AlarmChannelModule", "Creating channel '$channelId' with URI: $soundUri (soundResId: $soundResId)")

                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build()

                val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH).apply {
                    description = channelDescription
                    setSound(soundUri, audioAttributes)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 300, 500)
                    setBypassDnd(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                }

                notificationManager.createNotificationChannel(channel)
                Log.d("AlarmChannelModule", "✅ Channel '$channelId' created with USAGE_ALARM")
                promise.resolve("ok")
            } else {
                promise.resolve("pre-oreo")
            }
        } catch (e: Exception) {
            Log.e("AlarmChannelModule", "❌ Failed to create channel '$channelId': ${e.message}")
            promise.reject("CHANNEL_ERROR", e.message, e)
        }
    }

    // Backward compat: no-promise overload
    @ReactMethod
    fun createAlarmChannelSync(channelId: String, channelName: String, channelDescription: String, soundName: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val context = reactApplicationContext
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            try { notificationManager.deleteNotificationChannel(channelId) } catch (e: Exception) {}
            val soundResId = context.resources.getIdentifier(soundName, "raw", context.packageName)
            val soundUri: Uri = if (soundResId != 0) {
                Uri.Builder()
                    .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
                    .authority(context.packageName)
                    .appendPath(soundResId.toString())
                    .build()
            } else {
                Uri.parse("android.resource://${context.packageName}/raw/$soundName")
            }
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build()
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH).apply {
                description = channelDescription
                setSound(soundUri, audioAttributes)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 300, 500)
                setBypassDnd(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
            Log.d("AlarmChannelModule", "✅ (sync) Channel '$channelId' created with USAGE_ALARM")
        }
    }
}
