import notifee, { AlarmType, AndroidCategory, AndroidImportance, AndroidVisibility, TimestampTrigger, TriggerType } from '@notifee/react-native';
import { AppStorage as AsyncStorage } from './storageService';
import { SecureLocationStorage } from './storageService';
import { NativeModules, Platform } from 'react-native';
import { recordScheduledAlerts } from './deliveryLog';
import { WARN_MINUTE_CHOICES, FRIDAY_MINUTE_CHOICES, getWarnMinutes, getExactSoundFor, withMinutes } from '../utils/notifPrefs';
import i18n from '../localization/i18n';
import { applyOffsetsToTimings, DayData, fetchReligiousDays, getDataTimeZone, getPrayerOffsets } from './api';
import {
  computeDayEpochs,
  getZonedDate,
  PRAYER_ORDER,
  zonedWallTimeToEpoch,
  addCalendarDays,
  parseClock,
} from '../utils/zonedTime';
import { RELIGIOUS_DAY_DEFS, ReligiousDay } from '../data/religiousDays';
import { religiousDayText } from '../localization/content';
import { updateAndroidWidget } from './widgetService';
import { initializePushNotifications } from './pushNotificationService';

const PREFS_KEY = 'NOTIFICATION_PREFS';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

export interface NotificationPrefs {
  fajr: boolean;
  sunrise: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  fajr_warn: boolean;
  sunrise_warn: boolean;
  dhuhr_warn: boolean;
  asr_warn: boolean;
  maghrib_warn: boolean;
  isha_warn: boolean;
  exactSound?: string;
  warningSound?: string;
  respectSilentMode?: boolean;
  // Engagement reminders. Saved prefs from older versions lack these keys; the schedulers
  // treat "undefined" as on (`!== false`) so existing users keep what they had, while
  // defaultPrefs sets them explicitly for new installs.
  dailyContent?: boolean;
  quranReminder?: boolean;
  greetingReminders?: boolean;
  /** Minutes before adhan for the early warning (5-30). Missing = 25, the original fixed value. */
  warnMinutes?: number;
  /** Per-prayer adhan sound; a missing prayer uses `exactSound`. */
  sounds?: Partial<Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string>>;
  /** Friday: a "get ready for Jumu'ah" reminder before Dhuhr. Off by default. */
  fridayReminder?: boolean;
  fridayReminderMinutes?: number;
}

const defaultPrefs: NotificationPrefs = {
  fajr: true,
  sunrise: false,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  // The 25-minute early warnings are opt-in: ten alarm-style alerts a day is too many for a new install.
  fajr_warn: false,
  sunrise_warn: false,
  dhuhr_warn: false,
  asr_warn: false,
  maghrib_warn: false,
  isha_warn: false,
  exactSound: 'azizallah',
  warningSound: 'adhan_25minutes',
  // true = adhan follows the phone's silent/vibrate mode (regular notification stream). false =
  // adhan plays on the alarm stream and bypasses silent mode. New installs must not blast the
  // adhan at 4am in a meeting; users who want the loud adhan can switch it off in Settings.
  respectSilentMode: true,
  dailyContent: false,
  quranReminder: false,
  greetingReminders: true,
  warnMinutes: 25,
  fridayReminder: false,
  fridayReminderMinutes: 45,
};

export { WARN_MINUTE_CHOICES, FRIDAY_MINUTE_CHOICES, getWarnMinutes, getExactSoundFor, withMinutes };

export const getExactChannelId = (soundName?: string) => {
  const sound = soundName || 'azizallah';
  return `ezan_exact_${sound}_v16`;
};

export const getWarningChannelId = (soundName?: string) => {
  const sound = soundName || 'adhan_25minutes';
  return `ezan_warning_${sound}_v16`;
};

