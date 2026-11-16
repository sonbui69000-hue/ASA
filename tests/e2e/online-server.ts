// Test-process-only fake OpenRouter transport. All HTTP/session/state/tools remain real.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StateRepository } from "../../server/state";
import { Sessions, hashCredential } from "../../server/auth";
import { AssistantService } from "../../server/assistant";
import { createApplication } from "../../server/app";
import { createHttpServer } from "../../server/http";
import { ApiError } from "../../server/errors";
import type { Transport } from "../../server/openrouter";
const directory = await mkdtemp(path.join(os.tmpdir(), "asa-browser-"));
const repo = await StateRepository.open(directory),
  credential = hashCredential("synthetic-browser-code");
const sessions = new Sessions(
  Object.fromEntries(repo.snapshot().accounts.map((a) => [a.id, credential])),
);
const transport: Transport = {
  capabilities: async () => ({
    tools: true,
    structured: true,
    promptPrice: 0,
    completionPrice: 0,
    maxParameter: "max_tokens",
  }),
  complete: async (messages, _tools, _final, _signal, schema) => {
    const usage = { promptTokens: 10, completionTokens: 10, cost: 0 },
      last = messages.at(-1)!;
    if (schema) {
      const input = JSON.parse(last.content!),
        e = input.EVIDENCE_UNTRUSTED[0];
      return {
        generationId: "test-only-rag",
        usage,
        message: {
          role: "assistant",
          content: JSON.stringify(
            e
              ? {
                  insufficientEvidence: false,
                  claims: [
                    {
                      text: e.text.slice(0, 600),
                      evidenceIds: [e.evidenceId],
                      quotes: [{ evidenceId: e.evidenceId, quote: e.text }],
                    },
                  ],
                }
              : { insufficientEvidence: true, claims: [] },
          ),
        },
      };
    }
    if (last.role === "tool")
      return {
        generationId: "test-only",
        usage,
        message: { role: "assistant", content: '{"resultIds":["result-0"]}' },
      };
    const input = JSON.parse(
      [...messages].reverse().find((m) => m.role === "user")!.content!,
    );
    const question = String(input.question);
    if (question.includes("dự phòng"))
      throw new ApiError("AI_UPSTREAM", 503, "Test-only upstream outage");
    if (question.includes("chờ kiểm thử"))
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 3000);
        _signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("fixture aborted"));
          },
          { once: true },
        );
      });
    const filters = input.interpretedFilters?.parameters || {};
    const name =
      input.interpretedFilters?.intent === "PURCHASE_STATUS"
        ? "get_purchase_requests"
        : input.interpretedFilters?.intent === "UNIFORM_HISTORY"
          ? "get_employee_issuance_history"
          : ["DOCUMENT_QUESTION", "DOCUMENT_SEARCH", "UNIFORM_POLICY"].includes(
                input.interpretedFilters?.intent,
              ) || /hợp đồng|tài liệu/i.test(question)
            ? "search_internal_documents"
            : /tủ|tầng/.test(question)
              ? "search_available_lockers"
              : "search_uniform_inventory";
    const args =
      name === "search_internal_documents"
        ? {
            query: filters.documentQuery || question,
            documentId: filters.recordId,
          }
        : name === "search_available_lockers"
          ? {
              floor: filters.floor,
              building: filters.building,
              area: filters.area,
            }
          : name === "get_purchase_requests"
            ? { status: filters.purchaseStatus }
            : name === "get_employee_issuance_history"
              ? { employeeId: filters.employeeId }
              : filters.productCode
                ? { code: filters.productCode, warehouse: filters.warehouse }
                : {
                    category: filters.category,
                    size: filters.size,
                    gender: filters.gender,
                  };
    return {
      generationId: "test-only",
      usage,
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "test-call",
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    };
  },
};
const ai = new AssistantService(repo, sessions, transport, {
  apiKey: "synthetic-no-api",
  model: "synthetic/no-network",
  problem: null,
});
const server = createHttpServer(
  createApplication(repo, sessions, ai, true),
  path.resolve("dist-online"),
);
server.on("error", () => {
  console.error("Không mở được cổng máy chủ kiểm thử online.");
  process.exitCode = 1;
  void rm(directory, { recursive: true, force: true });
});
server.listen(8080, "127.0.0.1");
process.once("SIGTERM", () =>
  server.close(() => {
    void rm(directory, { recursive: true, force: true }).finally(() =>
      process.exit(),
    );
  }),
);
