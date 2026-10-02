// VitalRoot 공공데이터 7대 API 실시간 상태 진단 및 무결성 검증 엔진
import { getApiConfig } from "../config/apiConfig";
import {
  fetchKorTourPlaces,
  fetchBarrierFreePlaces,
  fetchMedicalTourPlaces,
  fetchWellnessTourPlaces,
} from "./tourApi";
import { searchMedicationsLiveOnly, checkLiveDurWarnings } from "./durService";
import { fetchFoodNutrition } from "./foodNutritionApi";

export interface ApiTestResult {
  apiName: string;
  serviceKeySnippet: string;
  endpoint: string;
  status: "SUCCESS" | "WARN" | "FAIL";
  httpStatus?: number;
  responseTimeMs: number;
  totalCount?: number;
  sampleTitleOrName?: string;
  details?: string;
}

export interface ApiDiagnosticsReport {
  timestamp: string;
  overallStatus: "ALL_PASSED" | "PARTIAL_SUCCESS" | "FAILED";
  results: ApiTestResult[];
}

/**
 * 7대 공공데이터 API 종합 실시간 기능 검증 진단기
 */
export async function runApiDiagnostics(): Promise<ApiDiagnosticsReport> {
  const config = getApiConfig();
  const maskKey = (k: string) => (k ? `${k.substring(0, 6)}...${k.substring(k.length - 4)}` : "(비어있음)");
  const results: ApiTestResult[] = [];

  // 서울 시청 좌표 기준 테스트 (위도: 37.5665, 경도: 126.9780)
  const TEST_LNG = 126.9780;
  const TEST_LAT = 37.5665;

  // 1. 한국관광공사국문 관광정보 서비스_GW (KorService2)
  const t1Start = performance.now();
  try {
    const items = await fetchKorTourPlaces(TEST_LNG, TEST_LAT, 5000, "39", 3);
    const elapsed = Math.round(performance.now() - t1Start);
    results.push({
      apiName: "한국관광공사국문 관광정보 서비스_GW",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.kor}/locationBasedList2`,
      status: items.length > 0 ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: items.length,
      sampleTitleOrName: items[0]?.title || "수신 데이터 없음",
      details: items.length > 0 ? `정상 수신 (${items.length}건)` : "응답 데이터 0건",
    });
  } catch (err: any) {
    results.push({
      apiName: "한국관광공사국문 관광정보 서비스_GW",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.kor}/locationBasedList2`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t1Start),
      details: err?.message || String(err),
    });
  }

  // 2. 한국관광공사무장애 여행 정보 (KorWithService2)
  const t2Start = performance.now();
  try {
    const items = await fetchBarrierFreePlaces(TEST_LNG, TEST_LAT, 5000, 3);
    const elapsed = Math.round(performance.now() - t2Start);
    results.push({
      apiName: "한국관광공사무장애 여행 정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.barrierFree}/locationBasedList2`,
      status: items.length > 0 ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: items.length,
      sampleTitleOrName: items[0]?.title || "수신 데이터 없음",
      details: items.length > 0 ? `정상 수신 (${items.length}건)` : "응답 데이터 0건",
    });
  } catch (err: any) {
    results.push({
      apiName: "한국관광공사무장애 여행 정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.barrierFree}/locationBasedList2`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t2Start),
      details: err?.message || String(err),
    });
  }

  // 3. 한국관광공사웰니스관광정보 (WellnessTursmService)
  const t3Start = performance.now();
  try {
    const items = await fetchWellnessTourPlaces(TEST_LNG, TEST_LAT, 25000, 3);
    const elapsed = Math.round(performance.now() - t3Start);
    results.push({
      apiName: "한국관광공사웰니스관광정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.wellness}/locationBasedList`,
      status: items.length > 0 ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: items.length,
      sampleTitleOrName: items[0]?.title || "수신 데이터 없음",
      details: items.length > 0 ? `정상 수신 (${items.length}건, 테마: ${items[0]?.category})` : "응답 데이터 0건",
    });
  } catch (err: any) {
    results.push({
      apiName: "한국관광공사웰니스관광정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.wellness}/locationBasedList`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t3Start),
      details: err?.message || String(err),
    });
  }

  // 4. 한국관광공사의료관광정보 (MdclTursmService)
  const t4Start = performance.now();
  try {
    const items = await fetchMedicalTourPlaces(TEST_LNG, TEST_LAT, 25000, 3);
    const elapsed = Math.round(performance.now() - t4Start);
    results.push({
      apiName: "한국관광공사의료관광정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.medical}/locationBasedList`,
      status: items.length > 0 ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: items.length,
      sampleTitleOrName: items[0]?.title || "수신 데이터 없음",
      details: items.length > 0 ? `정상 수신 (${items.length}건)` : "응답 데이터 0건",
    });
  } catch (err: any) {
    results.push({
      apiName: "한국관광공사의료관광정보",
      serviceKeySnippet: maskKey(config.tourApi.serviceKey),
      endpoint: `${config.tourApi.baseUrl}${config.tourApi.endpoints.medical}/locationBasedList`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t4Start),
      details: err?.message || String(err),
    });
  }

  // 5. [개발계정]식품의약품안전처_묶음의약품정보서비스 (DrbBundleInfoService02)
  const t5Start = performance.now();
  try {
    const items = await searchMedicationsLiveOnly("아스피린", 3);
    const elapsed = Math.round(performance.now() - t5Start);
    results.push({
      apiName: "[개발계정]식품의약품안전처_묶음의약품정보서비스",
      serviceKeySnippet: maskKey(config.dur.serviceKey),
      endpoint: `${config.dur.bundleEndpoint}${config.dur.operations.bundleList}`,
      status: items.length > 0 ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: items.length,
      sampleTitleOrName: items[0]?.name || "수신 데이터 없음",
      details: items.length > 0
        ? `실시간 품목 검색 성공 (${items.length}건, ${items[0]?.name})`
        : "응답 데이터 0건 (로컬 마스터 폴백 준비됨)",
    });
  } catch (err: any) {
    results.push({
      apiName: "[개발계정]식품의약품안전처_묶음의약품정보서비스",
      serviceKeySnippet: maskKey(config.dur.serviceKey),
      endpoint: `${config.dur.bundleEndpoint}${config.dur.operations.bundleList}`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t5Start),
      details: err?.message || String(err),
    });
  }

  // 6. 식품의약품안전처의약품안전사용서비스(DUR)성분정보 (DURIrdntInfoService03)
  const t6Start = performance.now();
  try {
    const { analysis, warningTags, isLiveSuccess, totalHits } = await checkLiveDurWarnings("아토르바스타틴");
    const elapsed = Math.round(performance.now() - t6Start);
    results.push({
      apiName: "식품의약품안전처의약품안전사용서비스(DUR)성분정보",
      serviceKeySnippet: maskKey(config.dur.serviceKey),
      endpoint: `${config.dur.ingredientEndpoint}/get*TabooInfoList02`,
      status: isLiveSuccess ? "SUCCESS" : "FAIL",
      responseTimeMs: elapsed,
      totalCount: totalHits,
      sampleTitleOrName: warningTags.join(", ") || "주의 태그 없음 (안전)",
      details: isLiveSuccess
        ? `아토르바스타틴 점검 성공: ${warningTags.join(", ")} (임부금기: ${analysis.pwnmTaboo.length}건, 노인주의: ${analysis.odsnAtent.length}건)`
        : "실시간 DUR API 응답 없음 (연결 실패)",
    });
  } catch (err: any) {
    results.push({
      apiName: "식품의약품안전처의약품안전사용서비스(DUR)성분정보",
      serviceKeySnippet: maskKey(config.dur.serviceKey),
      endpoint: `${config.dur.ingredientEndpoint}/get*TabooInfoList02`,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t6Start),
      details: err?.message || String(err),
    });
  }

  // 7. 식품의약안전처식품영양성분DB정보 (FoodNtrCpntDbInfo03)
  const t7Start = performance.now();
  try {
    const item = await fetchFoodNutrition("비빔밥");
    const elapsed = Math.round(performance.now() - t7Start);
    results.push({
      apiName: "식품의약안전처식품영양성분DB정보",
      serviceKeySnippet: maskKey(config.foodNutrition.serviceKey),
      endpoint: config.foodNutrition.baseUrl,
      status: item ? "SUCCESS" : "WARN",
      responseTimeMs: elapsed,
      totalCount: item ? 1 : 0,
      sampleTitleOrName: item?.menuName || "수신 데이터 없음",
      details: item ? `열량: ${item.calories}kcal, 당류: ${item.sugars}g(${item.sugarGrade}), 나트륨: ${item.sodium}mg(${item.sodiumGrade})` : "조회 실패 (폴백 가동)",
    });
  } catch (err: any) {
    results.push({
      apiName: "식품의약안전처식품영양성분DB정보",
      serviceKeySnippet: maskKey(config.foodNutrition.serviceKey),
      endpoint: config.foodNutrition.baseUrl,
      status: "FAIL",
      responseTimeMs: Math.round(performance.now() - t7Start),
      details: err?.message || String(err),
    });
  }

  const failCount = results.filter((r) => r.status === "FAIL").length;
  const overallStatus = failCount === 0 ? "ALL_PASSED" : failCount === results.length ? "FAILED" : "PARTIAL_SUCCESS";

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    results,
  };
}