export const initNotifications = async (customExactSound?: string, customWarningSound?: string) => {
  if (Platform.OS === 'android') {
    // Delete legacy channels (all old version suffixes)
    const LEGACY_CHANNEL_IDS = [
      'ezan_exact_v4', 'ezan_warning_v4',
      'ezan_exact_v5', 'ezan_warning_v5',
      'ezan_exact_v6', 'ezan_warning_v6',
      'ezan_exact_v7', 'ezan_warning_v7',
      'ezan_exact_v8', 'ezan_warning_v8',
      'ezan_exact_v9', 'ezan_warning_v9',
      'ezan_exact_v11', 'ezan_warning_v11',
      'ezan_exact_v12', 'ezan_warning_v12',
      'ezan_exact_azizallah_v13', 'ezan_warning_azizallah_v13',
      'ezan_exact_adhan_25minutes_v13', 'ezan_warning_adhan_25minutes_v13',
      'ezan_exact_allahu_akbar_v13', 'ezan_warning_allahu_akbar_v13',
      'ezan_exact_adhan_v13', 'ezan_warning_adhan_v13',
      'ezan_exact_adhan_v14', 'ezan_warning_adhan_v14',
      'ezan_exact_azizallah_v14', 'ezan_warning_azizallah_v14',
      'ezan_exact_adhan_25minutes_v14', 'ezan_warning_adhan_25minutes_v14',
      'ezan_exact_allahu_akbar_v14', 'ezan_warning_allahu_akbar_v14',
      'ezan_exact_azizallah_v15', 'ezan_warning_azizallah_v15',
      'ezan_exact_adhan_25minutes_v15', 'ezan_warning_adhan_25minutes_v15',
      'ezan_exact_allahu_akbar_v15', 'ezan_warning_allahu_akbar_v15',
    ];
    // ~40 native calls: only needed once per install, not on every launch.
    const LEGACY_CLEANUP_KEY = 'NOTIF_LEGACY_CHANNELS_CLEANED_V16';
    if ((await AsyncStorage.getItem(LEGACY_CLEANUP_KEY)) !== 'true') {
      await Promise.all(LEGACY_CHANNEL_IDS.map((id) => notifee.deleteChannel(id).catch(() => {})));
      await notifee.deleteChannel('ezan_persistent_status').catch(() => {});
      await AsyncStorage.setItem(LEGACY_CLEANUP_KEY, 'true').catch(() => {});
    }

    const prefs = await getNotificationPrefs();
    const exactSoundName = customExactSound || prefs.exactSound || 'azizallah';
    const warningSoundName = customWarningSound || prefs.warningSound || 'adhan_25minutes';
    const warnMinutes = getWarnMinutes(prefs);

    // Every sound a prayer can use needs its own channel (the sound belongs to the channel).
    const exactSounds = new Set<string>([exactSoundName]);
    for (const own of Object.values(prefs.sounds ?? {})) {
      if (own && VALID_SOUNDS.includes(own as any)) exactSounds.add(own);
    }

    // Delete unused sound channels to keep channel list clean
    const KNOWN_SOUNDS = ['azizallah', 'adhan_25minutes', 'allahu_akbar'];
    for (const sound of KNOWN_SOUNDS) {
      if (!exactSounds.has(sound)) {
        try { await notifee.deleteChannel(getExactChannelId(sound)); } catch {}
      }
      if (sound !== warningSoundName) {
        try { await notifee.deleteChannel(getWarningChannelId(sound)); } catch {}
      }
    }

    const { AlarmChannelModule } = NativeModules;
    devLog('📢 Native AlarmChannelModule present in NativeModules?', !!AlarmChannelModule);

    const shouldUseAlarmStream = prefs.respectSilentMode === false;
    const exactName = i18n.t('notifications.channels.exactName', { defaultValue: 'Ezan Vakti' });
    const exactDesc = i18n.t('notifications.channels.exactDesc', { defaultValue: 'Namaz vakti girdiğinde çalar.' });
    const warningName = withMinutes(i18n.t('notifications.channels.warningName', { defaultValue: 'Ezan Yaklaşıyor (25 dk)' }), warnMinutes);
    const warningDesc = withMinutes(i18n.t('notifications.channels.warningDesc', { defaultValue: 'Ezan vaktine 25 dakika kala uyarı verir.' }), warnMinutes);

    const createChannel = async (id: string, name: string, description: string, sound: string) => {
      if (shouldUseAlarmStream && AlarmChannelModule) {
        try {
          await AlarmChannelModule.createAlarmChannel(id, name, description, sound);
          devLog(`✅ AlarmChannelModule: channel ${id} created with sound ${sound}`);
        } catch (e) {
          devError('createAlarmChannel failed:', id, e);
        }
      } else {
        // Standard notification channel (respects Silent / Vibrate / DND modes)
        await notifee.createChannel({
          id,
          name,
          description,
          importance: AndroidImportance.HIGH,
          sound,
          vibration: true,
          vibrationPattern: [300, 500, 300, 500],
          visibility: AndroidVisibility.PUBLIC,
          bypassDnd: false,
        });
      }
    };

    for (const sound of exactSounds) {
      await createChannel(getExactChannelId(sound), exactName, exactDesc, sound);
    }
    await createChannel(getWarningChannelId(warningSoundName), warningName, warningDesc, warningSoundName);

    // Daily Content Channel
    await notifee.createChannel({
      id: 'ezan_daily_content',
      name: i18n.t('notifications.channels.dailyName', { defaultValue: 'Günün İçeriği' }),
      description: i18n.t('notifications.channels.dailyDesc', { defaultValue: 'Her gün öğle ile ikindi arasında günün ayeti/hadisi/sözü gelir.' }),
      importance: AndroidImportance.DEFAULT,
    });

    // Persistent Status Bar & Lock Screen Countdown Channel (DEFAULT importance = NOT Silent)
    await notifee.createChannel({
      id: 'ezan_persistent_status_v2',
      name: i18n.t('notifications.channels.persistentName', { defaultValue: 'Sabit Vakit & Kilit Ekranı' }),
      description: i18n.t('notifications.channels.persistentDesc', { defaultValue: 'Üst bildirim panelinde ve kilit ekranında sıradaki vakit geri sayımını gösterir.' }),
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
    });
  }
};

