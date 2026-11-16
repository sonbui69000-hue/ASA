import type {
  State,
  Role,
  Line,
  PurchaseLine,
  DemoDocument,
  Locker,
  Settings,
  UniformRequest,
  PurchaseContext,
  ProductGender,
  EmployeeGender,
} from "./types";
import {
  account,
  canDepartment,
  canRequest,
  canApprove,
  lotPhysical,
  lotHeld,
  stock,
  issued,
  committed,
  reserveCap,
  documentFor,
  availableLockers,
  shortageRows,
} from "./selectors";
import { MockSapAdapter } from "../adapters/sap";
import { stateSchema } from "./schema";
import { roleLabels, normalize } from "./types";
import {
  eligibleSku,
  normalizeSize,
  validSize,
  defaultPurchaseContext,
} from "./uniform-attributes";
export type Command =
  | {
      type: "uniform.create";
      departmentId: string;
      lines: Line[];
      note: string;
      exceptionReason: string;
    }
  | {
      type: "uniform.edit";
      id: string;
      lines: Line[];
      note: string;
      exceptionReason: string;
    }
  | {
      type: "uniform.submit" | "uniform.issue" | "uniform.cancel";
      id: string;
      reason?: string;
    }
  | { type: "uniform.return"; id: string; quantity: number; reason: string }
  | {
      type: "approve";
      entity: "uniform" | "purchase";
      id: string;
      approved: boolean;
      reason: string;
    }
  | {
      type: "sku.save";
      id?: string;
      name: string;
      code: string;
      category: State["skus"][number]["category"];
      size: string;
      gender?: ProductGender;
      price: number;
      minStock: number;
      active: boolean;
    }
  | {
      type: "stock.adjust";
      skuId: string;
      quantity: number;
      price: number;
      reason: string;
      warehouse: string;
    }
  | {
      type: "mapping.confirm";
      skuId: string;
      productId: string;
      reason: string;
    }
  | {
      type: "purchase.create";
      lines: PurchaseLine[];
      note: string;
      context?: PurchaseContext;
    }
  | {
      type: "purchase.submit" | "purchase.cancel" | "purchase.order";
      id: string;
    }
  | {
      type: "purchase.edit";
      id: string;
      lines: PurchaseLine[];
      note: string;
      context?: PurchaseContext;
    }
  | { type: "receipt"; id: string; quantities: Record<string, number> }
  | {
      type: "document.create";
      document: Pick<
        DemoDocument,
        | "title"
        | "category"
        | "sections"
        | "readRoles"
        | "signRoles"
        | "expires"
      >;
    }
  | {
      type: "document.update";
      id: string;
      title: string;
      text: string;
      readRoles: Role[];
      signRoles: Role[];
      expires: string;
    }
  | {
      type:
        | "document.mask"
        | "document.review"
        | "document.publish"
        | "document.revoke"
        | "document.version"
        | "document.sign";
      id: string;
    }
  | {
      type: "locker.save";
      id?: string;
      number: string;
      building: string;
      floor: string;
      area: string;
      departmentId: string;
      condition: Locker["condition"];
      active: boolean;
    }
  | {
      type: "locker.allocate";
      ids: string[];
      employeeIds: string[];
      departmentId: string;
      reason: string;
      reserve: boolean;
    }
  | {
      type: "locker.release" | "locker.transfer";
      id: string;
      employeeId?: string;
      reason: string;
    }
  | { type: "settings"; settings: Settings }
  | {
      type: "employee.save";
      id: string;
      departmentId: string;
      job: State["employees"][number]["job"];
      gender?: EmployeeGender;
      active: boolean;
    }
  | { type: "notifications.read"; ids: string[] };
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
const positive = (n: number) =>
  ensure(
    Number.isSafeInteger(n) && n > 0,
    "Số lượng phải là số nguyên lớn hơn 0.",
  );
const nonnegative = (n: number) =>
  ensure(
    Number.isSafeInteger(n) && n >= 0,
    "Giá và ngưỡng phải là số nguyên không âm.",
  );
