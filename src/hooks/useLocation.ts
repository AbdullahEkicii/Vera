import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';
import { updateMethodForLocation } from '../utils/calcMethod';
import { logLocationResult } from '../services/analyticsService';
import { AppStorage as AsyncStorage, SecureLocationStorage } from '../services/storageService';
import i18n from '../localization/i18n';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

// Used when the timezone gave no match: a representative city per device region.
// Still only a guess (the UI treats it as one), but far closer than Istanbul for most users.
const REGION_FALLBACKS: Record<string, LocationData> = {
  TR: { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul' },
  DE: { latitude: 52.52, longitude: 13.405, city: 'Berlin' },
  AT: { latitude: 48.2082, longitude: 16.3738, city: 'Wien' },
  CH: { latitude: 47.3769, longitude: 8.5417, city: 'Zürich' },
  GB: { latitude: 51.5074, longitude: -0.1278, city: 'London' },
  IE: { latitude: 53.3498, longitude: -6.2603, city: 'Dublin' },
  FR: { latitude: 48.8566, longitude: 2.3522, city: 'Paris' },
  NL: { latitude: 52.3676, longitude: 4.9041, city: 'Amsterdam' },
  BE: { latitude: 50.8503, longitude: 4.3517, city: 'Bruxelles' },
  IT: { latitude: 41.9028, longitude: 12.4964, city: 'Roma' },
  ES: { latitude: 40.4168, longitude: -3.7038, city: 'Madrid' },
  PT: { latitude: 38.7223, longitude: -9.1393, city: 'Lisboa' },
  PL: { latitude: 52.2297, longitude: 21.0122, city: 'Warszawa' },
  SE: { latitude: 59.3293, longitude: 18.0686, city: 'Stockholm' },
  NO: { latitude: 59.9139, longitude: 10.7522, city: 'Oslo' },
  DK: { latitude: 55.6761, longitude: 12.5683, city: 'København' },
  FI: { latitude: 60.1699, longitude: 24.9384, city: 'Helsinki' },
  CZ: { latitude: 50.0755, longitude: 14.4378, city: 'Praha' },
  SK: { latitude: 48.1486, longitude: 17.1077, city: 'Bratislava' },
  HU: { latitude: 47.4979, longitude: 19.0402, city: 'Budapest' },
  RO: { latitude: 44.4268, longitude: 26.1025, city: 'București' },
  BG: { latitude: 42.6977, longitude: 23.3219, city: 'Sofia' },
  GR: { latitude: 37.9838, longitude: 23.7275, city: 'Athína' },
  RS: { latitude: 44.7866, longitude: 20.4489, city: 'Beograd' },
  BA: { latitude: 43.8563, longitude: 18.4131, city: 'Sarajevo' },
  AL: { latitude: 41.3275, longitude: 19.8187, city: 'Tiranë' },
  MK: { latitude: 41.9981, longitude: 21.4254, city: 'Skopje' },
  XK: { latitude: 42.6629, longitude: 21.1655, city: 'Prishtinë' },
  UA: { latitude: 50.4501, longitude: 30.5234, city: 'Kyiv' },
  RU: { latitude: 55.7558, longitude: 37.6173, city: 'Moscow' },
  UZ: { latitude: 41.2995, longitude: 69.2401, city: 'Tashkent' },
  KZ: { latitude: 43.222, longitude: 76.8512, city: 'Almaty' },
  KG: { latitude: 42.8746, longitude: 74.5698, city: 'Bishkek' },
  TJ: { latitude: 38.5598, longitude: 68.787, city: 'Dushanbe' },
  TM: { latitude: 37.9601, longitude: 58.3261, city: 'Ashgabat' },
  AZ: { latitude: 40.4093, longitude: 49.8671, city: 'Baku' },
  SA: { latitude: 21.3891, longitude: 39.8579, city: 'Makkah' },
  AE: { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' },
  KW: { latitude: 29.3759, longitude: 47.9774, city: 'Kuwait' },
  QA: { latitude: 25.2854, longitude: 51.531, city: 'Doha' },
  BH: { latitude: 26.2285, longitude: 50.586, city: 'Manama' },
  OM: { latitude: 23.588, longitude: 58.3829, city: 'Muscat' },
  YE: { latitude: 15.3694, longitude: 44.191, city: 'Sanaa' },
  IQ: { latitude: 33.3152, longitude: 44.3661, city: 'Baghdad' },
  IR: { latitude: 35.6892, longitude: 51.389, city: 'Tehran' },
  SY: { latitude: 33.5138, longitude: 36.2765, city: 'Damascus' },
  LB: { latitude: 33.8938, longitude: 35.5018, city: 'Beirut' },
  JO: { latitude: 31.9454, longitude: 35.9284, city: 'Amman' },
  PS: { latitude: 31.7683, longitude: 35.2137, city: 'Jerusalem' },
  IL: { latitude: 31.7683, longitude: 35.2137, city: 'Jerusalem' },
  EG: { latitude: 30.0444, longitude: 31.2357, city: 'Cairo' },
  MA: { latitude: 33.5731, longitude: -7.5898, city: 'Casablanca' },
  DZ: { latitude: 36.7538, longitude: 3.0588, city: 'Algiers' },
  TN: { latitude: 36.8065, longitude: 10.1815, city: 'Tunis' },
  LY: { latitude: 32.8872, longitude: 13.1913, city: 'Tripoli' },
  SD: { latitude: 15.5007, longitude: 32.5599, city: 'Khartoum' },
  SO: { latitude: 2.0469, longitude: 45.3182, city: 'Mogadishu' },
  NG: { latitude: 6.5244, longitude: 3.3792, city: 'Lagos' },
  NE: { latitude: 13.5116, longitude: 2.1254, city: 'Niamey' },
  SN: { latitude: 14.7167, longitude: -17.4677, city: 'Dakar' },
  ML: { latitude: 12.6392, longitude: -8.0029, city: 'Bamako' },
  KE: { latitude: -1.2921, longitude: 36.8219, city: 'Nairobi' },
  TZ: { latitude: -6.7924, longitude: 39.2083, city: 'Dar es Salaam' },
  ET: { latitude: 9.03, longitude: 38.74, city: 'Addis Ababa' },
  ZA: { latitude: -26.2041, longitude: 28.0473, city: 'Johannesburg' },
  PK: { latitude: 24.8607, longitude: 67.0011, city: 'Karachi' },
  BD: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka' },
  IN: { latitude: 28.6139, longitude: 77.209, city: 'New Delhi' },
  AF: { latitude: 34.5553, longitude: 69.2075, city: 'Kabul' },
  LK: { latitude: 6.9271, longitude: 79.8612, city: 'Colombo' },
  MV: { latitude: 4.1755, longitude: 73.5093, city: 'Malé' },
  ID: { latitude: -6.2088, longitude: 106.8456, city: 'Jakarta' },
  MY: { latitude: 3.139, longitude: 101.6869, city: 'Kuala Lumpur' },
  SG: { latitude: 1.3521, longitude: 103.8198, city: 'Singapore' },
  BN: { latitude: 4.9031, longitude: 114.9398, city: 'Bandar Seri Begawan' },
  TH: { latitude: 13.7563, longitude: 100.5018, city: 'Bangkok' },
  PH: { latitude: 14.5995, longitude: 120.9842, city: 'Manila' },
  VN: { latitude: 21.0285, longitude: 105.8542, city: 'Hanoi' },
  CN: { latitude: 39.9042, longitude: 116.4074, city: 'Beijing' },
  JP: { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' },
  KR: { latitude: 37.5665, longitude: 126.978, city: 'Seoul' },
  US: { latitude: 40.7128, longitude: -74.006, city: 'New York' },
  CA: { latitude: 43.6532, longitude: -79.3832, city: 'Toronto' },
  MX: { latitude: 19.4326, longitude: -99.1332, city: 'Mexico City' },
  BR: { latitude: -23.5505, longitude: -46.6333, city: 'São Paulo' },
  AR: { latitude: -34.6037, longitude: -58.3816, city: 'Buenos Aires' },
  AU: { latitude: -33.8688, longitude: 151.2093, city: 'Sydney' },
  NZ: { latitude: -36.8485, longitude: 174.7633, city: 'Auckland' },
};

export const getSystemFallbackLocation = (): LocationData => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

    // Turkey
    if (tz.includes('Istanbul') || tz.includes('Turkey')) {
      return { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul' };
    }
    // Germany, Austria, Switzerland
    if (tz.includes('Berlin')) {
      return { latitude: 52.5200, longitude: 13.4050, city: 'Berlin' };
    }
    if (tz.includes('Vienna')) {
      return { latitude: 48.2082, longitude: 16.3738, city: 'Wien' };
    }
    if (tz.includes('Zurich')) {
      return { latitude: 47.3769, longitude: 8.5417, city: 'Zürich' };
    }
    // UK
    if (tz.includes('London')) {
      return { latitude: 51.5074, longitude: -0.1278, city: 'London' };
    }
    // France
    if (tz.includes('Paris')) {
      return { latitude: 48.8566, longitude: 2.3522, city: 'Paris' };
    }
    // Netherlands & Belgium
    if (tz.includes('Amsterdam')) {
      return { latitude: 52.3676, longitude: 4.9041, city: 'Amsterdam' };
    }
    if (tz.includes('Brussels')) {
      return { latitude: 50.8503, longitude: 4.3517, city: 'Bruxelles' };
    }
    // Italy
    if (tz.includes('Rome')) {
      return { latitude: 41.9028, longitude: 12.4964, city: 'Roma' };
    }
    // Middle East / Gulf
    if (tz.includes('Riyadh')) {
      return { latitude: 21.3891, longitude: 39.8579, city: 'Makkah' };
    }
    if (tz.includes('Dubai')) {
      return { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' };
    }
    if (tz.includes('Kuwait')) {
      return { latitude: 29.3759, longitude: 47.9774, city: 'Kuwait' };
    }
    if (tz.includes('Qatar') || tz.includes('Doha')) {
      return { latitude: 25.2854, longitude: 51.5310, city: 'Doha' };
    }
    // North Africa
    if (tz.includes('Cairo')) {
      return { latitude: 30.0444, longitude: 31.2357, city: 'Cairo' };
    }
    if (tz.includes('Casablanca')) {
      return { latitude: 33.5731, longitude: -7.5898, city: 'Casablanca' };
    }
    if (tz.includes('Algiers')) {
      return { latitude: 36.7538, longitude: 3.0588, city: 'Algiers' };
    }
    // South Asia
    if (tz.includes('Karachi')) {
      return { latitude: 24.8607, longitude: 67.0011, city: 'Karachi' };
    }
    if (tz.includes('Dhaka')) {
      return { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka' };
    }
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Delhi')) {
      return { latitude: 28.6139, longitude: 77.2090, city: 'New Delhi' };
    }
    // Southeast Asia
    if (tz.includes('Jakarta') || tz.includes('Pontianak') || tz.includes('Makassar')) {
      return { latitude: -6.2088, longitude: 106.8456, city: 'Jakarta' };
    }
    if (tz.includes('Kuala_Lumpur')) {
      return { latitude: 3.1390, longitude: 101.6869, city: 'Kuala Lumpur' };
    }
    // Central Asia / Russia
    if (tz.includes('Tashkent')) {
      return { latitude: 41.2995, longitude: 69.2401, city: 'Tashkent' };
    }
    if (tz.includes('Baku')) {
      return { latitude: 40.4093, longitude: 49.8671, city: 'Baku' };
    }
    if (tz.includes('Moscow')) {
      return { latitude: 55.7558, longitude: 37.6173, city: 'Moscow' };
    }
    // North America
    if (tz.includes('New_York') || tz.includes('America/Toronto')) {
      return { latitude: 40.7128, longitude: -74.0060, city: 'New York' };
    }
    if (tz.includes('Chicago')) {
      return { latitude: 41.8781, longitude: -87.6298, city: 'Chicago' };
    }
    if (tz.includes('Los_Angeles')) {
      return { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles' };
    }
  } catch {}

  try {
    const region = (Localization.getLocales()[0]?.regionCode || '').toUpperCase();
    if (region && REGION_FALLBACKS[region]) return REGION_FALLBACKS[region];
  } catch {}

  return { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul' };
};

async function reverseGeocodeWithRetry(latitude: number, longitude: number, retries = 2, delayMs = 1000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      // The geocoder can stall (no Google geocoder / offline); never hold the location back.
      const geocode = await Promise.race([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('geocode timeout')), 5000)),
      ]);
      if (geocode && geocode[0]) {
        const item = geocode[0];
        const district = item.district || item.subregion || item.city;
        const province = item.region;
        
        const nameParts: string[] = [];
        if (district) nameParts.push(district);
        if (province && province !== district) nameParts.push(province);
        
        if (nameParts.length > 0) {
          return nameParts.join(', ');
        }
        
        const fallback = item.name || item.street;
        if (fallback) return fallback;
      }
    } catch {
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return i18n.t('home.currentLocation', 'Current Location');
}

// 12 hours interval for auto location refresh (günde ~2 kere)
const LOCATION_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

// A last-known fix older than this (or too coarse) is treated as "no fix": a days-old
// position from another city must not become the current location.
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const LAST_KNOWN_REQUIRED_ACCURACY_M = 5000;

// Emitted by Settings after it changed the saved location; payload `{ force?: boolean }`.
export const LOCATION_CHANGED_EVENT = 'LOCATION_CHANGED';

export const useLocation = () => {
  const fallbackLocation = getSystemFallbackLocation();
  const [location, setLocation] = useState<LocationData>(fallbackLocation);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Non-blocking initial state!
  const [needsManualLocation, setNeedsManualLocation] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // False until the saved/cached location has been read (or ruled out). The initial
  // `location` is only a timezone guess; consumers must not fetch prayer times for it
  // before this flips, or a returning user briefly gets another city's times.
  const [isResolved, setIsResolved] = useState(false);
  // True while `location` is only the timezone/region guess (nothing saved, no GPS fix yet).
  const [isFallbackLocation, setIsFallbackLocation] = useState(true);
  // AppState 'active' also fires when the permission dialog closes; a second concurrent
  // run would re-request the permission and fail with "request already in progress".
  const inFlight = useRef(false);

  const initLocation = useCallback(async (forceRefresh = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // 1. Check if user has manually set a location
      const savedLocationStr = await SecureLocationStorage.getItem('MANUAL_LOCATION');
      if (savedLocationStr) {
        const savedLocation: LocationData = JSON.parse(savedLocationStr);
        setLocation(savedLocation);
        setIsFallbackLocation(false);
        setNeedsManualLocation(false);
        setPermissionDenied(false);
        setLoading(false);
        setIsResolved(true);
        return;
      }

      // 1.5 Check if we have a cached GPS location from a previous launch
      let hasCachedLocation = false;
      let previousGps: LocationData | null = null;
      const cachedGpsStr = await SecureLocationStorage.getItem('LAST_GPS_LOCATION');
      if (cachedGpsStr) {
        const cachedGps: LocationData = JSON.parse(cachedGpsStr);
        previousGps = cachedGps;
        setLocation(cachedGps);
        setIsFallbackLocation(false);
        setNeedsManualLocation(false);
        setPermissionDenied(false);
        setLoading(false);
        setIsResolved(true);
        hasCachedLocation = true;
      }

      // Check if location was recently updated (within last 12 hours) to avoid battery drain
      const lastUpdateTimeStr = await AsyncStorage.getItem('LAST_GPS_UPDATE_TIME');
      const lastUpdateTime = lastUpdateTimeStr ? parseInt(lastUpdateTimeStr, 10) : 0;
      const isStale = Date.now() - lastUpdateTime >= LOCATION_REFRESH_INTERVAL_MS;

      // Skip background GPS scan if we have a recent location and forceRefresh is false
      if (hasCachedLocation && !isStale && !forceRefresh) {
        return;
      }

      // 2. Check if foreground permission is already granted without blocking
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const onboardingCompleted = await AsyncStorage.getItem('ONBOARDING_COMPLETED');
        if (onboardingCompleted !== 'true') {
          // Defer permission prompt to WelcomeOnboardingModal so user gets clear context
          if (!hasCachedLocation) setLocation(fallbackLocation);
          setLoading(false);
          return;
        }

        // Someone who skipped (or declined) location in setup is not asked again on every
        // launch; Settings ("Use my current location") passes forceRefresh to ask on purpose.
        const skipped = (await AsyncStorage.getItem('LOCATION_PROMPT_SKIPPED')) === 'true';
        if (skipped && !forceRefresh) {
          setPermissionDenied(true);
          if (!hasCachedLocation) setLocation(fallbackLocation);
          setLoading(false);
          return;
        }

        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') {
          logLocationResult('denied', 'startup');
          setErrorMsg('Permission to access location was denied');
          setPermissionDenied(true);
          // A user with a good cached city is not asked to pick one again (e.g. "only
          // this time" permission expired); the soft banner is enough.
          if (!hasCachedLocation) {
            setNeedsManualLocation(true);
            setLocation(fallbackLocation);
          }
          setLoading(false);
          return;
        }
      }

      setPermissionDenied(false);
      AsyncStorage.removeItem('LOCATION_PROMPT_SKIPPED').catch(() => {});

      // Try getting a recent last known position first (super fast)
      let loc = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
      });
      if (!loc) {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Location timed out')), 4000)
        );
        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        loc = await Promise.race([positionPromise, timeoutPromise]);
      }

      if (!loc) {
        throw new Error('Location could not be fetched');
      }

      const city = await reverseGeocodeWithRetry(loc.coords.latitude, loc.coords.longitude);

      const finalLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        city,
      };

      setLocation(finalLocation);
      setIsFallbackLocation(false);
      setNeedsManualLocation(false);
      logLocationResult('granted', 'startup');

      const nowStr = Date.now().toString();
      SecureLocationStorage.setItem('LAST_GPS_LOCATION', JSON.stringify(finalLocation));
      AsyncStorage.setItem('LAST_GPS_UPDATE_TIME', nowStr);

      // Moved to a new region (or first fix): the calculation method may need to follow.
      const movedFar =
        !previousGps ||
        Math.abs(previousGps.latitude - finalLocation.latitude) > 0.5 ||
        Math.abs(previousGps.longitude - finalLocation.longitude) > 0.5;
      if (movedFar) {
        updateMethodForLocation(finalLocation.latitude, finalLocation.longitude).catch(() => {});
      }

    } catch (e) {
      // Location services off / timeout. With a cached location the user keeps it; only
      // someone with nothing at all is asked to choose a city.
      logLocationResult(e instanceof Error && e.message === 'Location timed out' ? 'timeout' : 'error', 'startup');
      setErrorMsg('Error fetching location');
      const hasSaved = !!(await SecureLocationStorage.getItem('LAST_GPS_LOCATION').catch(() => null));
      if (!hasSaved) setNeedsManualLocation(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
      setIsResolved(true);
    }
  }, []);

  useEffect(() => {
    initLocation();

    // Listen for AppState changes to trigger auto location scan if 12+ hours passed
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        initLocation(false);
      }
    });

    // Settings changed the saved location (city picked, or "use my location").
    const locationChanged = DeviceEventEmitter.addListener(
      LOCATION_CHANGED_EVENT,
      (payload?: { force?: boolean }) => {
        initLocation(!!payload?.force);
      }
    );

    return () => {
      subscription.remove();
      locationChanged.remove();
    };
  }, [initLocation]);

  const saveManualLocation = async (lat: number, lng: number, city: string) => {
    const locData = { latitude: lat, longitude: lng, city };
    await SecureLocationStorage.setItem('MANUAL_LOCATION', JSON.stringify(locData));
    setLocation(locData);
    setIsFallbackLocation(false);
    setNeedsManualLocation(false);
    setErrorMsg(null);
  };

  // A GPS-detected location (onboarding) is stored as a GPS fix, NOT as a manual choice:
  // MANUAL_LOCATION short-circuits initLocation forever, which froze travelers on the
  // city they were in during setup.
  const saveGpsLocation = async (lat: number, lng: number, city: string) => {
    const locData = { latitude: lat, longitude: lng, city };
    await SecureLocationStorage.removeItem('MANUAL_LOCATION');
    await SecureLocationStorage.setItem('LAST_GPS_LOCATION', JSON.stringify(locData));
    await AsyncStorage.setItem('LAST_GPS_UPDATE_TIME', Date.now().toString());
    setLocation(locData);
    setIsFallbackLocation(false);
    setNeedsManualLocation(false);
    setPermissionDenied(false);
    setErrorMsg(null);
  };

  // `force` (default) re-reads the location even if it is fresh and may ask for the permission;
  // refreshLocation(false) only re-evaluates the state (e.g. shows the "choose a city" banner
  // for someone who skipped location) without prompting.
  const refreshLocation = async (force: boolean = true) => {
    await initLocation(force);
  };

  return {
    location,
    errorMsg,
    loading,
    needsManualLocation,
    permissionDenied,
    isResolved,
    isFallbackLocation,
    saveManualLocation,
    saveGpsLocation,
    refreshLocation,
  };
};

