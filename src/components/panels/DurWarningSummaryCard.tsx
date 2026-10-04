import { useState } from "react";
import { MedicationItem } from "../../types/wellness.types";

interface DurWarningSummaryCardProps {
  medications: MedicationItem[];
  isLight: boolean;
  onOpenSettingsModal: (tab?: "health" | "travel" | "system") => void;
}

export function DurWarningSummaryCard({
  medications,
  isLight,
  onOpenSettingsModal,
}: DurWarningSummaryCardProps) {
  const [selectedMed, setSelectedMed] = useState<MedicationItem | null>(null);

  const durMeds = (medications || []).filter(
    (m) => m.durWarningTags && m.durWarningTags.length > 0
  );

  if (durMeds.length === 0) return null;

  return (
    <>
      {/* 식약처 DUR 복약 안전 주의보 상시 노출 요약 카드 (TC-07) */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          isLight
            ? "bg-gradient-to-r from-red-50 to-amber-50/70 border-red-200 text-slate-800 shadow-sm"
            : "bg-gradient-to-r from-red-950/50 via-amber-950/40 to-gray-900 border-red-500/50 text-white shadow-md shadow-red-950/30"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base animate-pulse">⚠️</span>
            <h4
              className={`font-bold text-xs sm:text-sm ${
                isLight ? "text-red-900 font-extrabold" : "text-red-300 font-extrabold"
              }`}
            >
              내 복용약 DUR 안전 주의보
            </h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              isLight
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-red-500/20 text-red-300 border-red-500/40"
            }`}
          >
            식약처 인증 ({durMeds.length}건 주의)
          </span>
        </div>

        <p
          className={`text-[11px] leading-relaxed mb-2.5 ${
            isLight ? "text-slate-600" : "text-gray-300"
          }`}
        >
          등록하신 의약품 중 식약처 DUR 주의(임부금기, 노인주의 등) 항목이 감지되었습니다. 뱃지를 클릭하여 주의사항을 확인하세요.
        </p>

        {/* 주의 약물 및 뱃지 목록 */}
        <div className="space-y-1.5">
          {durMeds.map((med) => (
            <div
              key={med.id}
              onClick={() => setSelectedMed(med)}
              className={`p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all active:scale-[0.98] ${
                isLight
                  ? "bg-white/95 hover:bg-white border-red-200 hover:border-red-400 shadow-2xs"
                  : "bg-gray-950/70 hover:bg-gray-900 border-gray-800 hover:border-red-500/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs">💊</span>
                  <span className="font-bold text-xs truncate">{med.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                  {med.timing}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {med.durWarningTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded border shadow-xs ${
                      tag.includes("금기")
                        ? isLight
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-red-600/30 text-red-300 border-red-500/70"
                        : isLight
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-amber-600/30 text-amber-300 border-amber-500/70"
                    }`}
                  >
                    ⚠️ {med.name ? `${med.name} (${tag})` : tag}
                  </span>
                ))}
                <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-0.5 font-medium hover:text-white">
                  주의사항 ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DUR 상세 모달 */}
      {selectedMed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl border transition-all ${
              isLight
                ? "bg-white border-slate-200 text-slate-800"
                : "bg-gray-900 border-gray-700 text-white"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-700/50 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-base text-red-500">
                  DUR 복약 안전 주의보
                </h3>
              </div>
              <button
                onClick={() => setSelectedMed(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-sm font-bold transition-colors cursor-pointer"
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div
                className={`p-3 rounded-xl border ${
                  isLight
                    ? "bg-red-50/70 border-red-100"
                    : "bg-red-950/30 border-red-900/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>💊</span>
                    <span>{selectedMed.name}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    {selectedMed.timing}
                  </span>
                </div>
                {selectedMed.ingredientName && (
                  <p className="text-xs text-gray-400">
                    주요 성분: <span className="font-semibold text-gray-200">{selectedMed.ingredientName}</span>
                  </p>
                )}
              </div>

              {/* DUR 주의 태그 뱃지 */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-400">
                  식약처 DUR 주의 항목
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMed.durWarningTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border shadow-xs ${
                        tag.includes("금기")
                          ? isLight
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-red-600/30 text-red-300 border-red-500/70"
                          : isLight
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-amber-600/30 text-amber-300 border-amber-500/70"
                      }`}
                    >
                      ⚠️ {selectedMed.name} ({tag})
                    </span>
                  ))}
                </div>
              </div>

              {/* 여행/보행 가이드 및 주의사항 팁 */}
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-gray-950/80 border-gray-800 text-gray-300"
                }`}
              >
                <span className="font-bold block text-emerald-400 mb-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>웰니스 여행 & 보행 가이드</span>
                </span>
                <p>{selectedMed.cautionNote || "여행 중 규칙적인 식사와 수분 섭취를 유지하시고, 무리한 활동을 피하십시오."}</p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedMed(null);
                    onOpenSettingsModal("health");
                  }}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 transition-colors cursor-pointer"
                >
                  ⚙️ 약물 관리 이동
                </button>
                <button
                  onClick={() => setSelectedMed(null)}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
