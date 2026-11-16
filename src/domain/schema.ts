import { z } from "zod";
import { workbookDataSchema } from "./workbook-data";
const text = z.string();
const number = z.number().int().safe();
const qty = number.nonnegative();
const yes = z.boolean();
const role = z.enum([
  "employee",
  "coordinator",
  "head",
  "admin",
  "warehouse",
  "buyer",
  "finance",
  "leader",
  "documents",
  "sysadmin",
]);
const job = z.enum(["doctor", "nurse", "technician", "office"]);
const productGender = z.enum(["male", "female", "unisex"]);
const purchaseContext = z.object({
  budgetName: text,
  budgetCode: text,
  budgetDepartmentId: text,
  purchaseMonth: text.refine(
    (v) => v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
    "Tháng mua không hợp lệ",
  ),
});
const date = text.refine(
  (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value,
  "Ngày không hợp lệ",
);
const line = z.object({
  employeeId: text,
  skuId: text,
  quantity: qty.positive(),
});
const decision = z.object({
  actorId: text,
  role,
  approved: yes,
  reason: text,
  date,
});
const reservation = z.object({
  lotId: text,
  skuId: text,
  quantity: qty.positive(),
  price: qty,
  employeeId: text,
});
const purchaseLine = z.object({
  skuId: text,
  quantity: qty.positive(),
  purpose: z.enum(["reserve", "shortage"]),
  sourceRequestId: text,
  productId: text,
  price: qty,
});
const auditValues = z.record(text, z.union([text, z.number(), yes]));
export const stateSchema = z.object({
  workbookData: workbookDataSchema.optional(),
  schemaVersion: z.literal(2),
  revision: qty,
  sequence: qty,
  departments: z.array(z.object({ id: text, name: text })),
  employees: z.array(
    z.object({
      id: text,
      name: text,
      departmentId: text,
      job,
      gender: z.enum(["male", "female", "unspecified"]),
      active: yes,
    }),
  ),
  accounts: z.array(
    z.object({
      id: text,
      name: text,
      employeeId: text,
      role,
      departmentId: text,
    }),
  ),
  skus: z.array(
    z.object({
      id: text,
      code: text,
      name: text,
      category: job,
      size: text,
      gender: productGender,
      price: qty,
      minStock: qty,
      active: yes,
    }),
  ),
  lots: z.array(
    z.object({ id: text, skuId: text, warehouse: text, price: qty, date }),
  ),
  movements: z.array(
    z.object({
      id: text,
      lotId: text,
      quantity: number,
      date,
      reason: text,
      source: text,
    }),
  ),
  uniforms: z.array(
    z.object({
      id: text,
      departmentId: text,
      warehouse: text,
      requesterId: text,
      date,
      year: number,
      limit: qty.positive(),
      status: z.enum([
        "draft",
        "waiting_stock",
        "pending",
        "reserved",
        "issued",
        "rejected",
        "cancelled",
      ]),
      lines: z.array(line),
      decisions: z.array(decision),
      stages: z.array(role),
      reservations: z.array(reservation),
      exceptionReason: text,
      note: text,
    }),
  ),
  issuances: z.array(
    z.object({
      id: text,
      requestId: text,
      employeeId: text,
      departmentId: text,
      skuId: text,
      lotId: text,
      quantity: qty.positive(),
      price: qty,
      date,
      returned: qty,
    }),
  ),
  supplierProducts: z.array(
    z.object({
      id: text,
      supplier: text,
      code: text,
      name: text,
      category: job,
      size: text,
      price: qty,
      material: text,
      gender: productGender,
    }),
  ),
  mappings: z.array(
    z.object({ skuId: text, productId: text, confirmedBy: text, reason: text }),
  ),
  purchases: z.array(
    z.object({
      id: text,
      requesterId: text,
      supplier: text,
      date,
      status: z.enum([
        "draft",
        "pending",
        "approved",
        "ordered",
        "rejected",
        "cancelled",
      ]),
      lines: z.array(purchaseLine),
      decisions: z.array(decision),
      stages: z.array(role),
      reserveLimit: qty,
      headcount: qty,
      note: text,
      context: purchaseContext,
    }),
  ),
  orders: z.array(
    z.object({
      id: text,
      purchaseId: text,
      supplier: text,
      date,
      status: z.enum(["created", "partial", "received"]),
      lines: z.array(
        z.object({
          skuId: text,
          quantity: qty.positive(),
          received: qty,
          price: qty,
        }),
      ),
      operationId: text,
      context: purchaseContext,
    }),
  ),
  receipts: z.array(
    z.object({
      id: text,
      orderId: text,
      date,
      actorId: text,
      lines: z.array(
        z.object({ skuId: text, quantity: qty.positive(), lotId: text }),
      ),
    }),
  ),
  documents: z.array(
    z.object({
      id: text,
      title: text,
      category: text,
      departmentId: text,
      owner: text,
      version: qty.positive(),
      date,
      expires: date,
      status: z.enum([
        "draft",
        "reviewed",
        "published",
        "revoked",
        "superseded",
      ]),
      readRoles: z.array(role),
      signRoles: z.array(role),
      sections: z.array(z.object({ id: text, title: text, text })),
      original: text,
      reviewedBy: text,
      history: z.array(
        z.object({ version: qty.positive(), date, action: text }),
      ),
      signatures: z.array(
        z.object({ accountId: text, version: qty.positive(), date }),
      ),
    }),
  ),
  lockers: z.array(
    z.object({
      id: text,
      number: text,
      building: text,
      floor: text,
      area: text,
      departmentId: text,
      condition: z.enum(["good", "maintenance"]),
      active: yes,
      employeeId: text,
      assignedDepartmentId: text,
      reservedFor: text,
    }),
  ),
  lockerEvents: z.array(
    z.object({
      id: text,
      lockerId: text,
      date,
      actorId: text,
      action: text,
      from: text,
      to: text,
      reason: text,
    }),
  ),
  audits: z.array(
    z.object({
      id: text,
      date,
      actorId: text,
      module: text,
      entityId: text,
      action: text,
      detail: text,
      before: auditValues.optional(),
      after: auditValues.optional(),
    }),
  ),
  readNotifications: z.record(text, z.array(text)),
  operations: z.array(text),
  settings: z.object({
    date,
    annualLimit: qty.positive(),
    reserveRatio: z.number().min(0).max(1),
    reserveSets: qty.positive(),
    sapFailure: yes,
    uniformStages: z.array(role).min(2),
    purchaseStages: z.array(role).min(2),
  }),
});
export const legacyStateSchema = stateSchema.extend({
  schemaVersion: z.literal(1),
  employees: z.array(
    stateSchema.shape.employees.element.omit({ gender: true }),
  ),
  skus: z.array(stateSchema.shape.skus.element.omit({ gender: true })),
  supplierProducts: z.array(
    stateSchema.shape.supplierProducts.element.omit({ gender: true }),
  ),
  purchases: z.array(
    stateSchema.shape.purchases.element.omit({ context: true }),
  ),
  orders: z.array(stateSchema.shape.orders.element.omit({ context: true })),
});
