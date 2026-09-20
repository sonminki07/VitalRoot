import { useState } from "react";
import { useWellnessStore, checkIsOnboardingComplete } from "../../store/wellnessStore";

export function HealthProfileAlertBanner() {
  const { profile, openOnboardingModal } = useWellnessStore();
  const [isMinimized, setIsMinimized] = useState(
    typeof window !== "undefined" && window.innerWidth < 1280
  );

  const isComplete = checkIsOnboardingComplete(profile);

  // 온보딩이 완료된 상태면 알림을 노출하지 않음
  if (isComplete) return null;

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
    <div className="fixed bottom-24 sm:bottom-24 right-3 sm:right-4 z-40 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      {isMinimized ? (
        // 최소화된 펄스 뱃지 (지도 조작 방해 최소화하면서도 눈에 띄게 지속 유지)
        <button
          onClick={() => {
            setIsMinimized(false);
            openOnboardingModal();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/90 hover:bg-amber-500 text-gray-950 font-bold text-xs shadow-2xl border-2 border-amber-300 animate-pulse transition-all active:scale-95"
          title="클릭하여 건강 프로필을 완성하세요"
        >
          <span className="text-sm">⚠️</span>
          <span>건강설정 미완료 ({completedCount}/3)</span>
          <span className="text-[10px] bg-gray-950/20 px-1.5 py-0.5 rounded">설정하기 ➔</span>
        </button>
      ) : (
        // 카드형 알림 토스트
        <div className="bg-gray-950/95 border-2 border-amber-500/90 rounded-2xl p-3.5 sm:p-4 text-white shadow-2xl backdrop-blur-md space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce">⚠️</span>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-amber-300">
                  맞춤 건강 프로필 미완료 ({completedCount}/3)
                </h4>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  기저질환과 의약품 정보가 등록되지 않으면 맞춤 외식/보행로를 추천할 수 없습니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-white text-xs p-1 rounded hover:bg-gray-800 shrink-0"
              title="최소화"
            >
              ━
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-1">
            <div
              className={`p-1 rounded ${
                hasConditions
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              1. 질환 {hasConditions ? "완료" : "미입력"}
            </div>
            <div
              className={`p-1 rounded ${
                hasMeds
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              2. 약물 {hasMeds ? "완료" : "미입력"}
            </div>
            <div
              className={`p-1 rounded ${
                hasFitness
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              3. 체력 {hasFitness ? "완료" : "미입력"}
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200"
            >
              접어두기
            </button>
            <button
              onClick={openOnboardingModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              <span>👉 지금 설정하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
