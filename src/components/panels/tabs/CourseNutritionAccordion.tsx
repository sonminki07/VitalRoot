import React from "react";
import { NutritionInfo } from "../../../types/wellness.types";

interface CourseNutritionAccordionProps {
  courseId: string;
  nutrition: NutritionInfo;
  isExpanded: boolean;
  onToggle: (courseId: string, e: React.MouseEvent) => void;
  isLight: boolean;
}

export function CourseNutritionAccordion({
  courseId,
  nutrition,
  isExpanded,
  onToggle,
  isLight,
}: CourseNutritionAccordionProps) {
  return (
    <div
      onClick={(e) => onToggle(courseId, e)}
      className={`p-2.5 rounded-xl border text-xs sm:text-[13px] cursor-pointer transition-all select-none ${
        isLight
          ? "bg-emerald-100/70 hover:bg-emerald-100 border-emerald-300/80 text-emerald-950"
          : "bg-emerald-950/50 hover:bg-emerald-950/80 border-emerald-500/30 text-emerald-300"
      }`}
      title="클릭하여 상세 영양성분 및 건강 정보 펼치기 / 접기"
    >
      {/* 대표 메뉴명 및 펼침 버튼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">🥗</span>
          <span className="font-extrabold text-xs sm:text-sm break-keep leading-tight">
            {nutrition.menuName}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className="text-[11px] font-semibold text-emerald-400">
            {isExpanded ? "닫기 ▲" : "건강정보 ▼"}
          </span>
        </div>
      </div>

      {/* 접혀 있을 때도 가로 1줄로 깔끔하게 당/나트륨 요약 */}
      {!isExpanded && (
        <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
          <span className="text-emerald-300/90 font-medium">식약처 안심 식단</span>
          <span className={`font-mono font-bold ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
            당 {nutrition.sugars}g 🟢 • 나트륨 {nutrition.sodium}mg 🟢
          </span>
        </div>
      )}

      {/* 펼쳤을 때 하단에 상세 건강 정보 및 영양 가이드 표출 */}
      {isExpanded && (
        <div
          className={`mt-2.5 pt-2 border-t text-[11px] sm:text-xs space-y-2 animate-in fade-in duration-150 ${
            isLight
              ? "border-emerald-300/60 text-slate-700"
              : "border-emerald-500/30 text-emerald-200/90"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-emerald-400">
              당류 {nutrition.sugars}g ({nutrition.sugarGrade || "안심"})
            </span>
            <span className="text-emerald-400">
              나트륨 {nutrition.sodium}mg ({nutrition.sodiumGrade || "안심"})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 font-mono text-center">
            <div>
              <span className="text-[10px] text-gray-400 block">열량</span>
              <strong className="text-emerald-400 font-bold">{nutrition.calories} kcal</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">탄수화물</span>
              <strong className="text-emerald-400 font-bold">{nutrition.carbohydrate}g</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">단백질</span>
              <strong className="text-emerald-400 font-bold">{nutrition.protein}g</strong>
            </div>
          </div>
          <p
            className={`text-[11px] leading-snug flex items-start gap-1 font-medium ${
              isLight ? "text-emerald-950 font-semibold" : "text-emerald-300"
            }`}
          >
            <span>💡</span>
            <span className="break-keep">
              {nutrition.nutritionTip || "식약처 기준 당류 및 나트륨 안심 건강 식단입니다."}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
