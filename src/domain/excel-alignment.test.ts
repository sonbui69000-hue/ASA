import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, assertState, type Command } from "./commands";
import {
  account,
  stock,
  issued,
  reserveCap,
  purchaseReport,
  linkedPurchases,
  lastIssuedDate,
  shortlist,
} from "./selectors";
import { normalizeSize, eligibleSku } from "./uniform-attributes";
import { answerQuery } from "./assistant";
import { migrateState } from "../store/migrations";
import { legacyState } from "../../tests/helpers/legacy-state";
import { DemoStore, STORAGE_KEY } from "../store/store";
import type { State } from "./types";
const run = (s: State, a: string, c: Command) =>
  execute(s, a, c, `${c.type}-${s.revision}`);
describe("Đối chiếu cấu trúc Excel trên dữ liệu hư cấu", () => {
  it("seed canonical v2 có quota đủ/chưa đủ, giao dịch mua pending/received và toàn bộ FK hợp lệ", () => {
    const s = createSeed();
    assertState(s);
    expect(s.schemaVersion).toBe(2);
    expect(reserveCap(s)).toBe(48);
    expect(issued(s, "DEMO-NV-004")).toBe(3);
    expect(issued(s, "DEMO-NV-031")).toBe(2);
    expect(s.purchases.filter((p) => p.status === "pending")).toHaveLength(1);
    expect(s.orders.filter((o) => o.status === "received")).toHaveLength(1);
    expect(stock(s, "SKU-DD-F-XXL").available).toBe(0);
    expect(stock(s, "SKU-HC-M-40").physical).toBe(15);
    expect(createSeed()).toEqual(s);
  });
  it.each([
    ["2xl", "XXL"],
    ["XXXL", "3XL"],
    [" xs ", "XS"],
    ["40", "40"],
  ])("chuẩn hóa cỡ %s → %s", (input, expected) =>
    expect(normalizeSize(input)).toBe(expected),
  );
  it("chặn alias trùng biến thể, chuỗi nhiều cỡ và thay thuộc tính lịch sử", () => {
    const s = createSeed(),
      sku = s.skus.find((x) => x.id === "SKU-DD-F-XXL")!;
    expect(() =>
      run(s, "warehouse", {
        type: "sku.save",
        ...sku,
        id: undefined,
        code: "DEMO-NEW-SIZE",
        size: "2XL",
      }),
    ).toThrow("tồn tại");
    expect(() =>
      run(s, "warehouse", {
        type: "sku.save",
        ...sku,
        id: undefined,
        code: "DEMO-MIXED",
        size: "M:2; L:1",
      }),
    ).toThrow("một cỡ");
    expect(() =>
      run(s, "warehouse", { type: "sku.save", ...sku, gender: "unisex" }),
    ).toThrow("Không đổi");
  });
  it("giới tính không được đoán từ tên; UI/service cùng kiểm tra nhưng mã dùng chung vẫn tương thích", () => {
    const s = createSeed(),
      female = s.employees.find((e) => e.id === "DEMO-NV-031")!,
      male = s.employees.find((e) => e.id === "DEMO-NV-032")!,
      sku = s.skus.find((x) => x.id === "SKU-DD-F-XS")!;
    expect(eligibleSku(sku, female)).toBe(true);
    expect(eligibleSku(sku, male)).toBe(false);
    expect(() =>
      run(s, "coord", {
        type: "uniform.create",
        departmentId: "NOI",
        lines: [{ employeeId: male.id, skuId: sku.id, quantity: 1 }],
        exceptionReason: "",
        note: "",
      }),
    ).toThrow("giới tính");
    const old = migrateState(legacyState(s)).state;
    expect(
      eligibleSku(
        old.skus.find((x) => x.id === "SKU-1-1")!,
        old.employees.find((e) => e.id === female.id)!,
      ),
    ).toBe(true);
    expect(old.employees.find((e) => e.id === female.id)!.gender).toBe(
      "unspecified",
    );
  });
  it("cấp XS theo cùng quota/lô và giữ giá lịch sử khi đổi giá danh mục", () => {
    let s = run(createSeed(), "coord", {
      type: "uniform.create",
      departmentId: "NOI",
      lines: [{ employeeId: "DEMO-NV-031", skuId: "SKU-DD-F-XS", quantity: 1 }],
      exceptionReason: "",
      note: "Cấp dữ liệu tổng hợp",
    });
    const id = s.uniforms.at(-1)!.id;
    s = run(s, "coord", { type: "uniform.submit", id });
    for (const a of ["head", "hc"])
      s = run(s, a, {
        type: "approve",
        entity: "uniform",
        id,
        approved: true,
        reason: "",
      });
    expect(stock(s, "SKU-DD-F-XS")).toEqual({
      physical: 18,
      held: 1,
      available: 17,
    });
    s = run(s, "warehouse", { type: "uniform.issue", id });
    expect(issued(s, "DEMO-NV-031")).toBe(3);
    expect(stock(s, "SKU-DD-F-XS").physical).toBe(17);
    const row = s.issuances.find((i) => i.requestId === id)!;
    expect(row.price).toBe(318000);
    s = run(s, "warehouse", {
      type: "sku.save",
      ...s.skus.find((x) => x.id === row.skuId)!,
      price: 999000,
    });
    expect(s.issuances.find((i) => i.id === row.id)!.price).toBe(318000);
    expect(lastIssuedDate(s, "DEMO-NV-031")).toBe("2026-11-10");
  });
  it("mã NCC khác giới tính không được xác nhận dù cùng loại/cỡ", () => {
    const s = createSeed();
    expect(() =>
      run(s, "buyer", {
        type: "mapping.confirm",
        skuId: "SKU-DD-F-XXL",
        productId: "SP-A-SKU-DD-M-XXL",
        reason: "Thử sai biến thể demo",
      }),
    ).toThrow("giới tính");
    expect(
      shortlist(s, "SKU-DD-F-XXL").find(
        (r) => r.product.id === "SP-A-SKU-DD-M-XXL",
      )!.score,
    ).toBeLessThan(80);
  });
  it("context PR/PO là snapshot; thành tiền và tiền đã nhận dùng giá giao dịch, lọc đúng quyền", () => {
    let s = run(createSeed(), "buyer", {
      type: "purchase.create",
      lines: [
        {
          skuId: "SKU-DD-F-XS",
          quantity: 2,
          purpose: "reserve",
          sourceRequestId: "",
          productId: "SP-A-SKU-DD-F-XS",
          price: 318000,
        },
      ],
      note: "PR tổng hợp mới",
      context: {
        budgetName: "Quỹ demo",
        budgetCode: "DEMO-NS-TEST",
        budgetDepartmentId: "NOI",
        purchaseMonth: "2026-12",
      },
    });
    const id = s.purchases.at(-1)!.id;
    s = run(s, "buyer", { type: "purchase.submit", id });
    for (const a of ["hc", "finance", "leader"])
      s = run(s, a, {
        type: "approve",
        entity: "purchase",
        id,
        approved: true,
        reason: "",
      });
    s = run(s, "buyer", { type: "purchase.order", id });
    const order = s.orders.at(-1)!;
    expect(order.context).toEqual(s.purchases.at(-1)!.context);
    s = run(s, "warehouse", {
      type: "receipt",
      id: order.id,
      quantities: { "SKU-DD-F-XS": 1 },
    });
    s = run(s, "warehouse", {
      type: "sku.save",
      ...s.skus.find((x) => x.id === "SKU-DD-F-XS")!,
      price: 999000,
    });
    expect(
      purchaseReport(s, account(s, "buyer"), {
        month: "2026-12",
        departmentId: "NOI",
        budget: "DEMO-NS-TEST",
      }),
    ).toMatchObject([{ quantity: 2, total: 636000, receivedValue: 318000 }]);
    expect(
      purchaseReport(s, account(s, "employee"), { month: "2026-12" }),
    ).toEqual([]);
    expect(() =>
      run(s, "buyer", {
        type: "purchase.edit",
        id,
        lines: s.purchases.at(-1)!.lines,
        note: "Sửa sau PO",
      }),
    ).toThrow("Chỉ sửa");
  });
  it("PR/PO hiện theo FK thật và quyền, không cần nhập lại số chứng từ", () => {
    let s = run(createSeed(), "buyer", {
      type: "purchase.create",
      lines: [
        {
          skuId: "SKU-0-3",
          quantity: 2,
          purpose: "shortage",
          sourceRequestId: "DEMO-YC-002",
          productId: "SP-A-SKU-0-3",
          price: 420000,
        },
      ],
      note: "Bổ sung từ yêu cầu",
    });
    const id = s.purchases.at(-1)!.id;
    expect(
      linkedPurchases(s, account(s, "coord"), "DEMO-YC-002").map(
        (r) => r.purchase.id,
      ),
    ).toEqual([id]);
    expect(linkedPurchases(s, account(s, "employee"), "DEMO-YC-002")).toEqual(
      [],
    );
    expect(
      answerQuery(s, account(s, "hc"), "DEMO-YC-002 đang chờ ai?").evidence.map(
        (e) => e.recordId,
      ),
    ).toContain(id);
  });
  it.each([
    [
      "Tồn kho áo điều dưỡng nữ cỡ 2XL",
      "UNIFORM_INVENTORY",
      "answered",
      "SKU-DD-F-XXL",
      "0 bộ khả dụng",
    ],
    [
      "Tồn kho áo điều dưỡng cỡ XXL",
      "UNIFORM_INVENTORY",
      "ambiguous",
      "SKU-DD-M-XXL",
      "Có 2 mã",
    ],
    [
      "Tồn kho bộ hành chính nam cỡ 40",
      "UNIFORM_INVENTORY",
      "answered",
      "SKU-HC-M-40",
      "15 bộ vật lý",
    ],
    [
      "Mã SAP áo điều dưỡng nữ size XS",
      "SUPPLIER_MATCH",
      "confirmation",
      "SP-A-SKU-DD-F-XS",
      "Biến thể: Nữ",
    ],
  ])("trợ lý theo cấu trúc chung: %s", (q, intent, status, id, value) => {
    const s = createSeed(),
      response = answerQuery(s, account(s, "buyer"), q);
    expect(response.intent).toBe(intent);
    expect(response.status).toBe(status);
    expect(response.text).toContain(value);
    expect(response.evidence.map((e) => e.recordId)).toContain(id);
  });
  it("trợ lý tổng hợp mua theo tháng/ngân sách và đọc lại số sau nhận hàng", () => {
    let s = createSeed();
    const a = account(s, "buyer");
    const response = answerQuery(
      s,
      a,
      "Tổng hợp mua tháng 10/2026 ngân sách DEMO-NS-HC-26",
    );
    expect(response.parameters.purchaseMonth).toBe("2026-10");
    expect(response.text).toContain("584.000");
    expect(response.evidence).toHaveLength(1);
    s = run(s, "warehouse", {
      type: "stock.adjust",
      skuId: "SKU-DD-F-XXL",
      quantity: 4,
      price: 328000,
      reason: "Kiểm kê bổ sung demo",
      warehouse: "TT",
    });
    expect(answerQuery(s, a, "Tồn kho điều dưỡng nữ cỡ 2XL").text).toContain(
      "4 bộ khả dụng",
    );
  });
});
describe("Migration v1→v2 và bảo toàn dữ liệu demo", () => {
  it("không thêm seed, không đổi ID/giá/ledger/luồng/notes của bản cũ", () => {
    const raw = legacyState();
    raw.uniforms[0].note = "Ghi chú người dùng demo";
    const { state, migrated } = migrateState(raw);
    assertState(state);
    expect(migrated).toBe(true);
    expect(legacyState(state)).toEqual(raw);
    expect(state.purchases.every((p) => p.context.budgetCode === "")).toBe(
      true,
    );
    expect(state.employees.every((e) => e.gender === "unspecified")).toBe(true);
    expect(migrateState(state)).toEqual({ state, migrated: false });
  });
  it("store lưu nâng cấp một lần và reset mới nạp seed mở rộng", () => {
    const raw = legacyState();
    raw.purchases = [];
    raw.orders = [];
    raw.receipts = [];
    const data = new Map([[STORAGE_KEY, JSON.stringify(raw)]]);
    let writes = 0;
    const storage = {
      getItem: (k: string) => data.get(k) || null,
      setItem: (k: string, v: string) => {
        writes++;
        data.set(k, v);
      },
    };
    const store = new DemoStore(storage);
    expect(store.error).toBe("");
    expect(writes).toBe(1);
    expect(store.migrationNotice).toContain("phiên bản 2");
    expect(store.getSnapshot().purchases).toEqual([]);
    new DemoStore(storage);
    expect(writes).toBe(1);
    store.reset("system");
    expect(store.getSnapshot().purchases).toHaveLength(2);
    expect(store.getSnapshot().schemaVersion).toBe(2);
  });
  it("lỗi ghi migration/version lạ không ghi đè hoặc âm thầm xóa bản cũ", () => {
    const raw = JSON.stringify(legacyState());
    let saved = raw;
    const store = new DemoStore({
      getItem: () => saved,
      setItem: () => {
        throw Error("quota");
      },
    });
    expect(store.error).not.toBe("");
    expect(saved).toBe(raw);
    const future = JSON.stringify({ schemaVersion: 99 });
    const second = new DemoStore({
      getItem: () => future,
      setItem: (k, v) => {
        saved = v;
      },
    });
    expect(second.error).not.toBe("");
    expect(saved).toBe(raw);
  });
});
