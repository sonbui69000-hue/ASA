import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Provisioning only. Runtime encoder never downloads and never uses OPENROUTER_MODEL.
const args = process.argv.slice(2),
  at = args.indexOf("--revision"),
  revision = args[at + 1];
if (at < 0 || !/^[a-f0-9]{40}$/.test(revision || "")) {
  console.error(
    "Cần --revision <commit SHA 40 ký tự> của Xenova/multilingual-e5-small; không dùng nhánh main không khóa.",
  );
  process.exit(1);
}
const destination = path.resolve(
  process.env.RAG_EMBEDDING_DIR || ".local/rag/model",
);
const temporary = destination + ".provision-" + process.pid;
const names = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx",
];
try {
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  const files = [];
  for (const name of names) {
    const response = await fetch(
      `https://huggingface.co/Xenova/multilingual-e5-small/resolve/${revision}/${name}`,
      { signal: AbortSignal.timeout(60000) },
    );
    if (!response.ok) throw Error("Artifact download failed");
    const reader = response.body.getReader(),
      chunks = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 160 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Artifact too large");
      }
      chunks.push(value);
    }
    const data = Buffer.concat(chunks),
      filename = path.join(temporary, name);
    if (!name.endsWith(".onnx")) JSON.parse(data.toString("utf8"));
    await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    await writeFile(filename, data, { mode: 0o600 });
    files.push({
      path: name,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }
  await writeFile(
    path.join(temporary, "manifest.json"),
    JSON.stringify(
      {
        modelId: "Xenova/multilingual-e5-small",
        revision,
        dimension: 384,
        dtype: "q8",
        files,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  // Refuse replacing an existing provisioned model; operator can select a new directory.
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await rename(temporary, destination);
  console.log(
    "Đã provision local E5 + manifest hash. Chạy npm run rag:check để kiểm inference trước khi dùng.",
  );
} catch {
  await rm(temporary, { recursive: true, force: true });
  console.error(
    "Không provision được model: kiểm mạng, commit SHA, dung lượng và đường dẫn đích chưa tồn tại. Không có embedding API bên ngoài được gọi.",
  );
  process.exitCode = 1;
}
