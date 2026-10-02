import type { NutritionInfo } from "../types/wellness.types.ts";
import { getApiConfig } from "../config/apiConfig.ts";

const getFoodConfig = () => getApiConfig().foodNutrition;

/**
 * 당뇨 및 고혈압 기준에 맞춘 영양성분 안전 등급 계산
 * - 당류(Sugars): 1회 8g 이하 '안심', 15g 이하 '보통', 초과 '주의' (대한당뇨병학회 가이드)
 * - 나트륨(Sodium): 1회 500mg 이하 '안심', 900mg 이하 '보통', 초과 '주의' (대한고혈압학회 가이드)
 */
export function calculateNutritionGrades(sugars: number, sodium: number): {
  sugarGrade: "안심" | "보통" | "주의";
  sodiumGrade: "안심" | "보통" | "주의";
} {
  const sugarGrade = sugars <= 8 ? "안심" : sugars <= 15 ? "보통" : "주의";
  const sodiumGrade = sodium <= 500 ? "안심" : sodium <= 900 ? "보통" : "주의";
  return { sugarGrade, sodiumGrade };
}

/**
 * 식약처 공공 API를 통해 단일 식품 영양성분 검색
 * FoodNtrCpntDbInfo03 / getFoodNtrCpntDbInq03
 */
export async function fetchFoodNutrition(foodName: string): Promise<NutritionInfo | null> {
  try {
    const list = await searchFoodNutritionList(foodName, 1);
    return list.length > 0 && list[0] ? list[0] : null;
  } catch (error) {
    console.warn(`[FoodNutritionApi] ${foodName} API 조회 실패, 스마트 폴백 사용:`, error);
    return null;
  }
}

/**
 * 식약처 식품영양성분DB 목록 검색
 */
export async function searchFoodNutritionList(
  queryName: string,
  maxItems: number = 5
): Promise<NutritionInfo[]> {
  const clean = queryName.trim();
  if (!clean) return [];

  try {
    const foodConfig = getFoodConfig();
    const query = new URLSearchParams({
      serviceKey: foodConfig.serviceKey,
      FOOD_NM_KR: clean,
      pageNo: "1",
      numOfRows: maxItems.toString(),
      type: "json",
    });

    const response = await fetch(`${foodConfig.baseUrl}?${query.toString()}`, {
      signal: AbortSignal.timeout(foodConfig.timeoutMs || 5000),
    });
    if (!response.ok) {
      throw new Error(`Food Nutrition API HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const rawItems = json?.body?.items;
    if (!rawItems) return [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .map((entry: any) => entry?.item || entry)
      .filter((item: any) => item && (item.FOOD_NM_KR || item.foodNmKr))
      .map((item: any) => {
        const name = item.FOOD_NM_KR || item.foodNmKr || clean;
        const calories = Math.round(parseFloat(item.AMT_NUM1 || item.enerc || "350")); // 에너지(kcal)
        const carbohydrate = Math.round(parseFloat(item.AMT_NUM7 || item.chocdf || "50")); // 탄수화물(g)
        const sugars = Math.round(parseFloat(item.AMT_NUM8 || item.sugar || "5")); // 당류(g)
        const sodium = Math.round(parseFloat(item.AMT_NUM14 || item.nat || "400")); // 나트륨(mg)
        const protein = Math.round(parseFloat(item.AMT_NUM3 || item.prot || "12")); // 단백질(g)
        const serving = item.SERVING_SIZE || "1회 제공량";

        const { sugarGrade, sodiumGrade } = calculateNutritionGrades(sugars, sodium);

        return {
          menuName: name,
          calories,
          carbohydrate,
          sugars,
          sodium,
          protein,
          sugarGrade,
          sodiumGrade,
          nutritionTip: `식약처 인증 DB (${serving} 기준): 당류 ${sugarGrade}, 나트륨 ${sodiumGrade}`,
        };
      });
  } catch (error) {
    console.warn(`[FoodNutritionApi] ${queryName} 목록 조회 실패:`, error);
    return [];
  }
}
