import { z } from "zod";
import type { State, Account, StateRef } from "../src/domain/types";
import {
  normalize,
  statuses,
  roleLabels,
  dateLabel,
} from "../src/domain/types";
import type { Evidence } from "../src/domain/assistant";
import {
  account,
  employeesFor,
  stock,
  issued,
  committed,
  lastIssuedDate,
  requestsFor,
  purchasesFor,
  nextRole,
  availableLockers,
  lockerStatus,
  canReadLocker,
  lockerEventsFor,
  shortlist,
  canReadDocument,
  documentFor,
  reserveCap,
} from "../src/domain/selectors";
import {
  normalizeSize,
  validSize,
  eligibleSku,
} from "../src/domain/uniform-attributes";
import {
  keywordSearch,
  DocumentIndex,
  type SearchResult,
} from "./rag/retrieval";
import { verifyCitation } from "./rag/chunks";
import { projectView } from "./views";
import { ApiError, unavailable } from "./errors";
import { toolContext } from "./conversation";
import type { ConversationContext } from "../src/domain/assistant-routing";
export interface ToolResult {
  status: "ok" | "ambiguous" | "empty" | "unavailable";
  data: z.infer<ReturnType<typeof z.json>>;
  text: string;
  evidence: Evidence[];
  stateRef: StateRef;
  retrievalMode?: "hybrid" | "keyword";
  semanticStatus?: "ready" | "semantic_unavailable";
  context?: ConversationContext;
}
export interface ToolContext {
  state: State;
  actor: Account;
  ref: StateRef;
  evidence: Map<string, Evidence>;
  documentIndex?: DocumentIndex;
  signal?: AbortSignal;
  hint?: ConversationContext;
}
const id = z.string().min(1).max(128),
  query = z.string().trim().min(1).max(500),
  limit = z.number().int().min(1).max(20).optional();
const category = z.enum(["doctor", "nurse", "technician", "office"]).optional(),
  gender = z.enum(["male", "female", "unisex"]).optional();
const size = z
  .string()
  .max(10)
  .refine(validSize)
  .transform(normalizeSize)
  .optional();
