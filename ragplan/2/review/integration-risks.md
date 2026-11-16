# Data flow, compatibility and adversarial workflows

Date: 2026-11-16. All examples are synthetic. This analysis traces the proposed contracts rather than assuming walkthrough prose is an executed test. Findings refer to [HR01–HR14](hostile-review.md). Proposed fields and transitions below are changes for approval, not silent edits to the normative 2.0.0 documents.

## Upload-to-answer trace

| Stage / authority | Required retained data and transaction boundary | Existing contract / compatibility result |
| --- | --- | --- |
| Identity/admission | Trusted tenant/principal/purpose, current identity revision, upload grant, quota; no browser-supplied authority. | C01/S02/S07 are explicit. Test actual issuer and pool; no enterprise identity can be inferred from demo accounts. |
| Stream/quarantine | Server document/version IDs, exact bytes/hash/length, immutable object and safe claim metadata. Finalize durable object before SQL receipt; DB failure leaves orphan. | C09 has a sound staging protocol. Safe probe/scan ownership must remain outside request parsing. |
| Job registration | Same SQL transaction: version/artifact/job/idempotency/outbox; no 202 before commit. | C09 is coherent. Digest includes metadata and source; same key/different digest conflicts, replays reauthorize. |
| Validation/sandbox | Scan verdict/version/health, supported-format decisions, resource limits, actual source handle, safe output manifests. | S06 preserves no trust from MIME/filename. A scanner/error hold is not quality rejection; code/state mapping must distinguish them. |
| Page/part extraction | Raw alternatives, coverage inventory, geometry/raster transforms, OOXML parts/runs, logical order and tables. | C03/C04 are a useful authority. HR07 requires the canonical character domain to match SQL; long output working set is HR11. |
| Canonical acceptance/import | Frozen graph/hash/source refs, complete coverage or authorized waiver; atomically adopted SQL projections. | Do not claim schema validation proves OCR correctness. Hash/import must use the same text and source identities. |
| Staged review | Safe source and candidate evidence accessible before publication, reviewer authority, exact subject revision, decision evidence. | HR01: common read predicate excludes the required staged content. Separate review-package read contract is needed. |
| Semantic enrichment | Typed status/value/scope/evidence, mention/link/relation decisions, current acceptance/applicability. | C05 conservative types are sound; HR06 requires a semantic decision snapshot and retraction protocol. |
| Rendition | Independent source maps/dependencies/approved handling; raw at launch. | Future sanitized access is explicitly disabled; do not add raw-index masking as an integration shortcut. |
| Chunk/index | Stable source intervals/cells, parent hierarchy, exact prefixed input/tokenizer/model/chunker hashes, complete channels. | C07 preserves expensive foundations. A lexical-only profile needs an independently defined bounded splitter if tokenization is not required. Do not fabricate counts. |
| Publication | Lock document/job/policy, validate complete manifest, CAS expected active release; increment declared epochs/outbox. | Correct for replacement. HR02 adds applicability composition; HR04 adds a corpus serving profile; HR06 binds facts. |
| Query/filter/fusion | Same principal/purpose/time/snapshot in all channels; accepted exact predicates, compiler/profile identity, bounded slot allocation. | HR08/HR09 leave materially different legal implementations possible. An opaque QueryPlan name does not settle these choices. |
| Expansion/answer | Reauthorize supporting parents/headers/units/qualifiers; fit a complete permitted evidence bundle; deterministic template accepted facts. | Preserve partial/conflict/insufficient outcomes. Source resolvability and semantic support are separate gates. |
| Final dispatch/citation | Live identity/handling/applicability/semantic state, pending denies, exact source release refs and agreed transport guarantee. | Normal revocation barrier is specified; HR03/HR05 challenge connection-loss/live-journal cases. Citation endpoint never retargets old sources. |
| Deletion/GC/restore | Tombstone/fences, reverse derived dependencies, storage versions, retention roots, current identity/delete/key replay before serving. | Explicit deletion is strong; HR10 asks how active semantic dependencies survive superseded GC. No storage distributed transaction is assumed. |

## Concrete incompatible component pairs

