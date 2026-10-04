import { ChronicCondition, UserProfile, MedicationItem } from "../../../types/wellness.types";

interface ConditionFilterTabProps {
  profile: UserProfile;
  allConditions: ChronicCondition[];
  onToggleCondition: (condition: ChronicCondition) => void;
  onOpenSettingsModal: (tab: "health" | "travel" | "system") => void;
  isLight: boolean;
}

export function ConditionFilterTab({
  profile,
  allConditions,
  onToggleCondition,
  onOpenSettingsModal,
}: ConditionFilterTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-2">
          1. 기저질환 지표 선택 (다중 선택 가능)
        </label>
        <div className="flex flex-wrap gap-2">
          {allConditions.map((cond) => {
            const selected = profile.chronicConditions.includes(cond);
            return (
              <button
                key={cond}
                onClick={() => onToggleCondition(cond)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                    : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {selected ? "✓ " : "+ "}
                {cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* 복용 중인 의약품 및 식약처 DUR 요약 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-300">
            2. 복용 의약품 & 식약처 DUR 분석
          </label>
          <button
            onClick={() => onOpenSettingsModal("health")}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            + 약물 관리/추가 ➔
          </button>
        </div>

        {profile.hasNoMedications ? (
          <div className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-xs text-gray-400">
            ✓ 복용 중인 약물이 없습니다 (식단·운동 맞춤 케어)
          </div>
        ) : profile.medications && profile.medications.length > 0 ? (
          <div className="space-y-1.5">
            {profile.medications.map((m: MedicationItem) => (
              <div
                key={m.id}
                className="p-2.5 bg-gray-900/60 rounded-xl border border-gray-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">• {m.name}</span>
                  <span className="text-[10px] text-gray-400">{m.timing}</span>
                </div>
                {m.durWarningTags && m.durWarningTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {m.durWarningTags.map((tag, tIdx) => (
                      <button
                        key={tIdx}
                        onClick={() => onOpenSettingsModal("health")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          tag.includes("금기")
                            ? "bg-red-500/25 text-red-300 border-red-500/60 shadow-xs"
                            : "bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-xs"
                        }`}
                        title="클릭하여 약물 주의사항 및 세부 정보 관리"
                      >
                        ⚠️ {m.name} ({tag})
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-amber-300">{m.cautionNote}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
            <span>⚠️ 등록된 복용 약물이 없습니다.</span>
            <button
              onClick={() => onOpenSettingsModal("health")}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded text-[10px] font-bold"
            >
              DUR 등록
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-2">
          3. 여행자 건강 프로필
        </label>
        <div className="space-y-2 text-xs bg-gray-900/60 p-3 rounded-xl border border-gray-800">
          <div className="flex justify-between">
            <span className="text-gray-400">식단 선호:</span>
            <span className="text-emerald-400 font-medium">
              {profile.dietaryPreference}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">알레르기 주의:</span>
            <span className="text-gray-200 font-medium">
              {profile.allergies.join(", ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">보행 체력 수준:</span>
            <span className="text-teal-300 font-medium truncate ml-2">
              {profile.walkFitnessLevel || profile.conditionToday}
            </span>
          </div>
        </div>
      </div>

      {/* 설정 열기 버튼 */}
      <button
        onClick={() => onOpenSettingsModal("health")}
        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-bold border border-gray-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <span>⚙️</span>
        <span>상세 건강 프로필 & DUR 의약품 설정 열기</span>
      </button>

      {/* 기저질환별 스마트 알고리즘 가이드 안내 */}
      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs space-y-1.5 text-emerald-300/90 leading-relaxed">
        <p className="font-bold text-emerald-300">💡 스마트 질환 맞춤 알고리즘</p>
        <p>• <strong>저혈압 환자</strong>: 식후 혈압 급강하 방지를 위해 밥집 바로 근처 평지 산책로 우선 추천</p>
        <p>• <strong>고혈압 환자</strong>: 보행 부담을 덜기 위해 중간 안심 쉼터/화장실 다수 보유 완만 단축 코스 추천</p>
        <p>• <strong>당뇨 환자</strong>: 식약처 저GI·저당 안심식단과 식후 혈당 강하 숲길 완보 코스 추천</p>
      </div>
    </div>
  );
}
