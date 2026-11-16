import { stateSchema, legacyStateSchema } from "../domain/schema";
import type { State } from "../domain/types";
/** Compatible migration only; never adds the expanded seed to user-created records. */
export function migrateState(input: unknown): {
  state: State;
  migrated: boolean;
} {
  if (typeof input !== "object" || !input)
    throw Error("Dữ liệu demo không hợp lệ.");
  if ((input as { schemaVersion?: unknown }).schemaVersion === 2)
    return { state: stateSchema.parse(input), migrated: false };
  const old = legacyStateSchema.parse(input);
  const empty = {
    budgetName: "",
    budgetCode: "",
    budgetDepartmentId: "",
    purchaseMonth: "",
  };
  return {
    migrated: true,
    state: {
      ...old,
      schemaVersion: 2,
      employees: old.employees.map((e) => ({ ...e, gender: "unspecified" })),
      skus: old.skus.map((s) => ({ ...s, gender: "unisex" })),
      supplierProducts: old.supplierProducts.map((p) => ({
        ...p,
        gender: "unisex",
      })),
      purchases: old.purchases.map((p) => ({ ...p, context: { ...empty } })),
      orders: old.orders.map((o) => ({ ...o, context: { ...empty } })),
    },
  };
}