### 1. Review UI versus published-only evidence resolver — HR01 / T01

Input: document D has extraction X in `awaiting_review`, no active release, label unknown→restricted. R is an authorized restricted-intake reviewer. The UI must show the candidate amount and original page before posting a quality decision.

`can_read_evidence(R,E)` evaluates active-release=false and history=false. A historical exception would still not describe unpublished X. The `/reviews` write endpoint cannot supply missing read access. Required change: an explicit staged-review package referencing `(tenant,D,V,X,review_revision)` and limited safe artifacts, a separate read predicate, and revocation checks. Ordinary search stays empty. A custodian capability alone is not a complete resolver policy.

### 2. Source-version publication versus legal applicability — HR02 / T02

Input: V1 says delivery 20 days, warranty 12 months, payment 125 synthetic units. V2 is a one-page amendment: payment becomes 150; all other terms unchanged. Both are permitted sources for one current legal question.

The release relation allows only V1 or V2. Selecting V2 loses warranty evidence; selecting V1 misses payment. Copying the warranty into V2's canonical text fabricates its physical source. Required change: co-applicable independently published members or a restrictive intake rule forcing separate active documents and reviewed amendment edges. Any composition stores exact clause/evidence dependencies and permission conjunction; it is not free-text consolidation.

### 3. Immutable generation versus corpus query encoder — HR04 / T04

Input: D1/g1 uses embedding space A; D2/g2 has switched to space B. Even equal dimensions do not imply equal vector bases. The query encoder cannot choose one space and compare it to both.

Required change: proposed `ServingProfile{id,revision,space_id,member_manifest,state}` with a pinned query-space/profile in the response snapshot, or a fully specified multi-space plan. Model migration shadows B while A remains serving until complete; content changes/deletes during the build must update or invalidate B's manifest. Serving-profile selection rechecks authorization; it does not freeze ACLs. Retaining A and B doubles some index/model resources during migration and needs a quota/reservation.

### 4. Accepted facts versus immutable release snapshot — HR06 / T06

Input: F1 is rule-accepted; source text/active release unchanged. A reviewer appends F2 superseding F1, retracts acceptance, or changes party scope. Exact filters and a buffered template already used F1.

Neither original hash nor embedding-space hash detects a semantic decision change. Required change: proposed `semantic_revision`/immutable decision-set manifest in the served release and snapshot, with mutation/final revalidation rules. `accepted_fact_values` must be a current projection of accepted nonsuperseded observations, never an everlasting accepted row. Link undo and applicability review follow the same protocol. Retained historical decisions remain audit evidence, not trusted current filters.

### 5. Unicode canonical JSON versus SQL projections — HR07 / T07

Input string: `Điều\u00001`. It is NFC and JSON-encodable; it has no specified C03 rejection. PostgreSQL rejects NUL in text/JSONB. A failure at atomic import must be classified as invalid canonical input, not retried as a storage outage.

Required change: raw preservation plus an explicit allowed-character/mapped replacement or review policy **before** acceptance and hashing. The smallest enclosing raw interval remains the citation source; never delete a code point after storing a canonical hash. Also test nonmonotone combining-mark order within an enclosing normalization cluster, astral characters, insertion/deletion maps and invalid surrogate input. The old `A\u0301😀B` example is useful but does not cover these cases.

### 6. Planner versus ranker/evidence budget — HR08 / T08

Three slots with disjoint 100-item channel unions yield 300 unique candidates. A global first-come truncation to 120 can drop all candidates for slot three. Fusion only ranks admitted items. A 2,400-token context may still be unable to hold a single complete large evidence bundle.

Required change: versioned slot reservations, merge/tie rules, packing tokenizer and independent limits for search hits and answer evidence. Return partial/insufficient with allowed missing-slot codes when mandatory context does not fit. No silent dropping of an exception. Use a lexical profile with byte/character bounds and source intervals if the E5 tokenizer is unavailable; label it as a separate chunker profile, not the same token320 profile.

### 7. Superseded GC versus active relations — HR10 / T10

