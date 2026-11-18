import { DevSettings, I18nManager, Platform } from 'react-native';
import { AppStorage } from '../services/storageService';

// Right-to-left scripts among the supported languages.
const RTL_LANGUAGES = ['ar', 'fa', 'ur'];
const RTL_RELOAD_GUARD_KEY = '__RTL_LAST_RELOAD_DIR';
const RTL_RELOAD_TIME_KEY = '__RTL_LAST_RELOAD_AT';
const RELOAD_COOLDOWN_MS = 6000;

export const isRtlLanguage = (language?: string | null): boolean =>
  !!language && RTL_LANGUAGES.includes(language.split(/[-_]/)[0].toLowerCase());

/**
 * Makes the native layout direction follow the app language.
 * Both `allowRTL` and `forceRTL` must match `wantRtl` — leaving `allowRTL(true)` while
 * `forceRTL(false)` causes Android's `I18nUtil.isRTL` to remain true on RTL system locales.
 * Returns true when the current runtime's `I18nManager.isRTL` differs and needs a reload.
 */
export const applyLayoutDirection = (language?: string | null): boolean => {
  try {
    const wantRtl = isRtlLanguage(language);
    I18nManager.allowRTL(wantRtl);
    I18nManager.forceRTL(wantRtl);
    return I18nManager.isRTL !== wantRtl;
  } catch {
    // layout direction is best effort
  }
  return false;
};

/**
 * Reloads the React Native runtime so native Yoga / `I18nManager.isRTL` matches the
 * newly written `allowRTL` / `forceRTL` flags. Guarded by a short cooldown so a platform
 * edge case can never cause an infinite reload loop.
 */
export const reloadForLayoutDirection = async (wantRtl: boolean): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    const targetDir = wantRtl ? 'rtl' : 'ltr';
    const lastDir = AppStorage.getString(RTL_RELOAD_GUARD_KEY);
    const lastAt = Number(AppStorage.getString(RTL_RELOAD_TIME_KEY) || '0');
    const now = Date.now();
    if (lastDir === targetDir && Number.isFinite(lastAt) && now - lastAt < RELOAD_COOLDOWN_MS) {
      return false;
    }
    AppStorage.setString(RTL_RELOAD_GUARD_KEY, targetDir);
    AppStorage.setString(RTL_RELOAD_TIME_KEY, String(now));

    try {
      const { reloadAppAsync } = require('expo') as { reloadAppAsync?: (reason?: string) => Promise<void> };
      if (typeof reloadAppAsync === 'function') {
        await reloadAppAsync('Applying layout direction');
        return true;
      }
    } catch {
      // fall through to DevSettings in dev builds
    }

    if (__DEV__ && typeof DevSettings?.reload === 'function') {
      DevSettings.reload('Applying layout direction');
      return true;
    }
  } catch {
    // ignore reload errors and fall back to user prompt
  }
  return false;
};

/** Mirror a directional icon (arrows, chevrons) in right-to-left layouts. */
export const getDirectionalIconStyle = () =>
  I18nManager.isRTL ? ({ transform: [{ scaleX: -1 }] } as const) : undefined;

export const directionalIconStyle = getDirectionalIconStyle();
