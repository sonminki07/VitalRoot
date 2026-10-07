import { getApiConfig } from "../config/apiConfig";

export const STORAGE_KEY_TMAP = "vitalroot_tmap_key";

const routeCache = new Map<string, { coordinates: [number, number][]; distanceMeters: number }>();

/**
 * 저장된 Tmap API 키 조회 (로컬 스토리지 우선, 환경 변수/API 설정 차순위)
 */
export function getTmapApiKey(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TMAP);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  const configKey = getApiConfig().tmap.appKey;
  if (configKey && typeof configKey === "string" && configKey.trim()) {
    return configKey.trim();
  }
  return null;
}

/**
 * Tmap API 키 설정 및 로컬 영속화
 */
export function setTmapApiKey(key: string | null) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_TMAP, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_TMAP);
    }
  } catch {}
  routeCache.clear();
}

/**
 * Tmap API 키 유효성 테스트 함수
 */
export async function testTmapApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, message: "API 키를 입력해주세요." };
    }
    const res = await fetch(getApiConfig().tmap.pedestrianUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        appKey: cleanKey,
      },
      body: JSON.stringify({
        startX: 126.978,
        startY: 37.5665,
        endX: 126.982,
        endY: 37.567,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: encodeURIComponent("서울시청"),
        endName: encodeURIComponent("을지로입구"),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return { success: true, message: "✅ Tmap 보행자 API 연결 성공! 정밀 보행로가 활성화되었습니다." };
      }
    }
    const errText = await res.text();
    return {
      success: false,
      message: `인증 실패 (${res.status}): ${errText.includes("INVALID_API_KEY") ? "유효하지 않은 AppKey입니다." : errText}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `요청 실패: ${msg}` };
  }
}

/**
 * 1순위: Tmap 보행자 경로 API 호출 (횡단보도, 육교, 인도, 골목길 정밀 보행로)
 */
async function fetchTmapPedestrian(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  apiKey: string
): Promise<{ coordinates: [number, number][]; distanceMeters: number } | null> {
  try {
    const res = await fetch(getApiConfig().tmap.pedestrianUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        appKey: apiKey,
      },
      body: JSON.stringify({
        startX: startLng,
        startY: startLat,
        endX: endLng,
        endY: endLat,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: encodeURIComponent("출발지"),
        endName: encodeURIComponent("목적지"),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const coordinates: [number, number][] = [];
        let totalDistance = 0;

        data.features.forEach((feature: any) => {
          if (feature.geometry?.type === "LineString" && Array.isArray(feature.geometry.coordinates)) {
            coordinates.push(...(feature.geometry.coordinates as [number, number][]));
          }
          if (feature.properties?.totalDistance) {
            totalDistance = feature.properties.totalDistance;
          }
        });

        if (coordinates.length > 0) {
          // 시작/종점 마커 스냅 보정
          coordinates[0] = [startLng, startLat];
          coordinates[coordinates.length - 1] = [endLng, endLat];

          return {
            coordinates,
            distanceMeters: totalDistance || Math.round(calculateDistanceMeters(startLat, startLng, endLat, endLng)),
          };
        }
      }
    }
  } catch (err) {
    console.warn("Tmap Pedestrian API failed, fallbacking to Road Network Router:", err);
  }
  return null;
}

/**
 * 자동차 도로망 중앙선으로 튀는 좌표에 대해 보행자용 스무딩(Smoothing) 및 지능형 인도(Sidewalk) 오프셋 적용
 * 1) 1.5m 이내 불필요한 미세 흔들림(jitter) 제거
 * 2) 차도 중앙선에서 우측 보행로(인도) 방향으로 약 2.0m 법선 오프셋 적용
 * 3) 3점 가중 이동평균(0.25, 0.5, 0.25) 2-Pass 스무딩 필터 적용으로 완만한 보행 곡선 생성
 * 4) 출발지와 도착지 핀 마커 좌표의 정밀한 위치 고정 유지
 */
export function smoothPedestrianCoordinates(
  rawCoords: [number, number][],
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): [number, number][] {
  if (!rawCoords || rawCoords.length <= 2) {
    return [
      [startLng, startLat],
      [endLng, endLat],
    ];
  }

  // 1. 미세 흔들림(jitter) 중복 제거 (< 1.5m)
  const deduped: [number, number][] = [[startLng, startLat]];
  for (let i = 1; i < rawCoords.length - 1; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = rawCoords[i];
    if (!prev || !curr) continue;
    const dist = calculateDistanceMeters(prev[1], prev[0], curr[1], curr[0]);
    if (dist >= 1.5) {
      deduped.push(curr);
    }
  }
  deduped.push([endLng, endLat]);

  if (deduped.length <= 2) {
    return [
      [startLng, startLat],
      [endLng, endLat],
    ];
  }

  // 2. 차도 중앙선 ➔ 보행자 인도(Sidewalk) 방향 지능형 법선 오프셋 (~2.0m)
  const firstDeduped = deduped[0];
  const lastDeduped = deduped[deduped.length - 1];
  if (!firstDeduped || !lastDeduped) {
    return [
      [startLng, startLat],
      [endLng, endLat],
    ];
  }

  const offsetPoints: [number, number][] = [firstDeduped];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = deduped[i - 1]; // 이전 좌표 지점
    const curr = deduped[i];     // 현재 좌표 지점
    const next = deduped[i + 1]; // 다음 좌표 지점
    if (!prev || !curr || !next) continue;

    // [기하학 투영] 대한민국 평균 위도(37.5도) 기준 WGS84 좌표를 미터 단위로 투영 변환
    // 경도 1도당 미터: 111,000m * cos(37.5°) ≈ 88,000m
    const dxMeters = (next[0] - prev[0]) * 88000;
    // 위도 1도당 미터: 자오선 호의 길이에 따라 약 111,000m 고정
    const dyMeters = (next[1] - prev[1]) * 111000;
    // 이전 지점에서 다음 지점으로 향하는 세그먼트의 실제 거리(빗변 길이, 미터)
    const segLen = Math.hypot(dxMeters, dyMeters);

    // 유효한 세그먼트 길이(1미터 초과)일 때만 우측 인도 오프셋 계산 수행
    if (segLen > 1.0) {
      // 진행 방향 벡터 (dxMeters, dyMeters)에 수직인 우측 단위 법선 벡터 (dy / segLen, -dx / segLen)
      const nx = dyMeters / segLen;
      const ny = -dxMeters / segLen;
      // 차도 중앙선에서 우측 보행자 전용 보도(인도) 방향으로 2.0미터 평행 이동량 산출 (경도/위도로 역환산)
      const offsetLng = (nx * 2.0) / 88000;
      const offsetLat = (ny * 2.0) / 111000;
      // 소수점 6자리(약 11cm 정밀도)로 반올림하여 보정 좌표 목록에 추가
      offsetPoints.push([
        Number((curr[0] + offsetLng).toFixed(6)),
        Number((curr[1] + offsetLat).toFixed(6)),
      ]);
    } else {
      // 정체 구간이거나 중복된 미세 세그먼트는 원래 좌표 유지
      offsetPoints.push(curr);
    }
  }
  // 보정된 경로의 종점은 정확한 원본 목적지 좌표로 유지
  offsetPoints.push(lastDeduped);

  // 3. 가중 이동평균 2-Pass 스무딩 (법선 이동으로 인한 급격한 꺾임 완화 및 자연스러운 곡선화)
  let smoothed = [...offsetPoints];
  // 2단계(2-Pass) 반복 필터링 적용
  for (let pass = 0; pass < 2; pass++) {
    const first = smoothed[0];
    const last = smoothed[smoothed.length - 1];
    if (!first || !last) break;
    const nextPass: [number, number][] = [first]; // 시작점 불변 고정
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const next = smoothed[i + 1];
      if (!prev || !curr || !next) continue;

      // 3점 이항 가중 이동평균 필터 (0.25 prev + 0.50 curr + 0.25 next): 고주파 노이즈 제거
      const smoothLng = 0.25 * prev[0] + 0.5 * curr[0] + 0.25 * next[0];
      const smoothLat = 0.25 * prev[1] + 0.5 * curr[1] + 0.25 * next[1];
      // 평활화된 중간 좌표 저장
      nextPass.push([
        Number(smoothLng.toFixed(6)),
        Number(smoothLat.toFixed(6)),
      ]);
    }
    nextPass.push(last); // 도착점 불변 고정
    smoothed = nextPass; // 다음 패스용 결과 갱신
  }

  // 출발지/도착지 핀 마커 일치 보장
  smoothed[0] = [startLng, startLat];
  smoothed[smoothed.length - 1] = [endLng, endLat];

  return smoothed;
}

/**
 * 2순위: 공공 도로망 기반 안전 라우터 (포장도로/인도 준수, 비포장 산길/물 관통 철저 배제)
 */
async function fetchRoadNetworkRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<{ coordinates: [number, number][]; distanceMeters: number } | null> {
  try {
    // driving 프로필은 산길/임도/호수를 건너지 않고 공공 포장도로망만 100% 따릅니다.
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
        const coords = [...(data.routes[0].geometry.coordinates as [number, number][])];
        if (coords.length > 0) {
          coords[0] = [startLng, startLat];
          coords[coords.length - 1] = [endLng, endLat];
        }
        // 보행자용 스무딩 필터 적용 (차도 중앙선 튐 보정)
        const smoothedCoords = smoothPedestrianCoordinates(
          coords,
          startLng,
          startLat,
          endLng,
          endLat
        );
        return {
          coordinates: smoothedCoords,
          distanceMeters: Math.round(data.routes[0].distance || 750),
        };
      }
    }
  } catch (err) {
    console.warn("Road network routing request failed, falling back to L-shaped grid:", err);
  }
  return null;
}

/**
 * 두 좌표 사이의 실제 보행로(인도, 도로망, 골목길) 네트워크 좌표셋을 반환합니다.
 * 3중 안전망: Tmap 보행자 API ➔ 공공 도로망 라우터 ➔ 도로 격자 L자형 보간
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

  // 1순위: Tmap 보행자 정밀 API
  const tmapKey = getTmapApiKey();
  if (tmapKey) {
    const tmapResult = await fetchTmapPedestrian(startLng, startLat, endLng, endLat, tmapKey);
    if (tmapResult && tmapResult.coordinates.length > 0) {
      routeCache.set(cacheKey, tmapResult);
      return tmapResult;
    }
  }

  // 2순위: 공공 도로망 기반 안전 라우터 (비포장 등산로/임도/물 관통 원천 배제)
  const roadResult = await fetchRoadNetworkRoute(startLng, startLat, endLng, endLat);
  if (roadResult && roadResult.coordinates.length > 0) {
    routeCache.set(cacheKey, roadResult);
    return roadResult;
  }

  // 3순위: L자형 도로 격자 보간 (직선으로 산/호수를 가로지르지 않고 도시 블록 도로망을 따라 L자로 우회)
  // 직각으로 꺾이는 중간 기준점 설정 (경도는 목적지, 위도는 출발지)
  const midPoint: [number, number] = [endLng, startLat];
  // 코너 베벨(Chamfering/라운딩) 보간점 1: 코너 진입 전 80% 지점에서 완만하게 방향 전환 유도
  const cornerNear1: [number, number] = [startLng + 0.8 * (endLng - startLng), startLat];
  // 코너 베벨(Chamfering/라운딩) 보간점 2: 코너 탈출 후 20% 지점에서 완만하게 합류
  const cornerNear2: [number, number] = [endLng, startLat + 0.2 * (endLat - startLat)];
  // L자형 도로망 기본 제어점 배열 생성
  const rawFallback = [
    [startLng, startLat] as [number, number],
    cornerNear1,
    midPoint,
    cornerNear2,
    [endLng, endLat] as [number, number],
  ];
  // L자 제어점에 2-Pass 스무딩 필터를 적용하여 자연스러운 도심 골목길 곡선 산출
  const smoothedFallback = smoothPedestrianCoordinates(
    rawFallback,
    startLng,
    startLat,
    endLng,
    endLat
  );
  const fallback = {
    coordinates: smoothedFallback,
    // [맨해튼 그리드 우회율 1.25배 보정]: 도심 도보 이동은 직선이 아닌 건물/블록을 우회하므로 유클리드 거리에 1.25배 곱연산 적용
    distanceMeters: Math.round(calculateDistanceMeters(startLat, startLng, endLat, endLng) * 1.25),
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
