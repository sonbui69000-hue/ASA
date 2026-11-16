import { describe, it, expect } from "vitest";
import { DemoStore } from "../store/store";
import { answerQuery } from "../domain/assistant";
import { account } from "../domain/selectors";
describe("Phase 6.5 offline localStorage and assistant consistency", () => {
  it("reload preserves the committed state and reset restores assistant facts across modules", () => {
    localStorage.clear();
    let store = new DemoStore(localStorage);
    store.dispatch("warehouse", {
      type: "stock.adjust",
      skuId: "SKU-1-1",
      quantity: 2,
      price: 300000,
      reason: "Kiểm kê tổng hợp kiểm chứng",
      warehouse: "TT",
    });
    store.dispatch("hc", {
      type: "locker.allocate",
      ids: ["DEMO-TU-041"],
      employeeIds: ["DEMO-NV-001"],
      departmentId: "",
      reason: "Phân bổ tổng hợp kiểm chứng",
      reserve: false,
    });
    const committed = store.getSnapshot();
    store = new DemoStore(localStorage);
    expect(store.getSnapshot()).toEqual(committed);
    const ask = (q: string) =>
      answerQuery(store.getSnapshot(), account(store.getSnapshot(), "hc"), q);
    expect(ask("Tồn kho DP-DD-M").text).toContain(
      "12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng",
    );
    expect(ask("Có bao nhiêu tủ trống?").text).toContain("36 tủ trống");
    store.reset("system");
    store = new DemoStore(localStorage);
    expect(ask("Tồn kho DP-DD-M").text).toContain(
      "10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng",
    );
    expect(ask("Có bao nhiêu tủ trống?").text).toContain("37 tủ trống");
    expect(ask("DEMO-NV-031 còn được cấp không?").text).toContain(
      "đã cấp 2 bộ, đang cam kết 0 bộ, còn 1 bộ",
    );
    localStorage.clear();
  });
});
