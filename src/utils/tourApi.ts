// 한국관광공사 4대 Open API 통합 클라이언트 & 시·군·구 단위 지능형 캐싱 엔진
// 1. 국문 관광정보 서비스_GW (KorService2)
// 2. 무장애 여행 정보 서비스 (KorWithService2)
// 3. 의료관광정보 서비스 (MdclTursmService)
// 4. 웰니스관광정보 서비스 (WellnessTursmService)

import { getApiConfig } from "../config/apiConfig";

function getTourConfig() {
  return getApiConfig().tourApi;
}

export interface BarrierFreeDetail {
  contentId: string;
  parking?: string;
  route?: string;
  publicTransport?: string;
  ticketOffice?: string;
  promotion?: string;
  wheelchair?: string;
  exit?: string;
  elevator?: string;
  restroom?: string;
  brailleBlock?: string;
  helpDog?: string;
  guideHuman?: string;
  audioGuide?: string;
  stroller?: string;
  lactationRoom?: string;
}

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
  lclsSystm1?: string;
  lclsSystm2?: string;
  lclsSystm3?: string;
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

// 웰니스 테마 코드 한글 변환
export function getWellnessThemeName(code?: string): string {
  switch (code) {
    case "EX050100":
      return "온천/스파";
    case "EX050200":
      return "찜질방";
    case "EX050300":
      return "한방 체험";
    case "EX050400":
      return "힐링 명상";
    case "EX050500":
      return "뷰티 스파";
    case "EX050600":
      return "기타 웰니스";
    case "EX050700":
      return "자연 치유";
    default:
      return "웰니스 치유 스팟";
  }
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
 * 신분류체계 (lclsSystm1/2/3) 파라미터 선택적 연동
 * arrange: 'E' (거리순, 기본), 'C' (수정일순), 'A' (제목순)
 */
export async function fetchKorTourPlaces(
  lng: number,
  lat: number,
  radius: number = 8000,
  contentTypeId: string = "39",
  numOfRows: number = 15,
  classification?: { lclsSystm1?: string; lclsSystm2?: string; lclsSystm3?: string },
  arrange: string = "E"
): Promise<UnifiedTourItem[]> {
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      contentTypeId,
      arrange,
    });

    if (classification?.lclsSystm1) query.set("lclsSystm1", classification.lclsSystm1);
    if (classification?.lclsSystm2) query.set("lclsSystm2", classification.lclsSystm2);
    if (classification?.lclsSystm3) query.set("lclsSystm3", classification.lclsSystm3);

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.kor}/locationBasedList2?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) throw new Error(`KorService2 HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => (it.mapx || it.mapX) && (it.mapy || it.mapY) && it.title)
      .map((it: any) => ({
        id: `kor-${it.contentid || it.contentId}`,
        sourceApi: "kor" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.addr1 || it.baseAddr || "").trim(),
        category: contentTypeId === "39" ? "음식점" : "관광명소",
        longitude: parseFloat(it.mapx || it.mapX),
        latitude: parseFloat(it.mapy || it.mapY),
        imageUrl: it.firstimage || it.firstimage2 || it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
        contentTypeId: it.contenttypeid || it.contentTypeId,
        lclsSystm1: it.lclsSystm1,
        lclsSystm2: it.lclsSystm2,
        lclsSystm3: it.lclsSystm3,
      }));
  } catch (err) {
    console.warn("[tourApi] KorService2 fetch error:", err);
    return [];
  }
}

/**
 * 1-1. 국문 관광정보 키워드 검색 (KorService2/searchKeyword2)
 */
export async function searchKorTourPlaces(
  keyword: string,
  numOfRows: number = 10,
  contentTypeId?: string
): Promise<UnifiedTourItem[]> {
  const clean = keyword.trim();
  if (!clean) return [];
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      keyword: clean,
      arrange: "A",
    });
    if (contentTypeId) query.set("contentTypeId", contentTypeId);

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.kor}/searchKeyword2?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.title)
      .map((it: any) => ({
        id: `kor-${it.contentid || it.contentId}`,
        sourceApi: "kor" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.addr1 || it.baseAddr || "").trim(),
        category: (it.contenttypeid || it.contentTypeId) === "39" ? "음식점" : "관광명소",
        longitude: parseFloat(it.mapx || it.mapX || "0"),
        latitude: parseFloat(it.mapy || it.mapY || "0"),
        imageUrl: it.firstimage || it.firstimage2 || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        contentTypeId: it.contenttypeid || it.contentTypeId,
      }));
  } catch (err) {
    console.warn("[tourApi] KorService2 search error:", err);
    return [];
  }
}

/**
 * 2. 무장애 여행 정보 서비스 (KorWithService2)
 * 휠체어/유모차 진입 가능, 무장애 편의시설 보유 스팟
 * arrange: 'E' (거리순, 기본), 'C' (수정일순)
 */
export async function fetchBarrierFreePlaces(
  lng: number,
  lat: number,
  radius: number = 10000,
  numOfRows: number = 15,
  arrange: string = "E"
): Promise<UnifiedTourItem[]> {
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      arrange,
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.barrierFree}/locationBasedList2?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) throw new Error(`KorWithService2 HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => (it.mapx || it.mapX) && (it.mapy || it.mapY) && it.title)
      .map((it: any) => ({
        id: `barrier-${it.contentid || it.contentId}`,
        sourceApi: "barrierFree" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.addr1 || it.baseAddr || "").trim(),
        category: "무장애 산책로/명소",
        longitude: parseFloat(it.mapx || it.mapX),
        latitude: parseFloat(it.mapy || it.mapY),
        imageUrl: it.firstimage || it.firstimage2 || it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
        barrierFreeFeatures: ["무장애 보행로", "휠체어·어르신 안심"],
        contentTypeId: it.contenttypeid || it.contentTypeId,
        lclsSystm1: it.lclsSystm1,
        lclsSystm2: it.lclsSystm2,
        lclsSystm3: it.lclsSystm3,
      }));
  } catch (err) {
    console.warn("[tourApi] KorWithService2 fetch error:", err);
    return [];
  }
}

