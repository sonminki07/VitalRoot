// src/utils/colorUtils.ts 분석 요약

// --------------------------------------------------------------------------------
// 1. 유틸리티 함수 정의
// --------------------------------------------------------------------------------
// 이 파일은 색상과 관련된 재사용 가능한 도우미 함수들을 모아놓은 곳입니다.

/**
 * HEX 형식의 색상 코드에 투명도를 적용하여 RGBA 형식의 문자열로 변환합니다.
 *
 * @param color - 변환할 HEX 색상 문자열 (예: "#ffffff").
 * @param opacity - 적용할 투명도 (0.0 ~ 1.0).
 * @returns RGBA 형식의 색상 문자열 (예: "rgba(255, 255, 255, 0.5)").
 *          만약 입력된 'color'가 '#'으로 시작하지 않으면, 원본 문자열을 그대로 반환합니다.
 */
export function applyOpacity(color: string, opacity: number): string {
  // 입력된 색상이 '#'으로 시작하는 HEX 코드인지 확인합니다.
  if (color.startsWith('#')) {
    // HEX 코드를 두 글자씩 잘라 각각 R, G, B 값으로 분리하고 16진수에서 10진수로 변환합니다.
    const r = parseInt(color.slice(1, 3), 16); // 빨강(R)
    const g = parseInt(color.slice(3, 5), 16); // 녹색(G)
    const b = parseInt(color.slice(5, 7), 16); // 파랑(B)
    // 변환된 R, G, B 값과 입력된 투명도(opacity)를 조합하여 RGBA 문자열을 만듭니다.
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // HEX 코드가 아니면, 원본 색상 문자열을 그대로 반환합니다.
  return color;
}

/**
 * 주어진 HEX 색상이 시각적으로 '밝은' 색상인지 '어두운' 색상인지 판단합니다.
 *
 * @param color - 판단할 HEX 색상 문자열 (예: "#ffffff").
 * @returns 색상이 밝으면 true, 어두우면 false를 반환합니다.
 *          HEX 코드가 아니면 false를 반환합니다.
 */
export function isLightColor(color: string): boolean {
  // HEX 코드가 아니면 분석할 수 없으므로 false를 반환합니다.
  if (!color.startsWith('#')) return false;
  
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // YIQ 색 공간 공식을 사용하여 인간의 눈이 인지하는 밝기(휘도)를 계산합니다.
  // https://en.wikipedia.org/wiki/YIQ
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // 계산된 휘도가 특정 임계값(여기서는 0.7)보다 높으면 밝은 색으로 간주합니다.
  // 이 임계값은 조절 가능하며, 값이 클수록 더 밝은 색만 true로 판단합니다.
  return luminance > 0.7;
}
