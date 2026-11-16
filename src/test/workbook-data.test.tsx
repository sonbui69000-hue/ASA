import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { workbookFixture } from "../../tests/helpers/workbook-fixture";
import { createSeed } from "../data/seed";
import { DemoStore, STORAGE_KEY } from "../store/store";
import { DemoProvider } from "../app/context";
import { WorkbookDataPanel } from "../features/workbook-data";
import { App } from "../app/App";
afterEach(() => vi.unstubAllGlobals());
function mount(kind: "uniforms" | "purchases" | "lockers", actor = "hc") {
  const state = createSeed();
  state.workbookData = workbookFixture();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem("asa-demo-account", actor);
  const store = new DemoStore(localStorage),
    user = userEvent.setup();
  render(
    <MemoryRouter>
      <DemoProvider store={store}>
        <WorkbookDataPanel kind={kind} />
      </DemoProvider>
    </MemoryRouter>,
  );
  return { store, user };
}
describe("Local workbook source UI", () => {
  it("preserves original IDs, opens source details and shows missing values without inventing approvals", async () => {
    const { user, store } = mount("uniforms"),
      before = store.getSnapshot();
    await user.type(
      screen.getByLabelText("Tìm trong Dữ liệu Excel cục bộ"),
      "000123",
    );
    expect(screen.getByRole("table")).toHaveTextContent("Người tổng hợp 001");
    await user.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const detail = screen.getByRole("dialog");
    expect(detail).toHaveTextContent("PR-SYNTHETIC-01");
    expect(detail).toHaveTextContent("Chưa ghi / chưa xác định");
    expect(detail).toHaveTextContent("Lượng cấp khác lượng yêu cầu");
    expect(
      within(detail).queryByRole("button", { name: /duyệt|Lưu/ }),
    ).not.toBeInTheDocument();
    expect(store.getSnapshot()).toEqual(before);
  });
  it("shows source purchasing quantities, units and budgets independently from operational PO status", async () => {
    const { user } = mount("purchases");
    expect(screen.getByRole("table")).toHaveTextContent("2 ZBO");
    await user.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("123000");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Ngân sách thử nghiệm",
    );
  });
  it("keeps missing locker identity/date as review issues and presents source fault rows", async () => {
    const { user } = mount("lockers");
    expect(screen.getByRole("table")).toHaveTextContent("A001");
    await user.click(screen.getByRole("tab", { name: /Tình trạng lỗi nguồn/ }));
    expect(screen.getByRole("table")).toHaveTextContent("Lỗi khóa tổng hợp");
    await user.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Cần xác minh vị trí và tình trạng hiện tại",
    );
  });
  it("does not expose imported names or row counts to an unverified employee account", () => {
    mount("uniforms", "employee");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Người tổng hợp 001")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "không nằm trong phạm vi",
    );
  });
  it("navigates from the local assistant's exact source link to the imported row with no network calls", async () => {
    const state = createSeed();
    state.workbookData = workbookFixture();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("asa-demo-account", "hc");
    sessionStorage.clear();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup(),
      store = new DemoStore(localStorage);
    render(
      <MemoryRouter initialEntries={["/dong-phuc/du-lieu-excel"]}>
        <DemoProvider store={store}>
          <App />
        </DemoProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Lịch sử Excel Người tổng hợp 001",
    );
    await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await waitFor(() =>
      expect(screen.getAllByRole("article").at(-1)).toHaveTextContent("000123"),
    );
    await user.click(
      within(screen.getAllByRole("article").at(-1)!).getByRole("link", {
        name: /Người tổng hợp 001/,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Chi tiết dòng Excel" }),
      ).toBeVisible(),
    );
    expect(
      screen.getByRole("dialog", { name: "Chi tiết dòng Excel" }),
    ).toHaveTextContent("000123");
    expect(fetch).not.toHaveBeenCalled();
  });
});
