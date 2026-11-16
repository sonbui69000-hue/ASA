"""Read legacy XLSX locally using the standard library; never print source records."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def xml(data):
    if b"<!DOCTYPE" in data or b"<!ENTITY" in data:
        raise ValueError("XML declarations are not supported")
    return ET.fromstring(data)


def folded(value):
    return " ".join("".join(c for c in unicodedata.normalize("NFD", value.lower().replace("đ", "d")) if unicodedata.category(c) != "Mn").split())


def number(value):
    if not value:
        return None
    try:
        n = float(value.replace(",", "."))
        return int(n) if n.is_integer() and 0 <= n <= 10**12 else None
    except (ValueError, OverflowError):
        return None


def date(value, date1904=False):
    if not value:
        return None
    try:
        if re.fullmatch(r"\d+(?:\.\d+)?", value):
            n = float(value)
            if not 1 <= n < 100000 or (not date1904 and int(n) == 60):
                return None
            origin = dt.datetime(1904, 1, 1) if date1904 else dt.datetime(1899, 12, 30)
            if not date1904 and n < 60:
                origin = dt.datetime(1899, 12, 31)
            return (origin + dt.timedelta(days=n)).date().isoformat()
        if re.fullmatch(r"\d{4}-\d\d-\d\d(?:T.*)?", value):
            return dt.date.fromisoformat(value[:10]).isoformat()
        # Workbook locale is Vietnamese; never guess a missing year.
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y"):
            try:
                return dt.datetime.strptime(value.strip(), fmt).date().isoformat()
            except ValueError:
                pass
    except (ValueError, OverflowError):
        pass
    return None


def workbook(file):
    content = Path(file).read_bytes()
    if len(content) > 40 * 1024 * 1024:
        raise ValueError("Workbook exceeds size limit")
    with zipfile.ZipFile(file) as z:
        if sum(i.file_size for i in z.infolist()) > 100 * 1024 * 1024 or any(i.file_size > 32 * 1024 * 1024 for i in z.infolist()):
            raise ValueError("Workbook XML exceeds size limit")
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            strings = ["".join(si.itertext()) for si in xml(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        wb = xml(z.read("xl/workbook.xml"))
        props = wb.find("m:workbookPr", NS)
        date1904 = props is not None and props.get("date1904") in ("1", "true")
        relationships = {r.get("Id"): r for r in xml(z.read("xl/_rels/workbook.xml.rels"))}
        sheets = []
        for index, sheet in enumerate(wb.findall("m:sheets/m:sheet", NS), 1):
            relationship = relationships[sheet.get("{" + REL + "}id")]
            if relationship.get("TargetMode") == "External":
                raise ValueError("External sheet is not supported")
            target = relationship.get("Target", "")
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            if not target.startswith("xl/worksheets/"):
                raise ValueError("Invalid sheet target")
            root = xml(z.read(target))
            rows = []
            for row in root.findall("m:sheetData/m:row", NS):
                values, formulas = {}, []
                for cell in row.findall("m:c", NS):
                    column = re.sub(r"\d", "", cell.get("r", ""))
                    value = cell.findtext("m:v", "", NS)
                    if cell.get("t") == "s":
                        value = strings[int(value)] if value else ""
                    elif cell.get("t") == "inlineStr":
                        inline = cell.find("m:is", NS)
                        value = "".join(inline.itertext()) if inline is not None else ""
                    if len(value) > 10000:
                        raise ValueError("Cell exceeds size limit")
                    values[column] = value.strip()
                    if cell.find("m:f", NS) is not None:
                        formulas.append(column)
                rows.append((int(row.get("r")), values, formulas))
            if len(rows) > 20000:
                raise ValueError("Too many workbook rows")
            sheets.append({"index": index, "name": sheet.get("name", ""), "rows": rows, "merges": [m.get("ref") for m in root.findall("m:mergeCells/m:mergeCell", NS)]})
    return {"fileName": Path(file).name, "sha256": hashlib.sha256(content).hexdigest(), "date1904": date1904, "sheets": sheets}


def source(book, sheet, row, kind):
    return {"id": f"XLS-{kind}-{sheet['index']:02d}-{row:05d}", "sheet": sheet["name"], "sheetIndex": sheet["index"], "row": row}


def read_uniform(book):
    requests, purchases = [], []
    first = book["sheets"][0]
    header = first["rows"][0][1]
    if folded(header.get("E", "")) != "ma nv" or folded(header.get("I", "")) != "so luong":
        raise ValueError("Uniform request headers do not match the supported workbook")
    for row, c, formulas in first["rows"]:
        if row <= 1 or not any(c.get(k) for k in ("E", "F", "D")):
            continue
        issues = []
        requested, issued = number(c.get("I", "")), number(c.get("K", ""))
        request_date, issue_date = date(c.get("B", ""), book["date1904"]), date(c.get("L", ""), book["date1904"])
        size = c.get("J", "").upper()
        size = {"2XL": "XXL", "XXXL": "3XL"}.get(size, size)
        if not re.fullmatch(r"XS|S|M|L|XL|XXL|3XL|[1-9]\d?", size):
            issues.append("size_missing_or_composite")
            size = None
        if not c.get("E") or not c.get("F"):
            issues.append("employee_identity_incomplete")
        if not request_date:
            issues.append("request_date_unresolved")
        if requested is None or requested == 0:
            issues.append("requested_quantity_unresolved")
        if c.get("K") and issued is None:
            issues.append("issued_quantity_unresolved")
        if (issued or c.get("L")) and not issue_date:
            issues.append("issue_date_unresolved")
        if issued is not None and requested is not None and issued != requested:
            issues.append("issued_differs_from_requested")
        if formulas:
            issues.append("formula_cached_values_only")
        requests.append({**source(book, first, row, "UNI"), "employeeCode": c.get("E", ""), "employeeName": c.get("F", ""), "department": c.get("C", ""), "jobTitle": c.get("G", ""), "gender": c.get("H", ""), "uniformType": c.get("D", ""), "sizeRaw": c.get("J", ""), "size": size, "requestedQuantity": requested, "requestedQuantityRaw": c.get("I", ""), "issuedQuantity": issued, "issuedQuantityRaw": c.get("K", ""), "requestDate": request_date, "requestDateRaw": c.get("B", ""), "issueDate": issue_date, "issueDateRaw": c.get("L", ""), "prReference": c.get("N", ""), "poReference": c.get("O", ""), "productCode": c.get("P", ""), "productName": c.get("Q", ""), "notes": c.get("M", ""), "issues": issues})
    if len(book["sheets"]) > 1:
        sheet = book["sheets"][1]
        # Propagate only explicitly merged budget/category metadata, never employee identity.
        row_map = {n: dict(c) for n, c, _ in sheet["rows"]}
        for merge in sheet["merges"]:
            m = re.fullmatch(r"([IJKL])(\d+):\1(\d+)", merge)
            if m and int(m[2]) > 2:
                value = row_map.get(int(m[2]), {}).get(m[1], "")
                for n in range(int(m[2]), int(m[3]) + 1):
                    row_map.setdefault(n, {}).setdefault(m[1], value)
                    if not row_map[n][m[1]]:
                        row_map[n][m[1]] = value
        for row, _, formulas in sheet["rows"]:
            c = row_map[row]
            if row <= 2 or not c.get("B") or not (c.get("C") or c.get("D") or c.get("E")):
                continue
            issues = []
            quantity, price = number(c.get("E", "")), number(c.get("G", ""))
            if folded(c.get("D", "")) not in ("bo", "zbo"):
                issues.append("unit_not_a_uniform_set")
            if quantity is None:
                issues.append("quantity_unresolved")
            if price is None:
                issues.append("price_unresolved")
            if formulas:
                issues.append("formula_cached_values_only")
            purchases.append({**source(book, sheet, row, "BUY"), "productCode": c.get("C", ""), "productName": c.get("B", ""), "unit": c.get("D", ""), "quantity": quantity, "quantityRaw": c.get("E", ""), "unitPrice": price, "unitPriceRaw": c.get("G", ""), "sourceTotalRaw": c.get("H", ""), "budgetName": c.get("I", ""), "budgetCode": c.get("J", ""), "department": c.get("K", ""), "purchaseMonthRaw": c.get("L", ""), "notes": c.get("F", ""), "issues": issues})
    return requests, purchases


def read_lockers(book):
    lockers, faults = [], []
    for sheet in book["sheets"][:3]:
        first = sheet["rows"][0][1]
        if folded(first.get("F", "")) != "so tu":
            raise ValueError("Locker headers do not match the supported workbook")
        section = ""
        section_rows = {int(re.search(r"\d+", m).group()) for m in sheet["merges"] if re.fullmatch(r"A\d+:[IJ]\d+", m)}
        for row, c, _ in sheet["rows"]:
            if row in section_rows:
                section = c.get("A", "")
            if row <= 2 or not c.get("F") or folded(c["F"]) == "so tu":
                continue
            issues = []
            received, returned = date(c.get("G", ""), book["date1904"]), date(c.get("H", ""), book["date1904"])
            if not c.get("E"):
                issues.append("employee_code_missing_do_not_join_by_name")
            if not c.get("A"):
                issues.append("occupant_missing_not_proof_of_availability")
            if re.search(r"\n|\s/\s|\s&\s", c.get("A", "")):
                issues.append("multiple_occupants")
            if not received:
                issues.append("allocation_date_unresolved")
            if c.get("H") and not returned:
                issues.append("return_date_unresolved")
            if received and returned and returned < received:
                issues.append("return_before_allocation")
            lockers.append({**source(book, sheet, row, "LCK"), "section": section, "number": c.get("F", ""), "employeeCode": c.get("E", ""), "employeeName": c.get("A", ""), "jobTitle": c.get("B", ""), "department": c.get("C", ""), "allocationDate": received, "allocationDateRaw": c.get("G", ""), "returnDate": returned, "returnDateRaw": c.get("H", ""), "notes": c.get("I", ""), "issues": issues})
    if len(book["sheets"]) > 3:
        sheet = book["sheets"][3]
        for row, c, _ in sheet["rows"]:
            if row <= 1:
                continue
            for side, cols in enumerate((("B", "C", "D", "E"), ("J", "K", "L", "M")), 1):
                name, locker, fault, notes = [c.get(col, "") for col in cols]
                if locker:
                    faults.append({**source(book, sheet, row, f"FLT{side}"), "number": locker, "employeeName": name, "conditionRaw": fault, "notes": notes, "issues": ["location_and_current_condition_require_review"]})
    return lockers, faults


def parse(uniform_file, locker_file):
    uniform, locker = workbook(uniform_file), workbook(locker_file)
    requests, purchases = read_uniform(uniform)
    lockers, faults = read_lockers(locker)
    fingerprint = hashlib.sha256((uniform["sha256"] + locker["sha256"]).encode()).hexdigest()
    return {"version": 1, "fingerprint": fingerprint, "importedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "localOnly": True, "workbooks": [{"fileName": b["fileName"], "sha256": b["sha256"], "sheets": [{"index": s["index"], "name": s["name"]} for s in b["sheets"]]} for b in (uniform, locker)], "uniformRequests": requests, "uniformPurchases": purchases, "lockers": lockers, "lockerFaults": faults, "omittedFields": ["phone_number", "unlabelled_auxiliary_columns", "empty_sheets", "blank_request_template"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--uniform", required=True)
    parser.add_argument("--lockers", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = parse(args.uniform, args.lockers)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)
    print(json.dumps({"uniformRows": len(result["uniformRequests"]), "purchaseRows": len(result["uniformPurchases"]), "lockerRows": len(result["lockers"]), "faultRows": len(result["lockerFaults"])}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Không đọc được workbook; kiểm tra định dạng, đường dẫn và quyền file. Không ghi source records vào log.", file=sys.stderr)
        sys.exit(1)
