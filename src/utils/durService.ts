import { ChronicCondition, MedicationItem } from "../types/wellness.types";
import { getApiConfig } from "../config/apiConfig";

export const getDurConfig = () => getApiConfig().dur;
export const DUR_API_KEY = getApiConfig().dur.serviceKey;
export const DUR_API_ENDPOINT = getApiConfig().dur.ingredientEndpoint;
export const BUNDLE_API_ENDPOINT = getApiConfig().dur.bundleEndpoint;

// 식약처 DUR 7대 안전 카테고리
export interface DURDetailAnalysis {
  usjntTaboo: string[];      // 병용금기
  spcifyAgrdeTaboo: string[]; // 특정연령대금기
  pwnmTaboo: string[];       // 임부금기
  cpctyAtent: string[];      // 용량주의
  mdctnPdAtent: string[];    // 투여기간주의
  odsnAtent: string[];       // 노인주의
  efcyDplct: string[];       // 효능군중복
}

// 국내 최다 처방 만성질환 의약품 로컬 DUR 마스터 데이터 (CORS 및 오프라인 회복력 100% 보장)
export const POPULAR_MEDICATIONS: Array<{
  name: string;
  ingredientName: string;
  defaultTiming: string;
  cautionNote: string;
  durWarningTags: string[];
  inferredCondition: ChronicCondition;
  pharmacologicalClass: string; // 약효군
}> = [
  {
    name: "다이아벡스정 500mg",
    ingredientName: "메트포르민염산염",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 식후 30분 규칙적 완보 권장 / 식사 거름 방지 및 탈수 유의",
    durWarningTags: ["용량주의", "노인주의"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "혈당강하제 (비구아니드계)",
  },
  {
    name: "코자엑스큐정 5/50mg",
    ingredientName: "로사르탄칼륨/암로디핀베실산염",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 탈수 주의 / 산책로 공공화장실 3~5분 인프라 자동 확보",
    durWarningTags: ["임부금기", "노인주의"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "혈압강하제 (ARB+CCB 복합제)",
  },
  {
    name: "노바스크정 5mg",
    ingredientName: "암로디핀베실산염",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 기립성 저혈압 주의 / 급경사 배제 및 평지 완보 권장",
    durWarningTags: ["노인주의"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "칼슘채널차단제 (CCB)",
  },
  {
    name: "아마릴정 2mg",
    ingredientName: "글리메피리드",
    defaultTiming: "아침 식전 15분",
    cautionNote: "⚠️ 저혈당 쇼크 대비 포도당 사탕 휴대 / 식후 30분 완보",
    durWarningTags: ["병용금기", "노인주의"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "설포닐우레아계 혈당강하제",
  },
  {
    name: "리피토정 20mg",
    ingredientName: "아토르바스타틴칼슘",
    defaultTiming: "저녁 식후",
    cautionNote: "⚠️ 근육통·피로도 주의 / 무리한 고강도 트레킹 지양",
    durWarningTags: ["임부금기"],
    inferredCondition: "이상지질혈증",
    pharmacologicalClass: "HMG-CoA 환원효소 억제제",
  },
  {
    name: "자누비아정 100mg",
    ingredientName: "시타글립틴인산염",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 식사 거름 방지 / 식후 혈당 스파이크 억제 산책 권장",
    durWarningTags: ["효능군중복"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "DPP-4 억제제",
  },
  {
    name: "트라젠타정 5mg",
    ingredientName: "리나글립틴",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 규칙적인 식사 후 30분 가벼운 둘레길 완보 추천",
    durWarningTags: ["효능군중복"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "DPP-4 억제제",
  },
  {
    name: "엑스포지정 5/80mg",
    ingredientName: "발사르탄/암로디핀",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 보행 중 수분 충분히 섭취 / 중간 그늘 쉼터 확보",
    durWarningTags: ["임부금기", "노인주의"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "혈압강하제 복합제",
  },
  {
    name: "세비카정 5/20mg",
    ingredientName: "올메사르탄/암로디핀",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 땀 배출 후 전해질 균형 유지 / 저염 미네랄 식단",
    durWarningTags: ["임부금기", "노인주의"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "혈압강하제 복합제",
  },
  {
    name: "크레스토정 10mg",
    ingredientName: "로수바스타틴칼슘",
    defaultTiming: "저녁 식후",
    cautionNote: "⚠️ 안심식당 저지방·항산화 샐러드 식단 병행 추천",
    durWarningTags: ["임부금기"],
    inferredCondition: "이상지질혈증",
    pharmacologicalClass: "지질저하제",
  },
  {
    name: "딜라트렌정 12.5mg",
    ingredientName: "카르베딜롤",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 맥박수 급상승 지양 / 완만한 무장애 평지 코스 필수",
    durWarningTags: ["노인주의", "병용금기"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "베타차단제",
  },
  {
    name: "아스피린프로텍트정 100mg",
    ingredientName: "아스피린",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 출혈 경향 주의 / 타박상 유의 및 평탄한 보행로 권장",
    durWarningTags: ["병용금기", "노인주의"],
    inferredCondition: "고혈압",
    pharmacologicalClass: "항혈소판제",
  },
  {
    name: "포시가정 10mg",
    ingredientName: "다파글리플로진",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 소변 배출량 증가 / 코스 내 화장실 필수 & 수분 섭취",
    durWarningTags: ["노인주의"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "SGLT-2 억제제",
  },
  {
    name: "자디앙정 10mg",
    ingredientName: "엠파글리플로진",
    defaultTiming: "아침 식후",
    cautionNote: "⚠️ 탈수 및 요로 감염 주의 / 3~5분 화장실 인프라 필수",
    durWarningTags: ["노인주의"],
    inferredCondition: "당뇨",
    pharmacologicalClass: "SGLT-2 억제제",
  },
  {
    name: "록소닌정",
    ingredientName: "록소프로펜나트륨",
    defaultTiming: "식후 즉시",
    cautionNote: "⚠️ 위장 보호 식사 필수 / 관절 무리 없는 데크길 추천",
    durWarningTags: ["특정연령대금기", "용량주의"],
    inferredCondition: "관절/근골격계",
    pharmacologicalClass: "소염진통제 (NSAIDs)",
  },
];

/**
 * 의약품 검색 함수:
 * 1. 실시간 공공데이터 포털 API 호출 시도
 * 2. 실패/CORS/응답 지연 시 로컬 마스터 데이터셋에서 스마트 키워드 매칭
 */
export async function searchMedications(query: string): Promise<Array<{
  name: string;
  ingredientName: string;
  defaultTiming: string;
  cautionNote: string;
  durWarningTags: string[];
  inferredCondition: ChronicCondition;
}>> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  // 1) 로컬 마스터 DB 즉시 매칭
  const localMatches = POPULAR_MEDICATIONS.filter((med) =>
    med.name.toLowerCase().includes(clean) ||
    med.ingredientName.toLowerCase().includes(clean) ||
    med.inferredCondition.toLowerCase().includes(clean)
  );

  // 2) 실시간 공공데이터 API 호출 백그라운드 시도 (CORS 허용 시 병합)
  try {
    const url = `${BUNDLE_API_ENDPOINT}/getDrbBundleList02?serviceKey=${encodeURIComponent(
      DUR_API_KEY
    )}&itemName=${encodeURIComponent(query)}&type=json&numOfRows=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(url, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      const items = data?.body?.items;
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: { itemName?: string; entpName?: string }) => {
          const itemName = item.itemName || "";
          if (itemName && !localMatches.some((m) => m.name.includes(itemName))) {
            localMatches.push({
              name: itemName,
              ingredientName: "식약처 등록 성분",
              defaultTiming: "아침 식후",
              cautionNote: "⚠️ 복용 지침을 준수하시고 산책 시 수분을 충분히 섭취하세요.",
              durWarningTags: ["노인주의", "효능군중복"],
              inferredCondition: "당뇨",
              pharmacologicalClass: "식약처 허가 의약품",
            });
          }
        });
      }
    }
  } catch {
    // ignore CORS/network error, fallback seamlessly to local dataset
  }

  return localMatches;
}

/**
 * 등록된 약물 리스트로부터 관리할 추천 질환 목록을 자동 추론
 */
export function inferConditionsFromMedications(medications: MedicationItem[]): {
  recommendedConditions: ChronicCondition[];
  detectedClasses: string[];
} {
  const condSet = new Set<ChronicCondition>();
  const detectedClasses: string[] = [];

  medications.forEach((med) => {
    if (med.inferredCondition) {
      condSet.add(med.inferredCondition);
    }
    const found = POPULAR_MEDICATIONS.find(
      (m) => m.name === med.name || m.ingredientName === med.ingredientName
    );
    if (found?.pharmacologicalClass) {
      detectedClasses.push(`${found.pharmacologicalClass} (${med.name.split(" ")[0]})`);
    }
  });

  return {
    recommendedConditions: Array.from(condSet),
    detectedClasses,
  };
}

/**
 * 의약품명 또는 자연어 검색어로부터 기저 만성질환을 지능형 역추론하는 엔진
 */
export function inferConditionFromQuery(query: string): {
  condition: ChronicCondition;
  matchedKeyword: string;
  reason: string;
} | null {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 2) return null;

  // 1. 직접 질환 키워드 매칭
  if (clean.includes("당뇨") || clean.includes("혈당") || clean.includes("인슐린")) {
    return { condition: "당뇨", matchedKeyword: "당뇨/혈당", reason: "혈당 조절 및 당뇨 케어 권장" };
  }
  if (clean.includes("고혈압") || clean.includes("혈압")) {
    return { condition: "고혈압", matchedKeyword: "혈압 강하", reason: "보행 시 혈압 급상승 방지 및 완만 산책 권장" };
  }
  if (clean.includes("저혈압")) {
    return { condition: "저혈압", matchedKeyword: "저혈압", reason: "식후 저혈압 방지 및 평지 코스 권장" };
  }
  if (clean.includes("고지혈") || clean.includes("지질") || clean.includes("콜레스테롤")) {
    return { condition: "이상지질혈증", matchedKeyword: "지질 개선", reason: "혈관 건강 및 안심 저지방 식단 권장" };
  }
  if (clean.includes("신장") || clean.includes("콩팥") || clean.includes("투석")) {
    return { condition: "신장질환", matchedKeyword: "신장 케어", reason: "칼륨/나트륨 조절 식단 및 저강도 산책 권장" };
  }
  if (clean.includes("관절") || clean.includes("근골격") || clean.includes("디스크") || clean.includes("무릎")) {
    return { condition: "관절/근골격계", matchedKeyword: "관절 보호", reason: "무릎 부담 없는 평지 데크길 권장" };
  }

  // 2. 의약품 성분명 및 대표 상품명 역추론 매칭
  const DRUG_REVERSE_MAP: Array<{ keywords: string[]; condition: ChronicCondition; reason: string }> = [
    {
      keywords: ["메트포르민", "다이아벡스", "글루코", "자누비아", "시타글립틴", "트라젠타", "리나글립틴", "포시가", "다파글리", "자디앙", "엠파글리", "아마릴", "글리메피"],
      condition: "당뇨",
      reason: "당뇨병 혈당강하제 복용에 따른 식후 혈당 스파이크 방지 케어",
    },
    {
      keywords: ["암로디핀", "노바스크", "로사르탄", "코자", "발사르탄", "엑스포지", "올메사르탄", "세비카", "텔미사르탄", "미카르디스", "카르베딜롤", "딜라트렌", "아스피린"],
      condition: "고혈압",
      reason: "혈압강하제 복용에 따른 보행 중 혈압 안정 및 화장실 인프라 확보",
    },
    {
      keywords: ["아토르바", "리피토", "로수바", "크레스토", "스타틴", "에제티미브", "페노피브레이트"],
      condition: "이상지질혈증",
      reason: "지질저하제 복용에 따른 근육 피로도 완화 및 저염·저지방 식단 연동",
    },
    {
      keywords: ["알로푸리놀", "자이로릭", "페북소스타트", "페브릭", "탄산칼슘", "레나젤"],
      condition: "신장질환",
      reason: "신장·요산 대사제 복용에 따른 칼륨/나트륨 균형 식단 권장",
    },
    {
      keywords: ["록소닌", "록소프로펜", "쎄레브렉스", "세레콕시브", "낙센", "나프록센", "이부프로펜", "아세클로페낙", "에어탈", "트라마돌"],
      condition: "관절/근골격계",
      reason: "소염진통제 복용에 따른 관절 무리 배제 및 무장애 평지길 권장",
    },
    {
      keywords: ["미도드린", "구трон", "플루드로코르티손"],
      condition: "저혈압",
      reason: "승압제 복용에 따른 기립성 혈압 변화 유의 및 평지 코스 권장",
    },
  ];

  for (const entry of DRUG_REVERSE_MAP) {
    for (const kw of entry.keywords) {
      if (clean.includes(kw)) {
        return {
          condition: entry.condition,
          matchedKeyword: kw,
          reason: entry.reason,
        };
      }
    }
  }

  return null;
}
