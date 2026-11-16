import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, type Command } from "./commands";
import { reserveCap, shortlist, shortageRows, stock } from "./selectors";
import type { State, PurchaseLine } from "./types";
const run = (s: State, a: string, c: Command) =>
  execute(s, a, c, `${c.type}-${s.revision}`);
const base: PurchaseLine = {
  skuId: "SKU-0-0",
  quantity: 10,
  purpose: "reserve",
  sourceRequestId: "",
  productId: "SP-A-SKU-0-0",
  price: 420000,
};
function draft(quantity = 10, line: PurchaseLine = base) {
  let s = run(createSeed(), "buyer", {
    type: "purchase.create",
    lines: [{ ...line, quantity }],
    note: "Đề nghị demo",
  });
  return { s, id: s.purchases.at(-1)!.id };
}
function approved() {
  let { s, id } = draft();
  s = run(s, "buyer", { type: "purchase.submit", id });
  for (const a of ["hc", "finance", "leader"])
    s = run(s, a, {
      type: "approve",
      entity: "purchase",
      id,
      approved: true,
      reason: "",
    });
  return { s, id };
}
describe("Mua sắm và adapter SAP local", () => {
  it("tính trần 40% quân số active làm tròn xuống, không đếm tài khoản", () => {
    const s = createSeed();
    expect(reserveCap(s)).toBe(48);
    s.employees.push(
      ...s.employees.slice(0, 3).map((e, i) => ({ ...e, id: "EXTRA-" + i })),
    );
    expect(reserveCap(s)).toBe(49);
    s.settings.reserveRatio = 0.2;
    expect(reserveCap(s)).toBe(24);
  });
  it("48 gửi được, 49 bị chặn; cộng mọi dòng dự trữ", () => {
    for (const q of [48, 49]) {
      const { s, id } = draft(q);
      if (q === 48)
        expect(
          run(s, "buyer", { type: "purchase.submit", id }).purchases.at(-1)!
            .status,
        ).toBe("pending");
      else
        expect(() => run(s, "buyer", { type: "purchase.submit", id })).toThrow(
          "giới hạn 48",
        );
    }
    const { s, id } = draft(30);
    s.purchases.at(-1)!.lines.push({
      ...base,
      skuId: "SKU-0-1",
      productId: "SP-A-SKU-0-1",
      quantity: 20,
    });
    expect(() => run(s, "buyer", { type: "purchase.submit", id })).toThrow(
      "giới hạn",
    );
  });
  it("ranking xác định, lý do rõ; không dùng mã gần đúng chưa xác nhận", () => {
    let { s, id } = draft();
    const candidates = shortlist(s, base.skuId);
    expect(candidates[0].score).toBe(100);
    expect(
      candidates
        .find((x) => x.product.supplier.startsWith("May"))!
        .reasons.join(),
    ).toContain("Khác chất liệu");
    s.purchases.at(-1)!.lines[0].productId = "SP-B-" + base.skuId;
    expect(() => run(s, "buyer", { type: "purchase.submit", id })).toThrow(
      "chưa được",
    );
    s = run(s, "buyer", {
      type: "mapping.confirm",
      skuId: base.skuId,
      productId: "SP-B-" + base.skuId,
      reason: "Chấp nhận chất liệu cho mẫu demo",
    });
    expect(
      run(s, "buyer", { type: "purchase.submit", id }).purchases.at(-1)!.status,
    ).toBe("pending");
  });
  it("đủ ba bên mới tạo PO, PO không tăng kho; lỗi adapter giữ trạng thái", () => {
    let { s, id } = draft();
    expect(() => run(s, "buyer", { type: "purchase.order", id })).toThrow(
      "đầy đủ",
    );
    ({ s, id } = approved());
    const before = stock(s, base.skuId).physical;
    s.settings.sapFailure = true;
    expect(() => run(s, "buyer", { type: "purchase.order", id })).toThrow(
      "kịch bản lỗi",
    );
    expect(s.orders.filter((o) => o.purchaseId === id)).toHaveLength(0);
    s.settings.sapFailure = false;
    s = run(s, "buyer", { type: "purchase.order", id });
    expect(s.orders.at(-1)!.id).toMatch(/^DEMO-SAP-PO/);
    expect(stock(s, base.skuId).physical).toBe(before);
  });
  it("nhận 6 rồi 4, chặn 5 vượt phần còn lại; replay không cộng đôi", () => {
    let { s, id } = approved();
    s = run(s, "buyer", { type: "purchase.order", id });
    const oid = s.orders.at(-1)!.id,
      before = stock(s, base.skuId).physical;
    s = execute(
      s,
      "warehouse",
      { type: "receipt", id: oid, quantities: { [base.skuId]: 6 } },
      "receipt-once",
    );
    expect(stock(s, base.skuId).physical).toBe(before + 6);
    expect(
      execute(
        s,
        "warehouse",
        { type: "receipt", id: oid, quantities: { [base.skuId]: 6 } },
        "receipt-once",
      ),
    ).toBe(s);
    expect(() =>
      run(s, "warehouse", {
        type: "receipt",
        id: oid,
        quantities: { [base.skuId]: 5 },
      }),
    ).toThrow("vượt");
    s = run(s, "warehouse", {
      type: "receipt",
      id: oid,
      quantities: { [base.skuId]: 4 },
    });
    expect(s.orders.at(-1)!.status).toBe("received");
    expect(stock(s, base.skuId).physical).toBe(before + 10);
    expect(s.receipts.filter((r) => r.orderId === oid)).toHaveLength(2);
  });
  it("thiếu đồng phục tạo mua bổ sung có nguồn, không mua trùng, nhận rồi duyệt/cấp", () => {
    let s = createSeed();
    const need = shortageRows(s)[0];
    expect(need.quantity).toBe(2);
    const line: PurchaseLine = {
      skuId: need.skuId,
      quantity: 2,
      purpose: "shortage",
      sourceRequestId: need.requestId,
      productId: "SP-A-" + need.skuId,
      price: 420000,
    };
    s = run(s, "buyer", {
      type: "purchase.create",
      lines: [line],
      note: "Bổ sung thiếu",
    });
    const pid = s.purchases.at(-1)!.id;
    s = run(s, "buyer", { type: "purchase.submit", id: pid });
    expect(shortageRows(s)).toHaveLength(0);
    s = run(s, "buyer", {
      type: "purchase.create",
      lines: [line],
      note: "Mua trùng",
    });
    expect(() =>
      run(s, "buyer", { type: "purchase.submit", id: s.purchases.at(-1)!.id }),
    ).toThrow("phần thiếu");
    for (const a of ["hc", "finance", "leader"])
      s = run(s, a, {
        type: "approve",
        entity: "purchase",
        id: pid,
        approved: true,
        reason: "",
      });
    s = run(s, "buyer", { type: "purchase.order", id: pid });
    s = run(s, "warehouse", {
      type: "receipt",
      id: s.orders.at(-1)!.id,
      quantities: { [need.skuId]: 2 },
    });
    s = run(s, "coord", { type: "uniform.submit", id: need.requestId });
    for (const a of ["head", "hc"])
      s = run(s, a, {
        type: "approve",
        entity: "uniform",
        id: need.requestId,
        approved: true,
        reason: "",
      });
    s = run(s, "warehouse", { type: "uniform.issue", id: need.requestId });
    expect(stock(s, need.skuId).physical).toBe(0);
    expect(s.uniforms.find((r) => r.id === need.requestId)?.status).toBe(
      "issued",
    );
  });
});
