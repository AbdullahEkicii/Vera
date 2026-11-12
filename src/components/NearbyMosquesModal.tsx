import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { MosqueItem, fetchNearbyMosques, openMapDirections } from '../services/mosqueService';
import { logModalOpened } from '../services/analyticsService';

interface Props {
  visible: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  currentCity?: string;
  /** Offered in the no-location state; the modal closes itself before calling it. */
  onChooseCity?: () => void;
}

export function NearbyMosquesModal({ visible, onClose, latitude, longitude, currentCity, onChooseCity }: Props) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  // Ignore results of a superseded request (retry, location change, modal closed).
  const requestIdRef = useRef(0);
  const hasLocation = latitude != null && longitude != null;

  useEffect(() => {
    if (visible) {
      logModalOpened('NearbyMosquesModal');
    }
  }, [visible]);

  const loadMosques = useCallback(async () => {
    if (latitude == null || longitude == null) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const list = await fetchNearbyMosques(latitude, longitude);
      if (requestId !== requestIdRef.current) return;
      setMosques(list);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.warn('Error loading mosques:', e);
      setMosques([]);
      setLoadError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (visible && latitude != null && longitude != null) {
      loadMosques();
    }
    return () => {
      requestIdRef.current++;
    };
  }, [visible, latitude, longitude, loadMosques]);

  const handleOpenGeneralSearch = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const query = encodeURIComponent(`${t('mosques.searchQuery', 'Cami')} ${currentCity || ''}`.trim());
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const handleGetDirections = (item: MosqueItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    openMapDirections(item.lat, item.lng, item.name);
  };

  if (!visible) return null;

  const cardBg = isDark ? '#1E160C' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#FDF8ED' : '#1A1A24';
  const textSecondary = isDark ? 'rgba(253, 248, 237, 0.75)' : 'rgba(26,26,36,0.75)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <LinearGradient colors={['#D4AF37', '#996515']} style={styles.headerBadge}>
                <Ionicons name="location" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                  {t('mosques.title', 'Yakındaki Camiler')}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
                  {currentCity ? `${currentCity} • ` : ''}{t('mosques.subtitle', 'Konumunuza en yakın ibadethaneler')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={t('common.close', 'Close')}>
              <Feather name="x" size={20} color={textSecondary} />
            </Pressable>
          </View>

          {!hasLocation ? (
            <View style={styles.centerBox}>
              <Ionicons name="location-outline" size={48} color="#D4AF37" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                {t('mosques.noLocationTitle', 'Konum Bulunamadı')}
              </Text>
              <Text style={[styles.emptyDesc, { color: textSecondary }]}>
                {t('mosques.noLocationDesc', 'Yakındaki camileri görmek için önce bir şehir seçin veya konum erişimine izin verin.')}
              </Text>
              {onChooseCity && (
                <Pressable
                  style={styles.searchMapBtn}
                  onPress={() => { onClose(); setTimeout(onChooseCity, 250); }} // let this modal dismiss before the next opens
                  accessibilityRole="button"
                >
                  <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.searchMapBtnGrad}>
                    <Feather name="map-pin" size={16} color="#1A1207" style={{ marginEnd: 6 }} />
                    <Text style={styles.searchMapBtnText}>
                      {t('mosques.chooseCity', 'Şehir Seç')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          ) : loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={[styles.loadingText, { color: textSecondary }]}>
                {t('mosques.loading', 'Yakındaki camiler taranıyor...')}
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.centerBox}>
              <Ionicons name="cloud-offline-outline" size={48} color="#D4AF37" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                {t('mosques.errorTitle', 'Camiler Yüklenemedi')}
              </Text>
              <Text style={[styles.emptyDesc, { color: textSecondary }]}>
                {t('mosques.errorDesc', 'Bağlantı sorunu yaşandı. İnternet bağlantınızı kontrol edip tekrar deneyin.')}
              </Text>
              <Pressable style={styles.searchMapBtn} onPress={loadMosques} accessibilityRole="button">
                <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.searchMapBtnGrad}>
                  <Feather name="refresh-cw" size={16} color="#1A1207" style={{ marginEnd: 6 }} />
                  <Text style={styles.searchMapBtnText}>
                    {t('common.retry', 'Tekrar Dene')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : mosques.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="navigate-circle-outline" size={48} color="#D4AF37" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                {t('mosques.emptyTitle', 'Cami Bilgisi Bulunamadı')}
              </Text>
              <Text style={[styles.emptyDesc, { color: textSecondary }]}>
                {t('mosques.emptyDesc', 'Harita üzerinde doğrudan yakındaki tüm camileri görüntüleyebilirsiniz.')}
              </Text>
              <Pressable style={styles.searchMapBtn} onPress={handleOpenGeneralSearch} accessibilityRole="button">
                <LinearGradient colors={['#D4AF37', '#B8860B']} style={styles.searchMapBtnGrad}>
                  <Feather name="map" size={16} color="#1A1207" style={{ marginEnd: 6 }} />
                  <Text style={styles.searchMapBtnText}>
                    {t('mosques.openInMaps', 'Haritada Ara')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={mosques}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 300)).duration(350)}>
                  <View style={[styles.mosqueCard, { backgroundColor: isDark ? '#251B10' : '#FAFAF7', borderColor: cardBorder }]}>
                    <View style={styles.cardInfoCol}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.mosqueIconWrap}>
                          <Ionicons name="moon" size={14} color="#D4AF37" />
                        </View>
                        <Text style={[styles.mosqueName, { color: textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>

                      {item.address && (
                        <Text style={[styles.mosqueAddress, { color: textSecondary }]} numberOfLines={1}>
                          {item.address}
                        </Text>
                      )}

                      <View style={styles.distanceBadge}>
                        <Feather name="navigation" size={11} color="#10B981" style={{ marginEnd: 4 }} />
                        <Text style={styles.distanceText}>{item.distanceFormatted}</Text>
                      </View>
                    </View>

                    {/* Directions Action Button */}
                    <Pressable
                      style={styles.directionsBtn}
                      onPress={() => handleGetDirections(item)}
                    >
                      <LinearGradient
                        colors={['#D4AF37', '#B8860B']}
                        style={styles.directionsBtnGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="navigate" size={15} color="#1A1207" style={{ marginEnd: 4 }} />
                        <Text style={styles.directionsText}>
                          {t('mosques.directionsBtn', 'Yol Tarifi')}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '88%',
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
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
    marginEnd: 12,
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
  closeBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  searchMapBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  searchMapBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  searchMapBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#1A1207',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 10,
  },
  mosqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  cardInfoCol: {
    flex: 1,
    marginEnd: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mosqueIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 6,
  },
  mosqueName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  mosqueAddress: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    marginBottom: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: '#10B981',
  },
  directionsBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  directionsBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  directionsText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#1A1207',
  },
});
