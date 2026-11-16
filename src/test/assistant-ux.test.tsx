import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { DemoStore } from "../store/store";
import { RemoteStore } from "../online/client";
import { createSeed } from "../data/seed";
import { projectView } from "../../server/views";
import { answerQuery } from "../domain/assistant";
import { account } from "../domain/selectors";
import { Assistant } from "../features/assistant";
import type { AssistantReply } from "../online/protocol";
afterEach(() => vi.unstubAllGlobals());
function offline(path = "/tong-quan", actor = "hc") {
  localStorage.setItem("asa-demo-account", actor);
  const store = new DemoStore(localStorage),
    user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    </MemoryRouter>,
  );
  return { store, user };
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
}
async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.clear(screen.getByLabelText("Câu hỏi cho trợ lý"));
  await user.type(screen.getByLabelText("Câu hỏi cho trợ lý"), question);
  await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
  await waitFor(() =>
    expect(
      screen.queryByText("Đang đối chiếu dữ liệu demo…"),
    ).not.toBeInTheDocument(),
  );
  return screen.getAllByRole("article").at(-1)!;
}
function online() {
  const state = createSeed(),
    ref = { workspaceId: "ux-online", revision: state.revision },
    store = new RemoteStore(
      projectView(state, "warehouse", ref),
      "synthetic-csrf",
      "warehouse",
      vi.fn(),
      vi.fn(),
    ),
    user = userEvent.setup();
  render(
    <MemoryRouter>
      <DemoProvider store={store}>
        <Assistant />
      </DemoProvider>
    </MemoryRouter>,
  );
  const reply = (question: string, id: string): AssistantReply => ({
    answer: answerQuery(state, account(state, "warehouse"), question),
    contextId: id,
    stateRef: ref,
    mode: "llm",
    generationMode: "tools",
    reason: null,
    retrievalMode: "keyword",
    usage: { calls: 2, promptTokens: 10, completionTokens: 10, cost: 0 },
  });
  return { state, store, user, reply };
}
describe("Phase 6.4 assistant UX", () => {
  it("continues a size question and opens the exact product rather than the full catalog", async () => {
    const f = offline();
    await open(f.user);
    await ask(f.user, "Tồn kho DP-DD-M");
    const next = await ask(f.user, "Thế cỡ L thì sao?");
    expect(within(next).getByText(/DP-DD-L, kho trung tâm/)).toBeVisible();
    await f.user.click(within(next).getByRole("link", { name: /DP-DD-L/ }));
    const table = await screen.findByRole("table", {
      name: "Danh mục đồng phục",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("DP-DD-L")).toBeVisible();
    expect(within(table).queryByText("DP-DD-M")).not.toBeInTheDocument();
    await f.user.click(
      screen.getByRole("button", { name: "Xóa bộ lọc nguồn" }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("table", { name: "Danh mục đồng phục" }),
        ).getAllByRole("row").length,
      ).toBeGreaterThan(2),
    );
  });
  it("lets users choose an ambiguous product without performing a business command", async () => {
    const f = offline(),
      before = f.store.getSnapshot();
    await open(f.user);
    const result = await ask(f.user, "Tồn kho áo điều dưỡng size XXL");
    const choices = within(result).getByRole("group", {
      name: "Chọn thông tin cần làm rõ",
    });
    await f.user.click(
      within(choices).getByRole("button", { name: /DP-DD-NU-XXL/ }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("Đang đối chiếu dữ liệu demo…"),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getAllByRole("article").at(-1)!).getByText(
        /DP-DD-NU-XXL, kho trung tâm/,
      ),
    ).toBeVisible();
    expect(f.store.getSnapshot()).toBe(before);
  });
  it("opens an employee source directly at issuance history", async () => {
    const f = offline();
    await open(f.user);
    const result = await ask(f.user, "Lịch sử cấp DEMO-NV-033");
    await f.user.click(within(result).getAllByRole("link")[0]);
    expect(
      await screen.findByRole("dialog", { name: /Nhân viên demo 033/ }),
    ).toBeVisible();
  });
  it("does not open a forbidden employee profile through a manually entered source URL", () => {
    offline("/dong-phuc/nhan-vien?employee=DEMO-NV-001", "employee");
    expect(
      screen.getByText(
        "Hồ sơ nhân viên không khả dụng trong phạm vi được phép.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("preserves history while starting a fresh topic that cannot inherit the prior size context", async () => {
    const f = offline();
    await open(f.user);
    await ask(f.user, "Tồn kho DP-DD-M");
    await f.user.click(screen.getByRole("button", { name: "Chủ đề mới" }));
    const result = await ask(f.user, "Thế cỡ L thì sao?");
    expect(within(result).getByText(/Chưa có ngữ cảnh/)).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
  it("sends with Enter and allows Shift+Enter without a request", async () => {
    const f = online(),
      query = vi
        .spyOn(f.store, "query")
        .mockResolvedValue(f.reply("Tồn kho DP-DD-M", "keyboard-turn"));
    await open(f.user);
    await f.user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Tồn kho DP-DD-M",
    );
    await f.user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(query).not.toHaveBeenCalled();
    await f.user.keyboard("{Enter}");
    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/10 bộ vật lý/)).toBeVisible();
  });
  it("retries a failed follow-up in place using its original conversation parent", async () => {
    const f = online(),
      query = vi
        .spyOn(f.store, "query")
        .mockResolvedValueOnce(f.reply("Tồn kho DP-DD-M", "stock-context"))
        .mockRejectedValueOnce(Error("Sự cố tổng hợp"))
        .mockResolvedValueOnce(
          f.reply("Còn tủ nào trống ở tầng 3?", "locker-context"),
        )
        .mockResolvedValueOnce(f.reply("Tồn kho DP-DD-L", "retry-context"));
    await open(f.user);
    await ask(f.user, "Tồn kho DP-DD-M");
    await ask(f.user, "Thế cỡ L thì sao?");
    await ask(f.user, "Còn tủ nào trống ở tầng 3?");
    await f.user.click(screen.getByRole("button", { name: "Thử tra cứu lại" }));
    await waitFor(() => expect(query).toHaveBeenCalledTimes(4));
    expect(query.mock.calls[3][3]?.replyTo).toBe("stock-context");
    await waitFor(() =>
      expect(
        screen.queryByText("Đang đối chiếu dữ liệu demo…"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
  it("forces a new server topic after a failed reset instead of silently reusing old memory", async () => {
    const f = online(),
      query = vi
        .spyOn(f.store, "query")
        .mockResolvedValue(f.reply("Tồn kho DP-DD-M", "old-context"));
    vi.spyOn(f.store, "clearConversation").mockRejectedValue(
      Error("offline fixture"),
    );
    await open(f.user);
    await ask(f.user, "Tồn kho DP-DD-M");
    await f.user.click(screen.getByRole("button", { name: "Xóa hội thoại" }));
    expect(
      await screen.findByText(/Lượt hỏi tiếp theo sẽ bắt đầu chủ đề mới/),
    ).toBeVisible();
    await ask(f.user, "Tồn kho DP-DD-M");
    expect(query.mock.calls[1][3]).toMatchObject({ resetContext: true });
    expect(query.mock.calls[1][3]?.replyTo).toBeUndefined();
  });
});
