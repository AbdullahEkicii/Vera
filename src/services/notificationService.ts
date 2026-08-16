import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, TimestampTrigger, TriggerType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import i18n from '../localization/i18n';
import { DayData } from './api';

const PREFS_KEY = 'NOTIFICATION_PREFS';

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
}

const defaultPrefs: NotificationPrefs = {
  fajr: true,
  sunrise: false,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  fajr_warn: true,
  sunrise_warn: false,
  dhuhr_warn: true,
  asr_warn: true,
  maghrib_warn: true,
  isha_warn: true,
  exactSound: 'azizallah',
  warningSound: 'adhan_25minutes',
};

export const getExactChannelId = (soundName?: string) => {
  const sound = soundName || 'azizallah';
  return `ezan_exact_${sound}_v14`;
};

export const getWarningChannelId = (soundName?: string) => {
  const sound = soundName || 'adhan_25minutes';
  return `ezan_warning_${sound}_v14`;
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
      // v13 channels — replaced by v14
      'ezan_exact_azizallah_v13', 'ezan_warning_azizallah_v13',
      'ezan_exact_adhan_25minutes_v13', 'ezan_warning_adhan_25minutes_v13',
      'ezan_exact_allahu_akbar_v13', 'ezan_warning_allahu_akbar_v13',
      'ezan_exact_adhan_v13', 'ezan_warning_adhan_v13',
      // adhan ses dosyası silindi — tüm adhan kanallarını temizle
      'ezan_exact_adhan_v14', 'ezan_warning_adhan_v14',
    ];
    for (const legacyId of LEGACY_CHANNEL_IDS) {
      try { await notifee.deleteChannel(legacyId); } catch (e) {}
    }

    const prefs = await getNotificationPrefs();
    const exactSoundName = customExactSound || prefs.exactSound || 'azizallah';
    const warningSoundName = customWarningSound || prefs.warningSound || 'adhan_25minutes';

    const exactChannelId = getExactChannelId(exactSoundName);
    const warningChannelId = getWarningChannelId(warningSoundName);

    // Delete unused sound channels to keep channel list clean
    const KNOWN_SOUNDS = ['azizallah', 'adhan_25minutes', 'allahu_akbar'];
    for (const s of KNOWN_SOUNDS) {
      if (s !== exactSoundName) {
        try { await notifee.deleteChannel(getExactChannelId(s)); } catch(e) {}
      }
      if (s !== warningSoundName) {
        try { await notifee.deleteChannel(getWarningChannelId(s)); } catch(e) {}
      }
    }

    const { AlarmChannelModule } = NativeModules;
    console.log('📢 Native AlarmChannelModule present in NativeModules?', !!AlarmChannelModule);

    if (AlarmChannelModule) {
      try {
        await AlarmChannelModule.createAlarmChannel(
          exactChannelId,
          i18n.t('notifications.channels.exactName', { defaultValue: 'Ezan Vakti' }),
          i18n.t('notifications.channels.exactDesc', { defaultValue: 'Namaz vakti girdiğinde çalar.' }),
          exactSoundName
        ).catch((e: any) => console.error('createAlarmChannel (exact) failed:', e));
        await AlarmChannelModule.createAlarmChannel(
          warningChannelId,
          i18n.t('notifications.channels.warningName', { defaultValue: 'Ezan Yaklaşıyor (25 dk)' }),
          i18n.t('notifications.channels.warningDesc', { defaultValue: 'Ezan vaktine 25 dakika kala uyarı verir.' }),
          warningSoundName
        ).catch((e: any) => console.error('createAlarmChannel (warning) failed:', e));
        console.log(`✅ AlarmChannelModule: channels created with sounds: exact=${exactSoundName} (${exactChannelId}), warn=${warningSoundName} (${warningChannelId})`);
      } catch (e) {
        console.error('Failed to create native alarm channels:', e);
      }
    } else {
      // Fallback for environments without the native module
      await notifee.createChannel({
        id: exactChannelId,
        name: i18n.t('notifications.channels.exactName', { defaultValue: 'Ezan Vakti' }),
        description: i18n.t('notifications.channels.exactDesc', { defaultValue: 'Namaz vakti girdiğinde çalar.' }),
        importance: AndroidImportance.HIGH,
        sound: exactSoundName,
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: true,
      });

      await notifee.createChannel({
        id: warningChannelId,
        name: i18n.t('notifications.channels.warningName', { defaultValue: 'Ezan Yaklaşıyor (25 dk)' }),
        description: i18n.t('notifications.channels.warningDesc', { defaultValue: 'Ezan vaktine 25 dakika kala uyarı verir.' }),
        importance: AndroidImportance.HIGH,
        sound: warningSoundName,
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    // Daily Content Channel
    await notifee.createChannel({
      id: 'ezan_daily_content',
      name: i18n.t('notifications.channels.dailyName', { defaultValue: 'Günün İçeriği' }),
      description: i18n.t('notifications.channels.dailyDesc', { defaultValue: 'Her gün öğle ile ikindi arasında günün ayeti/hadisi/sözü gelir.' }),
      importance: AndroidImportance.DEFAULT,
    });

    // Delete old silent persistent channel if exists
    try { await notifee.deleteChannel('ezan_persistent_status'); } catch (e) {}

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

  if (!enabled) {
    try {
      await notifee.cancelNotification(NOTIF_ID);
    } catch (e) {}
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

    // Calculate human-readable countdown using localized units
    const now = Date.now();
    const diffMs = targetTimestampMs - now;
    let countdownText = '';
    if (diffMs > 0) {
      const totalMinutes = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const hUnit = i18n.t('notifications.persistent.hoursUnit', { defaultValue: 'sa' });
      const mUnit = i18n.t('notifications.persistent.minutesUnit', { defaultValue: 'dk' });
      const suffix = i18n.t('notifications.persistent.countdown', { defaultValue: 'sonra' });
      countdownText = h > 0 ? `${h}${hUnit} ${m}${mUnit} ${suffix}` : `${m}${mUnit} ${suffix}`;
    } else {
      countdownText = i18n.t('notifications.persistent.prayerEntered', { defaultValue: 'Vakit Girdi' });
    }

    // Large Bold Title for clear visibility on lock screen & status bar
    const title = `⏳ ${countdownText}  ·  🕌 ${nextPrayerName}`;
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
    console.error('Error updating persistent notification:', error);
  }
};

export const requestNotificationPermissions = async () => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
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
    return parsed;
  } catch (error) {
    return defaultPrefs;
  }
};