const year = z.number().int().min(2000).max(2100).optional();
const productFields = {
  code: id.optional(),
  query: query.optional(),
  category,
  gender,
  size,
  departmentId: id.optional(),
  limit,
};
const ev = (
  recordId: string,
  title: string,
  passage: string,
  href: string,
): Evidence => ({ recordId, title, passage, href });
const result = (
  c: ToolContext,
  data: unknown,
  text: string,
  evidence: Evidence[] = [],
  status: ToolResult["status"] = "ok",
): ToolResult => ({
  status,
  data: z.json().parse(JSON.parse(JSON.stringify(data))),
  text,
  evidence,
  stateRef: c.ref,
});
function productRows(
  c: ToolContext,
  p: {
    code?: string;
    query?: string;
    category?: string;
    gender?: string;
    size?: string;
    departmentId?: string;
  },
) {
  if (
    p.departmentId &&
    !c.state.departments.some((d) => d.id === p.departmentId)
  )
    throw unavailable();
  if (
    p.departmentId &&
    ["employee", "coordinator", "head"].includes(c.actor.role) &&
    p.departmentId !== c.actor.departmentId
  )
    throw unavailable();
  return c.state.skus.filter(
    (s) =>
      s.active &&
      (!p.code ||
        s.code.toUpperCase() === p.code.toUpperCase() ||
        s.id === p.code) &&
      (!p.category || s.category === p.category) &&
      (!p.gender || s.gender === p.gender) &&
      (!p.size || normalizeSize(s.size) === p.size) &&
      (!p.query ||
        normalize(p.query)
          .replace(/blouse/g, "bac si")
          .split(/\s+/)
          .every((t) =>
            normalize(s.name + " " + s.code + " " + s.size).includes(t),
          )),
  );
}
function employee(c: ToolContext, employeeId: string) {
  const e = employeesFor(c.state, c.actor).find((e) => e.id === employeeId);
  if (!e) throw unavailable();
  return e;
}
interface Entry {
  name: string;
  description: string;
  schema: z.ZodType;
  run: (c: ToolContext, args: unknown) => ToolResult;
}
function tool<S extends z.ZodType>(
  name: string,
  description: string,
  schema: S,
  run: (c: ToolContext, args: z.infer<S>) => ToolResult,
): Entry {
  return {
    name,
    description,
    schema,
    run: (c, args) => run(c, schema.parse(args)),
  };
}
export const registry: Entry[] = [
  tool(
    "clarify_question",
    "Yêu cầu bổ sung mã/người/kho/hồ sơ khi câu hỏi không đủ tham số; không đoán dữ liệu.",
    z
      .object({
        subject: z.enum([
          "employee",
          "product",
          "warehouse",
          "record",
          "document",
        ]),
      })
      .strict(),
    (c, p) =>
      result(
        c,
        null,
        {
          employee: "Vui lòng nêu mã hoặc tên nhân viên cần tra cứu.",
          product: "Vui lòng nêu mã đồng phục hoặc loại, giới tính và cỡ.",
          warehouse: "Bạn muốn tra kho trung tâm (TT) hay kho khoa Nội (NOI)?",
          record: "Vui lòng nêu mã yêu cầu, đề nghị mua hoặc PO cần đối chiếu.",
          document: "Bạn muốn tìm tài liệu nào hoặc nội dung gì?",
        }[p.subject],
        [],
        "ambiguous",
      ),
  ),

  tool(
    "resolve_employee",
    "Tìm nhân viên theo mã hoặc tên trong phạm vi quyền; tên trùng phải yêu cầu chọn mã.",
    z
      .object({
        employeeId: id.optional(),
        name: z.string().min(1).max(120).optional(),
        self: z.boolean().optional(),
      })
      .strict()
      .refine(
        (p) => [p.employeeId, p.name, p.self].filter(Boolean).length === 1,
      ),
    (c, p) => {
      const rows = employeesFor(c.state, c.actor)
        .filter((e) =>
          p.self
            ? e.id === c.actor.employeeId
            : p.employeeId
              ? e.id === p.employeeId
              : normalize(e.name) === normalize(p.name!),
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 10);
      if (!rows.length) throw unavailable();
      const data = rows.map(({ id, name, departmentId }) => ({
        employeeId: id,
        name,
        departmentId,
      }));
      return result(
        c,
        data,
        rows.length > 1
          ? "Có nhiều nhân viên cùng tên. Vui lòng chọn mã nhân viên."
          : `${rows[0].name} (${rows[0].id}).`,
        data.map((e) =>
          ev(e.employeeId, e.name, e.employeeId, "/dong-phuc/nhan-vien"),
        ),
        rows.length > 1 ? "ambiguous" : "ok",
      );
    },
  ),
  tool(
    "find_uniform_product",
    "Tìm mã nội bộ đồng phục theo code, loại doctor/nurse/technician/office, giới tính và cỡ. Nhiều biến thể cần chọn mã.",
    z
      .object(productFields)
      .strict()
      .refine((p) => !!(p.code || p.query || p.category || p.gender || p.size)),
    (c, p) => {
      const all = productRows(c, p),
        rows = all.slice(0, p.limit || 10);
      if (!rows.length) throw unavailable();
      return result(
        c,
        rows.map(({ id, code, name, category, gender, size }) => ({
          skuId: id,
          code,
          name,
          category,
          gender,
          size,
        })),
        rows.length > 1
          ? "Có nhiều mã phù hợp. Vui lòng chọn đúng mã/cỡ/giới tính."
          : `Tìm thấy ${rows[0].code}: ${rows[0].name}, cỡ ${rows[0].size}.`,
        rows.map((s) =>
          ev(
            s.id,
            s.code,
            `${s.name}, cỡ ${s.size}, ${s.gender}.`,
            "/dong-phuc/kho",
          ),
        ),
        rows.length > 1 ? "ambiguous" : "ok",
      );
    },
  ),
  tool(
    "search_uniform_inventory",
    "Đọc tồn vật lý, đang giữ và khả dụng từ ledger hiện tại. Kho TT trung tâm hoặc NOI khoa Nội, có thể lọc khoa/loại/cỡ/giới tính.",
    z
      .object({ ...productFields, warehouse: z.enum(["TT", "NOI"]).optional() })
      .strict()
      .refine((p) => !!(p.code || p.category || p.size || p.gender)),
    (c, p) => {
      const rows = productRows(c, p).slice(0, p.limit || 10);
      if (!rows.length) throw unavailable();
      const warehouse =
        p.warehouse || (p.departmentId === "NOI" ? "NOI" : "TT");
      const data = rows.map((s) => ({
        skuId: s.id,
        code: s.code,
        size: s.size,
        gender: s.gender,
        warehouse,
        ...stock(c.state, s.id, warehouse),
      }));
      return result(
        c,
        data,
        data
          .map(
            (s) =>
              `${s.code}, ${warehouse === "TT" ? "kho trung tâm" : "kho khoa Nội"}: ${s.physical} bộ vật lý, ${s.held} bộ đang giữ, ${s.available} bộ khả dụng.`,
          )
          .join("\n"),
        data.map((s) =>
          ev(
            s.skuId,
            s.code,
            `Vật lý ${s.physical}; giữ ${s.held}; khả dụng ${s.available} bộ.`,
            "/dong-phuc/kho",
          ),
        ),
      );
    },
  ),
  tool(
    "check_uniform_eligibility",
    "Kiểm quota và điều kiện cấp bằng quy tắc, gồm đã cấp và cam kết. Không tự cấp hoặc duyệt ngoại lệ.",
    z
      .object({
        employeeId: id,
        year,
        skuId: id.optional(),
        quantity: z.number().int().min(1).max(1000).optional(),
      })
      .strict(),
    (c, p) => {
      const e = employee(c, p.employeeId),
        y = p.year || Number(c.state.settings.date.slice(0, 4)),
        used = issued(c.state, e.id, y),
        hold = committed(c.state, e.id, y),
        cap = c.state.settings.annualLimit,
        remaining = Math.max(0, cap - used - hold),
        sku = p.skuId
          ? c.state.skus.find((s) => s.id === p.skuId || s.code === p.skuId)
          : undefined;
      if (p.skuId && !sku) throw unavailable();
      const historicalOnly = y !== Number(c.state.settings.date.slice(0, 4));
      const data = {
        employeeId: e.id,
        year: y,
        issued: used,
        committed: hold,
        annualLimit: cap,
        remaining,
        active: e.active,
        skuMatches: sku ? eligibleSku(sku, e) : null,
        historicalOnly,
        requiresException: !!p.quantity && p.quantity > remaining,
      };
      const text = historicalOnly
        ? `${e.name}, năm ${y}: đã cấp ${used} bộ, đang cam kết ${hold} bộ. Chưa đủ cấu hình lịch sử để kết luận điều kiện cấp.`
        : `${e.name}: đã cấp ${used} bộ, đang cam kết ${hold} bộ, còn ${remaining} bộ theo định mức ${cap} bộ/năm ${y}. ${!e.active ? "Nhân viên đã ngừng hoạt động." : sku && !eligibleSku(sku, e) ? "Mã không phù hợp chức danh/giới tính." : data.requiresException ? "Số xin thêm vượt phần còn lại; cần lý do ngoại lệ và Lãnh đạo duyệt." : "Cấp mới còn cần kiểm tra biến thể, tồn kho và phê duyệt."}`;
      return result(c, data, text, [
        ev(e.id, e.id, text, "/dong-phuc/nhan-vien"),
      ]);
    },
  ),
  tool(
    "get_employee_issuance_history",
    "Đọc lịch sử cấp theo nhân viên/năm, ngày cấp và số lượng; không đổi giá lịch sử hoặc trừ hàng trả khỏi quota.",
    z.object({ employeeId: id, year, limit }).strict(),
    (c, p) => {
      const e = employee(c, p.employeeId),
        y = p.year || Number(c.state.settings.date.slice(0, 4)),
        view = projectView(c.state, c.actor.id, c.ref),
        rows = view.issuances
          .filter((i) => i.employeeId === e.id && i.date.startsWith(String(y)))
          .slice(0, p.limit || 20);
      const text = `${e.name}, năm ${y}: đã cấp ${issued(c.state, e.id, y)} bộ, đang cam kết ${committed(c.state, e.id, y)} bộ. Ngày cấp gần nhất: ${lastIssuedDate(c.state, e.id) || "chưa có"}. Trả hàng không hoàn hạn mức.`;
      return result(
        c,
        { employeeId: e.id, rows, issued: issued(c.state, e.id, y) },
        text,
        [
          ev(e.id, e.id, text, "/dong-phuc/nhan-vien"),
          ...rows.map((i) =>
            ev(
              i.id,
              i.id,
              `${i.date}: ${i.quantity} bộ; giá lịch sử ${i.price} đồng.`,
              `/dong-phuc/yeu-cau/${i.requestId}`,
            ),
          ),
        ],
      );
    },
  ),
  tool(
    "get_uniform_request_status",
    "Đọc trạng thái yêu cầu cấp phát, bước đang chờ và lý do bị từ chối theo mã hồ sơ hiện tại.",
    z.object({ requestId: id }).strict(),
    (c, p) => {
      const r = projectView(c.state, c.actor.id, c.ref).uniforms.find(
        (r) => r.id === p.requestId,
      );
      if (!r) throw unavailable();
      const role = nextRole(r),
        rejection = [...r.decisions].reverse().find((d) => !d.approved)?.reason;
      const text = `${r.id}: ${statuses[r.status]}.${r.status === "pending" && role ? " Đang chờ " + roleLabels[role] + "." : ""} Đã hoàn tất ${r.decisions.filter((d) => d.approved).length}/${r.stages.length} bước.${rejection ? " Lý do từ chối: " + rejection.slice(0, 500) : ""}`;
      return result(
        c,
        {
          requestId: r.id,
          status: r.status,
          nextRole: role || null,
          lines: r.lines,
        },
        text,
        [ev(r.id, r.id, text, "/dong-phuc/yeu-cau/" + r.id)],
      );
    },
  ),
  tool(
    "get_purchase_requests",
    "Tìm đề nghị mua đang chờ duyệt hoặc theo mã/tháng dự kiến/khoa ngân sách. Tính tổng bằng giá giao dịch, không đặt thêm hạn mức ngân sách.",
    z
      .object({
        requestId: id.optional(),
        status: z
          .enum([
            "draft",
            "pending",
            "approved",
            "ordered",
            "rejected",
            "cancelled",
          ])
          .optional(),
        departmentId: id.optional(),
        month: z
          .string()
          .regex(/^20\d{2}-(0[1-9]|1[0-2])$/)
          .optional(),
        budget: z.string().max(100).optional(),
        limit,
      })
      .strict(),
    (c, p) => {
      const rows = projectView(c.state, c.actor.id, c.ref)
        .purchases.filter(
          (r) =>
            (!p.requestId || r.id === p.requestId) &&
            (!p.status || r.status === p.status) &&
            (!p.departmentId ||
              r.context.budgetDepartmentId === p.departmentId) &&
            (!p.month || r.context.purchaseMonth === p.month) &&
            (!p.budget ||
              normalize(
                r.context.budgetCode + " " + r.context.budgetName,
              ).includes(normalize(p.budget))),
        )
        .slice(0, p.limit || 10);
      if (p.requestId && !rows.length) throw unavailable();
      const evidence = rows.map((r) =>
        ev(
          r.id,
          r.id,
          `${statuses[r.status]}${r.status === "pending" && nextRole(r) ? " • Đang chờ " + roleLabels[nextRole(r)!] : ""}. Tổng các dòng trong phạm vi: ${r.lines.reduce((n, l) => n + l.quantity * l.price, 0)} đồng.`,
          "/mua-sam/de-nghi/" + r.id,
        ),
      );
      return result(
        c,
        rows.map((r) => ({
          id: r.id,
          status: r.status,
          context: r.context,
          quantity: r.lines.reduce((n, l) => n + l.quantity, 0),
          value: r.lines.reduce((n, l) => n + l.quantity * l.price, 0),
        })),
        rows.length
          ? evidence.map((e) => e.title + ": " + e.passage).join("\n")
          : "Không có đề nghị phù hợp trong phạm vi được phép.",
        evidence,
        rows.length ? "ok" : "empty",
      );
    },
  ),
  tool(
    "get_purchase_order_status",
    "Đọc PO SAP mô phỏng và lượng đã nhận/còn lại; chỉ đọc khi đề nghị mua cha được phép.",
    z.object({ orderId: id }).strict(),
    (c, p) => {
      const o = projectView(c.state, c.actor.id, c.ref).orders.find(
        (o) => o.id.toUpperCase() === p.orderId.toUpperCase(),
      );
      if (!o) throw unavailable();
      const received = o.lines.reduce((n, l) => n + l.received, 0),
        total = o.lines.reduce((n, l) => n + l.quantity, 0),
        text = `${o.id}: ${statuses[o.status]}, đã nhận ${received}/${total} bộ, còn ${total - received} bộ. SAP mô phỏng.`;
      return result(c, { ...o, integration: "simulated_sap" }, text, [
        ev(o.id, o.id, text, "/mua-sam/don-hang/" + o.id),
      ]);
    },
  ),
  tool(
    "get_goods_receipts",
    "Đọc phiếu nhận hàng và các lô nhập của PO được phép. Tồn hiện tại phải đọc riêng search_uniform_inventory; không suy đoán chênh lệch nếu thiếu mốc.",
    z.object({ orderId: id, limit }).strict(),
    (c, p) => {
      const v = projectView(c.state, c.actor.id, c.ref);
      const order = v.orders.find(
        (o) => o.id.toUpperCase() === p.orderId.toUpperCase(),
      );
      if (!order) throw unavailable();
      const rows = v.receipts
        .filter((r) => r.orderId === order.id)
        .slice(0, p.limit || 10);
      return result(
        c,
        rows,
        rows.length
          ? rows
              .map(
                (r) =>
                  `${r.id} (${r.date}): đã nhập ${r.lines.reduce((n, l) => n + l.quantity, 0)} bộ theo PO ${r.orderId}.`,
              )
              .join("\n")
          : "Chưa có phiếu nhận hàng trong phạm vi.",
        rows.map((r) =>
          ev(
            r.id,
            r.id,
            `Ngày ${r.date}; ${r.lines.reduce((n, l) => n + l.quantity, 0)} bộ.`,
            "/mua-sam/don-hang/" + r.orderId,
          ),
        ),
        rows.length ? "ok" : "empty",
      );
    },
  ),
  tool(
    "search_available_lockers",
    "Tìm tủ còn trống/dùng được theo tòa/tầng/khu/đơn vị sở hữu; chỉ gợi ý, không giữ hoặc cấp tủ.",
    z
      .object({
        building: z.string().max(80).optional(),
        floor: z.string().max(20).optional(),
        area: z.string().max(80).optional(),
        ownerDepartmentId: id.optional(),
        quantity: z.number().int().positive().max(1000).optional(),
        limit,
      })
      .strict(),
    (c, p) => {
      const all = availableLockers(c.state, p.area, p.ownerDepartmentId).filter(
          (l) =>
            (!p.floor || l.floor === p.floor) &&
            (!p.building ||
              normalize(l.building) === normalize(p.building) ||
              normalize(l.building) === "toa " + normalize(p.building)),
        ),
        rows = all.slice(0, p.limit || 10),
        text = `Có ${all.length} tủ trống có thể cấp${p.floor ? " ở tầng " + p.floor : ""}. Đã loại tủ bảo trì, đang dùng hoặc giữ chỗ.${p.quantity && all.length < p.quantity ? " Chưa đủ số lượng yêu cầu." : ""} Chưa phân bổ hoặc giữ tủ.`;
      return result(
        c,
        {
          availableCount: all.length,
          sufficient: all.length >= (p.quantity || 1),
          lockers: rows,
        },
        text,
        [
          ev("locker-availability", "Danh mục tủ trống", text, "/tu-do"),
          ...rows.map((l) =>
            ev(
              l.id,
              l.id,
              `${l.building}, tầng ${l.floor}, ${l.area}, số ${l.number}.`,
              "/tu-do",
            ),
          ),
        ],
        all.length ? "ok" : "empty",
      );
    },
  ),
  tool(
    "get_locker_assignments",
    "Tra tủ đang giao/giữ cho nhân viên hoặc đơn vị, hoặc mã tủ. includeHistory đọc lịch sử phân bổ theo phạm vi cả người giao và nhận.",
    z
      .object({
        lockerId: id.optional(),
        employeeId: id.optional(),
        assignedDepartmentId: id.optional(),
        includeHistory: z.boolean().optional(),
        limit,
      })
      .strict()
      .refine(
        (p) =>
          [p.lockerId, p.employeeId, p.assignedDepartmentId].filter(Boolean)
            .length === 1,
      ),
    (c, p) => {
      if (p.employeeId) employee(c, p.employeeId);
      if (
        p.assignedDepartmentId &&
        !isDepartmentAllowed(c, p.assignedDepartmentId)
      )
        throw unavailable();
      const rows = c.state.lockers
        .filter(
          (l) =>
            canReadLocker(c.state, c.actor, l) &&
            (!p.lockerId || l.id === p.lockerId) &&
            (!p.employeeId ||
              l.employeeId === p.employeeId ||
              l.reservedFor === p.employeeId) &&
            (!p.assignedDepartmentId ||
              l.assignedDepartmentId === p.assignedDepartmentId),
        )
        .slice(0, p.limit || 10);
      if (p.lockerId && !rows.length) throw unavailable();
      const events = p.includeHistory
        ? lockerEventsFor(c.state, c.actor)
            .filter((e) =>
              p.lockerId
                ? e.lockerId === p.lockerId
                : p.employeeId
                  ? [e.from, e.to].includes(p.employeeId)
                  : [e.from, e.to].includes(p.assignedDepartmentId!),
            )
            .slice(-20)
            .map(({ id, lockerId, date, action, from, to }) => ({
              id,
              lockerId,
              date,
              action,
              from,
              to,
            }))
        : [];
      const text = rows.length
        ? rows
            .map(
              (l) =>
                `${l.id}: ${statuses[lockerStatus(l)]}, ${l.building}, tầng ${l.floor}. Người/đơn vị: ${l.employeeId || l.assignedDepartmentId || l.reservedFor || "chưa giao"}.`,
            )
            .join("\n")
        : "Chưa có tủ được giao trong phạm vi.";
      return result(
        c,
        { lockers: rows, events },
        text +
          (events.length
            ? "\nLịch sử: " +
              events
                .map(
                  (e) =>
                    `${e.date}: ${e.action}; ${e.lockerId}; ${e.from || "trống"} → ${e.to || "trống"}.`,
                )
                .join("\n")
            : ""),
        rows.map((l) =>
          ev(
            l.id,
            l.id,
            `${l.building}, tầng ${l.floor}, số ${l.number}.`,
            "/tu-do",
          ),
        ),
        rows.length || events.length ? "ok" : "empty",
      );
    },
  ),
  tool(
    "get_supplier_candidates",
    "Đối sánh mã nội bộ với danh mục NCC/SAP mô phỏng theo điểm quy tắc; khác chất liệu cần người mua xác nhận, không tự ghi mapping.",
    z.object({ skuId: id, query: query.optional(), limit }).strict(),
    (c, p) => {
      const sku = c.state.skus.find(
        (s) => s.id === p.skuId || s.code === p.skuId,
      );
      if (!sku) throw unavailable();
      const rows = shortlist(c.state, sku.id, p.query)
        .filter(
          (r) =>
            r.product.category === sku.category &&
            normalizeSize(r.product.size) === normalizeSize(sku.size) &&
            r.product.gender === sku.gender,
        )
        .slice(0, p.limit || 3)
        .map((r) => ({
          ...r,
          confirmed: c.state.mappings.some(
            (m) => m.skuId === sku.id && m.productId === r.product.id,
          ),
        }));
      return result(
        c,
        rows,
        `Ứng viên mã NCC mô phỏng cho ${sku.code}. Điểm là quy tắc đối sánh, không phải xác suất. Người mua phải kiểm tra và xác nhận tại biểu mẫu.`,
        rows.map((r) =>
          ev(
            r.product.id,
            r.product.code,
            `${r.score}/100 • ${r.reasons.join(", ")} • ${r.confirmed ? "đã xác nhận" : "chưa xác nhận"}.`,
            "/mua-sam/nha-cung-cap",
          ),
        ),
        rows.length ? "ok" : "empty",
      );
    },
  ),
  tool(
    "search_internal_documents",
    "Tìm các mục tài liệu bằng BM25 và embedding E5 cục bộ khi khả dụng. Luôn lọc quyền, phiên bản và ngày trước ranking. Hỏi câu thường, không cần từ khóa chính xác. Trả semantic_unavailable khi chỉ có BM25.",
    z
      .object({
        query,
        category: z.string().max(80).optional(),
        documentId: id.optional(),
        departmentId: id.optional(),
        limit: z.number().int().min(1).max(6).optional(),
      })
      .strict(),
    (c, p) => {
      return documentSearchResult(
        c,
        keywordSearch(c.state, c.actor, c.ref, p.query, {
          ...p,
          limit: p.limit || 3,
        }),
      );
    },
  ),
  tool(
    "get_document_metadata",
    "Đọc metadata một tài liệu đã xuất bản/còn hiệu lực/được phép; không trả original hoặc bản nháp.",
    z.object({ documentId: id }).strict(),
    (c, p) => {
      const d = c.state.documents.find(
        (d) => d.id.toUpperCase() === p.documentId.toUpperCase(),
      );
      if (!d || !canReadDocument(c.state, c.actor, d)) throw unavailable();
      return result(
        c,
        {
          id: d.id,
          title: d.title,
          category: d.category,
          version: d.version,
          date: d.date,
          expires: d.expires,
          sections: d.sections.map((s) => ({ id: s.id, title: s.title })),
        },
        `${d.title}, phiên bản ${d.version}, hiệu lực ${d.date}–${d.expires}.`,
        [
          ev(
            d.id,
            d.title,
            `Phiên bản ${d.version}.`,
            "/tai-lieu/" + d.id + "?version=" + d.version,
          ),
        ],
      );
    },
  ),
  tool(
    "get_document_passages",
    "Lấy các đoạn bằng evidenceIds do search_internal_documents cấp trong chính lượt này; kiểm lại quyền và version.",
    z.object({ evidenceIds: z.array(id).min(1).max(6) }).strict(),
    (c, p) => {
      const rows = p.evidenceIds.map((id) => {
        const e = c.evidence.get(id);
        if (!e) throw unavailable();
        if (!verifyCitation(c.state, c.actor, e, c.ref)) throw unavailable();
        return e;
      });
      return result(
        c,
        rows,
        "Nội dung nguyên văn từ các nguồn đã đối chiếu.",
        rows,
      );
    },
  ),
  tool(
    "get_uniform_policy",
    "Đọc cấu hình quota hiện hành và ngày demo; tài liệu chính sách chỉ là nguồn giải thích, không thay rule engine.",
    z.object({}).strict(),
    (c) => {
      const { date, annualLimit, reserveRatio, reserveSets } = c.state.settings;
      const wide = !["employee", "coordinator", "head"].includes(c.actor.role),
        data = {
          date,
          annualLimit,
          ...(wide
            ? { reserveRatio, reserveSets, reserveCap: reserveCap(c.state) }
            : {}),
        },
        text = `Cấu hình hiện tại: ${annualLimit} bộ/người/năm ${date.slice(0, 4)}. Đã cấp và đang cam kết cùng tính hạn mức; trả hàng không hoàn quota.`;
      return result(c, data, text, [
        ev("configuration", "Cấu hình đồng phục", text, "/dong-phuc/nhan-vien"),
      ]);
    },
  ),
];
function documentSearchResult(c: ToolContext, search: SearchResult) {
  for (const e of search.passages) c.evidence.set(e.evidenceId!, e);
  const out = result(
    c,
    {
      retrievalMode: search.retrievalMode,
      semanticStatus: search.semanticStatus,
      passages: search.passages.map((e) => ({
        evidenceId: e.evidenceId,
        recordId: e.recordId,
        version: e.version,
        sectionId: e.sectionId,
        title: e.title,
        passage: e.passage,
      })),
    },
    search.passages.length
      ? "Các trích đoạn tài liệu còn hiệu lực đã được kiểm quyền."
      : "Chưa đủ tài liệu còn hiệu lực trong phạm vi được phép để trả lời.",
    search.passages,
    search.passages.length ? "ok" : "empty",
  );
  return {
    ...out,
    retrievalMode: search.retrievalMode,
    semanticStatus: search.semanticStatus,
  };
}
export async function dispatchToolAsync(
  name: string,
  args: unknown,
  c: ToolContext,
): Promise<ToolResult> {
  if (name !== "search_internal_documents" || !c.documentIndex)
    return dispatchTool(name, args, c);
  const entry = registry.find((t) => t.name === name)!;
  let p: {
    query: string;
    category?: string;
    documentId?: string;
    departmentId?: string;
    limit?: number;
  };
  try {
    p = entry.schema.parse(args) as typeof p;
  } catch {
    throw new ApiError(
      "INVALID_TOOL_ARGUMENTS",
      422,
      "Tham số công cụ không hợp lệ.",
    );
  }
  const search = await c.documentIndex.search(
    c.state,
    account(c.state, c.actor.id),
    c.ref,
    p.query,
    { ...p, limit: p.limit || 3 },
    c.signal,
  );
  const output = documentSearchResult(c, search);
  if (Buffer.byteLength(JSON.stringify(output)) > 12000)
    throw new ApiError(
      "TOOL_OUTPUT_LIMIT",
      422,
      "Kết quả quá lớn. Vui lòng thu hẹp câu hỏi.",
    );
  return { ...output, context: toolContext(c.state, name, p, output, c.hint) };
}
function isDepartmentAllowed(c: ToolContext, id: string) {
  return (
    c.state.departments.some((d) => d.id === id) &&
    c.actor.role !== "employee" &&
    (!["coordinator", "head"].includes(c.actor.role) ||
      id === c.actor.departmentId)
  );
}
export const toolDefinitions = registry.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: z.toJSONSchema(t.schema, {
      io: "input",
      unrepresentable: "any",
    }),
  },
}));
export function dispatchTool(
  name: string,
  args: unknown,
  context: ToolContext,
): ToolResult {
  const entry = registry.find((t) => t.name === name);
  if (!entry)
    throw new ApiError("UNKNOWN_TOOL", 422, "Công cụ không được hỗ trợ.");
  try {
    const output = entry.run(
      { ...context, actor: account(context.state, context.actor.id) },
      args,
    );
    if (Buffer.byteLength(JSON.stringify(output)) > 12000)
      throw new ApiError(
        "TOOL_OUTPUT_LIMIT",
        422,
        "Kết quả quá lớn. Vui lòng thu hẹp câu hỏi.",
      );
    return {
      ...output,
      context: toolContext(context.state, name, args, output, context.hint),
    };
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new ApiError(
        "INVALID_TOOL_ARGUMENTS",
        422,
        "Tham số công cụ không hợp lệ.",
      );
    if (error instanceof ApiError && error.code === "UNAVAILABLE")
      return result(
        context,
        null,
        "Không có bản ghi trong phạm vi được phép.",
        [],
        "unavailable",
      );
    throw error;
  }
}
