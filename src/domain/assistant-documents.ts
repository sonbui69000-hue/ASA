import type { Account, ReadState as State } from "./types";
import { normalize } from "./types";
import { searchDocuments } from "./selectors";
import type { StateRef } from "./types";
export interface Evidence {
  recordId: string;
  title: string;
  passage: string;
  href: string;
  version?: number;
  sectionId?: string;
  evidenceId?: string;
  documentTitle?: string;
  documentRootId?: string;
  sectionTitle?: string;
  chunkId?: string;
  sourceStart?: number;
  sourceEnd?: number;
  contentHash?: string;
  publicationFingerprint?: string;
  aclFingerprint?: string;
  stateRef?: StateRef;
}
const stop = new Set(
  "tim tra cuu cho toi xin xem la gi nhu the nao bao nhieu co khong trong ve voi cua va tai duoc mot cac nay noi dung nha cung cap ncc quy dinh chinh sach quy trinh tai lieu nam moi hang".split(
    " ",
  ),
);
/** Authorization precedes ranking; excerpts are copied from current, actual sections. */
export function retrievePassages(
  s: State,
  a: Account,
  query: string,
): Evidence[] {
  const id = query.match(/DEMO-TL-[\w-]+/i)?.[0].toUpperCase();
  const q = normalize(query).replace(/DEMO-TL-[\w-]+/gi, "");
  let terms = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((x) => x && !stop.has(x));
  if (q.includes("cap phat"))
    terms = terms.filter((x) => !["cap", "phat"].includes(x));
  if (q.includes("dinh muc"))
    terms = [...terms.filter((x) => !["dinh", "muc"].includes(x)), "dinh muc"];
  if (q.includes("tai cap")) terms.push("tai cap");
  const rows = searchDocuments(s, a, "").filter(
    (r) => !id || r.document.id.toUpperCase() === id,
  );
  return rows
    .flatMap(({ document: d }) =>
      d.sections.flatMap((sec) => {
        const body = normalize(sec.title + " " + sec.text),
          title = normalize(d.title);
        if (!terms.every((t) => (title + " " + body).includes(t))) return [];
        const score = terms.reduce(
          (n, t) =>
            n + (body.includes(t) ? 3 : 0) + (title.includes(t) ? 5 : 0),
          0,
        );
        return [
          {
            score,
            evidence: {
              recordId: d.id,
              title: `${d.title} • v${d.version} • ${sec.title}`,
              passage: sec.text,
              href: `/tai-lieu/${d.id}?version=${d.version}#${sec.id}`,
              version: d.version,
              sectionId: sec.id,
            } satisfies Evidence,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.evidence.recordId.localeCompare(b.evidence.recordId) ||
        a.evidence.sectionId.localeCompare(b.evidence.sectionId),
    )
    .slice(0, 3)
    .map((r) => r.evidence);
}
