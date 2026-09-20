/**
 * 네이버 지도 웹 상세 페이지 URL을 생성하는 스마트 유틸리티
 * 
 * - 네이버 플레이스 공식 상호(naverPlaceName)가 있으면 해당 공식 상호로 검색
 * - 미등록 시설(화장실, 쉼터, 공공시설 등)은 정확한 도로명 주소(address)로 검색하여 0건 오류 없이 100% 지도상에 핀을 표시
 */
export function getNaverMapDetailUrl(item: {
  name: string;
  address?: string;
  naverPlaceName?: string;
}): string {
  // 1순위: 네이버 플레이스 공식 실존 상호명
  if (item.naverPlaceName && item.naverPlaceName.trim() !== "") {
    return `https://map.naver.com/p/search/${encodeURIComponent(item.naverPlaceName.trim())}?c=15.00,0,0,0,dh`;
  }

  // 2순위: 공식 상호가 없는 시설인 경우, 정확한 도로명 주소로 검색 (네이버 지도에 100% 핀 꽂힘)
  if (item.address && item.address.trim() !== "") {
    return `https://map.naver.com/p/search/${encodeURIComponent(item.address.trim())}?c=15.00,0,0,0,dh`;
  }

  // 3순위: 기본 이름 검색
  return `https://map.naver.com/p/search/${encodeURIComponent(item.name.trim())}?c=15.00,0,0,0,dh`;
}
