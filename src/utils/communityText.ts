import type { CommunityPostParams, CommunityTemplateKey } from './community';

export type Translate = (key: string, defaultValue: string, options?: Record<string, unknown>) => string;

/** Country name in the viewer's language, via the platform's own names (no machine translation). */
export function countryDisplayName(code: string | undefined | null, lang: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Flag emoji for a two-letter region code, built from regional indicator symbols. Empty when unknown. */
export function countryFlag(code: string | undefined | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** The post text for a template, already written in the viewer's language by the translation files. */
export function templateText(
  t: Translate,
  templateKey: CommunityTemplateKey,
  params: CommunityPostParams,
  lang: string
): string {
  const country = countryDisplayName(params.country, lang);
  switch (templateKey) {
    case 'hatim.completed':
      return t('community.templates.hatimCompleted', 'Bir hatim tamamlandı');
    case 'achievement':
      return t('community.templates.achievement', '{{title}} başarımını açtı', { title: params.title ?? '' });
    case 'dhikr.milestone':
      return t('community.templates.dhikrMilestone', "{{country}}'den biri {{count}} serbest zikir çekti", {
        country: country || t('community.someone', 'Biri'),
        count: params.count ?? 0,
      });
    case 'prayer.fullday':
      return t('community.templates.prayerFullday', 'Bugün 5 vakit namaz kılındı');
    default:
      return '';
  }
}
