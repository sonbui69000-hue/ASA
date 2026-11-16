import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const startedAt = new Date(),
  root = process.cwd(),
  directory = path.join(root, "output/qa");
await mkdir(directory, { recursive: true });
async function run(name, args, env = {}) {
  const chunks = [],
    begin = Date.now();
  console.log(`\n[QA] ${name}: ${args.join(" ")}`);
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      chunks.push(chunk);
      process.stdout.write(chunk);
    });
  const exitCode = await new Promise((resolve) => {
    child.once("error", (e) => {
      chunks.push(Buffer.from(String(e)));
      resolve(1);
    });
    child.once("close", (code) => resolve(code ?? 1));
  });
  const log = path.join(directory, name + ".log");
  await writeFile(log, Buffer.concat(chunks));
  return {
    exitCode,
    durationMs: Date.now() - begin,
    command: [process.execPath, ...args],
    log: path.relative(root, log),
  };
}
async function json(file) {
  try {
    if ((await stat(file)).mtimeMs < startedAt.getTime()) return null;
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}
function cases(report) {
  const rows = [];
  function visit(suite) {
    for (const spec of suite.specs || [])
      for (const t of spec.tests || []) rows.push({ ...t, title: spec.title });
    for (const child of suite.suites || []) visit(child);
  }
  for (const suite of report?.suites || []) visit(suite);
  return rows;
}
async function currentScreenshots(dir) {
  const found = [];
  try {
    for (const file of await readdir(dir, { withFileTypes: true })) {
      const name = path.join(dir, file.name);
      if (file.isDirectory()) found.push(...(await currentScreenshots(name)));
      else if (
        file.name.endsWith(".png") &&
        (await stat(name)).mtimeMs >= startedAt.getTime()
      )
        found.push(path.relative(root, name));
    }
  } catch {
    /* No screenshot was captured when the browser could not start. */
  }
  return found;
}
const steps = {};
steps.typecheck = await run("typecheck", [
  "node_modules/typescript/bin/tsc",
  "--noEmit",
]);
steps.build = await run("build", ["node_modules/vite/bin/vite.js", "build"]);
steps.buildOnline = await run("build-online", [
  "node_modules/vite/bin/vite.js",
  "build",
  "--mode",
  "online",
  "--outDir",
  "dist-online",
]);
steps.buildServer = await run("build-server", [
  "node_modules/vite/bin/vite.js",
  "build",
  "--config",
  "vite.server.config.ts",
]);
steps.ragEvaluation =
  steps.buildServer.exitCode === 0
    ? await run("rag-evaluation", ["dist-server/index.js", "--evaluate-rag"])
    : {
        exitCode: null,
        reason: "Backend build failed; no stale RAG evaluator was run.",
      };
steps.aiEvaluation =
  steps.buildServer.exitCode === 0
    ? await run("ai-evaluation", ["dist-server/index.js", "--evaluate-ai"])
    : {
        exitCode: null,
        reason: "Backend build failed; no stale AI evaluator was run.",
      };
steps.vitest = await run("vitest", [
  "node_modules/vitest/vitest.mjs",
  "run",
  "--reporter=dot",
  "--reporter=json",
  "--outputFile=output/qa/vitest.json",
]);
steps.discovery = await run(
  "playwright-discovery",
  ["node_modules/@playwright/test/cli.js", "test", "--list", "--reporter=json"],
  {
    PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(
      directory,
      "playwright-discovery.json",
    ),
  },
);
// Only a successful build is eligible for production-preview browser verification.
steps.playwright =
  steps.build.exitCode === 0
    ? await run("playwright", ["node_modules/@playwright/test/cli.js", "test"])
    : {
        exitCode: null,
        reason: "Build failed; no stale production build was tested.",
      };
steps.onlineDiscovery = await run(
  "playwright-online-discovery",
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "--config",
    "playwright.online.config.ts",
    "--list",
    "--reporter=json",
  ],
  {
    PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(
      directory,
      "playwright-online-discovery.json",
    ),
  },
);
steps.onlinePlaywright =
  steps.buildOnline.exitCode === 0 && steps.buildServer.exitCode === 0
    ? await run("playwright-online", [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        "playwright.online.config.ts",
      ])
    : { exitCode: null, reason: "Online build failed; no stale build tested." };
const unit = await json(path.join(directory, "vitest.json"));
const discovery = await json(path.join(directory, "playwright-discovery.json"));
const browser =
  steps.playwright.exitCode === null
    ? null
    : await json(path.join(root, "output/playwright/report.json"));
