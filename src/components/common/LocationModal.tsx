import { useState, useMemo } from "react";
import { useWellnessStore } from "../../store/wellnessStore";
import { useMapStore } from "../../store/mapStore";

interface CityTarget {
  region: string;
  name: string;
  subName: string;
  badge: string;
  lat: number;
  lng: number;
}

const REGION_CATEGORIES = [
  "전체",
  "수도권",
  "충청·대전",
  "영남권",
  "호남권",
  "강원·제주",
] as const;

const CITY_TARGETS: CityTarget[] = [
  // 수도권
  { region: "수도권", name: "서울", subName: "중구/시청/명동", badge: "서울", lat: 37.5665, lng: 126.9780 },
  { region: "수도권", name: "안산", subName: "중앙역/고잔/단원", badge: "경기", lat: 37.3218, lng: 126.8308 },
  { region: "수도권", name: "고양", subName: "일산호수/행주산성", badge: "경기", lat: 37.6583, lng: 126.8320 },
  { region: "수도권", name: "인천", subName: "송도센트럴/시청", badge: "인천", lat: 37.4563, lng: 126.7052 },
  { region: "수도권", name: "수원", subName: "광교호수/팔달", badge: "경기", lat: 37.2636, lng: 127.0286 },
  { region: "수도권", name: "성남", subName: "분당/판교/율동", badge: "경기", lat: 37.4201, lng: 127.1265 },

  // 충청·대전
  { region: "충청·대전", name: "대전", subName: "둔산/한밭수목원", badge: "대전", lat: 36.3504, lng: 127.3845 },
  { region: "충청·대전", name: "세종", subName: "세종호수/정부청사", badge: "세종", lat: 36.4800, lng: 127.2890 },
  { region: "충청·대전", name: "청주", subName: "상당구/흥덕구", badge: "충북", lat: 36.6424, lng: 127.4890 },
  { region: "충청·대전", name: "천안", subName: "불당동/천안터미널", badge: "충남", lat: 36.8151, lng: 127.1139 },

  // 영남권 (대구/부산/울산/경남/경북)
  { region: "영남권", name: "대구", subName: "수성못/동성로", badge: "대구", lat: 35.8714, lng: 128.6014 },
  { region: "영남권", name: "부산", subName: "해운대/서면/광안리", badge: "부산", lat: 35.1796, lng: 129.0756 },
  { region: "영남권", name: "울산", subName: "태화강국가정원/남구", badge: "울산", lat: 35.5384, lng: 129.3114 },
  { region: "영남권", name: "창원", subName: "의창구/성산구", badge: "경남", lat: 35.2280, lng: 128.6811 },

  // 호남권 (광주/전북/전남)
  { region: "호남권", name: "광주", subName: "상무지구/5·18공원", badge: "광주", lat: 35.1595, lng: 126.8526 },
  { region: "호남권", name: "전주", subName: "덕진공원/한옥마을", badge: "전북", lat: 35.8242, lng: 127.1480 },
  { region: "호남권", name: "순천", subName: "순천만습지/국가정원", badge: "전남", lat: 34.9507, lng: 127.4872 },
  { region: "호남권", name: "여수", subName: "여수엑스포/해양공원", badge: "전남", lat: 34.7604, lng: 127.6622 },

  // 강원·제주
  { region: "강원·제주", name: "강릉", subName: "경포호/안목해변", badge: "강원", lat: 37.7519, lng: 128.8760 },
  { region: "강원·제주", name: "춘천", subName: "명동/의암호둘레길", badge: "강원", lat: 37.8854, lng: 127.7298 },
  { region: "강원·제주", name: "원주", subName: "혁신도시/무실동", badge: "강원", lat: 37.3422, lng: 127.9202 },
  { region: "강원·제주", name: "제주", subName: "제주시청/절물휴양림", badge: "제주", lat: 33.4996, lng: 126.5312 },
  { region: "강원·제주", name: "서귀포", subName: "서귀포항/중문관광단지", badge: "제주", lat: 33.2541, lng: 126.5601 },
];

