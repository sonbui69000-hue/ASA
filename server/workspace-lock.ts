import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "./errors";
/** One process owns the local JSON writer. An unclean exit requires operator review. */
export async function lockWorkspace(directory: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, ".writer-lock"),
    token = JSON.stringify({ pid: process.pid, token: randomUUID() });
  try {
    const handle = await open(file, "wx", 0o600);
    try {
      await handle.writeFile(token);
    } finally {
      await handle.close();
    }
  } catch {
    throw new ApiError(
      "WORKSPACE_BUSY",
      409,
      "Workspace đang được sử dụng. Dừng server trước khi nhập; chỉ gỡ .writer-lock sau khi kiểm tra process cũ đã dừng.",
    );
  }
  const onExit = () => {
    try {
      if (readFileSync(file, "utf8") === token) unlinkSync(file);
    } catch {
      /* no raw errors */
    }
  };
  process.once("exit", onExit);
  return async () => {
    process.removeListener("exit", onExit);
    try {
      if ((await readFile(file, "utf8")) === token) await unlink(file);
    } catch {
      /* already released */
    }
  };
}
