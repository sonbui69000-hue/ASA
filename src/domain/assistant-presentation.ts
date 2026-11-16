import type { Account, ReadState } from "./types";
import { canReadWorkbookData } from "./workbook-data";
import { genderLabels, jobLabels, normalize } from "./types";
import {
  employeesFor,
  requestsFor,
  purchasesFor,
  canReadLocker,
  canReadDocument,
} from "./selectors";
import type {
  Answer,
  ConversationContext,
  Evidence,
  Intent,
} from "./assistant";

export function moduleFor(intent: Intent) {
  return ["DOCUMENT_SEARCH", "DOCUMENT_QUESTION", "UNIFORM_POLICY"].includes(
    intent,
  )
    ? "documents"
    : ["PURCHASE_STATUS", "SUPPLIER_MATCH"].includes(intent)
      ? "purchases"
      : ["LOCKER_ASSIGNMENT", "LOCKER_AVAILABILITY"].includes(intent)
        ? "lockers"
        : [
              "UNIFORM_INVENTORY",
              "UNIFORM_ELIGIBILITY",
              "UNIFORM_HISTORY",
              "PRODUCT_SEARCH",
              "APPROVAL_STATUS",
            ].includes(intent)
          ? "uniforms"
          : undefined;
}
export const topicLabels = {
  documents: "Tài liệu",
  purchases: "Mua sắm",
  lockers: "Tủ đồ",
  uniforms: "Đồng phục",
};
export function contextLabel(context: ConversationContext) {
  const p = context.parameters,
    parts = [topicLabels[moduleFor(context.intent) || "uniforms"]];
  if (p.productCode) parts.push(p.productCode);
  if (p.category) parts.push(jobLabels[p.category]);
  if (p.gender) parts.push(genderLabels[p.gender]);
  if (p.size) parts.push("cỡ " + p.size);
  if (p.employeeId) parts.push(p.employeeId);
  if (p.recordId) parts.push(p.recordId);
  if (p.floor) parts.push("tầng " + p.floor);
  if (p.purchaseStatus === "pending") parts.push("chờ duyệt");
  if (context.recordIds && context.recordIds.length > 1)
    parts.push(context.recordIds.length + " nguồn");
  return parts.join(" • ");
}
export function sourceHref(
  s: ReadState,
  a: Account,
  e: Evidence,
  context: ConversationContext,
): string | undefined {
  if (s.workbookData && canReadWorkbookData(a.role)) {
    const data = s.workbookData;
    if (data.uniformRequests.some((r) => r.id === e.recordId))
      return `/dong-phuc/du-lieu-excel?record=${encodeURIComponent(e.recordId)}`;
    if (data.uniformPurchases.some((r) => r.id === e.recordId))
      return `/mua-sam/du-lieu-excel?record=${encodeURIComponent(e.recordId)}`;
    if (data.lockers.some((r) => r.id === e.recordId))
      return `/tu-do?view=excel&record=${encodeURIComponent(e.recordId)}`;
  }
  if (e.href.startsWith("/tai-lieu/")) {
    const doc = s.documents.find(
      (d) => d.id === e.recordId && canReadDocument(s, a, d),
    );
    return doc && (!e.version || e.version === doc.version)
      ? e.href
      : undefined; // Exact citations must not be rewritten.
  }
  const sku = s.skus.find((x) => x.id === e.recordId || x.code === e.recordId);
  if (sku)
    return `/dong-phuc/kho?sku=${encodeURIComponent(sku.id)}&warehouse=${context.parameters.warehouse === "NOI" ? "NOI" : "TT"}`;
  if (employeesFor(s, a).some((x) => x.id === e.recordId))
    return `/dong-phuc/nhan-vien?employee=${encodeURIComponent(e.recordId)}`;
  if (requestsFor(s, a).some((x) => x.id === e.recordId))
    return "/dong-phuc/yeu-cau/" + encodeURIComponent(e.recordId);
  const purchases = purchasesFor(s, a);
  if (purchases.some((x) => x.id === e.recordId))
    return "/mua-sam/de-nghi/" + encodeURIComponent(e.recordId);
  const order = s.orders.find(
    (x) => x.id === e.recordId && purchases.some((p) => p.id === x.purchaseId),
  );
  if (order) return "/mua-sam/don-hang/" + encodeURIComponent(order.id);
  const locker = s.lockers.find(
    (x) => x.id === e.recordId && canReadLocker(s, a, x),
  );
  if (locker) return "/tu-do?locker=" + encodeURIComponent(locker.id);
  if (e.recordId === "locker-availability") {
    const params = new URLSearchParams({ status: "available" });
    for (const key of ["floor", "building", "area"] as const)
      if (context.parameters[key]) params.set(key, context.parameters[key]!);
    return "/tu-do?" + params;
  }
  // Existing real routes for receipts, supplier mappings, configuration, and workflow guidance.
  const path = e.href.split(/[?#]/)[0];
  if (
    [
      "/dong-phuc/kho",
      "/dong-phuc/nhan-vien",
      "/dong-phuc/bao-cao",
      "/mua-sam/nha-cung-cap",
      "/mua-sam/nhu-cau",
      "/tu-do",
      "/phe-duyet",
    ].includes(path)
  )
    return e.href;
  if (requestsFor(s, a).some((r) => path === "/dong-phuc/yeu-cau/" + r.id))
    return e.href;
  if (purchases.some((r) => path === "/mua-sam/de-nghi/" + r.id)) return e.href;
  if (
    s.orders.some(
      (o) =>
        path === "/mua-sam/don-hang/" + o.id &&
        purchases.some((p) => p.id === o.purchaseId),
    )
  )
    return e.href;
  return undefined;
}
export function decorateAnswer(
  s: ReadState,
  a: Account,
  answer: Answer,
): Answer {
  const evidence = answer.evidence.flatMap((e) => {
    const href = sourceHref(s, a, e, answer);
    return href ? [href === e.href ? e : { ...e, href }] : [];
  });
  const topic = moduleFor(answer.intent);
  const ids = [
    ...new Set(
      evidence
        .filter(
          (e) =>
            /^XLS-/.test(e.recordId) ||
            (topic === "documents"
              ? !!e.version
              : topic === "purchases"
                ? /^DEMO-(?:PR|PO|SAP-PO)/.test(e.recordId)
                : topic === "lockers"
                  ? /^DEMO-TU/.test(e.recordId)
                  : /^SKU-|^DEMO-(?:NV|YC)/.test(e.recordId)),
        )
        .map((e) => e.recordId),
    ),
  ].slice(0, 20);
  const choices =
    answer.status === "ambiguous"
      ? evidence.slice(0, 8).map((e) => ({
          label: `${e.title} • ${e.recordId}`,
          question: choiceQuestion(answer.intent, e),
        }))
      : undefined;
  const parameters = { ...answer.parameters };
  const products = s.skus.filter((sku) => ids.includes(sku.id));
  if (
    products.length === 1 &&
    ["UNIFORM_INVENTORY", "PRODUCT_SEARCH", "SUPPLIER_MATCH"].includes(
      answer.intent,
    )
  )
    Object.assign(parameters, {
      productCode: products[0].code,
      category: parameters.category || products[0].category,
      gender: parameters.gender || products[0].gender,
      size: parameters.size || products[0].size,
    });
  const employees = employeesFor(s, a).filter((e) => ids.includes(e.id));
  if (
    employees.length === 1 &&
    ["UNIFORM_HISTORY", "UNIFORM_ELIGIBILITY"].includes(answer.intent)
  ) {
    parameters.employeeId = employees[0].id;
    delete parameters.employeeName;
  }
  return {
    ...answer,
    parameters,
    evidence,
    recordIds: ids,
    clarification: choices?.length
      ? {
          prompt:
            "Chọn đúng hồ sơ để tiếp tục tra cứu. Chưa có thay đổi dữ liệu.",
          choices,
        }
      : answer.clarification,
  };
}
export function choiceQuestion(intent: Intent, e: Evidence) {
  if (e.recordId.startsWith("DEMO-NV"))
    return intent === "UNIFORM_ELIGIBILITY"
      ? `${e.recordId} còn được cấp đồng phục không?`
      : `Lịch sử cấp ${e.recordId}`;
  if (e.recordId.startsWith("SKU-"))
    return `${intent === "UNIFORM_INVENTORY" ? "Tồn kho" : intent === "SUPPLIER_MATCH" ? "Mã nhà cung cấp cho" : "Tìm sản phẩm"} ${e.title}`;
  if (e.version) return `Tra cứu tài liệu ${e.recordId}`;
  return `Tra cứu ${e.recordId}`;
}
export function ambiguityAnswer(
  s: ReadState,
  a: Account,
  question: string,
  previous?: ConversationContext,
): Answer | undefined {
  if (
    !previous?.recordIds ||
    previous.recordIds.length < 2 ||
    !/(?:ho so|yeu cau|de nghi|don|nhan vien|san pham|ma|tu) (?:nay|do)|dieu khoan lien quan/.test(
      normalize(question),
    )
  )
    return;
  const ids = new Set(previous.recordIds);
  const evidence: Evidence[] = [];
  for (const d of s.documents)
    if (
      ids.has(d.id) &&
      d.readRoles.includes(a.role) &&
      d.status === "published" &&
      d.date <= s.settings.date &&
      d.expires >= s.settings.date
    )
      evidence.push({
        recordId: d.id,
        title: d.title,
        passage: "Chọn tài liệu cần xem.",
        href: `/tai-lieu/${d.id}?version=${d.version}`,
        version: d.version,
      });
  for (const r of [...requestsFor(s, a), ...purchasesFor(s, a)])
    if (ids.has(r.id))
      evidence.push({
        recordId: r.id,
        title: r.id,
        passage: "Chọn hồ sơ cần xem.",
        href:
          ("departmentId" in r ? "/dong-phuc/yeu-cau/" : "/mua-sam/de-nghi/") +
          r.id,
      });
  for (const e of employeesFor(s, a))
    if (ids.has(e.id))
      evidence.push({
        recordId: e.id,
        title: e.name,
        passage: e.id,
        href: "/dong-phuc/nhan-vien",
      });
  for (const sku of s.skus)
    if (ids.has(sku.id))
      evidence.push({
        recordId: sku.id,
        title: sku.code,
        passage: sku.name,
        href: "/dong-phuc/kho",
      });
  for (const l of s.lockers)
    if (ids.has(l.id) && canReadLocker(s, a, l))
      evidence.push({
        recordId: l.id,
        title: l.id,
        passage: `${l.building}, tầng ${l.floor}`,
        href: "/tu-do",
      });
  return decorateAnswer(s, a, {
    ...previous,
    status: "ambiguous",
    text: "Có nhiều nguồn trong ngữ cảnh trước. Bạn muốn tra cứu nguồn nào?",
    evidence,
    suggestions: [],
    clarification: {
      prompt: "Chọn nguồn được phép hoặc nhập mã cụ thể.",
      choices: evidence.slice(0, 8).map((e) => ({
        label: e.title + " • " + e.recordId,
        question: choiceQuestion(previous.intent, e),
      })),
    },
  });
}
