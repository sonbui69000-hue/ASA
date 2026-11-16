import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { State } from "../src/domain/types";
import { account } from "../src/domain/selectors";
import { atomicJson } from "./state";
import { ApiError } from "./errors";
const credentialSchema = z.record(
  z.string(),
  z
    .object({
      salt: z.string().regex(/^[a-f0-9]{32}$/),
      hash: z.string().regex(/^[a-f0-9]{128}$/),
    })
    .strict(),
);
export type Credentials = z.infer<typeof credentialSchema>;
export interface Session {
  token: string;
  csrf: string;
  accountId: string;
  created: number;
  last: number;
  questions: string[];
  conversationRevision: number;
  contextWorkspace?: string;
  contexts?: Map<
    string,
    {
      context: import("../src/domain/assistant-routing").ConversationContext;
      question: string;
      parentId?: string;
      workspaceId: string;
    }
  >;
  lastContext?: {
    intent: string;
    parameters: import("../src/domain/assistant-routing").Parameters;
    recordIds?: string[];
  };
}
export function hashCredential(secret: string) {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(secret, salt, 64).toString("hex") };
}
export class Sessions {
  private sessions = new Map<string, Session>();
  private attempts = new Map<string, { since: number; count: number }>();
  constructor(
    private credentials: Credentials,
    private now = Date.now,
  ) {}
  static async load(file: string) {
    try {
      return new Sessions(
        credentialSchema.parse(JSON.parse(await readFile(file, "utf8"))),
      );
    } catch {
      throw new ApiError(
        "CREDENTIALS_MISSING",
        503,
        "Chưa cấp tài khoản máy chủ. Chạy npm run provision:accounts trước.",
      );
    }
  }
  login(
    accountId: string,
    secret: string,
    state: State,
    source: string,
  ): Session {
    const now = this.now();
    const bucket = this.attempts.get(source);
    const record =
      bucket && now - bucket.since < 60000 ? bucket : { since: now, count: 0 };
    record.count++;
    this.attempts.set(source, record);
    if (record.count > 5)
      throw new ApiError(
        "LOGIN_RATE_LIMIT",
        429,
        "Đăng nhập quá nhiều lần. Thử lại sau một phút.",
        60,
      );
    const credential = Object.hasOwn(this.credentials, accountId)
      ? this.credentials[accountId]
      : undefined;
    const salt = credential?.salt || "0".repeat(32);
    const candidate = scryptSync(secret, salt, 64);
    const correct =
      credential &&
      timingSafeEqual(candidate, Buffer.from(credential.hash, "hex"));
    if (!correct)
      throw new ApiError(
        "LOGIN_FAILED",
        401,
        "Tài khoản hoặc mã truy cập không hợp lệ.",
      );
    try {
      account(state, accountId);
    } catch {
      throw new ApiError(
        "LOGIN_FAILED",
        401,
        "Tài khoản hoặc mã truy cập không hợp lệ.",
      );
    }
    this.attempts.delete(source);
    this.prune();
    if (this.sessions.size >= 100)
      throw new ApiError("SESSION_LIMIT", 429, "Đã đạt giới hạn phiên demo.");
    const session = {
      token: randomBytes(32).toString("base64url"),
      csrf: randomBytes(32).toString("base64url"),
      accountId,
      created: now,
      last: now,
      questions: [],
      conversationRevision: 0,
    };
    this.sessions.set(session.token, session);
    return session;
  }
  private prune() {
    const now = this.now();
    for (const [id, s] of this.sessions)
      if (now - s.last > 30 * 60000 || now - s.created > 8 * 3600000)
        this.sessions.delete(id);
  }
  resolve(token: string, state: State) {
    this.prune();
    const s = this.sessions.get(token);
    if (!s)
      throw new ApiError(
        "UNAUTHENTICATED",
        401,
        "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.",
      );
    try {
      account(state, s.accountId);
    } catch {
      this.sessions.delete(token);
      throw new ApiError(
        "UNAUTHENTICATED",
        401,
        "Tài khoản không còn hoạt động.",
      );
    }
    s.last = this.now();
    return s;
  }
  logout(token: string) {
    this.sessions.delete(token);
  }
  valid(session: Session, state: State) {
    try {
      return this.resolve(session.token, state) === session;
    } catch {
      return false;
    }
  }
}
export async function provisionCredentials(file: string, state: State) {
  try {
    await readFile(file);
    throw new ApiError(
      "ALREADY_PROVISIONED",
      409,
      "Tài khoản đã được cấp; không tự ghi đè mã truy cập.",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const credentials: Credentials = {};
  const codes: Record<string, string> = {};
  for (const a of state.accounts) {
    const secret = randomBytes(18).toString("base64url");
    credentials[a.id] = hashCredential(secret);
    codes[a.id] = secret;
  }
  await atomicJson(file, credentials);
  return codes;
}
