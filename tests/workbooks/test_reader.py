import importlib.util
import tempfile
import unittest
from pathlib import Path
from xml.sax.saxutils import escape
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("workbook_reader", ROOT / "scripts/read-workbooks.py")
reader = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reader)


def write_workbook(file, sheets, merges=None):
    main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    with zipfile.ZipFile(file, "w") as z:
        z.writestr("xl/workbook.xml", f'<workbook xmlns="{main}" xmlns:r="{rel}"><sheets>' + ''.join(f'<sheet name="Nguồn tổng hợp {i}" sheetId="{i}" r:id="rId{i}"/>' for i in range(1, len(sheets)+1)) + '</sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", '<Relationships>' + ''.join(f'<Relationship Id="rId{i}" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets)+1)) + '</Relationships>')
        for i, rows in enumerate(sheets, 1):
            xml = f'<worksheet xmlns="{main}"><sheetData>'
            for n, cells in rows.items():
                xml += f'<row r="{n}">'
                for column, value in cells.items():
                    if isinstance(value, tuple):
                        xml += f'<c r="{column}{n}"><f>{escape(value[0])}</f><v>{value[1]}</v></c>'
                    else:
                        xml += f'<c r="{column}{n}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>'
                xml += '</row>'
            xml += '</sheetData><mergeCells>' + ''.join(f'<mergeCell ref="{ref}"/>' for ref in (merges or {}).get(i, [])) + '</mergeCells></worksheet>'
            z.writestr(f"xl/worksheets/sheet{i}.xml", xml)


class ReaderTests(unittest.TestCase):
    def test_dates_are_explicit_and_never_guess_missing_year(self):
        self.assertEqual(reader.date("1"), "1900-01-01")
        self.assertIsNone(reader.date("60"))
        self.assertEqual(reader.date("61"), "1900-03-01")
        self.assertEqual(reader.date("1", True), "1904-01-02")
        self.assertEqual(reader.date("10/11/2026"), "2026-11-10")
        self.assertIsNone(reader.date("10/11"))
        self.assertIsNone(reader.date("31/02/2026"))

    def test_numbers_retain_missing_values(self):
        self.assertIsNone(reader.number(""))
        self.assertIsNone(reader.number("hai bộ"))
        self.assertIsNone(reader.number("1.5"))
        self.assertEqual(reader.number("0"), 0)

    def test_local_xlsx_round_trip_preserves_source_ids_and_ambiguous_fields(self):
        with tempfile.TemporaryDirectory() as temp:
            uniform, lockers = Path(temp)/"uniform.xlsx", Path(temp)/"locker.xlsx"
            write_workbook(uniform, [
                {1: {"E": "Mã NV", "I": "Số lượng"}, 2: {"B": "10/11/2026", "C": "Khoa tổng hợp", "D": "Bộ tổng hợp", "E": "000123", "F": "Người tổng hợp 001", "I": "2", "J": "Áo M, quần L", "K": ("I2", "1"), "N": "000099"}},
                {1: {"B": "Tên mặt hàng"}, 3: {"B": "Bộ tổng hợp", "C": "000055", "D": "ZBO", "E": "2", "G": "123000", "I": "Ngân sách tổng hợp", "J": "BUDGET-SYNTHETIC"}, 4: {"B": "Áo tổng hợp", "D": "Cái", "E": "1", "G": ""}},
            ], {2: ["I3:I4", "J3:J4"]})
            header = {"A": "Họ và tên", "F": "Số tủ"}
            write_workbook(lockers, [
                {1: header, 2: {"A": "Dãy tổng hợp"}, 3: {"A": "Người tổng hợp 001 / Người tổng hợp 002", "D": "0900000000", "F": "001", "G": "10/11"}},
                {1: header, 3: {"F": "001"}},
                {1: header},
                {1: {"C": "Số tủ"}, 2: {"B": "Người tổng hợp", "C": "001", "D": "Lỗi khóa", "J": "Người tổng hợp khác", "K": "002", "L": "Lỗi khóa khác"}},
            ], {1: ["A2:I2"]})
            result = reader.parse(uniform, lockers)
            request = result["uniformRequests"][0]
            self.assertEqual(request["employeeCode"], "000123")
            self.assertEqual(request["prReference"], "000099")
            self.assertIsNone(request["size"])
            self.assertEqual(request["issuedQuantity"], 1)
            self.assertIn("formula_cached_values_only", request["issues"])
            self.assertEqual(result["uniformPurchases"][1]["budgetCode"], "BUDGET-SYNTHETIC")
            self.assertIsNone(result["uniformPurchases"][1]["unitPrice"])
            self.assertEqual(len(result["lockers"]), 2)
            self.assertNotEqual(result["lockers"][0]["id"], result["lockers"][1]["id"])
            self.assertIn("multiple_occupants", result["lockers"][0]["issues"])
            self.assertIsNone(result["lockers"][0]["allocationDate"])
            self.assertNotIn("0900000000", str(result))
            self.assertEqual(len(result["lockerFaults"]), 2)
            self.assertTrue(result["localOnly"])

    def test_rejects_entity_declarations(self):
        with self.assertRaises(ValueError):
            reader.xml(b'<!DOCTYPE a [<!ENTITY x "bad">]><a/>')


if __name__ == "__main__":
    unittest.main()
