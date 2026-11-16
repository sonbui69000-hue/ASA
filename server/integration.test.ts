// @vitest-environment node
import { legacyState } from "../tests/helpers/legacy-state";
import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSeed } from "../src/data/seed";
import { account, stock, availableLockers } from "../src/domain/selectors";
import { execute, type Command } from "../src/domain/commands";
import {
  registry,
  dispatchTool,
  toolDefinitions,
  type ToolContext,
} from "./tools";
import { StateRepository } from "./state";
import { Sessions, hashCredential, provisionCredentials } from "./auth";
import { createApplication } from "./app";
import { AssistantService } from "./assistant";
import {
  configFromEnv,
  OpenRouterTransport,
  type Transport,
  type Completion,
} from "./openrouter";
import { projectView } from "./views";
import { UsageLedger } from "./usage";
import { ApiError } from "./errors";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function directory() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "asa-ai-"));
  directories.push(dir);
  return dir;
}
const fakeKey = "synthetic-test-key-never-a-real-secret";
const config = {
  apiKey: fakeKey,
  model: "synthetic/configured-model",
  problem: null,
};
const usage = { promptTokens: 100, completionTokens: 20, cost: 0.0001 };
const complete = (content: string): Completion => ({
  generationId: "synthetic-generation",
  message: { role: "assistant", content },
  usage,
});
const call = (name: string, args: unknown, id = "call-1"): Completion => ({
  ...complete(""),
  message: {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  },
});
function transport(sequence: Completion[]): Transport {
  return {
    capabilities: vi.fn(async () => ({
      tools: true,
      structured: true,
      promptPrice: 0.0000001,
      completionPrice: 0.0000002,
      maxParameter: "max_tokens" as const,
    })),
    complete: vi.fn(async () => {
      const value = sequence.shift();
      if (!value) throw new Error("No synthetic completion");
      return value;
    }),
  };
}
async function fixture(
  options: {
    state?: ReturnType<typeof createSeed>;
    transport?: Transport;
    disabled?: boolean;
  } = {},
) {
  const dir = await directory(),
    repo = await StateRepository.open(dir, options.state || createSeed());
  const testCredential = hashCredential("synthetic-access-code");
  const credentials = Object.fromEntries(
    repo.snapshot().accounts.map((a) => [a.id, testCredential]),
  );
  const sessions = new Sessions(credentials);
  const t =
    options.transport ||
    transport([
      call("search_uniform_inventory", { code: "DP-DD-M" }),
      complete('{"resultIds":["result-0"]}'),
    ]);
  const ai = new AssistantService(
    repo,
    sessions,
    t,
    options.disabled
      ? { ...config, problem: "Thiếu OPENROUTER_API_KEY" }
      : config,
    await UsageLedger.open(path.join(dir, "usage.json")),
  );
  const app = createApplication(repo, sessions, ai, !options.disabled);
  const request = (
    route: string,
    method = "GET",
    data?: unknown,
    auth?: { cookie: string; csrf: string },
    extra: Record<string, string> = {},
  ) =>
    app(
      new Request("http://127.0.0.1:8080" + route, {
        method,
        headers: {
          ...(method !== "GET"
            ? {
                "Content-Type": "application/json",
                Origin: "http://127.0.0.1:8080",
              }
            : {}),
          ...(auth ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrf } : {}),
          ...extra,
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }),
    );
  async function login(id = "hc") {
    const response = await request("/api/session", "POST", {
      accountId: id,
      credential: "synthetic-access-code",
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    return {
      cookie: response.headers.get("set-cookie")!.split(";")[0],
      csrf: json.csrf,
      view: json.view,
    };
  }
  const query = async (
    auth: Awaited<ReturnType<typeof login>>,
    question = "Tồn kho DP-DD-M",
  ) =>
    request(
      "/api/assistant/query",
      "POST",
      {
        question,
        expectedStateRef: repo.ref(),
        requestId: "synthetic-request",
      },
      auth,
    );
  return { dir, repo, sessions, t, ai, app, request, login, query };
}
function ctx(actor = "hc", s = createSeed()): ToolContext {
  return {
    state: s,
    actor: account(s, actor),
    ref: { workspaceId: "synthetic-workspace", revision: s.revision },
    evidence: new Map(),
  };
}
describe("Validated read-only tools", () => {
  it("resolves mixed-case PO and archived document IDs without changing canonical source IDs", () => {
    const c = ctx("buyer"),
      po = c.state.orders[0];
    expect(
      dispatchTool(
        "get_purchase_order_status",
        { orderId: po.id.toUpperCase() },
        c,
      ).evidence[0].recordId,
    ).toBe(po.id);
    expect(
      dispatchTool("get_goods_receipts", { orderId: po.id.toUpperCase() }, c)
        .evidence.length,
    ).toBeGreaterThan(0);
    c.state = execute(
      c.state,
      "docs",
      { type: "document.version", id: "DEMO-TL-002" },
      "case-version",
    );
    expect(
      dispatchTool("get_document_metadata", { documentId: "DEMO-TL-002-V2" }, c)
        .data,
    ).toMatchObject({ id: "DEMO-TL-002-v2", version: 2 });
    expect(
      dispatchTool(
        "get_document_metadata",
        { documentId: "demo-tl-004" },
        { ...c, actor: account(c.state, "employee") },
      ).status,
    ).toBe("unavailable");
  });
  it("has unique stable names and closed JSON schemas", () => {
    expect(registry.length).toBe(17);
    expect(new Set(registry.map((t) => t.name)).size).toBe(registry.length);
    expect(
      toolDefinitions.every(
        (t) => t.type === "function" && !!t.function.parameters,
      ),
    ).toBe(true);
  });
  it.each(registry.map((t) => [t.name]))("%s rejects unknown keys", (name) => {
    expect(() => dispatchTool(name, { role: "sysadmin" }, ctx())).toThrow(
      ApiError,
    );
  });
  it("validates quantities/sizes/ID versus code and refuses unknown tools", () => {
    expect(() => dispatchTool("approve", {}, ctx())).toThrow();
    expect(() =>
      dispatchTool(
        "search_uniform_inventory",
        { code: "DP-DD-M", limit: 999 },
        ctx(),
      ),
    ).toThrow();
    expect(() =>
      dispatchTool("search_uniform_inventory", { size: "4XL" }, ctx()),
    ).toThrow();
    expect(
      dispatchTool("search_uniform_inventory", { code: "DP-DD-M" }, ctx()).text,
    ).toContain("10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng");
    expect(
      dispatchTool(
        "find_uniform_product",
        { gender: "female", size: "2XL" },
        ctx(),
      ).data,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ size: "XXL" })]),
    );
  });
  it("does not substitute unknown products or out-of-scope employee IDs", () => {
    expect(
      dispatchTool("search_uniform_inventory", { code: "DP-NO-SUCH" }, ctx())
        .status,
    ).toBe("unavailable");
    expect(
      dispatchTool(
        "get_employee_issuance_history",
        { employeeId: "DEMO-NV-001" },
        ctx("employee"),
      ).status,
    ).toBe("unavailable");
  });
  it("asks for an ambiguous employee without selecting self or a hidden employee", () => {
    const s = createSeed();
    s.employees[30].name = "Nhân viên mẫu trùng";
    s.employees[31].name = "Nhân viên mẫu trùng";
    const result = dispatchTool(
      "resolve_employee",
      { name: "Nhân viên mẫu trùng" },
      ctx("hc", s),
    );
    expect(result.status).toBe("ambiguous");
    expect(result.evidence.map((e) => e.recordId)).toEqual([
      "DEMO-NV-031",
      "DEMO-NV-032",
    ]);
    expect(
      dispatchTool(
        "resolve_employee",
        { name: "Nhân viên mẫu trùng" },
        ctx("employee", s),
      ).status,
    ).toBe("unavailable");
  });
  it("reads policy/commitments without mutating state and does not restore quota on return", () => {
    const c = ctx(),
      before = JSON.stringify(c.state);
    const r = dispatchTool(
      "check_uniform_eligibility",
      { employeeId: "DEMO-NV-031", quantity: 2 },
      c,
    );
    expect(r.text).toContain("còn 1 bộ");
    expect(r.text).toContain("ngoại lệ");
    expect(JSON.stringify(c.state)).toBe(before);
  });
  it("distinguishes zero inventory from a missing record and denies unknown warehouse/scope", () => {
    expect(
      dispatchTool(
        "search_uniform_inventory",
        { code: "DP-DD-M", warehouse: "NOI" },
        ctx(),
      ).text,
    ).toContain("0 bộ vật lý");
    expect(() =>
      dispatchTool(
        "search_uniform_inventory",
        { code: "DP-DD-M", warehouse: "EVIL" },
        ctx(),
      ),
    ).toThrow();
    expect(
      dispatchTool(
        "search_uniform_inventory",
        { code: "DP-DD-M", departmentId: "NGOAI" },
        ctx("employee"),
      ).status,
    ).toBe("unavailable");
  });
  it("filters documents before retrieval and does not reveal original/draft/revoked content", () => {
    const c = ctx("employee");
    expect(
      dispatchTool("get_document_metadata", { documentId: "DEMO-TL-004" }, c)
        .status,
    ).toBe("unavailable");
    expect(
      dispatchTool("search_internal_documents", { query: "DEMO-TL-004" }, c)
        .evidence,
    ).toEqual([]);
    for (const id of ["DEMO-TL-006", "DEMO-TL-007", "DEMO-TL-008"])
      expect(
        dispatchTool("get_document_metadata", { documentId: id }, c).status,
      ).toBe("unavailable");
    expect(
      dispatchTool("get_document_passages", { evidenceIds: ["made-up"] }, c)
        .status,
    ).toBe("unavailable");
  });
  it("retrieves exact permitted passages and rejects a source after revocation", () => {
    const c = ctx("buyer");
    const r = dispatchTool(
      "search_internal_documents",
      { query: "Thời hạn giao hàng trong hợp đồng An Tâm là gì?" },
      c,
    );
    expect(r.evidence.some((e) => e.passage.includes("10 ngày làm việc"))).toBe(
      true,
    );
    const ids = [...c.evidence.keys()];
    expect(
      dispatchTool("get_document_passages", { evidenceIds: ids }, c).evidence
        .length,
    ).toBeGreaterThan(0);
    c.state.documents.find((d) => d.id === "DEMO-TL-004")!.status = "revoked";
    expect(
      dispatchTool("get_document_passages", { evidenceIds: ids }, c).status,
    ).toBe("unavailable");
  });
  it("retrieves purchase order, receipts, mappings and allocation history from actual services", () => {
    const c = ctx("buyer"),
      po = c.state.orders[0];
    expect(
      dispatchTool("get_purchase_order_status", { orderId: po.id }, c).text,
    ).toContain("đã nhận");
    expect(
      dispatchTool("get_goods_receipts", { orderId: po.id }, c).evidence.length,
    ).toBeGreaterThan(0);
    expect(
      dispatchTool("get_supplier_candidates", { skuId: "SKU-1-1" }, c).text,
    ).toContain("không phải xác suất");
    expect(
      dispatchTool(
        "get_locker_assignments",
        { lockerId: c.state.lockers[0].id, includeHistory: true },
        c,
      ).status,
    ).toBe("ok");
    expect(
      dispatchTool(
        "get_purchase_order_status",
        { orderId: po.id },
        ctx("employee"),
      ).status,
    ).toBe("unavailable");
  });
});
describe("Server authority, persistence and projections", () => {
  it("does not calculate global stock/quota from filtered rows or accept a view as canonical state", () => {
    const s = createSeed(),
      v = projectView(s, "employee", {
        workspaceId: "x",
        revision: s.revision,
      });
    expect(v.movements).toEqual([]);
    expect(stock(v, "SKU-1-1")).toEqual(stock(s, "SKU-1-1"));
    expect(() =>
      execute(
        v as unknown as typeof s,
        "employee",
        { type: "notifications.read", ids: [] },
        "bad",
      ),
    ).toThrow("DTO");
    expect(v.documents.some((d) => d.id === "DEMO-TL-004")).toBe(false);
    expect(v.documents.every((d) => !d.original)).toBe(true);
  });
  it("masks other employees in grouped requests and withholds mixed-scope PO/receipts", () => {
    const s = createSeed(),
      own = s.accounts.find((a) => a.id === "employee")!.employeeId,
      r = s.uniforms.find((r) => r.status === "reserved")!;
    r.lines.push({ employeeId: own, skuId: r.lines[0].skuId, quantity: 1 });
    const v = projectView(s, "employee", { workspaceId: "x", revision: 0 });
    expect(
      v.uniforms
        .find((x) => x.id === r.id)!
        .lines.every((l) => l.employeeId === own),
    ).toBe(true);
    expect(v.employees.map((e) => e.id)).toEqual([own]);
    expect(v.purchases).toEqual([]);
  });
  it("updates inventory after issuance and receipt and updates locker availability using one state", async () => {
    const f = await fixture({ disabled: true });
    let ref = f.repo.ref();
    await f.repo.command(
      "warehouse",
      { type: "uniform.issue", id: "DEMO-YC-001" },
      "issue-once",
      ref,
    );
    expect(stock(f.repo.snapshot(), "SKU-1-1")).toEqual({
      physical: 8,
      held: 0,
      available: 8,
    });
    const auth = await f.login("warehouse"),
      response = await f.query(auth),
      reply = await response.json();
    expect(reply.mode).toBe("deterministic");
    expect(reply.answer.text).toContain(
      "8 bộ vật lý, 0 bộ đang giữ, 8 bộ khả dụng",
    );
    const count = availableLockers(f.repo.snapshot()).length,
      l = availableLockers(f.repo.snapshot())[0];
    await f.repo.command(
      "hc",
      {
        type: "locker.allocate",
        ids: [l.id],
        employeeIds: ["DEMO-NV-001"],
        departmentId: "",
        reason: "Phân bổ tổng hợp",
        reserve: false,
      },
      "locker-once",
      f.repo.ref(),
    );
    expect(availableLockers(f.repo.snapshot())).toHaveLength(count - 1);
    const g = await fixture();
    const skuId = "SKU-1-1",
      mapping = g.repo.snapshot().mappings.find((m) => m.skuId === skuId)!;
    await g.repo.command(
      "buyer",
      {
        type: "purchase.create",
        lines: [
          {
            skuId,
            quantity: 2,
            purpose: "reserve",
            sourceRequestId: "",
            productId: mapping.productId,
            price: 300000,
          },
        ],
        note: "Mua tổng hợp",
      },
      "purchase-new",
      g.repo.ref(),
    );
    const pr = g.repo.snapshot().purchases.at(-1)!;
    await g.repo.command(
      "buyer",
      { type: "purchase.submit", id: pr.id },
      "purchase-send",
      g.repo.ref(),
    );
    for (const actor of ["hc", "finance", "leader"])
      await g.repo.command(
        actor,
        {
          type: "approve",
          entity: "purchase",
          id: pr.id,
          approved: true,
          reason: "Đã kiểm tra tổng hợp",
        },
        "approve-" + actor,
        g.repo.ref(),
      );
    await g.repo.command(
      "buyer",
      { type: "purchase.order", id: pr.id },
      "purchase-order",
      g.repo.ref(),
    );
    const order = g.repo.snapshot().orders.at(-1)!;
    await g.repo.command(
      "warehouse",
      { type: "receipt", id: order.id, quantities: { [skuId]: 1 } },
      "receipt-once",
      g.repo.ref(),
    );
    expect(stock(g.repo.snapshot(), skuId).physical).toBe(11);
    const warehouse = await g.login("warehouse");
    const receivedReply = await (await g.query(warehouse)).json();
    expect(receivedReply.answer.text).toContain("11 bộ vật lý");
  });
  it("replays operations before stale checks, rejects changed payload/principal and reloads committed state", async () => {
    const f = await fixture(),
      ref = f.repo.ref(),
      command: Command = {
        type: "stock.adjust",
        skuId: "SKU-1-1",
        quantity: 2,
        price: 300000,
        warehouse: "TT",
        reason: "Kiểm kê tổng hợp",
      };
    await f.repo.command("warehouse", command, "operation-one", ref);
    await f.repo.command("warehouse", command, "operation-one", ref);
    expect(stock(f.repo.snapshot(), "SKU-1-1").physical).toBe(12);
    await expect(
      f.repo.command(
        "warehouse",
        { ...command, quantity: 3 },
        "operation-one",
        ref,
      ),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
    await expect(
      f.repo.command("hc", command, "operation-one", ref),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
    const reload = await StateRepository.open(f.dir);
    expect(reload.snapshot()).toEqual(f.repo.snapshot());
  });
  it("rejects stale concurrent commands and does not publish a failed file write", async () => {
    const f = await fixture(),
      ref = f.repo.ref(),
      c: Command = {
        type: "stock.adjust",
        skuId: "SKU-1-1",
        quantity: 1,
        price: 300000,
        warehouse: "TT",
        reason: "Kiểm kê tổng hợp",
      };
    const responses = await Promise.allSettled([
      f.repo.command("warehouse", c, "parallel-one", ref),
      f.repo.command("warehouse", c, "parallel-two", ref),
    ]);
    expect(responses.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const bad = new StateRepository("/unused", createSeed(), async () => {
        throw Error("disk");
      }),
      before = bad.snapshot();
    await expect(
      bad.command("warehouse", c, "failing-write", bad.ref()),
    ).rejects.toMatchObject({ code: "PERSISTENCE" });
    expect(bad.snapshot()).toEqual(before);
  });
  it("reset requires server sysadmin and invalidates workspace even if revision is reused", async () => {
    const f = await fixture(),
      ref = f.repo.ref();
    await expect(f.repo.reset("hc", ref)).rejects.toMatchObject({
      status: 403,
    });
    await f.repo.reset("system", ref);
    expect(f.repo.ref().workspaceId).not.toBe(ref.workspaceId);
  });
});
describe("Additional trust boundaries", () => {
  it("clears server conversation context without changing business state", async () => {
    const oldQuestion = "Tồn kho DP-DD-M trước khi xóa";
    const t = transport([
      call("search_uniform_inventory", { code: "DP-DD-M" }),
      complete('{"resultIds":["result-0"]}'),
      call("get_uniform_policy", {}),
      complete('{"resultIds":["result-0"]}'),
    ]);
    const f = await fixture({ transport: t }),
      auth = await f.login(),
      ref = f.repo.ref();
    await f.query(auth, oldQuestion);
    expect(
      (
        await f.request(
          "/api/assistant/conversation",
          "DELETE",
          undefined,
          auth,
        )
      ).status,
    ).toBe(200);
    await f.query(auth, "Định mức đồng phục mỗi năm?");
    expect(f.repo.ref()).toEqual(ref);
    expect(
      vi
        .mocked(t.complete)
        .mock.calls[2][0].some((m) => m.content?.includes(oldQuestion)),
    ).toBe(false);
  });

  it("imports a known-account legacy subset without merging fresh seed or changing historical prices", async () => {
    const f = await fixture(),
      old = createSeed();
    const removable = old.accounts.find(
      (a) =>
        !old.uniforms.some((r) => r.requesterId === a.id) &&
        !old.purchases.some((p) => p.requesterId === a.id),
    )!;
    old.accounts = old.accounts.filter((a) => a.id !== removable.id);
    const price = old.issuances[0].price;
    await f.repo.importSynthetic(legacyState(old));
    expect(f.repo.snapshot().accounts).toHaveLength(old.accounts.length);
    expect(f.repo.snapshot().issuances[0].price).toBe(price);
    expect(f.repo.snapshot().employees[0].gender).toBe("unspecified");
  });

  it("does not bind a legacy operation ID to a new request", async () => {
    const f = await fixture(),
      old = f.repo.snapshot().operations[0];
    expect(old).toBeTruthy();
    await expect(
      f.repo.command(
        "warehouse",
        {
          type: "stock.adjust",
          skuId: "SKU-1-1",
          quantity: 1,
          price: 1,
          warehouse: "TT",
          reason: "Kiểm kê tổng hợp",
        },
        old,
        f.repo.ref(),
      ),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
  });
  it("does not expand from retrieved document content to employee tools", async () => {
    const t = transport([
      call("search_internal_documents", {
        query: "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
      }),
      call("get_employee_issuance_history", { employeeId: "DEMO-NV-031" }),
    ]);
    const f = await fixture({ transport: t }),
      auth = await f.login("buyer");
    const response = await f.query(
      auth,
      "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
    );
    const reply = await response.json();
    expect(reply.mode).toBe("deterministic");
    expect(reply.reason).toBe("AI_TOOL_SCOPE");
    expect(reply.answer.text).not.toContain("Nhân viên demo 031");
  });
});
describe("Authenticated application API", () => {
  it("rejects missing sessions, forged roles, CSRF and foreign origins without exposing secrets", async () => {
    const f = await fixture();
    expect((await f.request("/api/views/application")).status).toBe(401);
    expect(
      (
        await f.request("/api/session", "POST", {
          accountId: "system",
          credential: "wrong",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await f.request("/api/session", "POST", {
          accountId: "employee",
          credential: "synthetic-access-code",
          role: "sysadmin",
        })
      ).status,
    ).toBe(400);
    const auth = await f.login("employee");
    expect(
      (
        await f.request(
          "/api/demo/reset",
          "POST",
          { confirmed: true, expectedStateRef: f.repo.ref() },
          auth,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await f.request("/api/session", "DELETE", undefined, auth, {
          "X-CSRF-Token": "forged",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await f.request("/api/views/application", "GET", undefined, auth, {
          Origin: "https://evil.invalid",
        })
      ).status,
    ).toBe(403);
    const response = await f.request(
      "/api/views/application",
      "GET",
      undefined,
      auth,
    );
    const text = await response.text();
    expect(text).not.toContain(fakeKey);
    expect(text).not.toContain("0900000000");
    expect(text).not.toContain("DEMO-TL-004");
  });
  it("validates commands on the server and ignores no client role/snapshot claim", async () => {
    const f = await fixture(),
      auth = await f.login("employee");
    const ref = f.repo.ref();
    expect(
      (
        await f.request(
          "/api/commands",
          "POST",
          {
            command: {
              type: "stock.adjust",
              skuId: "SKU-1-1",
              quantity: 1,
              price: 1,
              warehouse: "TT",
              reason: "Tổng hợp",
            },
            operationId: "spoof-actor",
            expectedStateRef: ref,
            actorId: "warehouse",
          },
          auth,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request(
          "/api/commands",
          "POST",
          {
            command: {
              type: "stock.adjust",
              skuId: "SKU-1-1",
              quantity: 1,
              price: 1,
              warehouse: "TT",
              reason: "Tổng hợp",
            },
            operationId: "no-permission",
            expectedStateRef: ref,
          },
          auth,
        )
      ).status,
    ).toBe(422);
    expect(f.repo.ref()).toEqual(ref);
  });
  it("uses new inventory in the assistant after an authenticated module command, and logout invalidates cookie", async () => {
    const f = await fixture(),
      auth = await f.login("warehouse");
    const command = {
      type: "stock.adjust",
      skuId: "SKU-1-1",
      quantity: 2,
      price: 300000,
      warehouse: "TT",
      reason: "Kiểm kê tổng hợp",
    };
    expect(
      (
        await f.request(
          "/api/commands",
          "POST",
          {
            command,
            operationId: "actual-ui-command",
            expectedStateRef: f.repo.ref(),
          },
          auth,
        )
      ).status,
    ).toBe(200);
    const response = await f.query(auth);
    expect(response.status).toBe(200);
    const reply = await response.json();
    expect(reply.mode).toBe("llm");
    expect(reply.answer.text).toContain("12 bộ vật lý");
    expect(reply.usage.calls).toBe(2);
    await f.request("/api/session", "DELETE", undefined, auth);
    expect(
      (await f.request("/api/state/ref", "GET", undefined, auth)).status,
    ).toBe(401);
  });
  it("keeps the old published citation readable during drafting, then rejects it after new publication", async () => {
    const f = await fixture(),
      auth = await f.login("employee");
    await f.repo.command(
      "docs",
      { type: "document.version", id: "DEMO-TL-002" },
      "document-version",
      f.repo.ref(),
    );
    expect(
      (
        await f.request(
          "/api/documents/DEMO-TL-002?version=2",
          "GET",
          undefined,
          auth,
        )
      ).status,
    ).toBe(200);
    await f.repo.command(
      "docs",
      { type: "document.review", id: "DEMO-TL-002" },
      "document-review",
      f.repo.ref(),
    );
    await f.repo.command(
      "docs",
      { type: "document.publish", id: "DEMO-TL-002" },
      "document-publish",
      f.repo.ref(),
    );
    expect(
      (
        await f.request(
          "/api/documents/DEMO-TL-002?version=2",
          "GET",
          undefined,
          auth,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await f.request(
          "/api/documents/DEMO-TL-002?version=3",
          "GET",
          undefined,
          auth,
        )
      ).status,
    ).toBe(200);
  });
  it("does not give document metadata to sysadmin without document ACL", async () => {
    const f = await fixture(),
      auth = await f.login("system");
    expect(
      (
        await f.request(
          "/api/documents/DEMO-TL-004?version=1",
          "GET",
          undefined,
          auth,
        )
      ).status,
    ).toBe(404);
    expect(
      (await f.request("/api/export", "GET", undefined, auth)).status,
    ).toBe(404);
  });
  it("provisions per-account credentials without overwriting an existing credential file", async () => {
    const dir = await directory(),
      file = path.join(dir, "credentials.json"),
      s = createSeed();
    const codes = await provisionCredentials(file, s);
    expect(new Set(Object.values(codes)).size).toBe(s.accounts.length);
    expect(await readFile(file, "utf8")).not.toContain(Object.values(codes)[0]);
    await expect(provisionCredentials(file, s)).rejects.toMatchObject({
      code: "ALREADY_PROVISIONED",
    });
  });
});
describe("Bounded orchestration, conversation and fallback", () => {
  it("passes prior user questions as conversation, but no client-supplied assistant/tool messages", async () => {
    const t = transport([
      call("search_available_lockers", { floor: "3" }),
      complete('{"resultIds":["result-0"]}'),
      call("search_available_lockers", { floor: "2" }),
      complete('{"resultIds":["result-0"]}'),
    ]);
    const f = await fixture({ transport: t }),
      auth = await f.login();
    expect(
      (await (await f.query(auth, "Tủ nào ở tầng 3 đang trống?")).json()).answer
        .text,
    ).toContain("tầng 3");
    expect(
      (await (await f.query(auth, "Còn tầng 2 thì sao?")).json()).answer.text,
    ).toContain("tầng 2");
    const messages = vi.mocked(t.complete).mock.calls[2][0];
    expect(
      messages.some((m) => m.role === "user" && m.content?.includes("tầng 3")),
    ).toBe(true);
  });
  it.each([
    "AI_RATE_LIMIT",
    "AI_UPSTREAM",
    "AI_AUTH",
    "AI_CREDIT",
    "AI_MODEL",
    "AI_TIMEOUT",
  ])("safely falls back for %s", async (code) => {
    const t = transport([]);
    vi.mocked(t.complete).mockRejectedValue(
      new ApiError(code, 503, "not rendered"),
    );
    const f = await fixture({ transport: t }),
      auth = await f.login();
    const reply = await (await f.query(auth)).json();
    expect(reply.mode).toBe("deterministic");
    expect(reply.reason).toBe(code);
    expect(reply.answer.text).toContain("10 bộ vật lý");
    expect(reply.usage.cost).toBeNull();
    expect(reply.answer.text).not.toContain("not rendered");
  });
  it("retains deterministic mode for missing config without contacting OpenRouter", async () => {
    const f = await fixture({ disabled: true }),
      auth = await f.login();
    const reply = await (await f.query(auth)).json();
    expect(reply.reason).toBe("AI_CONFIG");
    expect(f.t.complete).not.toHaveBeenCalled();
  });
  it("stops unknown tools, invalid arguments, forged evidence and model prose without mutations", async () => {
    for (const sequence of [
      [call("approve", { id: "DEMO-PR-001" })],
      [call("search_uniform_inventory", { code: "DP-DD-M", role: "sysadmin" })],
      [
        call("search_uniform_inventory", { code: "DP-DD-M" }),
        complete('{"resultIds":["forged"]}'),
      ],
      [complete("Tôi đã duyệt và tạo PO 999")],
    ]) {
      const f = await fixture({ transport: transport(sequence) }),
        auth = await f.login(),
        before = f.repo.snapshot();
      const reply = await (await f.query(auth)).json();
      expect(reply.mode).toBe("deterministic");
      expect(reply.answer.text).not.toContain("PO 999");
      expect(f.repo.snapshot()).toEqual(before);
    }
  });
  it("enforces six calls/two tool rounds/three completions", async () => {
    const first = call("get_uniform_policy", {});
    first.message.tool_calls = Array.from({ length: 6 }, (_, i) => ({
      ...first.message.tool_calls![0],
      id: "call-" + i,
    }));
    const t = transport([first, call("get_uniform_policy", {})]);
    const f = await fixture({ transport: t }),
      auth = await f.login();
    const reply = await (await f.query(auth)).json();
    expect(reply.mode).toBe("deterministic");
    expect(reply.reason).toBe("AI_TOOL_LIMIT");
    expect(t.complete).toHaveBeenCalledTimes(2);
  });
  it("rejects an old answer if data or ACL changes while provider is pending", async () => {
    let release!: (c: Completion) => void;
    const t = transport([]);
    vi.mocked(t.complete).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const f = await fixture({ transport: t }),
      auth = await f.login();
    const pending = f.query(auth);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await f.repo.command(
      "warehouse",
      {
        type: "stock.adjust",
        skuId: "SKU-1-1",
        quantity: 1,
        warehouse: "TT",
        price: 1,
        reason: "Kiểm kê tổng hợp",
      },
      "changed-in-flight",
      f.repo.ref(),
    );
    release(call("search_uniform_inventory", { code: "DP-DD-M" }));
    expect((await pending).status).toBe(409);
  });
  it("stops on ambiguous employees before performing later dependent tools", async () => {
    const s = createSeed();
    s.employees[30].name = "Nhân viên mẫu trùng";
    s.employees[31].name = "Nhân viên mẫu trùng";
    const t = transport([
      call("resolve_employee", { name: "Nhân viên mẫu trùng" }),
    ]);
    const f = await fixture({ state: s, transport: t }),
      auth = await f.login();
    const reply = await (
      await f.query(auth, "Nhân viên mẫu trùng còn được cấp không?")
    ).json();
    expect(reply.answer.status).toBe("ambiguous");
    expect(t.complete).toHaveBeenCalledTimes(0);
    expect(reply.answer.clarification.choices).toHaveLength(2);
  });
});
describe("OpenRouter wire protocol and environment secrecy", () => {
  it("validates exact environment names, no model default and no key in config errors", () => {
    expect(configFromEnv({}).problem).toContain("OPENROUTER_API_KEY");
    expect(configFromEnv({ OPENROUTER_API_KEY: fakeKey }).model).toBe("");
    expect(
      configFromEnv({
        OPENROUTER_API_KEY: fakeKey,
        OPENROUTER_MODEL: "other/configured",
      }).model,
    ).toBe("other/configured");
    expect(
      configFromEnv({
        OPENROUTER_API_KEY: fakeKey,
        OPENROUTER_MODEL: "invalid",
      }).problem,
    ).not.toContain(fakeKey);
  });
  it("sends current model/key only server-side and preserves function/tool_call_id protocol", async () => {
    const seen: { url: string; init?: RequestInit }[] = [];
    const http = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push({ url, init });
      return new Response(
        JSON.stringify(
          url.endsWith("/endpoints")
            ? {
                data: {
                  endpoints: [
                    {
                      supported_parameters: [
                        "tools",
                        "tool_choice",
                        "max_tokens",
                        "response_format",
                      ],
                      pricing: { prompt: "0.0000004", completion: "0.0000016" },
                    },
                  ],
                },
              }
            : {
                id: "generation-test",
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: '{"resultIds":["result-0"]}',
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 12,
                  completion_tokens: 6,
                  cost: 0.0002,
                },
              },
        ),
        { status: 200 },
      );
    }) as typeof fetch;
    const t = new OpenRouterTransport(config, http);
    const response = await t.complete(
      [
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-real",
              type: "function",
              function: { name: "get_uniform_policy", arguments: "{}" },
            },
          ],
        },
        { role: "tool", tool_call_id: "call-real", content: "{}" },
      ],
      toolDefinitions,
      true,
      new AbortController().signal,
    );
    expect(response.usage.cost).toBe(0.0002);
    expect(seen[0].init?.headers).toBeUndefined();
    const body = JSON.parse(seen[1].init!.body as string);
    expect(body.model).toBe(config.model);
    expect(body.messages[1].tool_call_id).toBe("call-real");
    expect(new Headers(seen[1].init!.headers).get("authorization")).toBe(
      "Bearer " + fakeKey,
    );
    expect(seen[1].init?.redirect).toBe("error");
    expect(body.provider.require_parameters).toBe(true);
  });
  it.each([401, 402, 429, 500, 503])(
    "maps HTTP %s without echoing provider response",
    async (status) => {
      const http = vi.fn(async (url: RequestInfo | URL) =>
        String(url).endsWith("/endpoints")
          ? new Response(
              JSON.stringify({
                data: {
                  endpoints: [
                    {
                      supported_parameters: [
                        "tools",
                        "tool_choice",
                        "max_tokens",
                      ],
                      pricing: { prompt: "0", completion: "0" },
                    },
                  ],
                },
              }),
            )
          : new Response(JSON.stringify({ error: { message: fakeKey } }), {
              status,
              headers: { "Retry-After": "2" },
            }),
      ) as typeof fetch;
      const t = new OpenRouterTransport(config, http);
      await expect(
        t.complete([], [], false, new AbortController().signal),
      ).rejects.not.toThrow(fakeKey);
    },
  );
  it("handles malformed responses and HTTP-200 provider errors safely", async () => {
    for (const payload of [{ error: { message: fakeKey } }, { choices: [] }]) {
      const http = vi.fn(
        async (url: RequestInfo | URL) =>
          new Response(
            JSON.stringify(
              String(url).endsWith("/endpoints")
                ? {
                    data: {
                      endpoints: [
                        {
                          supported_parameters: [
                            "tools",
                            "tool_choice",
                            "max_tokens",
                          ],
                          pricing: { prompt: "0", completion: "0" },
                        },
                      ],
                    },
                  }
                : payload,
            ),
          ),
      ) as typeof fetch;
      await expect(
        new OpenRouterTransport(config, http).complete(
          [],
          [],
          false,
          new AbortController().signal,
        ),
      ).rejects.toBeInstanceOf(ApiError);
    }
  });
  it("executes a complete tool conversation through the actual transport and byte/cost limits", async () => {
    let completed = 0;
    const http = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith("/endpoints"))
        return new Response(
          JSON.stringify({
            data: {
              endpoints: [
                {
                  supported_parameters: [
                    "tools",
                    "tool_choice",
                    "max_tokens",
                    "response_format",
                  ],
                  pricing: { prompt: "0.00000044", completion: "0.00000176" },
                },
              ],
            },
          }),
        );
      completed++;
      const message =
        completed === 1
          ? call("search_uniform_inventory", { code: "DP-DD-M" }).message
          : complete('{"resultIds":["result-0"]}').message;
      return new Response(
        JSON.stringify({
          choices: [{ message, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 20, cost: 0.0001 },
        }),
      );
    }) as typeof fetch;
    const f = await fixture({
        transport: new OpenRouterTransport(config, http),
      }),
      auth = await f.login();
    const reply = await (await f.query(auth)).json();
    expect(reply.reason).toBeNull();
    expect(reply.mode).toBe("llm");
    expect(completed).toBe(2);
  });
  it("aborts a provider request on deadline cancellation", async () => {
    const signal = AbortSignal.abort();
    const http = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      init?.signal?.throwIfAborted();
      return new Response();
    }) as typeof fetch;
    await expect(
      new OpenRouterTransport(config, http).capabilities(signal),
    ).rejects.toBeDefined();
  });
});
