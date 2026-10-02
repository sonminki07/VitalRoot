import os, zipfile, json
import xml.etree.ElementTree as ET

doc_dir = r"C:\Users\catholic\Documents\카카오톡 받은 파일\공공데이터 API 문서\공공데이터 API 문서"
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

def extract_doc_details(fn):
    fp = os.path.join(doc_dir, fn)
    with zipfile.ZipFile(fp) as z:
        root = ET.fromstring(z.read("word/document.xml"))
        
        paragraphs = []
        for p in root.iter(f"{{{ns['w']}}}p"):
            t = "".join(node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text).strip()
            if t:
                paragraphs.append(t)
                
        tables = []
        for tbl in root.iter(f"{{{ns['w']}}}tbl"):
            rows = []
            for tr in tbl.findall(f"{{{ns['w']}}}tr"):
                row = []
                for tc in tr.findall(f"{{{ns['w']}}}tc"):
                    t = " ".join("".join(node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text).strip() for p in tc.findall(f"{{{ns['w']}}}p"))
                    row.append(t.strip())
                rows.append(row)
            tables.append(rows)
            
    # Find operations and endpoints
    ops = []
    for tbl in tables:
        tbl_text = json.dumps(tbl, ensure_ascii=False)
        if "apis.data.go.kr" in tbl_text or "locationBasedList" in tbl_text or "detailWithTour" in tbl_text:
            ops.append(tbl)
            
    return {
        "filename": fn,
        "first_50_paras": paragraphs[:50],
        "op_tables_count": len(ops),
        "op_tables": ops
    }

for fn in sorted(os.listdir(doc_dir)):
    if fn.endswith(".docx"):
        res = extract_doc_details(fn)
        out_name = fn.replace(".docx", ".json")
        with open(out_name, "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
        print(f"Processed {fn} -> {out_name}")

print("Done extracting doc details.")
