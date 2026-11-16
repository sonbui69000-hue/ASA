import type { Account, State, StateRef } from "../../src/domain/types";
import { normalize } from "../../src/domain/types";
import { account } from "../../src/domain/selectors";
import type { Evidence } from "../../src/domain/assistant";
import { citation, hash, ingest, permitted, type Chunk } from "./chunks";
import { normalized, type Encoder } from "./embeddings";

export interface SearchOptions {
  category?: string;
  documentId?: string;
  departmentId?: string;
  limit?: number;
}
export interface SearchResult {
  retrievalMode: "hybrid" | "keyword";
  semanticStatus: "ready" | "semantic_unavailable";
  passages: Evidence[];
}
const stop = new Set(
  "la gi va cac cua trong cho toi xin muon can hay the nao nhung voi duoc khi mot nay do theo tai lieu quy dinh quy trinh chinh sach noi dung co khong ve".split(
    " ",
  ),
);
export function tokens(text: string) {
  return (
    normalize(text)
      .match(/[a-z0-9]+(?:-[a-z0-9]+)*/g)
      ?.filter((t) => !stop.has(t)) || []
  );
}
/** Corpus statistics are computed ONLY over the principal's eligible, filtered chunks. */
export function bm25(query: string, chunks: Chunk[]) {
  const terms = [...new Set(tokens(query))];
  if (!terms.length || !chunks.length) return [];
  const fields = chunks.map((c) => ({
    body: tokens(c.text),
    heading: tokens(c.sectionTitle),
    title: tokens(c.documentTitle),
  }));
  const length = fields.map(
      (f) => f.body.length + f.heading.length + f.title.length,
    ),
    avg = length.reduce((a, b) => a + b, 0) / chunks.length || 1;
  const frequency = terms.map(
    (t) =>
      fields.filter((f) => [...f.body, ...f.heading, ...f.title].includes(t))
        .length,
  );
  return chunks
    .map((chunk, i) => {
      const f = fields[i];
      let score = 0;
      terms.forEach((term, j) => {
        const tf =
          f.body.filter((x) => x === term).length +
          2 * f.heading.filter((x) => x === term).length +
          1.5 * f.title.filter((x) => x === term).length;
        score +=
          (Math.log(
            1 + (chunks.length - frequency[j] + 0.5) / (frequency[j] + 0.5),
          ) *
            tf *
            2.2) /
          (tf + 1.2 * (0.25 + (0.75 * length[i]) / avg));
      });
      return { chunk, score };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId),
    )
    .slice(0, 20);
}
function authorized(
  state: State,
  actor: Account,
  chunks: Chunk[],
  query: string,
  options: SearchOptions,
) {
  const principal = account(state, actor.id);
  const explicitId =
    options.documentId || query.match(/DEMO-TL-[A-Z0-9-]+/i)?.[0].toUpperCase();
  return chunks.filter(
    (c) =>
      permitted(state, principal, c) &&
      (!explicitId ||
        [c.recordId, c.documentRootId].some(
          (id) => id.toUpperCase() === explicitId.toUpperCase(),
        )) &&
      (!options.category || c.category === options.category) &&
      (!options.departmentId || c.departmentId === options.departmentId),
  );
}
export function fuse(
  keyword: { chunk: Chunk; score: number }[],
  semantic: { chunk: Chunk; score: number }[],
) {
  const rows = new Map<string, { chunk: Chunk; score: number }>();
  for (const ranking of [keyword, semantic])
    ranking.slice(0, 20).forEach((r, i) => {
      const old = rows.get(r.chunk.chunkId);
      rows.set(r.chunk.chunkId, {
        chunk: r.chunk,
        score: (old?.score || 0) + 1 / (60 + i + 1),
      });
    });
  return [...rows.values()].sort(
    (a, b) =>
      b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId),
  );
}
function evidence(
  rows: { chunk: Chunk; score: number }[],
  state: State,
  actor: Account,
  ref: StateRef,
  limit = 6,
) {
  const chosen: Chunk[] = [];
  let bytes = 0;
  for (const { chunk: c } of rows) {
    if (chosen.length >= Math.min(6, limit)) break;
    if (!permitted(state, actor, c)) continue;
    const same = chosen.filter(
      (x) => x.recordId === c.recordId && x.sectionId === c.sectionId,
    );
    if (
      same.length >= 2 ||
      same.some(
        (x) =>
          Math.min(x.sourceEnd, c.sourceEnd) -
            Math.max(x.sourceStart, c.sourceStart) >
          Math.min(x.text.length, c.text.length) * 0.5,
      )
    )
      continue;
    const size = Buffer.byteLength(c.text);
    if (bytes + size > 6000) continue;
    bytes += size;
    chosen.push(c);
  }
  return chosen.map((c) => citation(c, ref, "doc-" + c.chunkId.slice(0, 24)));
}
export function keywordSearch(
  state: State,
  actor: Account,
  ref: StateRef,
  query: string,
  options: SearchOptions = {},
): SearchResult {
  const chunks = authorized(state, actor, ingest(state), query, options);
  const rows = bm25(query, chunks);
  // An explicit permitted record is a valid lookup even with no lexical query terms.
  const ranked =
    (options.documentId || /^DEMO-TL-[\w-]+$/i.test(query.trim())) &&
    !rows.length
      ? chunks.map((chunk) => ({ chunk, score: 1 }))
      : rows;
  return {
    retrievalMode: "keyword",
    semanticStatus: "semantic_unavailable",
    passages: evidence(ranked, state, actor, ref, options.limit),
  };
}
interface Generation {
  chunks: Chunk[];
  vectors: Map<string, number[]>;
  ready: boolean;
}
export class DocumentIndex {
  private current?: { key: string; value: Promise<Generation> };
  private vectors = new Map<string, number[]>();
  private failures = 0;
  constructor(
    private encoder?: Encoder,
    private minCosine = 0.78,
  ) {}
  status() {
    return this.encoder && !this.failures
      ? ("ready" as const)
      : ("semantic_unavailable" as const);
  }
  private generation(state: State) {
    const chunks = ingest(state),
      key = hash([this.encoder?.identity, chunks]);
    if (this.current?.key === key) return this.current.value;
    const value = (async (): Promise<Generation> => {
      const vectors = new Map<string, number[]>();
      if (!this.encoder) return { chunks, vectors, ready: false };
      try {
        const deadline = AbortSignal.timeout(15000);
        for (const chunk of chunks) {
          deadline.throwIfAborted();
          const text = `${chunk.documentTitle}\n${chunk.sectionTitle}\n${chunk.text}`,
            cacheKey = hash([this.encoder.identity, text]);
          let vector = this.vectors.get(cacheKey);
          if (!vector) {
            const encoded = await this.encoder.encode(
              [text],
              "passage",
              deadline,
            );
            if (encoded.length !== 1) throw Error("Invalid embedding batch");
            vector = normalized(encoded[0], this.encoder.dimension);
            if (this.vectors.size >= 2000)
              this.vectors.delete(this.vectors.keys().next().value!);
            this.vectors.set(cacheKey, vector);
          }
          vectors.set(chunk.chunkId, vector);
        }
        this.failures = 0;
        return { chunks, vectors, ready: true };
      } catch {
        this.failures++;
        return { chunks, vectors: new Map(), ready: false };
      }
    })();
    this.current = { key, value };
    return value;
  }
  async search(
    state: State,
    actor: Account,
    ref: StateRef,
    query: string,
    options: SearchOptions = {},
    signal = AbortSignal.timeout(15000),
  ): Promise<SearchResult> {
    account(state, actor.id);
    signal.throwIfAborted();
    const bounded = AbortSignal.any([signal, AbortSignal.timeout(15000)]);
    let index: Generation;
    try {
      index = await new Promise<Generation>((resolve, reject) => {
        const abort = () => reject(bounded.reason);
        bounded.addEventListener("abort", abort, { once: true });
        this.generation(state)
          .then(resolve, reject)
          .finally(() => bounded.removeEventListener("abort", abort));
      });
    } catch {
      signal.throwIfAborted();
      return keywordSearch(state, actor, ref, query, options);
    }
    signal.throwIfAborted();
    const chunks = authorized(state, actor, index.chunks, query, options),
      keyword = bm25(query, chunks);
    let semantic: { chunk: Chunk; score: number }[] = [];
    let ready = index.ready;
    if (ready && chunks.length) {
      try {
        const encoded = await this.encoder!.encode([query], "query", bounded);
        if (encoded.length !== 1) throw Error("Invalid embedding query");
        const vector = normalized(encoded[0], this.encoder!.dimension);
        semantic = chunks
          .map((chunk) => ({
            chunk,
            score: index.vectors
              .get(chunk.chunkId)!
              .reduce((sum, v, i) => sum + v * vector[i], 0),
          }))
          .filter((r) => r.score >= this.minCosine)
          .sort(
            (a, b) =>
              b.score - a.score ||
              a.chunk.chunkId.localeCompare(b.chunk.chunkId),
          )
          .slice(0, 20);
      } catch {
        signal.throwIfAborted();
        ready = false;
      }
    }
    signal.throwIfAborted();
    const ranked = fuse(keyword, semantic);
    const lookup =
      (options.documentId || /^DEMO-TL-[\w-]+$/i.test(query.trim())) &&
      !ranked.length
        ? chunks.map((chunk) => ({ chunk, score: 1 }))
        : ranked;
    return {
      retrievalMode: ready ? "hybrid" : "keyword",
      semanticStatus: ready ? "ready" : "semantic_unavailable",
      passages: evidence(lookup, state, actor, ref, options.limit),
    };
  }
}
