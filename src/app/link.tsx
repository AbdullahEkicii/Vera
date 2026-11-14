import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { recordReferralIfPresent } from '../services/referralService';
import { getFirstPageOfSurah } from '../services/quranRepository';
import { SURAHS } from '../data/quranMeta';
import { logEvent } from '../services/analyticsService';

/**
 * Central redirect target for marketing/sharing deep links, e.g.:
 *   ezanapp://link?type=invite&ref=ABC123   — referral invite
 *   ezanapp://link?type=surah&id=36         — jump straight to a surah
 *   ezanapp://link?type=name&id=1           — open the 99 Names / Duas screen
 *   ezanapp://link?type=dua&id=1
 *
 * Params come from outside the app, so they are untrusted: unknown types fall through to
 * the home tab, ids must be plain integers in range, and a link never starts downloads
 * (the reader fetches what it needs itself).
 *
 * Kept as a single thin route rather than one file per link type, since all of
 * them just resolve a target and redirect.
 */
export default function DeepLinkHandler() {
  const params = useLocalSearchParams<{ type?: string; id?: string; ref?: string }>();
  const { isDark } = useTheme();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    (async () => {
      const { type, id, ref } = params;
      const knownTypes = ['invite', 'surah', 'name', 'dua'];
      const safeType = typeof type === 'string' && knownTypes.includes(type) ? type : 'unknown';
      logEvent('deep_link_opened', { link_type: safeType });

      try {
        if (safeType === 'invite') {
          await recordReferralIfPresent(typeof ref === 'string' ? ref : undefined);
          router.replace('/(tabs)');
          return;
        }

        if (safeType === 'surah' && typeof id === 'string' && /^\d{1,3}$/.test(id)) {
          const surahNo = Number(id);
          const surah = surahNo >= 1 && surahNo <= 114 ? SURAHS.find((s) => s.number === surahNo) : undefined;
          if (surah) {
            const page = (await getFirstPageOfSurah(surah.number).catch(() => null)) ?? surah.page;
            router.replace({
              pathname: '/quran-reading',
              params: { page: String(page), surahName: surah.nameTurkish, juz: String(surah.juz) },
            });
            return;
          }
        }

        if (safeType === 'name' || safeType === 'dua') {
          router.replace({ pathname: '/(tabs)', params: { tab: '5' } });
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
