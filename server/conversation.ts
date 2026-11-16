import type { State } from "../src/domain/types";
import type {
  ConversationContext,
  Intent,
  Parameters,
} from "../src/domain/assistant-routing";
import type { ToolResult } from "./tools";
const intents: Record<string, Intent> = {
  find_uniform_product: "PRODUCT_SEARCH",
  search_uniform_inventory: "UNIFORM_INVENTORY",
  check_uniform_eligibility: "UNIFORM_ELIGIBILITY",
  get_employee_issuance_history: "UNIFORM_HISTORY",
  get_uniform_request_status: "APPROVAL_STATUS",
  get_purchase_requests: "PURCHASE_STATUS",
  get_purchase_order_status: "PURCHASE_STATUS",
  get_goods_receipts: "PURCHASE_STATUS",
  search_available_lockers: "LOCKER_AVAILABILITY",
  get_locker_assignments: "LOCKER_ASSIGNMENT",
  get_supplier_candidates: "SUPPLIER_MATCH",
  search_internal_documents: "DOCUMENT_QUESTION",
  get_document_metadata: "DOCUMENT_QUESTION",
  get_document_passages: "DOCUMENT_QUESTION",
  get_uniform_policy: "UNIFORM_POLICY",
};
export function toolContext(
  state: State,
  name: string,
  args: unknown,
  output: ToolResult,
  hint?: ConversationContext,
): ConversationContext {
  if (name === "get_document_passages" && hint) return hint;
  const p = args as Record<string, unknown>,
    parameters: Parameters = {};
  const mapping: Record<string, keyof Parameters> = {
    employeeId: "employeeId",
    category: "category",
    gender: "gender",
    size: "size",
    warehouse: "warehouse",
    departmentId: "departmentId",
    floor: "floor",
    building: "building",
    area: "area",
    year: "year",
    quantity: "quantity",
    requestId: "recordId",
    orderId: "recordId",
    lockerId: "recordId",
    documentId: "recordId",
    month: "purchaseMonth",
    budget: "budgetCode",
    status: "purchaseStatus",
  };
  for (const [key, target] of Object.entries(mapping))
    if (p[key] !== undefined) Object.assign(parameters, { [target]: p[key] });
  const sku = state.skus.find(
    (s) =>
      s.id === p.skuId ||
      s.code === p.skuId ||
      s.id === p.code ||
      s.code === p.code,
  );
  if (sku)
    Object.assign(parameters, {
      productCode: sku.code,
      category: sku.category,
      gender: sku.gender,
      size: sku.size,
    });
  if (name === "search_internal_documents")
    parameters.documentQuery = String(p.query);
  let intent = intents[name] || hint?.intent || "UNSUPPORTED";
  if (name === "resolve_employee") {
    intent =
      hint?.intent === "UNIFORM_ELIGIBILITY" ? hint.intent : "UNIFORM_HISTORY";
    Object.assign(parameters, hint?.parameters);
    if (output.evidence.length === 1) {
      parameters.employeeId = output.evidence[0].recordId;
      delete parameters.employeeName;
    }
  }
  if (name === "clarify_question") return hint || { intent, parameters };
  return { intent, parameters };
}
/** Only fill/refine read filters already resolved from this question's scoped conversation. */
export function refineToolArguments(
  name: string,
  args: unknown,
  hint: ConversationContext,
  followup: boolean,
  state: State,
) {
  if (!followup || !args || typeof args !== "object" || Array.isArray(args))
    return args;
  const p = { ...(args as Record<string, unknown>) },
    h = hint.parameters;
  if (
    ["search_uniform_inventory", "find_uniform_product"].includes(name) &&
    ["UNIFORM_INVENTORY", "PRODUCT_SEARCH"].includes(hint.intent)
  ) {
    for (const key of ["category", "gender", "size", "departmentId"] as const)
      if (h[key] !== undefined) p[key] = h[key];
    if (name === "search_uniform_inventory" && h.warehouse)
      p.warehouse = h.warehouse;
    const product = state.skus.find(
      (s) => s.id === p.code || s.code === p.code,
    );
    if (
      product &&
      ((h.size && product.size !== h.size) ||
        (h.gender && product.gender !== h.gender) ||
        (h.category && product.category !== h.category))
    )
      delete p.code;
    if (!p.code && h.productCode) p.code = h.productCode;
  }
  if (name === "get_purchase_requests" && hint.intent === "PURCHASE_STATUS") {
    if (h.purchaseStatus) p.status = h.purchaseStatus;
    if (h.purchaseMonth) p.month = h.purchaseMonth;
    if (h.departmentId) p.departmentId = h.departmentId;
  }
  if (
    name === "search_available_lockers" &&
    hint.intent === "LOCKER_AVAILABILITY"
  )
    for (const key of ["floor", "building", "area"] as const)
      if (h[key]) p[key] = h[key];
  if (
    name === "search_internal_documents" &&
    ["DOCUMENT_SEARCH", "DOCUMENT_QUESTION", "UNIFORM_POLICY"].includes(
      hint.intent,
    )
  ) {
    if (h.documentQuery) p.query = h.documentQuery;
    if (h.recordId?.startsWith("DEMO-TL")) p.documentId = h.recordId;
  }
  return p;
}
