import { NativeModules, Platform } from 'react-native';

// Resolved on use, not at import: touching NativeModules instantiates the native module, and an
// error there during bundle evaluation is fatal.
const getWidgetModule = (): any => {
  try {
    return NativeModules.WidgetModule;
  } catch {
    return undefined;
  }
};

export interface WidgetData {
  city: string;
  nextName: string;
  nextTime: string;
  countdown: string;
  summary: string;
  hoursUnit?: string;
  minutesUnit?: string;
  countdownSuffix?: string;
  staleMessage?: string;
}

export const updateAndroidWidget = (data: WidgetData) => {
  if (Platform.OS !== 'android' || !getWidgetModule() || typeof getWidgetModule().updateWidgetData !== 'function') {
    return;
  }

  try {
    getWidgetModule().updateWidgetData(
      data.city,
      data.nextName,
      data.nextTime,
      data.countdown,
      data.summary,
      data.hoursUnit ?? 'h',
      data.minutesUnit ?? 'm',
      data.countdownSuffix ?? '',
      data.staleMessage ?? 'Vakit Girdi'
    );
  } catch (error) {
    console.error('Error updating Android widget via NativeModule:', error);
  }
};

export const requestPinWidget = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !getWidgetModule() || typeof getWidgetModule().requestPinWidget !== 'function') {
    return false;
  }
  try {
    const res = await getWidgetModule().requestPinWidget();
    return !!res;
  } catch (error) {
    console.error('Error requesting pin widget:', error);
    return false;
  }
};
