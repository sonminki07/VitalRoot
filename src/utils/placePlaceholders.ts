/**
 * 카테고리별 세련된 기본 일러스트/아이콘 플레이스홀더 생성기
 * 사진이 없거나 로드 실패(깨진 이미지) 시 빈 공간 대신 표시할 벡터 SVG Data URI 제공
 */

interface PlaceholderTheme {
  icon: string;
  label: string;
  colorStart: string;
  colorEnd: string;
}

export function getCategoryPlaceholder(category: string = "관광지", customLabel?: string): string {
  const cat = (category || "").toLowerCase();

  let theme: PlaceholderTheme = {
    icon: "🌿",
    label: customLabel || "웰니스 명소",
    colorStart: "#064e3b",
    colorEnd: "#047857",
  };

  if (cat.includes("음식") || cat.includes("식당") || cat.includes("밥상") || cat.includes("맛집") || cat.includes("카페")) {
    theme = {
      icon: "🥗",
      label: customLabel || "안심 식당",
      colorStart: "#064e3b",
      colorEnd: "#059669",
    };
  } else if (cat.includes("의료") || cat.includes("병원") || cat.includes("약국") || cat.includes("보건") || cat.includes("응급")) {
    theme = {
      icon: "🏥",
      label: customLabel || "안심 의료기관",
      colorStart: "#881337",
      colorEnd: "#e11d48",
    };
  } else if (cat.includes("화장실")) {
    theme = {
      icon: "🚻",
      label: customLabel || "안심 화장실",
      colorStart: "#0c4a6e",
      colorEnd: "#0284c7",
    };
  } else if (cat.includes("쉼터") || cat.includes("벤치") || cat.includes("정자")) {
    theme = {
      icon: "🪑",
      label: customLabel || "힐링 쉼터",
      colorStart: "#78350f",
      colorEnd: "#d97706",
    };
  } else if (cat.includes("배리어") || cat.includes("무장애") || cat.includes("휠체어") || cat.includes("경사로")) {
    theme = {
      icon: "♿",
      label: customLabel || "무장애 시설",
      colorStart: "#4c1d95",
      colorEnd: "#7c3aed",
    };
  } else if (cat.includes("숙소") || cat.includes("호텔") || cat.includes("리조트") || cat.includes("펜션") || cat.includes("스테이")) {
    theme = {
      icon: "🏨",
      label: customLabel || "안심 숙소",
      colorStart: "#134e4a",
      colorEnd: "#0d9488",
    };
  } else if (cat.includes("산책") || cat.includes("둘레길") || cat.includes("공원") || cat.includes("숲")) {
    theme = {
      icon: "🌲",
      label: customLabel || "완만 산책로",
      colorStart: "#14532d",
      colorEnd: "#16a34a",
    };
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180" viewBox="0 0 360 180">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.colorStart}" />
      <stop offset="100%" stop-color="${theme.colorEnd}" />
    </linearGradient>
    <pattern id="pattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.08)" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
  <rect width="100%" height="100%" fill="url(#pattern)" />
  <g transform="translate(180, 75)">
    <circle cx="0" cy="0" r="36" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
    <text x="0" y="8" font-size="34" text-anchor="middle" dominant-baseline="middle">${theme.icon}</text>
  </g>
  <text x="180" y="142" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
    ${theme.label}
  </text>
  <text x="180" y="160" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="rgba(255,255,255,0.7)" text-anchor="middle">
    VitalRoot Wellness
  </text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