An active appendix or accepted relation depends on a retired extraction from another document. General superseded TTL is 30 days unless a retained citation/hold/records rule applies. A semantic dependency is not necessarily a saved citation and must become an explicit root.

Required change: a root enumeration and reverse dependency transaction for active semantic/serving/applicability manifests. GC must either retain the referenced evidence or atomically invalidate/review dependent active objects before deleting it. Explicit deletion still blocks ordinary access immediately; retention rights do not imply search rights.

## Fifteen adversarial workflow simulations

“Implied behavior” cites design evidence; it is not a claim of passing execution. Safe rejection/review is valid only if the scope and product state say so.

| # / scenario | Correct behavior | Behavior implied by current design / failure point | Missing safeguard or required change / evidence |
| --- | --- | --- | --- |
| 1. 200-page scanned Vietnamese contract | Stream pages, preserve all required regions/digits, checkpoint/review uncertainty and give an honest completion state. Short jobs remain serviceable. | S07 accepts up to 300 pages but caps extraction at 45 minutes and temp at 2 GiB. W03 covers scans without proving long-document working set or scheduling. | HR11/T11: page streaming, cumulative attempt budget, long-job fairness and actual 200-page load. If unsupported, explicit review/rejection before a false ready state. |
| 2. Nested tables/merged cells | Preserve parent cell→nested table structure, single anchored merged cells, headers/units and exact evidence. | C03/C06 element graph and anchored cells can represent it; algorithm/implementation explicitly require tests. No actual nested-table fixture result exists. | AX02/AX04 and ST04: assert cell-element containment and no duplicated monetary fact; unknown topology goes to review. Do not allege nesting is absent merely because there is no `nested_table` scalar field. |
| 3. Same filename, different parties | Independent document IDs/grants and issuer-scoped party identity; clarify ambiguous names. | C02/C05 preserve logical identity and forbid name-only entity merges; dedup does not merge grants. | T06/ST06 plus exact-ID E07 cases. No design defect proven; test both permitted duplicates and denied duplicate without revealing its existence. |
| 4. Incorrect confidentiality label | Treat uploader label as claim, escalate/hold using authority and allow authorized staged inspection. | S03/C05 default unknown restricted and forbid machine downgrades. Correct enforcement is specified; reviewer source access remains HR01. | T01/ST08: review exception and live escalation tests, no publication solely from public claim/no-PII result. |
| 5. Prompt-injection instructions | Preserve as untrusted text; no tool/write/egress/policy control; quoted display must be clear. | S08 disables free synthesis/tools and uses backend references. Detector is not sole boundary. | ST09 across OCR/table/title/metadata. Excerpts can still quote instructions; no promise that all malicious prose disappears. No runtime pass claimed. |
| 6. Access revoked during active query | Honor chosen local dispatch guarantee; discard buffered output when revoked; already dispatched bytes remain irrevocable. | S05 shared/exclusive barrier handles normal scheduling. DB-session loss can release lock independently of HTTP send. Grant expiry can occur without an epoch change. | HR03/T03/ST15: fault-model decision, dispatch fencing/authority and expiry deadline, actual fault tests. A final check alone is insufficient proof. |
| 7. Delete during embedding | Tombstone/deny, stop adoption, purge all derived bytes including late orphan output; never publish deleted source. | C09/C10 fence checkpoints/publication, use immutable attempt artifacts and purge graph. Pending deny visibility across live processes is HR05. | T05/ST14/ST16; force journal append with failed SQL commit, then old encoder completion and a second reader. |
| 8. Worker crashes halfway | Reclaim expired lease; reuse only verified matching checkpoints; preserve previous active release and no duplicates. | C09/W11 specify monotonic fence, input/config checks and no stable-key overwrite. | ST13 plus HR11 long-document checkpoint/temp tests. Ordinary retry design is coherent; not established by a mental pass. |
| 9. Amendment contradicts original | Distinguish full replacement from partial amendment; source-scope current obligations and show conflicts/unknown precedence. | W07 retires original when amendment is same-document source version; current-only read cannot retrieve unchanged original clauses. | HR02/T02; reviewed applicability composition or separate-document restriction. Future-valid and conflicting amendments must not be upload-order wins. |
| 10. Exact contract number | Preserve issuer/punctuation/leading zeros; hard filter only accepted unambiguous exact fact; OCR variants are proposals. | C05/C08/default exact tier supports this; FTS alone may tokenize codes and HR09 leaves natural question construction open. | AX13/AX25/T09 with slash/hyphen IDs, wrong issuer, missing accepted fact, O/0 and denied duplicate. No fuzzy candidate becomes accepted equality. |
| 11. Several sections needed | Retrieve a complete permitted evidence bundle including exception/condition; otherwise partial/insufficient. | C07/defaults bound context, children and three subqueries. Global120 admission/slot allocation and alternative gold bundle semantics are undefined. | HR08/HR13/T08/T13; reserve rare slots and measure complete evidence after every truncation/packing step. |
| 12. Low OCR quality, wrong money | Preserve alternatives and source image, use ambiguous/null until validated; human approval must be source-grounded. | W03/C05 call for disagreement review and accepted typed facts, but correlated OCR agreement and reviewer errors remain possible. | AX05/T14; blind gold wrong digits/headers, no auto-accept consensus rule; HR06 retraction invalidates buffered answer. |
| 13. Multi-tenant request | One trusted tenant context; reject unsupported aggregation or split only into independently authorized isolated requests under an explicit future contract. | C01/C08/S02 forbid caller tenant authority; no cross-tenant retrieval API. This is safe scope, not a missing permission bypass. | ST01/ST02; document_ids/entity_ids from another tenant disclose nothing. Do not widen context because the natural-language question mentions multiple tenants. |
| 14. Model migration in service | Keep a compatible corpus/query profile active; shadow new representations; atomic serving switch/rollback without deleted-source resurrection. | C10 allows dual generations and atomic document releases, but mixed active spaces during staggered migration have no query-routing contract. | HR04/T04; serving-profile membership, content churn reconciliation, memory/disk overlap quota and same-dimension revision negatives. |
| 15. Retry completed ingestion | Reauthorize response replay; return same completed refs/release or safe terminal conflict, no new publication. | C09 stage keys/publication uniqueness/lost-ack handling provide this design; a deliberate reprocess is a distinct operation. | ST13 with same key/same digest, different digest, concurrent retry, expired 7-day API key and unchanged lifetime stage key. No evidence justifies alleging exactly-once delivery exists. |

