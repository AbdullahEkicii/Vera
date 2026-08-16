import { Linking, Platform } from 'react-native';

export interface MosqueItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceFormatted: string;
  address?: string;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export const fetchNearbyMosques = async (latitude: number, longitude: number, radiusMeters = 5000): Promise<MosqueItem[]> => {
  try {
    const query = `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude}););out center;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'VeraApp/1.0 (Mobile; Android)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    const mosques: MosqueItem[] = elements.map((elem: any) => {
      const lat = elem.lat || elem.center?.lat;
      const lng = elem.lon || elem.center?.lon;
      const dist = calculateDistanceMeters(latitude, longitude, lat, lng);
      const name = elem.tags?.name || elem.tags?.['name:tr'] || elem.tags?.['name:en'] || 'Cami / Mosque';
      const street = elem.tags?.['addr:street'] || '';
      const suburb = elem.tags?.['addr:suburb'] || elem.tags?.['addr:district'] || '';
      const address = [street, suburb].filter(Boolean).join(', ') || undefined;

      return {
        id: elem.id.toString(),
        name,
        lat,
        lng,
        distanceMeters: dist,
        distanceFormatted: formatDistance(dist),
        address,
      };
    });

    // Sort by nearest first
    mosques.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return mosques;
  } catch (error) {
    console.warn('Error fetching nearby mosques from Overpass, using fallback:', error);
    // Fallback: return common nearby mosque search
    return [];
  }
};

export const openMapDirections = (latitude: number, longitude: number, label: string) => {
  const scheme = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label)}@${latitude},${longitude}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`,
  });

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(label)}`;

  if (scheme) {
    Linking.canOpenURL(scheme).then((supported) => {
      if (supported) {
        Linking.openURL(scheme);
      } else {
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Linking.openURL(webUrl);
    });
  } else {
    Linking.openURL(webUrl);
  }
};
