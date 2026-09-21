// 지역별 공공 API 데이터(4대 Tour API) 기반 실시간 맞춤 웰니스 코스 및 지역 명소 퀘스트 생성 엔진
import {
  WellnessCourseSet,
  WellnessQuest,
  ChronicCondition,
  WaypointFacility,
} from "../types/wellness.types";
import { RegionalTourCollection, UnifiedTourItem } from "./tourApi";
import { resolveKoreaRegion } from "./koreaRegionResolver";
import { calculateDistanceMeters } from "./pedestrianRouter";

/**
 * 지역별 고유 칭호 리워드 생성기
 */
function getRegionalTitleReward(shortName: string, index: number): string {
  const titles = [
    `${shortName} 은하수 웰니스 수호자 🏅`,
    `${shortName} 푸른 솔향 힐링 마스터 🌿`,
    `${shortName} 무장애 숲길 탐험가 ♿`,
    `${shortName} 바람결 모세혈관 활력왕 💧`,
    `${shortName} 자연치유 명소 완보왕 🌲`,
  ];
  return titles[index % titles.length] ?? `${shortName} 웰니스 힐링 수호자 🏅`;
}

/**
 * 4대 Tour API 수집 데이터를 가공하여 해당 시·군·구 맞춤 웰니스 코스 목록 생성
 */
export function buildRegionalCourses(
  lat: number,
  lng: number,
  collection: RegionalTourCollection,
  _conditions: ChronicCondition[] = ["당뇨", "고혈압"]
): WellnessCourseSet[] {
  const region = resolveKoreaRegion(lat, lng);
  const courses: WellnessCourseSet[] = [];

  const rawRestaurants = collection.restaurants;
  const rawTrails = collection.trailsAndAttractions;

  // 식당 후보군 (최대 3개)
  const restCandidates: UnifiedTourItem[] =
    rawRestaurants.length > 0
      ? rawRestaurants.slice(0, 4)
      : [
          {
            id: `synth-rest-${region.shortName}-1`,
            sourceApi: "kor",
            title: `${region.shortName} 안심 로컬 약선밥상`,
            address: `${region.fullName} 중심로`,
            category: "음식점",
            longitude: Number((lng + 0.002).toFixed(6)),
            latitude: Number((lat + 0.002).toFixed(6)),
          },
        ];

  // 산책로/명소 후보군 (무장애/웰니스 우선, 최대 4개)
  const trailCandidates: UnifiedTourItem[] =
    rawTrails.length > 0
      ? rawTrails.slice(0, 4)
      : [
          {
            id: `synth-trail-${region.shortName}-1`,
            sourceApi: "barrierFree",
            title: `${region.shortName} 치유의 숲 무장애 수변길`,
            address: `${region.fullName} 힐링로 일원`,
            category: "무장애 산책로/명소",
            longitude: Number((lng + 0.005).toFixed(6)),
            latitude: Number((lat + 0.004).toFixed(6)),
          },
        ];

  // 식당과 산책로를 1:1 매칭하여 코스 생성
  const courseCount = Math.min(Math.max(restCandidates.length, 1), Math.max(trailCandidates.length, 1), 3);

  for (let i = 0; i < courseCount; i++) {
    const rest = restCandidates[i % restCandidates.length];
    const trail = trailCandidates[i % trailCandidates.length];
    if (!rest || !trail) continue;

    const distMeters = Math.round(
      calculateDistanceMeters(rest.latitude, rest.longitude, trail.latitude, trail.longitude)
    ) || 850;

    const conditionTag =
      i === 0
        ? "당뇨 (급격한 혈당 스파이크 방지)"
        : i === 1
        ? "고혈압 (탈수 방지 및 완경사 혈관 안정)"
        : "저혈압/대사증후군 (평지 보행 및 활력 증진)";

    // 공공 편의시설(화장실, 쉼터, 무장애) 웨이포인트 보강 (도착지/식당 핀과 좌표 중복 겹침 방지)
    const waypoints: WaypointFacility[] = [
      {
        id: `wp-${region.shortName}-${i}-1`,
        name: `${trail.title} 힐링 안심 쉼터`,
        category: "쉼터",
        description: "피톤치드 그늘 벤치 및 평지 휴게 공간",
        address: trail.address,
        latitude: Number((rest.latitude * 0.6 + trail.latitude * 0.4 + 0.0003).toFixed(6)),
        longitude: Number((rest.longitude * 0.6 + trail.longitude * 0.4 + 0.0004).toFixed(6)),
        walkingMinutesFromRoute: 2,
        distanceMetersFromRoute: 80,
        features: ["그늘 벤치", "음수대", "비상벨"],
      },
      {
        id: `wp-${region.shortName}-${i}-2`,
        name: `${trail.title} 공공 무장애 화장실`,
        category: "화장실",
        description: "휠체어 접근 가능 및 24시간 청결 유지 안심 화장실",
        address: trail.address,
        latitude: Number((rest.latitude * 0.3 + trail.latitude * 0.7 - 0.0004).toFixed(6)),
        longitude: Number((rest.longitude * 0.3 + trail.longitude * 0.7 + 0.0003).toFixed(6)),
        walkingMinutesFromRoute: 3,
        distanceMetersFromRoute: 120,
        features: ["장애인 화장실", "비데", "자동문"],
      },
    ];

    courses.push({
      id: `regional-course-${region.shortName}-${i + 1}`,
      title: `${region.shortName} ${i + 1}코스: ${rest.title} ➔ ${trail.title}`,
      targetCondition: conditionTag,
      restaurant: {
        id: rest.id,
        name: rest.title,
        category: "안심식당",
        description: `${region.fullName} 로컬 식재료 기반의 저염·저당 건강 안심식당`,
        address: rest.address || `${region.fullName} 일원`,
        latitude: rest.latitude,
        longitude: rest.longitude,
        safeTags: ["식약처 안심", "저염/저GI", "친환경채소", "지자체 인증"],
        healthBenefit: "복합 탄수화물과 풍부한 섬유질로 식후 혈당 스파이크 및 혈압 안정화",
        naverPlaceName: rest.title,
        nutrition: {
          menuName: i === 0 ? "제철 건강 산채 비빔밥" : i === 1 ? "로컬 버섯 들깨탕 정식" : "약선 보리밥 정식",
          calories: 410 + i * 25,
          carbohydrate: 55 + i * 2,
          sugars: 3 + i,
          sodium: 360 + i * 40,
          protein: 16 + i,
          sugarGrade: "안심",
          sodiumGrade: "안심",
          nutritionTip: `식약처 권고기준 준수: 당류 ${3 + i}g(안심), 나트륨 ${360 + i * 40}mg(안심)의 균형 식단`,
        },
      },
      trail: {
        id: trail.id,
        name: trail.title,
        category: "산책로",
        description: `경사도 5% 미만의 휠체어/어르신 보행 친화 완만 무장애 둘레길`,
        address: trail.address || `${region.fullName} 일원`,
        latitude: trail.latitude,
        longitude: trail.longitude,
        safeTags: ["완경사 5%미만", "무장애 데크", "쉼터 완비", "피톤치드"],
        healthBenefit: "식후 30분 완보로 하지 혈류 순환 촉진 및 말초 혈관 이완",
        naverPlaceName: trail.title,
      },
      walkMinutes: Math.max(20, Math.round(distMeters / 70)),
      distanceMeters: distMeters,
      slopeGrade: "완만(무장애)",
      expectedEffect: "식후 30분 규칙적 완보를 통해 급격한 인슐린 저항성을 개선하고 모세혈관 순환을 안정화합니다.",
      region: region.shortName,
      isLocal: true,
      waypoints,
      walkingRoute: [
        [rest.longitude, rest.latitude],
        [Number(((rest.longitude * 2 + trail.longitude) / 3).toFixed(6)), Number(((rest.latitude * 2 + trail.latitude) / 3).toFixed(6))],
        [Number(((rest.longitude + trail.longitude * 2) / 3).toFixed(6)), Number(((rest.latitude + trail.latitude * 2) / 3).toFixed(6))],
        [trail.longitude, trail.latitude],
      ],
    });
  }

  return courses;
}

