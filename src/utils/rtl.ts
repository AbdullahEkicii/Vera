import { I18nManager } from 'react-native';

// Right-to-left scripts among the supported languages.
const RTL_LANGUAGES = ['ar', 'fa', 'ur'];

export const isRtlLanguage = (language?: string | null): boolean =>
  !!language && RTL_LANGUAGES.includes(language.split(/[-_]/)[0].toLowerCase());

/**
 * Makes the native layout direction follow the app language. A change only takes effect
 * after the next app start (React Native reads it at launch), so the return value says
 * whether the user should be asked to restart.
 */
export const applyLayoutDirection = (language?: string | null): boolean => {
  try {
    const wantRtl = isRtlLanguage(language);
    I18nManager.allowRTL(true);
    // Always write the wanted direction: the native value pending for the next launch is not
    // readable, and the last write must win (several callers run during one startup).
    I18nManager.forceRTL(wantRtl);
    // `isRTL` is what THIS launch runs with; a difference means a restart is needed.
    return I18nManager.isRTL !== wantRtl;
  } catch {
    // layout direction is best effort
  }
  return false;
};

/** Mirror a directional icon (arrows, chevrons) in right-to-left layouts. */
export const directionalIconStyle = I18nManager.isRTL ? ({ transform: [{ scaleX: -1 }] } as const) : undefined;
