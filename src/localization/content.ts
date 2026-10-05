import i18n from './i18n';
import { HIJRI_MONTHS_EN, HIJRI_MONTHS_TR, RELIGIOUS_DAY_DEFS, ReligiousDay } from '../data/religiousDays';

/**
 * Translated app content (hajj steps, achievements, religious days, card templates…).
 *
 * The data files keep their Turkish and English text as the source of truth;
 * `scripts/i18n-content.mjs` copies it into `content.*` keys of tr.json/en.json and
 * the other languages are translated from there. The TR/EN arguments are the
 * fallback if a key is missing, so a new data entry still shows before it is synced.
 */
export const ct = (key: string, tr?: string, en?: string): string => {
  const fallback = (i18n.language || '').startsWith('tr') ? (tr ?? en ?? '') : (en ?? tr ?? '');
  return i18n.t(key, { defaultValue: fallback });
};

/** Hijri month name (1-12) in the current language. */
export const hijriMonthName = (month: number): string =>
  ct(`content.hijriMonths.${month}`, HIJRI_MONTHS_TR[month - 1], HIJRI_MONTHS_EN[month - 1]);

/** Name or description of a computed religious day (ids look like `mevlid-1448`). */
export const religiousDayText = (day: ReligiousDay, field: 'name' | 'description'): string => {
  const defId = day.id.replace(/-\d+$/, '');
  const def = RELIGIOUS_DAY_DEFS.find((d) => d.id === defId);
  const text = field === 'name'
    ? ct(`content.religiousDays.${defId}.name`, def?.nameTR ?? day.nameTR, def?.nameEN ?? day.nameEN)
    : ct(`content.religiousDays.${defId}.description`, def?.descriptionTR ?? day.descriptionTR, def?.descriptionEN ?? day.descriptionEN);
  return field === 'name' && defId === 'hijri-new-year' ? `${text} (${day.hijriYear})` : text;
};
