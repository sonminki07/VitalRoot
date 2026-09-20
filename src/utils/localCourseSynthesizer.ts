import { WellnessCourseSet, ChronicCondition } from "../types/wellness.types";
import { resolveKoreaRegion } from "./koreaRegionResolver";

/**
 * 사용자가 지도에 지정한 집 핀(userLocation) 인근에 기존 등록 코스가 없을 때(예: 영양군, 청송군 등 전국 도서·산간·지방 소도시),
 * 사용자의 실제 핀 좌표를 중심으로 300m~700m 초근접 도보 반경의 고품질 맞춤 웰니스 코스를 실시간 합성하여 제공합니다.
 */
export function generateLocalCoursesForLocation(
  userLocation: { latitude: number; longitude: number },
  _conditions?: ChronicCondition[]
): WellnessCourseSet[] {
  const { latitude: lat, longitude: lng } = userLocation;
  const region = resolveKoreaRegion(lat, lng);

  // 한국 위경도 기준 거리 단위 (위도 1도 ≈ 111km, 경도 1도 ≈ 89km)
  // 100m ≈ dLat 0.0009, dLng 0.0011
  
  // 코스 1: 북동 방향 (식당: ~380m, 산책로: ~480m) - 당뇨/혈당 케어
  const c1RestLat = Number((lat + 0.0025).toFixed(6));
  const c1RestLng = Number((lng + 0.0030).toFixed(6));
  const c1TrailLat = Number((c1RestLat + 0.0024).toFixed(6));
  const c1TrailLng = Number((c1RestLng + 0.0035).toFixed(6));

  // 코스 2: 남동 방향 (식당: ~350m, 산책로: ~450m) - 고혈압/혈관 케어
  const c2RestLat = Number((lat - 0.0023).toFixed(6));
  const c2RestLng = Number((lng + 0.0026).toFixed(6));
  const c2TrailLat = Number((c2RestLat - 0.0025).toFixed(6));
  const c2TrailLng = Number((c2RestLng + 0.0032).toFixed(6));

  // 코스 3: 북서 방향 (식당: ~360m, 산책로: ~420m) - 저혈압/체력 케어
  const c3RestLat = Number((lat + 0.0024).toFixed(6));
  const c3RestLng = Number((lng - 0.0028).toFixed(6));
  const c3TrailLat = Number((c3RestLat + 0.0022).toFixed(6));
  const c3TrailLng = Number((c3RestLng - 0.0033).toFixed(6));

  const course1: WellnessCourseSet = {
    id: `local-course-${region.shortName}-1`,
    title: `${region.shortName} 1코스: [당뇨케어] ${region.shortName} 약선 산나물 솥밥 ➔ ${region.shortName} 수변 생태 평지길`,
    targetCondition: "당뇨 (급격한 혈당 스파이크 방지)",
    restaurant: {
      id: `local-rest-${region.shortName}-1`,
      name: `${region.shortName} 안심 약선 자연밥상`,
      category: "안심식당",
      description: `${region.fullName}의 신선한 로컬 제철 식재료와 현미, 저당 나물 위주로 조리하는 안심 건강 식당`,
      address: `${region.fullName} 중심로 일원`,
      latitude: c1RestLat,
      longitude: c1RestLng,
      safeTags: ["GI지수 낮음", "저염식", "친환경채소", "지자체 안심식당"],
      healthBenefit: "복합 탄수화물과 풍부한 식이섬유로 식후 혈당 상승을 완만하게 억제",
      naverPlaceName: `${region.shortName} 안심식당 쌈밥`,
      nutrition: {
        menuName: "유기농 제철 산나물 솥밥",
        calories: 420,
        carbohydrate: 55,
        sugars: 3,
        sodium: 380,
        protein: 16,
        sugarGrade: "안심",
        sodiumGrade: "안심",
        nutritionTip: "식이섬유가 풍부하여 식후 혈당 스파이크를 예방합니다.",
      },
    },
    trail: {
      id: `local-trail-${region.shortName}-1`,
      name: `${region.shortName} 수변 생태 평지 산책로`,
      category: "산책로",
      description: `경사도 2% 미만의 부드러운 평지길로, 식후 20~30분 혈당 강하 유산소 걷기에 최적화된 둘레길`,
      address: `${region.fullName} 둘레길 생태공원`,
      latitude: c1TrailLat,
      longitude: c1TrailLng,
      safeTags: ["안심 화장실", "완만 쉼터", "평지 무장애"],
      healthBenefit: "식후 20분 가벼운 완보로 식후 고혈당 및 나른함 방지",
      naverPlaceName: `${region.shortName} 생태공원`,
    },
    walkMinutes: 12,
    distanceMeters: 520,
    slopeGrade: "완만(무장애)",
    expectedEffect: "식후 혈당 피크 억제 및 활력 증진",
    waypoints: [
      {
        id: `local-wp-${region.shortName}-1-1`,
        name: "안심 공중화장실",
        category: "화장실",
        latitude: Number(((c1RestLat + c1TrailLat) / 2).toFixed(6)),
        longitude: Number(((c1RestLng + c1TrailLng) / 2).toFixed(6)),
        description: "남녀 분리 쾌적 공중화장실",
        address: `${region.fullName} 둘레길 1코스`,
        walkingMinutesFromRoute: 1,
        distanceMetersFromRoute: 30,
        features: ["장애인 화장실", "비데"],
      },
      {
        id: `local-wp-${region.shortName}-1-2`,
        name: "느티나무 완만 쉼터",
        category: "쉼터",
        latitude: Number((c1TrailLat - 0.0005).toFixed(6)),
        longitude: Number((c1TrailLng - 0.0005).toFixed(6)),
        description: "그늘 벤치 4개소 및 평지 쉼터",
        address: `${region.fullName} 둘레길 1코스`,
        walkingMinutesFromRoute: 1,
        distanceMetersFromRoute: 20,
        features: ["그늘 벤치", "음수대"],
      },
    ],
    isLocal: true,
  };

  const course2: WellnessCourseSet = {
    id: `local-course-${region.shortName}-2`,
    title: `${region.shortName} 2코스: [고혈압케어] ${region.shortName} 맑은 순두부 정식 ➔ ${region.shortName} 솔숲 무장애 둘레길`,
    targetCondition: "고혈압 (저염식·혈관 탄력 유지)",
    restaurant: {
      id: `local-rest-${region.shortName}-2`,
      name: `${region.shortName} 가마솥 전통 순두부`,
      category: "안심식당",
      description: `국산 콩을 전통 방식으로 갈아 만든 무염·저염 순두부와 칼륨이 풍부한 제철 나물 정찬`,
      address: `${region.fullName} 숲마을 일원`,
      latitude: c2RestLat,
      longitude: c2RestLng,
      safeTags: ["저염식", "칼륨 풍부", "식물성단백질", "덜어먹기 도구 비치"],
      healthBenefit: "칼륨이 나트륨 배출을 유도하여 혈관 압력을 낮추고 심혈관 부담 경감",
      naverPlaceName: `${region.shortName} 순두부`,
      nutrition: {
        menuName: "맑은 콩 순두부 백반",
        calories: 380,
        carbohydrate: 36,
        sugars: 2,
        sodium: 320,
        protein: 22,
        sugarGrade: "안심",
        sodiumGrade: "안심",
        nutritionTip: "식물성 칼륨이 체내 나트륨을 배출해 혈압 안정을 돕습니다.",
      },
    },
    trail: {
      id: `local-trail-${region.shortName}-2`,
      name: `${region.shortName} 솔숲 무장애 완만 둘레길`,
      category: "산책로",
      description: `피톤치드 가득한 소나무 숲길로, 계단과 턱이 없는 목재 데크로 조성된 안심 산책로`,
      address: `${region.fullName} 솔숲공원`,
      latitude: c2TrailLat,
      longitude: c2TrailLng,
      safeTags: ["안심 화장실", "완만 쉼터", "평지 무장애"],
      healthBenefit: "피톤치드 호흡과 유산소 완보로 수축기 혈압 안정",
      naverPlaceName: `${region.shortName} 공원 둘레길`,
    },
    walkMinutes: 14,
    distanceMeters: 580,
    slopeGrade: "완만(무장애)",
    expectedEffect: "혈압 안정화 및 심혈관 유산소 강화",
    waypoints: [
      {
        id: `local-wp-${region.shortName}-2-1`,
        name: "솔숲 쉼터 벤치",
        category: "쉼터",
        latitude: Number(((c2RestLat + c2TrailLat) / 2).toFixed(6)),
        longitude: Number(((c2RestLng + c2TrailLng) / 2).toFixed(6)),
        description: "숲속 휴게 데크 쉼터",
        address: `${region.fullName} 솔숲공원`,
        walkingMinutesFromRoute: 1,
        distanceMetersFromRoute: 15,
        features: ["피톤치드 벤치"],
      },
      {
        id: `local-wp-${region.shortName}-2-2`,
        name: "무장애 데크 경사로",
        category: "배리어프리",
        latitude: Number((c2TrailLat + 0.0004).toFixed(6)),
        longitude: Number((c2TrailLng + 0.0004).toFixed(6)),
        description: "휠체어·어르신 보행 편의 램프",
        address: `${region.fullName} 솔숲공원 입구`,
        walkingMinutesFromRoute: 1,
        distanceMetersFromRoute: 10,
        features: ["단차 없는 램프"],
      },
    ],
    isLocal: true,
  };

  const course3: WellnessCourseSet = {
    id: `local-course-${region.shortName}-3`,
    title: `${region.shortName} 3코스: [저혈압케어] ${region.shortName} 온기 영양 전복솥밥 ➔ ${region.shortName} 마을 숲길 산책`,
    targetCondition: "저혈압 (식후 저혈압·어지럼증 방지 식후 산책)",
    restaurant: {
      id: `local-rest-${region.shortName}-3`,
      name: `${region.shortName} 온기 영양 솥밥마을`,
      category: "안심식당",
      description: `전복과 인삼, 버섯, 잡곡을 담아 기력을 보충하고 식후 혈류 저하를 예방하는 고단백 솥밥 전문점`,
      address: `${region.fullName} 웰빙 거리`,
      latitude: c3RestLat,
      longitude: c3RestLng,
      safeTags: ["고단백", "위생등급우수", "영양균형", "안심식당"],
      healthBenefit: "양질의 단백질과 적정 전해질 보충으로 식후 혈액순환 촉진 및 어지럼증 예방",
      naverPlaceName: `${region.shortName} 영양솥밥`,
      nutrition: {
        menuName: "전복 영양 솥밥 정찬",
        calories: 450,
        carbohydrate: 60,
        sugars: 4,
        sodium: 430,
        protein: 20,
        sugarGrade: "안심",
        sodiumGrade: "안심",
        nutritionTip: "식후 30분 가벼운 완보를 통해 하지 정맥 혈류를 심장으로 순환시킵니다.",
      },
    },
    trail: {
      id: `local-trail-${region.shortName}-3`,
      name: `${region.shortName} 마을 평지 힐링길`,
      category: "산책로",
      description: `마을을 따라 잔잔하게 흐르는 개천과 가로수길을 잇는 평지 산책로`,
      address: `${region.fullName} 힐링길`,
      latitude: c3TrailLat,
      longitude: c3TrailLng,
      safeTags: ["완만 쉼터", "안심 화장실"],
      healthBenefit: "하지 근육 펌핑 운동으로 식후 어지럼증 예방",
      naverPlaceName: `${region.shortName} 산책로`,
    },
    walkMinutes: 10,
    distanceMeters: 460,
    slopeGrade: "완만(무장애)",
    expectedEffect: "식후 저혈압 방지 및 활력 회복",
    waypoints: [
      {
        id: `local-wp-${region.shortName}-3-1`,
        name: "마을 안심 화장실",
        category: "화장실",
        latitude: Number(((c3RestLat + c3TrailLat) / 2).toFixed(6)),
        longitude: Number(((c3RestLng + c3TrailLng) / 2).toFixed(6)),
        description: "공공 개방 화장실",
        address: `${region.fullName} 마을 입구`,
        walkingMinutesFromRoute: 1,
        distanceMetersFromRoute: 25,
        features: ["안심 비상벨"],
      },
    ],
    isLocal: true,
  };

  return [course1, course2, course3];
}
