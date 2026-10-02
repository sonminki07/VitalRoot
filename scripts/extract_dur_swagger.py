import urllib.request
import re
import json

url = "https://www.data.go.kr/data/15056780/openapi.do"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as r:
    html = r.read().decode("utf-8", errors="replace")

pos = html.find("const swaggerJson = `")
if pos != -1:
    start = pos + len("const swaggerJson = `")
    end = html.find("`;", start)
    raw_swagger = html[start:end]
    swagger_data = json.loads(raw_swagger)
    with open("dur_swagger.json", "w", encoding="utf-8") as f:
        json.dump(swagger_data, f, ensure_ascii=False, indent=2)
    print("SUCCESS! Saved dur_swagger.json")
    print("Host:", swagger_data.get("host"))
    print("BasePath:", swagger_data.get("basePath"))
    print("Paths:", json.dumps(list(swagger_data.get("paths", {}).keys()), indent=2))
else:
    print("Could not find const swaggerJson = `")
