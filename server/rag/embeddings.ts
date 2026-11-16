import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createHash } from "node:crypto";

export interface Encoder {
  readonly identity: string;
  readonly dimension: number;
  encode(
    texts: string[],
    kind: "query" | "passage",
    signal: AbortSignal,
  ): Promise<number[][]>;
}
export function normalized(vector: number[], dimension: number) {
  if (vector.length !== dimension || vector.some((n) => !Number.isFinite(n)))
    throw Error("Invalid embedding");
  const norm = Math.hypot(...vector);
  if (!norm) throw Error("Empty embedding");
  return vector.map((n) => n / norm);
}
const manifestSchema = z
  .object({
    modelId: z.literal("Xenova/multilingual-e5-small"),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    dimension: z.literal(384),
    dtype: z.literal("q8"),
    files: z
      .array(
        z
          .object({
            path: z.string(),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(4)
      .max(10),
  })
  .strict();

/** No network, inference service, API key, or chat-model configuration in this adapter. */
const importRuntime = () => {
  const name = "@huggingface/transformers";
  return import(/* @vite-ignore */ name);
};
export async function loadLocalEncoder(
  directory: string,
  loadModule = importRuntime,
): Promise<Encoder> {
  const root = await realpath(directory);
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")),
  );
  const required = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "onnx/model_quantized.onnx",
  ];
  if (
    new Set(manifest.files.map((f) => f.path)).size !== manifest.files.length ||
    required.some((f) => !manifest.files.some((x) => x.path === f))
  )
    throw Error("Incomplete embedding artifacts");
  for (const f of manifest.files) {
    if (
      !required.includes(f.path) &&
      !["special_tokens_map.json", "sentencepiece.bpe.model"].includes(f.path)
    )
      throw Error("Invalid artifact");
    const filename = await realpath(path.join(root, f.path));
    if (!filename.startsWith(root + path.sep))
      throw Error("Artifact outside root");
    if (
      createHash("sha256")
        .update(await readFile(filename))
        .digest("hex") !== f.sha256
    )
      throw Error("Artifact checksum mismatch");
  }
  const { env, pipeline } = await loadModule();
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 2;
  const extractor = await pipeline("feature-extraction", root, {
    dtype: "q8",
    device: "cpu",
    local_files_only: true,
  });
  let queue: Promise<unknown> = Promise.resolve();
  return {
    identity: JSON.stringify([
      manifest.modelId,
      manifest.revision,
      manifest.dtype,
      manifest.files,
    ]),
    dimension: 384,
    encode(texts, kind, signal) {
      const task = queue.then(async () => {
        const output: number[][] = [];
        for (const text of texts) {
          signal.throwIfAborted();
          const input = `${kind}: ${text}`;
          const tokenized = await extractor.tokenizer(input, {
            truncation: false,
            padding: false,
          });
          if (tokenized.input_ids.dims.at(-1) > 512)
            throw Error("Embedding input exceeds 512 tokens");
          const tensor = await extractor(input, {
            pooling: "mean",
            normalize: true,
          });
          signal.throwIfAborted();
          output.push(normalized(Array.from(tensor.data) as number[], 384));
        }
        return output;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
