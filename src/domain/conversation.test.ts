import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { answerQuery } from "./assistant";
import { account, availableLockers } from "./selectors";
import { execute } from "./commands";
import { interpret } from "./assistant-routing";
import { sourceHref } from "./assistant-presentation";

describe("Scoped conversation and source navigation", () => {
  it("separates questions about allocation policy from confirmed allocation requests", () => {
    const s = createSeed(),
      a = account(s, "hc");
    expect(answerQuery(s, a, "Quy định phân bổ tủ đồ là gì?").intent).toBe(
      "DOCUMENT_QUESTION",
    );
    expect(answerQuery(s, a, "Phân bổ tủ giúp tôi").status).toBe(
      "confirmation",
    );
    expect(
      answerQuery(
        s,
        a,
        "Nhân viên cần làm gì khi muốn xin cấp lại đồng phục vượt định mức?",
      ).intent,
    ).toBe("UNIFORM_POLICY");
    expect(
      answerQuery(s, a, "DEMO-NV-031 xin 5 bộ có vượt định mức không?").intent,
    ).toBe("UNIFORM_ELIGIBILITY");
  });
  it("asks for context for a bare size and retains the original SKU category when context exists", () => {
    const s = createSeed(),
      a = account(s, "hc");
    expect(answerQuery(s, a, "XL").status).toBe("missing");
    const first = answerQuery(s, a, "Tồn kho DP-DD-M");
    expect(answerQuery(s, a, "XL", first).evidence[0].recordId).toBe("SKU-1-3");
  });
  it("refines size while retaining category/gender/warehouse and clearing the exact old SKU", () => {
    const s = createSeed(),
      a = account(s, "hc"),
      first = answerQuery(s, a, "Áo blouse nữ cỡ L còn bao nhiêu?");
    const next = answerQuery(s, a, "Thế cỡ XL thì sao?", first);
    expect(next.parameters).toMatchObject({
      category: "doctor",
      gender: "female",
      size: "XL",
    });
    expect(next.parameters.productCode).not.toBe(first.parameters.productCode);
    expect(next.evidence.length).toBeGreaterThan(0);
    expect(
      next.evidence.every(
        (e) => s.skus.find((sku) => sku.id === e.recordId)?.size === "XL",
      ),
    ).toBe(true);
  });
  it("keeps pending purchase filters on a differently worded follow-up", () => {
    const s = createSeed(),
      a = account(s, "buyer"),
      first = answerQuery(s, a, "Có đơn mua nào đang chờ phê duyệt?");
    const next = answerQuery(s, a, "Đơn nào liên quan đến đồng phục?", first);
    expect(next.intent).toBe("PURCHASE_STATUS");
    expect(next.parameters.purchaseStatus).toBe("pending");
    expect(next.evidence.map((e) => e.recordId)).toEqual(
      first.evidence.map((e) => e.recordId),
    );
  });
  it("asks which record when a pronoun follows multiple results, retaining only currently permitted choices", () => {
    const s = createSeed(),
      a = account(s, "buyer"),
      first = answerQuery(s, a, "Có đơn mua nào đang chờ phê duyệt?");
    const result = answerQuery(s, a, "Đơn này đang chờ ai?", {
      ...first,
      recordIds: s.purchases.slice(0, 2).map((r) => r.id),
    });
    expect(result.status).toBe("ambiguous");
    expect(result.clarification?.choices.length).toBeGreaterThan(0);
    const employee = answerQuery(
      s,
      account(s, "employee"),
      "Đơn này đang chờ ai?",
      { ...first, recordIds: s.purchases.slice(0, 2).map((r) => r.id) },
    );
    expect(JSON.stringify(employee)).not.toContain("Ngân sách");
  });
  it("keeps document question context for a request to view its clause", () => {
    const s = createSeed(),
      a = account(s, "buyer"),
      first = answerQuery(
        s,
        a,
        "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
      );
    const followup = answerQuery(
      s,
      a,
      "Cho tôi xem điều khoản liên quan.",
      first,
    );
    expect(
      followup.evidence.some(
        (e) => e.recordId === "DEMO-TL-004" && e.sectionId === "muc-2",
      ),
    ).toBe(true);
  });
  it("does not carry inventory filters into an explicit locker question", () => {
    const s = createSeed(),
      a = account(s, "hc"),
      first = answerQuery(s, a, "Tồn kho DP-DD-M");
    const next = answerQuery(s, a, "Còn tủ nào trống ở tầng 3?", first);
    expect(next.intent).toBe("LOCKER_AVAILABILITY");
    expect(next.parameters.productCode).toBeUndefined();
    expect(next.parameters.floor).toBe("3");
  });
  it("offers employee clarification choices that continue the requested eligibility check", () => {
    const s = createSeed();
    s.employees[30].name = "Nhân viên trùng";
    s.employees[31].name = "Nhân viên trùng";
    const a = account(s, "hc"),
      reply = answerQuery(s, a, "Nhân viên trùng còn được cấp không?");
    expect(reply.clarification?.choices).toHaveLength(2);
    const next = answerQuery(
      s,
      a,
      reply.clarification!.choices[0].question,
      reply,
    );
    expect(next.intent).toBe("UNIFORM_ELIGIBILITY");
    expect(next.status).toBe("answered");
  });
  it("navigates products to a stable SKU/warehouse and employees to the permitted profile", () => {
    const s = createSeed(),
      a = account(s, "hc"),
      stock = answerQuery(s, a, "Tồn kho DP-DD-M");
    expect(stock.evidence[0].href).toBe(
      "/dong-phuc/kho?sku=SKU-1-1&warehouse=TT",
    );
    const history = answerQuery(s, a, "Lịch sử cấp DEMO-NV-033");
    expect(history.evidence[0].href).toBe(
      "/dong-phuc/nhan-vien?employee=DEMO-NV-033",
    );
  });
  it("preserves exact document version and section links", () => {
    const s = createSeed(),
      reply = answerQuery(
        s,
        account(s, "buyer"),
        "Thời hạn giao hàng hợp đồng An Tâm?",
      );
    expect(reply.evidence[0].href).toBe(
      "/tai-lieu/DEMO-TL-004?version=1#muc-2",
    );
  });
  it("links specific lockers and the availability summary with current filters", () => {
    const s = createSeed(),
      reply = answerQuery(s, account(s, "hc"), "Còn tủ nào trống ở tầng 3?");
    expect(reply.evidence[0].href).toBe("/tu-do?status=available&floor=3");
    expect(reply.evidence[1].href).toMatch(/^\/tu-do\?locker=DEMO-TU-/);
  });
  it("refreshes locker and inventory facts after canonical commands without chat mutations", () => {
    let s = createSeed();
    const a = account(s, "hc"),
      first = answerQuery(s, a, "Còn tủ nào trống ở tầng 3?");
    const id = availableLockers(s).find((l) => l.floor === "3")!.id;
    const eligible = s.employees.find(
      (e) =>
        e.active &&
        !s.lockers.some((l) => l.employeeId === e.id || l.reservedFor === e.id),
    )!;
    s = execute(
      s,
      "hc",
      {
        type: "locker.allocate",
        ids: [id],
        employeeIds: [eligible.id],
        departmentId: "",
        reason: "Phân bổ tổng hợp qua workflow",
        reserve: false,
      },
      "conversation-locker",
    );
    const before = structuredClone(s),
      next = answerQuery(s, a, "Còn tủ nào trống ở tầng 3?", first);
    expect(next.evidence.some((e) => e.recordId === id)).toBe(false);
    expect(s).toEqual(before);
  });
  it("ignores unrecognized source destinations", () => {
    const s = createSeed();
    expect(
      sourceHref(
        s,
        account(s, "hc"),
        {
          recordId: "unknown",
          title: "unknown",
          passage: "",
          href: "https://example.invalid",
        },
        { intent: "GENERAL_HELP", parameters: {} },
      ),
    ).toBeUndefined();
  });
  it("keeps action requests behind existing confirmation workflows", () => {
    const s = createSeed(),
      before = structuredClone(s),
      result = answerQuery(s, account(s, "hc"), "Hãy phê duyệt DEMO-YC-001");
    expect(result.status).toBe("confirmation");
    expect(result.evidence[0].href).toBe("/dong-phuc/yeu-cau/DEMO-YC-001");
    expect(s).toEqual(before);
  });
});
