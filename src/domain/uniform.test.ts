import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute } from "./commands";
import { stock, issued, committed } from "./selectors";
import type { State } from "./types";
import type { Command } from "./commands";
const run = (s: State, actor: string, c: Command) =>
  execute(s, actor, c, `${c.type}-${s.revision}`);
const line = { employeeId: "DEMO-NV-031", skuId: "SKU-1-1", quantity: 1 };
function submitted(quantity = 1, exceptionReason = "") {
  let s = run(createSeed(), "coord", {
    type: "uniform.create",
    departmentId: "NOI",
    lines: [{ ...line, quantity }],
    note: "",
    exceptionReason,
  });
  const id = s.uniforms.at(-1)!.id;
  s = run(s, "coord", { type: "uniform.submit", id });
  return { s, id };
}
describe("Cấp phát đồng phục", () => {
  it("giới hạn 3 bộ tính cả đã cấp và các cam kết, không đổi tồn khi gửi", () => {
    const { s } = submitted();
    expect(issued(s, line.employeeId)).toBe(2);
    expect(committed(s, line.employeeId)).toBe(1);
    expect(stock(s, line.skuId)).toEqual({
      physical: 10,
      held: 2,
      available: 8,
    });
    expect(() => submitted(2)).toThrow("Vượt định mức");
  });
  it("ngăn sai chức danh, số lượng không nguyên và dòng trùng", () => {
    for (const lines of [
      [{ ...line, skuId: "SKU-0-0" }],
      [{ ...line, quantity: 0.5 }],
      [line, line],
    ])
      expect(() =>
        run(createSeed(), "coord", {
          type: "uniform.create",
          departmentId: "NOI",
          lines,
          note: "",
          exceptionReason: "",
        }),
      ).toThrow();
  });
  it("bắt buộc đúng bước và người duyệt độc lập; giữ hàng rồi mới trừ vật lý khi bàn giao", () => {
    let { s, id } = submitted();
    expect(() =>
      run(s, "hc", {
        type: "approve",
        entity: "uniform",
        id,
        approved: true,
        reason: "",
      }),
    ).toThrow();
    s = run(s, "head", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    expect(stock(s, line.skuId).available).toBe(8);
    s = run(s, "hc", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    expect(stock(s, line.skuId)).toEqual({
      physical: 10,
      held: 3,
      available: 7,
    });
    s = run(s, "warehouse", { type: "uniform.issue", id });
    expect(stock(s, line.skuId)).toEqual({
      physical: 9,
      held: 2,
      available: 7,
    });
    expect(issued(s, line.employeeId)).toBe(3);
    expect(() => run(s, "warehouse", { type: "uniform.issue", id })).toThrow();
  });
  it("hủy trả giữ hàng đúng một lần, không thay vật lý", () => {
    let { s, id } = submitted();
    s = run(s, "head", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    s = run(s, "hc", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    s = run(s, "coord", {
      type: "uniform.cancel",
      id,
      reason: "Không còn nhu cầu",
    });
    expect(stock(s, line.skuId).available).toBe(8);
    expect(committed(s, line.employeeId)).toBe(0);
    expect(() =>
      run(s, "coord", { type: "uniform.cancel", id, reason: "Lặp hủy" }),
    ).toThrow();
  });
  it("ngoại lệ cần lý do và thêm Lãnh đạo duyệt", () => {
    let { s, id } = submitted(2, "Cấp thêm theo nhu cầu trực tăng cường");
    expect(s.uniforms.at(-1)?.stages).toEqual(["head", "admin", "leader"]);
    s = run(s, "head", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    s = run(s, "hc", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "",
    });
    expect(s.uniforms.at(-1)?.status).toBe("pending");
    expect(() => run(s, "warehouse", { type: "uniform.issue", id })).toThrow();
    s = run(s, "leader", {
      type: "approve",
      entity: "uniform",
      id,
      approved: true,
      reason: "Duyệt ngoại lệ demo",
    });
    expect(s.uniforms.at(-1)?.status).toBe("reserved");
  });
  it("giá lịch sử không thay khi giá hiện hành đổi; trả không hoàn hạn mức", () => {
    let s = createSeed();
    s = run(s, "warehouse", {
      type: "sku.save",
      ...s.skus.find((x) => x.id === line.skuId)!,
      price: 999000,
    });
    expect(s.issuances[0].price).toBe(260000);
    s = run(s, "warehouse", {
      type: "uniform.return",
      id: s.issuances[0].id,
      quantity: 1,
      reason: "Trả bộ còn sử dụng",
    });
    expect(issued(s, line.employeeId)).toBe(2);
  });
  it("không điều chỉnh âm dưới số giữ, cần lý do và đúng quyền", () => {
    const s = createSeed();
    expect(() =>
      run(s, "warehouse", {
        type: "stock.adjust",
        skuId: line.skuId,
        quantity: -9,
        price: 300000,
        reason: "Kiểm kê hụt",
        warehouse: "TT",
      }),
    ).toThrow();
    expect(() =>
      run(s, "coord", {
        type: "stock.adjust",
        skuId: line.skuId,
        quantity: 1,
        price: 300000,
        reason: "Kiểm kê",
        warehouse: "TT",
      }),
    ).toThrow();
  });
  it("replay operationId không nhân đôi nghiệp vụ", () => {
    const s = createSeed();
    const c: Command = {
      type: "uniform.create",
      departmentId: "NOI",
      lines: [line],
      note: "",
      exceptionReason: "",
    };
    const result = execute(s, "coord", c, "same");
    expect(execute(result, "coord", c, "same")).toBe(result);
  });
});
