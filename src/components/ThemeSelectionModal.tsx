import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { palettes } from '../utils/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThemeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onHomeStyleChange?: (style: 'default' | 'simple') => void;
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  visible,
  onClose,
  onHomeStyleChange,
}) => {
  const { t } = useTranslation();
  const {
    theme,
    isDark,
    mode,
    setThemeMode,
    colorPalette,
    setColorPalette,
    circlePalette,
    setCirclePalette,
  } = useTheme();

  const [homeStyle, setHomeStyle] = useState<'default' | 'simple'>('default');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('HOME_SCREEN_STYLE');
        if (saved === 'simple' || saved === 'default') {
          setHomeStyle(saved);
        }
      } catch (e) {
        console.log('Failed to load home screen style', e);
      }
    })();
  }, []);

  const saveHomeStyle = async (value: 'default' | 'simple') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    try {
      await AsyncStorage.setItem('HOME_SCREEN_STYLE', value);
      setHomeStyle(value);
      if (onHomeStyleChange) onHomeStyleChange(value);
    } catch (e) {
      console.log('Failed to save home screen style', e);
    }
  };

  const handlePaletteSelect = (key: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    setColorPalette(key as any);
  };

  const handleCircleSelect = (key: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    setCirclePalette(key as any);
  };

  const handleModeSelect = (selectedMode: 'light' | 'dark') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    setThemeMode(selectedMode);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={isDark ? 60 : 30} tint={isDark ? 'dark' : 'light'} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.duration(280).springify()}
          style={[
            styles.container,
            { backgroundColor: isDark ? '#16120D' : '#FFFFFF', borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)' },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(5, 150, 105, 0.1)' }]}>
                <Ionicons name="color-palette" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {t('settings.themePalette', 'Tema & Görünüm')}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  {t('settings.themeDesc', 'Uygulama renklerini ve düzenini özelleştirin')}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#261D14' : '#F2EFE9' }]}
            >
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── 1. LIGHT / DARK MODE ── */}
            <View style={styles.sectionHeader}>
              <Feather name="sun" size={15} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {t('settings.themeMode', 'Arayüz Modu')}
              </Text>
            </View>

            <View style={styles.modeRow}>
              {[
                { id: 'dark', label: t('settings.modeDark', 'Koyu Mod'), icon: 'moon' },
                { id: 'light', label: t('settings.modeLight', 'Açık Mod'), icon: 'sun' },
              ].map((modeItem) => {
                const isSelected = mode === modeItem.id;
                return (
                  <Pressable
                    key={modeItem.id}
                    style={[
                      styles.modeCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(5, 150, 105, 0.1)')
                          : (isDark ? '#221910' : '#F8F6F0'),
                        borderColor: isSelected ? theme.colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => handleModeSelect(modeItem.id as any)}
                  >
                    <Feather
                      name={modeItem.icon as any}
                      size={18}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeLabel,
                        { color: isSelected ? theme.colors.primary : theme.colors.text },
                        isSelected && { fontFamily: 'Outfit_700Bold' },
                      ]}
                    >
                      {modeItem.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── 2. HOME SCREEN LAYOUT STYLE ── */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Feather name="layout" size={15} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {t('settings.homeAppearance', 'Ana Ekran Düzeni')}
              </Text>
            </View>

            <View style={styles.layoutGrid}>
              <Pressable
                style={[
                  styles.layoutCard,
                  {
                    backgroundColor: homeStyle === 'default'
                      ? (isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(5, 150, 105, 0.1)')
                      : (isDark ? '#221910' : '#F8F6F0'),
                    borderColor: homeStyle === 'default' ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => saveHomeStyle('default')}
              >
                <View style={styles.layoutCardHeader}>
                  <Feather name="compass" size={16} color={theme.colors.primary} />
                  {homeStyle === 'default' && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  )}
                </View>
                <Text style={[styles.layoutTitle, { color: theme.colors.text }]}>
                  {t('settings.homeStyle.default', 'Zengin / Modern')}
                </Text>
                <Text style={[styles.layoutDesc, { color: theme.colors.textSecondary }]}>
                  {t('settings.homeStyle.defaultDesc', 'Daire geri sayım, tüm vakitler ve zengin içerikler')}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.layoutCard,
                  {
                    backgroundColor: homeStyle === 'simple'
                      ? (isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(5, 150, 105, 0.1)')
                      : (isDark ? '#221910' : '#F8F6F0'),
                    borderColor: homeStyle === 'simple' ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => saveHomeStyle('simple')}
              >
                <View style={styles.layoutCardHeader}>
                  <Feather name="list" size={16} color={theme.colors.primary} />
                  {homeStyle === 'simple' && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  )}
                </View>
                <Text style={[styles.layoutTitle, { color: theme.colors.text }]}>
                  {t('settings.homeStyle.simple', 'Sade / Minimalist')}
                </Text>
                <Text style={[styles.layoutDesc, { color: theme.colors.textSecondary }]}>
                  {t('settings.homeStyle.simpleDesc', 'Göz yormayan sade liste ve hızlı vakit takibi')}
                </Text>
              </Pressable>
            </View>

            {/* ── 3. MAIN THEME ACCENT PALETTES ── */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Feather name="aperture" size={15} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {t('settings.mainTheme', 'Ana Renk Paleti')}
              </Text>
            </View>

            <View style={styles.paletteGrid}>
              {/* Default Theme */}
              <Pressable
                style={[
                  styles.paletteCard,
                  {
                    backgroundColor: isDark ? '#221910' : '#F8F6F0',
                    borderColor: colorPalette === 'default' ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => handlePaletteSelect('default')}
              >
                <LinearGradient
                  colors={isDark ? ['#F59E0B', '#B45309'] : ['#059669', '#047857']}
                  style={styles.paletteSwatch}
                >
                  {colorPalette === 'default' && (
                    <Feather name="check" size={15} color="#FFFFFF" />
                  )}
                </LinearGradient>
                <Text style={[styles.paletteName, { color: theme.colors.text }]} numberOfLines={1}>
                  {t('settings.palettes.default', 'Klasik')}
                </Text>
              </Pressable>

              {/* Dynamic Palettes */}
              {Object.entries(palettes).map(([key, pal]) => {
                const isSelected = colorPalette === key;
                return (
                  <Pressable
                    key={`theme_${key}`}
                    style={[
                      styles.paletteCard,
                      {
                        backgroundColor: isDark ? '#221910' : '#F8F6F0',
                        borderColor: isSelected ? pal.primary : 'transparent',
                      },
                    ]}
                    onPress={() => handlePaletteSelect(key)}
                  >
                    <View style={[styles.paletteSwatch, { backgroundColor: pal.primary }]}>
                      {isSelected && <Feather name="check" size={15} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.paletteName, { color: theme.colors.text }]} numberOfLines={1}>
                      {t(`settings.palettes.${key}`, pal.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── 4. COUNTDOWN CIRCLE ACCENT ── */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Feather name="disc" size={15} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {t('settings.circlePalette', 'Geri Sayım Dairesi Rengi')}
              </Text>
            </View>

            <View style={styles.paletteGrid}>
              <Pressable
                style={[
                  styles.paletteCard,
                  {
                    backgroundColor: isDark ? '#221910' : '#F8F6F0',
                    borderColor: circlePalette === 'default' ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => handleCircleSelect('default')}
              >
                <LinearGradient
                  colors={isDark ? ['#F59E0B', '#B45309'] : ['#059669', '#047857']}
                  style={styles.paletteSwatch}
                >
                  {circlePalette === 'default' && (
                    <Feather name="check" size={15} color="#FFFFFF" />
                  )}
                </LinearGradient>
                <Text style={[styles.paletteName, { color: theme.colors.text }]} numberOfLines={1}>
                  {t('settings.palettes.default', 'Klasik')}
                </Text>
              </Pressable>

              {Object.entries(palettes).map(([key, pal]) => {
                const isSelected = circlePalette === key;
                return (
                  <Pressable
                    key={`circle_${key}`}
                    style={[
                      styles.paletteCard,
                      {
                        backgroundColor: isDark ? '#221910' : '#F8F6F0',
                        borderColor: isSelected ? pal.primary : 'transparent',
                      },
                    ]}
                    onPress={() => handleCircleSelect(key)}
                  >
                    <View style={[styles.paletteSwatch, { backgroundColor: pal.primary }]}>
                      {isSelected && <Feather name="check" size={15} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.paletteName, { color: theme.colors.text }]} numberOfLines={1}>
                      {t(`settings.palettes.${key}`, pal.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  container: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  list: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    marginLeft: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  modeLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
  },
  layoutGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  layoutCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  layoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  layoutTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13.5,
    marginBottom: 3,
  },
  layoutDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteCard: {
    width: (SCREEN_WIDTH - 40 - 24) / 4,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  paletteSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  paletteName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    textAlign: 'center',
  },
});