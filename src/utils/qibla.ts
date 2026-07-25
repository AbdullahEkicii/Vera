/**
 * Qibla calculation utility
 * Calculates the Qibla bearing from a given location to the Kaaba in Mecca.
 * 
 * Kaaba coordinates:
 * Latitude: 21.422487
 * Longitude: 39.826206
 */

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

/**
 * Calculates the angle of Qibla from true north in degrees.
 * 
 * @param latitude - User's latitude in decimal degrees
 * @param longitude - User's longitude in decimal degrees
 * @returns Qibla angle in degrees from 0 to 360
 */
export function getQiblaAngle(latitude: number, longitude: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const toDegrees = (radians: number) => radians * (180 / Math.PI);

  const phiK = toRadians(KAABA_LAT);
  const lambdaK = toRadians(KAABA_LNG);
  const phi = toRadians(latitude);
  const lambda = toRadians(longitude);

  const y = Math.sin(lambdaK - lambda);
  const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
  
  let qiblaAngle = Math.atan2(y, x);
  qiblaAngle = toDegrees(qiblaAngle);
  
  // Normalize to 0-360
  return (qiblaAngle + 360) % 360;
}

/**
 * Calculates the Haversine distance in kilometers from a location to the Kaaba.
 * 
 * @param latitude - User's latitude in decimal degrees
 * @param longitude - User's longitude in decimal degrees
 * @returns Distance in kilometers
 */
export function getDistanceToKaaba(latitude: number, longitude: number): number {
  const R = 6371; // Earth's radius in km
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(KAABA_LAT - latitude);
  const dLon = toRadians(KAABA_LNG - longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latitude)) * Math.cos(toRadians(KAABA_LAT)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
