import { z } from "zod";
import { stateSchema } from "../src/domain/schema";
import type { Command } from "../src/domain/commands";
const id = z.string().min(1).max(128);
const text = z.string().max(5000);
const reason = z.string().max(2000);
const qty = z.number().int().positive().max(10000);
const money = z.number().int().nonnegative().max(1e12);
const role = stateSchema.shape.accounts.element.shape.role;
const job = stateSchema.shape.employees.element.shape.job;
const gender = stateSchema.shape.skus.element.shape.gender;
const line = z.object({ employeeId: id, skuId: id, quantity: qty }).strict();
const purchaseLine = z
  .object({
    skuId: id,
    quantity: qty,
    purpose: z.enum(["reserve", "shortage"]),
    sourceRequestId: z.string().max(128),
    productId: z.string().max(128),
    price: money,
  })
  .strict();
const context = stateSchema.shape.purchases.element.shape.context.strict();
const simple = (type: string) =>
  z.object({ type: z.literal(type), id }).strict();
export const commandSchema = z.union([
  z
    .object({
      type: z.literal("uniform.create"),
      departmentId: id,
      lines: z.array(line).min(1).max(200),
      note: text,
      exceptionReason: reason,
    })
    .strict(),
  z
    .object({
      type: z.literal("uniform.edit"),
      id,
      lines: z.array(line).min(1).max(200),
      note: text,
      exceptionReason: reason,
    })
    .strict(),
  ...["uniform.submit", "uniform.issue", "uniform.cancel"].map((type) =>
    z.object({ type: z.literal(type), id, reason: reason.optional() }).strict(),
  ),
  z
    .object({ type: z.literal("uniform.return"), id, quantity: qty, reason })
    .strict(),
  z
    .object({
      type: z.literal("approve"),
      entity: z.enum(["uniform", "purchase"]),
      id,
      approved: z.boolean(),
      reason,
    })
    .strict(),
  z
    .object({
      type: z.literal("sku.save"),
      id: id.optional(),
      name: z.string().max(200),
      code: z.string().max(64),
      category: job,
      size: z.string().max(10),
      gender: gender.optional(),
      price: money,
      minStock: z.number().int().nonnegative().max(10000),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("stock.adjust"),
      skuId: id,
      quantity: z.number().int().min(-10000).max(10000),
      price: money,
      reason,
      warehouse: z.enum(["TT", "NOI"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("mapping.confirm"),
      skuId: id,
      productId: id,
      reason,
    })
    .strict(),
  z
    .object({
      type: z.literal("purchase.create"),
      lines: z.array(purchaseLine).min(1).max(200),
      note: text,
      context: context.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("purchase.edit"),
      id,
      lines: z.array(purchaseLine).min(1).max(200),
      note: text,
      context: context.optional(),
    })
    .strict(),
  ...["purchase.submit", "purchase.cancel", "purchase.order"].map(simple),
  z
    .object({
      type: z.literal("receipt"),
      id,
      quantities: z
        .record(z.string().max(128), z.number().int().nonnegative().max(10000))
        .refine((v) => Object.keys(v).length <= 200),
    })
    .strict(),
  z
    .object({
      type: z.literal("document.create"),
      document: z
        .object({
          title: z.string().max(500),
          category: z.string().max(80),
          sections: z
            .array(
              z
                .object({
                  id,
                  title: z.string().max(500),
                  text: z.string().max(200 * 1024),
                })
                .strict(),
            )
            .min(1)
            .max(100),
          readRoles: z.array(role).max(10),
          signRoles: z.array(role).max(10),
          expires: z.string().max(10),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("document.update"),
      id,
      title: z.string().max(500),
      text: z.string().max(200 * 1024),
      readRoles: z.array(role).max(10),
      signRoles: z.array(role).max(10),
      expires: z.string().max(10),
    })
    .strict(),
  ...[
    "document.mask",
    "document.review",
    "document.publish",
    "document.revoke",
    "document.version",
    "document.sign",
  ].map(simple),
  z
    .object({
      type: z.literal("locker.save"),
      id: id.optional(),
      number: z.string().max(30),
      building: z.string().max(80),
      floor: z.string().max(20),
      area: z.string().max(80),
      departmentId: id,
      condition: z.enum(["good", "maintenance"]),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("locker.allocate"),
      ids: z.array(id).min(1).max(100),
      employeeIds: z.array(id).max(100),
      departmentId: z.string().max(128),
      reason,
      reserve: z.boolean(),
    })
    .strict(),
  ...["locker.release", "locker.transfer"].map((type) =>
    z
      .object({ type: z.literal(type), id, employeeId: id.optional(), reason })
      .strict(),
  ),
  z
    .object({
      type: z.literal("settings"),
      settings: stateSchema.shape.settings.strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("employee.save"),
      id,
      departmentId: id,
      job,
      gender: stateSchema.shape.employees.element.shape.gender.optional(),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("notifications.read"),
      ids: z.array(id).max(1000),
    })
    .strict(),
]);
export function parseCommand(input: unknown): Command {
  return commandSchema.parse(input) as Command;
}
export const stateRefSchema = z
  .object({
    workspaceId: z.string().min(1).max(100),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const commandRequestSchema = z
  .object({
    command: commandSchema,
    operationId: z.string().min(8).max(128),
    expectedStateRef: stateRefSchema,
  })
  .strict();
