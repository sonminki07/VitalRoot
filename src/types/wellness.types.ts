// 만성질환 웰니스 헬스케어 플랫폼 타입 정의

export type ChronicCondition = '당뇨' | '고혈압' | '이상지질혈증' | '신장질환' | '관절/근골격계';

export interface UserProfile {
  id?: string;
  userName: string;
  chronicConditions: ChronicCondition[];
  allergies: string[];
  dietaryPreference: string;
  conditionToday: string;
  recoloredZones: number;
}

export interface WellnessPlace {
  id: string;
  name: string;
  category: '안심식당' | '산책로' | '로컬제휴처';
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
  slopeGrade: '완만(무장애)' | '보통' | '도전';
  expectedEffect: string;
  questCoupon: {
    name: string;
    barcode: string;
    discountDesc: string;
    isCompleted: boolean;
  };
}
