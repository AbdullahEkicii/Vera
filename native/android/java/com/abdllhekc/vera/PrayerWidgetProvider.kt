package com.abdllhekc.vera

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import java.util.Calendar

open class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        PrayerAlarmReceiver.scheduleNextAlarm(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE == intent.action) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, PrayerWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    data class DynamicPrayerItem(
        val name: String,
        val time: String,
        val targetMs: Long
    )

    companion object {

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            layoutId: Int = R.layout.prayer_widget,
            isLight: Boolean = false
        ) {
            try {
                val views = RemoteViews(context.packageName, layoutId)
                val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)

                val city = prefs.getString("city", "Vera") ?: "Vera"
                var nextName = prefs.getString("nextName", "...") ?: "..."
                var nextTime = prefs.getString("nextTime", "--:--") ?: "--:--"
                val summary = prefs.getString("summary", "") ?: ""

                val hoursUnit = prefs.getString("hoursUnit", "sa") ?: "sa"
                val minutesUnit = prefs.getString("minutesUnit", "dk") ?: "dk"
                val countdownSuffix = prefs.getString("countdownSuffix", "") ?: ""
                val staleMessage = prefs.getString("staleMessage", "Vakit Girdi") ?: "Vakit Girdi"

                // Check Widget Height Options (Prevent overflow/clipping in small 2x1 height)
                val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minHeight = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) ?: 100

                // If height is smaller than 90dp (e.g. 2x1 widget), hide bottom 6-prayer ribbon & divider line
                if (minHeight < 90) {
                    views.setViewVisibility(R.id.widget_prayer_grid, View.GONE)
                    views.setViewVisibility(R.id.widget_divider, View.GONE)
                } else {
                    views.setViewVisibility(R.id.widget_prayer_grid, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_divider, View.VISIBLE)
                }

                // Dynamically evaluate true next prayer from summary
                val dynamicNext = computeNextPrayerFromSummary(summary)
                var rawMin: Int? = null

                if (dynamicNext != null) {
                    nextName = dynamicNext.name
                    nextTime = dynamicNext.time
                    val diffMs = dynamicNext.targetMs - System.currentTimeMillis()
                    rawMin = (diffMs / 60000).toInt()
                } else {
                    rawMin = computeLiveCountdownMinutes(nextTime)
                }

                val countdownDisplay = if (rawMin != null && rawMin > 0) {
                    val formatted = formatCountdown(rawMin, hoursUnit, minutesUnit, countdownSuffix)
                    "⏳ $formatted"
                } else if (rawMin != null && rawMin <= 0) {
                    staleMessage
                } else {
                    prefs.getString("countdown", "") ?: ""
                }

                views.setTextViewText(R.id.widget_city, city)
                views.setTextViewText(R.id.widget_next_name, nextName)
                views.setTextViewText(R.id.widget_next_time, nextTime)
                views.setTextViewText(R.id.widget_countdown, countdownDisplay)

                // Populate 6 Prayer Columns
                populatePrayerGrid(views, summary, nextName, isLight)

                // App launch on widget tap
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d("PrayerWidgetProvider", "Widget ID $appWidgetId updated: isLight=$isLight, minHeight=$minHeight, next=$nextName @ $nextTime")
            } catch (e: Exception) {
                Log.e("PrayerWidgetProvider", "Error updating widget ID $appWidgetId: ${e.message}", e)
            }
        }

        private val TIME_REGEX = Regex("""(\d{1,2})\s*[:.]\s*(\d{2})\s*([AaPp])?""")

        /** Parses "05:30", "5:30 PM" or "17.30" into (hour 0–23, minute); null if unparseable. */
        fun parseHourMinute(raw: String): Pair<Int, Int>? {
            val match = TIME_REGEX.find(raw) ?: return null
            var h = match.groupValues[1].toIntOrNull() ?: return null
            val m = match.groupValues[2].toIntOrNull() ?: return null
            when (match.groupValues[3].lowercase()) {
                "p" -> if (h < 12) h += 12
                "a" -> if (h == 12) h = 0
            }
            if (h !in 0..23 || m !in 0..59) return null
            return Pair(h, m)
        }

        fun computeNextPrayerFromSummary(rawSummary: String): DynamicPrayerItem? {
            return try {
                if (!rawSummary.contains("|")) return null
                val parts = rawSummary.split("|")
                if (parts.size < 12) return null

                val now = System.currentTimeMillis()
                val candidates = mutableListOf<DynamicPrayerItem>()

                for (i in 0..5) {
                    val nameIdx = i * 2
                    val timeIdx = nameIdx + 1
                    if (timeIdx < parts.size) {
                        val pName = parts[nameIdx].trim()
                        val pTime = parts[timeIdx].trim()

                        // 12h mode sends "5:30 PM": a plain split(":") made "30 PM" unparseable.
                        val hm = parseHourMinute(pTime)
                        if (hm != null) {
                            val (h, m) = hm

                            val cal = Calendar.getInstance()
                            cal.set(Calendar.HOUR_OF_DAY, h)
                            cal.set(Calendar.MINUTE, m)
                            cal.set(Calendar.SECOND, 0)
                            cal.set(Calendar.MILLISECOND, 0)

                            candidates.add(DynamicPrayerItem(pName, pTime, cal.timeInMillis))
                        }
                    }
                }

                if (candidates.isEmpty()) return null

                // Find first prayer today whose target time is in the future (> now)
                for (item in candidates) {
                    if (item.targetMs > now) {
                        return item
                    }
                }

                // If all 6 prayers today have passed, the next prayer is tomorrow's Fajr (first candidate + 1 day)
                val tomorrowFajr = candidates.first()
                val tomorrowCal = Calendar.getInstance().apply {
                    timeInMillis = tomorrowFajr.targetMs
                    add(Calendar.DAY_OF_YEAR, 1)
                }

                DynamicPrayerItem(tomorrowFajr.name, tomorrowFajr.time, tomorrowCal.timeInMillis)
            } catch (e: Exception) {
                null
            }
        }

        private fun populatePrayerGrid(views: RemoteViews, rawSummary: String, nextName: String, isLight: Boolean) {
            if (!rawSummary.contains("|")) return
            val parts = rawSummary.split("|")
            if (parts.size < 12) return

            fun formatShortName(name: String): String {
                val trimmed = name.trim()
                return if (trimmed.length > 4) trimmed.substring(0, 3) else trimmed
            }

            val prayers = listOf(
                Pair(R.id.widget_p1_name, R.id.widget_p1_time),
                Pair(R.id.widget_p2_name, R.id.widget_p2_time),
                Pair(R.id.widget_p3_name, R.id.widget_p3_time),
                Pair(R.id.widget_p4_name, R.id.widget_p4_time),
                Pair(R.id.widget_p5_name, R.id.widget_p5_time),
                Pair(R.id.widget_p6_name, R.id.widget_p6_time)
            )

            for (i in 0..5) {
                val nameIdx = i * 2
                val timeIdx = nameIdx + 1
                if (timeIdx < parts.size) {
                    val pName = parts[nameIdx].trim()
                    val pTime = parts[timeIdx].trim()
                    val (nameViewId, timeViewId) = prayers[i]

                    views.setTextViewText(nameViewId, formatShortName(pName))
                    views.setTextViewText(timeViewId, pTime)

                    val isNext = pName.equals(nextName.trim(), ignoreCase = true)
                    if (isLight) {
                        if (isNext) {
                            views.setTextColor(nameViewId, Color.parseColor("#D97706"))
                            views.setTextColor(timeViewId, Color.parseColor("#B45309"))
                        } else {
                            views.setTextColor(nameViewId, Color.parseColor("#64748B"))
                            views.setTextColor(timeViewId, Color.parseColor("#1E293B"))
                        }
                    } else {
                        if (isNext) {
                            views.setTextColor(nameViewId, Color.parseColor("#E5C158"))
                            views.setTextColor(timeViewId, Color.parseColor("#D4AF37"))
                        } else {
                            views.setTextColor(nameViewId, Color.parseColor("#A89E8C"))
                            views.setTextColor(timeViewId, Color.parseColor("#F3ECE1"))
                        }
                    }
                }
            }
        }

        private fun formatCountdown(totalMin: Int, hoursUnit: String, minutesUnit: String, suffix: String): String {
            val h = totalMin / 60
            val m = totalMin % 60
            val suffixStr = if (suffix.isNotEmpty()) " $suffix" else ""
            return if (h > 0) "${h}${hoursUnit} ${m}${minutesUnit}${suffixStr}" else "${m}${minutesUnit}${suffixStr}"
        }

        private fun computeLiveCountdownMinutes(nextTimeStr: String): Int? {
            return try {
                val (targetH, targetM) = parseHourMinute(nextTimeStr) ?: return null

                val now = System.currentTimeMillis()
                val cal = Calendar.getInstance()
                cal.set(Calendar.HOUR_OF_DAY, targetH)
                cal.set(Calendar.MINUTE, targetM)
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)

                if (cal.timeInMillis <= now) {
                    cal.add(Calendar.DAY_OF_YEAR, 1)
                }

                val diffMs = cal.timeInMillis - now
                if (diffMs <= 0) return null

                (diffMs / 60000).toInt()
            } catch (e: Exception) {
                null
            }
        }
    }
}
