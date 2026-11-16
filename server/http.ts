import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
export function createHttpServer(
  handle: (request: Request, source?: string) => Promise<Response>,
  staticRoot: string,
) {
  const server = createServer(async (req, res) => {
    const abort = new AbortController();
    req.on("aborted", () => abort.abort());
    res.on("close", () => {
      if (!res.writableEnded) abort.abort();
    });
    try {
      const host = req.headers.host || "";
      if (
        ![
          "127.0.0.1:8080",
          "localhost:8080",
          "127.0.0.1:5174",
          "localhost:5174",
        ].includes(host)
      ) {
        res.writeHead(403);
        res.end("Nguồn truy cập không được phép.");
        return;
      }
      const url = new URL(req.url || "/", `http://${host}`);
      if (url.pathname.startsWith("/api/")) {
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 220 * 1024) {
            res.writeHead(413);
            res.end("Yêu cầu quá lớn.");
            return;
          }
          chunks.push(chunk);
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value)
            headers.set(key, Array.isArray(value) ? value.join("; ") : value);
        }
        const request = new Request(url, {
          method: req.method,
          headers,
          signal: abort.signal,
          ...(!["GET", "HEAD"].includes(req.method || "GET")
            ? { body: Buffer.concat(chunks) }
            : {}),
        });
        const response = await handle(
          request,
          req.socket.remoteAddress || "local",
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (req.method !== "GET") {
        res.writeHead(405);
        res.end();
        return;
      }
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.split("/").some((part) => part.startsWith("."))) {
        res.writeHead(404);
        res.end();
        return;
      }
      let file = path.resolve(staticRoot, "." + decoded);
      if (!file.startsWith(staticRoot + path.sep)) {
        file = path.join(staticRoot, "index.html");
      }
      let content: Buffer;
      try {
        const resolved = await realpath(file);
        if (!resolved.startsWith(staticRoot + path.sep)) throw Error();
        content = await readFile(resolved);
      } catch {
        file = path.join(staticRoot, "index.html");
        content = await readFile(file);
      }
      const type: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".json": "application/json",
      };
      res.writeHead(200, {
        "Content-Type": type[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      if (!res.headersSent)
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Dịch vụ chưa sẵn sàng; kiểm tra bản build và máy chủ.");
    }
  });
  return server;
}
