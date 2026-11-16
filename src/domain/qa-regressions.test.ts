import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, type Command } from "./commands";
import { shortlist } from "./selectors";
import { MockSapAdapter } from "../adapters/sap";
import type { State } from "./types";
const run = (s: State, actor: string, c: Command) =>
  execute(s, actor, c, `${c.type}-${s.revision}`);
describe("Hồi quy QA prompt 4", () => {
  it("PII ở tiêu đề tài liệu/mục cũng phải che và rà soát trước xuất bản", () => {
    let s = run(createSeed(), "docs", {
      type: "document.create",
      document: {
        title: "Hướng dẫn Nhân viên demo 999",
        category: "Quy định",
        sections: [
          {
            id: "muc-1",
            title: "Liên hệ demo@example.invalid",
            text: "Nội dung tổng hợp dùng để kiểm tra.",
          },
        ],
        readRoles: ["employee"],
        signRoles: [],
        expires: "2027-12-31",
      },
    });
    const id = s.documents.at(-1)!.id;
    expect(() => run(s, "docs", { type: "document.review", id })).toThrow(
      "chưa che",
    );
    s = run(s, "docs", { type: "document.mask", id });
    const masked = s.documents.at(-1)!;
    expect(masked.title).not.toContain("Nhân viên demo 999");
    expect(masked.sections[0].title).not.toContain("demo@example.invalid");
    expect(masked.original).toContain("Nhân viên demo 999");
    s = run(s, "docs", { type: "document.review", id });
    s = run(s, "docs", { type: "document.publish", id });
    expect(s.documents.at(-1)!.status).toBe("published");
  });
  it("không tạo mã đồng phục trùng khi mã có khoảng trắng hoặc khác hoa thường", () => {
    const s = createSeed(),
      sku = s.skus.find((x) => x.id === "SKU-0-1")!;
    for (const code of [" DP-DD-M ", "dp-dd-m"])
      expect(() =>
        run(s, "warehouse", { type: "sku.save", ...sku, code }),
      ).toThrow("tồn tại");
  });
  it("không tạo tủ trùng vị trí khi có khoảng trắng/hoa thường/số 0 đầu", () => {
    const s = createSeed(),
      l = s.lockers[0];
    expect(() =>
      run(s, "hc", {
        type: "locker.save",
        number: "1",
        building: " tòa a ",
        floor: " 1 ",
        area: " khu a ",
        departmentId: l.departmentId,
        condition: "good",
        active: true,
      }),
    ).toThrow("tồn tại");
  });
  it("không đưa bản tài liệu đã bị thay thế trở lại bản nháp", () => {
    let s = run(createSeed(), "docs", {
      type: "document.version",
      id: "DEMO-TL-002",
    });
    s = run(s, "docs", { type: "document.review", id: "DEMO-TL-002" });
    s = run(s, "docs", { type: "document.publish", id: "DEMO-TL-002" });
    const old = s.documents.find((d) => d.id === "DEMO-TL-002-v2")!;
    expect(old.status).toBe("superseded");
    expect(() =>
      run(s, "docs", {
        type: "document.update",
        id: old.id,
        title: old.title,
        text: "Nội dung demo đã cũ",
        readRoles: old.readRoles,
        signRoles: old.signRoles,
        expires: old.expires,
      }),
    ).toThrow("đã thay thế");
  });
  it("tìm mô tả rút gọn hoặc đảo từ vẫn trả mã SAP thật, xếp hạng sai khác có lý do", () => {
    const s = createSeed();
    expect(
      MockSapAdapter.searchProducts(s, "SAP-A-1005").map((p) => p.id),
    ).toEqual(["SP-A-SKU-1-1"]);
    for (const q of ["bộ điều dưỡng", "điều dưỡng bộ"]) {
      const rows = shortlist(s, "SKU-1-1", q);
      expect(rows[0].product.id).toBe("SP-A-SKU-1-1");
      expect(rows.find((r) => r.product.id === "SP-B-SKU-1-1")).toMatchObject({
        score: 80,
        reasons: ["Đúng loại", "Đúng cỡ", "Khác chất liệu: cần xác nhận"],
      });
      expect(MockSapAdapter.searchProducts(s, q)).toHaveLength(14);
    }
    expect(MockSapAdapter.searchProducts(s, "SAP-A-9999")).toEqual([]);
  });
});
