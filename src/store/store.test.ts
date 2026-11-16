import { describe, it, expect } from "vitest";
import { DemoStore, STORAGE_KEY, type StoragePort } from "./store";
import { createSeed } from "../data/seed";
class MemoryStorage implements StoragePort {
  data = new Map<string, string>();
  fail = false;
  getItem(k: string) {
    return this.data.get(k) || null;
  }
  setItem(k: string, v: string) {
    if (this.fail) throw Error("quota");
    this.data.set(k, v);
  }
}
describe("Lưu trữ demo", () => {
  it("lưu và hydrate cùng state; reset tạo lại seed có nhật ký", () => {
    const storage = new MemoryStorage(),
      store = new DemoStore(storage);
    store.dispatch("warehouse", {
      type: "stock.adjust",
      skuId: "SKU-1-1",
      quantity: 2,
      price: 300000,
      reason: "Kiểm kê bổ sung",
      warehouse: "TT",
    });
    expect(new DemoStore(storage).getSnapshot()).toEqual(store.getSnapshot());
    store.reset("system");
    expect(store.getSnapshot().uniforms).toHaveLength(
      createSeed().uniforms.length,
    );
    expect(store.getSnapshot().audits[0].action).toContain("Khôi phục");
  });
  it("ghi quota lỗi không công bố state mới hoặc audit nửa vời", () => {
    const storage = new MemoryStorage(),
      store = new DemoStore(storage),
      old = store.getSnapshot();
    storage.fail = true;
    expect(() =>
      store.dispatch("warehouse", {
        type: "stock.adjust",
        skuId: "SKU-1-1",
        quantity: 2,
        price: 300000,
        reason: "Kiểm kê bổ sung",
        warehouse: "TT",
      }),
    ).toThrow("Chưa thay đổi");
    expect(store.getSnapshot()).toBe(old);
  });
  it("JSON hỏng hoặc schema không hợp lệ không tự ghi đè", () => {
    for (const data of [
      "{hỏng",
      JSON.stringify({ schemaVersion: 3 }),
      JSON.stringify({ ...createSeed(), employees: "invalid" }),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, data);
      const store = new DemoStore(storage);
      expect(store.error).toBeTruthy();
      expect(storage.getItem(STORAGE_KEY)).toBe(data);
      expect(() =>
        store.dispatch("hc", { type: "notifications.read", ids: [] }),
      ).toThrow();
    }
  });
  it("chặn revision cũ và thay đổi từ tab khác", () => {
    const store = new DemoStore(new MemoryStorage());
    expect(() =>
      store.dispatch("hc", { type: "notifications.read", ids: [] }, "op", 99),
    ).toThrow("đã thay đổi");
    store.externalChange();
    expect(() =>
      store.dispatch("hc", { type: "notifications.read", ids: [] }),
    ).toThrow("tab khác");
  });
  it("quyết định trái quyền không ghi dữ liệu", () => {
    const store = new DemoStore(new MemoryStorage()),
      old = store.getSnapshot();
    expect(() =>
      store.dispatch("employee", { type: "settings", settings: old.settings }),
    ).toThrow("quyền");
    expect(store.getSnapshot()).toBe(old);
  });
});
