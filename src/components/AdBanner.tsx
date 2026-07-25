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
  // Şimdilik reklamları tüm ekranlardan gizliyoruz. 
  // Gerçek ID eklendiğinde veya aktif etmek istediğinizde buradaki "const isAdEnabled = false;" satırını true yapabilirsiniz.
  const isAdEnabled = false;
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
                <Text style={[styles.tagline, { color: theme.colors.textSecondary }]} numberOfLines={2}>
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
    marginVertical: 4,
  },
  adContainer: {
    width: '100%',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
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
    width: 22,
    height: 14,
    borderWidth: 1,
    borderColor: '#F9A825',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderRadius: 3,
  },
  adBadgeText: {
    fontSize: 9,
    color: '#F9A825',
    fontWeight: 'bold',
  },
  headline: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    flex: 1,
  },
  tagline: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginBottom: 2,
  },
  advertiser: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    opacity: 0.8,
  },
  ctaButton: {
    height: 38,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFF',
  },
  fallbackContainer: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    marginVertical: 4,
  },
  fallbackText: {
    fontSize: 11,
    opacity: 0.65,
  },
});
