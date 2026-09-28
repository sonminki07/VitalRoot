import { useWellnessStore } from "../../../store/wellnessStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Isolated leaf component that subscribes directly to `activeWalkSession`
 * and renders the floating walk session banner over the Naver map.
 * Isolates 1-second timer tick re-renders from `MapContainer`.
 */
export function MapWalkSessionBanner() {
  const { activeWalkSession, cancelWalkSession } = useWellnessStore(
    useShallow((s) => ({
      activeWalkSession: s.activeWalkSession,
      cancelWalkSession: s.cancelWalkSession,
    }))
  );

  if (!activeWalkSession) return null;

  const minutes = Math.floor(activeWalkSession.elapsedSeconds / 60);
  const seconds = (activeWalkSession.elapsedSeconds % 60).toString().padStart(2, "0");
  const targetMinutes = Math.floor(activeWalkSession.targetSeconds / 60);

  return (
    <div className="absolute top-28 sm:top-16 left-1/2 -translate-x-1/2 sm:left-[368px] lg:left-[412px] sm:translate-x-0 z-20 flex items-center gap-2.5 bg-gray-950/95 border border-purple-500/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl text-xs text-white animate-in slide-in-from-top-2 duration-200">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
      <span className="font-bold text-purple-200">
        🏃 {activeWalkSession.targetName}
      </span>
      <span className="font-mono font-bold text-amber-300">
        {minutes}:{seconds} / {targetMinutes}:00
      </span>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          activeWalkSession.isEligible
            ? "bg-amber-500 text-gray-950 animate-bounce"
            : activeWalkSession.isGpsValid
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            : "bg-red-500/20 text-red-300 border border-red-500/40"
        }`}
      >
        {activeWalkSession.isEligible
          ? "🏅 완보 자격 획득!"
          : activeWalkSession.isGpsValid
          ? "현장 체류 정상"
          : "500m 이탈"}
      </span>
      <button
        type="button"
        onClick={cancelWalkSession}
        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-xs shrink-0 ml-1 font-bold transition-colors cursor-pointer"
        title="도보 완보 세션 닫기/종료"
      >
        ✕
      </button>
    </div>
  );
}
