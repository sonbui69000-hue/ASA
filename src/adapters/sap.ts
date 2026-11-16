import type { State, SupplierProduct } from "../domain/types";
import { matchesProductQuery } from "../domain/product-search";
export interface SapAdapter {
  searchProducts(state: State, query: string): SupplierProduct[];
  createOrderReference(state: State, operationId: string): string;
}
export const MockSapAdapter: SapAdapter = {
  searchProducts: (s, q) =>
    s.supplierProducts.filter((p) => matchesProductQuery(p, q)),
  createOrderReference: (s, operationId) => {
    if (s.settings.sapFailure)
      throw Error(
        "SAP mô phỏng đang ở kịch bản lỗi. Tắt kịch bản lỗi trong Thiết lập rồi thử lại; chưa tạo PO, chưa thay đổi kho.",
      );
    return `DEMO-SAP-PO-${operationId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
  },
};
