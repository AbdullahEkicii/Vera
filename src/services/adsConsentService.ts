import { AppState, InteractionManager, Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, AdsConsentStatus, MobileAds } from 'react-native-google-mobile-ads';
import { applyAnalyticsConsent } from './consentPropagation';

const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devWarn = (...args: any[]) => { if (__DEV__) console.warn(...args); };
const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

let canRequestAds = false;
let initPromise: Promise<boolean> | null = null;
let adsSdkInitialized = false;
// True once UMP gave a definitive answer (form flow succeeded, or a cached non-UNKNOWN state).
// While false (e.g. offline first launch) the flow is retried on the next call / app foreground.
let consentResolved = false;

// The Mobile Ads SDK spins up a WebView, which blocks the main thread (ANR reports show the main
// thread waiting inside libwebviewchromium on slow phones). Never start it while the app is still
// drawing its first screens: wait until the interactions settle and the process is a few seconds old.
const PROCESS_START_MS = Date.now();
const ADS_INIT_MIN_UPTIME_MS = 5000;

const waitForQuietStartup = async (): Promise<void> => {
  await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));
  const remaining = ADS_INIT_MIN_UPTIME_MS - (Date.now() - PROCESS_START_MS);
  if (remaining > 0) await new Promise<void>((resolve) => setTimeout(resolve, remaining));
};

const initializeAdsSdk = async (): Promise<void> => {
  if (adsSdkInitialized) return;
  adsSdkInitialized = true;
  try {
    await waitForQuietStartup();
    await MobileAds().initialize();
  } catch (e) {
    adsSdkInitialized = false;
    devWarn('MobileAds initialize failed:', e);
  }
};

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
        consentResolved = true;
        // canRequestAds is also true where consent isn't required (outside EEA/UK).
        void applyAnalyticsConsent(consentInfo.canRequestAds);
      } catch (e) {
        devWarn('UMP gatherConsent failed (check AdMob Privacy & Messaging / GDPR form):', e);
        // The form couldn't be shown (offline, form not configured…). Fall back to the consent
        // state UMP already has on the device: users outside regulated regions and users who
        // consented earlier still get ads, but an EEA/UK user without consent never does.
        try {
          const cached = await AdsConsent.getConsentInfo();
          canRequestAds = cached.canRequestAds;
          if (cached.status !== AdsConsentStatus.UNKNOWN) {
            consentResolved = true;
            void applyAnalyticsConsent(cached.canRequestAds);
          }
        } catch {
          canRequestAds = false;
        }
      }

      if (canRequestAds) {
        await initializeAdsSdk();
      }

      return canRequestAds;
    } catch (e) {
      devError('Failed to initialize ads with consent:', e);
      canRequestAds = false;
      return false;
    }
  })();

  // Don't cache an unresolved outcome forever: let the next caller start the flow again.
  initPromise.then(() => {
    if (!consentResolved) initPromise = null;
  });

  return initPromise;
}

/** Re-opens the privacy options form (required entry point for EEA/UK users per Google policy). */
export async function openAdsPrivacyOptionsForm(): Promise<void> {
  try {
    const consentInfo = await AdsConsent.getConsentInfo();
    if (consentInfo.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
      const updated = await AdsConsent.showPrivacyOptionsForm();
      canRequestAds = updated.canRequestAds;
      consentResolved = true;
      void applyAnalyticsConsent(updated.canRequestAds);
      if (canRequestAds) await initializeAdsSdk();
    }
  } catch (e) {
    devWarn('Failed to show privacy options form:', e);
  }
}

// Retry an unresolved consent flow (e.g. first launch was offline) when the app comes back to the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active' && !consentResolved && !initPromise) {
    void initializeAdsWithConsent();
  }
});
