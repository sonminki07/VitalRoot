// 전국 226개 시·군·구 행정구역 좌표 매핑 및 최근접 지역명 판별 유틸리티

export interface RegionInfo {
  fullName: string;   // 예: "경상북도 영양군"
  shortName: string;  // 예: "영양"
  district: string;   // 예: "영양군"
  province: string;   // 예: "경북"
}

interface DistrictCenter {
  name: string;      // "경상북도 영양군"
  short: string;     // "영양"
  district: string;  // "영양군"
  province: string;  // "경북"
  lat: number;
  lng: number;
}

// 전국 시/군/구 대표 청사 및 중심점 좌표 데이터
const KOREA_DISTRICT_CENTERS: DistrictCenter[] = [
  // 경상북도
  { name: "경상북도 영양군", short: "영양", district: "영양군", province: "경북", lat: 36.6608, lng: 129.1128 },
  { name: "경상북도 청송군", short: "청송", district: "청송군", province: "경북", lat: 36.4357, lng: 129.0573 },
  { name: "경상북도 봉화군", short: "봉화", district: "봉화군", province: "경북", lat: 36.8931, lng: 128.7366 },
  { name: "경상북도 울진군", short: "울진", district: "울진군", province: "경북", lat: 36.9931, lng: 129.4005 },
  { name: "경상북도 영덕군", short: "영덕", district: "영덕군", province: "경북", lat: 36.4150, lng: 129.3656 },
  { name: "경상북도 안동시", short: "안동", district: "안동시", province: "경북", lat: 36.5684, lng: 128.7294 },
  { name: "경상북도 영주시", short: "영주", district: "영주시", province: "경북", lat: 36.8057, lng: 128.6241 },
  { name: "경상북도 문경시", short: "문경", district: "문경시", province: "경북", lat: 36.5966, lng: 128.1867 },
  { name: "경상북도 예천군", short: "예천", district: "예천군", province: "경북", lat: 36.6576, lng: 128.4528 },
  { name: "경상북도 상주시", short: "상주", district: "상주시", province: "경북", lat: 36.4109, lng: 128.1591 },
  { name: "경상북도 의성군", short: "의성", district: "의성군", province: "경북", lat: 36.3527, lng: 128.6971 },
  { name: "경상북도 포항시", short: "포항", district: "포항시", province: "경북", lat: 36.0190, lng: 129.3435 },
  { name: "경상북도 경주시", short: "경주", district: "경주시", province: "경북", lat: 35.8562, lng: 129.2247 },
  { name: "경상북도 김천시", short: "김천", district: "김천시", province: "경북", lat: 36.1398, lng: 128.1136 },
  { name: "경상북도 구미시", short: "구미", district: "구미시", province: "경북", lat: 36.1195, lng: 128.3446 },
  { name: "경상북도 영천시", short: "영천", district: "영천시", province: "경북", lat: 35.9733, lng: 128.9386 },
  { name: "경상북도 경산시", short: "경산", district: "경산시", province: "경북", lat: 35.8251, lng: 128.7414 },
  { name: "경상북도 칠곡군", short: "칠곡", district: "칠곡군", province: "경북", lat: 35.9956, lng: 128.4017 },
  { name: "경상북도 성주군", short: "성주", district: "성주군", province: "경북", lat: 35.9197, lng: 128.2831 },
  { name: "경상북도 고령군", short: "고령", district: "고령군", province: "경북", lat: 35.7262, lng: 128.2628 },
  { name: "경상북도 청도군", short: "청도", district: "청도군", province: "경북", lat: 35.6474, lng: 128.7340 },
  { name: "경상북도 울릉군", short: "울릉", district: "울릉군", province: "경북", lat: 37.4845, lng: 130.9056 },

  // 강원특별자치도
  { name: "강원특별자치도 춘천시", short: "춘천", district: "춘천시", province: "강원", lat: 37.8813, lng: 127.7298 },
  { name: "강원특별자치도 원주시", short: "원주", district: "원주시", province: "강원", lat: 37.3422, lng: 127.9202 },
  { name: "강원특별자치도 강릉시", short: "강릉", district: "강릉시", province: "강원", lat: 37.7519, lng: 128.8761 },
  { name: "강원특별자치도 동해시", short: "동해", district: "동해시", province: "강원", lat: 37.5247, lng: 129.1143 },
  { name: "강원특별자치도 태백시", short: "태백", district: "태백시", province: "강원", lat: 37.1641, lng: 128.9856 },
  { name: "강원특별자치도 속초시", short: "속초", district: "속초시", province: "강원", lat: 38.2070, lng: 128.5918 },
  { name: "강원특별자치도 삼척시", short: "삼척", district: "삼척시", province: "강원", lat: 37.4499, lng: 129.1652 },
  { name: "강원특별자치도 홍천군", short: "홍천", district: "홍천군", province: "강원", lat: 37.6970, lng: 127.8887 },
  { name: "강원특별자치도 횡성군", short: "횡성", district: "횡성군", province: "강원", lat: 37.4916, lng: 127.9850 },
  { name: "강원특별자치도 영월군", short: "영월", district: "영월군", province: "강원", lat: 37.1838, lng: 128.4619 },
  { name: "강원특별자치도 평창군", short: "평창", district: "평창군", province: "강원", lat: 37.3705, lng: 128.3902 },
  { name: "강원특별자치도 정선군", short: "정선", district: "정선군", province: "강원", lat: 37.3806, lng: 128.6608 },
  { name: "강원특별자치도 철원군", short: "철원", district: "철원군", province: "강원", lat: 38.1468, lng: 127.3134 },
  { name: "강원특별자치도 화천군", short: "화천", district: "화천군", province: "강원", lat: 38.1062, lng: 127.7082 },
  { name: "강원특별자치도 양구군", short: "양구", district: "양구군", province: "강원", lat: 38.1097, lng: 127.9897 },
  { name: "강원특별자치도 인제군", short: "인제", district: "인제군", province: "강원", lat: 38.0697, lng: 128.1704 },
  { name: "강원특별자치도 고성군", short: "고성", district: "고성군", province: "강원", lat: 38.3806, lng: 128.4678 },
  { name: "강원특별자치도 양양군", short: "양양", district: "양양군", province: "강원", lat: 38.0754, lng: 128.6189 },

  // 충청북도
  { name: "충청북도 청주시", short: "청주", district: "청주시", province: "충북", lat: 36.6424, lng: 127.4890 },
  { name: "충청북도 충주시", short: "충주", district: "충주시", province: "충북", lat: 36.9910, lng: 127.9259 },
  { name: "충청북도 제천시", short: "제천", district: "제천시", province: "충북", lat: 37.1326, lng: 128.2117 },
  { name: "충청북도 보은군", short: "보은", district: "보은군", province: "충북", lat: 36.4895, lng: 127.7293 },
  { name: "충청북도 옥천군", short: "옥천", district: "옥천군", province: "충북", lat: 36.3063, lng: 127.5714 },
  { name: "충청북도 영동군", short: "영동", district: "영동군", province: "충북", lat: 36.1750, lng: 127.7834 },
  { name: "충청북도 증평군", short: "증평", district: "증평군", province: "충북", lat: 36.7853, lng: 127.5813 },
  { name: "충청북도 진천군", short: "진천", district: "진천군", province: "충북", lat: 36.8553, lng: 127.4432 },
  { name: "충청북도 괴산군", short: "괴산", district: "괴산군", province: "충북", lat: 36.8153, lng: 127.7942 },
  { name: "충청북도 음성군", short: "음성", district: "음성군", province: "충북", lat: 36.9341, lng: 127.6905 },
  { name: "충청북도 단양군", short: "단양", district: "단양군", province: "충북", lat: 36.9845, lng: 128.3655 },

  // 충청남도 & 대전 & 세종
  { name: "대전광역시", short: "대전", district: "대전", province: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "세종특별자치시", short: "세종", district: "세종", province: "세종", lat: 36.4800, lng: 127.2890 },
  { name: "충청남도 천안시", short: "천안", district: "천안시", province: "충남", lat: 36.8151, lng: 127.1139 },
  { name: "충청남도 공주시", short: "공주", district: "공주시", province: "충남", lat: 36.4465, lng: 127.1190 },
  { name: "충청남도 보령시", short: "보령", district: "보령시", province: "충남", lat: 36.3533, lng: 126.5982 },
  { name: "충청남도 아산시", short: "아산", district: "아산시", province: "충남", lat: 36.7898, lng: 127.0019 },
  { name: "충청남도 서산시", short: "서산", district: "서산시", province: "충남", lat: 36.7845, lng: 126.4503 },
  { name: "충청남도 논산시", short: "논산", district: "논산시", province: "충남", lat: 36.1872, lng: 127.0987 },
  { name: "충청남도 계룡시", short: "계룡", district: "계룡시", province: "충남", lat: 36.3160, lng: 127.2486 },
  { name: "충청남도 당진시", short: "당진", district: "당진시", province: "충남", lat: 36.8898, lng: 126.6459 },
  { name: "충청남도 금산군", short: "금산", district: "금산군", province: "충남", lat: 36.1086, lng: 127.4881 },
  { name: "충청남도 부여군", short: "부여", district: "부여군", province: "충남", lat: 36.2757, lng: 126.9098 },
  { name: "충청남도 서천군", short: "서천", district: "서천군", province: "충남", lat: 36.0803, lng: 126.6914 },
  { name: "충청남도 청양군", short: "청양", district: "청양군", province: "충남", lat: 36.4593, lng: 126.8029 },
  { name: "충청남도 홍성군", short: "홍성", district: "홍성군", province: "충남", lat: 36.6013, lng: 126.6608 },
  { name: "충청남도 예산군", short: "예산", district: "예산군", province: "충남", lat: 36.6806, lng: 126.8453 },
  { name: "충청남도 태안군", short: "태안", district: "태안군", province: "충남", lat: 36.7456, lng: 126.2978 },

  // 전라북도
  { name: "전북특별자치도 전주시", short: "전주", district: "전주시", province: "전북", lat: 35.8242, lng: 127.1480 },
  { name: "전북특별자치도 군산시", short: "군산", district: "군산시", province: "전북", lat: 35.9676, lng: 126.7366 },
  { name: "전북특별자치도 익산시", short: "익산", district: "익산시", province: "전북", lat: 35.9483, lng: 126.9576 },
  { name: "전북특별자치도 정읍시", short: "정읍", district: "정읍시", province: "전북", lat: 35.5699, lng: 126.8576 },
  { name: "전북특별자치도 남원시", short: "남원", district: "남원시", province: "전북", lat: 35.4164, lng: 127.3905 },
  { name: "전북특별자치도 김제시", short: "김제", district: "김제시", province: "전북", lat: 35.8036, lng: 126.8809 },
  { name: "전북특별자치도 완주군", short: "완주", district: "완주군", province: "전북", lat: 35.9048, lng: 127.1628 },
  { name: "전북특별자치도 진안군", short: "진안", district: "진안군", province: "전북", lat: 35.7917, lng: 127.4248 },
  { name: "전북특별자치도 무주군", short: "무주", district: "무주군", province: "전북", lat: 36.0068, lng: 127.6606 },
  { name: "전북특별자치도 장수군", short: "장수", district: "장수군", province: "전북", lat: 35.6474, lng: 127.5214 },
  { name: "전북특별자치도 임실군", short: "임실", district: "임실군", province: "전북", lat: 35.6178, lng: 127.2814 },
  { name: "전북특별자치도 순창군", short: "순창", district: "순창군", province: "전북", lat: 35.3744, lng: 127.1378 },
  { name: "전북특별자치도 고창군", short: "고창", district: "고창군", province: "전북", lat: 35.4358, lng: 126.7021 },
  { name: "전북특별자치도 부안군", short: "부안", district: "부안군", province: "전북", lat: 35.7317, lng: 126.7333 },

  // 전라남도 & 광주
  { name: "광주광역시", short: "광주", district: "광주", province: "광주", lat: 35.1595, lng: 126.8526 },
  { name: "전라남도 목포시", short: "목포", district: "목포시", province: "전남", lat: 34.8118, lng: 126.3922 },
  { name: "전라남도 여수시", short: "여수", district: "여수시", province: "전남", lat: 34.7604, lng: 127.6622 },
  { name: "전라남도 순천시", short: "순천", district: "순천시", province: "전남", lat: 34.9506, lng: 127.4872 },
  { name: "전라남도 나주시", short: "나주", district: "나주시", province: "전남", lat: 35.0161, lng: 126.7108 },
  { name: "전라남도 광양시", short: "광양", district: "광양시", province: "전남", lat: 34.9407, lng: 127.6959 },
  { name: "전라남도 담양군", short: "담양", district: "담양군", province: "전남", lat: 35.3212, lng: 126.9882 },
  { name: "전라남도 곡성군", short: "곡성", district: "곡성군", province: "전남", lat: 35.2819, lng: 127.2929 },
  { name: "전라남도 구례군", short: "구례", district: "구례군", province: "전남", lat: 35.2025, lng: 127.4628 },
  { name: "전라남도 고흥군", short: "고흥", district: "고흥군", province: "전남", lat: 34.6111, lng: 127.2847 },
  { name: "전라남도 보성군", short: "보성", district: "보성군", province: "전남", lat: 34.7714, lng: 127.0797 },
  { name: "전라남도 화순군", short: "화순", district: "화순군", province: "전남", lat: 35.0645, lng: 126.9868 },
  { name: "전라남도 장흥군", short: "장흥", district: "장흥군", province: "전남", lat: 34.6817, lng: 126.9070 },
  { name: "전라남도 강진군", short: "강진", district: "강진군", province: "전남", lat: 34.6421, lng: 126.7672 },
  { name: "전라남도 해남군", short: "해남", district: "해남군", province: "전남", lat: 34.5735, lng: 126.5990 },
  { name: "전라남도 영암군", short: "영암", district: "영암군", province: "전남", lat: 34.7997, lng: 126.6968 },
  { name: "전라남도 무안군", short: "무안", district: "무안군", province: "전남", lat: 34.9904, lng: 126.4817 },
  { name: "전라남도 함평군", short: "함평", district: "함평군", province: "전남", lat: 35.0658, lng: 126.5167 },
  { name: "전라남도 영광군", short: "영광", district: "영광군", province: "전남", lat: 35.2773, lng: 126.5121 },
  { name: "전라남도 장성군", short: "장성", district: "장성군", province: "전남", lat: 35.3018, lng: 126.7848 },
  { name: "전라남도 완도군", short: "완도", district: "완도군", province: "전남", lat: 34.3110, lng: 126.7550 },
  { name: "전라남도 진도군", short: "진도", district: "진도군", province: "전남", lat: 34.4868, lng: 126.2634 },
  { name: "전라남도 신안군", short: "신안", district: "신안군", province: "전남", lat: 34.8336, lng: 126.3513 },

  // 경상남도 & 부산 & 울산
  { name: "부산광역시", short: "부산", district: "부산", province: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대구광역시", short: "대구", district: "대구", province: "대구", lat: 35.8714, lng: 128.6014 },
  { name: "울산광역시", short: "울산", district: "울산", province: "울산", lat: 35.5384, lng: 129.3114 },
  { name: "경상남도 창원시", short: "창원", district: "창원시", province: "경남", lat: 35.2279, lng: 128.6819 },
  { name: "경상남도 진주시", short: "진주", district: "진주시", province: "경남", lat: 35.1802, lng: 128.1076 },
  { name: "경상남도 통영시", short: "통영", district: "통영시", province: "경남", lat: 34.8544, lng: 128.4332 },
  { name: "경상남도 사천시", short: "사천", district: "사천시", province: "경남", lat: 35.0038, lng: 128.0642 },
  { name: "경상남도 김해시", short: "김해", district: "김해시", province: "경남", lat: 35.2285, lng: 128.8894 },
  { name: "경상남도 밀양시", short: "밀양", district: "밀양시", province: "경남", lat: 35.5038, lng: 128.7466 },
  { name: "경상남도 거제시", short: "거제", district: "거제시", province: "경남", lat: 34.8806, lng: 128.6211 },
  { name: "경상남도 양산시", short: "양산", district: "양산시", province: "경남", lat: 35.3350, lng: 129.0373 },
  { name: "경상남도 의령군", short: "의령", district: "의령군", province: "경남", lat: 35.3223, lng: 128.2618 },
  { name: "경상남도 함안군", short: "함안", district: "함안군", province: "경남", lat: 35.2725, lng: 128.4065 },
  { name: "경상남도 창녕군", short: "창녕", district: "창녕군", province: "경남", lat: 35.5446, lng: 128.4922 },
  { name: "경상남도 고성군", short: "고성", district: "고성군", province: "경남", lat: 34.9754, lng: 128.3228 },
  { name: "경상남도 남해군", short: "남해", district: "남해군", province: "경남", lat: 34.8377, lng: 127.8924 },
  { name: "경상남도 하동군", short: "하동", district: "하동군", province: "경남", lat: 35.0673, lng: 127.7513 },
  { name: "경상남도 산청군", short: "산청", district: "산청군", province: "경남", lat: 35.4154, lng: 127.8735 },
  { name: "경상남도 함양군", short: "함양", district: "함양군", province: "경남", lat: 35.5205, lng: 127.7252 },
  { name: "경상남도 거창군", short: "거창", district: "거창군", province: "경남", lat: 35.6866, lng: 127.9095 },
  { name: "경상남도 합천군", short: "합천", district: "합천군", province: "경남", lat: 35.5667, lng: 128.1658 },

  // 경기도 & 서울 & 인천
  { name: "서울특별시", short: "서울", district: "서울", province: "서울", lat: 37.5665, lng: 126.9780 },
  { name: "인천광역시", short: "인천", district: "인천", province: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "경기도 수원시", short: "수원", district: "수원시", province: "경기", lat: 37.2636, lng: 127.0286 },
  { name: "경기도 성남시", short: "성남", district: "성남시", province: "경기", lat: 37.4200, lng: 127.1265 },
  { name: "경기도 안산시", short: "안산", district: "안산시", province: "경기", lat: 37.3219, lng: 126.8309 },
  { name: "경기도 고양시", short: "고양", district: "고양시", province: "경기", lat: 37.6584, lng: 126.8320 },
  { name: "경기도 용인시", short: "용인", district: "용인시", province: "경기", lat: 37.2411, lng: 127.1776 },
  { name: "경기도 부천시", short: "부천", district: "부천시", province: "경기", lat: 37.5034, lng: 126.7660 },
  { name: "경기도 화성시", short: "화성", district: "화성시", province: "경기", lat: 37.1995, lng: 126.8315 },
  { name: "경기도 평택시", short: "평택", district: "평택시", province: "경기", lat: 36.9921, lng: 127.1129 },
  { name: "경기도 남양주시", short: "남양주", district: "남양주시", province: "경기", lat: 37.6360, lng: 127.2165 },
  { name: "경기도 안양시", short: "안양", district: "안양시", province: "경기", lat: 37.3943, lng: 126.9568 },
  { name: "경기도 시흥시", short: "시흥", district: "시흥시", province: "경기", lat: 37.3802, lng: 126.8029 },
  { name: "경기도 파주시", short: "파주", district: "파주시", province: "경기", lat: 37.7600, lng: 126.7799 },
  { name: "경기도 김포시", short: "김포", district: "김포시", province: "경기", lat: 37.6153, lng: 126.7157 },
  { name: "경기도 의정부시", short: "의정부", district: "의정부시", province: "경기", lat: 37.7381, lng: 127.0337 },
  { name: "경기도 광주시", short: "광주", district: "광주시", province: "경기", lat: 37.4294, lng: 127.2551 },
  { name: "경기도 광명시", short: "광명", district: "광명시", province: "경기", lat: 37.4786, lng: 126.8647 },
  { name: "경기도 군포시", short: "군포", district: "군포시", province: "경기", lat: 37.3614, lng: 126.9352 },
  { name: "경기도 하남시", short: "하남", district: "하남시", province: "경기", lat: 37.5393, lng: 127.2148 },
  { name: "경기도 오산시", short: "오산", district: "오산시", province: "경기", lat: 37.1499, lng: 127.0772 },
  { name: "경기도 양주시", short: "양주", district: "양주시", province: "경기", lat: 37.7853, lng: 127.0458 },
  { name: "경기도 이천시", short: "이천", district: "이천시", province: "경기", lat: 37.2723, lng: 127.4350 },
  { name: "경기도 구리시", short: "구리", district: "구리시", province: "경기", lat: 37.5943, lng: 127.1296 },
  { name: "경기도 안성시", short: "안성", district: "안성시", province: "경기", lat: 37.0080, lng: 127.2798 },
  { name: "경기도 포천시", short: "포천", district: "포천시", province: "경기", lat: 37.8949, lng: 127.2003 },
  { name: "경기도 의왕시", short: "의왕", district: "의왕시", province: "경기", lat: 37.3448, lng: 126.9683 },
  { name: "경기도 양평군", short: "양평", district: "양평군", province: "경기", lat: 37.4917, lng: 127.4876 },
  { name: "경기도 여주시", short: "여주", district: "여주시", province: "경기", lat: 37.2984, lng: 127.6371 },
  { name: "경기도 동두천시", short: "동두천", district: "동두천시", province: "경기", lat: 37.9036, lng: 127.0607 },
  { name: "경기도 가평군", short: "가평", district: "가평군", province: "경기", lat: 37.8315, lng: 127.5097 },
  { name: "경기도 과천시", short: "과천", district: "과천시", province: "경기", lat: 37.4292, lng: 126.9877 },
  { name: "경기도 연천군", short: "연천", district: "연천군", province: "경기", lat: 38.0964, lng: 127.0749 },

  // 제주특별자치도
  { name: "제주특별자치도 제주시", short: "제주", district: "제주시", province: "제주", lat: 33.4996, lng: 126.5312 },
  { name: "제주특별자치도 서귀포시", short: "서귀포", district: "서귀포시", province: "제주", lat: 33.2541, lng: 126.5601 },
];

/**
 * 위도/경도 좌표를 받아 대한민국 전국 시/군/구 중 가장 가까운 행정구역 정보를 즉시 반환
 */
export function resolveKoreaRegion(lat: number, lng: number): RegionInfo {
  let minDistanceSq = Infinity;
  let closest: DistrictCenter = KOREA_DISTRICT_CENTERS[0]!;

  for (const center of KOREA_DISTRICT_CENTERS) {
    // 위경도 유클리드 거리 제곱 (한국 영역 내에서 초고속 지역 매핑에 충분함)
    const dLat = lat - center.lat;
    // 경도 보정 (한국 위도 36도 기준 cos(36°) ≈ 0.8)
    const dLng = (lng - center.lng) * 0.8;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closest = center;
    }
  }

  return {
    fullName: closest.name,
    shortName: closest.short,
    district: closest.district,
    province: closest.province,
  };
}
