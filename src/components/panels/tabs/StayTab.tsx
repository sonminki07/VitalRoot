import { WellnessStay } from "../../../types/wellness.types";
import { getNaverMapDetailUrl } from "../../../utils/naverMapUtils";

interface StayTabProps {
  filteredStays: WellnessStay[];
  activeStayId: string | null;
  stayFilter: {
    chkcooking: boolean;
    roomrefrigerator: boolean;
    fitness: boolean;
  };
  onToggleStayFilter: (filterKey: "chkcooking" | "roomrefrigerator" | "fitness") => void;
  onSelectStay: (id: string) => void;
  isLight: boolean;
}

export function StayTab({
  filteredStays,
  activeStayId,
  stayFilter,
  onToggleStayFilter,
  onSelectStay,
}: StayTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-2">
          🏨 헬스케어 맞춤 숙소 필터
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onToggleStayFilter("chkcooking")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              stayFilter.chkcooking
                ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                : "bg-gray-800/60 border-gray-700 text-gray-400"
            }`}
          >
            {stayFilter.chkcooking ? "✓ " : "+ "}🍳 객실 내 취사
          </button>
          <button
            onClick={() => onToggleStayFilter("roomrefrigerator")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              stayFilter.roomrefrigerator
                ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                : "bg-gray-800/60 border-gray-700 text-gray-400"
            }`}
          >
            {stayFilter.roomrefrigerator ? "✓ " : "+ "}❄️ 인슐린 냉장고
          </button>
          <button
            onClick={() => onToggleStayFilter("fitness")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              stayFilter.fitness
                ? "bg-teal-500/20 border-teal-500 text-teal-300 font-semibold"
                : "bg-gray-800/60 border-gray-700 text-gray-400"
            }`}
          >
            {stayFilter.fitness ? "✓ " : "+ "}🏋️ 피트니스 센터
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>안심 숙박 시설 목록</span>
          <span className="text-teal-400 font-semibold">
            {filteredStays.length}곳
          </span>
        </div>

        {filteredStays.map((stay) => {
          const isSelected = stay.id === activeStayId;
          return (
            <div
              key={stay.id}
              onClick={() => onSelectStay(stay.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? "bg-teal-950/40 border-teal-500/80 shadow-lg shadow-teal-950/50"
                  : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-bold text-xs text-white">
                  {stay.name}
                </h4>
              </div>
              <p className="text-[11px] text-gray-400">{stay.address}</p>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                {stay.description}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {stay.safeBadges.map((b: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] bg-teal-950/70 border border-teal-500/40 text-teal-200 px-1.5 py-0.5 rounded"
                  >
                    {b}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  📞 {stay.contact || "문의 예약 가능"}
                </span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={getNaverMapDetailUrl(stay)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 bg-[#03C75A] text-white rounded text-[10px] font-bold"
                  >
                    네이버 상세
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStay(stay.id);
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    지도 위치 ➔
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
