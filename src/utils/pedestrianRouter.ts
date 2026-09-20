// OSRM 기반 도보 실제 도로망 라우팅 및 거리 연산 유틸리티

const routeCache = new Map<string, { coordinates: [number, number][]; distanceMeters: number }>();

/**
 * 두 좌표 사이의 실제 보행로(인도, 골목, 계단, 데크길) 네트워크 좌표셋을 반환합니다.
 */
export async function fetchPedestrianRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<{ coordinates: [number, number][]; distanceMeters: number }> {
  const cacheKey = `${startLng.toFixed(5)},${startLat.toFixed(5)};${endLng.toFixed(5)},${endLat.toFixed(5)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
        const result = {
          coordinates: data.routes[0].geometry.coordinates as [number, number][],
          distanceMeters: Math.round(data.routes[0].distance || 750),
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("Pedestrian routing request failed, falling back to straight segment:", err);
  }

  // Fallback: 3구간 완만 보간
  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;
  const fallback = {
    coordinates: [
      [startLng, startLat] as [number, number],
      [midLng, midLat] as [number, number],
      [endLng, endLat] as [number, number],
    ],
    distanceMeters: Math.round(calculateDistanceMeters(startLat, startLng, endLat, endLng)),
  };
  return fallback;
}

/**
 * Haversine 공식을 사용한 두 지점 간 직선 거리(m) 계산
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
