import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

async function reverseGeocodeWithRetry(latitude: number, longitude: number, retries = 3, delayMs = 1500): Promise<string> {
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
      console.warn(`Reverse geocode attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return 'Mevcut Konum';
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsManualLocation, setNeedsManualLocation] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 1. Check if user has manually set a location
        const savedLocationStr = await AsyncStorage.getItem('MANUAL_LOCATION');
        if (savedLocationStr) {
          const savedLocation: LocationData = JSON.parse(savedLocationStr);
          setLocation(savedLocation);
          setLoading(false);
          return;
        }

        // 2. No manual location, try GPS
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setNeedsManualLocation(true);
          setLoading(false);
          return;
        }

        // Try getting last known position first (instant and robust)
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          // If no cached location, get high-speed balanced accuracy current position (works indoors) with a 6-second timeout
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

        // Show generic Mevcut Konum first while geocoding in background
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          city: 'Mevcut Konum',
        });

        const city = await reverseGeocodeWithRetry(loc.coords.latitude, loc.coords.longitude);

        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          city,
        });
      } catch (e) {
        setErrorMsg('Error fetching location');
        setNeedsManualLocation(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveManualLocation = async (lat: number, lng: number, city: string) => {
    const locData = { latitude: lat, longitude: lng, city };
    await AsyncStorage.setItem('MANUAL_LOCATION', JSON.stringify(locData));
    setLocation(locData);
    setNeedsManualLocation(false);
    setErrorMsg(null);
  };

  return { location, errorMsg, loading, needsManualLocation, saveManualLocation };
};
