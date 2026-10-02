import urllib.request
import urllib.parse
import json

KEY = "403b2fe19eec414cb6ba3fbdaed716ee3a54adb732b82e1c9aca7e2d1835e9d7"

def test_api(name, url, params):
    qs = urllib.parse.urlencode(params)
    full_url = f"{url}?{qs}"
    print(f"\n--- Testing: {name} ---")
    print(f"URL: {full_url}")
    try:
        req = urllib.request.Request(
            full_url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            print(f"HTTP Status: {status}")
            print(f"Body snippet (first 300 chars):\n{body[:300]}")
            try:
                j = json.loads(body)
                print("Parsed JSON successfully.")
                if "response" in j:
                    print("response header:", j["response"].get("header"))
                    body_items = j["response"].get("body", {}).get("items")
                    print("item count or sample:", type(body_items), str(body_items)[:200])
                elif "body" in j:
                    print("body header:", j.get("header"))
                    print("items sample:", str(j.get("body", {}).get("items"))[:200])
            except Exception as e:
                print("Could not parse as JSON:", e)
    except Exception as e:
        print(f"Error calling {name}: {e}")

# 1. KorService2 - locationBasedList2
test_api(
    "1. KorService2 (locationBasedList2)",
    "https://apis.data.go.kr/B551011/KorService2/locationBasedList2",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "VitalRoot",
        "_type": "json",
        "mapX": "126.981611",
        "mapY": "37.568477",
        "radius": "2000",
        "contentTypeId": "39"
    }
)

# 2. KorWithService2 - locationBasedList2
test_api(
    "2. KorWithService2 (locationBasedList2)",
    "https://apis.data.go.kr/B551011/KorWithService2/locationBasedList2",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "VitalRoot",
        "_type": "json",
        "mapX": "126.981611",
        "mapY": "37.568477",
        "radius": "2000"
    }
)

# 3. WellnessTursmService - locationBasedList (with KOR)
test_api(
    "3. WellnessTursmService (KOR)",
    "https://apis.data.go.kr/B551011/WellnessTursmService/locationBasedList",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "VitalRoot",
        "_type": "json",
        "langDivCd": "KOR",
        "mapX": "126.981611",
        "mapY": "37.568477",
        "radius": "20000"
    }
)

# 4. MdclTursmService - locationBasedList (test both KOR and ENG)
test_api(
    "4a. MdclTursmService (KOR)",
    "https://apis.data.go.kr/B551011/MdclTursmService/locationBasedList",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "VitalRoot",
        "_type": "json",
        "langDivCd": "KOR",
        "mapX": "126.981611",
        "mapY": "37.568477",
        "radius": "20000"
    }
)

test_api(
    "4b. MdclTursmService (ENG)",
    "https://apis.data.go.kr/B551011/MdclTursmService/locationBasedList",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "VitalRoot",
        "_type": "json",
        "langDivCd": "ENG",
        "mapX": "126.981611",
        "mapY": "37.568477",
        "radius": "20000"
    }
)

# 5. DUR Bundle Info Service (DrbBundleInfoService02)
test_api(
    "5. DrbBundleInfoService02",
    "https://apis.data.go.kr/1471000/DrbBundleInfoService02/getDrbBundleList02",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "type": "json",
        "itemName": "다이아벡스"
    }
)

# 6. DUR Ingredient Info Service (DURIrdntInfoService03)
test_api(
    "6. DURIrdntInfoService03",
    "https://apis.data.go.kr/1471000/DURIrdntInfoService03/getUsjntTabooInfoList03",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "type": "json",
        "typeName": "병용금기"
    }
)

# 7. Food Nutrition DB Info (FoodNtrCpntDbInfo03)
test_api(
    "7. FoodNtrCpntDbInfo03",
    "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03",
    {
        "serviceKey": KEY,
        "numOfRows": "3",
        "pageNo": "1",
        "type": "json",
        "FOOD_NM_KR": "비빔밥"
    }
)