/**
 * 2-1. 무장애 상세 편의시설 조회 (KorWithService2/detailWithTour2)
 * 휠체어, 점자블록, 엘리베이터, 보조견 동반, 주차시설 등 상세 조회
 */
export async function fetchBarrierFreeDetail(contentId: string): Promise<BarrierFreeDetail | null> {
  try {
    const tourConfig = getTourConfig();
    const cleanId = contentId.replace(/^[a-z]+-/, "");
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: "1",
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      contentId: cleanId,
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.barrierFree}/detailWithTour2?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawItem = data?.response?.body?.items?.item;
    const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
    if (!item) return null;

    return {
      contentId: cleanId,
      parking: item.parking || undefined,
      route: item.route || undefined,
      publicTransport: item.publictransport || undefined,
      ticketOffice: item.ticketoffice || undefined,
      promotion: item.promotion || undefined,
      wheelchair: item.wheelchair || undefined,
      exit: item.exit || undefined,
      elevator: item.elevator || undefined,
      restroom: item.restroom || undefined,
      brailleBlock: item.braileblock || undefined,
      helpDog: item.helpdog || undefined,
      guideHuman: item.guidehuman || undefined,
      audioGuide: item.audioguide || undefined,
      stroller: item.stroller || undefined,
      lactationRoom: item.lactationroom || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 2-2. 무장애 여행 키워드 검색 (KorWithService2/searchKeyword2)
 */
export async function searchBarrierFreePlaces(
  keyword: string,
  numOfRows: number = 10
): Promise<UnifiedTourItem[]> {
  const clean = keyword.trim();
  if (!clean) return [];
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      keyword: clean,
      arrange: "A",
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.barrierFree}/searchKeyword2?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.title)
      .map((it: any) => ({
        id: `barrier-${it.contentid || it.contentId}`,
        sourceApi: "barrierFree" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.addr1 || it.baseAddr || "").trim(),
        category: "무장애 산책로/명소",
        longitude: parseFloat(it.mapx || it.mapX || "0"),
        latitude: parseFloat(it.mapy || it.mapY || "0"),
        imageUrl: it.firstimage || it.firstimage2 || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        barrierFreeFeatures: ["무장애 보행로", "휠체어·어르신 안심"],
        contentTypeId: it.contenttypeid || it.contentTypeId,
      }));
  } catch (err) {
    console.warn("[tourApi] KorWithService2 search error:", err);
    return [];
  }
}

/**
 * 3. 의료관광정보 서비스 (MdclTursmService)
 * langDivCd: "KOR" (기본) / "ENG" 지원
 * arrange: 'E' (거리순, 기본), 'C' (수정일순)
 */
