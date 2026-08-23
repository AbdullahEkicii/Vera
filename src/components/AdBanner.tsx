import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing, typography } from '../utils/theme';

// Test Native Ad ID
const TEST_AD_UNIT_ID = Platform.select({
  ios: TestIds.NATIVE,
  android: TestIds.NATIVE,
}) || TestIds.NATIVE;

export const AdBanner = () => {
  const isAdEnabled = true;
  if (!isAdEnabled) return null;

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ad, setAd] = useState<NativeAd | null>(null);
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const isLangTR = i18n.language === 'tr' || i18n.language.startsWith('tr');

  useEffect(() => {
    let active = true;

    // Using static createForAdRequest API from react-native-google-mobile-ads
    NativeAd.createForAdRequest(TEST_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((loadedAd) => {
        if (active) {
          setAd(loadedAd);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('AdMob Native Ad load error:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (ad) {
        ad.destroy();
      }
    };
  }, []);

  if (error || (!loading && !ad)) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
        <Feather name="image" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.fallbackText, { color: theme.colors.textSecondary }]}>
          {isLangTR ? 'Reklam Alanı' : 'Sponsored'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ad && (
        <NativeAdView
          nativeAd={ad}
          style={[
            styles.adContainer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={styles.adRow}>
            {ad.icon && (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image source={{ uri: ad.icon.url }} style={styles.adIcon} />
              </NativeAsset>
            )}

            <View style={styles.adTextContainer}>
              <View style={styles.adHeaderRow}>
                <View style={styles.adBadge}>
                  <Text style={styles.adBadgeText}>AD</Text>
                </View>
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text style={[styles.headline, { color: theme.colors.text }]} numberOfLines={1}>
                    {ad.headline}
                  </Text>
                </NativeAsset>
              </View>

              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={[styles.tagline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {ad.body}
                </Text>
              </NativeAsset>

              {ad.advertiser && (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <Text style={[styles.advertiser, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {ad.advertiser}
                  </Text>
                </NativeAsset>
              )}
            </View>
          </View>

          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.ctaText}>{ad.callToAction ? ad.callToAction.toUpperCase() : 'INSTALL'}</Text>
            </View>
          </NativeAsset>
        </NativeAdView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 2,
  },
  adContainer: {
    width: '100%',
    padding: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  adIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
  },
  adTextContainer: {
    flex: 1,
  },
  adHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  adBadge: {
    width: 20,
    height: 13,
    borderWidth: 1,
    borderColor: '#F9A825',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
    borderRadius: 3,
  },
  adBadgeText: {
    fontSize: 8.5,
    color: '#F9A825',
    fontWeight: 'bold',
  },
  headline: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    flex: 1,
  },
  tagline: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginBottom: 1,
  },
  advertiser: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9.5,
    opacity: 0.8,
  },
  ctaButton: {
    height: 32,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm || 8,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: '#FFF',
  },
  fallbackContainer: {
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginVertical: 2,
  },
  fallbackText: {
    fontSize: 11,
    opacity: 0.65,
  },
});
