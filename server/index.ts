import { createHttpServer } from "./http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { StateRepository, atomicJson } from "./state";
import { Sessions, provisionCredentials } from "./auth";
import { configFromEnv, OpenRouterTransport } from "./openrouter";
import { AssistantService } from "./assistant";
import { UsageLedger } from "./usage";
import { createApplication } from "./app";
import { loadLocalEncoder, type Encoder } from "./rag/embeddings";
import { DocumentIndex } from "./rag/retrieval";
import { evaluateRetrieval } from "./rag/evaluation";
import { evaluateNaturalLanguage } from "./evaluation";
import { liveSmoke } from "./live-smoke";
import { importWorkbooks } from "./import-workbooks";
import { lockWorkspace } from "./workspace-lock";
const directory = path.resolve(".local/online");
async function prepareIndex() {
  let encoder: Encoder | undefined;
  try {
    encoder = await loadLocalEncoder(
      path.resolve(process.env.RAG_EMBEDDING_DIR || ".local/rag/model"),
    );
    await encoder.encode(
      ["Kiểm tra truy xuất tài liệu tiếng Việt"],
      "query",
      AbortSignal.timeout(15000),
    );
  } catch {
    encoder = undefined;
    console.error(
      "semantic_unavailable: chưa có local E5/runtime hợp lệ; dùng BM25 có nguồn. Không tải model hoặc gọi embedding API tự động.",
    );
  }
  const documentIndex = new DocumentIndex(encoder);
  return { encoder, documentIndex };
}
async function main() {
  if (process.argv.includes("--import-workbooks")) {
    await importWorkbooks();
    return;
  }
  if (process.argv.includes("--live-smoke")) {
    await liveSmoke();
    return;
  }
  if (process.argv.includes("--evaluate-ai")) {
    const report = await evaluateNaturalLanguage();
    await atomicJson(path.resolve("output/qa/ai-evaluation.json"), report);
    console.log(
      JSON.stringify({
        questions: report.questions,
        fallback: report.fallback,
        toolContracts: report.toolContracts,
        stateUnchanged: report.stateUnchanged,
      }),
    );
    return;
  }
  if (
    process.argv.includes("--rag-check") ||
    process.argv.includes("--evaluate-rag")
  ) {
    const { encoder, documentIndex } = await prepareIndex();
    if (process.argv.includes("--rag-check")) {
      console.log(
        JSON.stringify({
          semanticStatus: encoder ? "ready" : "semantic_unavailable",
          dimension: encoder?.dimension || null,
        }),
      );
      if (!encoder) process.exitCode = 1;
      return;
    }
    if (process.argv.includes("--evaluate-rag")) {
      const report = await evaluateRetrieval(documentIndex);
      await atomicJson(path.resolve("output/qa/rag-evaluation.json"), report);
      console.log(
        "Đã ghi kết quả retrieval/citation tại output/qa/rag-evaluation.json. Chất lượng sinh LLM chưa được đo bằng lượt này.",
      );
      return;
    }
  }
  const release = await lockWorkspace(directory);
  const repo = await StateRepository.open(directory);
  if (process.argv.includes("--provision")) {
    const codes = await provisionCredentials(
      path.join(directory, "credentials.json"),
      repo.snapshot(),
    );
    await atomicJson(path.join(directory, "access-codes.json"), codes);
    console.log(
      "Đã cấp mã đăng nhập demo tại .local/online/access-codes.json (chỉ người vận hành đọc).",
    );
    return;
  }
  const importAt = process.argv.indexOf("--import");
  if (importAt >= 0) {
    if (
      !process.argv.includes("--confirm-synthetic") ||
      !process.argv[importAt + 1]
    )
      throw Error(
        "Import cần đường dẫn JSON và --confirm-synthetic, chỉ dùng dữ liệu tổng hợp.",
      );
    await repo.importSynthetic(
      JSON.parse(
        await readFile(path.resolve(process.argv[importAt + 1]), "utf8"),
      ),
    );
    console.log("Đã nhập bộ dữ liệu tổng hợp; bản trước ở state.json.backup.");
    return;
  }
  const { documentIndex } = await prepareIndex();
  const sessions = await Sessions.load(
    path.join(directory, "credentials.json"),
  );
  const config = configFromEnv();
  if (config.problem)
    console.error(config.problem + " Đang dùng trợ lý xác định.");
  const ledger = await UsageLedger.open(path.join(directory, "usage.json"));
  const assistant = new AssistantService(
      repo,
      sessions,
      new OpenRouterTransport(config),
      config,
      ledger,
      documentIndex,
    ),
    handle = createApplication(repo, sessions, assistant, !config.problem);
  const server = createHttpServer(handle, path.resolve("dist-online"));
  server.on("error", () => {
    void release();
    console.error(
      "Không mở được máy chủ tại 127.0.0.1:8080. Kiểm tra cổng và quyền môi trường.",
    );
    process.exitCode = 1;
  });
  server.on("close", () => {
    void release();
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () =>
      server.close(() => {
        void release().finally(() => process.exit(0));
      }),
    );
  server.listen(8080, "127.0.0.1", () =>
    console.log(
      "Bản mẫu online: http://127.0.0.1:8080 • workspace cục bộ, SAP mô phỏng.",
    ),
  );
}
main().catch((error) => {
  if (
    error instanceof Error &&
    "code" in error &&
    ["WORKSPACE_BUSY", "IMPORT_CONFIRM", "WORKBOOK_READ"].includes(
      String(error.code),
    )
  ) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error(
    "Không khởi động được máy chủ: kiểm tra dữ liệu và mã truy cập. Nếu chưa cấp tài khoản, chạy npm run provision:accounts. Không tự ghi đè dữ liệu hỏng.",
  );
  process.exitCode = 1;
});