export async function fetchMedicalTourPlaces(
  lng: number,
  lat: number,
  radius: number = 15000,
  numOfRows: number = 10,
  langDivCd: string = "KOR",
  arrange: string = "E"
): Promise<UnifiedTourItem[]> {
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      langDivCd,
      arrange,
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.medical}/locationBasedList?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) throw new Error(`MdclTursmService HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => (it.mapX || it.mapx) && (it.mapY || it.mapy) && it.title)
      .map((it: any) => ({
        id: `med-${it.contentId || it.contentid}`,
        sourceApi: "medical" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.baseAddr || it.addr1 || "").trim(),
        category: "의료·헬스케어 인프라",
        longitude: parseFloat(it.mapX || it.mapx),
        latitude: parseFloat(it.mapY || it.mapy),
        imageUrl: it.orgImage || it.thumbImage || it.firstimage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        distMeters: it.dist ? Math.round(parseFloat(it.dist)) : undefined,
      }));
  } catch (err) {
    console.warn("[tourApi] MdclTursmService fetch error:", err);
    return [];
  }
}

/**
 * 3-1. 의료관광 키워드 검색 (MdclTursmService/searchKeyword)
 */
export async function searchMedicalTourPlaces(
  keyword: string,
  numOfRows: number = 10,
  langDivCd: string = "KOR"
): Promise<UnifiedTourItem[]> {
  const clean = keyword.trim();
  if (!clean) return [];
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      keyword: clean,
      langDivCd,
      arrange: "A",
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.medical}/searchKeyword?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.title)
      .map((it: any) => ({
        id: `med-${it.contentId || it.contentid}`,
        sourceApi: "medical" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.baseAddr || it.addr1 || "").trim(),
        category: "의료·헬스케어 인프라",
        longitude: parseFloat(it.mapX || it.mapx || "0"),
        latitude: parseFloat(it.mapY || it.mapy || "0"),
        imageUrl: it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
      }));
  } catch (err) {
    console.warn("[tourApi] MdclTursmService search error:", err);
    return [];
  }
}

/**
 * 4. 웰니스관광정보 서비스 (WellnessTursmService)
 * langDivCd: "KOR" 필수, wellnessThemaCd 테마별 필터 지원
 * arrange: 'E' (거리순, 기본), 'C' (수정일순)
 */
export async function fetchWellnessTourPlaces(
  lng: number,
  lat: number,
  radius: number = 20000,
  numOfRows: number = 10,
  wellnessThemaCd?: string,
  arrange: string = "E"
): Promise<UnifiedTourItem[]> {
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: lng.toString(),
      mapY: lat.toString(),
      radius: radius.toString(),
      langDivCd: "KOR",
      arrange,
    });

    if (wellnessThemaCd) query.set("wellnessThemaCd", wellnessThemaCd);

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.wellness}/locationBasedList?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) throw new Error(`WellnessTursmService HTTP Error ${res.status}`);
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => (it.mapX || it.mapx) && (it.mapY || it.mapy) && it.title)
      .map((it: any) => ({
        id: `wellness-${it.contentId || it.contentid}`,
        sourceApi: "wellness" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.baseAddr || it.addr1 || "").trim(),
        category: getWellnessThemeName(it.wellnessThemaCd),
        longitude: parseFloat(it.mapX || it.mapx),
        latitude: parseFloat(it.mapY || it.mapy),
        imageUrl: it.orgImage || it.thumbImage || it.firstimage || undefined,
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
 * 4-1. 웰니스 관광 키워드 검색 (WellnessTursmService/searchKeyword)
 */
export async function searchWellnessTourPlaces(
  keyword: string,
  numOfRows: number = 10,
  langDivCd: string = "KOR"
): Promise<UnifiedTourItem[]> {
  const clean = keyword.trim();
  if (!clean) return [];
  try {
    const tourConfig = getTourConfig();
    const query = new URLSearchParams({
      serviceKey: tourConfig.serviceKey,
      numOfRows: numOfRows.toString(),
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      keyword: clean,
      langDivCd,
      arrange: "A",
    });

    const res = await fetch(
      `${tourConfig.baseUrl}${tourConfig.endpoints.wellness}/searchKeyword?${query.toString()}`,
      { signal: AbortSignal.timeout(tourConfig.timeoutMs || 4500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawItems = data?.response?.body?.items?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((it: any) => it.title)
      .map((it: any) => ({
        id: `wellness-${it.contentId || it.contentid}`,
        sourceApi: "wellness" as const,
        title: it.title.replace(/<[^>]+>/g, "").trim(),
        address: (it.baseAddr || it.addr1 || "").trim(),
        category: getWellnessThemeName(it.wellnessThemaCd),
        longitude: parseFloat(it.mapX || it.mapx || "0"),
        latitude: parseFloat(it.mapY || it.mapy || "0"),
        imageUrl: it.orgImage || it.thumbImage || undefined,
        tel: it.tel ? it.tel.replace(/<[^>]+>/g, " ").trim() : undefined,
        wellnessTheme: it.wellnessThemaCd,
      }));
  } catch (err) {
    console.warn("[tourApi] WellnessTursmService search error:", err);
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
