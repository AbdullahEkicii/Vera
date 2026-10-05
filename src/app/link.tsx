import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useQuranSettings } from '../context/QuranSettingsContext';
import { recordReferralIfPresent } from '../services/referralService';
import { checkJuzStatus, downloadJuz, getFirstPageOfSurah } from '../services/quranRepository';
import { SURAHS, getJuzsForSurah } from '../data/quranMeta';
import { logEvent } from '../services/analyticsService';

/**
 * Central redirect target for marketing/sharing deep links, e.g.:
 *   ezanapp://link?type=invite&ref=ABC123   — referral invite
 *   ezanapp://link?type=surah&id=36         — jump straight to a surah
 *   ezanapp://link?type=name&id=1           — open the 99 Names / Duas screen
 *   ezanapp://link?type=dua&id=1
 *
 * Kept as a single thin route rather than one file per link type, since all of
 * them just resolve a target and redirect.
 */
export default function DeepLinkHandler() {
  const params = useLocalSearchParams<{ type?: string; id?: string; ref?: string }>();
  const { isDark } = useTheme();
  const { scriptType } = useQuranSettings();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    (async () => {
      const { type, id, ref } = params;
      logEvent('deep_link_opened', { link_type: type || 'unknown' });

      try {
        if (type === 'invite') {
          await recordReferralIfPresent(ref);
          router.replace('/(tabs)');
          return;
        }

        if (type === 'surah' && id) {
          const surahNo = Number(id);
          const surah = SURAHS.find((s) => s.number === surahNo);
          if (surah) {
            const requiredJuzs = getJuzsForSurah(surah.number);
            for (const jNo of requiredJuzs) {
              const status = await checkJuzStatus(jNo, scriptType);
              if (status.status !== 'Downloaded') {
                await downloadJuz(jNo, 'ar', scriptType);
              }
            }
            const page = (await getFirstPageOfSurah(surah.number).catch(() => null)) ?? surah.page;
            router.replace({
              pathname: '/quran-reading',
              params: { page: String(page), surahName: surah.nameTurkish, juz: String(surah.juz) },
            });
            return;
          }
        }

        if (type === 'name' || type === 'dua') {
          router.replace({ pathname: '/(tabs)', params: { tab: '4' } });
          return;
        }

        router.replace('/(tabs)');
      } catch {
        router.replace('/(tabs)');
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D1117' : '#F0F4F8' }]}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
