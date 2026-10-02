import os
import sys
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
                    elements.append(("p", text))
            elif tag == "tbl":
                rows = []
                for tr in child.findall("w:tr", ns):
                    row = []
                    for tc in tr.findall("w:tc", ns):
                        tc_text = " ".join("".join(t.text for t in p.iter(f"{{{ns['w']}}}t") if t.text).strip() for p in tc.findall("w:p", ns))
                        row.append(tc_text.strip())
                    rows.append(row)
                elements.append(("tbl", rows))
        return elements

def parse_xlsx(xlsx_path):
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
            row_data = []
            for c in r.iter(f"{{{ns['s']}}}c"):
                val = c.find(f"{{{ns['s']}}}v")
                t_attr = c.get("t")
                if val is not None and val.text is not None:
                    if t_attr == "s":
                        idx = int(val.text)
                        row_data.append(shared_strings[idx] if idx < len(shared_strings) else "")
                    else:
                        row_data.append(val.text)
                else:
                    row_data.append("")
            rows.append(row_data)
        return rows

with open("docs_summary.txt", "w", encoding="utf-8") as out:
    for fname in sorted(os.listdir(doc_dir)):
        fpath = os.path.join(doc_dir, fname)
        out.write(f"\n========================================\nFILE: {fname}\n========================================\n")
        if fname.endswith(".docx"):
            elements = parse_docx(fpath)
            for etype, data in elements:
                if etype == "p":
                    if any(k in data for k in ["오퍼레이션", "명세", "URL", "엔드포인트", "서비스명", "KorService", "KorWithService", "MdclTursm", "WellnessTursm", "locationBased", "areaBased", "searchKeyword", "detailCommon"]):
                        out.write(f"[P] {data}\n")
                elif etype == "tbl":
                    # Check if table has interesting info
                    tbl_str = " | ".join(data[0]) if data else ""
                    if any(k in tbl_str for k in ["오퍼레이션", "항목명", "파라미터", "서비스", "요청", "URI", "엔드포인트", "REST", "국문", "영문"]):
                        out.write(f"--- TBL ({len(data)} rows) ---\n")
                        for r in data[:15]:
                            out.write(" | ".join(r) + "\n")
                        if len(data) > 15:
                            out.write(f"... and {len(data)-15} more rows\n")
        elif fname.endswith(".xlsx"):
            rows = parse_xlsx(fpath)
            out.write(f"Total rows in sheet1: {len(rows)}\n")
            for r in rows[:30]:
                out.write(" | ".join(r) + "\n")
            out.write(f"... and {len(rows)-30} more rows\n")

print("Parsing complete. Output written to docs_summary.txt")
