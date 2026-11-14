import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { SecureLocationStorage } from './storageService';
import { fetchPrayerTimes } from './api';
import { getNotificationPrefs, schedulePrayerNotifications } from './notificationService';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

export const PRAYER_REFRESH_TASK = 'ezan-prayer-notifications-refresh';

// Keeps the rolling (21-day) notification schedule alive even if the user
// doesn't open the app for an extended period (OS may run this every few
// hours to once a day depending on battery/usage — see registerTaskAsync below).
try {
TaskManager.defineTask(PRAYER_REFRESH_TASK, async () => {
  try {
    const savedLocationStr =
      (await SecureLocationStorage.getItem('MANUAL_LOCATION')) ||
      (await SecureLocationStorage.getItem('LAST_GPS_LOCATION'));

    if (!savedLocationStr) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const location = JSON.parse(savedLocationStr);
    if (!location?.latitude || !location?.longitude) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const data = await fetchPrayerTimes(location.latitude, location.longitude);
    const prefs = await getNotificationPrefs();
    await schedulePrayerNotifications(data, prefs, null);

    devLog('✅ Background prayer notification refresh completed');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    devError('Background prayer notification refresh failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
} catch (e) {
  devError('Could not define the prayer refresh task:', e);
}

export async function registerBackgroundPrayerRefreshTask(): Promise<void> {
  try {
    // Re-register on every launch instead of trusting an earlier registration: OEM battery
    // managers and app updates silently drop the periodic work, and nothing else would
    // notice. The call replaces any existing registration, so it is safe to repeat.
    await TaskManager.isTaskRegisteredAsync(PRAYER_REFRESH_TASK);
    await BackgroundTask.registerTaskAsync(PRAYER_REFRESH_TASK, {
      minimumInterval: 6 * 60, // minutes; OS decides actual cadence
    });
    devLog('✅ Background prayer notification refresh task registered');
  } catch (e) {
    devError('Failed to register background prayer refresh task:', e);
  }
}
