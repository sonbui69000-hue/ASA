import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { account, documentFor, searchDocuments } from "./selectors";
import { execute, hasPii, type Command } from "./commands";
import type { State } from "./types";
const run = (s: State, c: Command, actor = "docs") =>
  execute(s, actor, c, `${c.type}-${s.revision}`);
describe("Quyền, xử lý và dẫn nguồn tài liệu", () => {
  it("lọc quyền trước tìm kiếm và trước getById", () => {
    const s = createSeed(),
      a = account(s, "employee");
    expect(
      searchDocuments(s, a, "hợp đồng").some(
        (r) => r.document.id === "DEMO-TL-004",
      ),
    ).toBe(false);
    expect(() => documentFor(s, a, "DEMO-TL-004")).toThrow("không khả dụng");
    expect(
      searchDocuments(s, account(s, "buyer"), "hợp đồng").some(
        (r) => r.document.id === "DEMO-TL-004",
      ),
    ).toBe(true);
  });
  it("từ chối retrieval nháp, thu hồi và hết hiệu lực", () => {
    const s = createSeed(),
      a = account(s, "docs");
    expect(() => documentFor(s, a, "DEMO-TL-006")).toThrow();
    s.documents[0].expires = "2020-01-01";
    expect(
      searchDocuments(s, a, "Quy định hành chính").some(
        (r) => r.document.id === "DEMO-TL-001",
      ),
    ).toBe(false);
    expect(() => documentFor(s, a, "DEMO-TL-007")).toThrow();
  });
  it("bắt buộc che và rà soát trước lập chỉ mục", () => {
    let s = createSeed();
    expect(() =>
      run(s, { type: "document.publish", id: "DEMO-TL-006" }),
    ).toThrow("rà soát");
    expect(() =>
      run(s, { type: "document.review", id: "DEMO-TL-006" }),
    ).toThrow("chưa che");
    s = run(s, { type: "document.mask", id: "DEMO-TL-006" });
    expect(hasPii(s.documents[5].sections[0].text)).toBe(false);
    expect(s.documents[5].original).toContain("0900000000");
    s = run(s, { type: "document.review", id: "DEMO-TL-006" });
    s = run(s, { type: "document.publish", id: "DEMO-TL-006" });
    const d = documentFor(s, account(s, "employee"), "DEMO-TL-006");
    expect(d.sections[0].text).toContain("[ĐÃ CHE");
  });
  it("sửa nội dung làm mất review; thay phiên bản loại nguồn cũ khi xuất bản", () => {
    let s = createSeed();
    s = run(s, { type: "document.version", id: "DEMO-TL-002" });
    expect(
      searchDocuments(s, account(s, "employee"), "định mức")[0].document
        .version,
    ).toBe(2);
    s = run(s, {
      type: "document.update",
      id: "DEMO-TL-002",
      title: "Chính sách mới",
      text: "Nội dung tổng hợp mới có hướng dẫn xác nhận.",
      readRoles: ["employee"],
      signRoles: ["employee"],
      expires: "2027-01-01",
    });
    expect(s.documents.find((d) => d.id === "DEMO-TL-002")?.status).toBe(
      "draft",
    );
    s = run(s, { type: "document.review", id: "DEMO-TL-002" });
    s = run(s, { type: "document.publish", id: "DEMO-TL-002" });
    expect(() =>
      documentFor(s, account(s, "employee"), "DEMO-TL-002-v2"),
    ).toThrow();
    expect(documentFor(s, account(s, "employee"), "DEMO-TL-002").version).toBe(
      3,
    );
  });
  it("ký phải đúng quyền đọc / quyền ký / phiên bản, không ký lặp", () => {
    let s = createSeed();
    expect(() =>
      run(s, { type: "document.sign", id: "DEMO-TL-002" }, "buyer"),
    ).toThrow("ký");
    s = run(s, { type: "document.sign", id: "DEMO-TL-002" }, "employee");
    expect(s.documents[1].signatures[0].version).toBe(2);
    expect(() =>
      run(s, { type: "document.sign", id: "DEMO-TL-002" }, "employee"),
    ).toThrow("đã xác nhận");
    s = run(s, { type: "document.revoke", id: "DEMO-TL-002" });
    expect(() =>
      run(s, { type: "document.sign", id: "DEMO-TL-002" }, "employee"),
    ).toThrow();
  });
  it("đổi ACL có hiệu lực ngay tại dịch vụ", () => {
    let s = createSeed();
    const d = s.documents[0];
    s = run(s, {
      type: "document.update",
      id: d.id,
      title: d.title,
      text: d.sections.map((x) => x.text).join("\n\n"),
      readRoles: ["buyer"],
      signRoles: [],
      expires: d.expires,
    });
    expect(() => documentFor(s, account(s, "employee"), d.id)).toThrow();
  });
});
