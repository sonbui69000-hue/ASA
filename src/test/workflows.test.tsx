import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore } from "../store/store";
import { stock, availableLockers } from "../domain/selectors";
function setup(path: string, actor: string) {
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
async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Xác nhận" }));
}
async function openRequest(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
) {
  const row = screen.getByRole("row", { name: new RegExp(id) });
  await user.click(within(row).getByRole("button", { name: "Xem hồ sơ" }));
}
describe("Hành trình qua giao diện React", () => {
  it("tạo, duyệt hai bên, bàn giao và giữ giá lịch sử qua đổi vai trò", async () => {
    const { store, user } = setup("/dong-phuc/yeu-cau", "coord");
    await user.click(
      await screen.findByRole("button", { name: "Lập yêu cầu" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Nhân viên dòng 1"),
      "DEMO-NV-031",
    );
    await user.selectOptions(
      screen.getByLabelText("Mã đồng phục dòng 1"),
      "SKU-1-1",
    );
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await waitFor(() => expect(store.getSnapshot().uniforms).toHaveLength(5));
    const id = store.getSnapshot().uniforms.at(-1)!.id;
    await openRequest(user, id);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt yêu cầu" }));
    await confirm(user);
    expect(store.getSnapshot().uniforms.at(-1)?.status).toBe("pending");
    for (const [account, label] of [
      ["head", "Duyệt yêu cầu"],
      ["hc", "Duyệt yêu cầu"],
      ["warehouse", "Xác nhận bàn giao"],
    ]) {
      await user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
      await user.selectOptions(
        screen.getByLabelText("Tài khoản demo"),
        account,
      );
      await openRequest(user, id);
      await user.click(screen.getByRole("button", { name: label }));
      await confirm(user);
    }
    expect(store.getSnapshot().uniforms.at(-1)?.status).toBe("issued");
    expect(stock(store.getSnapshot(), "SKU-1-1")).toEqual({
      physical: 9,
      held: 2,
      available: 7,
    });
    expect(
      new DemoStore(localStorage).getSnapshot().issuances.at(-1)?.price,
    ).toBe(300000);
  }, 20000);
  it("hiện lý do vượt định mức và không gửi yêu cầu sai", async () => {
    const { store, user } = setup("/dong-phuc/yeu-cau", "coord");
    await user.click(
      await screen.findByRole("button", { name: "Lập yêu cầu" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Nhân viên dòng 1"),
      "DEMO-NV-031",
    );
    await user.selectOptions(
      screen.getByLabelText("Mã đồng phục dòng 1"),
      "SKU-1-1",
    );
    const q = screen.getByLabelText("Số bộ dòng 1");
    await user.clear(q);
    await user.type(q, "2");
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    const id = store.getSnapshot().uniforms.at(-1)!.id;
    await openRequest(user, id);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt yêu cầu" }));
    await confirm(user);
    expect(await screen.findByText(/Vượt định mức: đã cấp 2/)).toBeVisible();
    expect(store.getSnapshot().uniforms.at(-1)?.status).toBe("draft");
    expect(stock(store.getSnapshot(), "SKU-1-1").physical).toBe(10);
  });
  it("không hiển thị nội dung tài liệu trái quyền khi mở URL trực tiếp", async () => {
    setup("/tai-lieu/DEMO-TL-004", "employee");
    expect(
      await screen.findByRole("heading", { name: "Tài liệu không khả dụng" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/Thời hạn giao hàng mẫu là 10/),
    ).not.toBeInTheDocument();
  });
  it("che, rà soát và xuất bản tài liệu qua các xác nhận", async () => {
    const { store, user } = setup("/quan-tri-tai-lieu", "docs");
    await screen.findByRole("heading", { name: "Quản lý tài liệu", level: 1 });
    const row = screen.getByRole("row", { name: /DEMO-TL-006/ });
    await user.click(within(row).getByRole("button", { name: "Xem / xử lý" }));
    for (const label of [
      "Che thông tin cá nhân",
      "Xác nhận rà soát",
      "Xuất bản và lập chỉ mục",
    ]) {
      await user.click(screen.getByRole("button", { name: label }));
      await confirm(user);
    }
    const doc = store
      .getSnapshot()
      .documents.find((d) => d.id === "DEMO-TL-006")!;
    expect(doc.status).toBe("published");
    expect(doc.sections[0].text).toContain("[ĐÃ CHE SĐT]");
    expect(doc.sections[0].text).not.toContain("0900000000");
  });
  it("chặn mua dự trữ 49 bộ bằng thông báo có công thức", async () => {
    const { store, user } = setup("/mua-sam/de-nghi", "buyer");
    await user.click(
      await screen.findByRole("button", { name: "Lập đề nghị mua" }),
    );
    const qty = screen.getByLabelText("Số bộ mua dòng 1");
    await user.clear(qty);
    await user.type(qty, "49");
    await user.click(screen.getByRole("button", { name: "Lưu đề nghị nháp" }));
    const row = screen.getByRole("row", {
      name: new RegExp(store.getSnapshot().purchases.at(-1)!.id),
    });
    await user.click(within(row).getByRole("button", { name: "Xem đề nghị" }));
    await user.click(screen.getByRole("button", { name: "Gửi duyệt đề nghị" }));
    await confirm(user);
    expect(await screen.findByText(/vượt giới hạn 48 bộ/)).toBeVisible();
    expect(store.getSnapshot().purchases.at(-1)!.status).toBe("draft");
  });
  it("gợi ý rồi phân bổ hai tủ cho hai nhân viên, không tự phân bổ trước xác nhận", async () => {
    const { store, user } = setup("/tu-do", "hc");
    await user.click(await screen.findByRole("button", { name: "Phân bổ tủ" }));
    const q = screen.getByLabelText("Số lượng tủ yêu cầu");
    await user.clear(q);
    await user.type(q, "2");
    await user.selectOptions(screen.getByLabelText(/^Nhân viên nhận tủ/), [
      "DEMO-NV-001",
      "DEMO-NV-002",
    ]);
    await user.type(
      screen.getByLabelText("Lý do phân bổ / giữ chỗ"),
      "Phân bổ tủ theo nhu cầu mới",
    );
    await user.click(
      screen.getByRole("button", { name: "Gợi ý danh sách tủ" }),
    );
    expect(availableLockers(store.getSnapshot())).toHaveLength(37);
    await user.click(screen.getByRole("button", { name: "Xác nhận phân bổ" }));
    expect(availableLockers(store.getSnapshot())).toHaveLength(35);
    expect(store.getSnapshot().lockerEvents.at(-1)?.to).toBe("DEMO-NV-002");
  });
  it("trợ lý đưa số tồn có nguồn và không thay đổi nghiệp vụ", async () => {
    const { store, user } = setup("/phe-duyet", "hc");
    await user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    const before = store.getSnapshot();
    await user.click(screen.getByRole("button", { name: "Tồn kho DP-DD-M" }));
    expect(
      await screen.findByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /DP-DD-M/ })).toHaveAttribute(
      "href",
      "/dong-phuc/kho?sku=SKU-1-1&warehouse=TT",
    );
    expect(store.getSnapshot()).toBe(before);
  });
  it("trung tâm thông báo đánh dấu đã đọc và reset demo cần xác nhận", async () => {
    const { store, user } = setup("/thiet-lap", "system");
    await user.click(screen.getByRole("button", { name: /Thông báo \(/ }));
    await user.click(
      screen.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }),
    );
    expect(store.getSnapshot().readNotifications.system).toContain(
      store.getSnapshot().audits[0].id,
    );
    await user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    await user.click(
      screen.getByRole("button", { name: "Khôi phục dữ liệu demo" }),
    );
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(store.getSnapshot().readNotifications.system).toContain(
      store.getSnapshot().audits[0].id,
    );
    await user.click(
      screen.getByRole("button", { name: "Khôi phục dữ liệu demo" }),
    );
    await confirm(user);
    expect(store.getSnapshot().readNotifications).toEqual({});
    expect(store.getSnapshot().audits[0].action).toBe("Khôi phục dữ liệu demo");
  });
});
