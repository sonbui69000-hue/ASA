import type {
  ReadState as State,
  Account,
  Role,
  UniformRequest,
  DemoDocument,
  Locker,
  LockerEvent,
  Purchase,
} from "./types";
import { normalize } from "./types";
import { matchesProductQuery } from "./product-search";
import { normalizeSize } from "./uniform-attributes";
export const account = (s: State, id: string) => {
  const a = s.accounts.find((a) => a.id === id);
  if (!a || !s.employees.some((e) => e.id === a.employeeId && e.active))
    throw Error(
      "Tài khoản demo không tồn tại hoặc nhân viên đã ngừng hoạt động.",
    );
  return a;
};
export const isWide = (a: Account) =>
  !["employee", "coordinator", "head"].includes(a.role);
export const canDepartment = (a: Account, departmentId: string) =>
  isWide(a) || a.departmentId === departmentId;
export const canRequest = (a: Account, r: UniformRequest) =>
  a.role === "employee"
    ? r.lines.some((l) => l.employeeId === a.employeeId)
    : canDepartment(a, r.departmentId);
export const employeesFor = (s: State, a: Account) =>
  s.employees.filter((e) =>
    a.role === "employee"
      ? e.id === a.employeeId
      : canDepartment(a, e.departmentId),
  );
export function canReadLocker(s: State, a: Account, l: Locker) {
  if (isWide(a)) return true;
  const target = l.employeeId || l.assignedDepartmentId || l.reservedFor;
  if (!target) return true;
  return (
    employeesFor(s, a).some((e) => e.id === target) ||
    (a.role !== "employee" && target === a.departmentId)
  );
}
export function lockerEventsFor(s: State, a: Account): LockerEvent[] {
  if (isWide(a)) return s.lockerEvents;
  const visible = new Set(employeesFor(s, a).map((e) => e.id));
  if (a.role !== "employee") visible.add(a.departmentId);
  // Historical identities keep their own scope even when the locker becomes free.
  return s.lockerEvents.filter(
    (e) =>
      [e.from, e.to].some((id) => visible.has(id)) &&
      [e.from, e.to].every((id) => !id || visible.has(id)),
  );
}
export const requestsFor = (s: State, a: Account) =>
  s.uniforms.filter((r) => canRequest(a, r));
export const purchasesFor = (s: State, a: Account) =>
  s.purchases.filter(
    (p) =>
      isWide(a) ||
      p.requesterId === a.id ||
      p.lines.some((l) =>
        s.uniforms.some((r) => r.id === l.sourceRequestId && canRequest(a, r)),
      ),
  );
export const auditsFor = (s: State, a: Account) => {
  const ids = new Set([
    ...requestsFor(s, a).map((r) => r.id),
    ...purchasesFor(s, a).map((p) => p.id),
  ]);
  return s.audits.filter(
    (e) =>
      isWide(a) ||
      e.actorId === a.id ||
      ids.has(e.entityId) ||
      e.actorId === "system",
  );
};
export const lotPhysical = (s: State, lotId: string) =>
  s.movements
    .filter((m) => m.lotId === lotId)
    .reduce((n, m) => n + m.quantity, 0);
export const lotHeld = (s: State, lotId: string) =>
  s.uniforms
    .filter((r) => r.status === "reserved")
    .flatMap((r) => r.reservations)
    .filter((r) => r.lotId === lotId)
    .reduce((n, r) => n + r.quantity, 0);
export function stock(s: State, skuId: string, warehouse = "TT") {
  if (s.readModel)
    return (
      s.readModel.stocks[skuId + "|" + warehouse] || {
        physical: 0,
        held: 0,
        available: 0,
      }
    );
  const lots = s.lots.filter(
    (l) => l.skuId === skuId && l.warehouse === warehouse,
  );
  const physical = lots.reduce((n, l) => n + lotPhysical(s, l.id), 0);
  const held = lots.reduce((n, l) => n + lotHeld(s, l.id), 0);
  return { physical, held, available: physical - held };
}
export const issued = (
  s: State,
  employeeId: string,
  year = Number(s.settings.date.slice(0, 4)),
) =>
  s.readModel
    ? s.readModel.quota[employeeId + "|" + year]?.issued || 0
    : s.issuances
        .filter(
          (i) => i.employeeId === employeeId && i.date.startsWith(String(year)),
        )
        .reduce((n, i) => n + i.quantity, 0);