export const updatePersistentPrayerNotification = async (
  city: string,
  nextPrayerName: string,
  nextPrayerTime: string,
  targetTimestampMs: number,
  enabled: boolean = true
) => {
  const NOTIF_ID = 'persistent_prayer_status';
  const CHANNEL_ID = 'ezan_persistent_status_v2';

  if (!enabled || targetTimestampMs <= Date.now()) {
    try {
      await notifee.cancelNotification(NOTIF_ID);
    } catch {}
    return;
  }

  try {
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) return;

    // Ensure the persistent channel v2 exists (no-op if already created)
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: i18n.t('notifications.channels.persistentName', { defaultValue: 'Sabit Vakit & Kilit Ekranı' }),
      description: i18n.t('notifications.channels.persistentDesc', { defaultValue: 'Üst bildirim panelinde ve kilit ekranında sıradaki vakit adı ve saatini gösterir.' }),
      importance: AndroidImportance.DEFAULT,
      visibility: AndroidVisibility.PUBLIC,
    });

    // Title formatted cleanly for native chronometer counting down live
    const title = i18n.t('notifications.persistentTitle', {
      defaultValue: '🕌 {{prayer}} vaktine',
      prayer: nextPrayerName,
    });
    const body = `⏰ ${nextPrayerName}: ${nextPrayerTime}  ·  📍 ${city}`;

    await notifee.displayNotification({
      id: NOTIF_ID,
      title,
      body,
      android: {
        smallIcon: 'notification_icon',
        color: '#D4AF37',
        channelId: CHANNEL_ID,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        showChronometer: true,
        chronometerDirection: 'down',
        timestamp: targetTimestampMs,
        visibility: AndroidVisibility.PUBLIC,
        asForegroundService: false,
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    devError('Error updating persistent notification:', error);
  }
};

export const syncNextPrayerFromCache = async () => {
  try {
    const cachedString = await AsyncStorage.getItem('PRAYER_TIMES_CACHE');
    if (!cachedString) return;
    const cached = JSON.parse(cachedString);
    if (!cached?.data || !Array.isArray(cached.data)) return;

    const nowMs = Date.now();
    // Times are clock strings in the city's zone; "today" and every moment below are in that zone.
    const timeZone = getDataTimeZone(cached.data);
    const today = getZonedDate(nowMs, timeZone);
    const dayKey = (d: { y: number; mo: number; d: number }) =>
      `${String(d.d).padStart(2, '0')}-${String(d.mo).padStart(2, '0')}-${d.y}`;

    // No entry for today means the cache is stale: showing another day's times would be wrong.
    const dayData = cached.data.find((d: any) => d.date?.gregorian?.date === dayKey(today));
    if (!dayData || !dayData.timings) return;
    const tomorrowData = cached.data.find((d: any) => d.date?.gregorian?.date === dayKey(addCalendarDays(today, 1)));
    // The cache holds raw API times; apply the user's ± minute offsets like the home screen does.
    const offsets = await getPrayerOffsets();
    const timings = applyOffsetsToTimings(dayData.timings, offsets);
    const tomorrowTimings = tomorrowData?.timings ? applyOffsetsToTimings(tomorrowData.timings, offsets) : null;
    const epochs = computeDayEpochs(
      {
        fajr: timings.Fajr,
        sunrise: timings.Sunrise,
        dhuhr: timings.Dhuhr,
        asr: timings.Asr,
        maghrib: timings.Maghrib,
        isha: timings.Isha,
      },
      today,
      timeZone
    );

    const prayers = [
      { id: 'fajr', name: i18n.t('home.prayers.fajr', { defaultValue: 'İmsak' }), time: timings.Fajr },
      { id: 'sunrise', name: i18n.t('home.prayers.sunrise', { defaultValue: 'Güneş' }), time: timings.Sunrise },
      { id: 'dhuhr', name: i18n.t('home.prayers.dhuhr', { defaultValue: 'Öğle' }), time: timings.Dhuhr },
      { id: 'asr', name: i18n.t('home.prayers.asr', { defaultValue: 'İkindi' }), time: timings.Asr },
      { id: 'maghrib', name: i18n.t('home.prayers.maghrib', { defaultValue: 'Akşam' }), time: timings.Maghrib },
      { id: 'isha', name: i18n.t('home.prayers.isha', { defaultValue: 'Yatsı' }), time: timings.Isha },
    ];

    let nextPrayer = null;
    let targetTimestampMs = 0;

    for (const p of prayers) {
      const pMs = epochs[p.id as typeof PRAYER_ORDER[number]];
      if (pMs > nowMs) {
        nextPrayer = p;
        targetTimestampMs = pMs;
        break;
      }
    }

    if (!nextPrayer) {
      // After Isha: tomorrow's Fajr, at tomorrow's own time.
      const clock = parseClock(tomorrowTimings?.Fajr);
      const tomorrow = addCalendarDays(today, 1);
      targetTimestampMs = clock
        ? zonedWallTimeToEpoch(tomorrow.y, tomorrow.mo, tomorrow.d, clock[0], clock[1], timeZone)
        : epochs.fajr + 24 * 60 * 60 * 1000;
      nextPrayer = { ...prayers[0], time: tomorrowTimings?.Fajr ?? prayers[0].time };
    }

    const savedLocStr = (await SecureLocationStorage.getItem('MANUAL_LOCATION')) || (await SecureLocationStorage.getItem('LAST_GPS_LOCATION'));
    let city = 'Vera';
    if (savedLocStr) {
      try {
        const parsed = JSON.parse(savedLocStr);
        if (parsed.city) city = parsed.city;
      } catch {}
    }

    const isNotifEnabledStr = await AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED');
    const isNotifEnabled = isNotifEnabledStr !== null ? isNotifEnabledStr === 'true' : true;

    await updatePersistentPrayerNotification(
      city,
      nextPrayer.name,
      nextPrayer.time.split(' ')[0],
      targetTimestampMs,
      isNotifEnabled
    );

    const summaryStr = prayers.map(p => `${p.name}|${p.time.split(' ')[0]}`).join('|');
    updateAndroidWidget({
      city: `📍 ${city}`,
      nextName: nextPrayer.name,
      nextTime: nextPrayer.time.split(' ')[0],
      countdown: '',
      summary: summaryStr,
      hoursUnit: i18n.t('notifications.persistent.hoursUnit', { defaultValue: 'sa' }),
      minutesUnit: i18n.t('notifications.persistent.minutesUnit', { defaultValue: 'dk' }),
      countdownSuffix: i18n.t('notifications.persistent.countdown', { defaultValue: 'sonra' }),
      staleMessage: i18n.t('notifications.persistent.prayerEntered', { defaultValue: 'Vakit Girdi' }),
    });

  } catch (e) {
    devError('Error in syncNextPrayerFromCache:', e);
  }
};

export const requestNotificationPermissions = async () => {
  const settings = await notifee.requestPermission();
  const granted = settings.authorizationStatus >= 1;
  if (granted) {
    initializePushNotifications().catch(() => {});
  }
  return granted;
};

export const checkNotificationPermissions = async () => {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= 1;
};

const VALID_SOUNDS = ['azizallah', 'adhan_25minutes', 'allahu_akbar'] as const;

export const getNotificationPrefs = async (): Promise<NotificationPrefs> => {
  try {
    const data = await AsyncStorage.getItem(PREFS_KEY);
    if (!data) return defaultPrefs;
    const parsed: NotificationPrefs = JSON.parse(data);
    // Migration: if a deleted sound is stored, fall back to defaults
    if (parsed.exactSound && !VALID_SOUNDS.includes(parsed.exactSound as any)) {
      parsed.exactSound = defaultPrefs.exactSound;
    }
    if (parsed.warningSound && !VALID_SOUNDS.includes(parsed.warningSound as any)) {
      parsed.warningSound = defaultPrefs.warningSound;
    }
    if (parsed.sounds) {
      for (const k of Object.keys(parsed.sounds) as (keyof NonNullable<NotificationPrefs['sounds']>)[]) {
        if (!VALID_SOUNDS.includes(parsed.sounds[k] as any)) delete parsed.sounds[k];
      }
    }
    return parsed;
  } catch {
    return defaultPrefs;
  }
};

export const saveNotificationPrefs = async (prefs: NotificationPrefs) => {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    devError('Error saving prefs', error);
  }
};

