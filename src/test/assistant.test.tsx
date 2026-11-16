import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore } from "../store/store";
import * as selectors from "../domain/selectors";
function setup(actor = "hc", path = "/tong-quan") {
  localStorage.setItem("asa-demo-account", actor);
  const store = new DemoStore(localStorage);
  const mounted = render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    </MemoryRouter>,
  );
  return { store, user: userEvent.setup(), ...mounted };
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
  return screen.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
}
async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByLabelText("Câu hỏi cho trợ lý"), question);
  await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await waitFor(() =>
    expect(
      screen.queryByText("Đang đối chiếu dữ liệu demo…"),
    ).not.toBeInTheDocument(),
  );
  return within(screen.getByRole("log")).getAllByRole("article").at(-1)!;
}
describe("Hội thoại trợ lý qua giao diện React", () => {
  it("mở từ shell, gợi ý, trạng thái đang đọc, mở rộng và trả focus khi đóng", async () => {
    const { user, store } = setup(),
      before = store.getSnapshot();
    const dialog = await open(user);
    expect(screen.getByLabelText("Câu hỏi cho trợ lý")).toHaveFocus();
    expect(
      within(dialog).getByText("Tôi có thể hỗ trợ tra cứu gì?"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Gửi câu hỏi" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Mở rộng bảng trò chuyện" }),
    );
    expect(
      screen.getByRole("button", { name: "Thu gọn bảng trò chuyện" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Tồn kho DP-DD-M" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang đối chiếu dữ liệu demo…",
    );
    expect(
      await screen.findByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/),
    ).toBeVisible();
    expect(store.getSnapshot()).toBe(before);
    await user.click(screen.getByRole("button", { name: "Đóng trợ lý" }));
    expect(screen.getByRole("button", { name: "Trợ lý demo" })).toHaveFocus();
  });
  it("câu nối tiếp thay cỡ, mở nguồn rồi giữ hội thoại qua điều hướng và remount", async () => {
    const { user, unmount } = setup();
    await open(user);
    await ask(user, "Tồn kho áo điều dưỡng size M");
    const turn = await ask(user, "Còn size L thì sao?");
    expect(within(turn).getByText(/DP-DD-L, kho trung tâm/)).toBeVisible();
    await user.click(within(turn).getByRole("link", { name: /DP-DD-L/ }));
    expect(
      await screen.findByRole("heading", {
        name: "Quản lý đồng phục",
        level: 1,
      }),
    ).toBeVisible();
    await open(user);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    unmount();
    setup();
    await open(user);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Xóa hội thoại" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("asa-demo-chat:v1:hc")!)).toEqual(
      [],
    );
  });
  it("cập nhật số tồn trong câu trả lời đã mở ngay sau command được lưu", async () => {
    const { user, store } = setup("warehouse");
    await open(user);
    await ask(user, "Tồn kho DP-DD-M");
    act(() => {
      store.dispatch("warehouse", {
        type: "stock.adjust",
        skuId: "SKU-1-1",
        quantity: 2,
        warehouse: "TT",
        price: 300000,
        reason: "Kiểm kê bổ sung qua nghiệp vụ",
      });
    });
    expect(
      await screen.findByText(/12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng/),
    ).toBeVisible();
    expect(
      screen.queryByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/),
    ).not.toBeInTheDocument();
  });
  it("nguồn tài liệu mở đúng phiên bản/mục; thu hồi bỏ ngay đoạn trích trong chat", async () => {
    const { user, store } = setup();
    await open(user);
    await ask(user, "Định mức đồng phục mỗi năm?");
    const link = screen.getByRole("link", {
      name: /Chính sách cấp phát đồng phục • v2 • 2/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/tai-lieu/DEMO-TL-002?version=2#muc-2",
    );
    await user.click(link);
    expect(
      await screen.findByRole("heading", {
        name: "Chính sách cấp phát đồng phục",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    await open(user);
    act(() => {
      store.dispatch("docs", { type: "document.revoke", id: "DEMO-TL-002" });
    });
    expect(
      await screen.findByText(/Chưa đủ tài liệu còn hiệu lực/),
    ).toBeVisible();
    expect(
      within(screen.getByRole("log")).queryByText(/Định mức mặc định là 3 bộ/),
    ).not.toBeInTheDocument();
  });
  it("đổi tài khoản không lộ lịch sử hoặc đoạn hợp đồng của vai trò trước", async () => {
    const { user } = setup("buyer");
    await open(user);
    await ask(user, "Tìm hợp đồng An Tâm");
    expect(
      screen.getAllByRole("link", {
        name: /Hợp đồng cung cấp đồng phục An Tâm/,
      }).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Đóng trợ lý" }));
    await user.selectOptions(
      screen.getByLabelText("Tài khoản demo"),
      "employee",
    );
    await open(user);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await ask(user, "Tìm hợp đồng An Tâm");
    expect(
      screen.queryByRole("link", {
        name: /Hợp đồng cung cấp đồng phục An Tâm/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa đủ tài liệu còn hiệu lực/)).toBeVisible();
  });
  it("hiện thiếu tham số, nhiều ứng viên, ngoài phạm vi, lỗi tra cứu và thử lại", async () => {
    const { user } = setup();
    await open(user);
    let turn = await ask(user, "Còn hàng không?");
    expect(within(turn).getByText("Cần bổ sung")).toBeVisible();
    turn = await ask(user, "Tồn kho size M");
    expect(within(turn).getByText("Cần chọn mã")).toBeVisible();
    expect(within(turn).getAllByRole("link")).toHaveLength(4);
    turn = await ask(user, "Chẩn đoán bệnh cho tôi");
    expect(within(turn).getByText("Chưa hỗ trợ")).toBeVisible();
    const spy = vi.spyOn(selectors, "stock").mockImplementation(() => {
      throw Error("Lỗi đọc demo");
    });
    turn = await ask(user, "Tồn kho DP-DD-M");
    expect(within(turn).getByText("Lỗi tra cứu")).toBeVisible();
    expect(within(turn).queryByRole("link")).not.toBeInTheDocument();
    spy.mockRestore();
    await user.click(
      within(turn).getByRole("button", { name: "Thử tra cứu lại" }),
    );
    expect(
      await screen.findByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/),
    ).toBeVisible();
  });
  it("lệnh sửa chỉ mở biểu mẫu; duyệt cần xác nhận rồi chat đọc trạng thái thực", async () => {
    const { user, store } = setup("head", "/dong-phuc/yeu-cau");
    act(() => {
      store.dispatch("coord", {
        type: "uniform.create",
        departmentId: "NOI",
        lines: [{ employeeId: "DEMO-NV-031", skuId: "SKU-1-1", quantity: 1 }],
        note: "",
        exceptionReason: "",
      });
      store.dispatch("coord", {
        type: "uniform.submit",
        id: store.getSnapshot().uniforms.at(-1)!.id,
      });
    });
    const id = store.getSnapshot().uniforms.at(-1)!.id,
      before = store.getSnapshot();
    await open(user);
    const turn = await ask(user, `Duyệt giúp yêu cầu ${id}`);
    expect(store.getSnapshot()).toBe(before);
    await user.click(within(turn).getByRole("link", { name: /Mở hồ sơ/ }));
    await user.click(
      await screen.findByRole("button", { name: "Duyệt yêu cầu" }),
    );
    expect(store.getSnapshot()).toBe(before);
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(store.getSnapshot().uniforms.at(-1)!.decisions).toHaveLength(1);
    expect(store.getSnapshot().audits[0]?.entityId).toBe(id);
    await user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    await open(user);
    const status = await ask(user, `${id} đang chờ ai?`);
    expect(
      within(status).getByText(/Đang chờ Hành chính/, { selector: "p" }),
    ).toBeVisible();
  });
});
