import { getCrashlytics, recordError, setAttribute, log as crashlyticsLog } from '@react-native-firebase/crashlytics';

/**
 * Reports a JavaScript error to Firebase Crashlytics as a non-fatal issue.
 * Never throws — a failure to report a crash must not itself crash the app.
 */
export function reportError(error: Error, context?: string): void {
  try {
    const crashlytics = getCrashlytics();
    if (context) {
      crashlyticsLog(crashlytics, context);
    }
    recordError(crashlytics, error);
  } catch (e) {
    if (__DEV__) console.error('[Crashlytics] Failed to report error:', e);
  }
}

/** Adds a breadcrumb that is attached to any crash or non-fatal report that follows. */
export function logBreadcrumb(message: string): void {
  try {
    crashlyticsLog(getCrashlytics(), message);
  } catch {}
}

/** Tags subsequent crash/error reports with a screen or feature name for easier triage. */
export function setCrashContext(key: string, value: string): void {
  try {
    setAttribute(getCrashlytics(), key, value);
  } catch {}
}
