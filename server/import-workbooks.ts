import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StateRepository, atomicJson } from "./state";
import { lockWorkspace } from "./workspace-lock";
import { ApiError } from "./errors";
import { projectView } from "./views";
import { account } from "../src/domain/selectors";
import { answerQuery } from "../src/domain/assistant";

export async function importWorkbooks() {
  if (!process.argv.includes("--confirm-local-data"))
    throw new ApiError(
      "IMPORT_CONFIRM",
      400,
      "Lệnh nhập cần --confirm-local-data; OpenRouter sẽ bị chặn cho workspace.",
    );
  const directory = path.resolve(".local/online");
  const release = await lockWorkspace(directory);
  try {
    // Older server builds do not own the new lock. Refuse a known running legacy listener.
    try {
      const sockets = await readFile("/proc/net/tcp", "utf8");
      if (
        sockets
          .split("\n")
          .some((line) => /^\s*\d+:\s+\w+:1F90\s+\S+\s+0A\s/.test(line))
      )
        throw new ApiError(
          "WORKSPACE_BUSY",
          409,
          "Dừng server cổng 8080 trước khi nhập.",
        );
    } catch (error) {
      if (error instanceof ApiError) throw error;
    }
    const batch = path.resolve(".local/imports", randomUUID());
    await mkdir(batch, { recursive: true, mode: 0o700 });
    const staged = path.join(batch, "workbook-data.json");
    const argument = (flag: string, fallback: string) => {
      const i = process.argv.indexOf(flag);
      return i >= 0 ? process.argv[i + 1] : fallback;
    };
    try {
      await promisify(execFile)(
        "python3",
        [
          "scripts/read-workbooks.py",
          "--uniform",
          argument("--uniform", "uniform_manage.xlsx"),
          "--lockers",
          argument("--lockers", "locker_management_file.xlsx"),
          "--output",
          staged,
        ],
        { timeout: 30000, maxBuffer: 4096 },
      );
    } catch {
      throw new ApiError(
        "WORKBOOK_READ",
        422,
        "Không đọc được workbook; kiểm tra Python 3, đường dẫn và cấu trúc. Source records không được ghi vào log.",
      );
    }
    const input = JSON.parse(await readFile(staged, "utf8"));
    const repo = await StateRepository.open(directory);
    const before = repo.snapshot();
    const result = await repo.importWorkbooks(input);
    const reloaded = await StateRepository.open(directory),
      after = reloaded.snapshot();
    const data = after.workbookData!;
    const operationalRecordsPreserved = Object.entries(before).every(
      ([key, value]) =>
        ["workbookData", "revision", "audits"].includes(key) ||
        JSON.stringify(value) ===
          JSON.stringify(after[key as keyof typeof after]),
    );
    const actor = account(after, "hc"),
      view = projectView(
        after,
        actor.id,
        reloaded.ref(),
        reloaded.externalAiBlocked(),
      );
    const verify = (id: string | undefined, question: string) =>
      !id ||
      answerQuery(view, actor, question + " " + id).evidence.some(
        (e) => e.recordId === id,
      );
    const verifiedLocalLookups = {
      uniform: verify(data.uniformRequests[0]?.id, "Lịch sử Excel"),
      purchase: verify(data.uniformPurchases[0]?.id, "Mua Excel"),
      locker: verify(data.lockers[0]?.id, "Tủ Excel"),
    };
    let previousBackup: string | null = null;
    try {
      const previous = JSON.parse(
        await readFile(
          path.resolve("output/qa/workbook-import-summary.json"),
          "utf8",
        ),
      );
      if (previous.stateRef?.workspaceId === repo.ref().workspaceId)
        previousBackup = previous.backup;
    } catch {
      /* first import */
    }
    const report = {
      importedAt: data.importedAt,
      changed: result.changed,
      externalAiBlocked: repo.externalAiBlocked(),
      counts: {
        uniformRequests: data.uniformRequests.length,
        uniformPurchases: data.uniformPurchases.length,
        lockers: data.lockers.length,
        lockerFaults: data.lockerFaults.length,
      },
      rowsRequiringReview: {
        uniformRequests: data.uniformRequests.filter((r) => r.issues.length)
          .length,
        uniformPurchases: data.uniformPurchases.filter((r) => r.issues.length)
          .length,
        lockers: data.lockers.filter((r) => r.issues.length).length,
        lockerFaults: data.lockerFaults.filter((r) => r.issues.length).length,
      },
      backup: result.backup
        ? path.relative(process.cwd(), result.backup)
        : previousBackup,
      stateRef: repo.ref(),
      operationalRecordsPreserved,
      verifiedLocalLookups,
      reloadedPolicyBlocked: reloaded.externalAiBlocked(),
      omittedFields: data.omittedFields,
    };
    await atomicJson(
      path.resolve("output/qa/workbook-import-summary.json"),
      report,
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await release();
  }
}
