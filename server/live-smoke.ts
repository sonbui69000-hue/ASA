import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StateRepository, atomicJson } from "./state";
import { Sessions, hashCredential } from "./auth";
import { AssistantService } from "./assistant";
import {
  OpenRouterTransport,
  configFromEnv,
  type Transport,
} from "./openrouter";
import { UsageLedger } from "./usage";
import { ApiError } from "./errors";

/** Operator-only opt-in. Never imported by automated tests or exposed over HTTP. */
export async function liveSmoke() {
  if (!process.argv.includes("--confirm-paid"))
    throw new Error(
      "Live smoke requires --confirm-paid; never run it in the regression suite.",
    );
  const config = configFromEnv();
  const startedAt = new Date().toISOString();
  try {
    const current = JSON.parse(
      await readFile(path.resolve(".local/online/state.json"), "utf8"),
    );
    if (current.externalAiBlocked || current.state?.workbookData) {
      console.log(
        JSON.stringify({
          status: "blocked",
          reason: "AI_LOCAL_ONLY",
          metadataRequests: 0,
          completionRequests: 0,
        }),
      );
      process.exitCode = 1;
      return;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new ApiError(
        "AI_LOCAL_ONLY",
        503,
        "Không xác minh được policy workspace; không gọi API.",
      );
  }
  let metadataRequests = 0,
    completionRequests = 0;
  let networkFailure: string | null = null;
  const http: typeof fetch = async (url, init) => {
    if (String(url).endsWith("/chat/completions")) {
      completionRequests++;
      if (completionRequests > 3) throw new ApiError("SMOKE_LIMIT", 429);
    } else metadataRequests++;
    try {
      return await fetch(url, init);
    } catch (e) {
      // Do not log the request, headers, raw error, body, credential, or prompt.
      const code = (e as { cause?: { code?: string }; name?: string }).cause
        ?.code;
      networkFailure = [
        "EAI_AGAIN",
        "ENOTFOUND",
        "EPERM",
        "ECONNREFUSED",
        "ENETUNREACH",
      ].includes(code || "")
        ? code!
        : "NETWORK_OR_TIMEOUT";
      throw new ApiError("AI_UPSTREAM", 503);
    }
  };
  const real = new OpenRouterTransport(config, http);
  const selectedTools: string[] = [];
  const transport: Transport = {
    capabilities: async (signal) => {
      const cap = await real.capabilities(signal);
      const reserve = 3 * (18000 * cap.promptPrice + 800 * cap.completionPrice);
      if (reserve > 0.03) throw new ApiError("AI_BUDGET", 429);
      return cap;
    },
    complete: async (...args) => {
      const result = await real.complete(...args);
      selectedTools.push(
        ...(result.message.tool_calls || []).map((t) => t.function.name),
      );
      return result;
    },
  };
  const dir = await mkdtemp(path.join(os.tmpdir(), "asa-live-smoke-"));
  try {
    const repo = await StateRepository.open(dir);
    const credential = hashCredential("synthetic-smoke-credential");
    const sessions = new Sessions({ warehouse: credential });
    const session = sessions.login(
      "warehouse",
      "synthetic-smoke-credential",
      repo.snapshot(),
      "operator-smoke",
    );
    const before = JSON.stringify(repo.snapshot());
    // Use the same durable daily ledger as the application, not a separate paid budget.
    const service = new AssistantService(
      repo,
      sessions,
      transport,
      config,
      await UsageLedger.open(path.resolve(".local/online/usage.json")),
    );
    const reply = await service.query(
      session,
      "Kho trung tâm còn bao nhiêu bộ DP-DD-M?",
      repo.ref(),
      undefined,
      AbortSignal.timeout(30000),
    );
    const passed =
      reply.mode === "llm" &&
      selectedTools.includes("search_uniform_inventory") &&
      reply.answer.evidence.some((e) => e.recordId === "SKU-1-1") &&
      reply.answer.text.includes(
        "10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng",
      ) &&
      JSON.stringify(repo.snapshot()) === before;
    const report = {
      startedAt,
      completedAt: new Date().toISOString(),
      model: config.model,
      apiKeyPresent: !!config.apiKey,
      configurationValid: !config.problem,
      status: passed ? "passed" : networkFailure ? "blocked" : "failed",
      metadataRequests,
      completionRequests,
      completionLimit: 3,
      questionLimit: 1,
      worstCaseBudgetUsd: 0.03,
      automaticRetries: 0,
      mode: reply.mode,
      reason: reply.reason,
      networkFailure,
      selectedTools,
      recordIds: reply.answer.evidence.map((e) => e.recordId),
      usage: reply.usage,
      canonicalStateUnchanged: JSON.stringify(repo.snapshot()) === before,
      scope:
        "One synthetic inventory question through real transport and tools; no RAG generation or broad NLU quality claim.",
    };
    await atomicJson(path.resolve("output/qa/live-smoke.json"), report);
    console.log(JSON.stringify(report));
    if (!passed) process.exitCode = 1;
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}
