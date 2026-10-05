import { Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, MobileAds } from 'react-native-google-mobile-ads';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devWarn = (...args: any[]) => { if (__DEV__) console.warn(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

let canRequestAds = false;
let initPromise: Promise<boolean> | null = null;

// The ATT prompt and the UMP consent form must not appear before (or on top of) the
// welcome onboarding. Ad slots may mount behind the onboarding modal and ask for
// consent early, so the whole flow waits on this gate until onboarding is done.
let releaseOnboardingGate: () => void = () => {};
const onboardingGate = new Promise<void>((resolve) => {
  releaseOnboardingGate = resolve;
});

/** Call once onboarding is complete (or was already completed on a previous launch). */
export const allowAdsConsentFlow = (): void => releaseOnboardingGate();

export const getCanRequestAds = (): boolean => canRequestAds;

/** Resolves once consent has been gathered (kicking off the flow if it hasn't started yet). */
export const waitForAdsConsent = (): Promise<boolean> => initializeAdsWithConsent();

/**
 * Gathers GDPR/UMP consent (EEA/UK) and iOS App Tracking Transparency permission,
 * then initializes the Google Mobile Ads SDK.
 *
 * We deliberately do NOT force `requestNonPersonalizedAdsOnly: true` on ad requests
 * anymore (see AdBanner.tsx) — once a CMP (UMP) is in place, the Google Mobile Ads SDK
 * reads the on-device IABTCF_* consent signals automatically and serves personalized
 * ads to users who consented (and everyone outside regulated regions), which is what
 * drives fill rate & eCPM up. Forcing NPA globally was cutting out most demand.
 */
export async function initializeAdsWithConsent(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await onboardingGate;
    try {
      // 1. iOS: App Tracking Transparency prompt (affects IDFA availability for personalization).
      if (Platform.OS === 'ios') {
        try {
          const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
          if (status === 'undetermined') {
            await TrackingTransparency.requestTrackingPermissionsAsync();
          }
        } catch (e) {
          devWarn('ATT request failed:', e);
        }
      }

      // 2. GDPR/UK consent via Google's UMP SDK (only shows a form when legally required).
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        devLog('UMP consent status:', consentInfo.status, 'canRequestAds:', consentInfo.canRequestAds);
        canRequestAds = consentInfo.canRequestAds;
      } catch (e) {
        devWarn('UMP gatherConsent failed (check AdMob Privacy & Messaging / GDPR form):', e);
        // The form couldn't be shown (offline, form not configured…). Fall back to the consent
        // state UMP already has on the device: users outside regulated regions and users who
        // consented earlier still get ads, but an EEA/UK user without consent never does.
        try {
          const cached = await AdsConsent.getConsentInfo();
          canRequestAds = cached.canRequestAds;
        } catch {
          canRequestAds = false;
        }
      }

      if (canRequestAds) {
        await MobileAds().initialize();
      }

      return canRequestAds;
    } catch (e) {
      devError('Failed to initialize ads with consent:', e);
      canRequestAds = false;
      return false;
    }
  })();

  return initPromise;
}

/** Re-opens the privacy options form (required entry point for EEA/UK users per Google policy). */
export async function openAdsPrivacyOptionsForm(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.getConsentInfo();
    if (consentInfo.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
      const updated = await AdsConsent.showPrivacyOptionsForm();
      canRequestAds = updated.canRequestAds;
    }
  } catch (e) {
    devWarn('Failed to show privacy options form:', e);
  }
}
