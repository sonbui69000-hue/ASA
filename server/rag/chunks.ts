import { createHash } from "node:crypto";
import type {
  Account,
  DemoDocument,
  State,
  StateRef,
} from "../../src/domain/types";
import { account, canReadDocument } from "../../src/domain/selectors";
import type { Evidence } from "../../src/domain/assistant";

export const CHUNKER = "section-span-v1";
export const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface Chunk {
  chunkId: string;
  documentRootId: string;
  recordId: string;
  documentTitle: string;
  category: string;
  departmentId: string;
  version: number;
  effectiveDate: string;
  expires: string;
  sectionId: string;
  sectionTitle: string;
  sourceStart: number;
  sourceEnd: number;
  text: string;
  contentHash: string;
  publicationFingerprint: string;
  aclFingerprint: string;
}
export function rootId(doc: DemoDocument, documents: DemoDocument[]) {
  const parents = documents.filter(
    (d) => doc.id === `${d.id}-v${doc.version}` && d.version > doc.version,
  );
  return parents.length === 1 ? parents[0].id : doc.id;
}
export function publicationFingerprint(d: DemoDocument) {
  return hash([
    d.id,
    d.title,
    d.version,
    d.category,
    d.departmentId,
    d.status,
    d.date,
    d.expires,
    d.sections,
  ]);
}
export const aclFingerprint = (d: DemoDocument) =>
  hash([...d.readRoles].sort());

/** A conflicting lineage is unavailable, rather than silently choosing one publication. */
export function eligibleDocuments(state: State) {
  const rows = state.documents.filter(
    (d) =>
      d.status === "published" &&
      d.date <= state.settings.date &&
      d.expires >= state.settings.date,
  );
  const counts = new Map<string, number>();
  for (const d of rows) {
    const root = rootId(d, state.documents);
    counts.set(root, (counts.get(root) || 0) + 1);
  }
  return rows.filter((d) => counts.get(rootId(d, state.documents)) === 1);
}

/** Exact UTF-16 spans. Never cross a section; retain paragraph/sentence/bullet boundaries. */
export function sectionSpans(
  text: string,
  maxBytes = 1000,
  overlapBytes = 160,
) {
  if (maxBytes < 32 || overlapBytes >= maxBytes)
    throw Error("Invalid chunk budget");
  const sentences = [
    ...new Intl.Segmenter("vi", { granularity: "sentence" }).segment(text),
  ];
  const atoms: { start: number; end: number }[] = [];
  for (const sentence of sentences) {
    const parts = sentence.segment.matchAll(/[^\n]+\n*|\n+/g);
    for (const part of parts) {
      const start = sentence.index + part.index!,
        end = start + part[0].length;
      let cursor = start;
      while (cursor < end) {
        let next = cursor,
          boundary = cursor;
        for (const cp of text.slice(cursor, end)) {
          if (
            Buffer.byteLength(text.slice(cursor, next + cp.length)) > maxBytes
          )
            break;
          next += cp.length;
          if (/\s/u.test(cp)) boundary = next;
        }
        if (next < end && boundary > cursor) next = boundary;
        if (next <= cursor) throw Error("Invalid source span");
        atoms.push({ start: cursor, end: next });
        cursor = next;
      }
    }
  }
  const spans: { start: number; end: number }[] = [];
  let i = 0;
  while (i < atoms.length) {
    const start = atoms[i].start;
    let j = i + 1;
    while (
      j < atoms.length &&
      Buffer.byteLength(text.slice(start, atoms[j].end)) <= maxBytes
    )
      j++;
    const end = atoms[j - 1].end;
    if (text.slice(start, end).trim()) spans.push({ start, end });
    if (j === atoms.length) break;
    let next = j;
    while (
      next > i + 1 &&
      Buffer.byteLength(text.slice(atoms[next - 1].start, end)) <= overlapBytes
    )
      next--;
    i = next;
  }
  return spans;
}
export function ingest(state: State): Chunk[] {
  return eligibleDocuments(state).flatMap((d) =>
    d.sections.flatMap((section) =>
      sectionSpans(section.text).map((span) => {
        const text = section.text.slice(span.start, span.end),
          contentHash = hash(text);
        const identity = [
          CHUNKER,
          d.id,
          d.version,
          section.id,
          span.start,
          span.end,
          contentHash,
        ];
        return {
          chunkId: hash(identity),
          documentRootId: rootId(d, state.documents),
          recordId: d.id,
          documentTitle: d.title,
          category: d.category,
          departmentId: d.departmentId,
          version: d.version,
          effectiveDate: d.date,
          expires: d.expires,
          sectionId: section.id,
          sectionTitle: section.title,
          sourceStart: span.start,
          sourceEnd: span.end,
          text,
          contentHash,
          publicationFingerprint: publicationFingerprint(d),
          aclFingerprint: aclFingerprint(d),
        };
      }),
    ),
  );
}
export function permitted(state: State, actor: Account, chunk: Chunk) {
  try {
    account(state, actor.id);
  } catch {
    return false;
  }
  const d = eligibleDocuments(state).find((d) => d.id === chunk.recordId);
  const section = d?.sections.find((s) => s.id === chunk.sectionId);
  return (
    !!d &&
    !!section &&
    canReadDocument(state, account(state, actor.id), d) &&
    d.version === chunk.version &&
    publicationFingerprint(d) === chunk.publicationFingerprint &&
    aclFingerprint(d) === chunk.aclFingerprint &&
    section.text.slice(chunk.sourceStart, chunk.sourceEnd) === chunk.text &&
    hash(chunk.text) === chunk.contentHash
  );
}
export function citation(
  chunk: Chunk,
  ref: StateRef,
  evidenceId: string,
): Evidence {
  return {
    recordId: chunk.recordId,
    title: `${chunk.documentTitle} • v${chunk.version} • ${chunk.sectionTitle}`,
    documentTitle: chunk.documentTitle,
    documentRootId: chunk.documentRootId,
    sectionTitle: chunk.sectionTitle,
    version: chunk.version,
    sectionId: chunk.sectionId,
    chunkId: chunk.chunkId,
    sourceStart: chunk.sourceStart,
    sourceEnd: chunk.sourceEnd,
    contentHash: chunk.contentHash,
    publicationFingerprint: chunk.publicationFingerprint,
    aclFingerprint: chunk.aclFingerprint,
    stateRef: ref,
    evidenceId,
    passage: chunk.text,
    href: `/tai-lieu/${encodeURIComponent(chunk.recordId)}?version=${chunk.version}&chunk=${chunk.chunkId}#${encodeURIComponent(chunk.sectionId)}`,
  };
}
export function verifyCitation(
  state: State,
  actor: Account,
  e: Evidence,
  ref?: StateRef,
) {
  if (
    !e.chunkId ||
    e.evidenceId !== "doc-" + e.chunkId.slice(0, 24) ||
    (ref && hash(ref) !== hash(e.stateRef))
  )
    return false;
  return ingest(state).some(
    (c) =>
      c.chunkId === e.chunkId &&
      permitted(state, actor, c) &&
      JSON.stringify(citation(c, e.stateRef!, e.evidenceId!)) ===
        JSON.stringify(e),
  );
}
