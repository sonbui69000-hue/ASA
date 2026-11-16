import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { createSeed } from "../data/seed";
import { execute } from "../domain/commands";
import { answerQuery } from "../domain/assistant";
import { account } from "../domain/selectors";
import { projectView } from "../../server/views";
import { DemoProvider, useDemo } from "../app/context";
import { RemoteStore } from "../online/client";
import { Assistant } from "../features/assistant";
import { Modal } from "../components/shared";
import type { AssistantReply } from "../online/protocol";
afterEach(() => vi.unstubAllGlobals());
function setup() {
  let state = createSeed();
  const ref = () => ({
    workspaceId: "synthetic-online",
    revision: state.revision,
  });
  const store = new RemoteStore(
    projectView(state, "warehouse", ref()),
    "synthetic-csrf",
    "warehouse",
    vi.fn(),
    vi.fn(),
  );
  const user = userEvent.setup();
  return {
    store,
    user,
    getState: () => state,
    setState: (s: typeof state) => {
      state = s;
    },
    ref,
  };
}
function reply(
  state: ReturnType<typeof createSeed>,
  mode: "llm" | "deterministic" = "llm",
): AssistantReply {
  return {
    answer: answerQuery(state, account(state, "warehouse"), "Tồn kho DP-DD-M"),
    mode,
    reason: mode === "deterministic" ? "AI_UPSTREAM" : null,
    stateRef: { workspaceId: "synthetic-online", revision: state.revision },
    retrievalMode: "keyword",
    usage: { calls: 2, promptTokens: 100, completionTokens: 20, cost: 0.0001 },
  };
}
describe("Online store lifecycle", () => {
  it("restarts polling after a StrictMode-style stop/start", async () => {
    vi.useFakeTimers();
    try {
      const f = setup();
      const http = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ...f.ref(), principalId: "warehouse" }),
          ),
      );
      vi.stubGlobal("fetch", http);
      f.store.start();
      f.store.stop();
      f.store.start();
      await vi.advanceTimersByTimeAsync(2100);
      expect(http).toHaveBeenCalledTimes(1);
      f.store.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("Online assistant and state connection", () => {
  it("shows the remote result/fallback labels, keeps questions but not answers in sessionStorage", async () => {
    const f = setup();
    vi.spyOn(f.store, "query").mockResolvedValue(
      reply(f.getState(), "deterministic"),
    );
    render(
      <MemoryRouter>
        <DemoProvider store={f.store}>
          <Assistant />
        </DemoProvider>
      </MemoryRouter>,
    );
    await f.user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await f.user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Tồn kho DP-DD-M",
    );
    await f.user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    expect(
      await screen.findByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tra cứu xác định \(dự phòng\)/),
    ).toBeInTheDocument();
    const history = sessionStorage.getItem("asa-demo-chat:v1:warehouse")!;
    expect(history).toContain("Tồn kho DP-DD-M");
    expect(history).not.toContain("vật lý");
    expect(JSON.stringify(localStorage)).not.toContain("synthetic-csrf");
    expect(JSON.stringify(localStorage)).not.toContain("original");
  });
  it("hides old answers on commit without replaying chat; explicit retry queries fresh data", async () => {
    const f = setup();
    const query = vi
      .spyOn(f.store, "query")
      .mockImplementation(async () => reply(f.getState()));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        const input = JSON.parse(options.body);
        f.setState(
          execute(f.getState(), "warehouse", input.command, input.operationId),
        );
        return new Response(
          JSON.stringify(projectView(f.getState(), "warehouse", f.ref())),
          { status: 200 },
        );
      }),
    );
    render(
      <MemoryRouter>
        <DemoProvider store={f.store}>
          <Assistant />
        </DemoProvider>
      </MemoryRouter>,
    );
    await f.user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await f.user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Tồn kho DP-DD-M",
    );
    await f.user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await screen.findByText(/10 bộ vật lý/);
    await f.store.dispatch("warehouse", {
      type: "stock.adjust",
      skuId: "SKU-1-1",
      warehouse: "TT",
      price: 300000,
      quantity: 2,
      reason: "Kiểm kê tổng hợp",
    });
    await screen.findByText(/Dữ liệu hoặc phiên đã thay đổi/);
    expect(screen.queryByText(/10 bộ vật lý/)).not.toBeInTheDocument();
    expect(query).toHaveBeenCalledTimes(1);
    await f.user.click(screen.getByRole("button", { name: "Thử tra cứu lại" }));
    await screen.findByText(/12 bộ vật lý/);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("cancels an in-flight request and ignores a late answer while preserving the question", async () => {
    const f = setup();
    let resolve!: (value: AssistantReply) => void;
    vi.spyOn(f.store, "query").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(
      <MemoryRouter>
        <DemoProvider store={f.store}>
          <Assistant />
        </DemoProvider>
      </MemoryRouter>,
    );
    await f.user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await f.user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Tồn kho DP-DD-M",
    );
    await f.user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await f.user.click(screen.getByRole("button", { name: "Hủy tra cứu" }));
    resolve(reply(f.getState()));
    await waitFor(() =>
      expect(screen.queryByText(/10 bộ vật lý/)).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText("Tồn kho DP-DD-M", { selector: ".chat-question" }),
    ).toBeInTheDocument();
  });
  it("retains the operation ID after an uncertain network outcome and never changes the cached quantities optimistically", async () => {
    const f = setup();
    const http = vi
      .fn()
      .mockRejectedValueOnce(Error("network"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(projectView(f.getState(), "warehouse", f.ref())),
        ),
      );
    vi.stubGlobal("fetch", http);
    const c = {
      type: "stock.adjust" as const,
      skuId: "SKU-1-1",
      warehouse: "TT",
      price: 1,
      quantity: 1,
      reason: "Kiểm kê tổng hợp",
    };
    await expect(f.store.dispatch("warehouse", c)).rejects.toThrow(
      "Không kết nối",
    );
    expect(f.store.getSnapshot().readModel.stocks["SKU-1-1|TT"].physical).toBe(
      10,
    );
    await f.store.dispatch("warehouse", c);
    const first = JSON.parse(http.mock.calls[0][1].body),
      second = JSON.parse(http.mock.calls[1][1].body);
    expect(first.operationId).toBe(second.operationId);
    expect(first).not.toHaveProperty("actorId");
    expect(first).not.toHaveProperty("role");
  });
  it("awaits server confirmation and keeps the form open on failure without a success toast", async () => {
    const f = setup();
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    );
    function Form() {
      const { act } = useDemo();
      return (
        <Modal
          open
          onOpenChange={() => {}}
          title="Xác nhận thao tác máy chủ"
          onSubmit={() =>
            act({
              type: "stock.adjust",
              skuId: "SKU-1-1",
              warehouse: "TT",
              quantity: 1,
              price: 1,
              reason: "Kiểm kê tổng hợp",
            })
          }
        >
          <p>Dữ liệu tổng hợp</p>
        </Modal>
      );
    }
    render(
      <DemoProvider store={f.store}>
        <Form />
      </DemoProvider>,
    );
    await f.user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(screen.getByRole("button", { name: "Đang xử lý…" })).toBeDisabled();
    resolve(
      new Response(
        JSON.stringify({
          error: {
            code: "BUSINESS_RULE",
            message: "Không đủ quyền thực hiện.",
          },
        }),
        { status: 422 },
      ),
    );
    await screen.findByText("Không đủ quyền thực hiện.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/Đã lưu thay đổi/)).not.toBeInTheDocument();
  });
});
