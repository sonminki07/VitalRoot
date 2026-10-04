import { WellnessQuest } from "../../../types/wellness.types";
import { QuestWalkSessionCard } from "./QuestWalkSessionCard";
import { getCategoryPlaceholder } from "../../../utils/placePlaceholders";

interface QuestTabProps {
  quests: WellnessQuest[];
  activeQuestId: string | null;
  activeQuestSessionId: string | null;
  earnedTitles: string[];
  equippedTitle: string | null;
  currentRegionName: string;
  isRegionLoading: boolean;
  onSelectQuest: (id: string) => void;
  onStartWalkSession: (id: string) => void;
  onEquipTitle: (title: string) => void;
}

export function QuestTab({
  quests,
  activeQuestId,
  activeQuestSessionId,
  earnedTitles,
  equippedTitle,
  currentRegionName,
  isRegionLoading,
  onSelectQuest,
  onStartWalkSession,
  onEquipTitle,
}: QuestTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 내 획득 칭호 보관함 및 칭호 장착(Equip) 영역 */}
      <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-purple-950/30 border border-amber-500/30 rounded-2xl space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>👑</span>
            <span>내 획득 웰니스 칭호</span>
          </span>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            {earnedTitles.length}개 보유
          </span>
        </div>

        {earnedTitles.length === 0 ? (
          <p className="text-[11px] text-gray-400">
            아직 획득한 칭호가 없습니다. 명소 산책 퀘스트를 완보해보세요!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {earnedTitles.map((title, idx) => {
              const isEquipped = equippedTitle === title;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onEquipTitle(title)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl font-bold transition-all active:scale-95 border ${
                    isEquipped
                      ? "bg-emerald-600 text-white border-emerald-300 shadow-md ring-2 ring-emerald-400/50 scale-105"
                      : "bg-gray-900/80 hover:bg-gray-800 text-amber-200 border-amber-500/40 hover:border-amber-300"
                  }`}
                  title={isEquipped ? "클릭하여 칭호 장착 해제" : "클릭하여 이 칭호 장착"}
                >
                  <span>🏅</span>
                  <span>{title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isEquipped
                        ? "bg-emerald-950 text-emerald-200"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {isEquipped ? "장착 중 ✓" : "장착"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 퀘스트 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-[10px] shrink-0">
              📍 {currentRegionName}
            </span>
            <span className="font-semibold text-gray-200 truncate">근접 명소 완보 퀘스트</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hidden sm:inline">
              TourAPI 연계
            </span>
          </div>
          <span className="text-purple-400 font-semibold text-[11px] shrink-0">
            {isRegionLoading ? "TourAPI 조회 중..." : `${quests.length}개 챌린지`}
          </span>
        </div>

        {quests.map((q) => {
          const isSelected = q.id === activeQuestId;
          const isCurrentSession = activeQuestSessionId === q.id;
          const distLabel =
            typeof q.distanceMeters === "number"
              ? q.distanceMeters < 1000
                ? `${q.distanceMeters}m`
                : `${(q.distanceMeters / 1000).toFixed(1)}km`
              : null;

          return (
            <div
              key={q.id}
              onClick={() => onSelectQuest(q.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                isSelected
                  ? "bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/30"
                  : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={q.imageUrl || getCategoryPlaceholder("관광지", q.landmarkName)}
                    alt={q.landmarkName}
                    className="w-10 h-10 rounded-xl object-cover border border-purple-500/30 shrink-0"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getCategoryPlaceholder("관광지", q.landmarkName);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-white truncate">
                        {q.landmarkName}
                      </h4>
                      {distLabel && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                          {distLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 truncate mt-0.5">
                      <span className="text-indigo-400 font-medium">공공 TourAPI</span>
                      <span>•</span>
                      <span className="truncate">{q.address}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    q.isCompleted
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : isCurrentSession
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  }`}
                >
                  {q.isCompleted
                    ? "완보 완료 ✅"
                    : isCurrentSession
                    ? "완보 진행 중 🚶"
                    : "도전 가능 🏃"}
                </span>
              </div>

              <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-2">
                {q.description}
              </p>

              <div className="flex items-center justify-between text-[11px] p-2 bg-gray-900/60 rounded-xl border border-gray-800">
                <span className="text-gray-400">
                  목표: 도보 {q.targetDurationMinutes}분 완보
                </span>
                <span className="text-amber-300 font-bold">
                  🏅 {q.titleReward}
                </span>
              </div>

              {/* 실시간 진행 중 위젯 및 세션 액션 버튼 */}
              {isCurrentSession ? (
                <QuestWalkSessionCard quest={q} />
              ) : q.isCompleted ? (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectQuest(q.id);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    명소 위치 ➔
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 text-emerald-400/80 cursor-default border border-emerald-500/30"
                  >
                    완보 완료 ✅ (칭호 보유)
                  </button>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectQuest(q.id);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    명소 위치 ➔
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartWalkSession(q.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>⏱️</span>
                    <span>도보 완보 시작 ({q.targetDurationMinutes}분)</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