export function execute(
  input: State,
  actorId: string,
  command: Command,
  operationId: string,
): State {
  if ("readModel" in input) throw Error("Không được ghi từ DTO chỉ đọc.");
  if (input.operations.includes(operationId)) return input;
  const s = structuredClone(input),
    a = account(s, actorId);
  const now = s.settings.date;
  const permit = (roles: Role[]) =>
    ensure(
      roles.includes(a.role),
      "Bạn không có quyền thực hiện thao tác này trong vai trò demo hiện tại.",
    );
  const id = (prefix: string) => `DEMO-${prefix}-${++s.sequence}`;
  let entityId = "",
    module = "Hệ thống",
    detail = "";
  const getUniform = (rid: string) => {
    const r = s.uniforms.find((r) => r.id === rid);
    ensure(
      r && canRequest(a, r),
      "Không tìm thấy yêu cầu trong phạm vi được phép.",
    );
    return r;
  };
  const verifyLines = (r: UniformRequest, checkQuota: boolean) => {
    ensure(r.lines.length > 0, "Thêm ít nhất một dòng đồng phục.");
    const keys = new Set<string>();
    for (const l of r.lines) {
      positive(l.quantity);
      const e = s.employees.find((e) => e.id === l.employeeId),
        sku = s.skus.find((x) => x.id === l.skuId);
      ensure(
        e?.active && e.departmentId === r.departmentId,
        "Nhân viên phải đang hoạt động và thuộc khoa yêu cầu.",
      );
      ensure(
        sku && eligibleSku(sku, e),
        "Loại đồng phục hoặc giới tính biến thể không phù hợp nhân viên. Cập nhật thuộc tính hoặc chọn mã dùng chung.",
      );
      const key = l.employeeId + l.skuId;
      ensure(!keys.has(key), "Dòng nhân viên và mã đồng phục bị trùng.");
      keys.add(key);
    }
    if (checkQuota)
      for (const eid of new Set(r.lines.map((l) => l.employeeId))) {
        const q = r.lines
          .filter((l) => l.employeeId === eid)
          .reduce((n, l) => n + l.quantity, 0);
        const used = issued(s, eid, r.year),
          held = committed(s, eid, r.year, r.id);
        ensure(
          used + held + q <= r.limit || r.exceptionReason.trim().length >= 10,
          `Vượt định mức: đã cấp ${used}, đang cam kết ${held}, yêu cầu ${q}, giới hạn ${r.limit} bộ. Cần giảm số lượng hoặc nêu lý do ngoại lệ ít nhất 10 ký tự để Lãnh đạo duyệt.`,
        );
      }
  };
  const needs = (r: UniformRequest) =>
    r.lines.some(
      (l) =>
        stock(s, l.skuId, r.warehouse).available <
        r.lines
          .filter((x) => x.skuId === l.skuId)
          .reduce((n, x) => n + x.quantity, 0),
    );
  switch (command.type) {
    case "uniform.create": {
      permit(["coordinator", "admin"]);
      ensure(
        canDepartment(a, command.departmentId),
        "Khoa yêu cầu nằm ngoài phạm vi.",
      );
      const r: UniformRequest = {
        id: id("YC"),
        departmentId: command.departmentId,
        warehouse: "TT",
        requesterId: actorId,
        date: now,
        year: Number(now.slice(0, 4)),
        limit: s.settings.annualLimit,
        status: "draft",
        lines: command.lines,
        note: command.note,
        exceptionReason: command.exceptionReason,
        decisions: [],
        stages: [],
        reservations: [],
      };
      verifyLines(r, false);
      s.uniforms.push(r);
      entityId = r.id;
      module = "Đồng phục";
      break;
    }
    case "uniform.edit": {
      permit(["coordinator", "admin"]);
      const r = getUniform(command.id);
      ensure(
        ["draft", "rejected"].includes(r.status),
        "Chỉ sửa bản nháp hoặc hồ sơ bị từ chối.",
      );
      r.lines = command.lines;
      r.note = command.note;
      r.exceptionReason = command.exceptionReason;
      r.status = "draft";
      r.decisions = [];
      verifyLines(r, false);
      entityId = r.id;
      module = "Đồng phục";
      break;
    }
    case "uniform.submit": {
      permit(["coordinator", "admin"]);
      const r = getUniform(command.id);
      ensure(
        ["draft", "waiting_stock", "rejected"].includes(r.status),
        "Hồ sơ đã được gửi hoặc đã kết thúc.",
      );
      r.year = Number(now.slice(0, 4));
      r.limit = s.settings.annualLimit;
      ensure(
        !r.exceptionReason.trim() || r.exceptionReason.trim().length >= 10,
        "Lý do ngoại lệ cần ít nhất 10 ký tự.",
      );
      verifyLines(r, true);
      r.stages = [...s.settings.uniformStages];
      if (r.exceptionReason.trim())
        r.stages = [...r.stages.filter((x) => x !== "leader"), "leader"];
      r.decisions = [];
      r.requesterId = actorId;
      r.status = needs(r) ? "waiting_stock" : "pending";
      entityId = r.id;
      module = "Đồng phục";
      detail =
        r.status === "waiting_stock"
          ? "Thiếu hàng, chưa giữ kho; chuyển mua bổ sung"
          : "Đã gửi quy trình duyệt";
      break;
    }
    case "approve": {
      const r =
        command.entity === "uniform"
          ? getUniform(command.id)
          : s.purchases.find((p) => p.id === command.id);
      ensure(r, "Không có hồ sơ.");
      ensure(
        canApprove(a, r, s),
        "Chưa đến bước duyệt của bạn, người gửi tự duyệt hoặc tài khoản đã duyệt bước khác.",
      );
      ensure(
        command.approved || command.reason.trim().length >= 5,
        "Từ chối cần lý do ít nhất 5 ký tự.",
      );
      const final = r.decisions.length + 1 === r.stages.length;
      if (command.entity === "uniform" && command.approved && final) {
        const u = r as UniformRequest;
        ensure(
          u.year === Number(now.slice(0, 4)),
          "Hồ sơ khác năm hiện tại. Hủy và lập lại theo định mức năm mới.",
        );
        verifyLines(u, true);
        ensure(
          !needs(u),
          "Tồn khả dụng không đủ. Bổ sung hàng trước khi xác nhận duyệt cuối.",
        );
        u.reservations = [];
        for (const line of u.lines) {
          let left = line.quantity;
          for (const lot of s.lots
            .filter(
              (l) => l.skuId === line.skuId && l.warehouse === u.warehouse,
            )
            .sort(
              (x, y) =>
                x.date.localeCompare(y.date) || x.id.localeCompare(y.id),
            )) {
            const local = u.reservations
              .filter((x) => x.lotId === lot.id)
              .reduce((n, x) => n + x.quantity, 0);
            const take = Math.min(
              left,
              lotPhysical(s, lot.id) - lotHeld(s, lot.id) - local,
            );
            if (take > 0) {
              u.reservations.push({
                lotId: lot.id,
                quantity: take,
                price: lot.price,
                skuId: line.skuId,
                employeeId: line.employeeId,
              });
              left -= take;
            }
            if (!left) break;
          }
          ensure(left === 0, "Tồn lô không đủ để giữ nguyên hồ sơ.");
        }
      }
      r.decisions.push({
        actorId,
        role: a.role,
        approved: command.approved,
        reason: command.reason || "Đã kiểm tra hồ sơ",
        date: now,
      });
      if (!command.approved) r.status = "rejected";
      else if (final)
        r.status = command.entity === "uniform" ? "reserved" : "approved";
      entityId = r.id;
      module = command.entity === "uniform" ? "Đồng phục" : "Mua sắm";
      detail = command.reason || "Xác nhận bước duyệt";
      break;
    }
    case "uniform.issue": {
      permit(["warehouse"]);
      const r = getUniform(command.id);
      ensure(
        r.status === "reserved",
        "Chỉ bàn giao hồ sơ đã duyệt và giữ đủ hàng.",
      );
      ensure(
        r.year === Number(now.slice(0, 4)),
        "Hồ sơ đã sang năm khác; hủy và lập lại.",
      );
      verifyLines(r, true);
      for (const v of r.reservations) {
        s.movements.push({
          id: id("MOV"),
          lotId: v.lotId,
          quantity: -v.quantity,
          date: now,
          reason: "Bàn giao đồng phục đã duyệt",
          source: r.id,
        });
        s.issuances.push({
          id: id("CP"),
          requestId: r.id,
          employeeId: v.employeeId,
          departmentId: r.departmentId,
          skuId: v.skuId,
          lotId: v.lotId,
          quantity: v.quantity,
          price: v.price,
          date: now,
          returned: 0,
        });
      }
      r.status = "issued";
      entityId = r.id;
      module = "Đồng phục";
      break;
    }
    case "uniform.cancel": {
      permit(["coordinator", "admin"]);
      const r = getUniform(command.id);
      ensure(
        !["issued", "cancelled"].includes(r.status),
        "Không thể hủy yêu cầu đã cấp hoặc đã hủy.",
      );
      ensure(
        (command.reason || "").trim().length >= 5,
        "Nhập lý do hủy ít nhất 5 ký tự.",
      );
      r.status = "cancelled";
      entityId = r.id;
      module = "Đồng phục";
      detail = command.reason!;
      break;
    }
    case "uniform.return": {
      permit(["warehouse"]);
      const row = s.issuances.find((i) => i.id === command.id);
      ensure(row, "Không có bản ghi cấp phát.");
      positive(command.quantity);
      ensure(
        command.quantity <= row.quantity - row.returned,
        "Số trả vượt số đã cấp chưa trả.",
      );
      ensure(command.reason.trim().length >= 5, "Nhập lý do trả hàng.");
      row.returned += command.quantity;
      s.movements.push({
        id: id("MOV"),
        lotId: row.lotId,
        quantity: command.quantity,
        date: now,
        reason: "Nhận lại hàng còn sử dụng: " + command.reason,
        source: row.id,
      });
      entityId = row.id;
      module = "Đồng phục";
      break;
    }
    case "sku.save": {
      permit(["warehouse", "sysadmin"]);
      const code = command.code.trim().toUpperCase();
      const size = normalizeSize(command.size),
        gender = command.gender || "unisex";
      ensure(
        validSize(size),
        "Nhập một cỡ hợp lệ: XS–3XL hoặc cỡ số. Tách nhiều cỡ thành các dòng riêng.",
      );
      nonnegative(command.price);
      nonnegative(command.minStock);
      ensure(
        command.name.trim() && command.code.trim(),
        "Tên và mã hàng là bắt buộc.",
      );
      ensure(
        !s.skus.some(
          (x) =>
            x.id !== command.id &&
            (x.code.trim().toUpperCase() === code ||
              (x.category === command.category &&
                normalizeSize(x.size) === size &&
                x.gender === gender)),
        ),
        "Mã hoặc loại/cỡ đã tồn tại.",
      );
      const item = {
        id: command.id || id("SKU"),
        code,
        name: command.name.trim(),
        category: command.category,
        size,
        gender,
        price: command.price,
        minStock: command.minStock,
        active: command.active,
      };
      if (command.id) {
        const index = s.skus.findIndex((x) => x.id === command.id);
        ensure(index >= 0, "Không có mã hàng.");
        ensure(
          s.skus[index].category === command.category &&
            normalizeSize(s.skus[index].size) === size &&
            s.skus[index].gender === gender,
          "Không đổi loại/cỡ/giới tính của mã đã tạo; tạo mã mới.",
        );
        s.skus[index] = item;
      } else s.skus.push(item);
      entityId = item.id;
      module = "Kho";
      break;
    }
    case "stock.adjust": {
      permit(["warehouse"]);
      ensure(
        s.skus.some((x) => x.id === command.skuId),
        "Mã hàng không hợp lệ.",
      );
      ensure(
        Number.isSafeInteger(command.quantity) && command.quantity !== 0,
        "Nhập điều chỉnh nguyên khác 0.",
      );
      nonnegative(command.price);
      ensure(
        command.reason.trim().length >= 5,
        "Điều chỉnh cần lý do ít nhất 5 ký tự.",
      );
      entityId = command.skuId;
      ensure(
        stock(s, command.skuId, command.warehouse).available +
          command.quantity >=
          0,
        "Không được giảm dưới số đã giữ hoặc làm âm tồn kho.",
      );
      if (command.quantity > 0) {
        const lid = id("LOT");
        s.lots.push({
          id: lid,
          skuId: command.skuId,
          price: command.price,
          date: now,
          warehouse: command.warehouse,
        });
        s.movements.push({
          id: id("MOV"),
          lotId: lid,
          quantity: command.quantity,
          date: now,
          reason: "Điều chỉnh kiểm kê: " + command.reason,
          source: lid,
        });
        entityId = lid;
      } else {
        let left = -command.quantity;
        for (const l of s.lots.filter(
          (l) => l.skuId === command.skuId && l.warehouse === command.warehouse,
        )) {
          const q = Math.min(left, lotPhysical(s, l.id) - lotHeld(s, l.id));
          if (q > 0)
            s.movements.push({
              id: id("MOV"),
              lotId: l.id,
              quantity: -q,
              date: now,
              reason: "Điều chỉnh kiểm kê: " + command.reason,
              source: l.id,
            });
          left -= q;
        }
      }
      module = "Kho";
      detail = command.reason;
      break;
    }
    case "mapping.confirm": {
      permit(["buyer"]);
      ensure(
        s.skus.some((x) => x.id === command.skuId),
        "Mã nội bộ không tồn tại.",
      );
      const p = s.supplierProducts.find((x) => x.id === command.productId);
      ensure(p, "Mã NCC không tồn tại.");
      const sku = s.skus.find((x) => x.id === command.skuId)!;
      ensure(
        p.category === sku.category &&
          normalizeSize(p.size) === normalizeSize(sku.size) &&
          p.gender === sku.gender,
        "Không thể xác nhận khác loại, khác cỡ hoặc giới tính biến thể.",
      );
      ensure(
        command.reason.trim().length >= 5,
        "Ghi lý do xác nhận đối sánh ít nhất 5 ký tự.",
      );
      s.mappings = s.mappings.filter((m) => m.skuId !== command.skuId);
      s.mappings.push({
        skuId: command.skuId,
        productId: p.id,
        confirmedBy: actorId,
        reason: command.reason,
      });
      entityId = sku.id;
      module = "Mua sắm";
      break;
    }
    case "purchase.create": {
      permit(["buyer", "admin", "coordinator"]);
      ensure(command.lines.length > 0, "Thêm ít nhất một dòng mua.");
      for (const l of command.lines) {
        positive(l.quantity);
        ensure(
          s.skus.some((x) => x.id === l.skuId),
          "Mã hàng không tồn tại.",
        );
        if (l.sourceRequestId) getUniform(l.sourceRequestId);
      }
      const supplier =
        s.supplierProducts.find((p) => p.id === command.lines[0].productId)
          ?.supplier || "";
      const pid = id("PR");
      s.purchases.push({
        id: pid,
        requesterId: actorId,
        supplier,
        date: now,
        status: "draft",
        lines: command.lines,
        decisions: [],
        stages: [],
        reserveLimit: reserveCap(s),
        headcount: s.employees.filter((e) => e.active).length,
        note: command.note,
        context: command.context || defaultPurchaseContext(s, a),
      });
      entityId = pid;
      module = "Mua sắm";
      break;
    }
    case "purchase.edit": {
      permit(["buyer"]);
      const p = s.purchases.find((p) => p.id === command.id);
      ensure(
        p && ["draft", "rejected"].includes(p.status),
        "Chỉ sửa đề nghị nháp hoặc bị từ chối.",
      );
      p.lines = command.lines;
      p.note = command.note;
      if (command.context) p.context = command.context;
      p.status = "draft";
      p.decisions = [];
      entityId = p.id;
      module = "Mua sắm";
      break;
    }
    case "purchase.submit": {
      permit(["buyer"]);
      const p = s.purchases.find((p) => p.id === command.id);
      ensure(
        p && ["draft", "rejected"].includes(p.status),
        "Chỉ gửi bản nháp hoặc đề nghị bị từ chối.",
      );
      ensure(p.lines.length, "Đề nghị phải có dòng mua.");
      const cap = reserveCap(s);
      ensure(
        p.lines
          .filter((l) => l.purpose === "reserve")
          .reduce((n, l) => n + l.quantity, 0) <= cap,
        `Mua dự trữ vượt giới hạn ${cap} bộ = floor(${s.employees.filter((e) => e.active).length} × ${s.settings.reserveRatio * 100}% × ${s.settings.reserveSets}).`,
      );
      const sums = new Map<string, number>();
      const sources = shortageRows(s);
      for (const l of p.lines) {
        positive(l.quantity);
        const product = s.supplierProducts.find((x) => x.id === l.productId);
        ensure(product, "Chọn mã nhà cung cấp.");
        ensure(
          s.mappings.some(
            (m) => m.skuId === l.skuId && m.productId === l.productId,
          ),
          "Mã nhà cung cấp chưa được người mua xác nhận.",
        );
        ensure(
          product.category === s.skus.find((x) => x.id === l.skuId)?.category &&
            normalizeSize(product.size) ===
              normalizeSize(s.skus.find((x) => x.id === l.skuId)?.size || "") &&
            product.gender === s.skus.find((x) => x.id === l.skuId)?.gender,
          "Mã NCC khác loại/cỡ/giới tính.",
        );
        if (l.purpose === "shortage") {
          const key = l.sourceRequestId + l.skuId;
          sums.set(key, (sums.get(key) || 0) + l.quantity);
          ensure(
            sums.get(key)! <=
              sources
                .filter(
                  (x) =>
                    x.requestId === l.sourceRequestId && x.skuId === l.skuId,
                )
                .reduce((n, x) => n + x.quantity, 0),
            "Lượng mua bổ sung vượt phần thiếu chưa cam kết. Yêu cầu có thể đã được mua hoặc hủy.",
          );
        } else ensure(!l.sourceRequestId, "Dòng dự trữ không gắn nguồn thiếu.");
        l.price = product.price;
      }
      const suppliers = new Set(
        p.lines.map(
          (l) => s.supplierProducts.find((x) => x.id === l.productId)!.supplier,
        ),
      );
      ensure(suppliers.size === 1, "Một đề nghị chỉ dùng một nhà cung cấp.");
      p.supplier = [...suppliers][0];
      p.reserveLimit = cap;
      p.headcount = s.employees.filter((e) => e.active).length;
      p.status = "pending";
      p.stages = [...s.settings.purchaseStages];
      p.decisions = [];
      p.requesterId = actorId;
      entityId = p.id;
      module = "Mua sắm";
      break;
    }
    case "purchase.cancel": {
      permit(["buyer", "admin"]);
      const p = s.purchases.find((p) => p.id === command.id);
      ensure(
        p && !["ordered", "cancelled"].includes(p.status),
        "Không thể hủy đề nghị đã tạo PO hoặc đã hủy.",
      );
      p.status = "cancelled";
      entityId = p.id;
      module = "Mua sắm";
      break;
    }
    case "purchase.order": {
      permit(["buyer"]);
      const p = s.purchases.find((p) => p.id === command.id);
      ensure(
        p?.status === "approved" && p.decisions.length === p.stages.length,
        "Cần hoàn thành đầy đủ các bước duyệt trước tạo PO.",
      );
      const currentShortages = shortageRows({
        ...s,
        purchases: s.purchases.filter((x) => x.id !== p.id),
      });
      for (const l of p.lines.filter((l) => l.purpose === "shortage"))
        ensure(
          currentShortages.some(
            (n) =>
              n.requestId === l.sourceRequestId &&
              n.skuId === l.skuId &&
              n.quantity >=
                p.lines
                  .filter(
                    (x) =>
                      x.sourceRequestId === l.sourceRequestId &&
                      x.skuId === l.skuId,
                  )
                  .reduce((sum, x) => sum + x.quantity, 0),
          ),
          "Nhu cầu thiếu đã thay đổi hoặc bị hủy. Hủy đề nghị và lập lại theo nhu cầu hiện tại trước tạo PO.",
        );
      const ref = MockSapAdapter.createOrderReference(s, operationId);
      const lines: State["orders"][number]["lines"] = [];
      for (const l of p.lines) {
        const prior = lines.find((x) => x.skuId === l.skuId);
        if (prior) prior.quantity += l.quantity;
        else
          lines.push({
            skuId: l.skuId,
            quantity: l.quantity,
            received: 0,
            price: l.price,
          });
      }
      s.orders.push({
        id: ref,
        purchaseId: p.id,
        supplier: p.supplier,
        date: now,
        status: "created",
        lines,
        operationId,
        context: structuredClone(p.context),
      });
      p.status = "ordered";
      entityId = ref;
      module = "Mua sắm";
      break;
    }
    case "receipt": {
      permit(["warehouse"]);
      const o = s.orders.find((o) => o.id === command.id);
      ensure(
        o && o.status !== "received",
        "Đơn hàng không tồn tại hoặc đã nhận đủ.",
      );
      let total = 0;
      const lines: State["receipts"][number]["lines"] = [];
      for (const [skuId, q] of Object.entries(command.quantities)) {
        ensure(
          Number.isSafeInteger(q) && q >= 0,
          "Số nhận phải là số nguyên không âm.",
        );
        if (!q) continue;
        const l = o.lines.find((l) => l.skuId === skuId);
        ensure(
          l && q <= l.quantity - l.received,
          "Số nhận vượt lượng còn lại trên PO.",
        );
        total += q;
        l.received += q;
        const lid = id("LOT");
        s.lots.push({
          id: lid,
          skuId,
          price: l.price,
          date: now,
          warehouse: "TT",
        });
        lines.push({ skuId, quantity: q, lotId: lid });
      }
      ensure(total > 0, "Nhập ít nhất một số lượng nhận lớn hơn 0.");
      const rid = id("PNK");
      s.receipts.push({ id: rid, orderId: o.id, date: now, actorId, lines });
      for (const l of lines)
        s.movements.push({
          id: id("MOV"),
          lotId: l.lotId,
          quantity: l.quantity,
          date: now,
          reason: "Nhận hàng PO mô phỏng " + o.id,
          source: rid,
        });
      o.status = o.lines.every((l) => l.quantity === l.received)
        ? "received"
        : "partial";
      entityId = rid;
      module = "Kho";
      break;
    }
    case "document.create": {
      permit(["documents"]);
      ensure(command.document.title.trim(), "Nhập tiêu đề tài liệu.");
      ensure(
        command.document.sections.some((x) => x.text.trim()),
        "Nội dung tài liệu là bắt buộc.",
      );
      ensure(
        command.document.expires >= now,
        "Ngày hết hạn không được trước ngày demo.",
      );
      const did = id("TL");
      s.documents.push({
        ...command.document,
        id: did,
        departmentId: a.departmentId,
        owner: a.name + " • demo",
        version: 1,
        date: now,
        status: "draft",
        original: [
          command.document.title,
          ...command.document.sections.map((x) => x.title + "\n" + x.text),
        ].join("\n\n"),
        reviewedBy: "",
        history: [{ version: 1, date: now, action: "Nhập bản nháp" }],
        signatures: [],
      });
      entityId = did;
      module = "Tài liệu";
      break;
    }
    case "document.update": {
      permit(["documents"]);
      const d = s.documents.find((d) => d.id === command.id);
      ensure(
        d && !["revoked", "superseded"].includes(d.status),
        "Không sửa tài liệu đã thu hồi hoặc đã thay thế.",
      );
      ensure(
        command.title.trim() && command.text.trim(),
        "Tiêu đề và nội dung là bắt buộc.",
      );
      ensure(command.expires >= now, "Ngày hết hạn không hợp lệ.");
      const titleChanged = d.title !== command.title;
      d.title = command.title;
      d.readRoles = command.readRoles;
      d.signRoles = command.signRoles;
      d.expires = command.expires;
      const old = d.sections.map((sec) => sec.text).join("\n\n");
      if (old !== command.text || titleChanged) {
        ensure(
          d.status !== "published",
          "Tạo phiên bản mới trước khi sửa nội dung đã xuất bản.",
        );
        d.sections = [
          { id: "muc-1", title: "1. Nội dung", text: command.text },
        ];
        d.original = command.title + "\n\n" + command.text;
        d.reviewedBy = "";
        d.status = "draft";
      }
      d.history.push({
        version: d.version,
        date: now,
        action: "Cập nhật nội dung hoặc quyền truy cập",
      });
      entityId = d.id;
      module = "Tài liệu";
      break;
    }
    case "document.sign": {
      documentFor(s, a, command.id);
      const d = s.documents.find((d) => d.id === command.id)!;
      ensure(
        d.signRoles.includes(a.role),
        "Bạn không có quyền ký xác nhận tài liệu này.",
      );
      ensure(
        !d.signatures.some(
          (x) => x.accountId === actorId && x.version === d.version,
        ),
        "Bạn đã xác nhận phiên bản này.",
      );
      d.signatures.push({ accountId: actorId, version: d.version, date: now });
      entityId = d.id;
      module = "Tài liệu";
      break;
    }
    case "document.mask":
    case "document.review":
    case "document.publish":
    case "document.revoke":
    case "document.version": {
      permit(["documents"]);
      const d = s.documents.find((d) => d.id === command.id);
      ensure(d, "Không có tài liệu.");
      if (command.type === "document.mask") {
        ensure(d.status === "draft", "Chỉ che trên bản nháp.");
        d.title = maskPii(d.title);
        d.sections = d.sections.map((sec) => ({
          ...sec,
          title: maskPii(sec.title),
          text: maskPii(sec.text),
        }));
        d.reviewedBy = "";
      }
      if (command.type === "document.review") {
        ensure(
          d.status === "draft",
          "Tài liệu không ở trạng thái chờ rà soát.",
        );
        ensure(
          !documentHasPii(d),
          "Còn thông tin liên hệ tổng hợp chưa che. Che dữ liệu trước khi rà soát.",
        );
        d.status = "reviewed";
        d.reviewedBy = actorId;
      }
      if (command.type === "document.publish") {
        ensure(
          d.status === "reviewed" && d.reviewedBy,
          "Cần hoàn tất rà soát trước xuất bản.",
        );
        ensure(
          d.expires >= now && d.readRoles.length > 0,
          "Chọn quyền đọc và ngày hiệu lực hợp lệ.",
        );
        ensure(
          !documentHasPii(d),
          "Còn thông tin tổng hợp chưa che trong tiêu đề hoặc nội dung.",
        );
        for (const old of s.documents.filter(
          (old) => old.id.startsWith(d.id + "-v") && old.status === "published",
        ))
          old.status = "superseded";
        d.status = "published";
        d.date = now;
      }
      if (command.type === "document.revoke") {
        ensure(d.status === "published", "Chỉ thu hồi tài liệu đang hiệu lực.");
        d.status = "revoked";
      }
      if (command.type === "document.version") {
        ensure(
          d.status === "published",
          "Chỉ tạo phiên bản mới từ bản đã xuất bản.",
        );
        const old = structuredClone(d);
        old.id = d.id + "-v" + d.version;
        s.documents.push(old);
        d.version++;
        d.status = "draft";
        d.reviewedBy = "";
        d.original = d.sections.map((x) => x.text).join("\n\n");
      }
      const historyLabels = {
        "document.mask": "Che thông tin cá nhân",
        "document.review": "Xác nhận rà soát",
        "document.publish": "Xuất bản và lập chỉ mục",
        "document.revoke": "Thu hồi tài liệu",
        "document.version": "Chuẩn bị phiên bản mới",
      };
      d.history.push({
        version: d.version,
        date: now,
        action: historyLabels[command.type],
      });
      entityId = d.id;
      module = "Tài liệu";
      break;
    }
    case "locker.save": {
      permit(["admin"]);
      const locationKey = (value: string) =>
        normalize(value.trim().replace(/\s+/g, " "));
      const numberKey = (value: string) =>
        /^\d+$/.test(value.trim())
          ? value.trim().replace(/^0+(?=\d)/, "")
          : locationKey(value);
      ensure(
        command.number.trim() &&
          command.building.trim() &&
          command.floor.trim() &&
          command.area.trim(),
        "Nhập đủ số tủ, tòa nhà, tầng và khu.",
      );
      ensure(
        s.departments.some((d) => d.id === command.departmentId),
        "Chọn khoa sở hữu.",
      );
      ensure(
        !s.lockers.some(
          (l) =>
            l.id !== command.id &&
            numberKey(l.number) === numberKey(command.number) &&
            locationKey(l.area) === locationKey(command.area) &&
            locationKey(l.floor) === locationKey(command.floor) &&
            locationKey(l.building) === locationKey(command.building),
        ),
        "Vị trí và số tủ đã tồn tại.",
      );
      const old = s.lockers.find((l) => l.id === command.id);
      ensure(
        !old ||
          command.active ||
          (!old.employeeId && !old.assignedDepartmentId && !old.reservedFor),
        "Cần trả/thu hồi tủ trước khi ngừng sử dụng.",
      );
      const lid = command.id || id("TU");
      const item: Locker = {
        id: lid,
        number: command.number.trim(),
        building: command.building.trim().replace(/\s+/g, " "),
        floor: command.floor.trim(),
        area: command.area.trim().replace(/\s+/g, " "),
        departmentId: command.departmentId,
        condition: command.condition,
        active: command.active,
        employeeId: old?.employeeId || "",
        assignedDepartmentId: old?.assignedDepartmentId || "",
        reservedFor: old?.reservedFor || "",
      };
      if (old) s.lockers[s.lockers.indexOf(old)] = item;
      else s.lockers.push(item);
      entityId = lid;
      module = "Tủ đồ";
      break;
    }
    case "locker.allocate": {
      permit(["admin"]);
      if (command.departmentId)
        ensure(
          s.departments.some((d) => d.id === command.departmentId),
          "Đơn vị nhận tủ không tồn tại.",
        );
      ensure(
        command.ids.length > 0 &&
          new Set(command.ids).size === command.ids.length,
        "Chọn danh sách tủ không trùng.",
      );
      ensure(
        command.reason.trim().length >= 5,
        "Ghi lý do phân bổ hoặc giữ chỗ.",
      );
      ensure(
        command.departmentId ||
          command.employeeIds.length === command.ids.length,
        "Số nhân viên phải bằng số tủ được giao.",
      );
      ensure(
        !(command.departmentId && command.employeeIds.length),
        "Chọn giao đơn vị hoặc nhân viên, không đồng thời.",
      );
      ensure(
        new Set(command.employeeIds).size === command.employeeIds.length,
        "Không giao hai tủ cho cùng người.",
      );
      for (const eid of command.employeeIds) {
        ensure(
          s.employees.some((e) => e.id === eid && e.active),
          "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
        );
        ensure(
          !s.lockers.some((l) => l.employeeId === eid || l.reservedFor === eid),
          "Nhân viên đã có tủ hoặc đã có giữ chỗ.",
        );
      }
      for (const [i, lid] of command.ids.entries()) {
        const l = s.lockers.find((l) => l.id === lid);
        ensure(
          l && availableLockers(s).some((x) => x.id === lid),
          "Tủ đã được cấp, giữ chỗ hoặc đang bảo trì.",
        );
        const to = command.departmentId || command.employeeIds[i];
        if (command.reserve) l.reservedFor = to;
        else if (command.departmentId) l.assignedDepartmentId = to;
        else l.employeeId = to;
        s.lockerEvents.push({
          id: id("LE"),
          lockerId: lid,
          date: now,
          actorId,
          action: command.reserve ? "Giữ chỗ" : "Phân bổ",
          from: "",
          to,
          reason: command.reason,
        });
      }
      entityId = command.ids.join(", ");
      module = "Tủ đồ";
      break;
    }
    case "locker.release":
    case "locker.transfer": {
      permit(["admin"]);
      const l = s.lockers.find((l) => l.id === command.id);
      ensure(
        l && (l.employeeId || l.reservedFor || l.assignedDepartmentId),
        "Tủ chưa có người/đơn vị hoặc giữ chỗ để xử lý.",
      );
      ensure(command.reason.trim().length >= 5, "Nhập lý do ít nhất 5 ký tự.");
      const from = l.employeeId || l.assignedDepartmentId || l.reservedFor;
      let to = "";
      if (command.type === "locker.transfer") {
        ensure(
          l.active && l.condition === "good",
          "Tủ bảo trì không được chuyển giao.",
        );
        const e = s.employees.find((e) => e.id === command.employeeId);
        ensure(e?.active, "Chọn người nhận đang hoạt động.");
        ensure(
          !s.lockers.some(
            (x) =>
              x.id !== l.id &&
              (x.employeeId === e.id || x.reservedFor === e.id),
          ),
          "Người nhận đã có tủ hoặc giữ chỗ.",
        );
        to = e.id;
      }
      l.employeeId = to;
      l.assignedDepartmentId = "";
      l.reservedFor = "";
      s.lockerEvents.push({
        id: id("LE"),
        lockerId: l.id,
        date: now,
        actorId,
        action:
          command.type === "locker.transfer"
            ? "Chuyển giao / nhận giữ chỗ"
            : "Trả / thu hồi",
        from,
        to,
        reason: command.reason,
      });
      entityId = l.id;
      module = "Tủ đồ";
      break;
    }
    case "settings": {
      permit(["sysadmin"]);
      positive(command.settings.annualLimit);
      positive(command.settings.reserveSets);
      ensure(
        command.settings.reserveRatio >= 0 &&
          command.settings.reserveRatio <= 1,
        "Tỷ lệ dự trữ phải từ 0 đến 100%.",
      );
      for (const stages of [
        command.settings.uniformStages,
        command.settings.purchaseStages,
      ])
        ensure(
          stages.length >= 2 &&
            new Set(stages).size === stages.length &&
            stages.every((role) => s.accounts.some((x) => x.role === role)),
          "Luồng cần ít nhất 2 vai trò độc lập có tài khoản demo.",
        );
      ensure(
        /^\d{4}-\d{2}-\d{2}$/.test(command.settings.date),
        "Ngày demo không hợp lệ.",
      );
      s.settings = command.settings;
      entityId = "DEMO-SETTINGS";
      break;
    }
    case "employee.save": {
      permit(["sysadmin"]);
      const e = s.employees.find((e) => e.id === command.id);
      ensure(
        e && s.departments.some((d) => d.id === command.departmentId),
        "Nhân viên hoặc khoa không tồn tại.",
      );
      ensure(
        command.active || e.id !== a.employeeId,
        "Không thể ngừng nhân viên gắn tài khoản đang sử dụng.",
      );
      e.departmentId = command.departmentId;
      e.job = command.job;
      if ("gender" in command && command.gender)
        e.gender = command.gender as EmployeeGender;
      e.active = command.active;
      for (const ac of s.accounts.filter((x) => x.employeeId === e.id))
        ac.departmentId = e.departmentId;
      entityId = e.id;
      module = "Nhân viên";
      break;
    }
    case "notifications.read": {
      s.readNotifications[actorId] = [
        ...new Set([...(s.readNotifications[actorId] || []), ...command.ids]),
      ];
      return {
        ...s,
        revision: s.revision + 1,
        operations: [...s.operations, operationId],
      };
    }
  }
  s.audits.unshift({
    id: id("AUD"),
    actorId,
    date: now,
    module,
    entityId,
    action: command.type,
    detail:
      detail ||
      ("reason" in command
        ? String(command.reason || "")
        : "Thao tác có xác nhận trong bản mẫu"),
    before: auditSnapshot(input, entityId),
    after: auditSnapshot(s, entityId),
  });
  s.operations.push(operationId);
  s.revision++;
  assertState(s);
  return s;
}
function auditSnapshot(
  s: State,
  id: string,
): Record<string, string | number | boolean> {
  const uniform = s.uniforms.find((x) => x.id === id);
  if (uniform)
    return {
      status: uniform.status,
      quantity: uniform.lines.reduce((n, l) => n + l.quantity, 0),
      decisions: uniform.decisions.length,
      held:
        uniform.status === "reserved"
          ? uniform.reservations.reduce((n, l) => n + l.quantity, 0)
          : 0,
      exception: !!uniform.exceptionReason,
    };
  const purchase = s.purchases.find((x) => x.id === id);
  if (purchase)
    return {
      status: purchase.status,
      quantity: purchase.lines.reduce((n, l) => n + l.quantity, 0),
      decisions: purchase.decisions.length,
      supplier: purchase.supplier,
      budgetName: purchase.context.budgetName,
      budgetCode: purchase.context.budgetCode,
      budgetDepartmentId: purchase.context.budgetDepartmentId,
      purchaseMonth: purchase.context.purchaseMonth,
    };
  const doc = s.documents.find((x) => x.id === id);
  if (doc)
    return {
      status: doc.status,
      version: doc.version,
      readRoles: doc.readRoles.map((r) => roleLabels[r]).join(", "),
      signatures: doc.signatures.length,
    };
  const locker = s.lockers.find((x) => x.id === id);
  if (locker)
    return {
      condition: locker.condition,
      active: locker.active,
      employee: locker.employeeId,
      department: locker.assignedDepartmentId,
      reserved: locker.reservedFor,
    };
  const sku = s.skus.find((x) => x.id === id);
  if (sku)
    return {
      price: sku.price,
      active: sku.active,
      available: stock(s, sku.id).available,
    };
  const lot = s.lots.find((x) => x.id === id);
  if (lot)
    return {
      sku: lot.skuId,
      price: lot.price,
      physical: lotPhysical(s, id),
      held: lotHeld(s, id),
    };
  const order = s.orders.find((x) => x.id === id);
  if (order)
    return {
      status: order.status,
      received: order.lines.reduce((n, l) => n + l.received, 0),
      quantity: order.lines.reduce((n, l) => n + l.quantity, 0),
    };
  if (id === "DEMO-SETTINGS")
    return {
      annualLimit: s.settings.annualLimit,
      reserveRatio: s.settings.reserveRatio,
      date: s.settings.date,
      sapFailure: s.settings.sapFailure,
    };
  return { revision: s.revision };
}
export const maskPii = (text: string) =>
  text
    .replace(/\b0\d{9}\b/g, "[ĐÃ CHE SĐT]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]+/g, "[ĐÃ CHE EMAIL]")
    .replace(/Nhân viên demo \d+/g, "[ĐÃ CHE TÊN]");
export const hasPii = (text: string) =>
  /\b0\d{9}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]+|Nhân viên demo \d+/.test(text);
