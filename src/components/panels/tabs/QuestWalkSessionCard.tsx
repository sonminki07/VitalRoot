import { useWellnessStore } from "../../../store/wellnessStore";
import { useShallow } from "zustand/react/shallow";
import { WellnessQuest } from "../../../types/wellness.types";

function formatTimerSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface QuestWalkSessionCardProps {
  quest: WellnessQuest;
}

/**
 * Isolated leaf component that subscribes directly to `activeWalkSession`
 * and renders the active timer progress bar and action buttons.
 * Isolates 1-second timer tick re-renders from `ControlPanel` and `QuestTab`.
 */
export function QuestWalkSessionCard({ quest }: QuestWalkSessionCardProps) {
  const {
    activeWalkSession,
    cancelWalkSession,
    claimQuestTitle,
    fastForwardWalkSession,
  } = useWellnessStore(
    useShallow((s) => ({
      activeWalkSession: s.activeWalkSession,
      cancelWalkSession: s.cancelWalkSession,
      claimQuestTitle: s.claimQuestTitle,
      fastForwardWalkSession: s.fastForwardWalkSession,
    }))
  );

  if (!activeWalkSession || activeWalkSession.questId !== quest.id) {
    return null;
  }

  return (
    <>
      {/* 실시간 진행 중 위젯 */}
      <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 space-y-2 animate-in fade-in duration-200">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-purple-300 font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            실시간 완보 시간 측정 중
          </span>
          <span className="font-mono font-bold text-amber-300">
            {formatTimerSeconds(activeWalkSession.elapsedSeconds)} /{" "}
            {formatTimerSeconds(activeWalkSession.targetSeconds)}
          </span>
        </div>

        {/* 타이머 진행바 */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-teal-400 to-emerald-400 transition-all duration-300"
            style={{
              width: `${Math.min(
                100,
                (activeWalkSession.elapsedSeconds /
                  activeWalkSession.targetSeconds) *
                  100
              )}%`,
            }}
          />
        </div>

        {/* GPS 상태 & 시연용 임시 가속 버튼 */}
        <div className="flex items-center justify-between text-[10px] pt-0.5">
          <span
            className={
              activeWalkSession.isGpsValid
                ? "text-emerald-300 font-medium"
                : "text-amber-300 font-medium"
            }
          >
            {activeWalkSession.isGpsValid
              ? `🟢 현장 체류 인증 완료 (${activeWalkSession.distanceMeters}m)`
              : `⚠️ 현장 500m 이탈 (${activeWalkSession.distanceMeters}m)`}
          </span>

          {/* === [DEMO_ACCELERATOR: 시연/심사용 임시 가속 버튼 - 차후 즉시 삭제 가능] === */}
          {!activeWalkSession.isEligible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fastForwardWalkSession();
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border border-amber-400/40 font-bold transition-colors cursor-pointer"
              title="심사 및 시연용: 목표 완보 시간을 즉시 충족하고 완보 자격을 부여합니다"
            >
              ⚡ 즉시 완보 자격 획득 (시연용 가속)
            </button>
          )}
        </div>
      </div>

      {/* 퀘스트 하단 액션 버튼 */}
      {activeWalkSession.isEligible ? (
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelWalkSession();
            }}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              claimQuestTitle(quest.id);
            }}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-gray-950 font-black text-xs rounded-xl shadow-xl animate-bounce border-2 border-amber-300 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🏅</span>
            <span>완보 자격 획득! 칭호 획득하기</span>
          </button>
        </div>
      ) : (
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelWalkSession();
            }}
            className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
          >
            도전 취소 ✕
          </button>
          <span className="text-[11px] text-gray-400 font-medium animate-pulse">
            목표 시간까지 현장 완보 진행 중...
          </span>
        </div>
      )}
    </>
  );
}
