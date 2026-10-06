/**
 * VitalRoot Frontend-Backend Contract Types (공통 통신 DTO 정의)
 * 
 * 프론트엔드와 백엔드가 공유하는 단일 진실 공급원(Single Source of Truth) 타입 정의 파일입니다.
 * 신규 프론트엔드 레포지토리에서도 본 파일을 그대로 가져와 사용할 수 있습니다.
 */

// ==========================================
// 1. 공통 응답 래퍼 (Envelope Pattern)
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==========================================
// 2. 만성질환 및 사용자 프로필 (User Profile)
// ==========================================

export type ChronicCondition =
  | "당뇨"
  | "고혈압"
  | "저혈압"
  | "이상지질혈증"
  | "신장질환"
  | "관절/근골격계";

export type WalkFitnessLevel = "초급(완만)" | "중급" | "고급";

export type RequiredInfraType = "화장실" | "쉼터" | "엘리베이터" | "약국";

export interface MedicationItem {
  id: string;
  name: string;                   // 약품명 (예: 다이아벡스정 500mg)
  ingredientName: string;         // 식약처 DUR 성분명 (예: 메트포르민염산염)
  timing: string;                 // 복용 시점 (예: 아침 식후 30분)
  cautionNote: string;            // 여행/보행 가이드 문구
  durWarningTags: string[];       // 식약처 DUR 7대 주의 태그 (예: ['노인주의', '용량주의'])
  inferredCondition?: ChronicCondition; // 약물 기반 추론 질환
}

export interface UserProfileDto {
  userId: string;
  userName: string;
  chronicConditions: ChronicCondition[];
  medications?: MedicationItem[];
  walkFitnessLevel?: WalkFitnessLevel;
  requiredInfra?: RequiredInfraType[];
}

// ==========================================
// 3. 장소 및 영양성분 (Place & Nutrition)
// ==========================================

export type PlaceCategory = "안심식당" | "산책로" | "관광지" | "의료";

export type HealthGrade = "안심" | "보통" | "주의";

export interface NutritionInfoDto {
  menuName: string;
  calories: number;       // kcal
  carbohydrate: number;   // g
  sugars: number;         // 당류 (g)
  sodium: number;         // 나트륨 (mg)
  sugarGrade: HealthGrade; // 당뇨 안심 신호등 등급
  sodiumGrade: HealthGrade;// 고혈압 안심 신호등 등급
}

export interface WellnessPlaceDto {
  id: string;                     // TourAPI contentid
  name: string;                   // TourAPI title
  category: PlaceCategory;
  address: string;                // TourAPI addr1
  latitude: number;               // TourAPI mapy
  longitude: number;              // TourAPI mapx
  imageUrl?: string | null;       // TourAPI firstimage
  tel?: string | null;            // TourAPI tel
  safeTags: string[];             // 검증된 안심 태그 목록
  nutrition?: NutritionInfoDto | null; // 안심식당 대표 메뉴 영양성분
}

// ==========================================
// 4. 코스 및 공공 편의시설 (Course & Waypoints)
// ==========================================

export type SlopeGrade = "완만(무장애)" | "보통" | "도전";

export type WaypointCategory = "화장실" | "쉼터" | "배리어프리" | "의료";

export interface WaypointFacilityDto {
  id: string;
  name: string;
  category: WaypointCategory;
  address: string;
  latitude: number;
  longitude: number;
  walkingMinutesFromRoute: number; // 경로에서 도보 이탈 시간 (분)
  distanceMetersFromRoute: number; // 경로에서 이탈 거리 (m)
  features: string[];              // 예: ['장애인 화장실', '비데', '냉난방']
}

export interface WellnessCourseDto {
  id: string;
  title: string;
  targetCondition: ChronicCondition;
  restaurant: WellnessPlaceDto;    // 출발지 안심식당
  trail: WellnessPlaceDto;         // 도착지 산책로
  totalDistanceMeters: number;     // TMap 보행자 도로망 거리 (m)
  walkMinutes: number;             // 완보 소요 시간 (분)
  slopeGrade: SlopeGrade;          // 경사도 난이도
  walkingRoute: [number, number][];// GeoJSON 보행자 좌표셋 [[lng, lat], ...]
  waypoints?: WaypointFacilityDto[];// 경로 상 3~5분 편의시설
}

// ==========================================
// 5. 1박 2일 웰니스 숙박 (Stay)
// ==========================================

export interface WellnessStayDto {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  chkCooking: boolean;             // 객실 내 취사 가능 (저염식 자가 조리)
  roomRefrigerator: boolean;       // 인슐린 보관용 냉장고 보유 여부
  hasFitness: boolean;             // 식후 혈당 운동용 피트니스 보유 여부
  safeBadges: string[];
}

// ==========================================
// 6. 퀘스트 및 실시간 완보 세션 (Quest & Session)
// ==========================================

export interface WellnessQuestDto {
  questId: string;
  title: string;
  targetName: string;
  address: string;
  latitude: number;
  longitude: number;
  targetDurationMinutes: number;   // 완보 인정 목표 체류 시간 (분)
  titleReward: string;             // 획득 칭호
  isCompleted: boolean;
}

export interface WalkSessionPingRequest {
  questId: string;
  currentLatitude: number;
  currentLongitude: number;
  elapsedSeconds: number;
}

export interface WalkSessionStatusDto {
  questId: string;
  targetName: string;
  elapsedSeconds: number;
  targetSeconds: number;
  isGpsValid: boolean;             // 현장 반경 500m 체류 정상 여부
  isEligible: boolean;             // 목표 시간 충족 여부
  distanceMeters: number;          // 남은 거리 (m)
}
