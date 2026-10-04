// VitalRoot 중앙 집중식 통합 API 설정 및 어댑터 레이어
// Naver Maps, Supabase, 한국관광공사 Tour API (4대 서비스), TMap 보행자 API, 식약처 DUR 및 식품영양성분 API 통합 관리

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
    operations: {
      usjntTaboo: string;
      pwnmTaboo: string;
      cpctyAtent: string;
      mdctnPdAtent: string;
      odsnAtent: string;
      spcifyAgrdeTaboo: string;
      efcyDplct: string;
      bundleList: string;
    };
    timeoutMs: number;
  };
  foodNutrition: {
    serviceKey: string;
    baseUrl: string;
    timeoutMs: number;
  };
}

const STORAGE_KEY_API_OVERRIDES = "vitalroot_api_config_overrides";
const DEFAULT_PUBLIC_KEY = "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7";

// 브라우저 Vite 환경(import.meta.env) 및 Node.js/테스트 환경(process.env) 겸용 안전 환경변수 리더
function getEnv(key: string): string | undefined {
  try {
    const envFn = new Function("try { return import.meta.env; } catch(e) { return undefined; }");
    const metaEnv = envFn();
    if (metaEnv && metaEnv[key] !== undefined && metaEnv[key] !== "") {
      return metaEnv[key];
    }
  } catch {}

  try {
    const gProcess = (globalThis as any).process;
    if (gProcess && gProcess.env) {
      const val = gProcess.env[key];
      if (val !== undefined && val !== "") return val;
    }
  } catch {}

  return undefined;
}

// 기본 설정 (환경 변수 우선, 차순위 안전 공통 인증키)
const DEFAULT_CONFIG: ApiConfig = {
  naverMap: {
    clientId: getEnv("VITE_NAVER_MAP_CLIENT_ID") || "pncc3tq0gp",
    scriptBaseUrl: "https://oapi.map.naver.com/openapi/v3/maps.js",
  },
  supabase: {
    url: getEnv("VITE_SUPABASE_URL") || "https://biruuwsoinqtlhdwbajh.supabase.co",
    anonKey:
      getEnv("VITE_SUPABASE_ANON_KEY") ||
      "sb_publishable_Rx-4GGZmbY2eZwIkTAvqTw_Yrxk_13Y",
  },
  tourApi: {
    serviceKey:
      getEnv("VITE_TOUR_API_KEY") ||
      DEFAULT_PUBLIC_KEY,
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
    appKey: getEnv("VITE_TMAP_API_KEY") || "",
    pedestrianUrl: "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
    timeoutMs: 8000,
  },
  dur: {
    serviceKey:
      getEnv("VITE_DUR_API_KEY") ||
      getEnv("VITE_TOUR_API_KEY") ||
      DEFAULT_PUBLIC_KEY,
    ingredientEndpoint: "https://apis.data.go.kr/1471000/DURIrdntInfoService03",
    bundleEndpoint: "https://apis.data.go.kr/1471000/DrbBundleInfoService02",
    operations: {
      usjntTaboo: "/getUsjntTabooInfoList02",
      pwnmTaboo: "/getPwnmTabooInfoList02",
      cpctyAtent: "/getCpctyAtentInfoList02",
      mdctnPdAtent: "/getMdctnPdAtentInfoList02",
      odsnAtent: "/getOdsnAtentInfoList02",
      spcifyAgrdeTaboo: "/getSpcifyAgrdeTabooInfoList02",
      efcyDplct: "/getEfcyDplctInfoList02",
      bundleList: "/getDrbBundleList02",
    },
    timeoutMs: 8000,
  },
  foodNutrition: {
    serviceKey:
      getEnv("VITE_FOOD_API_KEY") ||
      getEnv("VITE_TOUR_API_KEY") ||
      DEFAULT_PUBLIC_KEY,
    baseUrl: "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03",
    timeoutMs: 8000,
  },
};

/**
 * 로컬스토리지 오버라이드를 반영한 현재 유효 API 설정 취득
 */
export function getApiConfig(): ApiConfig {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_CONFIG;
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
      dur: {
        ...DEFAULT_CONFIG.dur,
        ...(overrides.dur || {}),
        operations: {
          ...DEFAULT_CONFIG.dur.operations,
          ...(overrides.dur?.operations || {}),
        },
      },
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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_API_OVERRIDES, JSON.stringify(updated));
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("vital-api-config-updated", { detail: updated }));
    }
  } catch (err) {
    console.error("Failed to save API config overrides:", err);
  }
}

/**
 * API 설정을 기본 환경 변수 설정으로 초기화
 */
export function resetApiConfig(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_API_OVERRIDES);
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("vital-api-config-updated", { detail: DEFAULT_CONFIG }));
    }
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
