import type { Answer } from "./assistant";
import type { Account, ReadState } from "./types";
import { normalize } from "./types";
import { canReadWorkbookData } from "./workbook-data";

/** Exact local source lookups. Never derive stock, approval, availability, or identity joins. */
export function workbookAnswer(
  state: ReadState,
  actor: Account,
  question: string,
): Answer | undefined {
  const q = normalize(question),
    explicit = /excel|workbook|du lieu nguon|file (?:dong phuc|tu do)/.test(q);
  const source = state.workbookData;
  if (!canReadWorkbookData(actor.role)) {
    if (!explicit) return;
    return {
      intent: "UNSUPPORTED",
      parameters: {},
      status: "unavailable",
      text: "Dữ liệu Excel không nằm trong phạm vi được phép tra cứu.",
      evidence: [],
      suggestions: [],
    };
  }
  if (!source) return;
  const sourceId = question
    .match(/\bXLS-[A-Z0-9]+-\d{2}-\d{5}\b/i)?.[0]
    .toUpperCase();
  const searchable = (value: string) =>
    normalize(value)
      .replace(/[^\p{L}\p{N}-]+/gu, " ")
      .trim();
  const words = " " + searchable(question) + " ";
  const lookup = (r: {
    id: string;
    employeeName?: string;
    employeeCode?: string;
    productCode?: string;
    number?: string;
  }) =>
    sourceId
      ? r.id === sourceId
      : q.includes(normalize(r.id)) ||
        [r.employeeName, r.employeeCode, r.productCode].some(
          (value) =>
            value &&
            normalize(value).length >= 4 &&
            words.includes(" " + searchable(value) + " "),
        );
  const lockerTopic = /tu do|\btu\b|locker/.test(q),
    purchaseTopic = /mua|ngan sach|de nghi|\bpr\b|\bpo\b/.test(q);
  const exactLocker = source.lockers.filter(lookup),
    exactUniform = source.uniformRequests.filter(lookup),
    exactPurchase = source.uniformPurchases.filter(lookup);
  if (
    !explicit &&
    !exactLocker.length &&
    !exactUniform.length &&
    !exactPurchase.length
  )
    return;
  const kind =
    lockerTopic ||
    (exactLocker.length && !exactUniform.length && !exactPurchase.length)
      ? "locker"
      : purchaseTopic ||
          (exactPurchase.length && !exactUniform.length && !exactLocker.length)
        ? "purchase"
        : "uniform";
  const selected =
    kind === "locker"
      ? exactLocker
      : kind === "purchase"
        ? exactPurchase
        : exactUniform;
  const all =
    kind === "locker"
      ? source.lockers
      : kind === "purchase"
        ? source.uniformPurchases
        : source.uniformRequests;
  const records = selected.length
    ? selected
    : explicit && /bao nhieu|danh sach|liet ke|du lieu excel/.test(q)
      ? all
      : [];
  const evidence = records.slice(0, 5).map((r) => {
    const row = r as typeof r & Record<string, unknown>;
    const passage =
      kind === "locker"
        ? `${row.employeeName || "Chưa ghi người sử dụng"}; tủ ${row.number}; ${row.department || "chưa ghi khoa"}; ${row.section || row.sheet}. Ngày cấp ${row.allocationDate || row.allocationDateRaw || "chưa xác định"}; ngày thu ${row.returnDate || row.returnDateRaw || "chưa xác định"}. Chưa kết luận tủ hiện đang trống.`
        : kind === "purchase"
          ? `${row.productName}; mã ${row.productCode || "chưa ghi"}; lượng ${row.quantityRaw || "chưa ghi"} ${row.unit || ""}; ngân sách ${row.budgetCode || "chưa ghi"}. Chưa xác nhận trạng thái duyệt hoặc PO.`
          : `${row.employeeName} (${row.employeeCode || "chưa ghi mã"}); ${row.uniformType}; cỡ nguồn ${row.sizeRaw || "chưa ghi"}; lượng yêu cầu ${row.requestedQuantityRaw || "chưa ghi"}; lượng đã cấp ${row.issuedQuantityRaw || "chưa ghi"}; PR ${row.prReference || "chưa ghi"}; PO ${row.poReference || "chưa ghi"}.`;
    return {
      recordId: r.id,
      title: `${row.employeeName || row.productName || "Dòng nguồn"} · ${r.sheet} · dòng ${r.row}`,
      passage,
      href:
        kind === "locker"
          ? `/tu-do?view=excel&record=${r.id}`
          : `${kind === "purchase" ? "/mua-sam" : "/dong-phuc"}/du-lieu-excel?record=${r.id}`,
    };
  });
  return {
    intent:
      kind === "locker"
        ? "LOCKER_ASSIGNMENT"
        : kind === "purchase"
          ? "PURCHASE_STATUS"
          : "UNIFORM_HISTORY",
    parameters: {},
    recordIds: evidence.map((e) => e.recordId),
    status: evidence.length ? "answered" : "empty",
    text: evidence.length
      ? `Tìm thấy ${records.length} dòng Excel phù hợp, hiển thị ${evidence.length} dòng. Đây là dữ liệu nguồn cục bộ; không tự suy ra trạng thái hiện hành.\n${evidence.map((e) => e.passage).join("\n")}`
      : "Không tìm thấy dòng Excel phù hợp. Hãy nêu tên đầy đủ, mã nguồn hoặc mở tab Dữ liệu Excel để tra cứu.",
    evidence,
    suggestions: [],
  };
}
