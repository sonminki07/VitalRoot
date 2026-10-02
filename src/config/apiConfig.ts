// VitalRoot 중앙 집중식 통합 API 설정 및 어댑터 레이어
// Naver Maps, Supabase, 한국관광공사 Tour API, TMap 보행자 API, 식약처 DUR 및 식품영양성분 API 통합 관리

export interface ApiConfig {
  naverMap: {
    clientId: string;
    scriptBaseUrl: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  tourApi: {
    serviceKey: string;
    baseUrl: string;
    endpoints: {
      kor: string;
      barrierFree: string;
      medical: string;
      wellness: string;
    };
    timeoutMs: number;
  };
  tmap: {
    appKey: string;
    pedestrianUrl: string;
    timeoutMs: number;
  };
  dur: {
    serviceKey: string;
    ingredientEndpoint: string;
    bundleEndpoint: string;
    timeoutMs: number;
  };
  foodNutrition: {
    serviceKey: string;
    baseUrl: string;
    timeoutMs: number;
  };
}

const STORAGE_KEY_API_OVERRIDES = "vitalroot_api_config_overrides";

// 기본 기본값 (환경 변수 우선, 차순위 안전 폴백 키)
const DEFAULT_CONFIG: ApiConfig = {
  naverMap: {
    clientId: import.meta.env.VITE_NAVER_MAP_CLIENT_ID || "pncc3tq0gp",
    scriptBaseUrl: "https://oapi.map.naver.com/openapi/v3/maps.js",
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "https://biruuwsoinqtlhdwbajh.supabase.co",
    anonKey:
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_Rx-4GGZmbY2eZwIkTAvqTw_Yrxk_13Y",
  },
  tourApi: {
    serviceKey:
      import.meta.env.VITE_TOUR_API_KEY ||
      "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7",
    baseUrl: "https://apis.data.go.kr/B551011",
    endpoints: {
      kor: "/KorService2",
      barrierFree: "/KorWithService2",
      medical: "/MdclTursmService",
      wellness: "/WellnessTursmService",
    },
    timeoutMs: 10000,
  },
  tmap: {
    appKey: import.meta.env.VITE_TMAP_API_KEY || "",
    pedestrianUrl: "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
    timeoutMs: 8000,
  },
  dur: {
    serviceKey:
      import.meta.env.VITE_DUR_API_KEY ||
      import.meta.env.VITE_TOUR_API_KEY ||
      "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7",
    ingredientEndpoint: "https://apis.data.go.kr/1471000/DURIrdntInfoService03",
    bundleEndpoint: "https://apis.data.go.kr/1471000/DrbBundleInfoService02",
    timeoutMs: 8000,
  },
  foodNutrition: {
    serviceKey:
      import.meta.env.VITE_FOOD_API_KEY ||
      import.meta.env.VITE_TOUR_API_KEY ||
      "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7",
    baseUrl: "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03",
    timeoutMs: 8000,
  },
};

/**
 * 로컬스토리지 오버라이드를 반영한 현재 유효 API 설정 취득
 */
export function getApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_API_OVERRIDES);
    if (!raw) return DEFAULT_CONFIG;
    const overrides = JSON.parse(raw);
    return {
      naverMap: { ...DEFAULT_CONFIG.naverMap, ...(overrides.naverMap || {}) },
      supabase: { ...DEFAULT_CONFIG.supabase, ...(overrides.supabase || {}) },
      tourApi: {
        ...DEFAULT_CONFIG.tourApi,
        ...(overrides.tourApi || {}),
        endpoints: {
          ...DEFAULT_CONFIG.tourApi.endpoints,
          ...(overrides.tourApi?.endpoints || {}),
        },
      },
      tmap: { ...DEFAULT_CONFIG.tmap, ...(overrides.tmap || {}) },
      dur: { ...DEFAULT_CONFIG.dur, ...(overrides.dur || {}) },
      foodNutrition: { ...DEFAULT_CONFIG.foodNutrition, ...(overrides.foodNutrition || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 런타임에서 API 설정 변경 및 영속화 (테스트 및 손쉬운 키 교체)
 */
export function updateApiConfig(partial: Partial<ApiConfig>): void {
  try {
    const current = getApiConfig();
    const updated = {
      ...current,
      ...partial,
      naverMap: { ...current.naverMap, ...(partial.naverMap || {}) },
      supabase: { ...current.supabase, ...(partial.supabase || {}) },
      tourApi: { ...current.tourApi, ...(partial.tourApi || {}) },
      tmap: { ...current.tmap, ...(partial.tmap || {}) },
      dur: { ...current.dur, ...(partial.dur || {}) },
      foodNutrition: { ...current.foodNutrition, ...(partial.foodNutrition || {}) },
    };
    localStorage.setItem(STORAGE_KEY_API_OVERRIDES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("vital-api-config-updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to save API config overrides:", err);
  }
}

/**
 * API 설정을 기본 환경 변수 설정으로 초기화
 */
export function resetApiConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_API_OVERRIDES);
    window.dispatchEvent(new CustomEvent("vital-api-config-updated", { detail: DEFAULT_CONFIG }));
  } catch (err) {
    console.error("Failed to reset API config overrides:", err);
  }
}

/**
 * 동적 네이버 지도 스크립트 로더
 */
export function loadNaverMapsScript(customClientId?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.naver && window.naver.maps) {
      resolve(true);
      return;
    }

    const config = getApiConfig();
    const clientId = customClientId || config.naverMap.clientId;
    const scriptId = "naver-map-script-v3";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existing) {
      existing.onload = () => resolve(true);
      existing.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "text/javascript";
    script.src = `${config.naverMap.scriptBaseUrl}?ncpKeyId=${clientId}&submodules=panorama,geocoder`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Naver Maps script failed to load. Falling back to offline map mode.");
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

// 편의를 위한 싱글톤 객체
export const API_CONFIG = getApiConfig();
