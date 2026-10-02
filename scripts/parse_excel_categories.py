import os
import json
import zipfile
import xml.etree.ElementTree as ET

doc_dir = r"C:\Users\catholic\Documents\카카오톡 받은 파일\공공데이터 API 문서\공공데이터 API 문서"

def parse_xlsx_clean(xlsx_path):
    with zipfile.ZipFile(xlsx_path) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            for si in ss_root.iter(f"{{{ns['s']}}}si"):
                t = "".join(node.text for node in si.iter(f"{{{ns['s']}}}t") if node.text)
                shared_strings.append(t)
        
        sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rows = []
        for r in sheet_root.iter(f"{{{ns['s']}}}row"):
            # Map cell by column letter
            row_dict = {}
            for c in r.iter(f"{{{ns['s']}}}c"):
                ref = c.get("r") # e.g. A1, B2
                col = "".join(ch for ch in ref if ch.isalpha())
                val = c.find(f"{{{ns['s']}}}v")
                t_attr = c.get("t")
                cell_val = ""
                if val is not None and val.text is not None:
                    if t_attr == "s":
                        idx = int(val.text)
                        cell_val = shared_strings[idx] if idx < len(shared_strings) else ""
                    else:
                        cell_val = val.text
                row_dict[col] = cell_val
            rows.append(row_dict)
        return rows

rows = parse_xlsx_clean(os.path.join(doc_dir, "신분류체계정보 관광타입정보 연계 정의서.xlsx"))

# Let's see rows from row 10 onwards
curr_lcls1 = ""
curr_lcls1_nm = ""
curr_lcls2 = ""
curr_lcls2_nm = ""

parsed_categories = []

for r in rows:
    # Check if row has column E (소분류코드)
    if r.get("A"):
        curr_lcls1 = r.get("A", "")
        curr_lcls1_nm = r.get("B", "")
    if r.get("C"):
        curr_lcls2 = r.get("C", "")
        curr_lcls2_nm = r.get("D", "")
    
    lcls3 = r.get("E", "")
    lcls3_nm = r.get("F", "")
    content_type_id = r.get("G", "")
    content_type_nm = r.get("I", "")

    if lcls3 and lcls3.isalnum() and len(lcls3) >= 6:
        parsed_categories.append({
            "lclsSystm1": curr_lcls1,
            "lclsSystm1Name": curr_lcls1_nm,
            "lclsSystm2": curr_lcls2,
            "lclsSystm2Name": curr_lcls2_nm,
            "lclsSystm3": lcls3,
            "lclsSystm3Name": lcls3_nm,
            "contentTypeId": content_type_id,
            "contentTypeName": content_type_nm
        })

print("Total parsed categories:", len(parsed_categories))

# Summarize main categories
summary = {}
for c in parsed_categories:
    l1 = f"{c['lclsSystm1']} ({c['lclsSystm1Name']})"
    if l1 not in summary:
        summary[l1] = set()
    summary[l1].add(f"{c['lclsSystm2']} ({c['lclsSystm2Name']})")

with open("categories_summary.txt", "w", encoding="utf-8") as out:
    for l1, l2s in sorted(summary.items()):
        out.write(f"\n{l1}:\n")
        for l2 in sorted(l2s):
            out.write(f"  - {l2}\n")

with open("categories_parsed.json", "w", encoding="utf-8") as f:
    json.dump(parsed_categories, f, ensure_ascii=False, indent=2)

print("\nSaved categories_summary.txt and categories_parsed.json")
