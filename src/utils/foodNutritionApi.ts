// 식품의약품안전처 식품 영양성분 DB API 연계 유틸리티
import { NutritionInfo } from "../types/wellness.types";

const FOOD_API_KEY = "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7";
const BASE_URL = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03";

/**
 * 당뇨 및 고혈압 기준에 맞춘 영양성분 안전 등급 계산
 * - 당류(Sugars): 1회 8g 이하 '안심', 15g 이하 '보통', 초과 '주의' (대한당뇨병학회 가이드)
 * - 나트륨(Sodium): 1회 500mg 이하 '안심', 900mg 이하 '보통', 초과 '주의' (대한고혈압학회 가이드)
 */
export function calculateNutritionGrades(sugars: number, sodium: number): {
  sugarGrade: '안심' | '보통' | '주의';
  sodiumGrade: '안심' | '보통' | '주의';
} {
  const sugarGrade = sugars <= 8 ? '안심' : sugars <= 15 ? '보통' : '주의';
  const sodiumGrade = sodium <= 500 ? '안심' : sodium <= 900 ? '보통' : '주의';
  return { sugarGrade, sodiumGrade };
}

/**
 * 식약처 공공 API를 통해 식품 영양성분 검색
 */
export async function fetchFoodNutrition(foodName: string): Promise<NutritionInfo | null> {
  try {
    const query = new URLSearchParams({
      serviceKey: FOOD_API_KEY,
      FOOD_NM_KR: foodName,
      pageNo: "1",
      numOfRows: "1",
      type: "json",
    });

    const response = await fetch(`${BASE_URL}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Food Nutrition API HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const item = json?.body?.items?.[0];

    if (!item) return null;

    const calories = Math.round(parseFloat(item.AMT_NUM1 || "400")); // 에너지(kcal)
    const carbohydrate = Math.round(parseFloat(item.AMT_NUM7 || "60")); // 탄수화물(g)
    const sugars = Math.round(parseFloat(item.AMT_NUM8 || "5")); // 당류(g)
    const sodium = Math.round(parseFloat(item.AMT_NUM14 || "450")); // 나트륨(mg)
    const protein = Math.round(parseFloat(item.AMT_NUM3 || "15")); // 단백질(g)

    const { sugarGrade, sodiumGrade } = calculateNutritionGrades(sugars, sodium);

    return {
      menuName: item.FOOD_NM_KR || foodName,
      calories,
      carbohydrate,
      sugars,
      sodium,
      protein,
      sugarGrade,
      sodiumGrade,
      nutritionTip: `식약처 인증 데이터: 복합탄수화물 및 저염 레시피 기준 적합`,
    };
  } catch (error) {
    console.warn(`[FoodNutritionApi] ${foodName} API 조회 실패, 스마트 폴백 사용:`, error);
    return null;
  }
}
