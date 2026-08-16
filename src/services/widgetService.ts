import { NativeModules, Platform } from 'react-native';

const { WidgetModule } = NativeModules;

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
  if (Platform.OS !== 'android' || !WidgetModule || typeof WidgetModule.updateWidgetData !== 'function') {
    return;
  }

  try {
    WidgetModule.updateWidgetData(
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
  if (Platform.OS !== 'android' || !WidgetModule || typeof WidgetModule.requestPinWidget !== 'function') {
    return false;
  }
  try {
    const res = await WidgetModule.requestPinWidget();
    return !!res;
  } catch (error) {
    console.error('Error requesting pin widget:', error);
    return false;
  }
};
