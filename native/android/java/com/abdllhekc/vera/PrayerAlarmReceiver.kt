package com.abdllhekc.vera

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class PrayerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        Log.d("PrayerAlarmReceiver", "Alarm fired! Updating widgets natively...")

        try {
            // 1. Update all Dark & Light Widgets
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            val darkIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, PrayerWidgetProvider::class.java)
            )
            for (id in darkIds) {
                PrayerWidgetProvider.updateAppWidget(context, appWidgetManager, id, R.layout.prayer_widget, false)
            }

            val lightIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, PrayerWidgetLightProvider::class.java)
            )
            for (id in lightIds) {
                PrayerWidgetProvider.updateAppWidget(context, appWidgetManager, id, R.layout.prayer_widget_light, true)
            }

            // 2. Schedule next prayer alarm
            scheduleNextAlarm(context)
        } catch (e: Exception) {
            Log.e("PrayerAlarmReceiver", "Error in PrayerAlarmReceiver: ${e.message}", e)
        }
    }

    companion object {
        const val ALARM_REQUEST_CODE = 998811

        fun scheduleNextAlarm(context: Context) {
            try {
                val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
                val summary = prefs.getString("summary", "") ?: ""
                if (!summary.contains("|")) return

                val nextPrayer = PrayerWidgetProvider.computeNextPrayerFromSummary(summary) ?: return
                val targetMs = nextPrayer.targetMs

                if (targetMs <= System.currentTimeMillis()) return

                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, PrayerAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    ALARM_REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, targetMs, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, targetMs, pendingIntent)
                }

                Log.d("PrayerAlarmReceiver", "Scheduled next native alarm for ${nextPrayer.name} at ${nextPrayer.time} (ms: $targetMs)")
            } catch (e: Exception) {
                Log.e("PrayerAlarmReceiver", "Error scheduling next alarm: ${e.message}", e)
            }
        }
    }
}
