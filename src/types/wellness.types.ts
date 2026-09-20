// 관광 및 웰니스 데이터 시각화 플랫폼 타입 정의

export type ChronicCondition = '당뇨' | '고혈압' | '이상지질혈증' | '신장질환' | '관절/근골격계';

export interface UserProfile {
  id?: string;
  userName: string;
  chronicConditions: ChronicCondition[];
  allergies: string[];
  dietaryPreference: string;
  conditionToday: string;
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
  tourApiContentId?: string;
  isMajorRoute?: boolean;
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
  slopeGrade: '완만(무장애)' | '보통' | '도전';
  expectedEffect: string;
}
