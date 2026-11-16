import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore, STORAGE_KEY } from "../store/store";
import { legacyState } from "../../tests/helpers/legacy-state";

function setup(path: string, actor = "hc") {
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

describe("Giao diện đối chiếu Excel dùng dữ liệu tổng hợp", () => {
  it("lọc đồng thời giới tính/cỡ và chỉ cho chọn SKU phù hợp nhân viên", async () => {
    const { user } = setup("/dong-phuc/kho", "coord");
    await user.selectOptions(
      await screen.findByLabelText("Biến thể giới tính"),
      "female",
    );
    await user.selectOptions(screen.getByLabelText("Cỡ đồng phục"), "XXL");
    const table = screen.getByRole("table", { name: "Danh mục đồng phục" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table).toHaveTextContent("DP-DD-NU-XXL");
    expect(table).toHaveTextContent("0 bộ");
    await user.click(screen.getByRole("tab", { name: /Yêu cầu cấp phát/ }));
    await user.click(screen.getByRole("button", { name: "Lập yêu cầu" }));
    await user.selectOptions(
      screen.getByLabelText("Nhân viên dòng 1"),
      "DEMO-NV-035",
    );
    const options = within(screen.getByLabelText("Mã đồng phục dòng 1"));
    expect(
      options.getByRole("option", { name: /DP-DD-NU-XXL/ }),
    ).toBeInTheDocument();
    expect(
      options.queryByRole("option", { name: /DP-DD-NAM-XXL/ }),
    ).not.toBeInTheDocument();
    expect(
      options.queryByRole("option", { name: /DP-BS-/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/DEMO-NV-035 · Đã cấp 0/)).toBeVisible();
  });

  it("lưu metadata ngân sách và lọc tổng hợp mua theo cùng hồ sơ", async () => {
    const { user, store } = setup("/mua-sam/de-nghi", "buyer");
    await user.click(
      await screen.findByRole("button", { name: "Lập đề nghị mua" }),
    );
    await user.type(
      screen.getByLabelText("Ngân sách (mô tả demo)"),
      "Ngân sách thử giao diện",
    );
    await user.type(
      screen.getByLabelText("Mã ngân sách demo"),
      "DEMO-NS-UI-45",
    );
    await user.selectOptions(
      screen.getByLabelText("Khoa/phòng hạch toán"),
      "NOI",
    );
    const month = screen.getByLabelText("Tháng dự kiến mua");
    expect(month).toHaveValue("2026-11");
    await user.click(screen.getByRole("button", { name: "Lưu đề nghị nháp" }));
    const saved = store.getSnapshot().purchases.at(-1)!;
    expect(saved.context).toEqual({
      budgetName: "Ngân sách thử giao diện",
      budgetCode: "DEMO-NS-UI-45",
      budgetDepartmentId: "NOI",
      purchaseMonth: "2026-11",
    });
    await user.click(screen.getByRole("tab", { name: "Tổng hợp mua" }));
    await user.selectOptions(
      screen.getByLabelText("Khoa/phòng tổng hợp mua"),
      "NOI",
    );
    await user.type(
      screen.getByLabelText("Tìm mã hoặc tên ngân sách"),
      "DEMO-NS-UI-45",
    );
    const report = screen.getByRole("table", { name: "Tổng hợp mua" });
    expect(within(report).getAllByRole("row")).toHaveLength(2);
    expect(report).toHaveTextContent(saved.id);
    expect(report).toHaveTextContent("Ngân sách thử giao diện");
    expect(report).toHaveTextContent("0 ₫");
    expect(
      new DemoStore(localStorage).getSnapshot().purchases.at(-1)!.context,
    ).toEqual(saved.context);
  });

  it("hiển thị ngày cấp gần nhất và nhân viên đạt giới hạn từ lịch sử", async () => {
    const { user } = setup("/dong-phuc/nhan-vien");
    await user.type(
      await screen.findByLabelText("Tìm trong Nhân viên", { exact: true }),
      "DEMO-NV-004",
    );
    const row = screen.getByRole("row", { name: /Nhân viên demo 004/ });
    expect(row).toHaveTextContent("15/10/2026");
    expect(row).toHaveTextContent("3 / 0");
    await user.click(within(row).getByRole("button", { name: "Lịch sử cấp" }));
    expect(
      screen.getByRole("table", { name: "Lịch sử cấp phát cá nhân" }),
    ).toHaveTextContent("DP-BS-NAM-XXL");
    expect(screen.getByRole("dialog")).toHaveTextContent("436.000 ₫");
  });

  it("thông báo chuyển dữ liệu v1, giữ hồ sơ và không đoán giới tính", async () => {
    const before = legacyState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
    const { store } = setup("/dong-phuc/nhan-vien");
    expect(await screen.findByText(/Đã nâng dữ liệu demo/)).toBeVisible();
    await screen.findByLabelText("Tìm trong Nhân viên", { exact: true });
    expect(screen.getAllByText("Chưa cập nhật").length).toBeGreaterThan(0);
    expect(store.getSnapshot().schemaVersion).toBe(2);
    expect(store.getSnapshot().issuances).toEqual(before.issuances);
    expect(store.getSnapshot().employees.map((e) => e.id)).toEqual(
      before.employees.map((e) => e.id),
    );
    expect(
      store.getSnapshot().employees.every((e) => e.gender === "unspecified"),
    ).toBe(true);
  });
});
