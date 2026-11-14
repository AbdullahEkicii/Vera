import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import {
  addAmen,
  createDuaRequest,
  DuaCategory,
  DuaFailure,
  DuaRequest,
  DUA_CATEGORIES,
  hideDuaRequest,
  listActiveDuaRequests,
  loadHiddenDuaIds,
  reportDuaRequest,
} from '../services/duaService';
import { logEvent } from '../services/analyticsService';
import { computeDuaExpiresAtMs, duaAge, isDuaActive } from '../utils/duaRules';
import { GlassCard } from './CommunityGlass';

const REPORT_REASON = 'user_report';

const CATEGORY_DEFAULTS: Record<DuaCategory, string> = {
  health: 'Sağlık',
  family: 'Aile',
  exam: 'Sınav',
  provision: 'Rızık',
  guidance: 'Rehberlik',
  bereavement: 'Vefat',
};

/**
 * Anonymous prayer requests. The user picks one fixed category (no free text), others can amin it,
 * and a reported request is hidden on this device at once. Requests stay visible for seven days.
 */
export function DuaRequestsCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [requests, setRequests] = useState<DuaRequest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<DuaFailure | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<DuaCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<DuaFailure | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    loadHiddenDuaIds().then((ids) => {
      if (mountedRef.current) setHiddenIds(new Set(ids));
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listActiveDuaRequests();
      if (!mountedRef.current) return;
      setRequests(list);
      setLoadError(null);
    } catch (error) {
      if (!mountedRef.current) return;
      setLoadError((error as { reason?: DuaFailure })?.reason ?? 'unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const visible = (requests ?? []).filter(
    (r) => !hiddenIds.has(r.id) && isDuaActive(computeDuaExpiresAtMs(r.createdAt.getTime()), now)
  );

  const failureText = (reason: DuaFailure | null) => {
    switch (reason) {
      case 'offline':
        return t('community.dua.error.offline', 'Bağlantı yok. Dua istekleri yüklenemedi.');
      case 'denied':
        return t('community.dua.error.denied', 'Dua istekleri şu an kullanılamıyor.');
      case 'auth':
        return t('community.dua.error.auth', 'Oturum açılamadı. Tekrar dene.');
      default:
        return t('community.dua.error.generic', 'Bir sorun oluştu. Tekrar dene.');
    }
  };

  const ageText = (createdAt: Date) => {
    const age = duaAge(createdAt.getTime(), Date.now());
    switch (age.unit) {
      case 'minutes':
        return t('community.dua.age.minutes', '{{count}} dakika önce', { count: age.count });
      case 'hours':
        return t('community.dua.age.hours', '{{count}} saat önce', { count: age.count });
      case 'days':
        return t('community.dua.age.days', '{{count}} gün önce', { count: age.count });
      default:
        return t('community.dua.age.now', 'Az önce');
    }
  };

  const openSheet = () => {
    setSelected(null);
    setSheetError(null);
    setSheetOpen(true);
  };

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setSheetError(null);
    try {
      await createDuaRequest(selected);
      logEvent('dua_requested', { category: selected });
      setSheetOpen(false);
      await load();
    } catch (error) {
      setSheetError((error as { reason?: DuaFailure })?.reason ?? 'unknown');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const amen = async (item: DuaRequest) => {
    if (busyIds.has(item.id) || item.isMine || item.amened) return;
    setBusyIds((prev) => new Set(prev).add(item.id));
    try {
      const added = await addAmen(item.id);
      if (!mountedRef.current) return;
      if (added) logEvent('dua_amen');
      setRequests((prev) =>
        prev?.map((r) =>
          r.id === item.id ? { ...r, amened: true, amenCount: added ? r.amenCount + 1 : r.amenCount } : r
        ) ?? prev
      );
    } catch (error) {
      if (!mountedRef.current) return;
      Alert.alert(t('common.error', 'Hata'), failureText((error as { reason?: DuaFailure })?.reason ?? 'unknown'));
    } finally {
      if (mountedRef.current) {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    }
  };

  const confirmReport = (item: DuaRequest) => {
    Alert.alert(
      t('community.dua.report.confirmTitle', 'Bu isteği bildir?'),
      t('community.dua.report.confirmBody', 'Bildirilen istek bu cihazda hemen gizlenir.'),
      [
        { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
        {
          text: t('community.dua.report.action', 'Bildir'),
          style: 'destructive',
          onPress: () => {
            // Hidden first: the user's intent is clear even if the report write is slow or fails.
            setHiddenIds((prev) => new Set(prev).add(item.id));
            hideDuaRequest(item.id);
            reportDuaRequest(item.id, REPORT_REASON)
              .then(() => {
                logEvent('dua_reported');
                Alert.alert(
                  t('community.report.thanksTitle', 'Teşekkürler'),
                  t('community.report.thanksBody', 'Bildirimin incelenecek.')
                );
              })
              .catch((error) => {
                Alert.alert(
                  t('common.error', 'Hata'),
                  failureText((error as { reason?: DuaFailure })?.reason ?? 'unknown')
                );
              });
          },
        },
      ]
    );
  };

  const statusText =
    loading && requests === null
      ? t('community.dua.loading', 'Yükleniyor…')
      : loadError
        ? t('community.dua.sub', 'İstekler 7 gün görünür kalır. Bir kategori seçip dua isteyebilirsin.')
        : visible.length === 0
          ? t('community.dua.emptyShort', 'Henüz dua isteği yok.')
          : t('community.dua.count', '{{n}} aktif dua isteği · 7 gün görünür', { n: visible.length });

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
          <Feather name="heart" size={16} color={c.primaryText} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.heading, { color: c.text }]}>{t('community.dua.heading', 'Dua İstekleri')}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={2}>
            {statusText}
          </Text>
        </View>
        <Pressable
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel={t('community.dua.refresh', 'Listeyi yenile')}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="refresh-cw" size={16} color={c.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel={t('community.dua.request', 'Dua iste')}
          style={({ pressed }) => [
            styles.requestButton,
            styles.actionFlex,
            { backgroundColor: c.primaryLight, borderColor: c.borderStrong, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="edit-3" size={16} color={c.primaryText} />
          <Text style={[styles.requestButtonText, { color: c.primaryText }]}>{t('community.dua.request', 'Dua iste')}</Text>
        </Pressable>
      </View>

      {loading && requests === null ? (
        <ActivityIndicator color={c.primary} style={styles.loader} />
      ) : loadError ? (
        <View style={[styles.notice, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.noticeText, { color: c.textSecondary }]}>{failureText(loadError)}</Text>
          <Pressable
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel={t('community.dua.retry', 'Tekrar dene')}
            style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.retryText, { color: c.primaryText }]}>{t('community.dua.retry', 'Tekrar dene')}</Text>
          </Pressable>
        </View>
      ) : visible.length === 0 ? null : (
        visible.map((item) => {
          const busy = busyIds.has(item.id);
          return (
            <View key={item.id} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.rowTop}>
                <View style={[styles.categoryChip, { backgroundColor: c.primaryLight }]}>
                  <Text style={[styles.categoryText, { color: c.primaryText }]}>
                    {t(`community.dua.category.${item.category}`, CATEGORY_DEFAULTS[item.category])}
                  </Text>
                </View>
                <Text style={[styles.age, { color: c.textSecondary }]}>{ageText(item.createdAt)}</Text>
              </View>

              <View style={styles.rowBottom}>
                {item.isMine ? (
                  <Text style={[styles.mineText, { color: c.textSecondary }]}>
                    {t('community.dua.mine', 'Senin isteğin')} · {item.amenCount}
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => amen(item)}
                    disabled={item.amened || busy}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: item.amened || busy }}
                    accessibilityLabel={
                      item.amened
                        ? t('community.dua.amenedLabel', 'Amin dedin')
                        : t('community.dua.amen', 'Amin')
                    }
                    style={({ pressed }) => [
                      styles.amenButton,
                      {
                        backgroundColor: item.amened ? c.primaryLight : c.surfaceStrong,
                        borderColor: item.amened ? c.borderStrong : c.border,
                        opacity: pressed && !item.amened ? 0.8 : 1,
                      },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                      <Text style={styles.amenEmoji}>🤲</Text>
                    )}
                    <Text style={[styles.amenText, { color: item.amened ? c.primaryText : c.text }]}>
                      {item.amened ? t('community.dua.amenedLabel', 'Amin dedin') : t('community.dua.amen', 'Amin')} ·{' '}
                      {item.amenCount}
                    </Text>
                  </Pressable>
                )}

                {!item.isMine && (
                  <Pressable
                    onPress={() => confirmReport(item)}
                    accessibilityRole="button"
                    accessibilityLabel={t('community.dua.report.label', 'Bu isteği bildir')}
                    hitSlop={8}
                  >
                    <Text style={[styles.reportText, { color: c.textSecondary }]}>
                      {t('community.dua.report.action', 'Bildir')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}


      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !submitting && setSheetOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>{t('community.dua.sheet.title', 'Dua iste')}</Text>
            <Text style={[styles.sheetHint, { color: c.textSecondary }]}>
              {t('community.dua.sheet.hint', 'Bir kategori seç. İsteğin adın olmadan 7 gün görünür kalır.')}
            </Text>

            <View style={styles.chips}>
              {DUA_CATEGORIES.map((key) => {
                const active = selected === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelected(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? c.primary : c.surface,
                        borderColor: active ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? c.background : c.text }]}>
                      {t(`community.dua.category.${key}`, CATEGORY_DEFAULTS[key])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sheetError && (
              <Text style={[styles.sheetError, { color: c.danger }]}>{failureText(sheetError)}</Text>
            )}

            <Pressable
              onPress={submit}
              disabled={!selected || submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selected || submitting }}
              style={({ pressed }) => [
                styles.confirm,
                {
                  backgroundColor: c.primary,
                  opacity: !selected || submitting ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={c.background} />
              ) : (
                <Text style={[styles.confirmText, { color: c.background }]}>
                  {t('community.dua.sheet.confirm', 'Dua isteğini paylaş')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  heading: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  sub: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionFlex: { flex: 1 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
  },
  requestButtonText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  loader: { paddingVertical: 16 },
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  noticeText: { fontSize: 13.5, lineHeight: 19, fontFamily: 'Outfit_400Regular' },
  retry: { alignSelf: 'flex-start' },
  retryText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  categoryChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 12.5, fontFamily: 'Outfit_600SemiBold' },
  age: { fontSize: 12.5, fontFamily: 'Outfit_400Regular' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mineText: { fontSize: 13, fontFamily: 'Outfit_400Regular' },
  amenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
  },
  amenEmoji: { fontSize: 15 },
  amenText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  reportText: { fontSize: 12.5, fontFamily: 'Outfit_400Regular', textDecorationLine: 'underline' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
  sheetHint: { fontSize: 13.5, lineHeight: 19, fontFamily: 'Outfit_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  sheetError: { fontSize: 13, fontFamily: 'Outfit_400Regular' },
  confirm: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  confirmText: { fontSize: 15.5, fontFamily: 'Outfit_600SemiBold' },
});
