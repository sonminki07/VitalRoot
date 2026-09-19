// 메인 App 컴포넌트
import { MapContainer } from "./components/map/MapContainer";
import { ControlPanel } from "./components/panels/ControlPanel";
import { InfoBar } from "./components/common/InfoBar";

function App() {
  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <ControlPanel /> {/* 왼쪽 상단 패널 */}
      <MapContainer /> {/* 지도 컴포넌트 */}
      <InfoBar /> {/* 하단 정보 바 */}
    </div>
  );
}

export default App;
// 메인 App 컴포넌트에서는 총 3개의 컴포넌트를 렌더링합니다:
// ControlPanel : 좌측 컨트롤 패널
//                사용자의 모든 컨트롤들을 담고 있는 컴포넌트입니다.
// MapContainer : 지도 컴포넌트입니다.
//                컴포넌트의 심장으로 실제 MapBox지도를 렌더링합니다.
//                사용자가 지도를 움직이거나 더블클릭을 하는 등의 이벤트를 처리하고 또한 지도 위에 그림들을 관리합니다.
// InfoBar : 하단에 정보를 표시합니다.