import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import {
  HatimState,
  DEFAULT_HATIM_STATE,
  loadHatimState,
  updateHatimPage,
  resetHatim,
} from '../services/hatimService';
import { logHatimProgress } from '../services/analyticsService';
import { StoryCardShareModal } from './StoryCardShareModal';
import { CommunitySharePrompt } from './CommunitySharePrompt';
import { loadCommunitySettings } from '../services/communityService';
import { markPromptAnswered, wasPromptAnswered } from '../services/communityPrompts';
import { hatimPromptKey } from '../utils/community';

interface Props {
  onOpenPrayers: () => void;
  onContinueReading?: (page: number, juz: number) => void;
}

export function HatimTrackerCard({ onOpenPrayers, onContinueReading }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();

  const [hatimState, setHatimState] = useState<HatimState>(DEFAULT_HATIM_STATE);
  // Set when a hatim just finished and the user has not answered the share offer for it yet.
  const [sharePromptKey, setSharePromptKey] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [inputPage, setInputPage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const fetchHatim = async () => {
    const data = await loadHatimState();
    setHatimState(data);
  };

  useEffect(() => {
    fetchHatim();
  }, []);

  const percentage = Math.min(100, Math.round((hatimState.currentPage / 604) * 100));
  const pagesRemaining = Math.max(0, 604 - hatimState.currentPage);

  // Offers sharing once per finished hatim, and only if the user takes part in the community.
  const offerCommunityShare = async (previousCompleted: number, nextCompleted: number) => {
    if (nextCompleted <= previousCompleted) return;
    const settings = await loadCommunitySettings();
    if (!settings.participate) return;
    const key = hatimPromptKey(nextCompleted);
    if (await wasPromptAnswered(key)) return;
    setSharePromptKey(key);
  };

  const handlePageChange = async (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const previousCompleted = hatimState.completedHatims;
    const updated = await updateHatimPage(hatimState.currentPage + delta);
    setHatimState(updated);
    offerCommunityShare(previousCompleted, updated.completedHatims);
    logHatimProgress(updated.currentPage, updated.currentJuz, Math.round((updated.currentPage / 604) * 100));
  };

  const handleSaveInputPage = async () => {
    const pageNum = parseInt(inputPage, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      Alert.alert(t('common.error', 'Hata'), t('hatim.invalidPage', 'Lütfen 1 ile 604 arasında bir sayfa numarası girin.'));
      return;
    }
    const previousCompleted = hatimState.completedHatims;
    const updated = await updateHatimPage(pageNum);
    setHatimState(updated);
    offerCommunityShare(previousCompleted, updated.completedHatims);
    setEditModalVisible(false);
    setInputPage('');
    logHatimProgress(updated.currentPage, updated.currentJuz, Math.round((updated.currentPage / 604) * 100));
  };

  const handleResetHatim = () => {
    Alert.alert(
      t('hatim.resetTitle', 'Yeni Hatim Başlat'),
      t('hatim.resetBody', 'Mevcut hatim tamamlandı olarak kaydedilecek ve 1. sayfadan yeni bir hatim başlayacaktır. Onaylıyor musunuz?'),
      [
        { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
        {
          text: t('hatim.startNew', 'Yeni Hatim Başlat'),
          style: 'destructive',
          onPress: async () => {
            const updated = await resetHatim();
            setHatimState(updated);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (onContinueReading) {
      onContinueReading(hatimState.currentPage, hatimState.currentJuz);
    } else {
      router.push({
        pathname: '/quran-reading',
        params: {
          juz: hatimState.currentJuz,
          page: hatimState.currentPage,
          surahName: `${hatimState.currentJuz}. Cüz`,
        },
      });
    }
  };

  return (
    <>
    <View style={[styles.card, { backgroundColor: isDark ? '#1C150C' : '#FFFFFF', borderColor: theme.colors.border }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <LinearGradient colors={['#D4AF37', '#996515']} style={styles.iconBadge}>
            <Ionicons name="ribbon" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {t('hatim.title', 'Kuran Hatim Takibi')}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {hatimState.hatimNumber}. {t('hatim.hatimLabel', 'Hatim')} • {hatimState.currentJuz}. {t('quran.juz', 'Cüz')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onOpenPrayers}
          style={[styles.prayersBtn, { borderColor: 'rgba(212,175,55,0.35)', backgroundColor: 'rgba(212,175,55,0.12)' }]}
          hitSlop={6}
        >
          <Feather name="heart" size={14} color="#D4AF37" />
          <Text style={styles.prayersBtnText} numberOfLines={1} ellipsizeMode="tail">
            {t('quran.prayersBtn', 'Dualar')}
          </Text>
        </Pressable>
      </View>

      {/* Progress Bar & Stats */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {t('hatim.page', 'Sayfa')} <Text style={{ color: theme.colors.primaryText, fontFamily: typography.fontFamily.bold }}>{hatimState.currentPage}</Text> / 604
          </Text>
          <Text style={[styles.statPercent, { color: theme.colors.primaryText }]}>
            %{percentage}
          </Text>
        </View>

        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={['#D4AF37', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>

        <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
          {pagesRemaining > 0
            ? t('hatim.pagesRemaining', 'Hatmin tamamlanmasına {{count}} sayfa kaldı.', { count: pagesRemaining })
            : t('hatim.completed', 'Tebrikler! Hatmi tamamladınız.')}
        </Text>

        {pagesRemaining > 0 && (() => {
          // Daily pace needed to finish inside the goal; keeps a Khatm from silently slipping.
          const start = new Date(hatimState.startDate + 'T00:00:00');
          const elapsed = Number.isFinite(start.getTime()) ? Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)) : 0;
          const daysLeft = Math.max(1, (hatimState.goalDays || 30) - elapsed);
          const perDay = Math.ceil(pagesRemaining / daysLeft);
          return (
            <Text style={[styles.remainingText, { color: theme.colors.primaryText, marginTop: 4 }]}>
              {t('hatim.dailyTarget', {
                defaultValue: i18n.language.startsWith('tr')
                  ? 'Hedef için günde ~{{n}} sayfa ({{d}} gün kaldı)'
                  : 'About {{n}} pages a day to finish ({{d}} days left)',
                n: perDay,
                d: daysLeft,
              })}
            </Text>
          );
        })()}

        {pagesRemaining === 0 && (
          <Pressable style={styles.shareRow} onPress={() => setShareModalVisible(true)}>
            <Feather name="share-2" size={13} color={theme.colors.primary} />
            <Text style={[styles.shareRowText, { color: theme.colors.primaryText }]}>
              {t('hatim.share', 'Hatmimi Paylaş')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <Pressable onPress={handleContinue} style={styles.continueBtnWrapper}>
          <LinearGradient
            colors={['#D4AF37', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            <Feather name="book-open" size={15} color="#1A1207" style={{ marginEnd: 6 }} />
            <Text style={styles.continueBtnText}>
              {t('hatim.readPageBtn', 'Sayfa {{page}}\'yi Oku', { page: hatimState.currentPage })}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Steppers & Edit */}
        <View style={styles.stepperGroup}>
          <Pressable
            onPress={() => handlePageChange(-1)}
            disabled={hatimState.currentPage <= 1}
            style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="minus" size={16} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              setInputPage(String(hatimState.currentPage));
              setEditModalVisible(true);
            }}
            style={[styles.editPageBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="edit-3" size={14} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => handlePageChange(1)}
            disabled={hatimState.currentPage >= 604}
            style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Feather name="plus" size={16} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Edit Page Modal */}
      {editModalVisible && (
        <Modal visible={editModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#1C150C' : '#FFFFFF', borderColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('hatim.jumpPageTitle', 'Sayfaya Git / İlerleme Güncelle')}
              </Text>
              <Text style={[styles.modalDesc, { color: theme.colors.textSecondary }]}>
                {t('hatim.jumpPageDesc', 'Kaldığınız sayfa numarasını girin (1 - 604):')}
              </Text>

              <TextInput
                style={[styles.pageInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                keyboardType="numeric"
                value={inputPage}
                onChangeText={setInputPage}
                placeholder="1 - 604"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />

              <View style={styles.modalButtonsRow}>
                <Pressable onPress={() => setEditModalVisible(false)} style={[styles.modalActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.modalActionBtnText, { color: theme.colors.text }]}>{t('common.cancel', 'Vazgeç')}</Text>
                </Pressable>

                <Pressable onPress={handleSaveInputPage} style={[styles.modalActionBtn, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.modalActionBtnText, { color: '#1A1207' }]}>{t('common.save', 'Kaydet')}</Text>
                </Pressable>
              </View>

              <Pressable onPress={handleResetHatim} style={{ marginTop: 16, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="refresh-cw" size={13} color="#EF4444" />
                  <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: 12, color: '#EF4444' }}>
                    {t('hatim.resetHatimBtn', 'Yeni Hatim Sıfırla & Başlat')}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <StoryCardShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={t('hatim.title', 'Kuran Hatim Takibi')}
        text={t('hatim.shareText', "{{count}}. hatmimi tamamladım, elhamdülillah!", { count: hatimState.hatimNumber })}
        source="Vera"
        type="achievement"
      />
    </View>
    <CommunitySharePrompt
      visible={sharePromptKey !== null}
      templateKey="hatim.completed"
      params={{}}
      promptKey={sharePromptKey ?? ''}
      onDone={() => setSharePromptKey(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginEnd: 4,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14.5,
  },
  cardSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  prayersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 115,
    gap: 3,
  },
  prayersBtnIcon: {
    fontSize: 12,
  },
  prayersBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11.5,
    color: '#D4AF37',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  statPercent: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11.5,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  shareRowText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  continueBtnWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  continueBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13.5,
    color: '#1A1207',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPageBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  pageInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
});
