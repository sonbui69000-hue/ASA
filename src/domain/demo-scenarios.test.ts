import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { execute, type Command } from "./commands";
import {
  demoScenarios,
  scenarioReadiness,
  demoUniformLines,
  demoMatchSkuId,
} from "./demo-scenarios";
import { availableLockers, issued, shortlist, stock } from "./selectors";
import type { State } from "./types";
const run = (s: State, actor: string, c: Command) =>
  execute(s, actor, c, `demo-test-${s.revision}-${c.type}`);
describe("Điểm bắt đầu trình diễn xác định", () => {
  it("cả năm kịch bản sẵn sàng từ seed mới, kiểm tra không ghi state", () => {
    const s = createSeed(),
      before = JSON.stringify(s);
    expect(demoScenarios.map((d) => scenarioReadiness(s, d).ready)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(JSON.stringify(s)).toBe(before);
    expect(availableLockers(s)).toHaveLength(37);
    expect(new Set(s.lockers.map((l) => l.building)).size).toBe(2);
    expect(new Set(s.lockers.map((l) => l.floor)).size).toBe(3);
    expect(s.mappings.some((m) => m.skuId === demoMatchSkuId)).toBe(false);
    expect(
      shortlist(s, demoMatchSkuId)
        .slice(0, 2)
        .map((r) => [r.product.code, r.score]),
    ).toEqual([
      ["SAP-A-1010", 100],
      ["SAP-B-2010", 80],
    ]);
  });
  it("cấp ba người không làm sai quota/giá, chặn bắt đầu lại khi đã đạt hạn mức", () => {
    let s = run(createSeed(), "coord", {
      type: "uniform.create",
      departmentId: "NOI",
      lines: demoUniformLines,
      exceptionReason: "",
      note: "Nhóm trình diễn",
    });
    const id = s.uniforms.at(-1)!.id;
    s = run(s, "coord", { type: "uniform.submit", id });
    for (const actor of ["head", "hc"])
      s = run(s, actor, {
        type: "approve",
        entity: "uniform",
        id,
        approved: true,
        reason: "",
      });
    s = run(s, "warehouse", { type: "uniform.issue", id });
    expect(issued(s, "DEMO-NV-031")).toBe(3);
    expect(issued(s, "DEMO-NV-035")).toBe(1);
    expect(issued(s, "DEMO-NV-036")).toBe(1);
    expect(s.issuances.find((i) => i.id === "DEMO-CP-001")!.price).toBe(260000);
    expect(stock(s, "SKU-1-1")).toEqual({ physical: 8, held: 2, available: 6 });
    expect(scenarioReadiness(s, demoScenarios[0]).ready).toBe(false);
    expect(
      demoScenarios.slice(1).every((d) => scenarioReadiness(s, d).ready),
    ).toBe(true);
  });
  it("PR nháp từ thiếu hụt làm kịch bản cần nạp lại, không tự thay tồn", () => {
    const s = run(createSeed(), "buyer", {
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
      note: "Thiếu hàng demo",
    });
    expect(scenarioReadiness(s, demoScenarios[1]).ready).toBe(false);
    expect(stock(s, "SKU-0-3").physical).toBe(0);
  });
  it("không báo sẵn sàng khi tài khoản, nguồn hợp đồng hoặc ánh xạ đã thay đổi", () => {
    const s = createSeed();
    s.documents.find((d) => d.id === "DEMO-TL-004")!.status = "revoked";
    expect(scenarioReadiness(s, demoScenarios[2]).ready).toBe(false);
    s.employees.find(
      (e) => e.id === s.accounts.find((a) => a.id === "hc")!.employeeId,
    )!.active = false;
    expect(scenarioReadiness(s, demoScenarios[3]).ready).toBe(false);
    const mapped = run(createSeed(), "buyer", {
      type: "mapping.confirm",
      skuId: demoMatchSkuId,
      productId: "SP-A-SKU-2-2",
      reason: "Đối chiếu đúng loại, cỡ và chất liệu demo",
    });
    expect(scenarioReadiness(mapped, demoScenarios[4]).ready).toBe(false);
  });
});
