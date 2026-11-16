import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createSeed } from "../data/seed";
import { DocumentsPage } from "../features/documents";
import { DemoProvider } from "../app/context";
import { RemoteStore } from "../online/client";
import { projectView } from "../../server/views";
import { keywordSearch } from "../../server/rag/retrieval";
import { account } from "../domain/selectors";
import { Assistant } from "../features/assistant";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  let state = createSeed();
  const actor = account(state, "buyer");
  const ref = () => ({
    workspaceId: "synthetic-ui-rag",
    revision: state.revision,
  });
  const store = new RemoteStore(
    projectView(state, actor.id, ref()),
    "synthetic-csrf",
    actor.id,
    vi.fn(),
    vi.fn(),
  );
  const e = keywordSearch(state, actor, ref(), "Thời hạn giao hàng", {
    documentId: "DEMO-TL-004",
    limit: 1,
  }).passages[0];
  const fetcher = vi.fn(async (route: string, options?: RequestInit) => {
    if (route === "/api/views/application")
      return Response.json(projectView(state, actor.id, ref()));
    if (route === "/api/documents/search") {
      const input = JSON.parse(options!.body as string);
      return Response.json({
        ...keywordSearch(state, actor, ref(), input.query, input),
        stateRef: ref(),
      });
    }
    if (route.startsWith("/api/documents/")) {
      if (state.documents[3].status !== "published")
        return Response.json(
          { error: { code: "UNAVAILABLE", message: "Nguồn đã thu hồi." } },
          { status: 404 },
        );
      return Response.json({
        ...state.documents[3],
        original: "",
        highlight: {
          sectionId: e.sectionId,
          sourceStart: e.sourceStart,
          sourceEnd: e.sourceEnd,
          contentHash: e.contentHash,
        },
      });
    }
    if (route === "/api/assistant/query")
      return Response.json({
        mode: "llm",
        generationMode: "grounded",
        retrievalMode: "keyword",
        semanticStatus: "semantic_unavailable",
        reason: null,
        stateRef: ref(),
        usage: { calls: 2, promptTokens: 20, completionTokens: 20, cost: 0 },
        answer: {
          intent: "DOCUMENT_QUESTION",
          parameters: {},
          text: "Thời hạn giao hàng mẫu là 10 ngày làm việc. [1]",
          status: "answered",
          evidence: [e],
          suggestions: [],
        },
      });
    throw Error("Unexpected fixture route");
  });
  vi.stubGlobal("fetch", fetcher);
  function App({ assistant = false }: { assistant?: boolean }) {
    return (
      <DemoProvider store={store}>
        <MemoryRouter initialEntries={["/tai-lieu"]}>
          <Routes>
            <Route path="/tai-lieu/:id?" element={<DocumentsPage />} />
          </Routes>
          {assistant && <Assistant />}
        </MemoryRouter>
      </DemoProvider>
    );
  }
  return {
    App,
    store,
    fetcher,
    e,
    user: userEvent.setup(),
    revoke: () => {
      state = {
        ...state,
        revision: state.revision + 1,
        documents: state.documents.map((d) =>
          d.id === e.recordId ? { ...d, status: "revoked" } : d,
        ),
      };
    },
  };
}
describe("Online document RAG interface", () => {
  it("searches via the authenticated service and opens a citation at the exact highlighted section", async () => {
    const f = setup();
    render(<f.App />);
    await f.user.type(
      screen.getByLabelText("Tìm tài liệu bằng câu hỏi hoặc từ khóa"),
      "Thời hạn giao hàng",
    );
    await screen.findByText(
      "Truy xuất từ khóa • Mô hình ngữ nghĩa chưa khả dụng",
    );
    await f.user.click(
      screen.getByRole("button", {
        name: "Hợp đồng cung cấp đồng phục An Tâm",
      }),
    );
    await screen.findByRole("dialog", {
      name: "Hợp đồng cung cấp đồng phục An Tâm",
    });
    await waitFor(() =>
      expect(document.querySelector("mark")).toHaveTextContent(
        "10 ngày làm việc",
      ),
    );
    expect(
      f.fetcher.mock.calls.some(([route]) => route.includes("&chunk=")),
    ).toBe(true);
    const searchCall = f.fetcher.mock.calls.find(
      ([route]) => route === "/api/documents/search",
    )!;
    expect(searchCall[1]?.headers).toMatchObject({
      "X-CSRF-Token": "synthetic-csrf",
    });
    expect(JSON.parse(searchCall[1]?.body as string)).not.toHaveProperty(
      "actorId",
    );
  });
  it("invalidates shown source text immediately when a new server revision withdraws it", async () => {
    const f = setup();
    render(<f.App />);
    await f.user.type(
      screen.getByLabelText("Tìm tài liệu bằng câu hỏi hoặc từ khóa"),
      "Thời hạn giao hàng",
    );
    await screen.findByText(
      "Truy xuất từ khóa • Mô hình ngữ nghĩa chưa khả dụng",
    );
    await f.user.click(
      screen.getByRole("button", {
        name: "Hợp đồng cung cấp đồng phục An Tâm",
      }),
    );
    await waitFor(() =>
      expect(document.querySelector("mark")).toHaveTextContent(
        "10 ngày làm việc",
      ),
    );
    f.revoke();
    await f.store.refresh();
    await waitFor(() => expect(document.querySelector("mark")).toBeNull());
    expect(
      await screen.findByText(
        /Không có quyền truy cập hoặc nguồn không còn hiệu lực/,
      ),
    ).toBeVisible();
  });
  it("labels grounded generation separately from retrieval and renders record/version/section source identifiers", async () => {
    const f = setup();
    render(<f.App assistant />);
    await f.user.click(screen.getByRole("button", { name: "Trợ lý demo" }));
    await f.user.type(
      screen.getByLabelText("Câu hỏi cho trợ lý"),
      "Hợp đồng giao hàng sau bao lâu?",
    );
    await f.user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    expect(await screen.findByText(/Trả lời AI có nguồn/)).toBeVisible();
    expect(
      screen.getByText(/DEMO-TL-004 • v1 • 2. Hàng hóa và giao nhận/),
    ).toBeVisible();
    const source = screen.getByRole("link", {
      name: /Hợp đồng cung cấp đồng phục An Tâm/,
    });
    expect(source).toHaveAttribute("href", f.e.href);
  });
});
