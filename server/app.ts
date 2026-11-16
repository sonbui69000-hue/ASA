import { z } from "zod";
import { account, canReadDocument } from "../src/domain/selectors";
import type { Command } from "../src/domain/commands";
import { commandRequestSchema, stateRefSchema } from "./commands";
import { StateRepository } from "./state";
import { Sessions } from "./auth";
import { AssistantService } from "./assistant";
import { publicAccounts, projectView } from "./views";
import { ApiError, safeError } from "./errors";
import { ingest, permitted } from "./rag/chunks";
const loginSchema = z
  .object({
    accountId: z.string().min(1).max(128),
    credential: z.string().min(1).max(200),
  })
  .strict();
const querySchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    expectedStateRef: stateRefSchema,
    routeRecordId: z.string().max(128).optional(),
    requestId: z.string().min(8).max(128),
    replyTo: z.string().min(8).max(128).optional(),
    resetContext: z.boolean().optional(),
  })
  .strict();
const cookie = (req: Request) =>
  req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)asa_session=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1] || "";
export function createApplication(
  repo: StateRepository,
  sessions: Sessions,
  assistant: AssistantService,
  configured: boolean,
) {
  const origins = new Set([
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
  ]);
  const json = (
    data: unknown,
    status = 200,
    headers: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    });
  async function body(req: Request, max = 220 * 1024) {
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw new ApiError("CONTENT_TYPE", 415, "Chỉ nhận nội dung JSON.");
    const text = await req.text();
    if (Buffer.byteLength(text) > max)
      throw new ApiError("BODY_LIMIT", 413, "Yêu cầu vượt giới hạn dữ liệu.");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("INVALID_JSON", 400, "Nội dung JSON không hợp lệ.");
    }
  }
  return async function handle(
    req: Request,
    source = "local",
  ): Promise<Response> {
    try {
      const url = new URL(req.url);
      if (!origins.has(url.origin))
        throw new ApiError("ORIGIN", 403, "Nguồn truy cập không được phép.");
      const origin = req.headers.get("origin");
      if (origin && !origins.has(origin))
        throw new ApiError("ORIGIN", 403, "Nguồn truy cập không được phép.");
      if (!["GET", "POST", "DELETE"].includes(req.method))
        throw new ApiError("METHOD", 405, "Phương thức không được hỗ trợ.");
      if (req.method !== "GET" && !origin)
        throw new ApiError("ORIGIN", 403, "Thiếu nguồn xác nhận yêu cầu.");
      if (url.pathname === "/api/accounts" && req.method === "GET")
        return json({ accounts: publicAccounts(repo.snapshot()) });
      if (url.pathname === "/api/assistant/status" && req.method === "GET")
        return json({
          mode: repo.externalAiBlocked()
            ? "local-only"
            : configured
              ? "configured"
              : "deterministic",
          externalAiBlocked: repo.externalAiBlocked(),
          retrievalMode:
            assistant.retrievalStatus() === "ready" ? "hybrid" : "keyword",
          semanticStatus: assistant.retrievalStatus(),
        });
      if (url.pathname === "/api/session" && req.method === "POST") {
        const input = loginSchema.parse(await body(req, 4096));
        const session = sessions.login(
          input.accountId,
          input.credential,
          repo.snapshot(),
          source,
        );
        sessions.logout(cookie(req));
        return json(
          {
            csrf: session.csrf,
            actor: account(repo.snapshot(), session.accountId),
            view: projectView(
              repo.snapshot(),
              session.accountId,
              repo.ref(),
              repo.externalAiBlocked(),
            ),
          },
          200,
          {
            "Set-Cookie": `asa_session=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
          },
        );
      }
      const session = sessions.resolve(cookie(req), repo.snapshot());
      if (
        req.method !== "GET" &&
        req.headers.get("x-csrf-token") !== session.csrf
      )
        throw new ApiError(
          "CSRF",
          403,
          "Không xác nhận được yêu cầu của phiên hiện tại.",
        );
      if (url.pathname === "/api/session" && req.method === "GET")
        return json({
          csrf: session.csrf,
          actor: account(repo.snapshot(), session.accountId),
          view: projectView(
            repo.snapshot(),
            session.accountId,
            repo.ref(),
            repo.externalAiBlocked(),
          ),
        });
      if (url.pathname === "/api/session" && req.method === "DELETE") {
        sessions.logout(session.token);
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "asa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
      if (url.pathname === "/api/state/ref" && req.method === "GET")
        return json({ ...repo.ref(), principalId: session.accountId });
      if (url.pathname === "/api/views/application" && req.method === "GET")
        return json(
          projectView(
            repo.snapshot(),
            session.accountId,
            repo.ref(),
            repo.externalAiBlocked(),
          ),
        );
      if (url.pathname === "/api/commands" && req.method === "POST") {
        const input = commandRequestSchema.parse(await body(req));
        const command = input.command as Command;
        if (
          (command.type === "document.create" &&
            Buffer.byteLength(JSON.stringify(command.document)) > 200 * 1024) ||
          (command.type === "document.update" &&
            Buffer.byteLength(command.text) > 200 * 1024)
        )
          throw new ApiError(
            "DOCUMENT_LIMIT",
            413,
            "Tài liệu vượt giới hạn 200 KB.",
          );
        await repo.command(
          session.accountId,
          command,
          input.operationId,
          input.expectedStateRef,
        );
        return json(
          projectView(
            repo.snapshot(),
            session.accountId,
            repo.ref(),
            repo.externalAiBlocked(),
          ),
        );
      }
      if (url.pathname === "/api/demo/reset" && req.method === "POST") {
        const input = z
          .object({
            confirmed: z.literal(true),
            expectedStateRef: stateRefSchema,
          })
          .strict()
          .parse(await body(req, 4096));
        await repo.reset(session.accountId, input.expectedStateRef);
        return json(
          projectView(
            repo.snapshot(),
            session.accountId,
            repo.ref(),
            repo.externalAiBlocked(),
          ),
        );
      }
      if (
        url.pathname === "/api/assistant/conversation" &&
        req.method === "DELETE"
      ) {
        session.questions = [];
        session.lastContext = undefined;
        session.contexts?.clear();
        session.conversationRevision++;
        return json({ ok: true });
      }
      if (url.pathname === "/api/assistant/query" && req.method === "POST") {
        const input = querySchema.parse(await body(req, 16000));
        return json(
          await assistant.query(
            session,
            input.question,
            input.expectedStateRef,
            input.routeRecordId,
            req.signal,
            {
              requestId: input.requestId,
              replyTo: input.replyTo,
              resetContext: input.resetContext,
            },
          ),
        );
      }
      if (url.pathname === "/api/documents/search" && req.method === "POST") {
        const input = z
          .object({
            query: z.string().trim().min(1).max(500),
            expectedStateRef: stateRefSchema,
            category: z.string().max(80).optional(),
            departmentId: z.string().max(128).optional(),
            documentId: z.string().max(128).optional(),
            limit: z.number().int().min(1).max(6).optional(),
          })
          .strict()
          .parse(await body(req, 4096));
        return json(
          await assistant.searchDocuments(
            session,
            input.query,
            input.expectedStateRef,
            input,
            req.signal,
          ),
        );
      }
      const match = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
      if (match && req.method === "GET") {
        const s = repo.snapshot(),
          a = account(s, session.accountId),
          documentId = decodeURIComponent(match[1]);
        const rawVersion = url.searchParams.get("version");
        if (rawVersion !== null && !/^[1-9]\d{0,5}$/.test(rawVersion))
          throw new ApiError(
            "INVALID_INPUT",
            400,
            "Phiên bản tài liệu không hợp lệ.",
          );
        const version = rawVersion ? Number(rawVersion) : undefined;
        const base = s.documents.find((d) => d.id === documentId);
        const d =
          version && base?.version !== version
            ? s.documents.find((d) => d.id === documentId + "-v" + version)
            : base;
        if (
          !d ||
          !canReadDocument(s, a, d) ||
          (version && version !== d.version)
        )
          throw new ApiError(
            "UNAVAILABLE",
            404,
            "Tài liệu không khả dụng hoặc bạn không có quyền truy cập.",
          );
        const chunkId = url.searchParams.get("chunk");
        const chunk = chunkId
          ? ingest(s).find(
              (c) =>
                c.chunkId === chunkId &&
                c.recordId === d.id &&
                permitted(s, a, c),
            )
          : undefined;
        if (chunkId && !chunk)
          throw new ApiError(
            "UNAVAILABLE",
            404,
            "Dẫn nguồn đã thay đổi hoặc không còn trong phạm vi được phép.",
          );
        return json({
          ...d,
          original: "",
          signatures: d.signatures.filter((x) => x.accountId === a.id),
          ...(chunk
            ? {
                highlight: {
                  sectionId: chunk.sectionId,
                  sourceStart: chunk.sourceStart,
                  sourceEnd: chunk.sourceEnd,
                  contentHash: chunk.contentHash,
                },
              }
            : {}),
        });
      }
      throw new ApiError("NOT_FOUND", 404, "Không tìm thấy chức năng.");
    } catch (error) {
      const e =
        error instanceof z.ZodError
          ? new ApiError("INVALID_INPUT", 400, "Dữ liệu yêu cầu không hợp lệ.")
          : safeError(error);
      return json(
        { error: { code: e.code, message: e.message } },
        e.status,
        e.retryAfter ? { "Retry-After": String(e.retryAfter) } : {},
      );
    }
  };
}