export const documentHasPii = (d: DemoDocument) =>
  hasPii(d.title) ||
  d.sections.some((sec) => hasPii(sec.title) || hasPii(sec.text));
export function assertState(s: State) {
  ensure(
    !Object.hasOwn(s, "readModel"),
    "DTO chỉ đọc không phải dữ liệu chuẩn.",
  );
  ensure(
    stateSchema.safeParse(s).success,
    "Dữ liệu lưu trữ không hợp lệ: trường, kiểu dữ liệu, ngày hoặc trạng thái không đúng.",
  );
  ensure(
    new Set(s.accounts.map((a) => a.employeeId)).size === s.accounts.length,
    "Mỗi nhân viên chỉ có một tài khoản demo.",
  );
  ensure(
    s.accounts.some((a) =>
      s.employees.some((e) => e.id === a.employeeId && e.active),
    ),
    "Cần ít nhất một tài khoản đang hoạt động.",
  );
  ensure(
    s &&
      s.schemaVersion === 2 &&
      Number.isSafeInteger(s.revision) &&
      Number.isSafeInteger(s.sequence),
    "Dữ liệu lưu trữ không đúng phiên bản hoặc cấu trúc.",
  );
  for (const key of [
    "departments",
    "employees",
    "accounts",
    "skus",
    "lots",
    "movements",
    "uniforms",
    "issuances",
    "supplierProducts",
    "mappings",
    "purchases",
    "orders",
    "receipts",
    "documents",
    "lockers",
    "lockerEvents",
    "audits",
    "operations",
  ] as const)
    ensure(Array.isArray(s[key]), "Dữ liệu lưu trữ thiếu bảng " + key);
  positive(s.settings.annualLimit);
  ensure(
    typeof s.settings.date === "string" && s.readNotifications,
    "Cấu hình lưu trữ không hợp lệ.",
  );
  for (const lot of s.lots)
    ensure(
      s.skus.some((x) => x.id === lot.skuId) &&
        lotPhysical(s, lot.id) >= 0 &&
        lotPhysical(s, lot.id) >= lotHeld(s, lot.id),
      "Tồn kho không hợp lệ hoặc âm sau thao tác.",
    );
  const assigned = new Set<string>();
  for (const l of s.lockers) {
    if (l.employeeId) {
      ensure(!assigned.has(l.employeeId), "Nhân viên bị giao nhiều tủ.");
      assigned.add(l.employeeId);
    }
  }
  for (const o of s.orders)
    for (const l of o.lines)
      ensure(
        l.received >= 0 && l.received <= l.quantity,
        "Lượng nhận không hợp lệ.",
      );
  for (const p of [...s.purchases, ...s.orders])
    ensure(
      !p.context.budgetDepartmentId ||
        s.departments.some((d) => d.id === p.context.budgetDepartmentId),
      "Khoa/phòng ngân sách không tồn tại.",
    );
  for (const e of s.employees)
    ensure(
      s.departments.some((d) => d.id === e.departmentId),
      "Nhân viên tham chiếu khoa không tồn tại.",
    );
  for (const u of s.uniforms) {
    ensure(
      s.accounts.some((a) => a.id === u.requesterId),
      "Người gửi không tồn tại.",
    );
    for (const l of u.lines)
      ensure(
        s.employees.some((e) => e.id === l.employeeId) &&
          s.skus.some((x) => x.id === l.skuId),
        "Dòng cấp có tham chiếu không hợp lệ.",
      );
  }
  for (const i of s.issuances)
    ensure(
      i.returned <= i.quantity &&
        s.lots.some((l) => l.id === i.lotId) &&
        s.employees.some((e) => e.id === i.employeeId),
      "Lịch sử cấp phát không hợp lệ.",
    );
  for (const m of s.movements)
    ensure(
      s.lots.some((l) => l.id === m.lotId),
      "Biến động tham chiếu lô không tồn tại.",
    );
}
