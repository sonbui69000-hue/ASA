import type { Account, Job, ProductGender } from "./types";
import { normalize } from "./types";
import { normalizeSize } from "./uniform-attributes";
export type Intent =
  | "DOCUMENT_SEARCH"
  | "DOCUMENT_QUESTION"
  | "UNIFORM_INVENTORY"
  | "UNIFORM_ELIGIBILITY"
  | "UNIFORM_HISTORY"
  | "UNIFORM_POLICY"
  | "LOCKER_AVAILABILITY"
  | "LOCKER_ASSIGNMENT"
  | "PRODUCT_SEARCH"
  | "SUPPLIER_MATCH"
  | "PURCHASE_STATUS"
  | "APPROVAL_STATUS"
  | "GENERAL_HELP"
  | "ACTION_REVIEW"
  | "UNSUPPORTED";
export interface Parameters {
  employeeId?: string;
  employeeName?: string;
  departmentId?: string;
  productCode?: string;
  category?: Job;
  size?: string;
  floor?: string;
  building?: string;
  area?: string;
  warehouse?: string;
  recordId?: string;
  year?: number;
  quantity?: number;
  gender?: ProductGender;
  purchaseMonth?: string;
  budgetCode?: string;
  purchaseStatus?:
    "draft" | "pending" | "approved" | "ordered" | "rejected" | "cancelled";
  documentQuery?: string;
}
export interface ConversationContext {
  intent: Intent;
  parameters: Parameters;
  recordIds?: string[];
}
export interface Interpretation extends ConversationContext {
  query: string;
}
export const requiresPrevious = (query: string) =>
  /^(?:the|con|vay)\b|^(?:co|size)\s|^(?:xs|s|m|l|xl|xxl|xxxl|[234]xl)(?:\s+thi sao)?[?.!]*$|dieu khoan lien quan|\b(?:don|ho so|nhan vien|san pham|ma) (?:nay|do)\b/.test(
    normalize(query),
  );