const planned = cases(discovery).length,
  rows = cases(browser);
const executed = rows.filter((t) =>
  t.results?.some((r) => r.status !== "skipped"),
);
const passed = executed.filter(
  (t) => t.results.at(-1).status === "passed",
).length;
const failed = executed.filter((t) =>
  ["failed", "timedOut"].includes(t.results.at(-1).status),
).length;
const interrupted = executed.filter(
  (t) => t.results.at(-1).status === "interrupted",
).length;
const skipped = rows.filter((t) =>
  t.results?.some((r) => r.status === "skipped"),
).length;
const actualJourneys = executed
  .filter((t) => t.annotations?.some((a) => a.type === "application-loaded"))
  .map((t) => ({
    project: t.projectName,
    title: t.title,
    status: t.results.at(-1).status,
  }));
const report = {
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  steps,
  rag: await json(path.join(directory, "rag-evaluation.json")),
  ai: await json(path.join(directory, "ai-evaluation.json")),
  vitest: unit
    ? {
        passed: unit.numPassedTests,
        failed: unit.numFailedTests,
        skipped: unit.numPendingTests,
        total: unit.numTotalTests,
        success: unit.success,
      }
    : { status: "report-unavailable" },
  playwright: {
    planned,
    passed,
    failed,
    interrupted,
    skipped,
    notExecuted: Math.max(0, planned - executed.length - skipped),
    actualJourneys,
    errors: browser?.errors || [],
    status:
      steps.playwright.exitCode === 0 &&
      executed.length === planned &&
      planned > 0
        ? "passed"
        : actualJourneys.length
          ? "failed"
          : "blocked",
  },
  screenshots: await currentScreenshots(path.join(root, "output/playwright")),
  totals: {
    passed: (unit?.numPassedTests || 0) + passed,
    failed: (unit?.numFailedTests || 0) + failed,
    skipped: (unit?.numPendingTests || 0) + skipped,
    interrupted,
    notExecuted: Math.max(0, planned - executed.length - skipped),
  },
};
const onlineDiscovery = await json(
  path.join(directory, "playwright-online-discovery.json"),
);
const onlineBrowser = await json(
  path.join(root, "output/playwright-online/report.json"),
);
const onlineRows = cases(onlineBrowser),
  onlinePlanned = cases(onlineDiscovery).length;
const onlineExecuted = onlineRows.filter((t) =>
  t.results?.some((r) => r.status !== "skipped"),
);
const onlinePassed = onlineExecuted.filter(
  (t) => t.results.at(-1).status === "passed",
).length;
const onlineFailed = onlineExecuted.filter((t) =>
  ["failed", "timedOut"].includes(t.results.at(-1).status),
).length;
const onlineSkipped = onlineRows.filter((t) =>
  t.results?.some((r) => r.status === "skipped"),
).length;
report.playwrightOnline = {
  planned: onlinePlanned,
  passed: onlinePassed,
  failed: onlineFailed,
  skipped: onlineSkipped,
  notExecuted: Math.max(
    0,
    onlinePlanned - onlineExecuted.length - onlineSkipped,
  ),
  status:
    steps.onlinePlaywright.exitCode === 0 &&
    onlineExecuted.length === onlinePlanned &&
    onlinePlanned > 0
      ? "passed"
      : onlineExecuted.length
        ? "failed"
        : "blocked",
  errors: onlineBrowser?.errors || [],
};
report.screenshots.push(
  ...(await currentScreenshots(path.join(root, "output/playwright-online"))),
);
report.totals.passed += onlinePassed;
report.totals.failed += onlineFailed;
report.totals.skipped += onlineSkipped;
report.totals.notExecuted += report.playwrightOnline.notExecuted;
report.status =
  Object.values(steps).every((s) => s.exitCode === 0) &&
  unit?.success &&
  report.playwright.status === "passed" &&
  report.playwrightOnline.status === "passed"
    ? "passed"
    : "incomplete";
await writeFile(
  path.join(directory, "summary.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "\n[QA] " +
    JSON.stringify(
      {
        status: report.status,
        vitest: report.vitest,
        playwright: { ...report.playwright, errors: undefined },
        playwrightOnline: report.playwrightOnline,
        screenshots: report.screenshots,
      },
      null,
      2,
    ),
);
if (report.status !== "passed") process.exitCode = 1;
