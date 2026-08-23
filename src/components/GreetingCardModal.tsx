import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '../context/ThemeContext';
import { logModalOpened } from '../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  {
    id: 'cuma_1',
    category: 'cuma',
    titleTR: 'Hayırlı Cumalar 🌹',
    titleEN: 'Blessed Friday (Jummah Mubarak)',
    messageTR: 'Allah\'ım! Gönlümüzden geçen hayırlı dualarımızı kabul, Cumamızı mübarek eyle. Sağlık, huzur ve bereket dolu bir gün dilerim.',
    messageEN: 'May Allah accept our sincere prayers and shower this blessed Friday with peace, mercy, and abundance.',
  },
  {
    id: 'cuma_2',
    category: 'cuma',
    titleTR: 'Cumanız Mübarek Olsun ✨',
    titleEN: 'Jummah Mubarak',
    messageTR: 'Rabbim bizleri sevdiklerimizle beraber iki cihanda da aziz eylesin. Hayırlı, nurlu ve bereketli Cumalar.',
    messageEN: 'May Allah bless you and your loved ones with happiness, health, and faith in this life and the hereafter.',
  },
  {
    id: 'kandil_1',
    category: 'kandil',
    titleTR: 'Kandiliniz Mübarek Olsun 🌙',
    titleEN: 'Blessed Holy Night (Qadr/Kandil)',
    messageTR: 'Bu mübarek gecenin feyzi, bereketi ve affı üzerinize olsun. Dualarda buluşmak dileğiyle kandiliniz mübarek olsun.',
    messageEN: 'May the blessings, forgiveness, and peace of this sacred night be upon you and your family.',
  },
  {
    id: 'ramazan_1',
    category: 'ramadan',
    titleTR: 'Hayırlı Ramazanlar 🕌',
    titleEN: 'Ramadan Mubarak',
    messageTR: 'Başı rahmet, ortası mağfiret, sonu cehennemden kurtuluş olan Ramazan-ı Şerifimiz mübarek olsun.',
    messageEN: 'Wishing you a blessed Ramadan full of spiritual reflection, peace, and divine blessings.',
  },
  {
    id: 'bayram_1',
    category: 'eid',
    titleTR: 'Bayramınız Mübarek Olsun 🌟',
    titleEN: 'Eid Mubarak',
    messageTR: 'Sevdiklerinizle birlikte neşe, huzur, sağlık ve muhabbet dolu nice bayramlara erişmeniz temennisiyle.',
    messageEN: 'May this blessed Eid bring joy, health, unity, and prosperity to you and your loved ones.',
  },
];

const CARD_THEMES = [
  {
    id: 'gold',
    name: 'Altın Hat',
    gradient: ['#1F160C', '#0B0704'] as [string, string],
    border: '#D4AF37',
    primaryText: '#FDF8ED',
    goldAccent: '#D4AF37',
  },
  {
    id: 'emerald',
    name: 'Zümrüt Kubbe',
    gradient: ['#0B2B22', '#041410'] as [string, string],
    border: '#10B981',
    primaryText: '#EAF3EE',
    goldAccent: '#34D399',
  },
  {
    id: 'navy',
    name: 'Gece Mavisi',
    gradient: ['#0F172A', '#020617'] as [string, string],
    border: '#38BDF8',
    primaryText: '#F8FAFC',
    goldAccent: '#38BDF8',
  },
  {
    id: 'crimson',
    name: 'Gül & Yakut',
    gradient: ['#2B0C11', '#120407'] as [string, string],
    border: '#F43F5E',
    primaryText: '#FFF1F2',
    goldAccent: '#FB7185',
  },
];

