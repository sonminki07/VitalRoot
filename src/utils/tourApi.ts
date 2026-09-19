// 한국관광공사 Tour API 연계 유틸리티

const TOUR_API_KEY =
  import.meta.env.VITE_TOUR_API_KEY || "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7";
const BASE_URL = "https://apis.data.go.kr/B551011/KorService1";

export interface TourItem {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string; // 경도
  mapy: string; // 위도
  firstimage?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
}

/**
 * 위치 기반(위경도, 반경) 관광정보/음식점 조회
 */
export async function fetchLocationBasedPlaces(
  mapX: number,
  mapY: number,
  radius: number = 3000,
  contentTypeId: string = "39" // 39: 음식점, 12: 관광지
): Promise<TourItem[]> {
  try {
    const query = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: "10",
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "VitalRoot",
      _type: "json",
      mapX: mapX.toString(),
      mapY: mapY.toString(),
      radius: radius.toString(),
      contentTypeId,
    });

    const response = await fetch(`${BASE_URL}/locationBasedList1?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Tour API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  } catch (error) {
    console.warn("Tour API fetch failed, fallback to local dataset:", error);
    return [];
  }
}