export function LocationModal() {
  const { isLocationModalOpen, setIsLocationModalOpen, setUserLocation, setIsPinningHome } =
    useWellnessStore();
  const { flyToPlace } = useMapStore();
  const [selectedRegion, setSelectedRegion] = useState<string>("전체");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredCities = useMemo(() => {
    if (selectedRegion === "전체") return CITY_TARGETS;
    return CITY_TARGETS.filter((city) => city.region === selectedRegion);
  }, [selectedRegion]);

  if (!isLocationModalOpen) return null;

  // 도시 선택 시: 좌표를 집으로 강제 확정하지 않고, 해당 시 중심으로 지도를 이동시킨 뒤 사용자가 직접 집을 찍도록 핀 모드 전환!
  const handleSelectCity = (city: CityTarget) => {
    setIsLocationModalOpen(false);
    // 지도 포커스를 해당 도시 중심부(zoom 14: 상세 도로/건물 식별 뷰)로 부드럽게 이동
    flyToPlace(city.lng, city.lat, 14);
    // 사용자가 지도에서 직접 자신의 집 위치를 클릭할 수 있도록 핀 찍기 모드 활성화
    setIsPinningHome(true);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-5 sm:p-6 bg-gray-900 border border-emerald-500/50 rounded-3xl shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        {/* 상단 헤더 & 닫기 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              📍
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                출발지(내 집) 위치 설정
              </h3>
              <p className="text-xs text-emerald-400 font-medium">
                지역으로 이동 후 지도를 클릭하여 내 집을 지정하세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-sm shrink-0"
            title="창 닫기"
          >
            ✕
          </button>
        </div>

        {/* 1순위: 현재 보고 있는 화면에서 바로 핀 찍기 */}
        <button
          onClick={handleStartMapPinning}
          className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-gray-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between transition-all active:scale-95 group border border-amber-300"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg group-hover:scale-125 transition-transform">🎯</span>
            <div className="text-left">
              <p className="leading-snug">현재 화면에서 바로 집 핀 찍기</p>
              <p className="text-[10px] text-amber-950/80 font-medium">현재 지도 화면에서 내 집 건물을 직접 클릭</p>
            </div>
          </div>
          <span className="text-xs text-amber-950 font-black shrink-0">선택 ➔</span>
        </button>

        {/* 2순위: 전국 시·도 선택 후 지도 이동 & 집 핀 찍기 */}
        <div className="space-y-2.5 p-3.5 bg-gray-800/60 rounded-2xl border border-gray-700/60">
          <div>
            <p className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
              <span>🏙️</span>
              <span>도시 선택 후 지도 이동 ➔ 내 집 핀 찍기:</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              원하시는 시를 누르면 해당 지역으로 지도가 즉시 이동하며, 지도에서 실제 거주하시는 집을 클릭해 지정하실 수 있습니다.
            </p>
          </div>

          {/* 권역별 필터 칩 */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
            {REGION_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedRegion(cat)}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                  selectedRegion === cat
                    ? "bg-emerald-500 text-gray-950 font-bold shadow"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 도시 버튼 그리드 */}
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelectCity(city)}
                className="group py-2 px-2.5 rounded-xl bg-gray-900/90 hover:bg-emerald-600 hover:border-emerald-400 border border-gray-700/80 text-left transition-all flex items-center justify-between shadow-sm active:scale-95"
              >
                <div className="truncate pr-1">
                  <div className="text-[11px] font-bold text-gray-200 group-hover:text-white truncate">
                    📍 {city.name}
                  </div>
                  <div className="text-[9px] text-gray-400 group-hover:text-emerald-100 truncate">
                    {city.subName}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 group-hover:bg-emerald-700 text-emerald-300 group-hover:text-white shrink-0">
                  {city.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* 3순위: 브라우저 GPS 자동 수신 & 하단 닫기 */}
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
