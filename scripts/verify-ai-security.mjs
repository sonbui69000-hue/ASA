// Run with Node's native --env-file-if-exists=.env. Output contains only safe metadata.
import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
const key = process.env.OPENROUTER_API_KEY?.trim();
const model = process.env.OPENROUTER_MODEL?.trim();
const roots = [
  "src",
  "server",
  "docs",
  "tests",
  "scripts",
  "dist",
  "dist-online",
  "dist-server",
  "dist-test-server",
  "output",
  "README.md",
  "AGENTS.md",
  "package.json",
  "package-lock.json",
];
const matches = [],
  scannedRoots = [],
  missingRoots = [];
let filesScanned = 0;
async function scan(file) {
  let info;
  try {
    info = await stat(file);
  } catch {
    missingRoots.push(file);
    return;
  }
  if (info.isDirectory()) {
    for (const entry of await readdir(file)) await scan(path.join(file, entry));
  } else {
    filesScanned++;
    if (key && (await readFile(file)).includes(Buffer.from(key)))
      matches.push(file);
  }
}
for (const root of roots) {
  scannedRoots.push(root);
  await scan(root);
}
let git;
try {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .split("\0")
    .filter(Boolean);
  const secretMatches = [];
  for (const file of tracked) {
    try {
      if (key && (await readFile(file)).includes(Buffer.from(key)))
        secretMatches.push(file);
    } catch {
      /* deleted tracked path */
    }
  }
  git = {
    status: "checked-current-index-only",
    trackedFiles: tracked.length,
    envTracked: tracked.includes(".env"),
    secretMatches,
    historyChecked: false,
  };
} catch {
  git = {
    status: "unverified-no-active-git-repository",
    historyChecked: false,
  };
}
const permissions = {};
for (const file of [
  ".env",
  ".local/online",
  ".local/online/state.json",
  ".local/online/credentials.json",
  ".local/online/access-codes.json",
  ".local/online/usage.json",
]) {
  try {
    permissions[file] = ((await stat(file)).mode & 0o777).toString(8);
  } catch {
    permissions[file] = "absent";
  }
}
let envUnchanged = null;
try {
  const baseline = JSON.parse(
    await readFile("output/qa/env-baseline.json", "utf8"),
  );
  envUnchanged =
    createHash("sha256")
      .update(await readFile(".env"))
      .digest("hex") === baseline.envHash;
} catch {
  /* report unknown rather than infer */
}
const report = {
  evaluatedAt: new Date().toISOString(),
  apiKeyPresent: !!key,
  model,
  filesScanned,
  scannedRoots,
  missingRoots,
  exactKeyMatches: matches,
  envUnchanged,
  git,
  permissions,
  screenshotVisualAudit: "not_inferred_from_byte_scan",
};
await mkdir("output/qa", { recursive: true });
await writeFile(
  "output/qa/security-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (
  !key ||
  !model ||
  matches.length ||
  envUnchanged === false ||
  git.envTracked ||
  git.secretMatches?.length
)
  process.exitCode = 1;
