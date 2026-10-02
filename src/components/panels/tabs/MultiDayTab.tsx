import { MultiDayCourseSet } from "../../../types/wellness.types";
import { getNaverMapDetailUrl } from "../../../utils/naverMapUtils";

interface MultiDayTabProps {
  multiDayCourses: MultiDayCourseSet[];
  activeMultiDayCourseId: string | null;
  onSelectMultiDayCourse: (id: string) => void;
  isLight: boolean;
}

export function MultiDayTab({
  multiDayCourses,
  activeMultiDayCourseId,
  onSelectMultiDayCourse,
}: MultiDayTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>국가 공인 1박 2일 웰니스 코스</span>
        <span className="text-emerald-400 font-semibold">
          {multiDayCourses.length}개 프로그램
        </span>
      </div>

      {multiDayCourses.map((mc) => {
        const isSelected = mc.id === activeMultiDayCourseId;
        return (
          <div
            key={mc.id}
            onClick={() => onSelectMultiDayCourse(mc.id)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "border-emerald-500/70 bg-emerald-950/30 shadow-lg shadow-emerald-950/50"
                : "border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20"
            } space-y-3`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  {mc.duration} 프로그램
                </span>
                <span className="text-[11px] text-gray-400">
                  {mc.targetCondition}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white leading-snug">
                {mc.title}
              </h3>
            </div>

            {/* 연계 안심 숙소 카드 */}
            <div className="p-3 rounded-xl bg-gray-900/80 border border-teal-500/40 space-y-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                <span>🏨</span>
                <span>연계 안심 숙박 (취사 & 인슐린 보관)</span>
              </span>
              <h4 className="font-semibold text-xs text-white">
                {mc.stay.name}
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {mc.stay.description}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {mc.stay.safeBadges.map((badge: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-teal-950/60 border border-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px]">
                <span className="text-gray-500">문의: {mc.stay.contact}</span>
                <a
                  href={getNaverMapDetailUrl(mc.stay)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  네이버 검색 ➔
                </a>
              </div>
            </div>

            {/* 1일차 & 2일차 스텝 타임라인 */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-bold text-gray-300">
                일정별 세부 코스 브레이크다운
              </h4>
              {mc.days.map((day: { day: number; title: string; description: string; steps: { type: string; name: string; description: string }[] }) => (
                <div
                  key={day.day}
                  className="bg-gray-900/50 p-2.5 rounded-lg border border-gray-800 space-y-2"
                >
                  <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600/40 flex items-center justify-center text-[10px] text-white font-bold">
                      {day.day}
                    </span>
                    <span>{day.title}</span>
                  </div>
                  <div className="space-y-1.5 pl-2 border-l-2 border-emerald-800/50 ml-2">
                    {day.steps.map((step: { type: string; name: string; description: string }, sIdx: number) => (
                      <div key={sIdx} className="text-xs">
                        <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                          <span className="text-[11px] text-gray-400">
                            [{step.type}]
                          </span>
                          <span>{step.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 pl-4">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
