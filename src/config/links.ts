// External links used by the app UI.

// Public privacy policy page. Google Play requires the policy to be reachable from the app
// for apps that use location and ads. Leave empty until the final URL exists: Settings only
// shows the row when this is a valid https URL, and never links to a placeholder.
export const PRIVACY_POLICY_URL = '';

export const ANDROID_PACKAGE = 'com.abdllhekc.vera';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const PLAY_STORE_APP_URL = `market://details?id=${ANDROID_PACKAGE}`;

export const isHttpsUrl = (value: string): boolean => /^https:\/\/[^\s]+$/i.test(value);
