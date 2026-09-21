// 한국관광공사 4대 Open API 통합 클라이언트 & 시·군·구 단위 지능형 캐싱 엔진
// 1. 국문 관광정보 서비스 (KorService2)
// 2. 무장애 여행 정보 서비스 (KorWithService2)
// 3. 의료관광정보 서비스 (MdclTursmService)
// 4. 웰니스관광정보 서비스 (WellnessTursmService)

const TOUR_API_KEY =
  import.meta.env.VITE_TOUR_API_KEY || "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7";

export interface UnifiedTourItem {
  id: string;
  sourceApi: "kor" | "barrierFree" | "medical" | "wellness";
  title: string;
  address: string;
  category: string;
  longitude: number;
  latitude: number;
  imageUrl?: string;
  tel?: string;
  distMeters?: number;
  contentTypeId?: string; // 39: 음식점, 12: 관광지, 14: 문화시설 등
  wellnessTheme?: string;
  barrierFreeFeatures?: string[];
}

export interface RegionalTourCollection {
  regionKey: string;
  restaurants: UnifiedTourItem[]; // 안심/일반 식당 (contentTypeId 39)
  trailsAndAttractions: UnifiedTourItem[]; // 산책로/관광지 (무장애 + 일반 + 웰니스)
  barrierFreePlaces: UnifiedTourItem[]; // 무장애 전용 여행지
  wellnessSpots: UnifiedTourItem[]; // 웰니스 테마 스팟
  medicalSpots: UnifiedTourItem[]; // 의료 관광 인프라
  fetchedAt: number;
}

// 메모리 LRU 캐시
const memoryCache = new Map<string, RegionalTourCollection>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24시간 유효

function getCacheKey(lat: number, lng: number): string {
  // 약 5~10km 단위 그리드 클러스터링을 위해 소수점 둘째 자리 반올림
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function loadFromCache(key: string): RegionalTourCollection | null {
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key)!;
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }
    memoryCache.delete(key);
  }

  try {
    const storageItem = localStorage.getItem(`vitalroot_tour_cache_${key}`);
    if (storageItem) {
      const parsed: RegionalTourCollection = JSON.parse(storageItem);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        memoryCache.set(key, parsed);
        return parsed;
      }
      localStorage.removeItem(`vitalroot_tour_cache_${key}`);
    }
  } catch {}

  return null;
}

function saveToCache(key: string, data: RegionalTourCollection): void {
  memoryCache.set(key, data);
  try {
    localStorage.setItem(`vitalroot_tour_cache_${key}`, JSON.stringify(data));
  } catch {}
}

/**
 * 1. 국문 관광정보 서비스 (KorService2)
 * contentTypeId: 39 (음식점), 12 (관광지), 14 (문화시설)
 */
