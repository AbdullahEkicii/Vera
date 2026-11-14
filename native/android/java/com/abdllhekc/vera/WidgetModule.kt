package com.abdllhekc.vera

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidgetData(
        city: String,
        nextName: String,
        nextTime: String,
        countdown: String,
        summary: String,
        hoursUnit: String = "h",
        minutesUnit: String = "m",
        countdownSuffix: String = "",
        staleMessage: String = "Open App"
    ) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("city", city)
                putString("nextName", nextName)
                putString("nextTime", nextTime)
                putString("countdown", countdown)
                putString("summary", summary)
                putString("hoursUnit", hoursUnit)
                putString("minutesUnit", minutesUnit)
                putString("countdownSuffix", countdownSuffix)
                putString("staleMessage", staleMessage)
                putLong("lastUpdated", System.currentTimeMillis())
                apply()
            }

            Log.d("WidgetModule", "Widget data updated: city=$city, nextName=$nextName, nextTime=$nextTime")

            val appWidgetManager = AppWidgetManager.getInstance(context)

            // Update Dark Widgets
            val darkIntent = Intent(context, PrayerWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val darkIds = appWidgetManager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java))
            darkIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, darkIds)
            context.sendBroadcast(darkIntent)

            // Update Light Widgets
            val lightIntent = Intent(context, PrayerWidgetLightProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val lightIds = appWidgetManager.getAppWidgetIds(ComponentName(context, PrayerWidgetLightProvider::class.java))
            lightIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, lightIds)
            context.sendBroadcast(lightIntent)

            // Schedule Native Alarm for Next Prayer Change
            PrayerAlarmReceiver.scheduleNextAlarm(context)
        } catch (e: Exception) {
            Log.e("WidgetModule", "Failed to update widget data: ${e.message}", e)
        }
    }

    @ReactMethod
    fun requestPinWidget(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val context = reactApplicationContext
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val widgetProvider = ComponentName(context, PrayerWidgetProvider::class.java)

                if (appWidgetManager.isRequestPinAppWidgetSupported) {
                    val pinnedWidgetCallbackIntent = Intent(context, PrayerWidgetProvider::class.java)
                    val successCallback = PendingIntent.getBroadcast(
                        context, 0, pinnedWidgetCallbackIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    appWidgetManager.requestPinAppWidget(widgetProvider, null, successCallback)
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e("WidgetModule", "Error requesting pin widget: ${e.message}", e)
            promise.reject("WIDGET_PIN_ERROR", e.message, e)
        }
    }
}
