import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing } from '../utils/theme';
import { waitForAdsConsent } from '../services/adsConsentService';
import { logAdFailed, logAdLoaded, logAdRequest } from '../services/analyticsService';

// Banner unit used on every ad placement in the app. AdMob's own policy-compliant
// banner refresh cadence yields extra impressions over long sessions.
const PRODUCTION_BANNER_AD_UNIT_ID = 'ca-app-pub-2034009761866400/5350507904';
const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : PRODUCTION_BANNER_AD_UNIT_ID;

// Reserved height so the card does not jump when the ad arrives (a phone-width
// anchored adaptive banner is ~50-62dp tall).
const AD_MIN_HEIGHT = 56;
const CARD_PADDING = spacing.sm;

// Back-off between reloads after a failed request (no-fill, network): three quick
// retries, then a slow cadence so a no-fill user is not hammered. The slot keeps its
// space while retrying instead of collapsing.
const QUICK_RETRY_DELAYS_MS = [10_000, 20_000, 30_000];
const SLOW_RETRY_DELAY_MS = 5 * 60_000;
const MAX_SLOW_RETRIES = 6;
const MAX_RETRIES = QUICK_RETRY_DELAYS_MS.length + MAX_SLOW_RETRIES;

export interface BannerAdSlotProps {
  isVisible?: boolean;
  lazy?: boolean;
  /** Where the slot sits, reported with ad_request / ad_loaded / ad_failed. */
  placement?: string;
}

/**
 * A banner ad inside a padded, rounded card. The adaptive banner is requested at the
 * card's measured inner width (not the screen width), so it fits inside padded
 * layouts instead of being clipped.
 */
export const BannerAdSlot = ({ isVisible = true, lazy = true, placement = 'unknown' }: BannerAdSlotProps) => {
  const isFocused = useIsFocused();
  const { theme } = useTheme();

  const [isInViewport, setIsInViewport] = useState(!lazy);
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  // Bumping this remounts <BannerAd>, which issues a fresh request.
  const [attempt, setAttempt] = useState(0);
  const [retryPending, setRetryPending] = useState(false);
  const [adWidth, setAdWidth] = useState(0);

  const containerRef = useRef<View>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldBeActive = isVisible && isFocused;

  const checkViewport = useCallback(() => {
    if (isInViewport) return;
    containerRef.current?.measureInWindow((x, y, width, height) => {
      if (!width || !height || width <= 0 || height <= 0 || y === undefined || y === null) {
        return;
      }
      const windowHeight = Dimensions.get('window').height;
      const windowWidth = Dimensions.get('window').width;
      const verticallyVisible = y < windowHeight + 80 && y + height > -50;
      const horizontallyVisible = x < windowWidth + 80 && x + width > -50;
      if (verticallyVisible && horizontallyVisible) {
        setIsInViewport(true);
      }
    });
  }, [isInViewport]);

  useEffect(() => {
    if (!shouldBeActive || isInViewport) return;
    checkViewport();
    const interval = setInterval(checkViewport, 750);
    return () => clearInterval(interval);
  }, [shouldBeActive, isInViewport, checkViewport]);

  useEffect(() => {
    let active = true;
    waitForAdsConsent().then((granted) => {
      if (!active) return;
      setCanRequestAds(granted);
      setConsentChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Leaving the screen drops any scheduled reload; the next mount starts fresh.
  useEffect(() => {
    if (shouldBeActive) return;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    setRetryPending(false);
  }, [shouldBeActive]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  const ready = isInViewport && canRequestAds && adWidth > 0 && !retryPending;

  useEffect(() => {
    if (ready) logAdRequest(placement, attempt);
  }, [ready, attempt, placement]);

  const handleAdFailed = (error: { code?: string; message?: string }) => {
    // Report only when the quick retries are exhausted and when giving up entirely,
    // so one no-fill user does not produce a flood of ad_failed events.
    if (attempt === QUICK_RETRY_DELAYS_MS.length || attempt >= MAX_RETRIES) {
      logAdFailed(placement, attempt, error);
    }
    if (attempt >= MAX_RETRIES) return;
    const delay = attempt < QUICK_RETRY_DELAYS_MS.length ? QUICK_RETRY_DELAYS_MS[attempt] : SLOW_RETRY_DELAY_MS;
    setRetryPending(true);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      setRetryPending(false);
      setAttempt((n) => n + 1);
    }, delay);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const inner = Math.floor(e.nativeEvent.layout.width - CARD_PADDING * 2);
    // Only lock the width once; re-requesting the ad on every sub-pixel layout change
    // would reload it.
    if (inner > 0 && adWidth === 0) setAdWidth(inner);
    checkViewport();
  };

  // No consent: collapse. A failed request keeps the slot's space while it retries.
  if (!shouldBeActive || (consentChecked && !canRequestAds)) {
    return null;
  }

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={styles.adArea}>
        {ready && (
          <BannerAd
            key={attempt}
            unitId={BANNER_AD_UNIT_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            width={adWidth}
            onAdLoaded={() => logAdLoaded(placement, attempt)}
            onAdFailedToLoad={handleAdFailed}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: CARD_PADDING,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  adArea: {
    minHeight: AD_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
});
