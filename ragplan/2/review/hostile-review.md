# Independent hostile architecture review

Review date: 2026-11-16. Verdict: **NO-GO for committing the blueprint unchanged to full implementation/schema freeze**. Isolated synthetic contract and fault experiments can proceed. This verdict concerns specific incompatible or incomplete contracts, not the absence of benchmarks that implementation must produce. It does not call for replacing the entire stack.

This is one independent review using seven professional lenses: architecture, retrieval, document/OCR fidelity, security/privacy, databases/distributed systems, maintainability, and performance/reliability. No claim is made that seven people or agents performed separate audits. Proposed corrections below are recommendations awaiting approval; the source plans and production code have not been repaired.

## Evidence and scope

Evidence classes: **D** = confirmed documentation defect, omission, or counterexample to a stated contract; **R** = credible risk whose actual occurrence remains unverified; **I** = improvement opportunity. A D finding is not evidence of an exploitable deployed service. Confidence describes the reasoning; occurrence likelihood describes the condition under which it matters. No probability of production compromise is invented.

Inspected inputs include the original [request](../../1/rag-plan-prompt.md), all eight revision-1 deliverables, technology/cost/source registers, schema and synthetic examples; the [revision-2 request](../rag-plan-prompt-2.md), all seven revision-2 technical deliverables, readiness register, verification and research records; `proposal.md`, `AGENTS.md`, relevant application/AI/workbook documentation; current `server/rag`, state, HTTP, assistant, workspace-lock and model provisioning code; package/build/test configuration. Revision 2 explicitly supersedes conflicting revision-1 advice. Historical absence-of-repository and five-week estimates are therefore not reopened as new defects. The prompt files were renamed in the shared workspace during review; these links follow their current names. This review did not rename or restore them or alter the original packages' historical links.

Current implementation is a Node/React administrative prototype. `server/rag/chunks.ts` uses UTF-16 spans and byte-bounded chunks; `retrieval.ts` implements scoped BM25-like ranking, RRF and optional exact vectors; `embeddings.ts` dynamically imports a local runtime; `generation.ts` uses lexical/numeric guards, not semantic proof. `package.json` has no enterprise Python/PostgreSQL service. No enterprise deployment manifests were found in the project file search; Vite server/E2E build configs are not production isolation configurations. These observations prevent transferring demo results to the future architecture.

The imported workbook workspace was not opened, exported, reset or used as evaluation data. Existing `StateRepository.externalAiBlocked()` and the early guard in `server/assistant.ts` are credited. Browser RBAC remains a prototype, not real security.

## What the proposal gets right

Retain the application-owned evidence graph, originals, PDF geometry/OOXML locators, independent extraction/rendition/index identities, explicit score domains, conservative unknown handling, restricted parser processes, actual-role RLS tests, immutable attempt artifacts and checkpoint fencing. The no-external-enterprise-inference rule, disabled free synthesis/redacted-only access, and absence of a mandatory reranker are defensible. A new model or vector database does not fix the findings below.

## Findings, ordered by rework prevention

Cost bands are engineering scope estimates, not quotations: S = one contract/adapter; M = several modules; L = lifecycle/query/schema migration; XL = corpus/security-boundary reconstruction. “Now” means before dependent contracts freeze. Earliest detection is included in each verification row.

The register contains 14 findings: eight confirmed contract defects/omissions and six unverified risks; severity is one Critical, eight High and five Medium. The Critical item is a security protocol risk, not a demonstrated deployed exploit.

### HR01 — Publication-only evidence access cannot implement prepublication review

