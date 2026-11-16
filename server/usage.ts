import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { atomicJson } from "./state";
import { ApiError } from "./errors";
import type { Usage } from "../src/online/protocol";
const schema = z.object({
  day: z.string(),
  entries: z.record(
    z.string(),
    z.object({
      reserved: z.number().nonnegative(),
      cost: z.number().nonnegative().nullable(),
      calls: z.number().int().nonnegative(),
      promptTokens: z.number().nonnegative(),
      completionTokens: z.number().nonnegative(),
      reason: z.string().nullable(),
    }),
  ),
});
export class UsageLedger {
  private data: z.infer<typeof schema> = {
    day: new Date().toISOString().slice(0, 10),
    entries: {},
  };
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file?: string) {}
  static async open(file: string) {
    const ledger = new UsageLedger(file);
    try {
      ledger.data = schema.parse(JSON.parse(await readFile(file, "utf8")));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        throw new ApiError(
          "USAGE_CORRUPT",
          503,
          "Không đọc được giới hạn sử dụng. AI tạm dừng để tránh vượt chi phí.",
        );
    }
    return ledger;
  }
  private transaction<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn);
    this.queue = p.catch(() => {});
    return p;
  }
  async reserve(worst: number) {
    return this.transaction(async () => {
      const day = new Date().toISOString().slice(0, 10);
      const data =
        day === this.data.day
          ? structuredClone(this.data)
          : { day, entries: {} };
      if (!Number.isFinite(worst) || worst < 0 || worst > 0.03)
        throw new ApiError(
          "AI_BUDGET",
          429,
          "Lượt AI vượt ngân sách 0,03 USD.",
        );
      const total = Object.values(data.entries).reduce(
        (n, e) => n + (e.cost ?? e.reserved),
        0,
      );
      if (total + worst > 5)
        throw new ApiError("AI_BUDGET", 429, "Đã đạt giới hạn AI 5 USD/ngày.");
      const id = randomUUID();
      data.entries[id] = {
        reserved: worst,
        cost: null,
        calls: 0,
        promptTokens: 0,
        completionTokens: 0,
        reason: null,
      };
      if (this.file) await atomicJson(this.file, data);
      this.data = data;
      return id;
    });
  }
  async settle(id: string, usage: Usage, reason: string | null) {
    return this.transaction(async () => {
      if (!this.data.entries[id]) return;
      const data = structuredClone(this.data);
      data.entries[id] = { ...data.entries[id], ...usage, reason };
      if (this.file) await atomicJson(this.file, data);
      this.data = data;
    });
  }
}