export const committed = (
  s: State,
  employeeId: string,
  year = Number(s.settings.date.slice(0, 4)),
  exclude = "",
) =>
  s.readModel
    ? (s.readModel.quota[employeeId + "|" + year]?.committed || 0) -
      (exclude
        ? s.uniforms
            .filter(
              (r) =>
                r.id === exclude &&
                r.year === year &&
                ["pending", "reserved", "waiting_stock"].includes(r.status),
            )
            .flatMap((r) => r.lines)
            .filter((l) => l.employeeId === employeeId)
            .reduce((n, l) => n + l.quantity, 0)
        : 0)
    : s.uniforms
        .filter(
          (r) =>
            r.id !== exclude &&
            r.year === year &&
            ["pending", "reserved", "waiting_stock"].includes(r.status),
        )
        .flatMap((r) => r.lines)
        .filter((l) => l.employeeId === employeeId)
        .reduce((n, l) => n + l.quantity, 0);
export const reserveCap = (s: State) =>
  s.readModel
    ? s.readModel.reserveCap
    : Math.floor(
        s.employees.filter((e) => e.active).length *
          s.settings.reserveRatio *
          s.settings.reserveSets,
      );
export const stagesDone = (r: UniformRequest | Purchase) =>
  r.decisions.filter((d) => d.approved).length;
export function canApprove(a: Account, r: UniformRequest | Purchase, s: State) {
  if (s.readModel) return s.readModel.approvals[r.id] === true;
  return (
    r.status === "pending" &&
    r.stages[stagesDone(r)] === a.role &&
    a.id !== r.requesterId &&
    s.accounts.find((x) => x.id === r.requesterId)?.employeeId !==
      a.employeeId &&
    !r.decisions.some(
      (d) =>
        d.actorId === a.id ||
        s.accounts.find((x) => x.id === d.actorId)?.employeeId === a.employeeId,
    ) &&
    (!("departmentId" in r) || canDepartment(a, r.departmentId))
  );
}
export const nextRole = (r: UniformRequest | Purchase): Role | undefined =>
  r.stages[stagesDone(r)];
export const lockerStatus = (l: Locker) =>
  !l.active || l.condition === "maintenance"
    ? "maintenance"
    : l.employeeId || l.assignedDepartmentId
      ? "occupied"
      : l.reservedFor
        ? "held"
        : "available";
export const availableLockers = (s: State, area = "", departmentId = "") =>
  s.lockers
    .filter(
      (l) =>
        lockerStatus(l) === "available" &&
        (!area || l.area === area) &&
        (!departmentId || l.departmentId === departmentId),
    )
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area) ||
        Number(a.number) - Number(b.number) ||
        a.id.localeCompare(b.id),
    );
export const canReadDocument = (s: State, a: Account, d: DemoDocument) =>
  d.status === "published" &&
  d.date <= s.settings.date &&
  d.expires >= s.settings.date &&
  d.readRoles.includes(a.role);
