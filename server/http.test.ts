// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";
import { createHttpServer } from "./http";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "asa-http-verification-"));
  dirs.push(dir);
  const root = path.join(dir, "public");
  await mkdir(root);
  await writeFile(
    path.join(root, "index.html"),
    "<html>Bản mẫu tổng hợp</html>",
  );
  await writeFile(path.join(dir, ".env"), "synthetic-exfiltration-marker");
  await symlink(path.join(dir, ".env"), path.join(root, "leak.js"));
  const handle = vi.fn(async () => Response.json({ ok: true }));
  const server = createHttpServer(handle, root);
  // Actual HTTP request callback, without opening a prohibited localhost port.
  // This is a handler test, not a browser/network substitute.
  async function request(
    url: string,
    method = "GET",
    host = "127.0.0.1:8080",
    body = "",
  ) {
    const req = Object.assign(new PassThrough(), {
      url,
      method,
      headers: { host },
      socket: { remoteAddress: "127.0.0.1" },
    });
    const res = Object.assign(new EventEmitter(), {
      headersSent: false,
      writableEnded: false,
      writeHead: (status: number, headers = {}) => {
        result.status = status;
        result.headers = headers;
        res.headersSent = true;
      },
      end: (content?: Buffer | string) => {
        result.body = content?.toString() || "";
        res.writableEnded = true;
        done();
      },
    });
    const result = {
      status: 0,
      headers: {} as Record<string, string>,
      body: "",
    };
    let done!: () => void;
    const finished = new Promise<void>((resolve) => {
      done = resolve;
    });
    server.emit("request", req, res);
    req.end(body);
    await finished;
    return result;
  }
  return { request, handle };
}
describe("Phase 6.5 static and HTTP trust boundary (no socket bind)", () => {
  it.each([
    "/.env",
    "/%2eenv",
    "/%2f.env",
    "/.local/online/credentials.json",
    "/assets/../../.env",
  ])("does not serve hidden secret path %s", async (url) => {
    const f = await fixture(),
      response = await f.request(url);
    expect(response.status).toBe(404);
    expect(response.body).not.toContain("synthetic-exfiltration-marker");
    expect(f.handle).not.toHaveBeenCalled();
  });
  it("does not follow a public symlink to a private file", async () => {
    const f = await fixture(),
      response = await f.request("/leak.js");
    expect(response.body).toBe("<html>Bản mẫu tổng hợp</html>");
    expect(response.headers["Content-Type"]).toContain("text/html");
    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(response.headers["Content-Security-Policy"]).toContain(
      "connect-src 'self'",
    );
  });
  it("rejects a foreign host and a non-GET static request", async () => {
    const f = await fixture();
    expect((await f.request("/", "GET", "attacker.invalid")).status).toBe(403);
    expect((await f.request("/", "POST")).status).toBe(405);
    expect(f.handle).not.toHaveBeenCalled();
  });
  it("bounds the API body before dispatch and hides raw handler exceptions", async () => {
    const f = await fixture();
    expect(
      (
        await f.request(
          "/api/assistant/query",
          "POST",
          "127.0.0.1:8080",
          "x".repeat(221 * 1024),
        )
      ).status,
    ).toBe(413);
    expect(f.handle).not.toHaveBeenCalled();
    f.handle.mockRejectedValueOnce(Error("synthetic-exfiltration-marker"));
    const response = await f.request("/api/state/ref");
    expect(response.status).toBe(503);
    expect(response.body).not.toContain("synthetic-exfiltration-marker");
  });
});