// Each run cancels and recreates ~95 trigger notifications over the native bridge, and
// it is requested from several places (launch, focus, offsets, settings, prayer
// transitions), sometimes at the same moment. Runs are serialized, and a run whose
// inputs match the previous one within RESCHEDULE_TTL_MS is skipped.
const RESCHEDULE_TTL_MS = 6 * 60 * 60 * 1000;
let scheduleChain: Promise<void> = Promise.resolve();
let lastSchedule: { key: string; at: number } | null = null;

// Notifications keep firing for a user who does not open the app: the rolling window has to
// outlast a long absence (the best-effort background task cannot be relied on to extend it).
// 21 days x 5 adhan alarms (10 with the optional 25-minute warnings) stays far below
// Android's 500-alarm-per-app ceiling.
const SCHEDULE_WINDOW_DAYS = 21;
const ALARM_LIMIT = 230;
const DAILY_CONTENT_LIMIT = 14;
const QURAN_REMINDER_LIMIT = 7;

// Only these ids are ours to replace on a reschedule; anything else (e.g. test alerts) stays.
const SCHEDULED_ID_PREFIXES = ['exact_', 'warn_', 'daily_content_', 'quran_reminder_', 'greeting_', 'refresh_', 'friday_'];

// The ongoing "next prayer" notification only changes when something runs. These silent,
// instantly-dismissed triggers wake the background handler right after each prayer time so it
// moves on to the next prayer even when no adhan alert is enabled (see index.js).
const REFRESH_CHANNEL_ID = 'ezan_refresh_silent';
const REFRESH_WINDOW_DAYS = 3;

