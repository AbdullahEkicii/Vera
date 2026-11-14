import { useIsFocused } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing } from '../utils/theme';
import { Settle, isSlotOnScreen, nextSettle } from '../utils/adViewport';
import { waitForAdsConsent } from '../services/adsConsentService';
import { logAdFailed, logAdLoaded, logAdPaid, logAdRequest, logEvent } from '../services/analyticsService';

// Default banner unit, used by every placement without its own unit. AdMob's own policy-compliant
// banner refresh cadence yields extra impressions over long sessions.
const PRODUCTION_BANNER_AD_UNIT_ID = 'ca-app-pub-2034009761866400/5350507904';
// Per-placement units let AdMob report fill and impressions by screen. Add an entry here once the unit
// exists in AdMob; placements without an entry keep the default unit.
const AD_UNIT_OVERRIDES: Record<string, string> = {};

const unitIdFor = (placement: string): string => {
  if (__DEV__) return TestIds.BANNER;
  return AD_UNIT_OVERRIDES[placement] ?? PRODUCTION_BANNER_AD_UNIT_ID;
};

// Reserved height so the card does not jump when the ad arrives (a phone-width
// anchored adaptive banner is ~50-62dp tall).
const AD_MIN_HEIGHT = 56;
const CARD_PADDING = spacing.sm;

// An ad is requested only once the slot is really on screen and has stayed there for a moment, so a banner
// far down a long screen costs no request until the user scrolls to it. The rules live in utils/adViewport.

/**
 * Height at the bottom of the screen that is covered by something floating over the content (the tab bar).
 * A banner behind it is not seen, so it does not count as on screen. Screens without such an overlay use 0.
 */
export const AdViewportInsetContext = createContext(0);

// Back-off between reloads after a failed request (no-fill, network). Every retry is a real ad request
// that AdMob counts, and a no-fill slot with no impression used to make up to ten of them per user.
// Now: two quick retries, then one slow retry, then the slot gives up for this visit.
const QUICK_RETRY_DELAYS_MS = [10_000, 20_000];
const SLOW_RETRY_DELAY_MS = 5 * 60_000;
const MAX_SLOW_RETRIES = 1;
const MAX_RETRIES = QUICK_RETRY_DELAYS_MS.length + MAX_SLOW_RETRIES;

/**
 * One <BannerAd> mount. Each mount is one ad request, so the request is logged here, on mount,
 * and not in the parent: a remount after a tab switch is a new request and must be counted as one.
 * The first fill of a mount is ad_loaded; later fills of the same mount are AdMob refreshes.
 */
const AdInstance = ({
  unitId,
  size,
  width,
  placement,
  attempt,
  onFilled,
  onFailed,
}: {
  unitId: string;
  size: (typeof BannerAdSize)[keyof typeof BannerAdSize];
  width: number;
  placement: string;
  attempt: number;
  onFilled: () => void;
  onFailed: (error: { code?: string; message?: string }) => void;
}) => {
  const filled = useRef(false);

  useEffect(() => {
    logAdRequest(placement, attempt);
  }, [placement, attempt]);

  return (
    <BannerAd
      unitId={unitId}
      size={size}
      width={width}
      onAdLoaded={() => {
        if (filled.current) {
          logEvent('ad_refreshed', { placement });
        } else {
          filled.current = true;
          logAdLoaded(placement, attempt);
        }
        onFilled();
      }}
      onAdFailedToLoad={onFailed}
      onPaid={(event) => logAdPaid(placement, event.value, event.currency)}
    />
  );
};

export interface BannerAdSlotProps {
  isVisible?: boolean;
  lazy?: boolean;
  /** Where the slot sits, reported with ad_request / ad_loaded / ad_failed. */
  placement?: string;
  /** Called once the ad has filled, so a host can label the slot as an ad. */
  onAdLoaded?: () => void;
  /** `banner` is the small fixed 320x50 unit; `adaptive` fills the card's width. */
  size?: 'adaptive' | 'banner';
}

/**
 * A banner ad inside a padded, rounded card. The adaptive banner is requested at the
 * card's measured inner width (not the screen width), so it fits inside padded
 * layouts instead of being clipped.
 */
export const BannerAdSlot = ({
  isVisible = true,
  lazy = true,
  placement = 'unknown',
  onAdLoaded,
  size = 'adaptive',
}: BannerAdSlotProps) => {
  const isFocused = useIsFocused();
  const { theme } = useTheme();

  const [isInViewport, setIsInViewport] = useState(!lazy);
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  // Bumping this remounts <BannerAd>, which issues a fresh request.
  const [attempt, setAttempt] = useState(0);
  const [retryPending, setRetryPending] = useState(false);
  const [adWidth, setAdWidth] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);

  const containerRef = useRef<View>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldBeActive = isVisible && isFocused;
  const bottomInset = useContext(AdViewportInsetContext);
  // First moment the slot was seen on screen at a given position; see checkViewport.
  const settleRef = useRef<Settle | null>(null);

  const checkViewport = useCallback(() => {
    if (isInViewport) return;
    containerRef.current?.measureInWindow((x, y, width, height) => {
      if (y === undefined || y === null) return;
      const onScreen = isSlotOnScreen({ x, y, width, height }, Dimensions.get('window'), bottomInset);
      const { settle, commit } = nextSettle(settleRef.current, onScreen, y, Date.now());
      settleRef.current = settle;
      if (commit) setIsInViewport(true);
    });
  }, [isInViewport, bottomInset]);

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

  // Space stays reserved while the first requests are in flight. Once the quick retries
  // are spent without an ad, collapse the card so no-fill users do not see an empty frame;
  // it expands again if a slow retry finally loads.
  const collapsed = !adLoaded && attempt >= QUICK_RETRY_DELAYS_MS.length;

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

  // No consent: nothing to show, ever.
  if (consentChecked && !canRequestAds) return null;
  // Leaving the screen (tab switch) does not unmount a loaded ad. Unmounting and remounting it on
  // every return issued a new request each time, and AdMob counts those requests without a matching
  // impression. A hidden (display: none) banner is not viewable, so the SDK does not refresh it either.
  // Before the first fill nothing has been shown yet, so the request is dropped while away.
  const hidden = !shouldBeActive;
  if (hidden && !adLoaded) return null;

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={[
        styles.card,
        // Until the ad loads the frame stays invisible: an empty bordered box reads as a broken
        // screen. The ad is still mounted so its request runs.
        { backgroundColor: adLoaded ? theme.colors.surface : 'transparent', borderColor: adLoaded ? theme.colors.border : 'transparent' },
        collapsed && styles.cardCollapsed,
        hidden && styles.hidden,
      ]}
    >
      <View style={[styles.adArea, !adLoaded && styles.adAreaPending, collapsed && styles.adAreaCollapsed]}>
        {ready && (
          <AdInstance
            key={attempt}
            unitId={unitIdFor(placement)}
            size={size === 'banner' ? BannerAdSize.BANNER : BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            width={adWidth}
            placement={placement}
            attempt={attempt}
            onFilled={() => {
              setAdLoaded(true);
              onAdLoaded?.();
            }}
            onFailed={handleAdFailed}
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
  cardCollapsed: {
    height: 0,
    padding: 0,
    marginVertical: 0,
    borderWidth: 0,
  },
  hidden: {
    display: 'none',
  },
  adAreaCollapsed: {
    minHeight: 0,
    height: 0,
  },
  adAreaPending: {
    minHeight: 0,
  },
  adArea: {
    minHeight: AD_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
});
