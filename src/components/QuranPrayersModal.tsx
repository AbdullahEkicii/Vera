import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../utils/theme';
import { logQuranPrayerOpened } from '../services/analyticsService';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'start' | 'hatim' | 'sajdah';
}

const PRAYERS_DATA = {
  start: {
    titleTR: 'Kuran Okumaya Başlama Duası',
    titleEN: 'Prayer Before Reciting the Quran',
    arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nاللَّهُمَّ افْتَحْ عَلَيْنَا حِكْمَتَكَ وَانْشُرْ عَلَيْنَا رَحْمَتَكَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliterationTR: 'Eûzü billâhis-semi’il-alîmi mineş-şeytânir-racîm. Bismillâhir-rahmânir-rahîm. Allâhümmeftah aleynâ hikmeteke venşur aleynâ rahmeteke yâ zel-celâli vel-ikrâm.',
    transliterationEN: 'Audhu billahi minash-shaytanir-rajim. Bismillahir-Rahmanir-Rahim. Allahummaftah alayna hikmataka wanshur alayna rahmataka ya Dhal-Jalali wal-Ikram.',
    meaningTR: 'Kovulmuş şeytanın şerrinden her şeyi hakkıyla işiten ve bilen Allah\'a sığınırım. Rahman ve Rahim olan Allah\'ın adıyla.\n\nAllah\'ım! Bizlere hikmet kapılarını aç ve üzerimize sonsuz rahmetini yağdır, ey celal ve ikram sahibi yüce Rabbimiz!',
    meaningEN: 'I seek refuge in Allah, the All-Hearing, the All-Knowing, from the outcast Satan. In the name of Allah, the Most Gracious, the Most Merciful.\n\nO Allah, open the doors of wisdom for us and shower Your mercy upon us, O Possessor of Majesty and Honor!',
  },
  hatim: {
    titleTR: 'Kuran-ı Kerim Hatim Duası',
    titleEN: 'Quran Completion Prayer (Khatm)',
    arabic: 'صَدَقَ اللَّهُ الْعَظِيمُ وَبَلَّغَ رَسُولُهُ الْكَرِيمُ\nاللَّهُمَّ ارْحَمْنَا بِالْقُرْآنِ، وَاجْعَلْهُ لَنَا إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً.\nاللَّهُمَّ ذَكِّرْنَا مِنْهُ مَا نَسِينَا، وَعَلِّمْنَا مِنْهُ مَا جَهِلْنَا، وَارْزُقْنَا تِلَاوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لَنَا حُجَّةً يَا رَبَّ الْعَالَمِينَ.',
    transliterationTR: 'Sadakallâhul-azîm ve belleğa rasûlühül-kerîm. Allâhümmerhamnâ bil-Kur\'ân, vec\'alhü lenâ imâmen ve nûran ve hüden ve rahmeh. Allâhümme zekkirnâ minhü mâ nesînâ ve allimnâ minhü mâ cehilnâ, verzuknâ tilâvetehû ânâel-leyli ve atrâfen-nehâr, vec\'alhü lenâ hucceten yâ rabbal-âlemîn.',
    transliterationEN: 'Sadaqallahul-Azim wa ballagha rasuluhul-karim. Allahummarhamna bil-Quran, waj\'alhu lana imaman wa nuran wa hudan wa rahmah. Allahumma dhakkirna minhu ma nasina wa allimna minhu ma jahilna, warzuqna tilawatahu ana-al-layli wa atrafan-nahar, waj\'alhu lana hujjatan ya Rabbal-Alamin.',
    meaningTR: 'Yüce Allah doğru söyledi. Şanlı Peygamberi de onu bize ulaştırdı.\n\nAllah\'ım! Kuran hürmetine bize merhamet eyle. Kuran\'ı bize rehber, nur, hidayet ve rahmet kıl. Ondan unuttuklarımızı bize hatırlat, bilmediklerimizi öğret. Gece vakitlerinde ve gündüzün aydınlığında onu okumayı ve onunla amel etmeyi nasip eyle. Onu bizim lehimize bir hüccet kıl, ey alemlerin Rabbi!',
    meaningEN: 'Allah the Almighty has spoken the truth, and His noble Messenger conveyed it. O Allah, have mercy on us through the Quran, and make it for us a guide, a light, guidance, and mercy. Remind us of what we have forgotten, teach us what we do not know, grant us its recitation day and night, and make it a proof for us, O Lord of the Worlds!',
  },
  sajdah: {
    titleTR: 'Tilavet Secdesi Duası',
    titleEN: 'Prostration of Recitation (Sajdah)',
    arabic: 'سَجَدَ وَجْهِيَ لِلَّذِي خَلَقَهُ وَصَوَّرَهُ، وَشَقَّ سَمْعَهُ وَبَصَرَهُ بِحَوْلِهِ وَقُوَّتِهِ، فَتَبَارَكَ اللَّهُ أَحْسَنُ الْخَالِقِينَ',
    transliterationTR: 'Secede vechiye lillezî halekahû ve savverahû ve şekka sem\'ahû ve besarahû bi-havlihî ve kuvvetihî, fe tebârakallâhu ahsenul-hâlikîn.',
    transliterationEN: 'Sajada wajhiya lilladhi khalaqahu wa sawwarahu, wa shaqqa sam\'ahu wa basarahu bi-hawlihi wa quwwatih, fa-tabarakallahu ahsanul-khaliqin.',
    meaningTR: 'Yüzüm; kendisini yaratan, şekil veren, kudreti ve kuvvetiyle onda işitme ve görme duygusunu var eden yüce Yaratıcı\'ya secde etti. Yaratanların en güzeli olan Allah ne yücedir!',
    meaningEN: 'My face has prostrated to the One Who created it and formed it, and brought forth its hearing and sight by His might and power. Blessed is Allah, the best of creators!',
  },
};

