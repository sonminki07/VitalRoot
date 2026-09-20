import { useState } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";

export function LocationModal() {
  const { isLocationModalOpen, setIsLocationModalOpen, setUserLocation } =
    useWellnessStore();
  const { flyToPlace } = useMapStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLocationModalOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 bg-gray-900 border border-emerald-500/50 rounded-3xl shadow-2xl text-white space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
            📍
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              현재 위치 기반 맞춤 코스 찾기
            </h3>
            <p className="text-xs text-emerald-400 font-medium">
              내 주변 안심식당 + 힐링 산책로 자동 연동
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          여행자님의 현재 위치를 파악하여 가장 가까운 <strong>만성질환 맞춤 안심식당</strong>과 <strong>완만 보행로</strong>를 실시간으로 탐색하고, 내 위치에서 출발하는 도보 경로를 연결해 드립니다.
        </p>

        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300/90 flex items-center gap-2">
          <span>🔒</span>
          <span>
            위치 정보는 주변 코스 탐색 목적으로만 기기 내에서 사용되며 서버에 영구 저장되지 않습니다.
          </span>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-all"
          >
            다음에 하기
          </button>
          <button
            onClick={handleRequestLocation}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-xs font-bold text-gray-950 shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>위치 수신 중...</span>
            ) : (
              <>
                <span>📍</span>
                <span>동의하고 코스 찾기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
