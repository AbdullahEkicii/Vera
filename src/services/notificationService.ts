import notifee, { AndroidImportance, AndroidVisibility, TimestampTrigger, TriggerType, AndroidForegroundServiceType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DayData } from './api';
import i18n from '../localization/i18n';

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
};

export const initNotifications = async () => {
  if (Platform.OS === 'android') {
    // Exact Time Channel
    await notifee.createChannel({
      id: 'ezan_exact_v4',
      name: 'Ezan Vakti',
      description: 'Namaz vakti girdiğinde çalar.',
      importance: AndroidImportance.HIGH,
      sound: 'silent',
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
      visibility: AndroidVisibility.PUBLIC,
      bypassDnd: true,
    });

    // 25 Mins Warning Channel
    await notifee.createChannel({
      id: 'ezan_warning_v4',
      name: 'Ezan Yaklaşıyor (25 dk)',
      description: 'Ezan vaktine 25 dakika kala uyarı verir.',
      importance: AndroidImportance.HIGH,
      sound: 'silent',
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
      visibility: AndroidVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Daily Content Channel
    await notifee.createChannel({
      id: 'ezan_daily_content',
      name: 'Günün İçeriği',
      description: 'Her gün öğle ile ikindi arasında günün ayeti/hadisi/sözü gelir.',
      importance: AndroidImportance.DEFAULT,
    });
  }
};

export const requestNotificationPermissions = async () => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
};

export const getNotificationPrefs = async (): Promise<NotificationPrefs> => {
  try {
    const data = await AsyncStorage.getItem(PREFS_KEY);
    return data ? JSON.parse(data) : defaultPrefs;
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

export const schedulePrayerNotifications = async (data: DayData[], prefs: NotificationPrefs, t: any) => {
  // Clear all previously scheduled notifications
  await notifee.cancelAllNotifications();

  const now = new Date();
  const limit = 60; // Set limit to 60 as before
  let scheduledCount = 0;
  let dailyContentCount = 0;

  for (const day of data) {
    if (scheduledCount >= limit && dailyContentCount >= 7) break;

    const [dayStr, monthStr, yearStr] = day.date.gregorian.date.split('-');
    const baseDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

    // If this date is strictly in the past (before today), skip
    if (baseDate.getTime() + 86400000 < now.getTime()) continue;

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
            body = t('daily.verseBody', 'Click to read the verse of the day!') || 'Click to read the verse of the day!';
          } else if (typeIndex === 1) {
            title = t('daily.hadith', 'Günün Hadisi') || 'Günün Hadisi';
            body = t('daily.hadithBody', 'Click to read the hadith of the day!') || 'Click to read the hadith of the day!';
          } else {
            title = t('daily.quote', 'Günün Sözü') || 'Günün Sözü';
            body = t('daily.quoteBody', 'Click to read the quote of the day!') || 'Click to read the quote of the day!';
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
                channelId: 'ezan_exact_v4',
                importance: AndroidImportance.HIGH,
                asForegroundService: true,
                foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK],
                pressAction: {
                  id: 'default',
                },
                actions: [
                  {
                    title: 'Sustur',
                    pressAction: {
                      id: 'stop_sound',
                    },
                  },
                ],
              },
              data: {
                type: 'exact',
                prayerId: prayer.id,
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
                  channelId: 'ezan_warning_v4',
                  importance: AndroidImportance.HIGH,
                  pressAction: {
                    id: 'default',
                  },
                  actions: [
                    {
                      title: 'Sustur',
                      pressAction: {
                        id: 'stop_sound',
                      },
                    },
                  ],
                },
                data: {
                  type: 'warning',
                  prayerId: prayer.id,
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
    }
  }
  console.log(`Scheduled ${scheduledCount} prayer notifications and ${dailyContentCount} daily content notifications via Notifee.`);
};

export const sendImmediateNotification = async (title: string, body: string) => {
  try {
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: 'ezan_exact_v4',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Sustur',
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

// TEST FUNCTION for 1 min scheduling
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
    if (type === 'exact') {
      await notifee.createTriggerNotification({
        id: `test-exact-${triggerDate.getTime()}`,
        title: t('notifications.fajr.title') || 'Tam Ezan (Test)',
        body: t('notifications.fajr.body') || 'Ezan vakti girdi.',
        android: {
          channelId: 'ezan_exact_v4',
          importance: AndroidImportance.HIGH,
          asForegroundService: true,
          foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK],
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: 'Sustur',
              pressAction: { id: 'stop_sound' },
            },
          ],
        },
        data: { type: 'exact', prayerId: 'fajr' },
      }, trigger);
      console.log('Test EXACT notification scheduled for 1 min later');
    } else {
      await notifee.createTriggerNotification({
        id: `test-warn-${triggerDate.getTime()}`,
        title: t('notifications.warningTitle') || 'Ezan Yaklaşıyor (Test)',
        body: t('notifications.warningBody', { prayer: 'Test' }) || 'Ezan vaktine 25 dakika kaldı.',
        android: {
          channelId: 'ezan_warning_v4',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: 'Sustur',
              pressAction: { id: 'stop_sound' },
            },
          ],
        },
        data: { type: 'warning', prayerId: 'fajr' },
      }, trigger);
      console.log('Test WARNING notification scheduled for 1 min later');
    }
  } catch (e) {
    console.error('Test notification schedule failed:', e);
  }
};
