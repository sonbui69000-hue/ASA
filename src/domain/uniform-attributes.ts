import type {
  Employee,
  Sku,
  PurchaseContext,
  ReadState as State,
  Account,
} from "./types";
export const normalizeSize = (value: string) => {
  const size = value.trim().toUpperCase();
  return size === "2XL" ? "XXL" : size === "XXXL" ? "3XL" : size;
};
export const validSize = (value: string) =>
  /^(XS|S|M|L|XL|XXL|3XL|[1-9]\d?)$/.test(normalizeSize(value));
export const eligibleSku = (sku: Sku, employee: Employee) =>
  sku.active &&
  employee.active &&
  sku.category === employee.job &&
  (sku.gender === "unisex" || sku.gender === employee.gender);
export const defaultPurchaseContext = (
  s: State,
  a: Account,
): PurchaseContext => ({
  budgetName: "",
  budgetCode: "",
  budgetDepartmentId: a.departmentId,
  purchaseMonth: s.settings.date.slice(0, 7),
});
