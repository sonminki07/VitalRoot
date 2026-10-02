import os, zipfile, json
import xml.etree.ElementTree as ET

doc_dir = r"C:\Users\catholic\Documents\카카오톡 받은 파일\공공데이터 API 문서\공공데이터 API 문서"
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

def analyze_doc(filename):
    filepath = os.path.join(doc_dir, filename)
    with zipfile.ZipFile(filepath) as z:
        root = ET.fromstring(z.read("word/document.xml"))
        
        info = {
            "filename": filename,
            "endpoints": [],
            "operations": []
        }
        
        # Look for table rows containing REST or callback URLs
        for tbl in root.iter(f"{{{ns['w']}}}tbl"):
            rows = []
            for tr in tbl.findall(f"{{{ns['w']}}}tr"):
                row = []
                for tc in tr.findall(f"{{{ns['w']}}}tc"):
                    t = "".join(node.text for node in tc.iter(f"{{{ns['w']}}}t") if node.text).strip()
                    row.append(t)
                rows.append(row)
            
            content = " ".join(" ".join(r) for r in rows)
            if "apis.data.go.kr" in content or "B551011" in content or "REST" in content:
                for r in rows:
                    for cell in r:
                        if "http" in cell or "apis.data.go.kr" in cell or "B551011" in cell:
                            info["endpoints"].append(cell)
                        if "오퍼레이션" in cell or "get" in cell or "List" in cell:
                            info["operations"].append(" | ".join(r))
        return info

results = {}
for fn in sorted(os.listdir(doc_dir)):
    if fn.endswith(".docx"):
        results[fn] = analyze_doc(fn)

with open("doc_endpoints_analysis.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Saved doc_endpoints_analysis.json")