export const documentFor = (s: State, a: Account, id: string) => {
  const d = s.documents.find((d) => d.id === id);
  if (!d || !canReadDocument(s, a, d))
    throw Error("Tài liệu không khả dụng hoặc bạn không có quyền truy cập.");
  return structuredClone({ ...d, original: "" });
};
export function searchDocuments(
  s: State,
  a: Account,
  query: string,
  category = "",
) {
  const q = normalize(query).trim().split(/\s+/).filter(Boolean);
  return s.documents
    .filter(
      (d) => canReadDocument(s, a, d) && (!category || d.category === category),
    )
    .map((d) => ({
      document: structuredClone({ ...d, original: "" }),
      matches: structuredClone(
        d.sections.filter((sec) =>
          q.every((t) =>
            normalize(d.title + " " + sec.title + " " + sec.text).includes(t),
          ),
        ),
      ),
    }))
    .filter((r) => !q.length || r.matches.length > 0);
}
export function shortlist(s: State, skuId: string, query = "") {
  const sku = s.skus.find((x) => x.id === skuId);
  if (!sku) return [];
  return s.supplierProducts
    .filter((p) => matchesProductQuery(p, query))
    .map((p) => {
      const reasons: string[] = [];
      let score = 0;
      if (p.category === sku.category) {
        score += 50;
        reasons.push("Đúng loại");
      }
      if (normalizeSize(p.size) === normalizeSize(sku.size)) {
        score += 30;
        reasons.push("Đúng cỡ");
      }
      if (p.material === "Cotton 65%") {
        score += 20;
        reasons.push("Đúng chất liệu mẫu");
      } else reasons.push("Khác chất liệu: cần xác nhận");
      if (p.gender !== sku.gender) {
        score = Math.min(score, 50);
        reasons.push("Khác giới tính biến thể: không xác nhận");
      } else if (sku.gender !== "unisex")
        reasons.push("Đúng giới tính biến thể");
      return { product: p, score, reasons };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.product.code.localeCompare(b.product.code),
    );
}
export const lastIssuedDate = (s: State, employeeId: string) =>
  s.readModel
    ? s.readModel.lastIssued[employeeId] || ""
    : s.issuances
        .filter((i) => i.employeeId === employeeId)
        .map((i) => i.date)
        .sort()
        .at(-1) || "";
export const linkedPurchases = (s: State, a: Account, requestId: string) =>
  purchasesFor(s, a)
    .filter((p) => p.lines.some((l) => l.sourceRequestId === requestId))
    .map((purchase) => ({
      purchase,
      orders: s.orders.filter((o) => o.purchaseId === purchase.id),
    }));
export function purchaseReport(
  s: State,
  a: Account,
  filters: { departmentId?: string; month?: string; budget?: string } = {},
) {
  return purchasesFor(s, a)
    .filter(
      (p) =>
        (!filters.departmentId ||
          p.context.budgetDepartmentId === filters.departmentId) &&
        (!filters.month || p.context.purchaseMonth === filters.month) &&
        (!filters.budget ||
          normalize(p.context.budgetCode + " " + p.context.budgetName).includes(
            normalize(filters.budget),
          )),
    )
    .map((p) => ({
      purchase: p,
      total: p.lines.reduce((n, l) => n + l.quantity * l.price, 0),
      quantity: p.lines.reduce((n, l) => n + l.quantity, 0),
      receivedValue: s.orders
        .filter((o) => o.purchaseId === p.id)
        .flatMap((o) => o.lines)
        .reduce((n, l) => n + l.received * l.price, 0),
    }));
}
export function shortageRows(s: State) {
  if (s.readModel) return s.readModel.shortage;
  const remaining = new Map(
    s.skus.map((sku) => [sku.id, stock(s, sku.id).available]),
  );
  return s.uniforms
    .filter((r) => ["waiting_stock", "pending"].includes(r.status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .flatMap((r) => {
      const grouped = new Map<string, number>();
      for (const l of r.lines)
        grouped.set(l.skuId, (grouped.get(l.skuId) || 0) + l.quantity);
      return [...grouped].map(([skuId, quantity]) => {
        const available = remaining.get(skuId) || 0,
          used = Math.min(available, quantity);
        remaining.set(skuId, available - used);
        let inPurchase = 0;
        for (const p of s.purchases.filter((p) =>
          ["pending", "approved", "ordered"].includes(p.status),
        )) {
          let received =
            p.status === "ordered"
              ? s.orders
                  .find((o) => o.purchaseId === p.id)
                  ?.lines.find((x) => x.skuId === skuId)?.received || 0
              : 0;
          for (const pl of p.lines.filter((pl) => pl.skuId === skuId)) {
            const applied = Math.min(received, pl.quantity);
            received -= applied;
            if (pl.sourceRequestId === r.id)
              inPurchase += pl.quantity - applied;
          }
        }
        return {
          requestId: r.id,
          departmentId: r.departmentId,
          skuId,
          quantity: Math.max(0, quantity - used - inPurchase),
        };
      });
    })
    .filter((l) => l.quantity > 0);
}