| Attribute | Finding |
| --- | --- |
| Class / severity | D / High |
| Affected | [Data contracts C06 predicate and C08 routes](../rag-data-contracts.md#c06-relational-schema-and-indexes); [security S03](../rag-security-design.md#s03-authorization-model-and-rls); [implementation P04/P05/P08](../rag-implementation-plan.md#test-first-phases-and-integration-checkpoints). |
| Evidence / root cause | `can_read_evidence` requires an active published release or historical capability. A new document awaiting review has neither. The routes for structure, table, evidence and preview promise read authorization; no separate staged-review predicate/resolver or review-package read contract is specified. Custodian authority is named but its content-access exception is not. |
| Failure / impact | A restricted-intake reviewer must inspect a bad amount to approve the first extraction. Applying the common predicate returns unavailable; relaxing the common reader policy to make review work risks exposing unpublished content to search. This blocks a core workflow or encourages an unsafe bypass. |
| Likelihood / confidence | High for first review under the literal predicate; high confidence in the contract gap. An implementation could add a safe exception, but that is an architectural change. |
| Correction / alternatives | Specify `can_inspect_staged_review` with tenant, custodian/reviewer, clearance/purpose, exact immutable extraction, job state, malware/safe-preview status and audit. A review package exposes only bounded staged evidence and a revision token. Keep ordinary retrieval publication-only. Alternative: operator-only offline review, explicitly narrowing the promised UI. Do not grant history rights as a substitute. |
| Fix now / later | M / L: otherwise change API, RLS, review UI and policy helpers together. |
| Verification | T01: before 0003/0004 freeze, review an unpublished synthetic extraction using actual roles; reviewer sees safe source, uploader without clearance and ordinary reader see nothing; search remains empty. |

### HR02 — One active source version cannot represent a partially amending contract

| Attribute | Finding |
| --- | --- |
| Class / severity | D / High |
| Affected | [C02 ownership/publication](../rag-data-contracts.md#c02-document-identity-and-publication), C05 relationships, C06 release tables; [W07](../rag-failure-analysis.md#w07-conflicting-versions); algorithm A04/D02. |
| Evidence / root cause | A release selects exactly one source version/extraction. All normal retrieval uses one active release; old sources require history capability. Yet a source version may be an `amendment` or `appendix`, and W07 says publication retires the old generation. Source replacement and legal applicability have been given the same pointer. |
| Failure / impact | Original v1 contains delivery, warranty and payment; v2 changes only payment. Publishing v2 makes unchanged warranty evidence disappear from current search. Keeping v1 active misses the amendment. An `amendment_of` edge cannot make a retired source eligible under the stated predicate. |
| Likelihood / confidence | High when amendments are uploaded as permitted same-document versions; high confidence. Separate independent documents can avoid the case, but the input representation needs an explicit rule. |
| Correction / alternatives | Add an explicit contract-family/applicability set whose members are independently published source releases; reviewed clause/obligation scope decides replacement versus supplementation. Require conjunction authorization for cross-source answers. Simpler alternative: require amendments as separately active documents and reject nonconsolidated amendments as replacement versions. Never infer legal precedence from upload ordinal. |
| Fix now / later | M–L / XL: source lineage, historical ACLs, current search, facts and citations need migration if conflated. |
| Verification | T02 at P00: original + partial amendment + appendix + future-effective amendment; current-only reader retrieves unchanged original clause and amended clause with exact sources, without receiving broad history rights. |

### HR03 — Database advisory locks do not fence an independent HTTP dispatch after lock loss

| Attribute | Finding |
| --- | --- |
| Class / severity | R / Critical; confirmed missing failure semantics, unverified runtime exploit |
| Affected | [S05](../rag-security-design.md#s05-revocation-publication-and-response-release), C07 `ResponseReleaseGuard`, RB23. |
| Evidence / root cause | S05 holds a shared DB lock through ASGI handoff and states that connection death releases locks. SQL ownership and the API's transport are independent failure domains. The contract has no dispatch fencing permit or acknowledgement/drain protocol for a lost DB session. Advisory locks are cooperative DB locks, not transport fences. [PostgreSQL advisory-lock semantics](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS). |
| Failure / impact | Pause API A after authorization; terminate its DB backend while A remains alive; API B acquires exclusive lock, commits revoke and acknowledges; resume A's pending send before its driver notices loss. Content can be newly dispatched after acknowledgement, violating the stated guarantee. This is a permitted event schedule, not a measured exploit. |
| Likelihood / confidence | Medium under DB disconnect/failover/process scheduling; high confidence the lock alone does not exclude the schedule. Runtime scheduling/cancellation behavior remains untested. |
| Correction / alternatives | Decide the fault model before claiming strict dispatch serialization. A strict design needs a policy-aware dispatch authority with fenced permits and uncertain-permit draining before mutation acknowledgement. A simpler pilot can explicitly adopt bounded authorization leases/revocation delay with approved limits and fail-closed recovery, reducing the claim. A second epoch check still leaves the same boundary. ASGI completion itself is not proof of recipient delivery. [ASGI response semantics](https://asgi.readthedocs.io/en/latest/specs/www.html#response-body-send-event). |
| Fix now / later | M–L / L–XL: affects gateway, revocation API semantics, topology and incident guarantees. |
| Verification | T03 before confidential release; inject DB-session loss, failover, event-loop pause, cancellation and slow clients around handoff. Also expire a grant between authorization and dispatch: clock expiry needs an explicit permit deadline. Test the selected guarantee, not network recall. |

### HR04 — Per-document embedding switches leave corpus query routing undefined

| Attribute | Finding |
| --- | --- |
| Class / severity | D / High |
| Affected | C02 generation bundles, C06 embedding/index/release tables, C07 channel interface, C10 migration; implementation rollout steps 3–5. |
| Evidence / root cause | One active generation bundle per rendition has one dense space. The migration uses per-document release switches, but QueryPlan/snapshot has no corpus serving-profile selector or defined multi-space query procedure. Dimension separation prevents invalid storage, not retrieval omissions or incomparable same-dimension scores. |
| Failure / impact | D1 has switched to E5 revision B while D2 still serves A. Query encoding B omits/miscompares A, encoding A omits/miscompares B; loading both consumes unbudgeted RAM/CPU and needs explicit fusion. An atomic switch for one document is not a corpus switch. |
| Likelihood / confidence | High during an online model change; high confidence in the integration gap, not in any claimed measured recall loss. |
| Correction / alternatives | Introduce a corpus serving profile mapping eligible releases to one compatible dense space; build shadow representations and atomically switch the serving profile after completeness validation. Keep old query encoder with old profile for in-flight requests. Alternative: explicitly route/encode per space and fuse separate channels, with memory/latency/recall budgets. Planned maintenance with lexical degradation is another valid, honestly labeled scope choice. |
| Fix now / later | M / L–XL: channel and release schema migration plus full reindex may follow. |
| Verification | T04 at P00/P06: two docs, two revisions with equal dimensions, a third incomplete generation, concurrent query/publication/delete/rollback. No query uses cross-space dot products or loses an eligible doc silently. |

### HR05 — External deny journal has restore rules but no complete live consistency protocol

| Attribute | Finding |
| --- | --- |
| Class / severity | R / High |
| Affected | C10 deletion steps 1–2/6; S05 pending-intent check; S09; implementation `lifecycle` and `storage` modules. |
| Evidence / root cause | A journal intent must deny reads even when SQL commit fails. Journal durability is described; live read API, reader watermark, cross-process visibility, corruption/gap handling, authentication and journal/SQL reconciliation ownership are not. There is no SQL transaction spanning the journal append and all readers. |
| Failure / impact | Replica A records intent; SQL commit fails; replica B has a stale intent cache and still sees an active release. SQL epochs have not changed. B can dispatch deleted content unless its final guard proves current deny-journal visibility. A single process restart can create the same issue. |
| Likelihood / confidence | Medium under partial outage or future multi-process operation; high confidence that a protocol is missing, moderate confidence in any implementation-specific exploit. |
| Correction / alternatives | Specify one authoritative append/read model, durable sequence, consistent deny lookup, startup/readiness fence, failure handling and acknowledgement semantics. Gate reads on current visibility, not a best-effort subscription. Alternative for a single-host pilot: one journal authority and one reader process, explicit no-HA envelope and sealed restart reconciliation. SQL-only restored snapshots remain insufficient. |
| Fix now / later | M / L: recovery, API guard, operator tooling and topology must agree. |
| Verification | T05 before deletion acceptance: durable append + failed SQL commit + another live reader; delayed consumer, missing segment, corrupt tail, restart and old snapshot. Deny or fail closed; never acknowledge a guarantee the reader cannot enforce. |

### HR06 — Mutable fact acceptance lacks a bound semantic snapshot

| Attribute | Finding |
| --- | --- |
| Class / severity | D / High |
| Affected | C05 immutable observations/supersession, C06 `accepted_fact_values`, C08 answer snapshot, C02 epoch definitions; implementation P05/P07. |
| Evidence / root cause | Facts may be corrected/superseded independently of immutable canonical content; accepted-value validity is checked at publication. Release members freeze index generations, not a fact/relationship decision set. The answer snapshot names source/index/auth identities but not the accepted semantic revision. Corpus-epoch advancement for every fact/link/applicability acceptance/retraction is not enumerated. |
| Failure / impact | Buffer an answer using rule-accepted 125; reviewer retracts the fact or changes its installment scope without changing source text or active generation. A guard checking unchanged source/auth/release can still release the invalid fact unless it also revalidates current semantic acceptance. An entity sketch may likewise outlive an undone link. |
| Likelihood / confidence | Medium–high once correction/review is used; high confidence in the missing snapshot contract. C01's general correctness invariant does not choose the transaction protocol. |
| Correction / alternatives | Freeze an immutable enrichment/decision manifest in the served release, or add a monotonic semantic epoch and current accepted-fact recheck under the mutation barrier. Define typed `scope_key` composition, supersession visibility, relation/link invalidation and dependency rebuild. Alternative: republish on all semantic changes; simpler but more expensive. |
| Fix now / later | M / L: facts, filters, sketches, citations, caching and evaluation need consistent migration. |
| Verification | T06 at P00/P05: retract amount, undo party link or change applicability during ranking/answer buffering with unchanged original bytes. No stale trusted filter or supported claim escapes. |

### HR07 — Allowed canonical text is not always representable in PostgreSQL

| Attribute | Finding |
| --- | --- |
| Class / severity | D / Medium |
| Affected | C03 canonical authority, C04 normalization, C06 `elements.text`/JSONB, canonical import P03/P04. |
| Evidence / root cause | NFC preserves U+0000; revision-2 text contracts do not exclude or encode it. A native string with one NUL among 1,000 characters also fits the proposed 1% control threshold. PostgreSQL `text` and JSONB cannot store NUL. Canonical acceptance can therefore precede a deterministic projection failure. [PostgreSQL JSON string constraints](https://www.postgresql.org/docs/18/datatype-json.html). |
| Failure / impact | A PDF extractor emits `Điều\u00001`; accepted canonical JSON hashes successfully, SQL adoption fails repeatedly as infrastructure work. Silently stripping the character would invalidate hashes/spans. |
| Likelihood / confidence | Low–medium in corrupted/custom-encoded digital inputs; high confidence in incompatibility. |
| Correction / alternatives | Define supported Unicode scalar/control policy before canonical acceptance. Preserve raw bytes/string in protected artifacts and reject/review or produce a separately mapped canonical replacement. Reject unpaired surrogates explicitly. Do not alter text invisibly after hashing. |
| Fix now / later | S / M–L if invalid canonical revisions already exist. |
| Verification | T07 in P00: NUL, unpaired surrogate, combining reorder, emoji and valid controls round-trip through actual PostgreSQL; invalid strings fail once with a permanent quality code and preserved raw artifact. |

### HR08 — Global candidate/context limits do not define allocation across query slots

| Attribute | Finding |
| --- | --- |
| Class / severity | D / Medium |
| Affected | Algorithm defaults 5–9, C07 QueryPlan, C08 `top_k`, evaluation complete-evidence@10. |
| Evidence / root cause | Three subqueries × (20 exact + 40 lexical + 40 dense) can produce 300 distinct candidates before sketches, versus a global 120 cap. No admission/order/reservation rule specifies which slots survive. API permits `top_k=20`; final selection says maximum ten children, without distinguishing search results from answer evidence. The answer-token tokenizer is unnamed while no generator is selected. |
| Failure / impact | A common payment slot fills 120 candidates before a rare exception slot is run. Reranking cannot recover absent evidence. Two implementations use different merges/tokenizers and evaluate incomparable profiles. |
| Likelihood / confidence | High for disjoint multi-slot lists; high confidence in underspecification, medium confidence in actual quality impact. |
| Correction / alternatives | Define per-slot reservations, deterministic within-channel variant merge and global fair truncation; separate search hit count from evidence packing. Pin a packing tokenizer even in extractive mode and account for qualifiers. Alternative: return explicit partial results for an unsupported plan. |
| Fix now / later | S–M / M; replaceable algorithm, but changing it invalidates retrieval/answer comparisons. |
| Verification | T08 before profile freeze: disjoint 300-candidate case, rare slot, long qualifier, top_k 1/10/20, lexical-only and deterministic repeat. Report candidate recall before/after truncation. |

### HR09 — FTS storage/ranking is selected, natural-language query semantics are not

| Attribute | Finding |
| --- | --- |
| Class / severity | D / Medium |
| Affected | Algorithm R01/R03/default 5; C07 lexical channel; E02. |
| Evidence / root cause | `simple`, weights and `ts_rank_cd` do not define the `tsquery` compiler. `plainto_tsquery` combines surviving terms with AND; other query constructors differ. Dense failure makes this omission visible. The current Node lexical implementation matches any positive term rather than requiring every question word. [PostgreSQL query constructors](https://www.postgresql.org/docs/18/textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES). |
| Failure / impact | “Xin cho biết thời hạn thanh toán của hợp đồng SYN-001” has relevant source “Thời hạn thanh toán: 10 ngày.” A literal all-term AND baseline can miss it despite a correct index. Folding cannot repair conjunction semantics. |
| Likelihood / confidence | High if a default all-term constructor is used; high confidence the compiler is unspecified. No SQL result is claimed here. |
| Correction / alternatives | Specify bounded content-term OR/minimum-match candidates with phrase/proximity boosts and separate opaque exact identifiers; retain negation/conditions as semantic slots. Compare raw FTS, segmented VI and genuine scoped BM25. Do not install a new engine before testing the compiler. |
| Fix now / later | S / M; query adapter is replaceable, evaluator/profile must change. |
| Verification | T09/E02 before baseline acceptance: VI syllables/word segmentation, accentless `đ`, EN morphology, filler words, slash/hyphen IDs, quotations and negation, with encoder disabled. |

### HR10 — Corpus and transaction retention can outlive required cross-source evidence

| Attribute | Finding |
| --- | --- |
| Class / severity | R / High |
| Affected | C05 cross-document relations/facts, C10 purge step 3 and superseded retention step 5; W05/W07; implementation rollback. |
| Evidence / root cause | C10 correctly exempts retained citations/holds/records and invalidates derived objects on explicit deletion. It does not explicitly define active semantic dependencies and applicability sets as retention roots, or the transaction for superseded-artifact GC when another active document depends on them. Dependency edges for evidence and artifact graphs are distinct. |
| Failure / impact | Active appendix references an original clause or reviewed linkage backed by a retired extraction. Thirty-day GC treats it as unheld superseded data without a retained citation, leaving an active fact or relation unresolvable. Safe invalidation is possible, but then current obligations disappear without a publication change. |
| Likelihood / confidence | Medium if such references are allowed; moderate confidence because “records requirement” might be interpreted to retain them. It must become an executable root rule. |
| Correction / alternatives | Enumerate retained active semantic manifests as roots, traverse both evidence/artifact dependencies, and serialize root removal with GC adoption. Alternative: prohibit active references to retired sources and force explicit rebinding/review before retirement. Deletion still denies immediately even when a hold retains bytes. |
| Fix now / later | M / L–XL if evidence has already been irreversibly purged. |
| Verification | T10 before retention automation: active cross-document dependency, simultaneous new release and sweeper, then explicit delete; preserve required bytes or invalidate transactionally, never leave published dangling evidence. |

### HR11 — Long-document resource limits do not establish feasible intake or queue fairness

| Attribute | Finding |
| --- | --- |
| Class / severity | R / High |
| Affected | S07; architecture capacity assumptions; E01/E09/P09 and evaluation corpus. |
| Evidence / root cause | One parser, 2 GiB temp, 45 min/job, 120 s/page and 300-page limit are individually plausible, but no streaming working-set envelope or page-level scheduling is specified. A 200-page job must average under 13.5 s/page just for extraction to meet 45 min. The evaluation corpus averages about five pages; it does not require a 200-page scan. |
| Failure / impact | Retaining every 300-DPI A4 RGB raster uncompressed would require about 4.86 GiB for 200 pages; actual compressed outputs may be smaller. A long job can occupy the sole worker for 45 minutes, exceeding a 30-minute queue target for a following job. Four failed attempts can waste hours despite fencing. These are envelope calculations, not measured OCR/PNG performance. |
| Likelihood / confidence | Medium under long scans; high confidence in arithmetic, unknown actual runtime/storage. |
| Correction / alternatives | Specify bounded page-at-a-time raster/output streaming, checkpoint/reclaim behavior, fair rescheduling quantum and cumulative attempt budget. Define whether long scans are supported automatically or explicitly reviewed/rejected. Alternative: dedicated long-job queue/reservation; do not add workers without host budget. |
| Fix now / later | M / L if job/sandbox lifecycle assumes whole-document temporary output. |
| Verification | T11 before supported-format/capacity claims: 200/300-page scans, mixed short jobs, temp/disk pressure, crash at page 100, alternate pass and scanner outage. Measure accepted pages and p95 ready/queue/review time including failures. |

### HR12 — Authorization cost and policy churn can dominate exact search

| Attribute | Finding |
| --- | --- |
| Class / severity | R / High |
| Affected | C06 recursive dependency policy helpers, S03/S05/S07, architecture 80k-child baseline and scale trigger. |
| Evidence / root cause | Exact scoring over authorized rows avoids ANN recall surprises, but per-row joins to release/grant/identity/dependencies may dominate arithmetic. RLS does not imply efficient plans. Every publication changes tenant corpus epoch; the final guard discards any changed snapshot, so unrelated ingestion can repeatedly invalidate queries. No measured query plans/churn distribution exist. |
| Failure / impact | Ten broad searches compete with ingestion, policy joins and final guards; valid queries time out or repeatedly return stale. A timeout hides behind average successful-query latency. Shared release locks can consume scarce pooled connections under backpressure. |
| Likelihood / confidence | Medium at target concurrency; performance magnitude unknown. No unauthorized result is implied solely by slowness. |
| Correction / alternatives | Prototype actual-role SQL at 1%, 10%, 100% scope and deep/shared dependencies. Resolve an authorized source/release set once per transaction where safe; preserve live final checks. Distinguish irrelevant corpus churn from changed response dependencies, or deliberately accept coarse invalidation and measure it. Alternative: partitions/HNSW only after exact oracle comparisons. |
| Fix now / later | M experiments / L if an expensive recursive policy is embedded everywhere. |
| Verification | T12/E09 before SLO approval: EXPLAIN ANALYZE/BUFFERS with real roles, high churn, 80k/100k/1M/3M children, cold cache, pool exhaustion and revocations; report stale/error rates and mutation p95. |

### HR13 — Gold relevance does not specify alternative sufficient evidence bundles

| Attribute | Finding |
| --- | --- |
| Class / severity | D / Medium |
| Affected | Evaluation corpus/metric definitions and acceptance targets; E02–E07/E16. |
| Evidence / root cause | The manifest names required evidence bundles, but Recall@k divides by all relevant permitted evidence and complete-evidence says all required evidence/qualifiers. No OR-of-bundles semantics distinguishes interchangeable copies from jointly necessary clauses. No numeric minimum supported-answer coverage is set, despite warning against empty-answer gaming. |
| Failure / impact | Twenty interchangeable clauses make Recall@10 at most .5 although one complete bundle answers the question. Conversely a system can report perfect support for very few answered queries and abstain elsewhere; point support targets and reported coverage alone do not decide utility. Small aggregate slices can hide scanned-VI failures. |
| Likelihood / confidence | Medium–high with duplicates/versions; high confidence in ambiguity, not a fabricated benchmark failure. |
| Correction / alternatives | Gold must encode alternative complete bundles with AND requirements inside each bundle. Score sufficiency if any permitted bundle is complete, plus pool-based evidence ranking separately. Ratify minimum coverage by task and confidence bounds for automation; retain manual review when sample size is inadequate. Alternative: narrower single-evidence tasks, explicitly limiting cross-section claims. |
| Fix now / later | S–M / L if gold labels/model choices need reannotation. |
| Verification | T13 before dataset freeze: duplicate alternatives, two-part mandatory exception, unavailable private source, all-abstain and one-answer-only systems. Evaluator must reject misleading aggregate passes. |

### HR14 — Human review is the safety fallback but its throughput and error are not acceptance gates

| Attribute | Finding |
| --- | --- |
| Class / severity | R / Medium |
| Affected | Implementation 80–120 annotation hours/A05; evaluation review policy; S07 admission; W03/W06. |
| Evidence / root cause | The plan correctly reports review fraction/time and requires reviewers; no maximum backlog, reviewer service capacity, adjudication error gate or stop-intake policy follows from that workload. Hundreds of gold pages plus 4,000 PII mentions and double adjudication make the hour estimate especially uncertain. |
| Failure / impact | Everything enters manual review, search compute meets SLO, but documents never become usable. Reviewers approve wrong row/header/amount combinations, making deterministic templates confidently wrong despite valid citations. |
| Likelihood / confidence | Medium; actual staffing/workload unmeasured. This is not an allegation that humans will necessarily fail. |
| Correction / alternatives | Set separate ready-to-search/review-backlog budgets, reviewer capacity and blind recheck/error measurements by language/format. Throttle intake or narrow supported automation when review cannot keep up. Alternative: restrict pilot to trusted templates; larger NER/VLM models only after review-adjusted gains. |
| Fix now / later | S–M / M–L in staffing, review UI and reacceptance of facts. |
| Verification | T14 before operational pilot: time a representative review batch including gold-planted wrong digits/headers; measure reviewer agreement/error and queue arrival/service rates, then stress the backlog circuit. |

## Architectural cross-check

| Decision | Cross-document result |
| --- | --- |
| Original preservation, layout/table/source authority | Coherent in revision 2; HR07 concerns the admitted text domain, not a request to flatten or replace the graph. |
| Document/extraction/rendition/index/release identity | Useful separation; HR02/HR04/HR06 identify missing legal/corpus/semantic snapshots above those identities. |
| Chunk hashes and parent expansion | Adequately designed for launch raw scope; verify source coverage and authorization. No evidence justifies replacing hashes with ordinal IDs. |
| OIDC/tenant/RLS | Defensible trusted-service model, not proof of security. HR01 splits review from published reading; HR12 challenges cost, not the need for access control. |
| Jobs/fencing/storage registration | Strong ordinary crash/retry design; HR11 adds long-job working-set/cumulative work requirements. No duplicate-publication defect is confirmed. |
| Revocation/deletion/restore | Normal lock and tombstone controls credited; HR03/HR05 expose distinct failure-domain gaps. HR10 concerns retention roots, not whether deletion was mentioned. |
| Retrieval and answer policy | Sensible baseline, unproven local quality; HR08/HR09/HR13 affect reproducibility and acceptance. Advanced models are optional, not universal blockers. |
| Integration with existing application | Separate document authority preserves shared business data. No request to copy the imported workspace, send it to OpenRouter, replace localStorage demo persistence, or add SAP APIs. |

The comprehensive prose claim that there are no unresolved category-1 contradictions is too strong: HR01 and HR02 already give counterexamples without executing an enterprise service. Reopening those findings does not imply that earlier F01–F32 safeguards should be discarded.

## Verification actually performed

Executed `npm run test:rag`: exit 0, **2 files / 46 tests passed**, about 6.36 s, using existing synthetic tests. This validates the current demo test suite only; fixture encoders are not E5 inference and these tests do not implement enterprise RLS/OCR/revocation.

Executed `python3 ragplan/2/review/evidence-check.py --baseline /tmp/asa-hostile-before.json`: final exit 0, **21 checks passed, zero failed**. The [checker](evidence-check.py) and [results](evidence-results.json) cover finite synthetic counterexamples/arithmetic and documentation consistency, not a deployed attack, parser benchmark or complete JSON Schema validator. All 380 files in the captured pre-write source/design manifest remained byte-identical. Initial verifier runs exposed stale prompt filenames and its not-yet-created result link; the review links were corrected and verification rerun. The original prompt renames were left intact.

Not executed: enterprise ASGI/PostgreSQL integration, local E5/OCR/VLM/reranker inference, hostile parser files, load tests, journal/backup drills, or browser journeys. No UI or production behavior changed, so Playwright was not rerun; future browser gates remain explicit in [required changes](required-changes.md). No dependencies/models were installed, no inference API was called, and no real workbook records entered any new artifact.

Read [algorithm critique](algorithm-critique.md), [security tests](security-red-team.md), [integration scenarios](integration-risks.md), [alternatives](alternative-architecture.md), [required changes](required-changes.md) and the [readiness verdict](go-no-go.md) for concrete acceptance conditions.