export function QuranPrayersModal({ visible, onClose, initialTab = 'start' }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, isDark } = useTheme();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  const [activeTab, setActiveTab] = useState<'start' | 'hatim' | 'sajdah'>(initialTab);

  React.useEffect(() => {
    if (visible) {
      logQuranPrayerOpened(activeTab);
    }
  }, [visible, activeTab]);

  if (!visible) return null;

  const currentPrayer = PRAYERS_DATA[activeTab];

  const handleShare = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    const title = isLangTR ? currentPrayer.titleTR : currentPrayer.titleEN;
    const meaning = isLangTR ? currentPrayer.meaningTR : currentPrayer.meaningEN;
    Share.share({
      message: `${title}\n\n${currentPrayer.arabic}\n\n${meaning}\n\n— Vera`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 45 : 30} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1A130C' : '#FFFDF9', borderColor: theme.colors.border }]}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LinearGradient colors={['#D4AF37', '#996515']} style={styles.iconBadge}>
                <Ionicons name="book" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('quran.prayersTitle', 'Kuran Duaları')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={handleShare} style={[styles.circleBtn, { borderColor: theme.colors.border }]}>
                <Feather name="share-2" size={16} color={theme.colors.text} />
              </Pressable>
              <Pressable onPress={onClose} style={[styles.circleBtn, { borderColor: theme.colors.border }]}>
                <Feather name="x" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Pressable
              style={[styles.tabItem, activeTab === 'start' && styles.tabItemActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('start');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'start' ? styles.tabTextActive : { color: theme.colors.textSecondary }]}>
                {t('quran.prayerStart', 'Başlama')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabItem, activeTab === 'hatim' && styles.tabItemActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('hatim');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'hatim' ? styles.tabTextActive : { color: theme.colors.textSecondary }]}>
                {t('quran.prayerHatim', 'Hatim Duası')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabItem, activeTab === 'sajdah' && styles.tabItemActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('sajdah');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'sajdah' ? styles.tabTextActive : { color: theme.colors.textSecondary }]}>
                {t('quran.prayerSajdah', 'Secde Duası')}
              </Text>
            </Pressable>
          </View>

          {/* Content ScrollView */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.prayerHeading, { color: theme.colors.primary }]}>
              {isLangTR ? currentPrayer.titleTR : currentPrayer.titleEN}
            </Text>

            {/* Arabic Box */}
            <View style={[styles.arabicBox, { backgroundColor: isDark ? '#261C10' : '#FDF6E2', borderColor: 'rgba(212,175,55,0.3)' }]}>
              <Text style={[styles.arabicText, { color: theme.colors.text }]}>
                {currentPrayer.arabic}
              </Text>
            </View>

            {/* Transliteration */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
                {t('quran.transliteration', 'Okunuşu')}
              </Text>
              <Text style={[styles.transliterationText, { color: theme.colors.text }]}>
                {isLangTR ? currentPrayer.transliterationTR : currentPrayer.transliterationEN}
              </Text>
            </View>

            {/* Meaning */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
                {t('quran.meaning', 'Türkçe Meali / Anlamı')}
              </Text>
              <Text style={[styles.meaningText, { color: theme.colors.textSecondary }]}>
                {isLangTR ? currentPrayer.meaningTR : currentPrayer.meaningEN}
              </Text>
            </View>
          </ScrollView>

        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 4, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 18,
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#D4AF37',
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12.5,
  },
  tabTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: '#1A1207',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  prayerHeading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 8,
  },
  arabicBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
  },
  arabicText: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 21,
    lineHeight: 38,
    textAlign: 'center',
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transliterationText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13.5,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  meaningText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
