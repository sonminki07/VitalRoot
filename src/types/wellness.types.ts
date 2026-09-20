export type ChronicCondition = '당뇨' | '고혈압' | '저혈압' | '이상지질혈증' | '신장질환' | '관절/근골격계';

// 식약처 DUR 및 복용 의약품 정보
export interface MedicationItem {
  id: string;
  name: string;                   // 약품명 (예: 다이아벡스정 500mg)
  ingredientName: string;         // 주요 성분명 (예: 메트포르민)
  timing: string;                 // 복용 시점 (예: 아침 식후, 식전 30분)
  cautionNote: string;            // 여행/보행 가이드 (예: 식후 30분 규칙적 완보 권장 / 식사 거름 방지)
  durWarningTags: string[];       // 식약처 DUR 7대 주의 태그 (예: ['노인주의', '용량주의'])
  inferredCondition?: ChronicCondition; // 약물 기반 추론 질환
}

export interface UserProfile {
  id?: string;
  userName: string;
  chronicConditions: ChronicCondition[];
  medications?: MedicationItem[];
  hasNoMedications?: boolean;     // 복용 중인 약물이 없음 명시적 체크
  allergies: string[];
  dietaryPreference: string;
  conditionToday: string;
  walkFitnessLevel?: string;      // 보행 체력 수준
  requiredInfra?: string[];       // 산책 필수 인프라 (화장실, 쉼터 등)
  isOnboardingDismissed?: boolean;
}

// 식약처 공공데이터 기반 영양성분 정보
export interface NutritionInfo {
  menuName: string;
  calories: number;       // kcal
  carbohydrate: number;   // g
  sugars: number;         // 당류 (g)
  sodium: number;         // 나트륨 (mg)
  protein: number;        // 단백질 (g)
  sugarGrade: '안심' | '보통' | '주의';   // 당뇨 기준 (초록/노랑/빨강)
  sodiumGrade: '안심' | '보통' | '주의';  // 고혈압 기준 (초록/노랑/빨강)
  nutritionTip?: string;
}

// 보행 동선 3~5분 공공 편의시설 (Waypoint)
export interface WaypointFacility {
  id: string;
  name: string;
  category: '화장실' | '쉼터' | '배리어프리';
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  walkingMinutesFromRoute: number; // 경로에서 도보 몇 분 (예: 3분)
  distanceMetersFromRoute: number; // 경로에서 거리 (예: 180m)
  features: string[];              // 예: ['장애인 화장실', '비데', '냉난방', '그늘 벤치']
  naverPlaceName?: string;
}

export interface WellnessPlace {
  id: string;
  name: string;
  category: '안심식당' | '산책로' | '관광지' | '로컬제휴처';
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  safeTags: string[];
  healthBenefit: string;
  nutrition?: NutritionInfo;       // 안심식당 대표 메뉴 식약처 영양정보
  tourApiContentId?: string;
  isMajorRoute?: boolean;
  naverPlaceName?: string;
}

export interface WellnessCourseSet {
  id: string;
  title: string;
  targetCondition: string;
  restaurant: WellnessPlace;
  trail: WellnessPlace;
  walkMinutes: number;
  distanceMeters?: number;          // 실제 도로망 보행 거리 (m)
  walkingRoute?: [number, number][]; // 실제 도로를 따라 이어지는 보행자 좌표셋 [[lng, lat], ...]
  waypoints?: WaypointFacility[];   // 보행 경로 3~5분 공공 편의시설 리스트
  slopeGrade: '완만(무장애)' | '보통' | '도전';
  expectedEffect: string;
  region?: string;                  // 지역 구분 (예: '안산/경기남부', '서울 도심')
  isLocal?: boolean;                // 생활권 동네 힐링 코스 여부
}

// 1박 2일 웰니스 숙박 정보 (Tour API searchStay2 기반)
export interface WellnessStay {
  id: string;
  name: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  chkcooking: boolean;       // 객실 내 취사 가능 여부 (저염식 조리)
  roomrefrigerator: boolean; // 객실 내 냉장고 보유 (인슐린 보관 필수)
  fitness: boolean;          // 피트니스 센터 보유 (식후 운동 루틴)
  safeBadges: string[];
  contact?: string;
  naverPlaceName?: string;
}

// 1박 2일 다일정 장기 웰니스 코스
export interface MultiDayCourseSet {
  id: string;
  title: string;
  duration: string;          // '1박 2일'
  targetCondition: string;
  stay: WellnessStay;
  days: {
    day: number;
    title: string;
    description: string;
    steps: {
      type: '식사' | '산책' | '체험' | '숙박';
      name: string;
      description: string;
      tags: string[];
    }[];
  }[];
}

// 웰니스 관광명소 퀘스트 및 칭호 리워드 인터페이스
export interface WellnessQuest {
  id: string;
  title: string;
  description: string;
  landmarkName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  targetDurationMinutes: number; // 목표 체류/산책 시간 (분)
  titleReward: string;           // 완료 시 획득 칭호
  badgeIcon: string;             // 뱃지 이모지
  isCompleted: boolean;
  progressMinutes?: number;
  naverPlaceName?: string;
}
