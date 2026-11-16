import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore } from "../store/store";
import { execute } from "../domain/commands";
import { createSeed } from "../data/seed";
import { STORAGE_KEY } from "../store/store";
import { stock, issued } from "../domain/selectors";
function setup(path: string, actor = "employee") {
  localStorage.setItem("asa-demo-account", actor);
  const store = new DemoStore(localStorage);
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    </MemoryRouter>,
  );
  return { store, user: userEvent.setup() };
}
describe("QA quyền và điều hướng", () => {
  it("điều hướng các trang chính và KPI tổng quan cập nhật sau phân bổ tủ", async () => {
    const { user, store } = setup("/tong-quan", "hc");
    await screen.findByRole("heading", {
      name: "Tổng quan vận hành",
      level: 1,
    });
    for (const [label, title] of [
      ["Đồng phục", "Quản lý đồng phục"],
      ["Tra cứu tài liệu", "Tra cứu tài liệu"],
      ["Mua sắm", "Hỗ trợ mua sắm"],
      ["Việc cần phê duyệt", "Việc cần phê duyệt"],
      ["Nhật ký thao tác", "Nhật ký thao tác"],
      ["Thiết lập demo", "Thiết lập demo"],
      ["Tủ đồ", "Quản lý tủ đồ"],
    ]) {
      await user.click(
        screen.getByRole("link", {
          name: new RegExp("^" + label + "(?:\\s*\\d+)?$"),
        }),
      );
      expect(
        await screen.findByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
    }
    await user.click(screen.getByRole("button", { name: "Phân bổ tủ" }));
    await user.selectOptions(screen.getByLabelText("Nhân viên nhận tủ"), [
      "DEMO-NV-001",
    ]);
    await user.type(
      screen.getByLabelText("Lý do phân bổ / giữ chỗ"),
      "Bàn giao tủ cho kịch bản QA",
    );
    await user.click(
      screen.getByRole("button", { name: "Gợi ý danh sách tủ" }),
    );
    await user.click(screen.getByRole("button", { name: "Xác nhận phân bổ" }));
    expect(
      store.getSnapshot().lockers.filter((l) => l.employeeId === "DEMO-NV-001"),
    ).toHaveLength(1);
    await user.click(screen.getByRole("link", { name: "Tổng quan" }));
    const metric = await screen.findByRole("link", {
      name: /Tủ trống sẵn sàng cấp/,
    });
    expect(metric).toHaveTextContent("36");
    expect(metric).not.toHaveTextContent("37");
  });
  it("hành trình thiếu hàng qua mua bổ sung, ba bên duyệt, PO, nhận kho và cấp phát", async () => {
    const { store, user } = setup("/dong-phuc/yeu-cau", "coord");
    const confirm = async () =>
      user.click(await screen.findByRole("button", { name: "Xác nhận" }));
    const close = async () =>
      user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    const changeRole = async (actor: string) =>
      user.selectOptions(screen.getByLabelText("Tài khoản demo"), actor);
    const openRecord = async (id: string) => {
      await user.click(
        screen.getByRole("button", { name: /Tìm hồ sơ, tài liệu, quy trình/ }),
      );
      await user.type(
        screen.getByLabelText("Nội dung tìm kiếm toàn ứng dụng"),
        id,
      );
      await user.click(
        screen.getByRole("button", { name: new RegExp(id + " •") }),
      );
    };
    await user.click(
      await screen.findByRole("button", { name: "Lập yêu cầu" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Nhân viên dòng 1"),
      "DEMO-NV-033",
    );
    await user.selectOptions(
      screen.getByLabelText("Mã đồng phục dòng 1"),
      "SKU-0-3",
    );
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    const uid = store.getSnapshot().uniforms.at(-1)!.id;
    await openRecord(uid);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt yêu cầu" }));
    await confirm();
    expect(store.getSnapshot().uniforms.at(-1)!.status).toBe("waiting_stock");
    await close();
    await changeRole("buyer");
    await user.click(screen.getByRole("link", { name: "Mua sắm" }));
    await user.click(
      await screen.findByRole("tab", { name: /Nhu cầu bổ sung/ }),
    );
    await user.click(
      within(screen.getByRole("row", { name: new RegExp(uid) })).getByRole(
        "button",
        { name: "Tạo bản nháp mua" },
      ),
    );
    await user.click(screen.getByRole("button", { name: "Lưu đề nghị nháp" }));
    const pid = store.getSnapshot().purchases.at(-1)!.id;
    await openRecord(pid);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt đề nghị" }));
    await confirm();
    for (const actor of ["hc", "finance", "leader"]) {
      await close();
      await changeRole(actor);
      await openRecord(pid);
      await user.click(screen.getByRole("button", { name: "Duyệt đề nghị" }));
      await confirm();
    }
    await close();
    await changeRole("buyer");
    await openRecord(pid);
    await user.click(
      screen.getByRole("button", { name: "Tạo PO SAP mô phỏng" }),
    );
    await confirm();
    expect(stock(store.getSnapshot(), "SKU-0-3").physical).toBe(0);
    await close();
    await changeRole("warehouse");
    await user.click(screen.getByRole("tab", { name: "Đơn hàng & nhận hàng" }));
    await user.click(
      within(
        screen.getByRole("row", {
          name: new RegExp(store.getSnapshot().orders.at(-1)!.id),
        }),
      ).getByRole("button", { name: "Xem đơn hàng" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Lập phiếu nhận hàng" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Xác nhận nhận và tăng kho" }),
    );
    expect(stock(store.getSnapshot(), "SKU-0-3").physical).toBe(1);
    await changeRole("coord");
    await openRecord(uid);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt yêu cầu" }));
    await confirm();
    for (const [actor, label] of [
      ["head", "Duyệt yêu cầu"],
      ["hc", "Duyệt yêu cầu"],
      ["warehouse", "Xác nhận bàn giao"],
    ]) {
      await close();
      await changeRole(actor);
      await openRecord(uid);
      await user.click(
        screen.getByRole("button", {
          name: new RegExp("^" + label + "(?:\\s*\\d+)?$"),
        }),
      );
      await confirm();
    }
    expect(store.getSnapshot().uniforms.at(-1)!.status).toBe("issued");
    expect(stock(store.getSnapshot(), "SKU-0-3")).toEqual({
      physical: 0,
      held: 0,
      available: 0,
    });
    expect(issued(store.getSnapshot(), "DEMO-NV-033")).toBe(1);
    expect(new DemoStore(localStorage).getSnapshot()).toEqual(
      store.getSnapshot(),
    );
    const actions = store.getSnapshot().audits.map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "purchase.create",
        "purchase.order",
        "receipt",
        "uniform.issue",
      ]),
    );
    await close();
    await user.click(screen.getByRole("tab", { name: "Báo cáo" }));
    await user.selectOptions(screen.getByLabelText("Mã hàng"), "SKU-0-3");
    await waitFor(() =>
      expect(
        screen.getByRole("table", { name: "Báo cáo cấp phát" }),
      ).toHaveTextContent("DP-BS-XL"),
    );
  }, 30000);
  it("nhân viên không thấy người khác đang dùng tủ dù tủ thuộc cùng khoa", async () => {
    const { user } = setup("/tu-do");
    await screen.findByRole("heading", { name: "Quản lý tủ đồ", level: 1 });
    await user.type(
      screen.getByLabelText("Tìm trong Danh mục tủ"),
      "DEMO-TU-001",
    );
    expect(
      screen.queryByRole("row", { name: /Nhân viên demo 041/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Lịch sử bàn giao/ }));
    expect(
      screen.queryByRole("row", { name: /Nhân viên demo 041/ }),
    ).not.toBeInTheDocument();
  });
  it("trả tủ không làm lộ người dùng cũ trong lịch sử cho vai trò nhân viên", async () => {
    const s = execute(
      createSeed(),
      "hc",
      {
        type: "locker.release",
        id: "DEMO-TU-001",
        reason: "Kết thúc sử dụng demo",
      },
      "qa-release",
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    const { user } = setup("/tu-do");
    await screen.findByRole("heading", { name: "Quản lý tủ đồ", level: 1 });
    await user.click(screen.getByRole("tab", { name: /Lịch sử bàn giao/ }));
    expect(
      screen.queryByRole("row", { name: /Nhân viên demo 041/ }),
    ).not.toBeInTheDocument();
  });
  it.each([
    "/tai-lieu/DEMO-TL-999",
    "/tai-lieu/DEMO-TL-008",
    "/tai-lieu/DEMO-TL-007",
    "/tai-lieu/DEMO-TL-002?version=99",
  ])("nguồn không khả dụng: %s", async (path) => {
    setup(path);
    expect(
      await screen.findByRole("heading", { name: "Tài liệu không khả dụng" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).queryByText(/Định mức mặc định/),
    ).not.toBeInTheDocument();
  });
});
