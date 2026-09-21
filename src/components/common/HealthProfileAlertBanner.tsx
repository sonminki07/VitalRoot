import { useState } from "react";
import { useWellnessStore, checkIsOnboardingComplete } from "../../store/wellnessStore";

export function HealthProfileAlertBanner() {
  const { profile, openOnboardingModal, themeMode } = useWellnessStore();
  const isLight = themeMode === "light";
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isComplete = checkIsOnboardingComplete(profile);

  // 온보딩이 완료되었거나 사용자가 닫기(X)를 누른 경우 노출하지 않음
  if (isComplete || isDismissed) return null;

  // 현재 완료된 스텝 계산
  const hasConditions = Boolean(profile.chronicConditions && profile.chronicConditions.length > 0);
  const hasMeds = Boolean(
    profile.hasNoMedications || (profile.medications && profile.medications.length > 0)
  );
  const hasFitness = Boolean(
    profile.walkFitnessLevel || (profile.requiredInfra && profile.requiredInfra.length > 0)
  );

  const completedCount = [hasConditions, hasMeds, hasFitness].filter(Boolean).length;

  return (
    <div className="relative shrink-0 z-30">
      {/* 상단 컨트롤 바 버튼과 완벽하게 일치하는 펄스 알림 뱃지 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-xl border-2 border-amber-400 transition-all active:scale-95 cursor-pointer ${
            isExpanded
              ? "bg-amber-500 text-gray-950"
              : isLight
              ? "bg-amber-500/85 hover:bg-amber-500 text-gray-950 animate-pulse"
              : "bg-amber-500/85 hover:bg-amber-500 text-gray-950 animate-pulse"
          }`}
          title="클릭하여 맞춤 건강 프로필 상태 확인 및 설정"
        >
          <span className="text-xs">⚠️</span>
          <span className="hidden xl:inline">건강 프로필 미완료 ({completedCount}/3)</span>
          <span className="xl:hidden">미완료 ({completedCount}/3)</span>
          <span className="text-[10px] font-mono">{isExpanded ? "▲" : "▼"}</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className={`w-7 h-7 flex items-center justify-center rounded-xl text-xs font-bold border shadow-md transition-all shrink-0 cursor-pointer ${
            isLight
              ? "bg-white/90 hover:bg-white text-slate-500 hover:text-slate-900 border-slate-300"
              : "bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-700"
          }`}
          title="알림 완전히 닫기"
        >
          ✕
        </button>
      </div>

      {/* 펼쳤을 때 하단에 표출되는 반투명(transparent) 경고 카드 (지도를 가리지 않음) */}
      {isExpanded && (
        <div
          className={`absolute top-full mt-2 right-0 z-50 w-72 sm:w-84 border-2 border-amber-400/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isLight
              ? "bg-white/60 hover:bg-white/90 text-slate-900"
              : "bg-gray-950/60 hover:bg-gray-950/90 text-white"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <h4 className={`font-bold text-xs sm:text-sm ${isLight ? "text-amber-800" : "text-amber-300"}`}>
                  맞춤 건강 프로필 미완료 ({completedCount}/3)
                </h4>
                <p className={`text-[11px] mt-0.5 leading-snug ${isLight ? "text-slate-700" : "text-gray-200"}`}>
                  기저질환과 의약품 정보가 등록되지 않으면 맞춤 외식/보행로를 추천할 수 없습니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white text-xs p-1 rounded hover:bg-gray-800/60 font-bold cursor-pointer"
              title="접어두기"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-1">
            <div
              className={`p-1 rounded font-medium ${
                hasConditions
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/30 text-red-300 border border-red-500/40"
              }`}
            >
              1. 질환 {hasConditions ? "완료" : "미입력"}
            </div>
            <div
              className={`p-1 rounded font-medium ${
                hasMeds
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/30 text-red-300 border border-red-500/40"
              }`}
            >
              2. 약물 {hasMeds ? "완료" : "미입력"}
            </div>
            <div
              className={`p-1 rounded font-medium ${
                hasFitness
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/30 text-red-300 border border-red-500/40"
              }`}
            >
              3. 체력 {hasFitness ? "완료" : "미입력"}
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className={`px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-900" : "text-gray-300 hover:text-white"}`}
            >
              접어두기
            </button>
            <button
              onClick={openOnboardingModal}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>👉 지금 설정하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