export async function fetchKorTourPlaces(
  lng: number,
  lat: number,
  radius: number = 8000,
  contentTypeId: string = "39",
  numOfRows: number = 15
): Promise<UnifiedTourItem[]> {
  try {
    const query = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      contentTypeId,
    });

    const res = await fetch(`https://apis.data.go.kr/B551011/KorService2/locationBasedList2?${query.toString()}`);
    if (!res.ok) throw new Error(`KorService2 HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.mapx && it.mapy && it.title)
      .map((it: any) => ({
        id: `kor-${it.contentid}`,
        sourceApi: "kor" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: it.addr1 ? it.addr1.trim() : "",
        category: contentTypeId === "39" ? "음식점" : "관광명소",
        longitude: parseFloat(it.mapx),
        latitude: parseFloat(it.mapy),
        imageUrl: it.firstimage || it.firstimage2 || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
        contentTypeId: it.contenttypeid,
      }));
  } catch (err) {
    console.warn("[tourApi] KorService2 fetch error:", err);
    return [];
  }
}

/**
 * 2. 무장애 여행 정보 서비스 (KorWithService2)
 * 휠체어/유모차 진입 가능, 무장애 편의시설 보유 스팟
 */
export async function fetchBarrierFreePlaces(
  lng: number,
  lat: number,
  radius: number = 10000,
  numOfRows: number = 15
): Promise<UnifiedTourItem[]> {
  try {
    const query = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
    });

    const res = await fetch(`https://apis.data.go.kr/B551011/KorWithService2/locationBasedList2?${query.toString()}`);
    if (!res.ok) throw new Error(`KorWithService2 HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.mapx && it.mapy && it.title)
      .map((it: any) => ({
        id: `barrier-${it.contentid}`,
        sourceApi: "barrierFree" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: it.addr1 ? it.addr1.trim() : "",
        category: "무장애 산책로/명소",
        longitude: parseFloat(it.mapx),
        latitude: parseFloat(it.mapy),
        imageUrl: it.firstimage || it.firstimage2 || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
        barrierFreeFeatures: ["무장애 보행로", "휠체어·어르신 안심"],
      }));
  } catch (err) {
    console.warn("[tourApi] KorWithService2 fetch error:", err);
    return [];
  }
}

/**
 * 3. 의료관광정보 서비스 (MdclTursmService)
 * langDivCd=KOR 필수
 */
export async function fetchMedicalTourPlaces(
  lng: number,
  lat: number,
  radius: number = 15000,
  numOfRows: number = 10
): Promise<UnifiedTourItem[]> {
  try {
    const query = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      langDivCd: "KOR",
    });

    const res = await fetch(`https://apis.data.go.kr/B551011/MdclTursmService/locationBasedList?${query.toString()}`);
    if (!res.ok) throw new Error(`MdclTursmService HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.mapX && it.mapY && it.title)
      .map((it: any) => ({
        id: `med-${it.contentId}`,
        sourceApi: "medical" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: it.baseAddr ? it.baseAddr.trim() : "",
        category: "의료·헬스케어 인프라",
        longitude: parseFloat(it.mapX),
        latitude: parseFloat(it.mapY),
        imageUrl: it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
      }));
  } catch (err) {
    console.warn("[tourApi] MdclTursmService fetch error:", err);
    return [];
  }
}

/**
 * 4. 웰니스관광정보 서비스 (WellnessTursmService)
 * langDivCd=KOR 필수
 */
export async function fetchWellnessTourPlaces(
  lng: number,
  lat: number,
  radius: number = 20000,
  numOfRows: number = 10
): Promise<UnifiedTourItem[]> {
  try {
    const query = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      langDivCd: "KOR",
    });

    const res = await fetch(`https://apis.data.go.kr/B551011/WellnessTursmService/locationBasedList?${query.toString()}`);
    if (!res.ok) throw new Error(`WellnessTursmService HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.mapX && it.mapY && it.title)
      .map((it: any) => ({
        id: `wellness-${it.contentId}`,
        sourceApi: "wellness" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: it.baseAddr ? it.baseAddr.trim() : "",
        category: "웰니스 치유 스팟",
        longitude: parseFloat(it.mapX),
        latitude: parseFloat(it.mapY),
        imageUrl: it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
        wellnessTheme: it.wellnessThemaCd,
      }));
  } catch (err) {
    console.warn("[tourApi] WellnessTursmService fetch error:", err);
    return [];
  }
}

/**
 * 4대 Tour API 병렬 조회 & 시·군·구 단위 지능형 종합 컬렉션 반환
 */
export async function fetchComprehensiveRegionalTourData(
  lat: number,
  lng: number
): Promise<RegionalTourCollection> {
  const cacheKey = getCacheKey(lat, lng);
  const cached = loadFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 4대 API 병렬 호출 (일부 API 실패 시에도 가용한 데이터 최대한 수집)
  const [restaurantsResult, attractionsResult, barrierFreeResult, medicalResult, wellnessResult] =
    await Promise.allSettled([
      fetchKorTourPlaces(lng, lat, 10000, "39", 15), // 음식점
      fetchKorTourPlaces(lng, lat, 15000, "12", 15), // 일반 관광지
      fetchBarrierFreePlaces(lng, lat, 15000, 15),   // 무장애 명소
      fetchMedicalTourPlaces(lng, lat, 20000, 10),   // 의료 시설
      fetchWellnessTourPlaces(lng, lat, 25000, 10),  // 웰니스 치유지
    ]);

  const restaurants = restaurantsResult.status === "fulfilled" ? restaurantsResult.value : [];
  const attractions = attractionsResult.status === "fulfilled" ? attractionsResult.value : [];
  const barrierFree = barrierFreeResult.status === "fulfilled" ? barrierFreeResult.value : [];
  const medical = medicalResult.status === "fulfilled" ? medicalResult.value : [];
  const wellness = wellnessResult.status === "fulfilled" ? wellnessResult.value : [];

  // 산책로/명소 목록 통합 (무장애 ➔ 웰니스 ➔ 일반 관광지 순)
  const trailsAndAttractions: UnifiedTourItem[] = [
    ...barrierFree,
    ...wellness,
    ...attractions,
  ];

  const collection: RegionalTourCollection = {
    regionKey: cacheKey,
    restaurants,
    trailsAndAttractions,
    barrierFreePlaces: barrierFree,
    wellnessSpots: wellness,
    medicalSpots: medical,
    fetchedAt: Date.now(),
  };

  saveToCache(cacheKey, collection);
  return collection;
}