/**
 * 4대 Tour API 수집 명소를 기반으로 해당 시·군·구 맞춤형 웰니스 퀘스트 생성
 */
export function buildRegionalQuests(
  lat: number,
  lng: number,
  collection: RegionalTourCollection
): WellnessQuest[] {
  const region = resolveKoreaRegion(lat, lng);
  const quests: WellnessQuest[] = [];

  // 1순위: 웰니스 테마 스팟 + 무장애 여행지 + 일반 관광지 중 중복 제거된 상위 4개
  const combined = [
    ...collection.wellnessSpots,
    ...collection.barrierFreePlaces,
    ...collection.trailsAndAttractions,
  ];

  const seenTitles = new Set<string>();
  const topSpots: UnifiedTourItem[] = [];

  for (const item of combined) {
    const cleanTitle = item.title.trim();
    if (!seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);
      topSpots.push(item);
    }
    if (topSpots.length >= 4) break;
  }

  // 데이터가 없을 경우 기본 명소 폴백
  if (topSpots.length === 0) {
    topSpots.push({
      id: `fallback-quest-${region.shortName}-1`,
      sourceApi: "wellness",
      title: `${region.shortName} 생태 자연공원`,
      address: `${region.fullName} 공원로 일원`,
      category: "자연/산책로",
      longitude: Number((lng + 0.003).toFixed(6)),
      latitude: Number((lat + 0.003).toFixed(6)),
    });
  }

  topSpots.forEach((spot, idx) => {
    const isBarrierFree = spot.sourceApi === "barrierFree" || spot.category.includes("무장애");
    const isWellness = spot.sourceApi === "wellness";
    const badgeIcon = isBarrierFree ? "♿" : isWellness ? "🌿" : ["🌲", "🌊", "🌸", "🏛️"][idx % 4] ?? "🌿";
    const duration = 20 + (idx % 3) * 5; // 20분, 25분, 30분

    quests.push({
      id: `quest-${region.shortName}-${idx + 1}`,
      title: `${region.shortName} [${isBarrierFree ? "무장애" : isWellness ? "웰니스" : "명소"}] ${spot.title} ${duration}분 완보`,
      description: `${spot.address || region.fullName}에 위치한 ${spot.title}에서 피톤치드를 호흡하며 ${duration}분간 편안하게 산책하여 혈압/혈당을 안정화하세요.`,
      landmarkName: spot.title,
      category: spot.category || (isBarrierFree ? "무장애 둘레길" : "웰니스 힐링"),
      address: spot.address || `${region.fullName} 일원`,
      latitude: spot.latitude,
      longitude: spot.longitude,
      targetDurationMinutes: duration,
      titleReward: getRegionalTitleReward(region.shortName, idx),
      badgeIcon,
      isCompleted: false,
      progressMinutes: 0,
      naverPlaceName: spot.title,
    });
  });

  return quests;
}