## Expensive foundations versus replaceable components

| Decision | Likelihood / impact / later rework | Earliest detection / prevention |
| --- | --- | --- |
| Legal source applicability and history permissions | High when partial amendments exist; lost current evidence; XL. | T02 at P00, before source/release schema freeze; explicit source set or strict intake restriction. |
| Staged/published policy split | High for first review; unsafe bypass or blocked workflow; L. | T01 before RLS/review API freeze. |
| Transport/journal failure domain | Medium fault-dependent, confidentiality impact critical; L–XL. | T03/T05 minimum spikes before confidential API semantics/topology are accepted. |
| Semantic/corpus model identities | High on correction/migration; stale trusted claims or retrieval gaps; L–XL. | T04/T06 at P00 before release/profile contracts freeze. |
| Coordinates, tables, offsets, evidence dependency roots | Variable input prevalence, permanent loss if source/map/GC wrong; XL. | T07/T10 and actual adapter coverage cases before canonical acceptance/retention automation. Preserve source bytes/maps now. |
| Chunk boundaries and projection context | Medium quality risk; reindex M–L if raw graph survives. | Controlled AX17/AX24 before profile freeze. No reason to change canonical authority for a chunk experiment. |
| RRF k, MMR, query compiler, optional reranker | Quality impact uncertain; S–M and re-evaluation, usually no corpus reparse. | AX12–AX23 paired tests. Do not treat these like irreversible security schema choices. |
| External vector engine or GPU fleet | Low justified need at current unmeasured scale; high operational cost if premature. | AX26/T12 capacity evidence before adding another authority/service. |

The critical path remains a secure upload→staged review→authorized lexical hit→source slice. It must include the corrected identities and policy distinctions; it need not wait for every optional model experiment.
