import { LatLng, PresenceConfidence } from './schema'

/**
 * Bounding box for fast-rejection before ray-casting.
 */
export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Computes the axis-aligned bounding box of a polygon.
 */
export function getBoundingBox(polygon: LatLng[]): BoundingBox {
  if (polygon.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 }
  }

  let minLat = polygon[0].lat
  let maxLat = polygon[0].lat
  let minLng = polygon[0].lng
  let maxLng = polygon[0].lng

  for (let i = 1; i < polygon.length; i++) {
    const pt = polygon[i]
    if (pt.lat < minLat) minLat = pt.lat
    if (pt.lat > maxLat) maxLat = pt.lat
    if (pt.lng < minLng) minLng = pt.lng
    if (pt.lng > maxLng) maxLng = pt.lng
  }

  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Standard Ray-Casting algorithm to verify if a geographic coordinate (lat, lng)
 * lies inside a closed 2D polygon.
 * 
 * Source of truth: documents/PLAN.md §5.1, documents/DESIGN.MD §7
 * 
 * Rules:
 * - A polygon must have >= 3 vertices.
 * - Cast a horizontal ray from point (lat, lng) towards positive lng infinity.
 * - Each edge intersection toggles inside/outside state.
 * - Odd intersections = inside (true), even intersections = outside (false).
 * - Fast bounding-box rejection applied first.
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (!polygon || polygon.length < 3) {
    return false
  }

  const { lat, lng } = point
  const bbox = getBoundingBox(polygon)

  // Fast bounding-box pre-check
  if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) {
    return false
  }

  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    // Exact vertex match check
    if (yi === lat && xi === lng) {
      return true
    }

    // Check if horizontal ray crosses edge (yi, xi) to (yj, xj)
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Computes confidence level based on device GPS accuracy in meters.
 * Source of truth: documents/PLAN.md §5.1
 * 
 * - < 30m: high
 * - 30m to 100m: medium
 * - > 100m: low (shows warning in UI)
 * - Campus IP network agreement boosts confidence to high
 */
export function calculateConfidence(
  accuracyMeters?: number | null,
  ipOnCampus?: boolean
): PresenceConfidence {
  if (ipOnCampus && (accuracyMeters === undefined || accuracyMeters === null || accuracyMeters <= 100)) {
    return 'high'
  }
  if (accuracyMeters === undefined || accuracyMeters === null || accuracyMeters < 0) {
    return 'medium'
  }
  if (accuracyMeters < 30) {
    return 'high'
  }
  if (accuracyMeters <= 100) {
    return 'medium'
  }
  return 'low'
}


/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula).
 * Useful for campus boundary distance evaluation.
 */
export function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (p1.lat * Math.PI) / 180
  const phi2 = (p2.lat * Math.PI) / 180
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