export const schedulePrayerNotifications = (data: DayData[], prefs: NotificationPrefs, _t: any): Promise<void> => {
  const run = scheduleChain.then(async () => {
    const key = JSON.stringify({
      days: data.slice(0, 8).map((d) => [d.date?.gregorian?.date, d.timings]),
      tz: getDataTimeZone(data),
      prefs,
      lang: i18n.language,
      persistent: await AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED').catch(() => null),
    });
    if (lastSchedule && lastSchedule.key === key && Date.now() - lastSchedule.at < RESCHEDULE_TTL_MS) {
      // "Unchanged" is only true if the alarms are still there (permission revoked and
      // re-granted, OS cleanup, battery manager): verify before skipping.
      const pending = await notifee.getTriggerNotificationIds().catch(() => [] as string[]);
      if (pending.some((id) => SCHEDULED_ID_PREFIXES.some((p) => id.startsWith(p)))) {
        devLog('Notification schedule unchanged, skipping reschedule.');
        return;
      }
    }
    await doSchedulePrayerNotifications(data, prefs);
    lastSchedule = { key, at: Date.now() };
  });
  scheduleChain = run.catch(() => {});
  return run;
};

const doSchedulePrayerNotifications = async (data: DayData[], prefs: NotificationPrefs) => {
  const t = i18n.t.bind(i18n);

  // Clear our previously scheduled triggers, leaving persistent ongoing notifications and
  // anything we did not schedule (test alerts) untouched.
  try {
    const pending = await notifee.getTriggerNotificationIds();
    const ours = pending.filter((id) => SCHEDULED_ID_PREFIXES.some((p) => id.startsWith(p)));
    if (ours.length > 0) await notifee.cancelTriggerNotifications(ours);
  } catch (e) {
    devError('Failed to cancel trigger notifications:', e);
  }

  const warningChannelId = getWarningChannelId(prefs.warningSound);
  const warnMinutes = getWarnMinutes(prefs);

  const now = new Date();
  const limit = ALARM_LIMIT;
  let scheduledCount = 0;
  const scheduledAdhanTimes: number[] = [];
  let dailyContentCount = 0;
  let quranReminderCount = 0;
  // Prayer times are clock strings in the city's zone; alarms need absolute moments.
  const dataTimeZone = getDataTimeZone(data);

  // Legacy installs have no stored value and keep the persistent notification on.
  const persistentOn = (await AsyncStorage.getItem('PERSISTENT_NOTIF_ENABLED').catch(() => null)) !== 'false';
  if (persistentOn) {
    await notifee
      .createChannel({
        id: REFRESH_CHANNEL_ID,
        name: i18n.t('notifications.channels.persistentName', { defaultValue: 'Sabit Vakit & Kilit Ekranı' }),
        importance: AndroidImportance.MIN,
        vibration: false,
        sound: undefined,
      })
      .catch(() => {});
  }

  let dayIndex = 0;
  for (const day of data) {
    if (scheduledCount >= limit && dailyContentCount >= DAILY_CONTENT_LIMIT) break;

    const [dayStr, monthStr, yearStr] = day.date.gregorian.date.split('-');
    // Local midnight of the day in the phone's zone: used for phone-local reminders (Quran 20:00).
    const baseDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    const dayYmd = { y: parseInt(yearStr), mo: parseInt(monthStr), d: parseInt(dayStr) };
    const dayStartInZone = zonedWallTimeToEpoch(dayYmd.y, dayYmd.mo, dayYmd.d, 0, 0, dataTimeZone);

    if (dayStartInZone + 86400000 < now.getTime()) continue;
    dayIndex++;
    if (dayIndex > SCHEDULE_WINDOW_DAYS) break;

    // One absolute time per prayer; Isha that falls after midnight is moved to the next day.
    const epochs = computeDayEpochs(
      {
        fajr: day.timings.Fajr,
        sunrise: day.timings.Sunrise,
        dhuhr: day.timings.Dhuhr,
        asr: day.timings.Asr,
        maghrib: day.timings.Maghrib,
        isha: day.timings.Isha,
      },
      dayYmd,
      dataTimeZone
    );

    // Silent refresh right after each prayer time (nearby days only) for the persistent notification.
    if (persistentOn && dayIndex <= REFRESH_WINDOW_DAYS) {
      for (const id of PRAYER_ORDER) {
        const at = epochs[id] + 5000;
        if (!Number.isFinite(at) || at <= now.getTime()) continue;
        try {
          await notifee.createTriggerNotification(
            {
              id: `refresh_${id}_${yearStr}_${monthStr}_${dayStr}`,
              title: 'Vera',
              android: {
                channelId: REFRESH_CHANNEL_ID,
                smallIcon: 'notification_icon',
                importance: AndroidImportance.MIN,
                timeoutAfter: 2000,
                autoCancel: true,
              },
              data: { type: 'refresh', timestamp: String(at) },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: at,
              alarmManager: { allowWhileIdle: true, type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
            }
          );
        } catch (e) {
          devError('Failed to schedule persistent refresh', e);
        }
      }
    }

    // Friday: a reminder before Dhuhr (Jumu'ah). Opt-in; the morning greeting card is separate.
    if (prefs.fridayReminder === true && new Date(Date.UTC(dayYmd.y, dayYmd.mo - 1, dayYmd.d)).getUTCDay() === 5) {
      const lead = FRIDAY_MINUTE_CHOICES.includes(prefs.fridayReminderMinutes as any) ? (prefs.fridayReminderMinutes as number) : 45;
      const at = epochs.dhuhr - lead * 60 * 1000;
      if (Number.isFinite(at) && at > now.getTime()) {
        try {
          await notifee.createTriggerNotification(
            {
              id: `friday_${yearStr}_${monthStr}_${dayStr}`,
              title: t('notifications.fridayPrepTitle', { defaultValue: i18n.language.startsWith('tr') ? 'Cuma Namazına Hazırlık' : "Get Ready for Jumu'ah" }),
              body: t('notifications.fridayPrepBody', {
                defaultValue: i18n.language.startsWith('tr') ? 'Cuma namazına {{minutes}} dakika kaldı.' : "Jumu'ah prayer is in {{minutes}} minutes.",
                minutes: lead,
              }),
              android: {
                smallIcon: 'notification_icon',
                color: '#D4AF37',
                channelId: 'ezan_daily_content',
                importance: AndroidImportance.DEFAULT,
                pressAction: { id: 'default' },
              },
              data: { type: 'friday', timestamp: String(at) },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: at,
              alarmManager: { allowWhileIdle: true, type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
            }
          );
        } catch (e) {
          devError('Failed to schedule Friday reminder', e);
        }
      }
    }

    // Daily Content Notification Scheduling
    if (prefs.dailyContent !== false && dailyContentCount < DAILY_CONTENT_LIMIT) {
      const dhuhrMs = epochs.dhuhr;
      const triggerDate = new Date(dhuhrMs + 90 * 60 * 1000); // 1.5 hours after Dhuhr

      if (triggerDate > now) {
        try {
          const start = new Date(triggerDate.getFullYear(), 0, 0);
          const diff = triggerDate.getTime() - start.getTime();
          const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

          const typeIndex = dayOfYear % 3;
          let title = '';
          let body = '';

          if (typeIndex === 0) {
            title = t('daily.verse', 'Günün Ayeti') || 'Günün Ayeti';
            body = t('daily.verseBody', 'Günün ayetini okumak için tıklayın!') || 'Günün ayetini okumak için tıklayın!';
          } else if (typeIndex === 1) {
            title = t('daily.hadith', 'Günün Hadisi') || 'Günün Hadisi';
            body = t('daily.hadithBody', 'Günün hadisini okumak için tıklayın!') || 'Günün hadisini okumak için tıklayın!';
          } else {
            title = t('daily.quote', 'Günün Sözü') || 'Günün Sözü';
            body = t('daily.quoteBody', 'Günün sözünü okumak için tıklayın!') || 'Günün sözünü okumak için tıklayın!';
          }

          const dayKey = `${yearStr}_${monthStr}_${dayStr}`;

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerDate.getTime(),
            alarmManager: {
              allowWhileIdle: true,
              type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
            },
          };

          await notifee.createTriggerNotification({
            id: `daily_content_${dayKey}`,
            title,
            body,
            android: {
              smallIcon: 'notification_icon',
              color: '#D4AF37',
              channelId: 'ezan_daily_content',
              importance: AndroidImportance.DEFAULT,
              pressAction: { id: 'default' },
            },
            data: { type: 'daily_content', timestamp: triggerDate.getTime().toString() },
          }, trigger);

          dailyContentCount++;
        } catch (e) {
          devError('Failed to schedule daily content', e);
        }
      }
    }

    // Quran Reminder Notification (Every 2 days at 20:00 in the evening)
    if (prefs.quranReminder !== false && dayIndex % 2 === 0 && quranReminderCount < QURAN_REMINDER_LIMIT) {
      const quranDate = new Date(baseDate);
      quranDate.setHours(20, 0, 0, 0);
      if (quranDate > now) {
        try {
          const dayKey = `${yearStr}_${monthStr}_${dayStr}`;
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: quranDate.getTime(),
            alarmManager: {
              allowWhileIdle: true,
              type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
            },
          };
          await notifee.createTriggerNotification({
            id: `quran_reminder_${dayKey}`,
            title: t('notifications.quranReminderTitle', '📖 Kur\'an-ı Kerim Vakti'),
            body: t('notifications.quranReminderBody', 'Bugün Kur\'an okudun mu? Tıkla ve hemen okumaya başla.'),
            android: {
              smallIcon: 'notification_icon',
              color: '#D4AF37',
              channelId: 'ezan_daily_content',
              importance: AndroidImportance.DEFAULT,
              pressAction: { id: 'default' },
            },
            data: { type: 'quran', timestamp: quranDate.getTime().toString() },
          }, trigger);
          quranReminderCount++;
        } catch (e) {
          devError('Failed to schedule quran reminder', e);
        }
      }
    }

    if (scheduledCount < limit) {
      const dayKey = `${yearStr}_${monthStr}_${dayStr}`;
      const prayers = PRAYER_ORDER.map((id) => ({ id }));

      for (const prayer of prayers) {
        const isExactEnabled = prefs[prayer.id as keyof NotificationPrefs];
        const isWarnEnabled = prefs[`${prayer.id}_warn` as keyof NotificationPrefs];

        if ((isExactEnabled || isWarnEnabled) && Number.isFinite(epochs[prayer.id])) {
          const triggerDate = new Date(epochs[prayer.id]);

          // Tam ezan vakti bildirimi
          if (isExactEnabled && triggerDate > now) {
            try {
              const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerDate.getTime(),
                alarmManager: {
                  allowWhileIdle: true,
                  type: AlarmType.SET_ALARM_CLOCK,
                },
              };

              await notifee.createTriggerNotification({
                id: `exact_${prayer.id}_${dayKey}`,
                title: t(`notifications.${prayer.id}.title`),
                body: t(`notifications.${prayer.id}.body`),
                android: {
                  category: AndroidCategory.ALARM,
                  smallIcon: 'notification_icon',
                  color: '#D4AF37',
                  channelId: getExactChannelId(getExactSoundFor(prefs, prayer.id)),
                  sound: getExactSoundFor(prefs, prayer.id),
                  importance: AndroidImportance.HIGH,
                  pressAction: {
                    id: 'default',
                  },
                  actions: [
                    {
                      title: i18n.t('notifications.silenceAction', { defaultValue: 'Sustur' }),
                      pressAction: {
                        id: 'stop_sound',
                      },
                    },
                  ],
                },
                data: {
                  type: 'exact',
                  prayerId: prayer.id,
                  timestamp: triggerDate.getTime().toString(),
                }
              }, trigger);
              scheduledCount++;
              scheduledAdhanTimes.push(triggerDate.getTime());
            } catch (e) {
              devError('Failed to schedule exact alert', e);
            }
          }

          // 25 dakika öncesi bildirimi
          if (isWarnEnabled) {
            const warningDate = new Date(triggerDate.getTime() - warnMinutes * 60 * 1000);
            if (warningDate > now) {
              try {
                const trigger: TimestampTrigger = {
                  type: TriggerType.TIMESTAMP,
                  timestamp: warningDate.getTime(),
                  alarmManager: {
                    allowWhileIdle: true,
                    type: AlarmType.SET_ALARM_CLOCK,
                  },
                };

                await notifee.createTriggerNotification({
                  id: `warn_${prayer.id}_${dayKey}`,
                  title: t('notifications.warningTitle'),
                  body: withMinutes(t('notifications.warningBody', { prayer: t(`home.prayers.${prayer.id}`) }), warnMinutes),
                  android: {
                    category: AndroidCategory.ALARM,
                    smallIcon: 'notification_icon',
                    color: '#D4AF37',
                    channelId: warningChannelId,
                    sound: prefs.warningSound || 'adhan_25minutes',
                    importance: AndroidImportance.HIGH,
                    pressAction: {
                      id: 'default',
                    },
                    actions: [
                      {
                        title: i18n.t('notifications.silenceAction', { defaultValue: 'Sustur' }),
                        pressAction: {
                          id: 'stop_sound',
                        },
                      },
                    ],
                  },
                  data: {
                    type: 'warning',
                    prayerId: prayer.id,
                    timestamp: warningDate.getTime().toString(),
                  }
                }, trigger);
                scheduledCount++;
              } catch (e) {
                devError('Failed to schedule warning alert', e);
              }
            }
          }
        }
        if (scheduledCount >= limit) break;
      }
      
      // Her günün (yaklaşık 10 bildirim) sonunda React Native köprüsünü (bridge) rahatlatmak için çok kısa bir bekleme (yield) atıyoruz.
      // Bu sayede arkaplanda yüzlerce bildirim kurulurken arayüz donmuyor (ANR önlemi).
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  recordScheduledAlerts(scheduledAdhanTimes).catch(() => {});
  const greetingCount = prefs.greetingReminders !== false ? await scheduleGreetingReminders(t) : 0;

  devLog(`Scheduled ${scheduledCount} prayer notifications, ${dailyContentCount} daily content and ${greetingCount} greeting reminders via Notifee.`);
};

const GREETING_WINDOW_DAYS = 7;
const FRIDAY_HOUR = 9;
const RELIGIOUS_DAY_HOUR = 10;

const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Friday morning and religious day / kandil reminders that open the greeting card
 * screen, so there is a weekly reason to come back and share. Dates come from
 * fetchReligiousDays (Hijri calendar, cached per Hijri year); if that fails
 * offline, only the Friday reminders are scheduled.
 */
const scheduleGreetingReminders = async (t: (key: string, def: string, opts?: Record<string, unknown>) => string): Promise<number> => {
  let religiousDays: ReligiousDay[] = [];
  try {
    religiousDays = await fetchReligiousDays();
  } catch (e) {
    devError('Religious days unavailable for reminders:', e);
  }

  const now = new Date();
  let count = 0;
  for (let i = 0; i < GREETING_WINDOW_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = toIsoDay(day);
    const religious = religiousDays.find((d) => d.gregorianDate === iso);

    let title: string;
    let body: string;
    let occasion: string;
    const fireAt = new Date(day);

    if (religious) {
      const defId = religious.id.replace(/-\d+$/, '');
      const kind = RELIGIOUS_DAY_DEFS.find((d) => d.id === defId)?.kind;
      const name = religiousDayText(religious, 'name');
      occasion = defId.startsWith('eid') ? 'eid' : defId === 'ramadan' ? 'ramadan' : 'kandil';
      title = kind === 'day'
        ? t('greetingNotif.dayTitle', '{{name}} mübarek olsun', { name })
        : t('greetingNotif.nightTitle', 'Bu gece {{name}}', { name });
      body = t('greetingNotif.body', 'Sevdiklerinize bir tebrik kartı gönderin.');
      fireAt.setHours(RELIGIOUS_DAY_HOUR, 0, 0, 0);
    } else if (day.getDay() === 5) {
      occasion = 'cuma';
      title = t('greetingNotif.fridayTitle', 'Hayırlı Cumalar');
      body = t('greetingNotif.fridayBody', 'Sevdiklerinize bir Cuma tebrik kartı gönderin.');
      fireAt.setHours(FRIDAY_HOUR, 0, 0, 0);
    } else {
      continue;
    }
    if (fireAt <= now) continue;

    try {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: fireAt.getTime(),
        alarmManager: { allowWhileIdle: true, type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
      };
      await notifee.createTriggerNotification({
        id: `greeting_${iso}`,
        title,
        body,
        android: {
          smallIcon: 'notification_icon',
          color: '#D4AF37',
          channelId: 'ezan_daily_content',
          importance: AndroidImportance.DEFAULT,
          pressAction: { id: 'default' },
        },
        data: { type: 'greeting', occasion, timestamp: fireAt.getTime().toString() },
      }, trigger);
      count++;
    } catch (e) {
      devError('Failed to schedule greeting reminder', e);
    }
  }
  return count;
};

export const sendImmediateNotification = async (title: string, body: string) => {
  try {
    const prefs = await getNotificationPrefs();
    const exactChannelId = getExactChannelId(prefs.exactSound);
    await notifee.displayNotification({
      title,
      body,
      android: {
        category: AndroidCategory.ALARM,
        smallIcon: 'notification_icon',
        color: '#D4AF37',
        channelId: exactChannelId,
        sound: prefs.exactSound || 'azizallah',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: i18n.t('notifications.silenceAction', { defaultValue: 'Sustur' }),
            pressAction: {
              id: 'stop_sound',
            },
          },
        ],
      },
    });
  } catch (error) {
    devError('Error sending immediate notification:', error);
  }
};

