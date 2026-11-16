import { createSeed } from "../../src/data/seed";
import type { State } from "../../src/domain/types";
// A deterministic legacy demo fixture; never reads the reference workbook.
export function legacyState(state: State = createSeed()) {
  return {
    ...state,
    schemaVersion: 1,
    employees: state.employees.map(({ gender: _gender, ...e }) => e),
    skus: state.skus.map(({ gender: _gender, ...s }) => s),
    supplierProducts: state.supplierProducts.map(
      ({ gender: _gender, ...p }) => p,
    ),
    purchases: state.purchases.map(({ context: _context, ...p }) => p),
    orders: state.orders.map(({ context: _context, ...o }) => o),
  };
}
