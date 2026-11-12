/** Pure helpers for notification preferences (no React Native imports, so they are unit-tested). */

export interface SoundPrefs {
  exactSound?: string;
  warnMinutes?: number;
  sounds?: Partial<Record<string, string>>;
}

export const WARN_MINUTE_CHOICES = [5, 10, 15, 25, 30] as const;
export const FRIDAY_MINUTE_CHOICES = [30, 45, 60] as const;

export const getWarnMinutes = (prefs: SoundPrefs): number => {
  const m = prefs.warnMinutes;
  return typeof m === 'number' && m >= 5 && m <= 30 ? Math.round(m) : 25;
};

/** The adhan sound for one prayer: its own choice, else the global one. */
export const getExactSoundFor = (prefs: SoundPrefs, prayerId: string): string => {
  const own = (prefs.sounds as Record<string, string | undefined> | undefined)?.[prayerId];
  return own || prefs.exactSound || 'azizallah';
};

// Translated strings were written for the original 25-minute warning ("-25dk", "25 minutes
// left until ..."); swap that number for the configured one rather than keep 35 copies.
export const withMinutes = (text: string, minutes: number): string =>
  text.replace(/25|٢٥|۲۵/, String(minutes));

