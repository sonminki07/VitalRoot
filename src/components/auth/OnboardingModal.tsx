import { useState, useEffect, useMemo } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { ChronicCondition, MedicationItem } from "../../types/wellness.types";
import {
  searchMedications,
  inferConditionsFromMedications,
  POPULAR_MEDICATIONS,
} from "../../utils/durService";

const ALL_CONDITIONS: ChronicCondition[] = [
  "당뇨",
  "고혈압",
  "저혈압",
  "이상지질혈증",
  "신장질환",
  "관절/근골격계",
];

const DIET_GOALS = ["저염/저나트륨", "저탄수화물", "저GI", "고단백", "칼륨조절", "균형건강식"];
const ALLERGIES_LIST = ["갑각류", "땅콩", "대두", "밀/글루텐", "유제품", "메밀", "난류", "생선"];
const FITNESS_LEVELS = [
  "식후 30분 가벼운 평지 산책 희망",
  "1시간 내외 숲길/둘레길 완보 가능",
  "휠체어·유모차 무장애 데크길 필수",
];
const INFRA_OPTIONS = [
  "중간 화장실 필수 (도보 3~5분)",
  "완만한 평지/쉼터 필수",
  "그늘막 벤치 완비",
  "야간 조명/안전시설 완비",
];

export function OnboardingModal() {
  const {
    profile,
    updateProfile,
    isOnboardingModalOpen,
    closeOnboardingModal,
  } = useWellnessStore();

  // 로컬 편집 상태
  const [selectedConditions, setSelectedConditions] = useState<ChronicCondition[]>(
    profile.chronicConditions || ["당뇨"]
  );
  const [medications, setMedications] = useState<MedicationItem[]>(
    profile.medications || []
  );
  const [hasNoMedications, setHasNoMedications] = useState<boolean>(
    profile.hasNoMedications ?? false
  );
  const [dietaryGoal, setDietaryGoal] = useState<string>(
    profile.dietaryPreference || "저염/저탄수화물"
  );
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    profile.allergies || ["갑각류", "땅콩"]
  );
  const [walkFitnessLevel, setWalkFitnessLevel] = useState<string>(
    profile.walkFitnessLevel || "식후 30분 가벼운 평지 산책 희망"
  );
  const [requiredInfra, setRequiredInfra] = useState<string[]>(
    profile.requiredInfra || ["중간 화장실 필수 (도보 3~5분)", "완만한 평지/쉼터 필수"]
  );

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string;
      ingredientName: string;
      defaultTiming: string;
      cautionNote: string;
      durWarningTags: string[];
      inferredCondition: ChronicCondition;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // 프로필 상태 동기화
  useEffect(() => {
    if (isOnboardingModalOpen) {
      setSelectedConditions(profile.chronicConditions || ["당뇨"]);
      setMedications(profile.medications || []);
      setHasNoMedications(profile.hasNoMedications ?? false);
      setDietaryGoal(profile.dietaryPreference || "저염/저탄수화물");
      setSelectedAllergies(profile.allergies || ["갑각류", "땅콩"]);
      setWalkFitnessLevel(profile.walkFitnessLevel || "식후 30분 가벼운 평지 산책 희망");
      setRequiredInfra(
        profile.requiredInfra || ["중간 화장실 필수 (도보 3~5분)", "완만한 평지/쉼터 필수"]
      );
    }
  }, [isOnboardingModalOpen, profile]);

  // 약물 검색 디바운싱
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMedications(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 약물 분석 기반 추천 질환
  const { recommendedConditions, detectedClasses } = useMemo(() => {
    return inferConditionsFromMedications(medications);
  }, [medications]);

  if (!isOnboardingModalOpen) return null;

  // 기저질환 토글
  const toggleCondition = (cond: ChronicCondition) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  // 약물 추가
  const handleAddMedication = (item: {
    name: string;
    ingredientName: string;
    defaultTiming: string;
    cautionNote: string;
    durWarningTags: string[];
    inferredCondition: ChronicCondition;
  }) => {
    if (medications.some((m) => m.name === item.name)) return;
    const newMed: MedicationItem = {
      id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: item.name,
      ingredientName: item.ingredientName,
      timing: item.defaultTiming || "아침 식후",
      cautionNote: item.cautionNote,
      durWarningTags: item.durWarningTags,
      inferredCondition: item.inferredCondition,
    };
    setMedications((prev) => [...prev, newMed]);
    setHasNoMedications(false);
    setSearchQuery("");
    setSearchResults([]);

    // 약물에 따른 질환 자동 체크
    if (item.inferredCondition && !selectedConditions.includes(item.inferredCondition)) {
      setSelectedConditions((prev) => [...prev, item.inferredCondition]);
    }
  };

  // 약물 삭제
  const handleRemoveMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  // 복용 시간 변경
  const handleChangeTiming = (id: string, newTiming: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, timing: newTiming } : m))
    );
  };

  // 알레르기 토글
  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  // 인프라 토글
  const toggleInfra = (infra: string) => {
    setRequiredInfra((prev) =>
      prev.includes(infra) ? prev.filter((i) => i !== infra) : [...prev, infra]
    );
  };

  // 완료 검증
  const isComplete =
    selectedConditions.length > 0 &&
    (hasNoMedications || medications.length > 0) &&
    (Boolean(walkFitnessLevel) || requiredInfra.length > 0);

  // 저장 제출
  const handleSave = () => {
    updateProfile({
      chronicConditions: selectedConditions,
      medications,
      hasNoMedications,
      dietaryPreference: dietaryGoal,
      allergies: selectedAllergies,
      walkFitnessLevel,
      requiredInfra,
      conditionToday: walkFitnessLevel,
    });
    closeOnboardingModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-emerald-500/50 rounded-2xl sm:rounded-3xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-800 bg-gradient-to-r from-emerald-950/60 to-teal-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>만성질환 맞춤 헬스케어 온보딩</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  식약처 DUR 연동
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                기저질환과 복용 의약품을 등록하시면 최적의 식단과 안전 산책로가 구성됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={closeOnboardingModal}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-gray-800/80 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* [ 1. 기저질환 지표 선택 (다중 선택) ] */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                  1
                </span>
                <span>기저질환 지표 선택 (다중 선택)</span>
              </label>
              <span className="text-[11px] text-gray-400">
                {selectedConditions.length}개 선택됨
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-950/60"
                        : "bg-gray-800/80 border-gray-700 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* [ 2. 복용 중인 의약품 상세 등록 (DUR 정밀 분석) ] */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                  2
                </span>
                <span>복용 중인 의약품 상세 등록 (식약처 DUR 정밀 분석)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasNoMedications}
                  onChange={(e) => {
                    setHasNoMedications(e.target.checked);
                    if (e.target.checked) {
                      setMedications([]);
                    }
                  }}
                  className="rounded border-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>복용 중인 약물이 없습니다</span>
              </label>
            </div>

            {!hasNoMedications && (
              <>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300/90 leading-relaxed flex items-start gap-2">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    약품명을 검색하시면 <strong>식약처 DUR 성분 DB(7대 안전기준)</strong>를 실시간 분석해 외식 금기 성분과 맞춤 산책 강도를 자동으로 세팅해 드립니다.
                  </div>
                </div>

                {/* 약품 검색창 */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-gray-400">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="복용 중인 약품 검색 (예: 다이아벡스, 노바스크, 코자)"
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-800/90 border border-gray-700 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    {isSearching && (
                      <span className="absolute right-3 text-xs text-emerald-400 animate-pulse">
                        검색 중...
                      </span>
                    )}
                  </div>

                  {/* 검색 결과 드롭다운 */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 max-h-56 overflow-y-auto divide-y divide-gray-700">
                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleAddMedication(item)}
                          className="p-3 hover:bg-gray-700/80 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({item.ingredientName})
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400 mt-0.5">
                              {item.cautionNote}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {item.durWarningTags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="text-xs text-emerald-400 font-bold ml-1">+ 등록</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 빠른 추천 버튼 */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[11px] text-gray-400 self-center mr-1">다빈도 추천:</span>
                    {POPULAR_MEDICATIONS.slice(0, 4).map((pm, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddMedication(pm)}
                        className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg px-2 py-1 transition-colors"
                      >
                        + {pm.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 등록된 약물 리스트 */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-gray-300">
                    [등록된 약물: {medications.length}개]
                  </span>
                  {medications.length === 0 ? (
                    <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl text-xs text-gray-400 text-center">
                      등록된 약물이 없습니다. 검색창에서 약품명을 등록해 주세요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {medications.map((med) => (
                        <div
                          key={med.id}
                          className="p-3 bg-gray-800/70 border border-gray-700/80 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-white">
                                • {med.name}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                ({med.ingredientName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={med.timing}
                                onChange={(e) => handleChangeTiming(med.id, e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 px-2 py-1"
                              >
                                <option value="아침 식후">아침 식후</option>
                                <option value="점심 식후">점심 식후</option>
                                <option value="저녁 식후">저녁 식후</option>
                                <option value="식전 30분">식전 30분</option>
                                <option value="취침 전">취침 전</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(med.id)}
                                className="text-xs text-red-400 hover:text-red-300 font-bold px-1"
                                title="삭제"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-amber-300 flex items-center justify-between">
                            <span>{med.cautionNote}</span>
                            <div className="flex gap-1 shrink-0">
                              {med.durWarningTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] bg-red-900/40 text-red-300 border border-red-500/30 px-1 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 약물 종합 분석 기반 추천 질환 영역 */}
                {medications.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-teal-950/40 to-emerald-950/40 border border-teal-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <span>💡</span>
                        <span>[약물 종합 분석 기반 추천 질환] (터치 시 상단 지표 자동 확정)</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      등록된 약물을 분석한 결과입니다. 관리할 질환을 확정해 주세요:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {recommendedConditions.map((rc) => {
                        const isSelected = selectedConditions.includes(rc);
                        return (
                          <button
                            key={rc}
                            type="button"
                            onClick={() => toggleCondition(rc)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                              isSelected
                                ? "bg-emerald-600 border-emerald-400 text-white"
                                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-500"
                            }`}
                          >
                            {isSelected ? "✔ " : "+ "}
                            {rc} 관리 추천
                          </button>
                        );
                      })}
                    </div>
                    {detectedClasses.length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        ㄴ 판별 근거: {detectedClasses.join(" + ")} 감지
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="h-px bg-gray-800" />

          {/* [ 3. 여행자 건강 프로필 (식단 & 체력) ] */}
          <div className="space-y-4">
            <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                3
              </span>
              <span>여행자 건강 프로필 (식단 & 체력 & 산책 환경)</span>
            </label>

            {/* 식단 관리 목표 */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-300 font-semibold">• 식단 관리 목표:</span>
              <div className="flex flex-wrap gap-2">
                {DIET_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setDietaryGoal(goal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      dietaryGoal === goal
                        ? "bg-emerald-600 border-emerald-400 text-white font-semibold"
                        : "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* 알레르기 체크 */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-300 font-semibold">• 식품 알레르기 주의:</span>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGIES_LIST.map((allg) => {
                  const isChecked = selectedAllergies.includes(allg);
                  return (
                    <button
                      key={allg}
                      type="button"
                      onClick={() => toggleAllergy(allg)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        isChecked
                          ? "bg-red-900/40 border-red-500/60 text-red-200 font-semibold"
                          : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {isChecked ? "⚠️ " : "+ "}
                      {allg}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 보행 체력 수준 */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-300 font-semibold">• 보행 체력 수준:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FITNESS_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setWalkFitnessLevel(level)}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                      walkFitnessLevel === level
                        ? "bg-teal-950/40 border-teal-400 text-teal-200 font-semibold shadow-sm"
                        : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* 산책 필수 인프라 */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-300 font-semibold">• 산책 필수 인프라:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INFRA_OPTIONS.map((infra) => {
                  const isChecked = requiredInfra.includes(infra);
                  return (
                    <button
                      key={infra}
                      type="button"
                      onClick={() => toggleInfra(infra)}
                      className={`p-2 rounded-xl text-xs font-medium border text-left transition-all flex items-center gap-2 ${
                        isChecked
                          ? "bg-sky-950/40 border-sky-400 text-sky-200 font-semibold"
                          : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      <span className="text-sm">{isChecked ? "✔" : "◻"}</span>
                      <span>{infra}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 완료 버튼 영역 */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {isComplete ? (
              <span className="text-emerald-400 font-semibold">
                ✓ 3대 필수 건강 프로필이 모두 준비되었습니다.
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                ⚠️ 기저질환, 복용 약물(또는 없음 체크), 체력 선호를 모두 입력해 주세요.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={closeOnboardingModal}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
            >
              나중에 하기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-95 transition-all"
            >
              🌿 맞춤 프로필 저장 및 웰니스 여행 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