export function GreetingCardModal({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const viewShotRef = useRef<any>(null);

  const activeTemplate = TEMPLATES[selectedTemplateIndex];
  const activeTheme = CARD_THEMES[selectedThemeIndex];

  const titleToDisplay = isCustomMode
    ? customTitle || (isLangTR ? 'Hayırlı Cumalar' : 'Blessed Day')
    : isLangTR
    ? activeTemplate.titleTR
    : activeTemplate.titleEN;

  const messageToDisplay = isCustomMode
    ? customMessage || (isLangTR ? 'Dualarınız ve ibadetleriniz kabul olsun.' : 'May your prayers be answered.')
    : isLangTR
    ? activeTemplate.messageTR
    : activeTemplate.messageEN;

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    setIsSharing(true);
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: titleToDisplay,
            UTI: 'public.png',
          });
        } else {
          const shareText = `✨ ${titleToDisplay}\n\n"${messageToDisplay}"\n\n📲 Vera (${t('share.appTagline')})\n🔗 Google Play: https://play.google.com/store/apps/details?id=com.abdllhekc.vera`;
          await Share.share({ title: titleToDisplay, message: shareText });
        }
      }
    } catch (e) {
      console.error('Error sharing greeting card:', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareTextAndLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    const shareText = `✨ ${titleToDisplay}\n\n"${messageToDisplay}"\n\n📲 Vera - ${t('share.appTagline', 'Namaz Vakitleri & Kuran-ı Kerim')}\n🔗 Google Play'den İndir:\nhttps://play.google.com/store/apps/details?id=com.abdllhekc.vera`;
    await Share.share({ title: titleToDisplay, message: shareText });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1A1207' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <LinearGradient colors={['#D4AF37', '#996515']} style={styles.headerBadge}>
                <Ionicons name="gift-outline" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.sheetTitle, { color: isDark ? '#FDF8ED' : '#1A1A24' }]}>
                  {t('greeting.modalTitle', 'Tebrik Kartı Oluşturucu')}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: isDark ? 'rgba(253,248,237,0.6)' : 'rgba(26,26,36,0.6)' }]}>
                  {t('greeting.modalSubtitle', 'Cuma, Kandil ve Bayram tebriklerini şık görselle paylaşın')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={isDark ? '#FDF8ED' : '#1A1A24'} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Live Captured Card */}
            <View style={styles.cardPreviewWrap}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}>
                <LinearGradient
                  colors={activeTheme.gradient}
                  style={[styles.cardCanvas, { borderColor: activeTheme.border }]}
                >
                  {/* Decorative Frame */}
                  <View style={[styles.cardInnerBorder, { borderColor: activeTheme.goldAccent + '40' }]}>
                    <Ionicons name="sparkles" size={24} color={activeTheme.goldAccent} style={styles.ornamentIcon} />

                    <Text style={[styles.cardGreetingTitle, { color: activeTheme.goldAccent }]}>
                      {titleToDisplay}
                    </Text>

                    <View style={[styles.decorLine, { backgroundColor: activeTheme.goldAccent + '50' }]} />

                    <Text style={[styles.cardMessageText, { color: activeTheme.primaryText }]}>
                      "{messageToDisplay}"
                    </Text>

                    {/* App Store Watermark with store URL & Mini QR Badge */}
                    <View style={styles.watermarkBox}>
                      <View style={styles.watermarkMainRow}>
                        <View style={styles.watermarkBrandCol}>
                          <View style={[styles.appIconPill, { borderColor: activeTheme.goldAccent + '60', backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                            <Ionicons name="moon" size={11} color={activeTheme.goldAccent} style={{ marginRight: 4 }} />
                            <Text style={[styles.watermarkAppName, { color: activeTheme.goldAccent }]}>
                              VERA
                            </Text>
                          </View>
                          <Text style={[styles.watermarkSub, { color: activeTheme.primaryText + '90' }]}>
                            {t('share.appTagline', 'Namaz Vakitleri, Kuran & Kıble')}
                          </Text>
                          <Text style={[styles.watermarkStoreHint, { color: activeTheme.goldAccent }]}>
                            {t('share.storeSearchHint', 'Google Play: Vera')}
                          </Text>
                        </View>

                        {/* Real Scannable QR Code Frame */}
                        <View style={[styles.qrCodeBox, { borderColor: activeTheme.goldAccent + '60', backgroundColor: '#FFFFFF' }]}>
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

            {/* Template Selector */}
            <Text style={[styles.sectionHeading, { color: isDark ? '#FDF8ED' : '#1A1A24' }]}>
              {t('greeting.chooseTemplate', 'Hazır Tebrik Şablonları')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesScroll}>
              {TEMPLATES.map((tmpl, idx) => (
                <Pressable
                  key={tmpl.id}
                  style={[
                    styles.templateChip,
                    selectedTemplateIndex === idx && !isCustomMode && styles.templateChipActive,
                    { backgroundColor: isDark ? '#2A1F13' : '#F5EEDB', borderColor: isDark ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.08)' }
                  ]}
                  onPress={() => {
                    setSelectedTemplateIndex(idx);
                    setIsCustomMode(false);
                  }}
                >
                  <Text style={[styles.templateChipText, { color: isDark ? '#FDF8ED' : '#1A1A24' }]}>
                    {isLangTR ? tmpl.titleTR : tmpl.titleEN}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                style={[
                  styles.templateChip,
                  isCustomMode && styles.templateChipActive,
                  { backgroundColor: isDark ? '#2A1F13' : '#F5EEDB', borderColor: isDark ? 'rgba(212,175,55,0.3)' : 'rgba(0,0,0,0.08)' }
                ]}
                onPress={() => setIsCustomMode(true)}
              >
                <Feather name="edit-3" size={13} color="#D4AF37" style={{ marginRight: 4 }} />
                <Text style={[styles.templateChipText, { color: isDark ? '#FDF8ED' : '#1A1A24' }]}>
                  {t('greeting.customMessage', 'Kendi Mesajını Yaz')}
                </Text>
              </Pressable>
            </ScrollView>

            {/* Custom Message Inputs */}
            {isCustomMode && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.customInputWrap}>
                <TextInput
                  style={[styles.customInput, { color: isDark ? '#FDF8ED' : '#1A1A24', backgroundColor: isDark ? '#2A1F13' : '#F5F5F0' }]}
                  placeholder={t('greeting.titlePlaceholder', 'Başlık (Örn: Hayırlı Cumalar)')}
                  placeholderTextColor="rgba(150,150,150,0.6)"
                  value={customTitle}
                  onChangeText={setCustomTitle}
                />
                <TextInput
                  style={[styles.customInput, styles.customTextArea, { color: isDark ? '#FDF8ED' : '#1A1A24', backgroundColor: isDark ? '#2A1F13' : '#F5F5F0' }]}
                  placeholder={t('greeting.messagePlaceholder', 'Tebrik veya dua mesajınızı yazın...')}
                  placeholderTextColor="rgba(150,150,150,0.6)"
                  multiline
                  value={customMessage}
                  onChangeText={setCustomMessage}
                />
              </Animated.View>
            )}

            {/* Theme Selector */}
            <Text style={[styles.sectionHeading, { color: isDark ? '#FDF8ED' : '#1A1A24', marginTop: 14 }]}>
              {t('greeting.chooseTheme', 'Kart Teması')}
            </Text>
            <View style={styles.themesRow}>
              {CARD_THEMES.map((thm, idx) => (
                <Pressable
                  key={thm.id}
                  style={[
                    styles.themeBtn,
                    selectedThemeIndex === idx && { borderColor: thm.border, borderWidth: 2 },
                    { backgroundColor: thm.gradient[0] }
                  ]}
                  onPress={() => setSelectedThemeIndex(idx)}
                >
                  <Text style={[styles.themeBtnText, { color: thm.primaryText }]}>
                    {thm.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Share Buttons Row */}
            <Pressable style={styles.shareBtnWrap} onPress={handleShare} disabled={isSharing}>
              <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.shareBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {isSharing ? (
                  <ActivityIndicator size="small" color="#1A1207" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={18} color="#1A1207" style={{ marginRight: 8 }} />
                    <Text style={styles.shareBtnText}>
                      {t('greeting.shareImageBtn', 'Görsel Olarak Paylaş 🌟')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.shareLinkBtn, { borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0,0,0,0.12)', backgroundColor: isDark ? '#251B10' : '#F7F2E8' }]}
              onPress={handleShareTextAndLink}
            >
              <Ionicons name="link-outline" size={16} color="#D4AF37" style={{ marginRight: 6 }} />
              <Text style={[styles.shareLinkBtnText, { color: isDark ? '#FDF8ED' : '#1A1A24' }]}>
                {t('greeting.shareLinkBtn', 'Doğrudan Tıklanabilir Link Paylaş 🔗')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
  },
  sheetSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  cardPreviewWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  cardCanvas: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cardInnerBorder: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  ornamentIcon: {
    marginBottom: 8,
  },
  cardGreetingTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  decorLine: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginBottom: 12,
  },
  cardMessageText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 14,
  },
  watermarkBox: {
    width: '100%',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
  },
  watermarkMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  watermarkBrandCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  appIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 3,
  },
  watermarkAppName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    letterSpacing: 2,
  },
  watermarkSub: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    marginBottom: 1,
  },
  watermarkStoreHint: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 9.5,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  qrCodeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 7.5,
    color: '#000000',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  sectionHeading: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  templatesScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateChipActive: {
    borderColor: '#D4AF37',
    borderWidth: 1.5,
  },
  templateChipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
  },
  customInputWrap: {
    marginTop: 10,
    gap: 8,
  },
  customInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
  },
  customTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  themesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  themeBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
  },
  shareBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  shareBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#1A1207',
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 10,
  },
  shareLinkBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13.5,
  },
});