export const scheduleTestNotification = async (type: 'exact' | 'warning', t: any) => {
  const triggerDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.SET_ALARM_CLOCK,
    },
  };

  try {
    const prefs = await getNotificationPrefs();
    const exactChannelId = getExactChannelId(prefs.exactSound);
    const warningChannelId = getWarningChannelId(prefs.warningSound);

    if (type === 'exact') {
      await notifee.createTriggerNotification({
        id: `test_exact`,
        title: t('notifications.fajr.title') || 'Tam Ezan (Test)',
        body: t('notifications.fajr.body') || 'Ezan vakti girdi.',
        android: {
          category: AndroidCategory.ALARM,
          smallIcon: 'notification_icon',
          color: '#D4AF37',
          channelId: exactChannelId,
          sound: prefs.exactSound || 'azizallah',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: i18n.t('notifications.silenceAction', { defaultValue: 'Sustur' }),
              pressAction: { id: 'stop_sound' },
            },
          ],
        },
        data: { type: 'exact', prayerId: 'fajr' },
      }, trigger);
      devLog('Test EXACT notification scheduled for 10s later');
    } else {
      await notifee.createTriggerNotification({
        id: `test_warn`,
        title: t('notifications.warningTitle') || 'Ezan Yaklaşıyor (Test)',
        body: withMinutes(t('notifications.warningBody', { prayer: 'Test' }) || 'Ezan vaktine 25 dakika kaldı.', getWarnMinutes(prefs)),
        android: {
          category: AndroidCategory.ALARM,
          smallIcon: 'notification_icon',
          color: '#D4AF37',
          channelId: warningChannelId,
          sound: prefs.warningSound || 'adhan_25minutes',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: i18n.t('notifications.silenceAction', { defaultValue: 'Sustur' }),
              pressAction: { id: 'stop_sound' },
            },
          ],
        },
        data: { type: 'warning', prayerId: 'fajr' },
      }, trigger);
      devLog('Test WARNING notification scheduled for 10s later');
    }
  } catch (e) {
    devError('Test notification schedule failed:', e);
  }
};
