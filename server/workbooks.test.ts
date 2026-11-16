// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { StateRepository } from "./state";
import { lockWorkspace } from "./workspace-lock";
import { AssistantService } from "./assistant";
import { Sessions, hashCredential } from "./auth";
import { createApplication } from "./app";
import { projectView } from "./views";
import { workbookFixture } from "../tests/helpers/workbook-fixture";
import type { Transport } from "./openrouter";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { force: true, recursive: true })),
  );
});
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "asa-workbook-test-"));
  dirs.push(dir);
  return { dir, repo: await StateRepository.open(dir) };
}
describe("Local workbook import and external AI denial", () => {
  it("executes the standard-library XLSX reader tests on synthetic workbooks only", async () => {
    const result = await promisify(execFile)(
      "python3",
      [
        "-m",
        "unittest",
        "discover",
        "-s",
        "tests/workbooks",
        "-p",
        "test_*.py",
      ],
      { timeout: 10000 },
    );
    expect(result.stderr).toContain("Ran 4 tests");
    expect(result.stderr).toContain("OK");
  });
  it("commits source rows atomically with a backup, preserving all operational records and original source codes", async () => {
    const f = await fixture(),
      before = f.repo.snapshot(),
      oldRef = f.repo.ref();
    const result = await f.repo.importWorkbooks(workbookFixture());
    expect(result.changed).toBe(true);
    expect(f.repo.ref().workspaceId).not.toBe(oldRef.workspaceId);
    const after = f.repo.snapshot();
    for (const key of [
      "employees",
      "uniforms",
      "purchases",
      "orders",
      "lockers",
      "lots",
      "movements",
      "documents",
      "accounts",
    ] as const)
      expect(after[key]).toEqual(before[key]);
    expect(after.workbookData!.uniformRequests[0].employeeCode).toBe("000123");
    expect(JSON.parse(await readFile(result.backup!, "utf8")).state).toEqual(
      before,
    );
    expect((await stat(result.backup!)).mode & 0o777).toBe(0o600);
    const reloaded = await StateRepository.open(f.dir);
    expect(reloaded.externalAiBlocked()).toBe(true);
    expect(reloaded.snapshot()).toEqual(after);
  });
  it("is idempotent and refuses invalid or duplicate row identities without changing persisted state", async () => {
    const f = await fixture(),
      data = workbookFixture();
    await f.repo.importWorkbooks(data);
    const ref = f.repo.ref(),
      raw = await readFile(path.join(f.dir, "state.json"), "utf8");
    expect(
      (
        await f.repo.importWorkbooks({
          ...data,
          importedAt: "2026-11-12T00:00:00Z",
        })
      ).changed,
    ).toBe(false);
    expect(f.repo.ref()).toEqual(ref);
    expect(
      (await readdir(f.dir)).filter((p) => p.includes("before-workbook")),
    ).toHaveLength(1);
    await expect(
      f.repo.importWorkbooks({ ...data, localOnly: false }),
    ).rejects.toThrow();
    await expect(
      f.repo.importWorkbooks({
        ...data,
        uniformRequests: [
          { ...data.uniformRequests[0], employeeName: "Nguồn tổng hợp đã đổi" },
        ],
      }),
    ).rejects.toMatchObject({ code: "IMPORT_CONFLICT" });
    await expect(
      f.repo.importWorkbooks({
        ...data,
        uniformRequests: [data.uniformRequests[0], data.uniformRequests[0]],
      }),
    ).rejects.toThrow();
    expect(await readFile(path.join(f.dir, "state.json"), "utf8")).toBe(raw);
  });
  it("withholds all source data from unverified employee/department accounts", async () => {
    const f = await fixture();
    await f.repo.importWorkbooks(workbookFixture());
    const s = f.repo.snapshot();
    expect(projectView(s, "hc", f.repo.ref()).workbookData).toBeDefined();
    for (const actor of ["employee", "coord", "head", "docs"]) {
      const view = projectView(s, actor, f.repo.ref());
      expect(view.workbookData).toBeUndefined();
      expect(JSON.stringify(view)).not.toContain("Người tổng hợp 001");
      expect(view.readModel.externalAiBlocked).toBe(true);
    }
  });
  it("blocks capability metadata AND completions, while local assistant returns exact source records", async () => {
    const f = await fixture();
    await f.repo.importWorkbooks(workbookFixture());
    const sessions = new Sessions({ hc: hashCredential("synthetic-code") });
    const session = sessions.login(
      "hc",
      "synthetic-code",
      f.repo.snapshot(),
      "test",
    );
    const transport = {
      capabilities: vi.fn(),
      complete: vi.fn(),
    } as unknown as Transport;
    const ai = new AssistantService(f.repo, sessions, transport, {
      apiKey: "synthetic-key",
      model: "synthetic/model",
      problem: null,
    });
    const reply = await ai.query(
      session,
      "Lịch sử Excel Người tổng hợp 001",
      f.repo.ref(),
      undefined,
      AbortSignal.timeout(1000),
    );
    expect(reply.reason).toBe("AI_LOCAL_ONLY");
    expect(reply.answer.text).toContain("000123");
    expect(reply.answer.evidence[0].recordId).toBe("XLS-UNI-01-00002");
    expect(reply.answer.evidence[0].href).toContain(
      "/dong-phuc/du-lieu-excel?record=",
    );
    expect(transport.capabilities).not.toHaveBeenCalled();
    expect(transport.complete).not.toHaveBeenCalled();
    const app = createApplication(f.repo, sessions, ai, true);
    const status = await (
      await app(new Request("http://127.0.0.1:8080/api/assistant/status"))
    ).json();
    expect(status).toMatchObject({
      mode: "local-only",
      externalAiBlocked: true,
    });
  });
  it("keeps external AI blocked through a demo reset and rejects source data via the synthetic import route", async () => {
    const f = await fixture();
    await f.repo.importWorkbooks(workbookFixture());
    await expect(
      f.repo.importSynthetic(f.repo.snapshot()),
    ).rejects.toMatchObject({ code: "IMPORT_LOCAL_DATA" });
    await f.repo.reset("system", f.repo.ref());
    expect(f.repo.snapshot().workbookData).toBeUndefined();
    expect((await StateRepository.open(f.dir)).externalAiBlocked()).toBe(true);
  });
  it("prevents two writers from claiming the same workspace and releases its lock", async () => {
    const f = await fixture(),
      release = await lockWorkspace(f.dir);
    try {
      await expect(lockWorkspace(f.dir)).rejects.toMatchObject({
        code: "WORKSPACE_BUSY",
      });
    } finally {
      await release();
    }
    const nextRelease = await lockWorkspace(f.dir);
    await nextRelease();
  });
});
