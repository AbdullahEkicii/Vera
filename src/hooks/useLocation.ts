import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../localization/i18n';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

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
  } catch (e) {}

  return { latitude: 41.0082, longitude: 28.9784, city: 'İstanbul' };
};

async function reverseGeocodeWithRetry(latitude: number, longitude: number, retries = 2, delayMs = 1000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
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
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return i18n.t('home.currentLocation', 'Current Location');
}

export const useLocation = () => {
  const fallbackLocation = getSystemFallbackLocation();
  const [location, setLocation] = useState<LocationData>(fallbackLocation);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Non-blocking initial state!
  const [needsManualLocation, setNeedsManualLocation] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const initLocation = useCallback(async () => {
    try {
      // 1. Check if user has manually set a location
      const savedLocationStr = await AsyncStorage.getItem('MANUAL_LOCATION');
      if (savedLocationStr) {
        const savedLocation: LocationData = JSON.parse(savedLocationStr);
        setLocation(savedLocation);
        setNeedsManualLocation(false);
        setPermissionDenied(false);
        setLoading(false);
        return;
      }

      // 1.5 Check if we have a cached GPS location from a previous launch
      const cachedGpsStr = await AsyncStorage.getItem('LAST_GPS_LOCATION');
      if (cachedGpsStr) {
        const cachedGps: LocationData = JSON.parse(cachedGpsStr);
        setLocation(cachedGps);
        setNeedsManualLocation(false);
        setPermissionDenied(false);
        setLoading(false);
      }

      // 2. Check if foreground permission is already granted without blocking
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // We will let the onboarding or UI ask for permission smoothly
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setPermissionDenied(true);
          setNeedsManualLocation(true);
          setLocation(fallbackLocation);
          setLoading(false);
          return;
        }
      }

      setPermissionDenied(false);

      // Try getting last known position first (super fast)
      let loc = await Location.getLastKnownPositionAsync({});
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
      setNeedsManualLocation(false);
      
      AsyncStorage.setItem('LAST_GPS_LOCATION', JSON.stringify(finalLocation));

    } catch (e) {
      setErrorMsg('Error fetching location');
      setNeedsManualLocation(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initLocation();
  }, [initLocation]);

  const saveManualLocation = async (lat: number, lng: number, city: string) => {
    const locData = { latitude: lat, longitude: lng, city };
    await AsyncStorage.setItem('MANUAL_LOCATION', JSON.stringify(locData));
    setLocation(locData);
    setNeedsManualLocation(false);
    setErrorMsg(null);
  };

  const refreshLocation = async () => {
    await initLocation();
  };

  return {
    location,
    errorMsg,
    loading,
    needsManualLocation,
    permissionDenied,
    saveManualLocation,
    refreshLocation,
  };
};

