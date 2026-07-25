import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeOutDown, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';

import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

const RECENT_KEY = 'RECENT_SEARCHES';
const MAX_RECENT = 5;

interface RecentCity {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface CitySearchModalProps {
  visible: boolean;
  onClose: () => void;
  onCitySelected: (lat: number, lng: number, city: string) => void;
  isDismissable?: boolean;
}

// Extract a clean short city name from Nominatim result
function extractCityName(result: NominatimResult): string {
  const a = result.address;
  const city = a.city || a.town || a.village || a.county || a.state || '';
  const country = a.country || '';
  return city ? `${city}, ${country}` : result.display_name.split(',').slice(0, 2).join(',').trim();
}

export const CitySearchModal: React.FC<CitySearchModalProps> = ({
  visible,
  onClose,
  onCitySelected,
  isDismissable = true,
}) => {
  const { theme, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentCity[]>([]);

  // Load recent searches when modal opens
  useEffect(() => {
    if (visible) {
      loadRecentSearches();
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setSearchQuery('');
      setSuggestions([]);
      setError(null);
    }
  }, [visible]);

  const loadRecentSearches = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  };

  const saveRecentSearch = async (entry: RecentCity) => {
    try {
      const existing = recentSearches.filter((r) => r.city !== entry.city);
      const updated = [entry, ...existing].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Autocomplete via Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const lang = i18n.language.split('-')[0]; // 'tr', 'en', etc.
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json&addressdetails=1&limit=6` +
        `&featuretype=city` +
        `&accept-language=${lang},en`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'VeraApp/1.0 contact@vera.app' },
      });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [i18n.language]);

  const onChangeText = (text: string) => {
    setSearchQuery(text);
    setError(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceTimer.current = setTimeout(() => fetchSuggestions(text), 350);
  };

  const handleSelectSuggestion = async (result: NominatimResult) => {
    Keyboard.dismiss();
    const cityName = extractCityName(result);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const country = result.address.country || '';

    const entry: RecentCity = { city: cityName, country, lat, lng };
    await saveRecentSearch(entry);
    onCitySelected(lat, lng, cityName);
    setSearchQuery('');
    setSuggestions([]);
    onClose();
  };

  const handleRecentPress = (item: RecentCity) => {
    onCitySelected(item.lat, item.lng, item.city);
    onClose();
  };

  const removeRecent = async (cityName: string) => {
    const updated = recentSearches.filter((r) => r.city !== cityName);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const handleUseGPS = async () => {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('search.gpsDenied', 'Konum izni reddedildi.'));
        return;
      }
      let loc = await Location.getLastKnownPositionAsync({});
      if (!loc) {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Location timed out')), 6000)
        );
        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        loc = await Promise.race([positionPromise, timeoutPromise]);
      }
      if (!loc) {
        throw new Error('Location could not be fetched');
      }
      let city = 'Mevcut Konum';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode && geocode[0]) {
          const item = geocode[0];
          const district = item.district || item.subregion || item.city;
          const province = item.region;
          const nameParts: string[] = [];
          if (district) nameParts.push(district);
          if (province && province !== district) nameParts.push(province);
          if (nameParts.length > 0) {
            city = nameParts.join(', ');
          } else {
            city = item.name || item.street || city;
          }
        }
      } catch {}

      const entry: RecentCity = { city, country: '', lat: loc.coords.latitude, lng: loc.coords.longitude };
      await saveRecentSearch(entry);
      onCitySelected(loc.coords.latitude, loc.coords.longitude, city);
      setSearchQuery('');
      setSuggestions([]);
      onClose();
    } catch (err) {
      setError(t('search.gpsError', 'Konum alınamadı.'));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const showSuggestions = suggestions.length > 0 && searchQuery.trim().length >= 2;
  const showRecent = recentSearches.length > 0 && searchQuery.trim().length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => isDismissable && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {isDismissable && (
          <Pressable style={styles.backdrop} onPress={onClose} />
        )}

        <BlurView
          intensity={isDark ? 30 : 20}
          tint={isDark ? 'dark' : 'light'}
          style={styles.backdrop}
          pointerEvents="none"
        />

        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(200)}
          style={[
            styles.sheet,
            { backgroundColor: isDark ? '#161210' : '#FFFBF4', borderColor: theme.colors.border },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('search.title', 'Konum Seç')}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {t('search.subtitle', 'Dünya genelinde şehir arayın')}
              </Text>
            </View>
            {isDismissable && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Search input */}
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Feather name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t('search.placeholder', 'örn. Aydın, Paris, London...')}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={onChangeText}
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {loadingSuggestions && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
            {searchQuery.length > 0 && !loadingSuggestions && (
              <Pressable onPress={() => { setSearchQuery(''); setSuggestions([]); }} hitSlop={8}>
                <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* GPS Button */}
          {searchQuery.trim().length === 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.gpsBtn,
                {
                  backgroundColor: theme.colors.primary + '15',
                  borderColor: theme.colors.primary + '30',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleUseGPS}
            >
              <Feather name="navigation" size={15} color={theme.colors.primary} />
              <Text style={[styles.gpsBtnText, { color: theme.colors.primary }]}>
                {t('search.useGPS', 'Mevcut Konumu Kullan')}
              </Text>
            </Pressable>
          )}

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          )}

          {/* Autocomplete suggestions */}
          {showSuggestions && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.suggestionsBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <FlatList
                data={suggestions}
                keyExtractor={(item) => String(item.place_id)}
                scrollEnabled={false}
                keyboardShouldPersistTaps="always"
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                )}
                renderItem={({ item }) => {
                  const cityName = extractCityName(item);
                  const parts = item.display_name.split(',');
                  const detail = parts.slice(1, 3).join(',').trim();
                  return (
                    <Pressable
                      style={({ pressed }) => [styles.suggestionRow, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View style={[styles.suggestionIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                        <Feather name="map-pin" size={14} color={theme.colors.primary} />
                      </View>
                      <View style={styles.suggestionTexts}>
                        <Text style={[styles.suggestionCity, { color: theme.colors.text }]} numberOfLines={1}>
                          {cityName}
                        </Text>
                        {detail ? (
                          <Text style={[styles.suggestionDetail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {detail}
                          </Text>
                        ) : null}
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                  );
                }}
              />
            </Animated.View>
          )}

          {/* Recent searches */}
          {showRecent && (
            <View style={styles.recentSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {t('search.recent', 'Son Aramalar')}
              </Text>
              <View style={[styles.recentBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <FlatList
                  data={recentSearches}
                  keyExtractor={(item) => item.city}
                  scrollEnabled={false}
                  keyboardShouldPersistTaps="always"
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                  )}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [styles.suggestionRow, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleRecentPress(item)}
                    >
                      <View style={[styles.suggestionIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                        <Feather name="clock" size={14} color={theme.colors.primary} />
                      </View>
                      <View style={styles.suggestionTexts}>
                        <Text style={[styles.suggestionCity, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.city}
                        </Text>
                      </View>
                      <Pressable onPress={() => removeRecent(item.city)} hitSlop={10}>
                        <Feather name="x" size={16} color={theme.colors.textSecondary} />
                      </Pressable>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    marginTop: -spacing.xs,
  },

  /* Suggestions */
  suggestionsBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTexts: {
    flex: 1,
  },
  suggestionCity: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  suggestionDetail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 1,
  },

  /* Recent */
  recentSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  recentBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 2,
  },
  gpsBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
});
