import type {
  ReadState as State,
  Account,
  UniformRequest,
  Purchase,
} from "./types";
import {
  normalize,
  roleLabels,
  statuses,
  genderLabels,
  dateLabel,
  money,
} from "./types";
import {
  account,
  stock,
  employeesFor,
  issued,
  committed,
  availableLockers,
  lockerStatus,
  shortlist,
  requestsFor,
  purchasesFor,
  nextRole,
  canReadLocker,
  lastIssuedDate,
  linkedPurchases,
} from "./selectors";
import {
  interpret,
  requiresPrevious,
  type ConversationContext,
  type Interpretation,
} from "./assistant-routing";
import { retrievePassages, type Evidence } from "./assistant-documents";
import { normalizeSize, eligibleSku } from "./uniform-attributes";
import { decorateAnswer, ambiguityAnswer } from "./assistant-presentation";
import { workbookAnswer } from "./workbook-assistant";
export type {
  Intent,
  Parameters,
  ConversationContext,
} from "./assistant-routing";
export type { Evidence };
export type AnswerStatus =
  | "answered"
  | "missing"
  | "ambiguous"
  | "empty"
  | "unavailable"
  | "unsupported"
  | "error"
  | "confirmation";
export interface Answer extends ConversationContext {
  text: string;
  status: AnswerStatus;
  evidence: Evidence[];
  suggestions: string[];
  candidates?: {
    skuId: string;
    productId: string;
    code: string;
    name: string;
    supplier: string;
    score: number;
    reasons: string[];
    confirmed: boolean;
  }[];
  clarification?: {
    prompt: string;
    choices: { label: string; question: string }[];
  };
}
const record = (
  recordId: string,
  title: string,
  passage: string,
  href: string,
): Evidence => ({ recordId, title, passage, href });
function result(
  i: Interpretation,
  text: string,
  evidence: Evidence[] = [],
  status: AnswerStatus = "answered",
  suggestions: string[] = [],
): Answer {
  return {
    intent: i.intent,
    parameters: i.parameters,
    text,
    evidence,
    status,
    suggestions,
  };
}
function dossier(r: UniformRequest | Purchase): Evidence {
  const stage = nextRole(r);
  return record(
    r.id,
    r.id,
    `${statuses[r.status] || r.status}${r.status === "pending" && stage ? ` • Đang chờ ${roleLabels[stage]}` : ""}. Đã hoàn tất ${r.decisions.filter((d) => d.approved).length}/${r.stages.length} bước duyệt.${r.status === "rejected" ? ` Lý do: ${[...r.decisions].reverse().find((d) => !d.approved)?.reason || "Chưa có lý do trong hồ sơ"}.` : ""}${"context" in r ? ` Ngân sách ${r.context.budgetCode || "chưa cập nhật"}; tháng dự kiến ${r.context.purchaseMonth || "chưa cập nhật"}.` : ""}`,
    ("departmentId" in r ? "/dong-phuc/yeu-cau/" : "/mua-sam/de-nghi/") + r.id,
  );
}
/** Read-only orchestration. Offered mutations require a separate confirmation in the UI. */
export function answerQuery(
  s: State,
  actor: Account,
  query: string,
  context?: ConversationContext,
  routeRecordId?: string,
): Answer {
  const imported = workbookAnswer(s, actor, query);
  if (imported) return decorateAnswer(s, actor, imported);
  if (
    !context &&
    interpret(actor, query).intent === "UNSUPPORTED" &&
    requiresPrevious(query)
  )
    return {
      intent: "UNSUPPORTED",
      parameters: {},
      text: "Chưa có ngữ cảnh để nối tiếp. Vui lòng nêu mã hồ sơ hoặc câu hỏi đầy đủ.",
      status: "missing",
      evidence: [],
      suggestions: ["Tồn kho DP-DD-M", "Có đơn mua nào đang chờ phê duyệt?"],
    };
  const explicitRecord =
    /DEMO-(?:NV|YC|PR|PO|SAP-PO|TL|TU)-[\w-]+|\bDP-[\w-]+/i.test(query);
  const ambiguous =
    !explicitRecord && !routeRecordId
      ? ambiguityAnswer(s, actor, query, context)
      : undefined;
  return (
    ambiguous ||
    decorateAnswer(
      s,
      actor,
      readAnswerQuery(s, actor, query, context, routeRecordId),
    )
  );
}
function readAnswerQuery(
  s: State,
  actor: Account,
  query: string,
  context?: ConversationContext,
  routeRecordId?: string,
): Answer {
  const a = account(s, actor.id),
    i = interpret(a, query, context, routeRecordId),
    p = i.parameters,
    q = i.query;
  if (i.intent === "GENERAL_HELP")
    return result(
      i,
      "Tôi là trợ lý AI mô phỏng, xử lý cục bộ bằng quy tắc. Tôi có thể tra tài liệu có dẫn nguồn, tồn kho, hạn mức và lịch sử cấp, tủ đồ, mã sản phẩm, đề nghị mua và bước phê duyệt. Chọn một câu hỏi để bắt đầu.",
      [],
      "answered",
      [
        "Tồn kho DP-DD-M",
        "Có bao nhiêu tủ trống ở tầng 3?",
        "Tìm quy định cấp phát đồng phục.",
      ],
    );
  if (i.intent === "ACTION_REVIEW")
    return result(
      i,
      "Chưa thay đổi dữ liệu. Vui lòng mở hồ sơ hoặc biểu mẫu, kiểm tra thông tin và xác nhận bằng tài khoản có quyền. Phê duyệt, cấp tủ, điều chỉnh kho và tạo PO sử dụng cùng quy tắc của ứng dụng.",
      [
        record(
          p.recordId || "review",
          "Mở hồ sơ để kiểm tra và xác nhận",
          "Thao tác chỉ được lưu sau xác nhận tại biểu mẫu nghiệp vụ.",
          /tu do|cap tu|phan bo tu/.test(q)
            ? "/tu-do"
            : /ton/.test(q)
              ? "/dong-phuc/kho"
              : p.recordId?.startsWith("DEMO-YC")
                ? "/dong-phuc/yeu-cau/" + p.recordId
                : p.recordId?.startsWith("DEMO-PR")
                  ? "/mua-sam/de-nghi/" + p.recordId
                  : "/phe-duyet",
        ),
      ],
      "confirmation",
    );
  if (
    ["DOCUMENT_SEARCH", "DOCUMENT_QUESTION", "UNIFORM_POLICY"].includes(
      i.intent,
    )
  ) {
    const evidence = retrievePassages(
      s,
      a,
      p.documentQuery || p.recordId || query,
    );
    if (!evidence.length)
      return result(
        i,
        "Chưa đủ tài liệu còn hiệu lực trong phạm vi được phép để trả lời. Không tìm thấy đoạn phù hợp; tôi không suy đoán chính sách hoặc tiết lộ tài liệu ngoài quyền đọc.",
        [],
        "empty",
        ["Tìm quy định cấp phát đồng phục.", "Quy định phân bổ tủ đồ là gì?"],
      );
    return result(
      i,
      "Các đoạn dưới đây là nội dung thực tế của tài liệu demo còn hiệu lực." +
        (/dinh muc/.test(q)
          ? ` Cấu hình hiện tại: ${s.settings.annualLimit} bộ/người/năm ${s.settings.date.slice(0, 4)}; tài liệu mô tả chính sách mẫu.`
          : ""),
      evidence,
    );
  }
  if (
    ["UNIFORM_HISTORY", "UNIFORM_ELIGIBILITY", "LOCKER_ASSIGNMENT"].includes(
      i.intent,
    )
  ) {
    if (i.intent === "LOCKER_ASSIGNMENT" && p.recordId?.startsWith("DEMO-TU")) {
      const l = s.lockers.find((l) => l.id === p.recordId);
      const allowed = l && canReadLocker(s, a, l);
      if (!allowed)
        return result(
          i,
          "Không có hồ sơ tủ trong phạm vi được phép tra cứu.",
          [],
          "unavailable",
        );
      return result(
        i,
        `${l.id}: ${statuses[lockerStatus(l)] || lockerStatus(l)}.`,
        [
          record(
            l.id,
            l.id,
            `${l.building}, tầng ${l.floor}, ${l.area}, số ${l.number}. Người/đơn vị nhận: ${l.employeeId || l.assignedDepartmentId || l.reservedFor || "Chưa giao"}.`,
            "/tu-do",
          ),
        ],
      );
    }
    if (p.employeeName) {
      const matches = employeesFor(s, a).filter(
        (e) =>
          normalize(e.name) === p.employeeName ||
          normalize(e.name) === "nhan vien " + p.employeeName,
      );
      if (matches.length > 1)
        return result(
          i,
          "Có nhiều nhân viên cùng tên trong phạm vi của bạn. Vui lòng chọn mã nhân viên.",
          matches.map((e) =>
            record(
              e.id,
              e.id,
              `${e.name}, khoa ${e.departmentId}.`,
              "/dong-phuc/nhan-vien",
            ),
          ),
          "ambiguous",
          matches.map((e) => `Lịch sử cấp ${e.id}`),
        );
      if (matches.length === 1) p.employeeId = matches[0].id;
      else
        return result(
          i,
          "Không tìm thấy nhân viên đã nêu trong phạm vi dữ liệu demo được phép. Vui lòng kiểm tra mã nhân viên; tôi không thay bằng người khác.",
          [],
          "unavailable",
        );
    }
    if (!p.employeeId)
      return result(
        i,
        "Bạn muốn tra nhân viên nào? Nêu mã (ví dụ DEMO-NV-031) hoặc hỏi về “tôi”.",
        [],
        "missing",
        ["Lịch sử cấp DEMO-NV-031", "Tôi còn được bao nhiêu bộ đồng phục?"],
      );
    const e = employeesFor(s, a).find((e) => e.id === p.employeeId);
    if (!e)
      return result(
        i,
        "Không có nhân viên trong phạm vi được phép tra cứu.",
        [],
        "unavailable",
      );
    if (i.intent === "LOCKER_ASSIGNMENT") {
      const rows = s.lockers.filter((l) => l.employeeId === e.id);
      return result(
        i,
        `${e.name} (${e.id}): ${rows.length ? `đang sử dụng ${rows.length} tủ` : "chưa có tủ đang sử dụng"}.`,
        rows.map((l) =>
          record(
            l.id,
            l.id,
            `${l.building}, tầng ${l.floor}, ${l.area}, số ${l.number}.`,
            "/tu-do",
          ),
        ),
        rows.length ? "answered" : "empty",
      );
    }
    const year = p.year || Number(s.settings.date.slice(0, 4)),
      count = issued(s, e.id, year),
      hold = committed(s, e.id, year),
      remaining = Math.max(0, s.settings.annualLimit - count - hold);
    const evidence = [
      record(
        e.id,
        e.id,
        `Lịch sử cấp và cam kết năm ${year}; khoa ${e.departmentId}. Trả hàng không tự hoàn hạn mức.`,
        "/dong-phuc/nhan-vien",
      ),
      ...s.issuances
        .filter((r) => r.employeeId === e.id && r.date.startsWith(String(year)))
        .map((r) =>
          record(
            r.id,
            r.id,
            `${r.date}: ${r.quantity} bộ ${s.skus.find((x) => x.id === r.skuId)!.code}; hồ sơ ${r.requestId}.`,
            "/dong-phuc/yeu-cau/" + r.requestId,
          ),
        ),
    ];
    const selectedSku = p.productCode
      ? s.skus.find((sku) => sku.code === p.productCode)
      : undefined;
    const eligibility =
      selectedSku && !eligibleSku(selectedSku, e)
        ? " Mã được hỏi không phù hợp chức danh/giới tính hiện tại; cần cập nhật thông tin hoặc chọn biến thể dùng chung."
        : !e.active
          ? " Nhân viên đã ngừng hoạt động, không đủ điều kiện gửi cấp mới."
          : year !== Number(s.settings.date.slice(0, 4))
            ? " Đây là lịch sử năm đã chọn; cấu hình hạn mức là cấu hình hiện tại, chưa đủ căn cứ kết luận điều kiện cấp trong năm đó."
            : p.quantity && p.quantity > remaining
              ? ` Xin thêm ${p.quantity} bộ vượt phần còn lại; cần lý do ngoại lệ và Lãnh đạo duyệt.`
              : " Cấp mới còn cần kiểm tra loại đồng phục, tồn kho và phê duyệt; trợ lý không tự cấp.";
    return result(
      i,
      (year === Number(s.settings.date.slice(0, 4))
        ? `${e.name}: đã cấp ${count} bộ, đang cam kết ${hold} bộ, còn ${remaining} bộ theo định mức ${s.settings.annualLimit} bộ/năm ${year}.`
        : `${e.name}, năm ${year}: đã cấp ${count} bộ, đang cam kết ${hold} bộ.`) +
        eligibility +
        (lastIssuedDate(s, e.id)
          ? ` Ngày cấp gần nhất trong dữ liệu: ${dateLabel(lastIssuedDate(s, e.id))}.`
          : " Chưa có ngày cấp trong dữ liệu."),
      evidence,
    );
  }
  if (i.intent === "LOCKER_AVAILABILITY") {
    const rows = availableLockers(s, p.area, p.departmentId).filter(
      (l) =>
        (!p.floor || l.floor === p.floor) &&
        (!p.building || normalize(l.building) === "toa " + p.building),
    );
    const where = [
      p.building && "tòa " + p.building.toUpperCase(),
      p.floor && "tầng " + p.floor,
      p.area,
      p.departmentId && "đơn vị sở hữu " + p.departmentId,
    ]
      .filter(Boolean)
      .join(", ");
    return result(
      i,
      `Có ${rows.length} tủ trống có thể cấp${where ? " tại " + where : ""}. Đã loại tủ bảo trì, đang dùng hoặc giữ chỗ. Người có quyền phải xác nhận phân bổ.`,
      [
        record(
          "locker-availability",
          "Danh mục tủ trống",
          `Tổng ${rows.length} tủ theo vị trí đã chọn.`,
          "/tu-do",
        ),
        ...rows
          .slice(0, 3)
          .map((l) =>
            record(
              l.id,
              l.id,
              `${l.building}, tầng ${l.floor}, ${l.area}, số ${l.number}.`,
              "/tu-do",
            ),
          ),
      ],
      rows.length ? "answered" : "empty",
    );
  }
  if (["PURCHASE_STATUS", "APPROVAL_STATUS"].includes(i.intent)) {
    const purchases = purchasesFor(s, a),
      uniforms = requestsFor(s, a);
    if (
      p.recordId?.startsWith("DEMO-PO") ||
      p.recordId?.startsWith("DEMO-SAP-PO")
    ) {
      const o = s.orders.find(
        (o) =>
          o.id.toUpperCase() === p.recordId &&
          purchases.some((r) => r.id === o.purchaseId),
      );
      if (!o)
        return result(
          i,
          "Không có đơn hàng trong phạm vi được phép tra cứu.",
          [],
          "unavailable",
        );
      const received = o.lines.reduce((n, l) => n + l.received, 0),
        total = o.lines.reduce((n, l) => n + l.quantity, 0);
      return result(
        i,
        `${o.id}: ${statuses[o.status] || o.status}, đã nhận ${received}/${total} bộ.`,
        [
          record(
            o.id,
            o.id,
            `Đề nghị ${o.purchaseId}; nhà cung cấp ${o.supplier}.`,
            "/mua-sam/don-hang/" + o.id,
          ),
        ],
      );
    }
    let rows: (UniformRequest | Purchase)[] =
      i.intent === "PURCHASE_STATUS" ? purchases : [...uniforms, ...purchases];
    if (p.recordId) rows = rows.filter((r) => r.id === p.recordId);
    else if (/nay|tu choi|tai sao/.test(q) && !/nao|danh sach|liet ke/.test(q))
      return result(
        i,
        "Vui lòng cung cấp mã hồ sơ cần xem (ví dụ DEMO-YC-001) hoặc mở hồ sơ trước khi hỏi “yêu cầu này”.",
        [],
        "missing",
      );
    else
      rows = rows.filter((r) =>
        p.purchaseStatus
          ? r.status === p.purchaseStatus
          : /tu choi/.test(q)
            ? r.status === "rejected"
            : /phe duyet|dang cho|cho duyet/.test(q)
              ? r.status === "pending"
              : true,
      );
    if (!rows.length)
      return result(
        i,
        p.recordId
          ? "Không có hồ sơ trong phạm vi được phép tra cứu."
          : "Không có hồ sơ phù hợp trong phạm vi được phép tra cứu.",
        [],
        p.recordId ? "unavailable" : "empty",
      );
    rows = rows.filter(
      (r) =>
        !("context" in r) ||
        ((!p.purchaseMonth || r.context.purchaseMonth === p.purchaseMonth) &&
          (!p.budgetCode || r.context.budgetCode === p.budgetCode) &&
          (!p.departmentId || r.context.budgetDepartmentId === p.departmentId)),
    );
    if (!rows.length)
      return result(
        i,
        "Không có hồ sơ phù hợp bộ lọc tháng, khoa hoặc ngân sách trong phạm vi được phép.",
        [],
        "empty",
      );
    const evidence = rows.map(dossier);
    if (p.recordId?.startsWith("DEMO-YC"))
      for (const { purchase, orders } of linkedPurchases(s, a, p.recordId)) {
        evidence.push(dossier(purchase));
        evidence.push(
          ...orders.map((o) =>
            record(
              o.id,
              o.id,
              `PO mô phỏng liên quan ${purchase.id}; ${statuses[o.status]}.`,
              "/mua-sam/don-hang/" + o.id,
            ),
          ),
        );
      }
    return result(
      i,
      p.recordId
        ? `${p.recordId}: ${evidence[0].passage}`
        : `Có ${rows.length} ${i.intent === "PURCHASE_STATUS" ? "đề nghị mua" : "hồ sơ"} phù hợp. Danh sách lấy từ trạng thái hiện tại, trong phạm vi của bạn.${i.intent === "PURCHASE_STATUS" && /tong hop|ngan sach/.test(q) ? ` Giá trị đề nghị (gồm nháp): ${money(rows.filter((r) => "context" in r).reduce((n, r) => n + r.lines.reduce((v, l) => v + l.quantity * ("price" in l ? l.price : 0), 0), 0))}.` : ""}`,
      evidence,
    );
  }
  if (
    ["UNIFORM_INVENTORY", "PRODUCT_SEARCH", "SUPPLIER_MATCH"].includes(i.intent)
  ) {
    const sp = p.productCode?.startsWith("SAP-")
      ? s.supplierProducts.find((x) => x.code === p.productCode)
      : undefined;
    const rows = s.skus.filter(
      (x) =>
        x.active &&
        (!p.productCode ||
          x.code === p.productCode ||
          (!!sp &&
            x.category === sp.category &&
            normalizeSize(x.size) === normalizeSize(sp.size) &&
            x.gender === sp.gender)) &&
        (!p.category || x.category === p.category) &&
        (!p.size || normalizeSize(x.size) === p.size) &&
        (!p.gender || x.gender === "unisex" || x.gender === p.gender),
    );
    if (p.productCode && !rows.length)
      return result(
        i,
        "Không tìm thấy mã sản phẩm khớp dữ liệu demo. Vui lòng kiểm tra mã, loại và cỡ.",
        [],
        "empty",
      );
    if (!p.productCode && !p.category && !p.size)
      return result(
        i,
        "Vui lòng nêu mã nội bộ hoặc loại và cỡ (ví dụ DP-DD-M, áo blouse size M).",
        [],
        "missing",
        ["Tồn kho DP-DD-M", "Tìm mã SAP áo điều dưỡng size L"],
      );
    if (!rows.length)
      return result(
        i,
        "Chưa có sản phẩm đúng loại và cỡ đã nêu; tôi không tự thay bằng cỡ khác.",
        [],
        "empty",
      );
    if (rows.length > 1)
      return result(
        i,
        `Có ${rows.length} mã phù hợp. Vui lòng chọn mã hoặc bổ sung loại/cỡ trước khi tra số lượng hay đối sánh.`,
        rows.map((sku) =>
          record(
            sku.id,
            sku.code,
            `${sku.name}, ${genderLabels[sku.gender]}, cỡ ${sku.size}.`,
            "/dong-phuc/kho",
          ),
        ),
        "ambiguous",
        rows
          .slice(0, 4)
          .map((sku) =>
            i.intent === "SUPPLIER_MATCH"
              ? `Mã SAP ${sku.code}`
              : `Tồn kho ${sku.code}`,
          ),
      );
    const sku = rows[0];
    p.category = sku.category;
    p.size = sku.size;
    p.productCode = sku.code;
    if (i.intent === "PRODUCT_SEARCH")
      return result(i, `Tìm thấy ${sku.code}: ${sku.name}, cỡ ${sku.size}.`, [
        record(
          sku.id,
          sku.code,
          `Mã nội bộ ${sku.code}; đang hoạt động.`,
          "/dong-phuc/kho",
        ),
      ]);
    if (i.intent === "UNIFORM_INVENTORY") {
      const warehouse = p.warehouse || "TT",
        st = stock(s, sku.id, warehouse);
      return result(
        i,
        `${sku.code}, ${warehouse === "TT" ? "kho trung tâm" : "kho khoa Nội"}: ${st.physical} bộ vật lý, ${st.held} bộ đang giữ, ${st.available} bộ khả dụng.`,
        [
          record(
            sku.id,
            sku.code,
            "Nguồn: tổng biến động lô trừ giữ hàng trên yêu cầu đã duyệt.",
            "/dong-phuc/kho",
          ),
        ],
      );
    }
    const candidates = shortlist(s, sku.id)
      .filter(
        (c) =>
          c.product.category === sku.category &&
          normalizeSize(c.product.size) === normalizeSize(sku.size) &&
          c.product.gender === sku.gender,
      )
      .slice(0, 3)
      .map((c) => ({
        skuId: sku.id,
        productId: c.product.id,
        code: c.product.code,
        name: c.product.name,
        supplier: c.product.supplier,
        score: c.score,
        reasons: c.reasons,
        confirmed: s.mappings.some(
          (m) => m.skuId === sku.id && m.productId === c.product.id,
        ),
      }));
    return {
      ...result(
        i,
        `Ứng viên mã SAP mô phỏng cho ${sku.code}. Điểm là quy tắc đối sánh, không phải xác suất. Biến thể: ${genderLabels[sku.gender]}, cỡ ${sku.size}. Người mua cần kiểm tra và xác nhận lựa chọn trước khi dùng; chưa thay đổi đối sánh.`,
        candidates.map((c) =>
          record(
            c.productId,
            c.code,
            `${c.supplier} • ${c.score}/100 • ${c.reasons.join(", ")}${c.confirmed ? " • Đối sánh đã xác nhận" : " • Chưa xác nhận"}.`,
            "/mua-sam/nha-cung-cap",
          ),
        ),
        "confirmation",
      ),
      candidates,
    };
  }
  return result(
    i,
    "Câu hỏi chưa được hỗ trợ hoặc chưa đủ dữ liệu demo. Tôi có thể tra tài liệu, đồng phục, tủ đồ, sản phẩm, mua sắm và phê duyệt; không trả lời ngoài các nguồn này.",
    [],
    "unsupported",
    ["Bạn có thể giúp gì?", "Tồn kho DP-DD-M"],
  );
}