export const saveNotificationPrefs = async (prefs: NotificationPrefs) => {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving prefs', error);
  }
};

export const schedulePrayerNotifications = async (data: DayData[], prefs: NotificationPrefs, _t: any) => {
  const t = i18n.t.bind(i18n);

  // Clear previously scheduled trigger notifications without clearing persistent ongoing notifications
  try {
    await notifee.cancelTriggerNotifications();
  } catch (e) {
    console.error('Failed to cancel trigger notifications:', e);
  }

  const exactChannelId = getExactChannelId(prefs.exactSound);
  const warningChannelId = getWarningChannelId(prefs.warningSound);

  const now = new Date();
  const limit = 84; // 7 days of exact + warning alarms (12 per day = 84 max)
  let scheduledCount = 0;
  let dailyContentCount = 0;
  let quranReminderCount = 0;

  let dayIndex = 0;
  for (const day of data) {
    if (scheduledCount >= limit && dailyContentCount >= 7) break;

    const [dayStr, monthStr, yearStr] = day.date.gregorian.date.split('-');
    const baseDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

    if (baseDate.getTime() + 86400000 < now.getTime()) continue;
    dayIndex++;
    if (dayIndex > 7) break; // Keep strictly within a 7-day rolling window

    // Daily Content Notification Scheduling (up to 7 days)
    if (dailyContentCount < 7) {
      const cleanTime = day.timings.Dhuhr.split(' ')[0];
      const [dh, dm] = cleanTime.split(':');
      const dhuhrDate = new Date(baseDate);
      dhuhrDate.setHours(parseInt(dh), parseInt(dm), 0, 0);

      const triggerDate = new Date(dhuhrDate.getTime() + 90 * 60 * 1000); // 1.5 hours after Dhuhr

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

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerDate.getTime(),
            alarmManager: { allowWhileIdle: true },
          };

          await notifee.createTriggerNotification({
            id: `daily-content-${triggerDate.getTime()}`,
            title,
            body,
            android: {
              smallIcon: 'notification_icon',
              color: '#D4AF37',
              channelId: 'ezan_daily_content',
              importance: AndroidImportance.DEFAULT,
              pressAction: { id: 'default' },
            },
            data: { type: 'daily_content' },
          }, trigger);

          dailyContentCount++;
        } catch (e) {
          console.error('Failed to schedule daily content', e);
        }
      }
    }

    // Quran Reminder Notification (Every 2 days at 20:00 in the evening)
    if (dayIndex % 2 === 0 && quranReminderCount < 4) {
      const quranDate = new Date(baseDate);
      quranDate.setHours(20, 0, 0, 0);
      if (quranDate > now) {
        try {
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: quranDate.getTime(),
            alarmManager: { allowWhileIdle: true },
          };
          await notifee.createTriggerNotification({
            id: `quran-reminder-${quranDate.getTime()}`,
            title: t('notifications.quranReminderTitle', '📖 Kur\'an-ı Kerim Vakti'),
            body: t('notifications.quranReminderBody', 'Bugün Kur\'an okudun mu? Tıkla ve hemen okumaya başla.'),
            android: {
              smallIcon: 'notification_icon',
              color: '#D4AF37',
              channelId: 'ezan_daily_content',
              importance: AndroidImportance.DEFAULT,
              pressAction: { id: 'default' },
            },
            data: { type: 'quran' },
          }, trigger);
          quranReminderCount++;
        } catch (e) {
          console.error('Failed to schedule quran reminder', e);
        }
      }
    }

    if (scheduledCount < limit) {
      const prayers = [
        { id: 'fajr', time: day.timings.Fajr },
        { id: 'sunrise', time: day.timings.Sunrise },
        { id: 'dhuhr', time: day.timings.Dhuhr },
        { id: 'asr', time: day.timings.Asr },
        { id: 'maghrib', time: day.timings.Maghrib },
        { id: 'isha', time: day.timings.Isha },
      ];

      for (const prayer of prayers) {
        const isExactEnabled = prefs[prayer.id as keyof NotificationPrefs];
        const isWarnEnabled = prefs[`${prayer.id}_warn` as keyof NotificationPrefs];

        if (isExactEnabled || isWarnEnabled) {
          const cleanTime = prayer.time.split(' ')[0];
          const [h, m] = cleanTime.split(':');
          const triggerDate = new Date(baseDate);
          triggerDate.setHours(parseInt(h), parseInt(m), 0, 0);

          // Tam ezan vakti bildirimi
          if (isExactEnabled && triggerDate > now) {
            try {
              const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerDate.getTime(),
                alarmManager: {
                  allowWhileIdle: true,
                },
              };

              await notifee.createTriggerNotification({
                id: `exact-${prayer.id}-${triggerDate.getTime()}`,
                title: t(`notifications.${prayer.id}.title`),
                body: t(`notifications.${prayer.id}.body`),
                android: {
                  category: AndroidCategory.ALARM,
                  smallIcon: 'notification_icon',
                  color: '#D4AF37',
                  channelId: exactChannelId,
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
            } catch (e) {
              console.error('Failed to schedule exact alert', e);
            }
          }

          // 25 dakika öncesi bildirimi
          if (isWarnEnabled) {
            const warningDate = new Date(triggerDate.getTime() - 25 * 60 * 1000);
            if (warningDate > now) {
              try {
                const trigger: TimestampTrigger = {
                  type: TriggerType.TIMESTAMP,
                  timestamp: warningDate.getTime(),
                  alarmManager: {
                    allowWhileIdle: true,
                  },
                };

                await notifee.createTriggerNotification({
                  id: `warn-${prayer.id}-${warningDate.getTime()}`,
                  title: t('notifications.warningTitle'),
                  body: t('notifications.warningBody', { prayer: t(`home.prayers.${prayer.id}`) }),
                  android: {
                    category: AndroidCategory.ALARM,
                    smallIcon: 'notification_icon',
                    color: '#D4AF37',
                    channelId: warningChannelId,
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
                console.error('Failed to schedule warning alert', e);
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
  console.log(`Scheduled ${scheduledCount} prayer notifications and ${dailyContentCount} daily content notifications via Notifee.`);
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
    console.error('Error sending immediate notification:', error);
  }
};

export const scheduleTestNotification = async (type: 'exact' | 'warning', t: any) => {
  const triggerDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  try {
    const prefs = await getNotificationPrefs();
    const exactChannelId = getExactChannelId(prefs.exactSound);
    const warningChannelId = getWarningChannelId(prefs.warningSound);

    if (type === 'exact') {
      await notifee.createTriggerNotification({
        id: `test-exact-${triggerDate.getTime()}`,
        title: t('notifications.fajr.title') || 'Tam Ezan (Test)',
        body: t('notifications.fajr.body') || 'Ezan vakti girdi.',
        android: {
          category: AndroidCategory.ALARM,
          smallIcon: 'notification_icon',
          color: '#D4AF37',
          channelId: exactChannelId,
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
      console.log('Test EXACT notification scheduled for 10s later');
    } else {
      await notifee.createTriggerNotification({
        id: `test-warn-${triggerDate.getTime()}`,
        title: t('notifications.warningTitle') || 'Ezan Yaklaşıyor (Test)',
        body: t('notifications.warningBody', { prayer: 'Test' }) || 'Ezan vaktine 25 dakika kaldı.',
        android: {
          category: AndroidCategory.ALARM,
          smallIcon: 'notification_icon',
          color: '#D4AF37',
          channelId: warningChannelId,
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
      console.log('Test WARNING notification scheduled for 10s later');
    }
  } catch (e) {
    console.error('Test notification schedule failed:', e);
  }
};
