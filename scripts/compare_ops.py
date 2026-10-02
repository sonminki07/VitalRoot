import json

with open("parsed_docx.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def find_op_tables(doc_key, op_url_suffix):
    elements = data.get(doc_key, [])
    found = False
    results = []
    for i, el in enumerate(elements):
        if el["type"] == "tbl":
            # check if callback url is in this table
            content = json.dumps(el["rows"], ensure_ascii=False)
            if op_url_suffix in content:
                found = True
                results.append(("URL_TBL", el["rows"]))
            elif found:
                results.append(("TBL", el["rows"]))
                if len(results) >= 4:
                    break
        elif el["type"] == "p" and found and "오퍼레이션" in el["text"]:
            # Next operation started
            break
    return results

ops_to_check = [
    ("한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx", "KorService2/locationBasedList2"),
    ("한국관광공사_개방데이터_활용매뉴얼(무장애여행)_v4.3.docx", "KorWithService2/locationBasedList2"),
    ("한국관광공사_개방데이터_활용매뉴얼(웰니스)_v4.1.docx", "WellnessTursmService/locationBasedList"),
    ("한국관광공사_개방데이터_활용매뉴얼(의료)_v4.1.docx", "MdclTursmService/locationBasedList")
]

with open("op_comparison.txt", "w", encoding="utf-8") as out:
    for doc_name, op_suffix in ops_to_check:
        out.write(f"\n========================================\n{op_suffix} ({doc_name})\n========================================\n")
        tbls = find_op_tables(doc_name, op_suffix)
        for t_type, rows in tbls:
            out.write(f"\n--- {t_type} ({len(rows)} rows) ---\n")
            for r in rows:
                out.write(" | ".join(r) + "\n")

print("Saved op_comparison.txt")
