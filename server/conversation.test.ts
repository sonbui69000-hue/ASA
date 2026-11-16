// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { StateRepository } from "./state";
import { Sessions, hashCredential } from "./auth";
import { AssistantService } from "./assistant";
import { UsageLedger } from "./usage";
import { createApplication } from "./app";
import type { Transport, Completion, Message } from "./openrouter";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { force: true, recursive: true })),
  );
});
const config = {
  apiKey: "synthetic-key",
  model: "synthetic/model",
  problem: null,
};
const usage = { promptTokens: 10, completionTokens: 10, cost: 0 };
const call = (name: string, args: unknown): Completion => ({
  generationId: "synthetic",
  usage,
  message: {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id: "synthetic-call",
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  },
});
async function setup(mode: "normal" | "wrong-context" = "normal") {
  const dir = await mkdtemp(path.join(os.tmpdir(), "asa-conversation-"));
  dirs.push(dir);
  const repo = await StateRepository.open(dir),
    credential = hashCredential("synthetic-code"),
    sessions = new Sessions(
      Object.fromEntries(
        repo.snapshot().accounts.map((a) => [a.id, credential]),
      ),
    ),
    prompts: Message[][] = [];
  const transport: Transport = {
    capabilities: async () => ({
      tools: true,
      structured: true,
      promptPrice: 0,
      completionPrice: 0,
      maxParameter: "max_tokens",
    }),
    complete: vi.fn(
      async (
        messages: Message[],
        _tools: unknown[],
        _final: boolean,
        _signal: AbortSignal,
        schema?: Record<string, unknown>,
      ): Promise<Completion> => {
        prompts.push(structuredClone(messages));
        const last = messages.at(-1)!;
        if (last.role === "tool")
          return {
            generationId: "synthetic",
            usage,
            message: {
              role: "assistant",
              content: JSON.stringify({
                resultIds: messages
                  .filter((m) => m.role === "tool")
                  .map((m) => JSON.parse(m.content!).resultId),
              }),
            },
          };
        const input = JSON.parse(last.content!);
        if (schema) {
          const e = input.EVIDENCE_UNTRUSTED[0];
          return {
            generationId: "synthetic-doc",
            usage,
            message: {
              role: "assistant",
              content: JSON.stringify({
                insufficientEvidence: false,
                claims: [
                  {
                    text: e.text.slice(0, 600),
                    evidenceIds: [e.evidenceId],
                    quotes: [{ evidenceId: e.evidenceId, quote: e.text }],
                  },
                ],
              }),
            },
          };
        }
        const c = input.interpretedFilters,
          p = c.parameters;
        if (mode === "wrong-context")
          return call("search_uniform_inventory", { code: "DP-DD-M" });
        if (c.intent === "LOCKER_AVAILABILITY")
          return call("search_available_lockers", { floor: p.floor });
        if (c.intent === "PURCHASE_STATUS")
          return call("get_purchase_requests", {
            status: p.purchaseStatus || "pending",
          });
        if (
          ["DOCUMENT_QUESTION", "DOCUMENT_SEARCH", "UNIFORM_POLICY"].includes(
            c.intent,
          )
        )
          return call("search_internal_documents", {
            query: p.documentQuery || input.question,
          });
        return call(
          "search_uniform_inventory",
          p.productCode
            ? { code: p.productCode }
            : { category: p.category, size: p.size, gender: p.gender },
        );
      },
    ),
  };
  const service = new AssistantService(
      repo,
      sessions,
      transport,
      config,
      await UsageLedger.open(path.join(dir, "usage.json")),
    ),
    session = sessions.login(
      "buyer",
      "synthetic-code",
      repo.snapshot(),
      "test",
    );
  const query = (
    question: string,
    options: {
      requestId?: string;
      replyTo?: string;
      resetContext?: boolean;
    } = {},
  ) =>
    service.query(
      session,
      question,
      repo.ref(),
      undefined,
      AbortSignal.timeout(10000),
      options,
    );
  return {
    repo,
    sessions,
    session,
    service,
    transport,
    query,
    prompts,
    app: createApplication(repo, sessions, service, true),
  };
}
describe("Server-owned conversation branches and safe clarification", () => {
  it("does not spend a model call guessing an orphaned bare size after a new topic", async () => {
    const f = await setup();
    await f.query("Tồn kho DP-DD-M");
    const before = vi.mocked(f.transport.complete).mock.calls.length;
    const reply = await f.query("XL", { resetContext: true });
    expect(reply.answer.status).toBe("missing");
    expect(reply.answer.evidence).toEqual([]);
    expect(vi.mocked(f.transport.complete).mock.calls.length).toBe(before);
  });
  it("remembers the actual resolved tool intent instead of an unsupported fallback interpretation", async () => {
    const f = await setup("wrong-context"),
      r = await f.query("Bạn xem giúp bộ trang phục đang có nhé", {
        requestId: "actual-tool-context",
      });
    expect(r.answer.intent).toBe("UNIFORM_INVENTORY");
    expect(r.answer.parameters).toMatchObject({
      productCode: "DP-DD-M",
      category: "nurse",
      size: "M",
    });
    expect(f.session.lastContext?.intent).toBe("UNIFORM_INVENTORY");
    expect(r.contextId).toBe("actual-tool-context");
  });
  it("refines the original product even when the model repeats the previous SKU", async () => {
    const f = await setup("wrong-context"),
      first = await f.query("Tồn kho DP-DD-M", { requestId: "stock-parent" });
    const next = await f.query("Thế cỡ L thì sao?", {
      replyTo: first.contextId,
    });
    expect(next.answer.parameters.size).toBe("L");
    expect(next.answer.evidence[0].title).toBe("DP-DD-L");
    expect(next.answer.text).not.toContain("DP-DD-M,");
  });
  it("selects the original branch for a retry after the user changes modules", async () => {
    const f = await setup(),
      first = await f.query("Tồn kho DP-DD-M", {
        requestId: "original-inventory",
      });
    await f.query("Còn tủ nào trống ở tầng 3?", {
      requestId: "locker-topic",
      replyTo: first.contextId,
    });
    const retry = await f.query("Thế cỡ L thì sao?", {
      replyTo: first.contextId,
    });
    expect(retry.answer.intent).toBe("UNIFORM_INVENTORY");
    expect(retry.answer.evidence[0].title).toBe("DP-DD-L");
  });
  it("retains pending-purchase context through the Vietnamese uniform follow-up", async () => {
    const f = await setup(),
      first = await f.query("Có đơn mua nào đang chờ phê duyệt?", {
        requestId: "pending-purchases",
      });
    const next = await f.query("Đơn nào liên quan đến đồng phục?", {
      replyTo: first.contextId,
    });
    expect(next.answer.parameters.purchaseStatus).toBe("pending");
    expect(next.answer.intent).toBe("PURCHASE_STATUS");
    expect(next.answer.evidence.map((e) => e.recordId)).toEqual(
      first.answer.evidence.map((e) => e.recordId),
    );
  });
  it("clears old questions from the model prompt when explicitly changing modules", async () => {
    const f = await setup(),
      first = await f.query("Tồn kho DP-DD-M", { requestId: "uniform-topic" });
    await f.query("Còn tủ nào trống ở tầng 3?", { replyTo: first.contextId });
    const initial = f.prompts.find(
      (m) => m.at(-1)?.role === "user" && m.at(-1)!.content!.includes("Còn tủ"),
    )!;
    expect(initial).toHaveLength(2);
    expect(JSON.parse(initial.at(-1)!.content!).previousContext).toBeNull();
  });
  it("does not borrow another session's conversation token or guess a missing context", async () => {
    const f = await setup();
    const first = await f.query("Tồn kho DP-DD-M", {
      requestId: "private-parent",
    });
    const other = f.sessions.login(
      "employee",
      "synthetic-code",
      f.repo.snapshot(),
      "other",
    );
    const result = await f.service.query(
      other,
      "Thế cỡ L thì sao?",
      f.repo.ref(),
      undefined,
      AbortSignal.timeout(1000),
      { replyTo: first.contextId },
    );
    expect(result.answer.status).toBe("missing");
    expect(result.answer.evidence).toEqual([]);
  });
  it("starts a new topic without reusing filters or calling the model for an orphaned fragment", async () => {
    const f = await setup();
    await f.query("Tồn kho DP-DD-M");
    const count = vi.mocked(f.transport.complete).mock.calls.length;
    const next = await f.query("Thế cỡ L thì sao?", { resetContext: true });
    expect(next.answer.status).toBe("missing");
    expect(vi.mocked(f.transport.complete).mock.calls.length).toBe(count);
  });
  it("preserves source record/version/section on a document follow-up", async () => {
    const f = await setup(),
      first = await f.query("Thời hạn giao hàng trong hợp đồng An Tâm là gì?", {
        requestId: "doc-topic",
      });
    const next = await f.query("Cho tôi xem điều khoản liên quan.", {
      replyTo: first.contextId,
    });
    expect(
      next.answer.evidence.some(
        (e) => e.recordId === "DEMO-TL-004" && e.sectionId === "muc-2",
      ),
    ).toBe(true);
  });
  it("never silently mutates business state for an approval request", async () => {
    const f = await setup(),
      before = f.repo.ref();
    const answer = await f.query("Hãy phê duyệt DEMO-YC-001");
    expect(answer.answer.status).toBe("confirmation");
    expect(f.repo.ref()).toEqual(before);
    expect(f.transport.complete).not.toHaveBeenCalled();
  });
  it("clears bounded server contexts on reset and retains only question/filter metadata", async () => {
    const f = await setup();
    await f.query("Tồn kho DP-DD-M", { requestId: "stored-context" });
    const stored = JSON.stringify([...f.session.contexts!.values()]);
    expect(stored).not.toContain("vật lý");
    expect(stored).not.toContain(config.apiKey);
    const response = await f.app(
      new Request("http://127.0.0.1:8080/api/assistant/conversation", {
        method: "DELETE",
        headers: {
          Origin: "http://127.0.0.1:8080",
          Cookie: "asa_session=" + f.session.token,
          "X-CSRF-Token": f.session.csrf,
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(f.session.contexts!.size).toBe(0);
    expect(f.session.lastContext).toBeUndefined();
  });
});
