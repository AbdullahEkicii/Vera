package com.abdllhekc.vera

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class PrayerWidgetLightProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            PrayerWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, R.layout.prayer_widget_light, true)
        }
        PrayerAlarmReceiver.scheduleNextAlarm(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        PrayerWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, R.layout.prayer_widget_light, true)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE == intent.action) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, PrayerWidgetLightProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (appWidgetId in appWidgetIds) {
                PrayerWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, R.layout.prayer_widget_light, true)
            }
        }
    }
}
