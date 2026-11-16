import type { Account, State, StateRef, StateView } from "../src/domain/types";
import { canReadWorkbookData } from "../src/domain/workbook-data";
import {
  account,
  employeesFor,
  requestsFor,
  purchasesFor,
  isWide,
  canReadDocument,
  canReadLocker,
  lockerEventsFor,
  auditsFor,
  stock,
  issued,
  committed,
  shortageRows,
  reserveCap,
  lastIssuedDate,
  canApprove,
} from "../src/domain/selectors";
/** Read DTOs retain existing entity shapes; server aggregates replace calculations on partial rows. */
export function projectView(
  s: State,
  actorId: string,
  ref: StateRef,
  externalAiBlocked = !!s.workbookData,
): StateView {
  const a = account(s, actorId),
    wide = isWide(a),
    employees = employeesFor(s, a),
    employeeIds = new Set(employees.map((e) => e.id));
  const uniforms = requestsFor(s, a).map((r) => ({
    ...r,
    lines: r.lines.filter((l) => employeeIds.has(l.employeeId)),
    reservations: r.reservations.filter((l) => employeeIds.has(l.employeeId)),
    note: wide ? r.note : "",
    exceptionReason: wide ? r.exceptionReason : "",
    decisions: r.decisions.map((d) => ({
      ...d,
      reason:
        wide || r.lines.every((l) => employeeIds.has(l.employeeId))
          ? d.reason
          : "",
    })),
  }));
  const requestIds = new Set(uniforms.map((r) => r.id));
  const purchases = purchasesFor(s, a).flatMap((p) => {
    // A purchase for a group is not a grant to all beneficiaries or departments.
    const lines = p.lines.filter(
      (l) =>
        wide ||
        (requestIds.has(l.sourceRequestId) &&
          s.uniforms
            .find((r) => r.id === l.sourceRequestId)
            ?.lines.every((x) => employeeIds.has(x.employeeId))),
    );
    return wide || (lines.length > 0 && lines.length === p.lines.length)
      ? [
          {
            ...p,
            lines,
            decisions: p.decisions.map((d) => ({
              ...d,
              reason: wide || lines.length === p.lines.length ? d.reason : "",
            })),
            note: wide ? p.note : "",
            context: wide
              ? p.context
              : {
                  budgetName: "",
                  budgetCode: "",
                  budgetDepartmentId: "",
                  purchaseMonth: p.context.purchaseMonth,
                },
          },
        ]
      : [];
  });
  const purchaseIds = new Set(purchases.map((p) => p.id));
  const orders = s.orders
    .filter(
      (o) =>
        purchaseIds.has(o.purchaseId) &&
        (wide ||
          purchases.find((p) => p.id === o.purchaseId)!.lines.length ===
            s.purchases.find((p) => p.id === o.purchaseId)!.lines.length),
    )
    .map((o) => {
      const skus = new Set(
        purchases.find((p) => p.id === o.purchaseId)!.lines.map((l) => l.skuId),
      );
      return {
        ...o,
        lines: o.lines.filter((l) => wide || skus.has(l.skuId)),
        context: wide
          ? o.context
          : {
              budgetName: "",
              budgetCode: "",
              budgetDepartmentId: "",
              purchaseMonth: o.context.purchaseMonth,
            },
        operationId: "",
      };
    });
  const orderIds = new Set(orders.map((o) => o.id));
  const stocks: StateView["readModel"]["stocks"] = {};
  for (const sku of s.skus)
    for (const warehouse of ["TT", "NOI"])
      stocks[sku.id + "|" + warehouse] = stock(s, sku.id, warehouse);
  const quota: StateView["readModel"]["quota"] = {};
  const years = new Set([
    Number(s.settings.date.slice(0, 4)),
    ...s.issuances.map((i) => Number(i.date.slice(0, 4))),
    ...s.uniforms.map((r) => r.year),
  ]);
  for (const e of employees)
    for (const year of years)
      quota[e.id + "|" + year] = {
        issued: issued(s, e.id, year),
        committed: committed(s, e.id, year),
      };
  const approvals: Record<string, boolean> = {};
  for (const r of [...uniforms, ...purchases])
    approvals[r.id] = canApprove(a, r, s);
  const docs = s.documents
    .filter((d) => a.role === "documents" || canReadDocument(s, a, d))
    .map((d) => ({
      ...d,
      original: a.role === "documents" ? d.original : "",
      signatures: d.signatures.filter(
        (x) => a.role === "documents" || x.accountId === a.id,
      ),
    }));
  return {
    ...(s.workbookData && canReadWorkbookData(a.role)
      ? { workbookData: s.workbookData }
      : {}),
    schemaVersion: 2,
    revision: s.revision,
    sequence: s.sequence,
    departments: s.departments,
    employees,
    accounts: s.accounts.map((ac) =>
      ac.id === a.id || wide ? ac : { ...ac, employeeId: "", departmentId: "" },
    ),
    skus: s.skus,
    lots: wide ? s.lots : [],
    movements: wide ? s.movements : [],
    uniforms,
    issuances: s.issuances.filter(
      (i) =>
        employeeIds.has(i.employeeId) &&
        (wide || a.role === "employee" || i.departmentId === a.departmentId),
    ),
    supplierProducts: s.supplierProducts,
    mappings: s.mappings.map((m) => (wide ? m : { ...m, reason: "" })),
    purchases,
    orders,
    receipts: s.receipts
      .filter((r) => orderIds.has(r.orderId))
      .map((r) => ({
        ...r,
        lines: r.lines.filter(
          (l) =>
            wide ||
            orders
              .find((o) => o.id === r.orderId)!
              .lines.some((x) => x.skuId === l.skuId),
        ),
      })),
    documents: docs,
    lockers: s.lockers.filter((l) => canReadLocker(s, a, l)),
    lockerEvents: lockerEventsFor(s, a).map((e) => ({
      ...e,
      reason: wide ? e.reason : "",
    })),
    audits: auditsFor(s, a)
      .filter(
        (e) =>
          e.module !== "Tài liệu" ||
          a.role === "documents" ||
          s.documents.some(
            (d) => d.id === e.entityId && canReadDocument(s, a, d),
          ),
      )
      .filter(
        (e) =>
          wide ||
          e.actorId === a.id ||
          requestIds.has(e.entityId) ||
          purchaseIds.has(e.entityId) ||
          (e.actorId === "system" && e.module === "Hệ thống"),
      )
      .map((e) =>
        wide
          ? e
          : {
              id: e.id,
              date: e.date,
              actorId: e.actorId,
              module: e.module,
              entityId: e.entityId,
              action: e.action,
              detail: "Thao tác trong phạm vi được phép.",
            },
      ),
    readNotifications: { [a.id]: s.readNotifications[a.id] || [] },
    operations: [],
    settings: { ...s.settings },
    readModel: {
      externalAiBlocked,
      ref,
      principalId: a.id,
      stocks,
      quota,
      lastIssued: Object.fromEntries(
        employees.map((e) => [e.id, lastIssuedDate(s, e.id)]),
      ),
      shortage: shortageRows(s).filter(
        (r) => requestIds.has(r.requestId) && a.role !== "employee",
      ),
      reserveCap: reserveCap(s),
      headcount: s.employees.filter((e) => e.active).length,
      approvals,
    },
  };
}
export function publicAccounts(
  s: State,
): Pick<Account, "id" | "name" | "role">[] {
  return s.accounts
    .filter((a) => s.employees.some((e) => e.id === a.employeeId && e.active))
    .map(({ id, name, role }) => ({ id, name, role }));
}
