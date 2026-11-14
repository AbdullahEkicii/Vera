import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { ensureSignedIn } from '../services/communityService';
import { GlassCard } from './CommunityGlass';
import {
  RingFailure,
  claimPart,
  finishPart,
  releasePart,
  subscribeRing,
} from '../services/hatimRingService';
import {
  RING_PART_COUNT,
  RingPart,
  allowedRingActions,
  summarizeRing,
} from '../utils/hatimRing';

/**
 * Shared hatim: 30 cüz that people take on together. Every number here comes from the ring's
 * documents; nothing is estimated. One cüz per person at a time.
 *
 * It lives inside the "Neleri paylaşabilirim?" sheet and only subscribes while that sheet is open. When the
 * user finishes a cüz, `onFinished` lets the sheet close itself and open the share card, so two modals never
 * stack.
 */
export function CommunityHatimRing({ onFinished }: { onFinished?: (juz: number) => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [uid, setUid] = useState<string | null>(null);
  const [parts, setParts] = useState<RingPart[] | null>(null);
  const [failure, setFailure] = useState<RingFailure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let active = true;
    setFailure(null);
    ensureSignedIn()
      .then((id) => {
        if (!active) return;
        setUid(id);
        unsubscribe = subscribeRing(
          (next) => {
            if (!active) return;
            setParts(next);
            setFailure(null);
          },
          (reason) => {
            if (active) setFailure(reason);
          },
        );
      })
      .catch(() => {
        if (active) setFailure('offline');
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [attempt]);

  const partByJuz = useMemo(() => {
    const map = new Map<number, RingPart>();
    for (const part of parts ?? []) map.set(part.juz, part);
    return map;
  }, [parts]);

  const summary = useMemo(() => summarizeRing(parts ?? [], uid), [parts, uid]);

  const failureText = (reason: RingFailure): string => {
    if (reason === 'taken') return t('community.ring.taken', 'Bu cüz az önce üstlenildi.');
    if (reason === 'not_yours') return t('community.ring.notYours', 'Bu cüz artık sana ait değil.');
    if (reason === 'offline') return t('community.ring.offline', 'Bağlantı yok. Tekrar dene.');
    return t('community.ring.unknown', 'Bir şeyler ters gitti. Tekrar dene.');
  };

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    try {
      await action();
      onDone?.();
    } catch (error) {
      const reason = (error as { reason?: RingFailure })?.reason ?? 'unknown';
      Alert.alert(t('community.ring.title', 'Ortak Hatim Halkası'), failureText(reason));
    }
  };

  const onTapPart = (juz: number) => {
    const part = partByJuz.get(juz);
    const actions = allowedRingActions(part, uid, summary.mine);
    const title = t('community.ring.partTitle', '{{n}}. cüz', { n: juz });

    if (actions.includes('claim')) {
      Alert.alert(title, t('community.ring.claimBody', 'Bu cüzü sen okuyacaksın. Bitince "Okudum" de.'), [
        { text: t('community.ring.cancel', 'Vazgeç'), style: 'cancel' },
        { text: t('community.ring.claim', 'Bu cüzü üstlen'), onPress: () => void run(() => claimPart(juz)) },
      ]);
      return;
    }
    if (actions.includes('finish')) {
      Alert.alert(title, t('community.ring.mineBody', 'Bu cüz sende.'), [
        { text: t('community.ring.cancel', 'Vazgeç'), style: 'cancel' },
        { text: t('community.ring.release', 'Bırak'), style: 'destructive', onPress: () => void run(() => releasePart(juz)) },
        {
          text: t('community.ring.finish', 'Okudum'),
          onPress: () => void run(() => finishPart(juz), () => onFinished?.(juz)),
        },
      ]);
      return;
    }
    if (part?.status === 'claimed') {
      Alert.alert(title, t('community.ring.otherBody', 'Bu cüz başka bir okuyucuda.'));
      return;
    }
    if (part?.status === 'done') {
      Alert.alert(title, t('community.ring.doneBody', 'Bu cüz okundu.'));
      return;
    }
    if (summary.mine !== null) {
      Alert.alert(title, t('community.ring.oneAtATime', 'Aynı anda bir cüz üstlenebilirsin. Önce mevcut cüzünü bitir veya bırak.'));
    }
  };

  const tileStyle = (juz: number) => {
    const part = partByJuz.get(juz);
    if (part?.status === 'done') return { bg: c.primaryLight, border: c.primaryText, icon: 'check' as const, iconColor: c.primaryText };
    if (part?.status === 'claimed' && part.claimedBy === uid) {
      return { bg: c.surface, border: c.primaryText, icon: 'bookmark' as const, iconColor: c.primaryText };
    }
    if (part?.status === 'claimed') return { bg: c.surfaceStrong, border: c.border, icon: 'user' as const, iconColor: c.textSecondary };
    return { bg: c.surface, border: c.border, icon: null, iconColor: c.textSecondary };
  };

  const rows: number[][] = [];
  for (let start = 1; start <= RING_PART_COUNT; start += 6) {
    rows.push(Array.from({ length: 6 }, (_, i) => start + i));
  }

  const ready = parts !== null;
  const progressText = t('community.ring.progress', '{{done}} / {{total}} cüz tamamlandı · {{reading}} cüz okunuyor', {
    done: summary.doneCount,
    total: RING_PART_COUNT,
    reading: summary.claimedCount,
  });

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
          <Feather name="book-open" size={16} color={c.primaryText} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.text }]}>{t('community.ring.title', 'Ortak Hatim Halkası')}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {t('community.ring.sub', '30 cüzü birlikte okuyun. Her cüzü bir kişi üstlenir.')}
          </Text>
        </View>
      </View>

      {!ready ? (
        <View style={styles.stateBox}>
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            {failure ? failureText(failure) : t('community.ring.loading', 'Yükleniyor…')}
          </Text>
          {failure ? (
            <Pressable onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button" style={styles.retry}>
              <Text style={[styles.retryText, { color: c.primaryText }]}>{t('community.ring.retry', 'Yeniden dene')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={[styles.track, { backgroundColor: c.surfaceStrong }]}>
            <View style={[styles.fill, { backgroundColor: c.primaryText, width: `${(summary.doneCount / RING_PART_COUNT) * 100}%` }]} />
          </View>
          <Text style={[styles.progress, { color: c.text }]}>
            {summary.complete ? t('community.ring.complete', 'Hatim tamamlandı. Allah kabul etsin.') : progressText}
          </Text>

          <View style={styles.grid}>
            {rows.map((row) => (
              <View key={row[0]} style={styles.gridRow}>
                {row.map((juz) => {
                  const style = tileStyle(juz);
                  return (
                    <Pressable
                      key={juz}
                      onPress={() => onTapPart(juz)}
                      accessibilityRole="button"
                      accessibilityLabel={t('community.ring.partTitle', '{{n}}. cüz', { n: juz })}
                      style={[styles.tile, { backgroundColor: style.bg, borderColor: style.border }]}
                    >
                      <Text style={[styles.tileNumber, { color: c.text }]}>{juz}</Text>
                      {style.icon ? <Feather name={style.icon} size={11} color={style.iconColor} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {summary.mine !== null ? (
            <Text style={[styles.mine, { color: c.primaryText }]}>
              {t('community.ring.mineLine', 'Sen {{n}}. cüzü okuyorsun.', { n: summary.mine })}
            </Text>
          ) : (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {t('community.ring.tapHint', 'Boş bir cüze dokun ve üstlen.')}
            </Text>
          )}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  sub: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  stateBox: { gap: 8, alignItems: 'flex-start' },
  stateText: { fontSize: 13.5, lineHeight: 19, fontFamily: 'Outfit_400Regular' },
  retry: { paddingVertical: 4 },
  retryText: { fontSize: 13.5, fontFamily: 'Outfit_600SemiBold' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  progress: { fontSize: 13.5, fontFamily: 'Outfit_600SemiBold' },
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    aspectRatio: 1.25,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tileNumber: { fontSize: 12.5, fontFamily: 'Outfit_600SemiBold' },
  mine: { fontSize: 13.5, fontFamily: 'Outfit_600SemiBold' },
  hint: { fontSize: 12.5, fontFamily: 'Outfit_400Regular' },
});
