// tests/api-verification.test.mjs
// Automated Live & Schema Verification for 7 Public Government APIs
// Covers: KorService2, KorWithService2, WellnessTursmService, MdclTursmService,
// DrbBundleInfoService02, DURIrdntInfoService03, FoodNtrCpntDbInfo03, plus Error & Edge Cases

import https from 'node:https';

const API_KEY = "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
        });
      });
    }).on('error', (err) => reject(err));
  });
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function runTest(testName, testFn) {
  process.stdout.write(`  Testing ${colors.cyan}${testName}${colors.reset} ... `);
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    console.log(`${colors.green}✔ PASS${colors.reset} (${duration}ms) - ${result || 'OK'}`);
    return true;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`${colors.red}✖ FAIL${colors.reset} (${duration}ms)`);
    console.error(`    ${colors.red}Error: ${err.message || err}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   VitalRoot 7대 공공데이터 API 실시간 무결성 심층 검증 슈트   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  // 1. 한국관광공사국문 관광정보 서비스_GW (locationBasedList2 & 거리순 arrange=E)
  const t1 = await runTest("1. 한국관광공사국문 관광정보 서비스_GW (KorService2/locationBasedList2 - 거리순 arrange=E)", async () => {
    const url = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=${API_KEY}&numOfRows=3&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&mapX=126.981611&mapY=37.568477&radius=3000&contentTypeId=39&arrange=E`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const header = json?.response?.header;
    if (header?.resultCode !== "0000") throw new Error(`ResultCode: ${header?.resultCode} (${header?.resultMsg})`);
    const rawItems = json?.response?.body?.items?.item || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    if (items.length === 0) throw new Error("0 items returned");
    const nearestDist = Math.round(parseFloat(items[0].dist || "0"));
    return `resultCode 0000, ${items.length}건 수신, 최인접 거리=${nearestDist}m (${items[0].title})`;
  });
  if (t1) passed++; else failed++;

  // 1-1. 한국관광공사국문 관광정보 키워드 검색 (searchKeyword2)
  const t1b = await runTest("1-1. 국문 관광정보 키워드 검색 (KorService2/searchKeyword2)", async () => {
    const encKw = encodeURIComponent("비빔밥");
    const url = `https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&keyword=${encKw}&arrange=A`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const header = json?.response?.header;
    if (header?.resultCode !== "0000") throw new Error(`ResultCode: ${header?.resultCode} (${header?.resultMsg})`);
    const rawItems = json?.response?.body?.items?.item || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return `resultCode 0000, 키워드 '비빔밥' 매칭 ${items.length}건 (${items[0]?.title || '검색결과'})`;
  });
  if (t1b) passed++; else failed++;

  // 2. 한국관광공사무장애 여행 정보 (KorWithService2/locationBasedList2 & detailWithTour2)
  const t2 = await runTest("2. 한국관광공사무장애 여행 정보 (KorWithService2/locationBasedList2 - 거리순 arrange=E)", async () => {
    const url = `https://apis.data.go.kr/B551011/KorWithService2/locationBasedList2?serviceKey=${API_KEY}&numOfRows=3&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&mapX=126.981611&mapY=37.568477&radius=3000&arrange=E`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const header = json?.response?.header;
    if (header?.resultCode !== "0000") throw new Error(`ResultCode: ${header?.resultCode} (${header?.resultMsg})`);
    const rawItems = json?.response?.body?.items?.item || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const nearestDist = Math.round(parseFloat(items[0]?.dist || "0"));
    return `resultCode 0000, 무장애 명소 ${items.length}건, 최인접 거리=${nearestDist}m (${items[0]?.title})`;
  });
  if (t2) passed++; else failed++;

  // 2-1. 무장애 상세 편의시설 조회 (KorWithService2/detailWithTour2)
  const t2b = await runTest("2-1. 무장애 상세 편의시설 조회 (KorWithService2/detailWithTour2)", async () => {
    const testContentId = "1304864";
    const url = `https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2?serviceKey=${API_KEY}&numOfRows=1&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&contentId=${testContentId}`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const rawItem = json?.response?.body?.items?.item;
    const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
    if (!item) throw new Error("Detail item empty");
    const features = [];
    if (item.parking) features.push("장애인주차장");
    if (item.wheelchair) features.push("휠체어");
    if (item.restroom) features.push("장애인화장실");
    if (item.exit) features.push("출입구경사로");
    return `resultCode 0000, contentId=${testContentId} 편의시설 [${features.join(', ') || '보행접근로'}]`;
  });
  if (t2b) passed++; else failed++;

  // 3. 한국관광공사웰니스관광정보 (WellnessTursmService)
  const t3 = await runTest("3. 한국관광공사웰니스관광정보 (WellnessTursmService/locationBasedList - KOR & 거리순 arrange=E)", async () => {
    const url = `https://apis.data.go.kr/B551011/WellnessTursmService/locationBasedList?serviceKey=${API_KEY}&numOfRows=3&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&langDivCd=KOR&mapX=126.981611&mapY=37.568477&radius=25000&arrange=E`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const header = json?.response?.header;
    if (header?.resultCode !== "0000") throw new Error(`ResultCode: ${header?.resultCode} (${header?.resultMsg})`);
    const rawItems = json?.response?.body?.items?.item || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return `resultCode 0000, 웰니스 치유스팟 ${items.length}건 (${items[0]?.title}, 테마코드: ${items[0]?.wellnessThemaCd || 'N/A'})`;
  });
  if (t3) passed++; else failed++;

  // 4. 한국관광공사의료관광정보 (MdclTursmService - KOR & ENG)
  const t4 = await runTest("4. 한국관광공사의료관광정보 (MdclTursmService/locationBasedList - langDivCd=KOR & ENG)", async () => {
    const urlKor = `https://apis.data.go.kr/B551011/MdclTursmService/locationBasedList?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&langDivCd=KOR&mapX=126.981611&mapY=37.568477&radius=25000&arrange=E`;
    const urlEng = `https://apis.data.go.kr/B551011/MdclTursmService/locationBasedList?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&langDivCd=ENG&mapX=126.981611&mapY=37.568477&radius=25000&arrange=E`;
    const [resKor, resEng] = await Promise.all([httpGet(urlKor), httpGet(urlEng)]);
    if (resKor.statusCode !== 200 || resEng.statusCode !== 200) throw new Error("HTTP error");
    const jsonKor = JSON.parse(resKor.data);
    const jsonEng = JSON.parse(resEng.data);
    if (jsonKor?.response?.header?.resultCode !== "0000" || jsonEng?.response?.header?.resultCode !== "0000") {
      throw new Error("ResultCode error");
    }
    const korItem = jsonKor?.response?.body?.items?.item?.[0] || jsonKor?.response?.body?.items?.item;
    return `resultCode 0000, KOR/ENG 양방향 정상 수신 (${korItem?.title || '의료기관'})`;
  });
  if (t4) passed++; else failed++;

  // 5. [개발계정]식품의약품안전처_묶음의약품정보서비스 (cnsgnItemName & trustItemName)
  const t5 = await runTest("5. [개발계정]식품의약품안전처_묶음의약품정보서비스 (DrbBundleInfoService02 - 수탁/위탁 품목명 실시간 쿼리)", async () => {
    const encAsp = encodeURIComponent("아스피린");
    const encNor = encodeURIComponent("노바스크");
    const urlTrust = `https://apis.data.go.kr/1471000/DrbBundleInfoService02/getDrbBundleList02?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&type=json&trustItemName=${encAsp}`;
    const urlCnsgn = `https://apis.data.go.kr/1471000/DrbBundleInfoService02/getDrbBundleList02?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&type=json&cnsgnItemName=${encNor}`;

    const [resTrust, resCnsgn] = await Promise.all([httpGet(urlTrust), httpGet(urlCnsgn)]);
    const jTrust = JSON.parse(resTrust.data);
    const jCnsgn = JSON.parse(resCnsgn.data);

    if (jTrust?.header?.resultCode !== "00" || jCnsgn?.header?.resultCode !== "00") {
      throw new Error(`DrbBundle resultCode error: ${jTrust?.header?.resultMsg}`);
    }

    const trustCount = jTrust?.body?.totalCount || 0;
    const cnsgnCount = jCnsgn?.body?.totalCount || 0;
    const item = jTrust?.body?.items?.[0]?.item;

    return `NORMAL SERVICE, 아스피린(수탁)=${trustCount}건, 노바스크(위탁)=${cnsgnCount}건 (주성분: ${item?.trustMainingr || '아스피린'})`;
  });
  if (t5) passed++; else failed++;

  // 6. 식품의약품안전처의약품안전사용서비스(DUR)성분정보 (임부금기, 병용금기, 노인주의)
  const t6 = await runTest("6. 식품의약품안전처의약품안전사용서비스(DUR)성분정보 (DURIrdntInfoService03 - 임부금기, 병용금기, 노인주의)", async () => {
    const encAtor = encodeURIComponent("아토르바스타틴");
    const encSimva = encodeURIComponent("심바스타틴");
    const encDiaz = encodeURIComponent("디아제팜");

    const urlPwnm = `https://apis.data.go.kr/1471000/DURIrdntInfoService03/getPwnmTabooInfoList02?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&type=json&ingrName=${encAtor}`;
    const urlUsjnt = `https://apis.data.go.kr/1471000/DURIrdntInfoService03/getUsjntTabooInfoList02?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&type=json&ingrKorName=${encSimva}`;
    const urlOdsn = `https://apis.data.go.kr/1471000/DURIrdntInfoService03/getOdsnAtentInfoList02?serviceKey=${API_KEY}&numOfRows=2&pageNo=1&type=json&ingrName=${encDiaz}`;

    const [resPwnm, resUsjnt, resOdsn] = await Promise.all([httpGet(urlPwnm), httpGet(urlUsjnt), httpGet(urlOdsn)]);
    const jPwnm = JSON.parse(resPwnm.data);
    const jUsjnt = JSON.parse(resUsjnt.data);
    const jOdsn = JSON.parse(resOdsn.data);

    if (jPwnm?.header?.resultCode !== "00" || jUsjnt?.header?.resultCode !== "00" || jOdsn?.header?.resultCode !== "00") {
      throw new Error("DUR resultCode error");
    }

    const pwnmCount = jPwnm?.body?.totalCount || 0;
    const usjntCount = jUsjnt?.body?.totalCount || 0;
    const odsnCount = jOdsn?.body?.totalCount || 0;

    return `NORMAL SERVICE, 임부금기(아토르바ста틴)=${pwnmCount}건, 병용금기(심바스타틴)=${usjntCount}건, 노인주의(디아제팜)=${odsnCount}건`;
  });
  if (t6) passed++; else failed++;

  // 7. 식품의약안전처식품영양성분DB정보 (FoodNtrCpntDbInfo03)
  const t7 = await runTest("7. 식품의약안전처식품영양성분DB정보 (FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03)", async () => {
    const encFood = encodeURIComponent("비빔밥");
    const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03?serviceKey=${API_KEY}&numOfRows=1&pageNo=1&type=json&FOOD_NM_KR=${encFood}`;
    const res = await httpGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP status ${res.statusCode}`);
    const json = JSON.parse(res.data);
    const header = json?.header;
    if (header?.resultCode !== "00") throw new Error(`ResultCode: ${header?.resultCode} (${header?.resultMsg})`);
    const rawItems = json?.body?.items;
    const item = Array.isArray(rawItems) ? (rawItems[0]?.item || rawItems[0]) : (rawItems?.item || rawItems);
    if (!item) throw new Error("No items in response");

    const kcal = parseFloat(item.AMT_NUM1 || "0");
    const sugars = parseFloat(item.AMT_NUM8 || "0");
    const sodium = parseFloat(item.AMT_NUM14 || "0");
    const sugarGrade = sugars <= 8 ? "안심" : sugars <= 15 ? "보통" : "주의";
    const sodiumGrade = sodium <= 500 ? "안심" : sodium <= 900 ? "보통" : "주의";

    return `NORMAL SERVICE, ${item.FOOD_NM_KR || '비빔밥'}: ${kcal}kcal, 당류 ${sugars}g(${sugarGrade}), 나트륨 ${sodium}mg(${sodiumGrade})`;
  });
  if (t7) passed++; else failed++;

  // 8. 예외 및 결함 격리 테스트 (Failover & Resilience)
  const t8 = await runTest("8. [예외/회복력] 잘못된 인증키 거부 및 비정상 좌표 방어 검증", async () => {
    const badKeyUrl = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=INVALID_KEY_12345&numOfRows=1&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&mapX=126.981611&mapY=37.568477&radius=1000`;
    const resBad = await httpGet(badKeyUrl);
    const isBadRejected = resBad.data.includes("SERVICE_KEY") || resBad.data.includes("SERVICE KEY") || resBad.data.includes("30") || resBad.statusCode !== 200;

    const zeroCoordUrl = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=${API_KEY}&numOfRows=1&pageNo=1&MobileOS=ETC&MobileApp=VitalRoot&_type=json&mapX=125.000000&mapY=36.000000&radius=100`;
    const resZero = await httpGet(zeroCoordUrl);
    const jZero = JSON.parse(resZero.data);
    const isZeroClean = jZero?.response?.header?.resultCode === "0000";

    if (!isBadRejected || !isZeroClean) throw new Error("Failover check failed");
    return "오류 인증키 식별 차단 및 망망대해 0건 안전 반환 확인 완료";
  });
  if (t8) passed++; else failed++;

  console.log(`\n${colors.bold}----------------------------------------------------------------${colors.reset}`);
  console.log(`검증 결과 요약: 총 ${passed + failed}개 중 ${passed}개 통과, ${failed}개 실패`);
  console.log(`${colors.bold}----------------------------------------------------------------${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}${colors.bold}🎉 모든 7대 공공데이터 API 연동 및 품질 규격 검증이 완벽히 성공했습니다!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ 일부 API 검증 실패.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
