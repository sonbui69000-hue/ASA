import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createSeed } from "../src/data/seed";
import { assertState, execute, type Command } from "../src/domain/commands";
import { account } from "../src/domain/selectors";
import { stateSchema } from "../src/domain/schema";
import { migrateState } from "../src/store/migrations";
import type { State, StateRef } from "../src/domain/types";
import { ApiError } from "./errors";
import { workbookDataSchema } from "../src/domain/workbook-data";
const envelopeSchema = z
  .object({
    externalAiBlocked: z.boolean().optional(),
    workspaceId: z.string().uuid(),
    state: stateSchema,
    operations: z.record(
      z.string(),
      z.object({ actorId: z.string(), hash: z.string() }),
    ),
  })
  .strict();
type Envelope = z.infer<typeof envelopeSchema>;
export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(value));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}
export class StateRepository {
  private envelope: Envelope;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private file: string,
    initial: State,
    private persist = atomicJson,
  ) {
    this.envelope = {
      workspaceId: randomUUID(),
      state: initial,
      operations: {},
    };
    assertState(initial);
  }
  static async open(directory: string, initial = createSeed()) {
    const repo = new StateRepository(
      path.join(directory, "state.json"),
      initial,
    );
    try {
      repo.envelope = envelopeSchema.parse(
        JSON.parse(await readFile(repo.file, "utf8")),
      );
      assertState(repo.envelope.state);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw new ApiError(
          "STATE_CORRUPT",
          503,
          "Không đọc được dữ liệu máy chủ. Giữ nguyên file; cần người vận hành phục hồi.",
        );
      await repo.persist(repo.file, repo.envelope);
    }
    return repo;
  }
  snapshot() {
    return structuredClone(this.envelope.state);
  }
  externalAiBlocked() {
    return !!(
      this.envelope.externalAiBlocked || this.envelope.state.workbookData
    );
  }
  async importWorkbooks(input: unknown) {
    return this.enqueue(async () => {
      const workbookData = workbookDataSchema.parse(input);
      if (
        this.envelope.state.workbookData?.fingerprint ===
          workbookData.fingerprint &&
        this.envelope.externalAiBlocked
      ) {
        const content = (data: typeof workbookData) =>
          JSON.stringify({ ...data, importedAt: "" });
        if (content(this.envelope.state.workbookData) !== content(workbookData))
          throw new ApiError(
            "IMPORT_CONFLICT",
            409,
            "Cùng fingerprint nhưng nội dung đã khác; cần rà soát thay đổi bộ đọc trước khi nhập lại.",
          );
        return { changed: false, backup: null };
      }
      const state = structuredClone(this.envelope.state);
      state.workbookData = workbookData;
      state.revision++;
      state.audits.unshift({
        id: "AUD-XLS-" + workbookData.fingerprint.slice(0, 16),
        date: state.settings.date,
        actorId: "system",
        module: "Hệ thống",
        entityId: "WORKBOOK-IMPORT",
        action: "Nhập dữ liệu Excel cục bộ",
        detail: `${workbookData.uniformRequests.length} dòng đồng phục; ${workbookData.uniformPurchases.length} dòng tổng hợp mua; ${workbookData.lockers.length} dòng tủ; ${workbookData.lockerFaults.length} dòng lỗi. OpenRouter bị chặn.`,
      });
      assertState(state);
      if (Buffer.byteLength(JSON.stringify(state)) > 20 * 1024 * 1024)
        throw new ApiError("STATE_LIMIT", 422, "Dữ liệu vượt giới hạn 20 MB.");
      const candidate = {
        ...this.envelope,
        workspaceId: randomUUID(),
        state,
        externalAiBlocked: true,
      };
      const backup = this.file + ".before-workbook-" + randomUUID() + ".json";
      await this.persist(backup, this.envelope);
      await this.persist(this.file, candidate);
      this.envelope = candidate;
      return { changed: true, backup };
    });
  }
  ref(): StateRef {
    return {
      workspaceId: this.envelope.workspaceId,
      revision: this.envelope.state.revision,
    };
  }
  matches(ref: StateRef) {
    return (
      ref.workspaceId === this.envelope.workspaceId &&
      ref.revision === this.envelope.state.revision
    );
  }
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async command(
    actorId: string,
    command: Command,
    operationId: string,
    expected: StateRef,
  ) {
    return this.enqueue(async () => {
      account(this.envelope.state, actorId);
      const hash = createHash("sha256")
        .update(JSON.stringify(command))
        .digest("hex");
      const old = Object.hasOwn(this.envelope.operations, operationId)
        ? this.envelope.operations[operationId]
        : undefined;
      if (old) {
        if (old.actorId !== actorId || old.hash !== hash)
          throw new ApiError(
            "OPERATION_REUSED",
            409,
            "Mã thao tác đã được dùng cho yêu cầu khác.",
          );
        return this.ref();
      }
      if (this.envelope.state.operations.includes(operationId))
        throw new ApiError(
          "OPERATION_REUSED",
          409,
          "Mã thao tác thuộc dữ liệu cũ, không được gán lại.",
        );
      if (!this.matches(expected))
        throw new ApiError(
          "STALE",
          409,
          "Dữ liệu đã thay đổi. Tải lại trước khi xác nhận.",
        );
      let next: State;
      try {
        next = execute(this.envelope.state, actorId, command, operationId);
      } catch (error) {
        throw new ApiError(
          "BUSINESS_RULE",
          422,
          error instanceof Error ? error.message : "Thao tác không hợp lệ.",
        );
      }
      if (Buffer.byteLength(JSON.stringify(next)) > 20 * 1024 * 1024)
        throw new ApiError(
          "STATE_LIMIT",
          422,
          "Bộ dữ liệu demo vượt giới hạn 20 MB.",
        );
      const candidate = {
        ...this.envelope,
        state: next,
        operations: {
          ...this.envelope.operations,
          [operationId]: { actorId, hash },
        },
      };
      try {
        await this.persist(this.file, candidate);
      } catch {
        throw new ApiError(
          "PERSISTENCE",
          503,
          "Không lưu được dữ liệu máy chủ; chưa công bố thay đổi.",
        );
      }
      this.envelope = candidate;
      return this.ref();
    });
  }
  async reset(actorId: string, expected: StateRef) {
    return this.enqueue(async () => {
      if (account(this.envelope.state, actorId).role !== "sysadmin")
        throw new ApiError(
          "FORBIDDEN",
          403,
          "Chỉ Quản trị được khôi phục dữ liệu demo.",
        );
      if (!this.matches(expected))
        throw new ApiError("STALE", 409, "Dữ liệu đã thay đổi.");
      const state = createSeed();
      state.audits.unshift({
        id: "AUD-RESET",
        date: state.settings.date,
        actorId,
        module: "Hệ thống",
        entityId: "DEMO-RESET",
        action: "Khôi phục dữ liệu demo",
        detail: "Người dùng đã xác nhận.",
      });
      const candidate = {
        workspaceId: randomUUID(),
        state,
        operations: {},
        externalAiBlocked: this.externalAiBlocked(),
      };
      try {
        await this.persist(this.file, candidate);
      } catch {
        throw new ApiError(
          "PERSISTENCE",
          503,
          "Không lưu được bộ khôi phục; dữ liệu chưa thay đổi.",
        );
      }
      this.envelope = candidate;
      return this.ref();
    });
  }
  async importSynthetic(input: unknown) {
    return this.enqueue(async () => {
      if (input && typeof input === "object" && "workbookData" in input)
        throw new ApiError(
          "IMPORT_LOCAL_DATA",
          422,
          "Dữ liệu workbook phải đi qua lệnh nhập cục bộ có chặn OpenRouter.",
        );
      if (
        input &&
        typeof input === "object" &&
        ("readModel" in input || "kind" in input)
      )
        throw new ApiError(
          "IMPORT_VIEW",
          422,
          "Không dùng bản đọc/cache làm dữ liệu chuẩn.",
        );
      const state = migrateState(input).state;
      assertState(state);
      const trusted = createSeed().accounts;
      if (
        state.accounts.some(
          (a) =>
            !trusted.some(
              (t) =>
                t.id === a.id &&
                t.role === a.role &&
                t.employeeId === a.employeeId,
            ),
        )
      )
        throw new ApiError(
          "IMPORT_IDENTITY",
          422,
          "Danh tính/vai trò nhập không khớp tài khoản demo được cấp.",
        );
      const candidate = {
        workspaceId: randomUUID(),
        state,
        operations: {},
        externalAiBlocked: this.externalAiBlocked(),
      };
      await this.persist(this.file + ".backup", this.envelope);
      await this.persist(this.file, candidate);
      this.envelope = candidate;
    });
  }
}
