/**
 * Geospatial utility functions for GPS positioning, Haversine distance,
 * and perimeter validation matching the backend calculation.
 */

const EARTH_RADIUS_METERS = 6371000.0;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Computes great-circle distance between two GPS coordinates in meters.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * (Math.sin(deltaLambda / 2.0) ** 2);

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Format meters for clean UI display.
 */
export function formatDistance(meters) {
  if (meters == null) return '--';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Standard High-Accuracy GPS Options for browsers
 */
export const HIGH_ACCURACY_GPS_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};
