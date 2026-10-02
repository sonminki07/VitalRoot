import { useState, useEffect, ReactNode } from "react";

interface MobileViewportContainerProps {
  children: ReactNode;
}

/**
 * iPhone 16 Pro 규격 모바일 뷰포트 컨테이너
 * - 디스플레이 해상도: 2622 x 1206 (460 ppi, 6.3인치)
 * - CSS 논리 규격: 402px 너비 x 874px 높이
 * - PC 데스크톱 접속 시 정밀 스마트폰 베젤 프레임 렌더링
 * - 우측 상단 플로팅 토글을 통해 모바일 프레임 <-> 데스크톱 전체화면 자유 전환 지원
 */
export function MobileViewportContainer({ children }: MobileViewportContainerProps) {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState(true);

  useEffect(() => {
    const checkViewport = () => {
      const isMobile = window.innerWidth <= 640;
      setIsMobileDevice(isMobile);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // 실제 모바일 기기이거나 모바일 프레임 모드가 꺼진 경우 전체화면 렌더링
  if (isMobileDevice || !isPhoneFrameMode) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        {/* 데스크톱 전체화면 모드일 때 모바일 프레임으로 되돌리는 토글 버튼 */}
        {!isMobileDevice && (
          <div className="fixed top-3 right-3 z-[9999] flex items-center gap-2 bg-gray-900/90 hover:bg-gray-900 text-white backdrop-blur-md border border-gray-700/80 px-3 py-1.5 rounded-full shadow-xl transition-all">
            <span className="text-xs font-semibold text-emerald-400">🖥️ 전체화면 모드</span>
            <button
              type="button"
              onClick={() => setIsPhoneFrameMode(true)}
              className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm transition-all"
            >
              📱 iPhone 16 Pro 규격으로 전환
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  // PC 브라우저: iPhone 16 Pro 디바이스 프레임 렌더링 (402px x 874px)
  return (
    <div className="relative w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4 select-none">
      {/* 배경 장식 글로우 */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 상단 컨트롤 툴바 */}
      <div className="z-[9999] mb-3 flex items-center justify-between w-[402px] max-w-full px-2 text-white">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-200">iPhone 16 Pro Mockup</span>
          <span className="text-[10px] text-gray-400 font-mono bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700">
            402×874 pt (460 ppi)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsPhoneFrameMode(false)}
          className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-medium px-2.5 py-1 rounded-lg border border-gray-700 transition-all flex items-center gap-1"
          title="데스크톱 전체화면으로 전환"
        >
          <span>🖥️ 전체화면</span>
        </button>
      </div>

      {/* 스마트폰 베젤 외곽 프레임 */}
      <div
        className="relative bg-black rounded-[48px] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-[3px] border-gray-700/60 ring-1 ring-white/10 shrink-0 transition-all"
        style={{
          width: "422px", // 402px 콘텐츠 + 좌우 패딩 20px
          height: "894px", // 874px 콘텐츠 + 상하 패딩 20px
          maxHeight: "calc(100vh - 65px)",
        }}
      >
        {/* 내부 스크린 영역 */}
        <div className="relative w-[402px] h-[874px] max-h-full rounded-[38px] overflow-hidden bg-slate-900 shadow-inner flex flex-col">
          {/* 다이내믹 아일랜드 (상단 노치 알약) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-[9990] pointer-events-none flex items-center justify-between px-2.5 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            <div className="w-2 h-2 rounded-full bg-emerald-950/80 border border-emerald-500/30" />
          </div>

          {/* 앱 실제 콘텐츠 렌더링 컨테이너 */}
          <div className="relative w-full h-full overflow-hidden flex-1">
            {children}
          </div>

          {/* 하단 홈 인디케이터 바 */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-[9990] pointer-events-none backdrop-blur-sm" />
        </div>
      </div>
    </div>
  );
}
