import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  text: string;
  source: string;
  type: 'verse' | 'hadith' | 'quote';
}

const THEME_PRESETS = [
  {
    id: 'gold',
    labelKey: 'share.themeGold',
    nameFallback: 'Altın & Gece',
    gradient: ['#1F160C', '#0B0704'] as [string, string],
    border: '#D4AF37',
    primaryText: '#FDF8ED',
    sourceText: '#D4AF37',
  },
  {
    id: 'emerald',
    labelKey: 'share.themeEmerald',
    nameFallback: 'Zümrüt Yeşil',
    gradient: ['#0B2B22', '#041410'] as [string, string],
    border: '#10B981',
    primaryText: '#EAF3EE',
    sourceText: '#34D399',
  },
  {
    id: 'navy',
    labelKey: 'share.themeNavy',
    nameFallback: 'Gece Mavisi',
    gradient: ['#0F172A', '#020617'] as [string, string],
    border: '#38BDF8',
    primaryText: '#F8FAFC',
    sourceText: '#38BDF8',
  },
  {
    id: 'sepia',
    labelKey: 'share.themeSepia',
    nameFallback: 'Sıcak Krem',
    gradient: ['#FDF8ED', '#EDE3CC'] as [string, string],
    border: '#B8860B',
    primaryText: '#2C1A0A',
    sourceText: '#7B4F1A',
  },
  {
    id: 'ruby',
    labelKey: 'share.themeRuby',
    nameFallback: 'Gül & Yakut',
    gradient: ['#2B0C11', '#120407'] as [string, string],
    border: '#F43F5E',
    primaryText: '#FFF1F2',
    sourceText: '#FB7185',
  },
];

export function StoryCardShareModal({
  visible,
  onClose,
  title,
  text,
  source,
  type,
}: Props) {
  const { t } = useTranslation();
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const viewShotRef = useRef<any>(null);
  const theme = THEME_PRESETS[selectedThemeIndex];

  const handleShareImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    try {
      setIsSharing(true);
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: title,
            UTI: 'public.png',
          });
        } else {
          const shareMessage = `✨ ${title}\n\n"${text}"\n\n— ${source}\n\n📲 Vera (${t('share.appTagline', 'Namaz Vakitleri, Kuran & Kıble')})\n🔗 Google Play'den İndir:\nhttps://play.google.com/store/apps/details?id=com.abdllhekc.vera`;
          await Share.share({ title, message: shareMessage });
        }
      }
    } catch (e) {
      console.error('Error capturing and sharing story card image', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareDirectLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    const shareMessage = `✨ ${title}\n\n"${text}"\n\n— ${source}\n\n📲 Vera - ${t('share.appTagline', 'Namaz Vakitleri, Kuran & Kıble')}\n🔗 Google Play: https://play.google.com/store/apps/details?id=com.abdllhekc.vera`;
    await Share.share({ title, message: shareMessage });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {t('share.storyTitle', 'Hikaye & Kart Paylaşımı')}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color="#A08060" />
            </Pressable>
          </View>

          {/* Story Card Live Preview captured with ViewShot */}
          <View style={styles.previewContainer}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
            >
              <LinearGradient
                colors={theme.gradient}
                style={[styles.storyCard, { borderColor: theme.border + '50' }]}
              >
                <View style={styles.storyCardInner}>
                  <Feather
                    name={type === 'verse' ? 'book-open' : type === 'hadith' ? 'message-circle' : 'feather'}
                    size={26}
                    color={theme.border}
                    style={styles.cardIcon}
                  />
                  
                  <Text style={[styles.cardTitleText, { color: theme.sourceText }]}>
                    {title}
                  </Text>

                  <Text style={[styles.cardBodyText, { color: theme.primaryText }]}>
                    {`"${text}"`}
                  </Text>

                  <Text style={[styles.cardSourceText, { color: theme.sourceText }]}>
                    — {source}
                  </Text>

                  {/* Compact Watermark + Real Scannable QR Code */}
                  <View style={styles.watermarkContainer}>
                    <View style={styles.watermarkRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={[styles.brandPill, { borderColor: theme.border + '50' }]}>
                          <Ionicons name="moon" size={10} color={theme.border} style={{ marginRight: 4 }} />
                          <Text style={[styles.watermarkBrand, { color: theme.border }]}>
                            VERA
                          </Text>
                        </View>
                        <Text style={[styles.watermarkTagline, { color: theme.primaryText + '85' }]}>
                          {t('share.appTagline', 'Namaz Vakitleri & Kuran')}
                        </Text>
                        <Text style={[styles.watermarkStoreHint, { color: theme.sourceText }]}>
                          {t('share.storeSearchHint', 'Google Play: Vera Ezan')}
                        </Text>
                      </View>

                      {/* Real Scannable QR Code */}
                      <View style={styles.qrCodeBox}>
                        <QRCode
                          value="https://play.google.com/store/apps/details?id=com.abdllhekc.vera"
                          size={34}
                          color="#000000"
                          backgroundColor="#FFFFFF"
                        />
                        <Text style={styles.qrCodeLabel}>
                          {t('share.scanToDownload', 'Tara & İndir')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ViewShot>
          </View>

          {/* Horizontally Scrollable Theme Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeSelectorScroll}
          >
            {THEME_PRESETS.map((preset, idx) => {
              const isSelected = idx === selectedThemeIndex;
              return (
                <Pressable
                  key={preset.id}
                  style={[
                    styles.themeChip,
                    {
                      borderColor: isSelected ? preset.border : 'transparent',
                      backgroundColor: preset.gradient[0],
                    },
                  ]}
                  onPress={() => setSelectedThemeIndex(idx)}
                >
                  <Text style={[styles.themeChipText, { color: preset.primaryText }]}>
                    {t(preset.labelKey, preset.nameFallback)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Share Action Buttons */}
          <Pressable style={styles.shareBtnWrapper} onPress={handleShareImage} disabled={isSharing}>
            <LinearGradient
              colors={['#D4AF37', '#B8860B']}
              style={styles.shareBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#1A1207" />
              ) : (
                <>
                  <Feather name="image" size={17} color="#1A1207" />
                  <Text style={styles.shareBtnText}>
                    {t('greeting.shareImageBtn', 'Görsel Olarak Paylaş 🌟')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.shareLinkBtn} onPress={handleShareDirectLink}>
            <Ionicons name="link-outline" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
            <Text style={styles.shareLinkBtnText}>
              {t('greeting.shareLinkBtn', 'Doğrudan Tıklanabilir Link Paylaş 🔗')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#161008',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: '#FDF8ED',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  storyCard: {
    width: SCREEN_WIDTH - 56,
    minHeight: 290,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  storyCardInner: {
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitleText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardBodyText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 10,
  },
  cardSourceText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    marginBottom: 14,
  },
  watermarkContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingTop: 8,
    width: '100%',
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 2,
  },
  watermarkBrand: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    letterSpacing: 2,
  },
  watermarkTagline: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 9.5,
  },
  watermarkStoreHint: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 9,
    marginTop: 1,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  qrCodeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 7,
    color: '#000000',
    marginTop: 1,
  },
  themeSelectorScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
    paddingHorizontal: 2,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeChipText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
  },
  shareBtnWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  shareBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14.5,
    color: '#1A1207',
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: '#251B10',
    marginTop: 8,
  },
  shareLinkBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#FDF8ED',
  },
});
