import { useState } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";

export function LocationModal() {
  const { isLocationModalOpen, setIsLocationModalOpen, setUserLocation, setIsPinningHome } =
    useWellnessStore();
  const { flyToPlace } = useMapStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLocationModalOpen) return null;

  const handleSelectPreset = (_name: string, lat: number, lng: number) => {
    setUserLocation({ latitude: lat, longitude: lng });
    setIsLocationModalOpen(false);
    flyToPlace(lng, lat, 15);
  };

  const handleStartMapPinning = () => {
    setIsLocationModalOpen(false);
    setIsPinningHome(true);
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("현재 브라우저에서 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserLocation({ latitude: lat, longitude: lng });
        setIsLocationModalOpen(false);

        // 지도 중심을 사용자 현재 위치로 부드럽게 이동
        flyToPlace(lng, lat, 15);
      },
      (err) => {
        setIsLoading(false);
        console.warn("Geolocation error:", err);
        setErrorMessage(
          "위치 접근이 거부되었거나 신호를 찾을 수 없습니다. 브라우저 주소창의 위치 권한 허용을 확인해 주세요."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const ANSAN_PRESETS = [
    { name: "고잔동 (중앙역/단원구청)", lat: 37.3175, lng: 126.8375 },
    { name: "초지동 (초지역/화랑호수)", lat: 37.3205, lng: 126.8120 },
    { name: "선부동 (선부역/달미)", lat: 37.3340, lng: 126.8090 },
    { name: "와동 (화랑초/체육관)", lat: 37.3370, lng: 126.8220 },
    { name: "본오동 (상록수역)", lat: 37.3025, lng: 126.8655 },
    { name: "사동 (호수공원/한양대)", lat: 37.2990, lng: 126.8360 },
    { name: "성포동 (노적봉공원)", lat: 37.3260, lng: 126.8520 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-5 sm:p-6 bg-gray-900 border border-emerald-500/50 rounded-3xl shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
            📍
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              출발지(내 집) 위치 설정
            </h3>
            <p className="text-xs text-emerald-400 font-medium">
              가장 가까운 안심식당과 힐링 산책로를 자동 정렬합니다.
            </p>
          </div>
        </div>

        {/* 1순위 추천: 지도에서 내 집 직접 찍기 버튼 */}
        <button
          onClick={handleStartMapPinning}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-gray-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between transition-all active:scale-95 group border border-amber-300"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg group-hover:scale-125 transition-transform">🎯</span>
            <div className="text-left">
              <p className="leading-snug">지도에서 내 집 직접 클릭해서 핀 찍기</p>
              <p className="text-[10px] text-amber-950/80 font-medium">PC/노트북 위치 오차 없이 100% 정확하게 집 지정</p>
            </div>
          </div>
          <span className="text-xs text-amber-950 font-black shrink-0">선택 ➔</span>
        </button>

        {/* 2순위: 거주 동네 빠른 선택 프리셋 */}
        <div className="space-y-2 p-3 bg-gray-800/60 rounded-2xl border border-gray-700/60">
          <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span>🏡</span>
            <span>안산시 거주 동네 빠른 선택:</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {ANSAN_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleSelectPreset(preset.name, preset.lat, preset.lng)}
                className="py-1.5 px-2.5 rounded-xl bg-gray-900/80 hover:bg-emerald-600 hover:text-white border border-gray-700/80 text-gray-300 text-left transition-colors truncate"
              >
                📍 {preset.name}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 3순위: 브라우저 GPS 자동 수신 */}
        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-all"
          >
            닫기
          </button>
          <button
            onClick={handleRequestLocation}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-sky-500/40 text-xs font-bold text-sky-300 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>위치 수신 중...</span>
            ) : (
              <>
                <span>📡</span>
                <span>GPS 자동 수신</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
