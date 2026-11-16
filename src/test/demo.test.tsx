import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore } from "../store/store";
import { availableLockers, stock, issued } from "../domain/selectors";
import {
  demoUniformLines,
  demoLockerEmployees,
} from "../domain/demo-scenarios";

function setup() {
  localStorage.setItem("asa-demo-account", "system");
  const store = new DemoStore(localStorage);
  render(
    <MemoryRouter initialEntries={["/trinh-dien"]}>
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    </MemoryRouter>,
  );
  return { store, user: userEvent.setup() };
}
describe("Điều khiển và hành trình trình diễn", () => {
  it("hủy nạp lại giữ dữ liệu; xác nhận mới khôi phục seed, mở kịch bản chỉ đổi vai trò/trang", async () => {
    const { store, user } = setup();
    store.dispatch("system", {
      type: "settings",
      settings: { ...store.getSnapshot().settings, annualLimit: 4 },
    });
    await user.click(
      await screen.findByRole("button", { name: "Nạp lại bộ trình diễn" }),
    );
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(store.getSnapshot().settings.annualLimit).toBe(4);
    await user.click(
      screen.getByRole("button", { name: "Nạp lại bộ trình diễn" }),
    );
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(store.getSnapshot().settings.annualLimit).toBe(3);
    const before = store.getSnapshot();
    await user.click(screen.getByRole("button", { name: "Mở kịch bản 3" }));
    expect(
      await screen.findByRole("heading", {
        name: "Tra cứu tài liệu",
        level: 1,
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("Tài khoản demo")).toHaveValue("buyer");
    expect(
      screen.getByRole("complementary", {
        name: "Hướng dẫn kịch bản hiện tại",
      }),
    ).toHaveTextContent("10 ngày làm việc");
    expect(store.getSnapshot()).toBe(before);
  });

  it("chạy liên tục năm kịch bản qua UI trên một state, giữ lịch sử, nguồn và ghi đúng audit", async () => {
    const { store, user } = setup();
    const close = async () =>
      user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    const confirm = async () =>
      user.click(await screen.findByRole("button", { name: "Xác nhận" }));
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
    const guide = async () =>
      user.click(screen.getByRole("link", { name: "Kịch bản trình diễn" }));
    await user.click(
      await screen.findByRole("button", { name: "Mở kịch bản 1" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Lập yêu cầu" }),
    );
    for (const [i, line] of demoUniformLines.entries()) {
      if (i)
        await user.click(
          screen.getByRole("button", { name: "Thêm dòng đồng phục" }),
        );
      await user.selectOptions(
        screen.getByLabelText(`Nhân viên dòng ${i + 1}`),
        line.employeeId,
      );
      await user.selectOptions(
        screen.getByLabelText(`Mã đồng phục dòng ${i + 1}`),
        line.skuId,
      );
    }
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    const id = store.getSnapshot().uniforms.at(-1)!.id;
    await openRecord(id);
    await user.click(screen.getByRole("button", { name: "Gửi duyệt yêu cầu" }));
    await confirm();
    for (const [actor, label] of [
      ["head", "Duyệt yêu cầu"],
      ["hc", "Duyệt yêu cầu"],
      ["warehouse", "Xác nhận bàn giao"],
    ]) {
      await close();
      await user.selectOptions(screen.getByLabelText("Tài khoản demo"), actor);
      await openRecord(id);
      await user.click(screen.getByRole("button", { name: label }));
      await confirm();
    }
    expect(store.getSnapshot().uniforms.at(-1)!.status).toBe("issued");
    expect(issued(store.getSnapshot(), "DEMO-NV-031")).toBe(3);
    await close();
    await guide();
    expect(
      screen.getByRole("button", { name: "Mở kịch bản 1" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Mở kịch bản 2" }));
    await user.click(
      await screen.findByRole("button", { name: "Tạo bản nháp mua" }),
    );
    await user.type(screen.getByLabelText("Mã ngân sách demo"), "DEMO-NS-LIVE");
    await user.click(screen.getByRole("button", { name: "Lưu đề nghị nháp" }));
    expect(store.getSnapshot().purchases.at(-1)!.lines[0]).toMatchObject({
      sourceRequestId: "DEMO-YC-002",
      quantity: 2,
      purpose: "shortage",
    });
    expect(stock(store.getSnapshot(), "SKU-0-3").physical).toBe(0);
    await guide();
    await user.click(screen.getByRole("button", { name: "Mở kịch bản 3" }));
    await user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
    );
    await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    const citation = await screen.findByRole("link", {
      name: /Hợp đồng cung cấp đồng phục An Tâm • v1 • 2/,
    });
    expect(citation).toHaveAttribute(
      "href",
      "/tai-lieu/DEMO-TL-004?version=1#muc-2",
    );
    await user.click(citation);
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "10 ngày làm việc",
    );
    await close();
    await guide();
    await user.click(screen.getByRole("button", { name: "Mở kịch bản 4" }));
    await user.click(await screen.findByRole("button", { name: "Phân bổ tủ" }));
    await user.clear(screen.getByLabelText("Số lượng tủ yêu cầu"));
    await user.type(screen.getByLabelText("Số lượng tủ yêu cầu"), "3");
    await user.selectOptions(
      screen.getByLabelText("Nhân viên nhận tủ"),
      demoLockerEmployees,
    );
    await user.type(
      screen.getByLabelText("Lý do phân bổ / giữ chỗ"),
      "Phân bổ nhóm trình diễn",
    );
    await user.click(
      screen.getByRole("button", { name: "Gợi ý danh sách tủ" }),
    );
    expect(availableLockers(store.getSnapshot())).toHaveLength(37);
    await user.click(screen.getByRole("button", { name: "Xác nhận phân bổ" }));
    expect(availableLockers(store.getSnapshot())).toHaveLength(34);
    await guide();
    await user.click(screen.getByRole("button", { name: "Mở kịch bản 5" }));
    await user.selectOptions(
      await screen.findByLabelText("Mã nội bộ cần đối sánh"),
      "SKU-2-2",
    );
    await user.type(
      screen.getByLabelText("Tra theo mã SAP / tên sản phẩm"),
      "bộ kỹ thuật",
    );
    expect(screen.getByRole("row", { name: /SAP-B-2010/ })).toHaveTextContent(
      "Khác chất liệu",
    );
    await user.click(
      within(screen.getByRole("row", { name: /SAP-A-1010/ })).getByRole(
        "button",
        { name: "Xác nhận đối sánh" },
      ),
    );
    await user.type(
      screen.getByLabelText("Lý do / ghi chú"),
      "Đã đối chiếu loại, cỡ L và Cotton 65% trong catalog demo",
    );
    await confirm();
    await waitFor(() =>
      expect(
        store.getSnapshot().mappings.find((m) => m.skuId === "SKU-2-2")!
          .productId,
      ).toBe("SP-A-SKU-2-2"),
    );
    expect(screen.getByRole("row", { name: /SAP-A-1010/ })).toHaveTextContent(
      "Đã đối chiếu",
    );
    expect(store.getSnapshot().audits.map((a) => a.action)).toEqual(
      expect.arrayContaining([
        "uniform.issue",
        "purchase.create",
        "locker.allocate",
        "mapping.confirm",
      ]),
    );
    expect(new DemoStore(localStorage).getSnapshot()).toEqual(
      store.getSnapshot(),
    );
  }, 45000);
});