/** Extract user-supplied entities; services must still check permissions. */
export function interpret(
  a: Account,
  query: string,
  previous?: ConversationContext,
  routeRecordId?: string,
): Interpretation {
  const q = normalize(query).trim(),
    p: Parameters = {};
  p.recordId = query
    .match(/DEMO-(?:SAP-PO|YC|PR|PO|TL|TU)-[\w-]+/i)?.[0]
    .toUpperCase();
  p.productCode = query
    .match(/\b(?:DP-[A-Z0-9]+(?:-[A-Z0-9]+)+|SAP-[AB]-\d+)\b/i)?.[0]
    .toUpperCase();
  p.employeeId = query.match(/DEMO-NV-\d+/i)?.[0].toUpperCase();
  const number = q.match(/nhan vien demo\s+(\d+)/)?.[1];
  if (number) p.employeeId = "DEMO-NV-" + number.padStart(3, "0");
  const named = q
    .match(
      /nhan vien\s+(.+?)(?=\s+(?:da|con|duoc|co|nam|lich su|o dau|dang|thuoc)|[?.,]|$)/,
    )?.[1]
    ?.trim();
  if (
    !p.employeeId &&
    named &&
    !/^(?:can|phai|duoc|co|khi|muon|lam gi)\b/.test(named)
  ) {
    p.employeeName = named;
  }
  if (!p.employeeId && /\b(toi|minh)\b/.test(q) && !p.employeeName)
    p.employeeId = a.employeeId;
  const departments = [
    ["KKB", /khoa kham benh/],
    ["NOI", /(?:khoa|kho) noi\b/],
    ["NGOAI", /khoa ngoai\b/],
    ["DD", /khoa dieu duong/],
    ["HC", /phong hanh chinh/],
    ["TC", /phong tai chinh/],
  ] as const;
  p.departmentId = departments.find(([, re]) => re.test(q))?.[0];
  p.category = /dieu duong/.test(q)
    ? "nurse"
    : /bac si|blouse/.test(q)
      ? "doctor"
      : /ky thuat/.test(q)
        ? "technician"
        : /hanh chinh/.test(q)
          ? "office"
          : undefined;
  p.size =
    q
      .toUpperCase()
      .match(
        /\b(?:SIZE|CO)\s+(XXXL|XXL|[234]XL|XL|L|M|S|XS|[1-9]\d?)\b/,
      )?.[1] ||
    q.toUpperCase().match(/\b(XXXL|XXL|[234]XL|XL|L|M|S|XS)\b/)?.[1];
  if (p.size) p.size = normalizeSize(p.size);
  const month = q.match(
    /thang\s+(0?[1-9]|1[0-2])(?:\/|[-\s]+(?:nam\s+)?)(20\d{2})/,
  );
  p.purchaseMonth = month
    ? `${month[2]}-${month[1].padStart(2, "0")}`
    : q.match(/\b20\d{2}-(?:0[1-9]|1[0-2])\b/)?.[0];
  p.budgetCode = query.match(/\bDEMO-NS-[A-Z0-9-]+/i)?.[0].toUpperCase();
  p.floor = q.match(/tang\s+([\da-z]+)/)?.[1];
  p.building = q.match(/toa\s+([a-z0-9]+)/)?.[1];
  const area = q.match(/khu\s+([a-z0-9]+)/)?.[1];
  if (area) p.area = "Khu " + area.toUpperCase();
  if (/\bkho\b/.test(q))
    p.warehouse = /kho (?:khoa )?noi/.test(q) ? "NOI" : "TT";
  p.year = Number(q.match(/nam\s+(20\d{2})/)?.[1]) || undefined;
  p.quantity =
    Number(q.match(/(?:them|xin|nhan|cap)\s+(\d+)\s+bo/)?.[1]) || undefined;
  p.gender = /\bnu\b/.test(q)
    ? "female"
    : /\bnam\b(?!\s+20|\s+nay)/.test(q)
      ? "male"
      : undefined;
  let intent: Intent;
  if (
    /duyet giup|tu duyet|tao po|dat hang giup|cap tu giup|hay phe duyet|phan bo tu|huy (?:yeu cau|demo-)|dieu chinh ton/.test(
      q,
    ) &&
    !/^(?:tim |tra cuu )?(?:quy dinh|chinh sach|quy trinh)\b/.test(q)
  )
    intent = "ACTION_REVIEW";
  else if (
    (p.employeeId || p.employeeName) &&
    /con duoc|du dieu kien|co duoc|vuot dinh muc|toi con|xin\s+\d+\s+bo/.test(q)
  )
    intent = "UNIFORM_ELIGIBILITY";
  else if (
    /quy dinh|chinh sach|quy trinh|tai lieu|hop dong|dinh muc|tai cap|demo-tl/.test(
      q,
    )
  )
    intent =
      /dong phuc|dinh muc|tai cap/.test(q) && !/hop dong/.test(q)
        ? "UNIFORM_POLICY"
        : /tim|tra cuu|liet ke/.test(q)
          ? "DOCUMENT_SEARCH"
          : "DOCUMENT_QUESTION";
  else if (/ma sap|ma ncc|nha cung cap|doi sanh|tuong ung/.test(q))
    intent = "SUPPLIER_MATCH";
  else if (
    /tu trong|tu con trong|tu do|locker|tu nao|so tu|tang\s+\d|demo-tu/.test(q)
  )
    intent =
      /cua toi|dang dung|duoc cap|da cap|cap cho|ai dung|o dau|phan bo|demo-tu/.test(
        q,
      )
        ? "LOCKER_ASSIGNMENT"
        : "LOCKER_AVAILABILITY";
  else if (
    /mua hang|don mua|don hang|de nghi mua|de nghi nao|tong hop mua|ngan sach|thang mua|demo-pr|demo-(?:sap-)?po/.test(
      q,
    )
  )
    intent = "PURCHASE_STATUS";
  else if (/phe duyet|dang cho|trang thai|tu choi|demo-yc/.test(q))
    intent = "APPROVAL_STATUS";
  else if (
    /con duoc|du dieu kien|co duoc|vuot dinh muc|toi con|xin\s+\d+\s+bo/.test(q)
  )
    intent = "UNIFORM_ELIGIBILITY";
  else if (/lich su|da nhan|da (?:duoc )?cap|nhan vien|demo-nv/.test(q))
    intent = "UNIFORM_HISTORY";
  else if (/ton kho|con bao nhieu|con may bo|con hang|kha dung|kho con/.test(q))
    intent = "UNIFORM_INVENTORY";
  else if (p.productCode)
    intent =
      previous &&
      ["UNIFORM_INVENTORY", "PRODUCT_SEARCH", "SUPPLIER_MATCH"].includes(
        previous.intent,
      )
        ? previous.intent
        : "PRODUCT_SEARCH";
  else if (/tim (?:ma |san pham|dong phuc|ao)|danh muc|ma noi bo/.test(q))
    intent = "PRODUCT_SEARCH";
  else if (/xin chao|tro giup|giup gi|huong dan|lam duoc gi/.test(q))
    intent = "GENERAL_HELP";
  else intent = "UNSUPPORTED";
  const fragment =
    /^(?:con\s+)?(?:nam|nu)(?:\s+thi sao)?\??$/.test(q) ||
    /^(?:con\s+)?(?:(?:size|co)\s+)?(?:xs|s|m|l|xl|xxl|xxxl|[234]xl|[1-9]\d?)(?:\s+thi sao)?\??$/.test(
      q,
    ) ||
    /^(?:con\s+)?(?:o\s+)?(?:tang\s+\w+|khu\s+\w+)(?:\s+thi sao)?\??$/.test(
      q,
    ) ||
    /^(?:DEMO-NV-\d+|nhan vien demo\s+\d+)\??$/i.test(query.trim());
  const refinedFragment =
    /^(?:the|con|vay)(?:\s+(?:co|size))?\s+(?:xs|s|m|l|xl|xxl|xxxl|[234]xl)(?:\s+thi sao)?\??$/.test(
      q,
    );
  const docFollowup =
    !!previous &&
    ["DOCUMENT_SEARCH", "DOCUMENT_QUESTION", "UNIFORM_POLICY"].includes(
      previous.intent,
    ) &&
    /^(?:cho toi |toi muon |xin )?(?:xem |mo )?(?:dieu khoan|doan trich|nguon|muc)(?: lien quan| do| nay)?[?.!]*$/.test(
      q,
    );
  const purchaseFollowup =
    previous?.intent === "PURCHASE_STATUS" &&
    /don nao.*(?:dong phuc|lien quan)|nhung don (?:do|nay)/.test(q);
  const followup =
    fragment ||
    refinedFragment ||
    docFollowup ||
    purchaseFollowup ||
    (/\b(nay|do)\b/.test(q) &&
      /yeu cau|de nghi|nhan vien|san pham|dong phuc|tu nay|ma nay/.test(q));
  if (previous && followup) {
    if (fragment || refinedFragment || docFollowup || purchaseFollowup)
      intent = previous.intent;
    Object.entries(previous.parameters).forEach(([key, value]) => {
      if (p[key as keyof Parameters] === undefined)
        Object.assign(p, { [key]: value });
    });
    if (p.employeeId) delete p.employeeName;
    if (
      (p.size !== previous.parameters.size ||
        p.category !== previous.parameters.category ||
        p.gender !== previous.parameters.gender) &&
      !/\bDP-/i.test(query)
    )
      delete p.productCode;
  }
  if (previous && docFollowup && previous.recordIds?.length === 1)
    p.recordId = previous.recordIds[0];
  if (
    previous &&
    /\b(?:ho so|yeu cau|de nghi|don|ma|nhan vien|san pham|tu) (?:nay|do)\b/.test(
      q,
    ) &&
    !p.recordId &&
    previous.recordIds?.length === 1
  )
    p.recordId = previous.recordIds[0];
  if (intent === "PURCHASE_STATUS")
    p.purchaseStatus = /tu choi/.test(q)
      ? "rejected"
      : /cho (?:phe )?duyet|cho phe duyet|dang cho|phe duyet/.test(q)
        ? "pending"
        : p.purchaseStatus;
  if (intent === "UNSUPPORTED" && p.category && p.size)
    intent = "UNIFORM_INVENTORY";
  if (
    previous &&
    intent === "UNSUPPORTED" &&
    (p.productCode || p.size) &&
    ["UNIFORM_INVENTORY", "PRODUCT_SEARCH", "SUPPLIER_MATCH"].includes(
      previous.intent,
    )
  )
    intent = previous.intent;
  if (!p.recordId && /yeu cau nay|de nghi nay|ho so nay/.test(q))
    p.recordId = routeRecordId || previous?.parameters.recordId;
  if (
    ["DOCUMENT_SEARCH", "DOCUMENT_QUESTION", "UNIFORM_POLICY"].includes(
      intent,
    ) &&
    !docFollowup
  )
    p.documentQuery = query;
  if (purchaseFollowup) delete p.recordId;
  return {
    intent,
    parameters: Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined),
    ),
    query: q,
  };
}
