import { useState } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useAuthStore } from "../../store/authStore";
import { ChronicCondition, MedicationItem } from "../../types/wellness.types";
import {
  searchMedications,
} from "../../utils/durService";
import {
  getTmapApiKey,
  setTmapApiKey,
  testTmapApiKey,
} from "../../utils/pedestrianRouter";

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

export function SettingsModal() {
  const {
    profile,
    updateProfile,
    isSettingsModalOpen,
    closeSettingsModal,
    settingsInitialTab,
    userLocation,
    setIsPinningHome,
    earnedTitles,
    themeMode,
    setThemeMode,
    fontSize,
    setFontSize,
    savedCustomCourses,
    removeCustomCourse,
  } = useWellnessStore();

  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"health" | "travel" | "system">(
    settingsInitialTab || "health"
  );

  // 약물 검색 상태
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

  // 닉네임 로컬 수정 상태
  const [userName, setUserName] = useState(profile.userName || "웰니스 여행자");

  // Tmap 보행자 API 키 상태
  const [tmapInputKey, setTmapInputKey] = useState(getTmapApiKey() || "");
  const [tmapTestStatus, setTmapTestStatus] = useState<{ loading: boolean; message: string | null; success: boolean | null }>({
    loading: false,
    message: null,
    success: null,
  });

  if (!isSettingsModalOpen) return null;

  // 약물 검색
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const res = await searchMedications(q);
    setSearchResults(res);
    setIsSearching(false);
  };

  // 약물 추가
  const handleAddMed = (item: {
    name: string;
    ingredientName: string;
    defaultTiming: string;
    cautionNote: string;
    durWarningTags: string[];
    inferredCondition: ChronicCondition;
  }) => {
    const currentMeds = profile.medications || [];
    if (currentMeds.some((m) => m.name === item.name)) return;
    const newMed: MedicationItem = {
      id: `med-${Date.now()}`,
      name: item.name,
      ingredientName: item.ingredientName,
      timing: item.defaultTiming || "아침 식후",
      cautionNote: item.cautionNote,
      durWarningTags: item.durWarningTags,
      inferredCondition: item.inferredCondition,
    };
    updateProfile({
      medications: [...currentMeds, newMed],
      hasNoMedications: false,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  // 약물 삭제
  const handleRemoveMed = (id: string) => {
    const currentMeds = profile.medications || [];
    updateProfile({
      medications: currentMeds.filter((m) => m.id !== id),
    });
  };

  // 질환 토글
  const handleToggleCondition = (cond: ChronicCondition) => {
    const current = profile.chronicConditions || [];
    const updated = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : [...current, cond];
    updateProfile({ chronicConditions: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-700/80 rounded-2xl sm:rounded-3xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                VitalRoot 통합 환경 설정
              </h2>
              <p className="text-xs text-gray-400">
                건강 프로필 관리, 여행 선호도 및 헬스케어 디바이스 확장
              </p>
            </div>
          </div>
          <button
            onClick={closeSettingsModal}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-gray-800/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="grid grid-cols-3 border-b border-gray-800 text-xs sm:text-sm font-semibold bg-gray-950/60">
          <button
            onClick={() => setActiveTab("health")}
            className={`py-3 text-center transition-colors border-b-2 ${
              activeTab === "health"
                ? "text-emerald-400 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200 border-transparent"
            }`}
          >
            🌿 건강 & DUR 약물
          </button>
          <button
            onClick={() => setActiveTab("travel")}
            className={`py-3 text-center transition-colors border-b-2 ${
              activeTab === "travel"
                ? "text-emerald-400 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200 border-transparent"
            }`}
          >
            🗺️ 여행 & 길찾기
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`py-3 text-center transition-colors border-b-2 ${
              activeTab === "system"
                ? "text-emerald-400 border-emerald-400 bg-emerald-950/20"
                : "text-gray-400 hover:text-gray-200 border-transparent"
            }`}
          >
            ⚙️ 계정 & 확장 기능
          </button>
        </div>

        {/* 탭 본문 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: 건강 & DUR 약물 관리 */}
          {activeTab === "health" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 기저질환 관리 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300">
                  1. 관리 중인 기저질환 지표
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CONDITIONS.map((cond) => {
                    const isSelected = profile.chronicConditions?.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => handleToggleCondition(cond)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-400 text-white"
                            : "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 식약처 DUR 복용 의약품 관리 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">
                    2. 복용 중인 의약품 & 식약처 DUR 분석
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(profile.hasNoMedications)}
                      onChange={(e) => {
                        updateProfile({
                          hasNoMedications: e.target.checked,
                          medications: e.target.checked ? [] : profile.medications,
                        });
                      }}
                      className="rounded border-gray-700 text-emerald-500"
                    />
                    <span>복용 중인 약물 없음</span>
                  </label>
                </div>

                {!profile.hasNoMedications && (
                  <div className="space-y-3">
                    {/* 검색창 */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="새로운 의약품 검색 및 추가 (예: 다이아벡스, 코자, 노바스크)"
                        className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                      {isSearching && (
                        <span className="absolute right-3 top-2.5 text-xs text-emerald-400">
                          검색 중...
                        </span>
                      )}

                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-700">
                          {searchResults.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleAddMed(item)}
                              className="p-2.5 hover:bg-gray-700/80 cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-xs text-white">
                                  {item.name}
                                </span>
                                <p className="text-[10px] text-emerald-400">
                                  {item.cautionNote}
                                </p>
                              </div>
                              <span className="text-xs text-emerald-400 font-bold">+ 추가</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 등록된 약물 목록 */}
                    <div className="space-y-2">
                      {(profile.medications || []).map((med) => (
                        <div
                          key={med.id}
                          className="p-3 bg-gray-800/70 border border-gray-700 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">
                                • {med.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                {med.timing}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-300 mt-0.5">
                              {med.cautionNote}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMed(med.id)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 식단 및 보행 체력 */}
              <div className="space-y-3 pt-2 border-t border-gray-800">
                <label className="text-xs font-bold text-gray-300">
                  3. 식단 및 보행 체력 수준
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">선호 식단:</span>
                    <div className="flex flex-wrap gap-1">
                      {DIET_GOALS.map((d) => (
                        <button
                          key={d}
                          onClick={() => updateProfile({ dietaryPreference: d })}
                          className={`px-2 py-1 rounded-lg text-xs ${
                            profile.dietaryPreference === d
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">보행 체력:</span>
                    <select
                      value={profile.walkFitnessLevel || "식후 30분 가벼운 평지 산책 희망"}
                      onChange={(e) =>
                        updateProfile({
                          walkFitnessLevel: e.target.value,
                          conditionToday: e.target.value,
                        })
                      }
                      className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 px-2 py-1.5"
                    >
                      {FITNESS_LEVELS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. 식품 알레르기 유발 성분 관리 */}
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">
                    4. 식품 알레르기 주의 관리
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {(profile.allergies || []).length}개 등록됨
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGIES_LIST.map((allg) => {
                    const isSelected = (profile.allergies || []).includes(allg);
                    return (
                      <button
                        key={allg}
                        type="button"
                        onClick={() => {
                          const current = profile.allergies || [];
                          const next = isSelected
                            ? current.filter((a) => a !== allg)
                            : [...current, allg];
                          updateProfile({ allergies: next });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-red-900/50 border-red-500 text-red-200 shadow-sm"
                            : "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {isSelected ? "⚠️ " : "+ "}
                        {allg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 여행 & 길찾기 선호 설정 */}
          {activeTab === "travel" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 내 집 출발지 설정 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🏠</span>
                    <span>내 출발지 (집) 위치</span>
                  </span>
                  {userLocation ? (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      위도 {userLocation.latitude.toFixed(4)}, 경도 {userLocation.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400">위치 미설정</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  출발지 위치를 기준으로 생활권 코스가 최우선 자동 매칭되며, 도보 5분(400m) 초과 시 대중교통 길찾기 버튼이 제공됩니다.
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeSettingsModal();
                      setIsPinningHome(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-lg shadow-sm"
                  >
                    🎯 지도에서 직접 핀 찍기
                  </button>
                </div>
              </div>

              {/* Tmap 보행자 정밀 경로 API 연동 설정 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🗺️</span>
                    <span>Tmap 보행자 정밀 경로 API 설정</span>
                  </span>
                  {getTmapApiKey() ? (
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      ✓ Tmap 활성화됨
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-medium bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                      기본 안전 도로망 작동 중
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-300">
                  SK Open API에서 발급받은 Tmap <strong>AppKey</strong>를 등록하시면, 횡단보도, 육교, 인도, 골목길을 100% 정밀 인식하는 도보 경로가 실시간 연동됩니다.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={tmapInputKey}
                    onChange={(e) => setTmapInputKey(e.target.value)}
                    placeholder="SK Open API AppKey를 입력하세요"
                    className="flex-1 px-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setTmapApiKey(tmapInputKey.trim());
                      if (!tmapInputKey.trim()) {
                        setTmapTestStatus({ loading: false, message: "키가 삭제되었습니다. 기본 안전 도로망으로 전환됩니다.", success: true });
                        return;
                      }
                      setTmapTestStatus({ loading: true, message: "Tmap API 연결 테스트 중...", success: null });
                      const res = await testTmapApiKey(tmapInputKey.trim());
                      setTmapTestStatus({ loading: false, message: res.message, success: res.success });
                    }}
                    disabled={tmapTestStatus.loading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-bold text-xs rounded-lg shadow-sm shrink-0 transition-all"
                  >
                    {tmapTestStatus.loading ? "검증 중..." : "저장 & 테스트"}
                  </button>
                </div>
                {tmapTestStatus.message && (
                  <div className={`p-2 rounded-lg text-xs font-medium ${
                    tmapTestStatus.success ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300" : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                  }`}>
                    {tmapTestStatus.message}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                  <span>* 키가 없어도 공공 도로망 안전 라우터가 가동되어 산/물 관통이 차단됩니다.</span>
                  <a
                    href="https://openapi.sk.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>SK Open API 바로가기 ↗</span>
                  </a>
                </div>
              </div>

              {/* 이동 수단 기준 설정 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🚌</span>
                  <span>도보 vs 대중교통 전환 거리 기준</span>
                </span>
                <p className="text-[11px] text-gray-400">
                  출발지로부터 식당까지 거리가 <strong>400m (도보 약 5분)</strong>을 초과할 경우, 네이버 지도 대중교통(버스/지하철) 길찾기 버튼이 자동으로 노출됩니다.
                </p>
                <div className="text-xs text-sky-400 bg-sky-950/40 p-2 rounded-lg border border-sky-500/30">
                  ✓ 현재 기준: 400m 초과 시 [대중교통] + [도보] 듀얼 버튼 연동 중
                </div>
              </div>

              {/* 안심 편의시설 레이더 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🧭</span>
                  <span>보행 동선 안심 편의시설 레이더</span>
                </span>
                <p className="text-[11px] text-gray-400">
                  코스 진행 방향 기준 <strong>도보 3~5분 반경(180m~350m)</strong> 내의 공공화장실, 그늘막 쉼터, 무장애 편의시설을 실시간 감지하여 지도에 핀으로 안내합니다.
                </p>
              </div>

              {/* 나만의 저장 코스 보관함 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📌</span>
                    <span>나만의 저장 코스 보관함</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {savedCustomCourses.length}개 보관 중
                  </span>
                </div>
                {savedCustomCourses.length === 0 ? (
                  <p className="text-[11px] text-gray-400">
                    지도 하단 바의 <strong>[📌 나만의 코스 저장]</strong> 버튼을 누르면 이 보관함에 영구 저장됩니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedCustomCourses.map((sc) => (
                      <div
                        key={sc.id}
                        className="p-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{sc.title}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomCourse(sc.id)}
                            className="text-red-400 hover:text-red-300 text-[10px]"
                          >
                            삭제
                          </button>
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          {sc.restaurantName} ➔ {sc.trailName} ({sc.totalDistanceMeters}m)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 계정 & 확장 기능 (기반 마련) */}
          {activeTab === "system" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 화면 테마 및 글자 크기 조절 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>화면 UI 및 지도 테마</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      themeMode === "dark"
                        ? "bg-emerald-600 border-emerald-400 text-white shadow-md"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span>🌙</span>
                    <span>다크 웰니스 테마</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      themeMode === "light"
                        ? "bg-sky-600 border-sky-400 text-white shadow-md"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span>☀️</span>
                    <span>화이트 네이버 테마</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1">
                      <span>🔤</span>
                      <span>전체 글자 크기 조절</span>
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      {fontSize === "normal" ? "보통 (14px)" : fontSize === "large" ? "크게 (16px) 권장" : "아주 크게 (18px)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["normal", "large", "xlarge"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setFontSize(sz)}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          fontSize === sz
                            ? "bg-emerald-600 border-emerald-400 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {sz === "normal" ? "보통 (14px)" : sz === "large" ? "크게 (16px)" : "아주 크게 (18px)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 계정 정보 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>👤</span>
                  <span>사용자 계정 정보</span>
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">로그인 계정:</span>
                  <span className="text-emerald-400 font-mono">
                    {user?.email || "게스트 (로컬 모드)"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">여행자 닉네임:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onBlur={() => updateProfile({ userName })}
                      className="px-2 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white"
                    />
                    <button
                      onClick={() => updateProfile({ userName })}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>

              {/* 칭호 컬렉션 */}
              <div className="p-3.5 bg-gray-800/60 border border-gray-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>👑</span>
                    <span>획득 웰니스 칭호</span>
                  </span>
                  <span className="text-xs text-amber-400 font-bold">
                    {earnedTitles.length}개 보유
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {earnedTitles.length === 0 ? (
                    <span className="text-xs text-gray-400">
                      아직 획득한 칭호가 없습니다. 명소 퀘스트를 완료해보세요!
                    </span>
                  ) : (
                    earnedTitles.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold"
                      >
                        🏅 {t}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 미래 확장 기능 슬롯 기반 */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>차세대 헬스케어 디바이스 연동 슬롯 (확장 기반)</span>
                </span>

                <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200">
                      ⌚ 스마트워치 심박수·보폭 연동 (Apple / Galaxy Watch)
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                      준비 중
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    보행 중 심박수 급상승 시 자동 휴식 알림 및 인근 쉼터 경로 즉시 안내 지원 예정
                  </p>
                </div>

                <div className="p-3 bg-teal-950/20 border border-teal-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200">
                      🩸 연속혈당측정기(CGM) 블루투스 연동
                    </span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full">
                      준비 중
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    식후 혈당 변화 추이를 추적하여 최적의 산책 출발 골든타임을 푸시 알림으로 제공 예정
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 닫기 */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={closeSettingsModal}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
