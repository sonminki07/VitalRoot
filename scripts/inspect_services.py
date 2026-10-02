import os
import json
import zipfile
import xml.etree.ElementTree as ET

doc_dir = r"C:\Users\catholic\Documents\카카오톡 받은 파일\공공데이터 API 문서\공공데이터 API 문서"

def parse_docx(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        elements = []
        body = root.find("w:body", ns)
        if body is None:
            return elements
        for child in body:
            tag = child.tag.split("}")[-1]
            if tag == "p":
                text = "".join(t.text for t in child.iter(f"{{{ns['w']}}}t") if t.text).strip()
                if text:
                    elements.append({"type": "p", "text": text})
            elif tag == "tbl":
                rows = []
                for tr in child.findall("w:tr", ns):
                    row = []
                    for tc in tr.findall("w:tc", ns):
                        tc_text = " ".join("".join(t.text for t in p.iter(f"{{{ns['w']}}}t") if t.text).strip() for p in tc.findall("w:p", ns))
                        row.append(tc_text.strip())
                    rows.append(row)
                elements.append({"type": "tbl", "rows": rows})
        return elements

results = {}
for fname in sorted(os.listdir(doc_dir)):
    if fname.endswith(".docx"):
        print("Parsing:", fname)
        elements = parse_docx(os.path.join(doc_dir, fname))
        results[fname] = elements

with open("parsed_docx.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Saved parsed_docx.json")
