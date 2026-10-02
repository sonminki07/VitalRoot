import json

with open("parsed_docx.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with open("api_analysis.txt", "w", encoding="utf-8") as out:
    for fname, elements in data.items():
        out.write(f"\n{'='*50}\nDOC: {fname}\n{'='*50}\n")
        curr_op = None
        for i, el in enumerate(elements):
            if el["type"] == "p" and ("오퍼레이션 명세" in el["text"] or "오퍼레이션명" in el["text"]):
                curr_op = el["text"]
                out.write(f"\n[OPERATION] {curr_op}\n")
            elif el["type"] == "tbl":
                rows = el["rows"]
                # Look for Call Back URL or table types
                is_url_table = any("Call Back URL" in str(r) for r in rows)
                is_req_table = any("항목명(영문)" in str(r) or "요청" in str(r) for r in rows)
                is_res_table = any("resultCode" in str(r) or "응답" in str(r) for r in rows)
                is_sample_table = any("REST (URI)" in str(r) or "http" in str(r) for r in rows)
                
                if is_url_table:
                    out.write(f"  --- Callback URL Table ---\n")
                    for r in rows:
                        out.write(f"    {' | '.join(r)}\n")
                elif is_req_table:
                    out.write(f"  --- Request Parameters ({len(rows)} rows) ---\n")
                    for r in rows:
                        out.write(f"    {' | '.join(r)}\n")
                elif is_res_table:
                    out.write(f"  --- Response Fields ({len(rows)} rows) ---\n")
                    for r in rows:
                        out.write(f"    {' | '.join(r)}\n")
                elif is_sample_table:
                    out.write(f"  --- Sample Request/Response ---\n")
                    for r in rows:
                        out.write(f"    {' | '.join(r)}\n")

print("Analyzed and saved to api_analysis.txt")
