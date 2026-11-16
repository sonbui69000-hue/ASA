import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, assertState, type Command } from "./commands";
import { account, shortageRows, stock } from "./selectors";
import { answerQuery } from "./assistant";
import type { State } from "./types";
const run = (s: State, a: string, c: Command) =>
  execute(s, a, c, c.type + s.revision);
describe("Biên nghiệp vụ và dữ liệu liên kết", () => {
  it("đổi tài khoản cùng nhân viên không thể tự duyệt", () => {
    let s = createSeed();
    s = run(s, "coord", {
      type: "uniform.create",
      departmentId: "NOI",
      lines: [{ employeeId: "DEMO-NV-031", skuId: "SKU-1-1", quantity: 1 }],
      exceptionReason: "",
      note: "",
    });
    const id = s.uniforms.at(-1)!.id;
    s = run(s, "coord", { type: "uniform.submit", id });
    s.accounts.push({
      ...account(s, "head"),
      id: "same-person",
      employeeId: account(s, "coord").employeeId,
    });
    expect(() =>
      run(s, "same-person", {
        type: "approve",
        entity: "uniform",
        id,
        approved: true,
        reason: "",
      }),
    ).toThrow("tự duyệt");
  });
  it("hồ sơ năm cũ không được bàn giao; hạ hạn mức không sửa snapshot", () => {
    let s = createSeed();
    const old = s.uniforms.find((r) => r.id === "DEMO-YC-001")!;
    s = run(s, "system", {
      type: "settings",
      settings: { ...s.settings, annualLimit: 1 },
    });
    expect(s.uniforms.find((r) => r.id === old.id)?.limit).toBe(3);
    s = run(s, "system", {
      type: "settings",
      settings: { ...s.settings, date: "2027-01-01" },
    });
    expect(() =>
      run(s, "warehouse", { type: "uniform.issue", id: old.id }),
    ).toThrow("năm khác");
  });
  it("gom thiếu cùng SKU từ nhiều người, không tính tồn khả dụng nhiều lần", () => {
    const s = createSeed();
    const r = s.uniforms.find((r) => r.id === "DEMO-YC-002")!;
    r.lines.push({ employeeId: "DEMO-NV-034", skuId: "SKU-0-3", quantity: 1 });
    expect(shortageRows(s).filter((x) => x.requestId === r.id)).toEqual([
      { requestId: r.id, departmentId: "NOI", skuId: "SKU-0-3", quantity: 3 },
    ]);
  });
  it("nhân viên ngừng hoạt động không dùng tài khoản; cấu hình và enum hỏng bị chặn", () => {
    const s = createSeed();
    s.employees.find(
      (e) => e.id === account(s, "employee").employeeId,
    )!.active = false;
    expect(() => account(s, "employee")).toThrow("ngừng hoạt động");
    s.settings.reserveRatio = 4;
    expect(() => assertState(s)).toThrow("không hợp lệ");
  });
  it("trợ lý tách kho, không trả hợp đồng nhà cung cấp ngoài dữ liệu", () => {
    const s = createSeed();
    expect(
      answerQuery(s, account(s, "hc"), "Tồn kho DP-DD-M ở kho Nội").text,
    ).toContain("kho khoa Nội: 0 bộ");
    expect(
      answerQuery(s, account(s, "buyer"), "Hợp đồng NCC Sao Thủy").evidence,
    ).toHaveLength(0);
  });
  it("audit có trước/sau và không chứa văn bản gốc cá nhân", () => {
    let s = createSeed();
    s = run(s, "docs", { type: "document.mask", id: "DEMO-TL-006" });
    expect(s.audits[0].before).toBeDefined();
    expect(s.audits[0].after).toBeDefined();
    expect(JSON.stringify(s.audits[0])).not.toContain("0900000000");
    s = run(s, "warehouse", {
      type: "stock.adjust",
      skuId: "SKU-1-1",
      quantity: -1,
      price: 300000,
      reason: "Kiểm kê điều chỉnh hụt",
      warehouse: "TT",
    });
    expect(s.audits[0].before?.available).toBe(8);
    expect(s.audits[0].after?.available).toBe(7);
    expect(stock(s, "SKU-1-1").physical).toBe(9);
  });
});
