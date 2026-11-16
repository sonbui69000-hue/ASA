# HR01–HR14 reconciliation dispositions

Revision 2.2.0,2026-11-16. RR01–RR05 from the preserved2.1 [re-review](../review/re-review.md) are incorporated; their exact closure is in [final corrections](final-corrections.md). Every finding was evaluated against its technical counterexample, current contracts and relevant application boundary. The [independent audit](../review/hostile-review.md), [security tests](../review/security-red-team.md), [required changes](../review/required-changes.md) and evidence-results.json remain byte-identical audit records. Accepted means the defect/correction reasoning is accepted; modified means its scope/solution is narrowed or refined. None is dismissed merely because intended safeguards existed. No runtime exploit, performance number or neural quality result is inferred from review arithmetic.

**Design repair is not runtime closure.** All tests below remain required for their consumer phases even where a finite design probe is executed. HR03/HR05 are constrained mitigations requiring A09; HR11/HR12/HR14 defer measured support/SLO/capacity, not their now-defined contracts. A10/A11 thresholds are proposed owner decisions. No confirmed counterexample is silently left in the enabled baseline.

Primary-source verification: [PostgreSQL session advisory locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS), [ASGI response body](https://asgi.readthedocs.io/en/latest/specs/www.html#response-body-send-event), [PostgreSQL JSON Unicode restrictions](https://www.postgresql.org/docs/18/datatype-json.html) and [FTS query constructors](https://www.postgresql.org/docs/18/textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES) were checked on2026-11-16. These substantiate technical mechanisms, not deployed outcomes.

## HR01 — accepted

**Status: Repaired design; authority mapping and runtime validation pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | The common published-release predicate excludes the first unpublished extraction a reviewer must inspect. A review-write endpoint supplies no read authority. |
| Verified contradiction/evidence | Verified C06/C08/S03 contradiction against first-publication state and review HR01/T01; history permission cannot make a never-published release historical. |
| Affected documents/interfaces | Data C06/C08/C11; security S03/S05; P00/P01/P03/P05/P08; review API/RLS/artifact broker/UI. |
| Reviewer correction evaluation | Reviewer proposal is sufficient only with exact source/subject revision, independent assignment, current scan/safe preview and final guard. Accept that complete form, rather than widening ordinary read. |
| Simplest selected contract | C11 provisioned inspect_staged assignment + exact ReviewPackage + distinct rag_review_reader policies/resolver. Ordinary search remains publication-only; no original export by implication. |
| Why it works / failure behavior | Separate role/API/table contract prevents the staged exception being inherited by candidate retrieval; every access/decision revalidates identity/source/scan. |
| Migration/compatibility | Add staged routes/assignments/scan/package FKs and decision package hash; staged-route requests without package/revision reject. Published review is the separate C11 route/subject, not a package bypass. |
| Deterministic acceptance | T01/ST07 allowed reviewer versus uploader/ordinary reader, stale/exchanged extraction/scan/package and revoked reviewer; zero staged search/answer content. |

## HR02 — modified

**Status: Repaired design; records/applicability authority pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Replacing the original with a partial amendment hides unchanged original clauses; a relation edge cannot restore eligibility. |
| Verified contradiction/evidence | Verified O:{warranty,payment} versus M:{payment2} single-active-source counterexample in review HR02/M02; upload ordinal is not legal effect. |
| Affected documents/interfaces | C02/C05/C06/C08/C12/C14; algorithms A04/D02; W05/W07; publication/filters/citations/retention P00/P05/P07. |
| Reviewer correction evaluation | Use reviewer's simpler separate-active-instrument representation plus a small reviewed family/effect manifest; no synthetic consolidation engine or arbitrary retired-release eligibility. |
| Simplest selected contract | Original/amendment/appendix/replacement are separate documents; C12 scope inventory explicitly preserves unchanged clauses, applies scoped supersede/supplement/exclude over reviewed half-open intervals. |
| Why it works / failure behavior | Current-only reader retains access to original active clauses; query pins set/date/semantic epoch and complete membership revision/hash; adding pending M2 atomically invalidates S1 even without an old dependency edge, requires all-set source/decision permissions and exact physical citations. Conflicts/unknowns do not select a winner. |
| Migration/compatibility | Former amendment-as-version must split with reviewed lineage map; source replacement rebinds or invalidates sets transactionally. Old citations keep old identities. |
| Deterministic acceptance | T02 original+partial amendment+appendix, then M2 registration after accepted S1; fresh-epoch stale set, pending/conflicting/future/excluded/withdrawn/denied member, omitted/duplicate manifest and source replacement; exact warranty/payment citations. |

## HR03 — modified

**Status: Mitigated by explicit envelope; A09 and real fault tests remain blocking for confidential dispatch.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | A lost SQL session releases advisory locks while an authorized HTTP task may still send; another policy writer can commit/ack before that send. |
| Verified contradiction/evidence | Verified independent SQL/transport lifetimes in primary PostgreSQL/ASGI docs and review ST15 schedule. This is a contract counterexample, not a reproduced application exploit. |
| Affected documents/interfaces | S05/S02; C08/C16; authority/transport adapter/roles/supervisor/recovery; P00/P01/P03/P07/P09 and Ack semantics. |
| Reviewer correction evaluation | Reject lock-only strictness; accept narrower singleton option instead of a new consensus/permit service. Do not adopt an unapproved bounded lease or claim arbitrary-replica global revocation. |
| Simplest selected contract | One host/one egress process/one policy writer owns local gate, actual synchronous bounded enqueue and mutation commit/install; exclusive lifetime lock, no rolling overlap/automatic failover; unknown send/commit seals. |
| Why it works / failure behavior | DB loss cannot release local gate; second process cannot ack; waiting revoke orders after known send/no-send. Ack guarantees no later new enqueue under revoked rights, with expiry checked at final gated admission and no hard real-time lateness bound after arbitrary suspension inside the synchronous call; prior network bytes are irrevocable. |
| Migration/compatibility | New Ack watermark/incarnation and deployment restrictions replace former proof. If HA or independent writers are required, this correction is insufficient and HR03 reopens; no automatic fallback. |
| Deterministic acceptance | T03/ST15 kill DB after check, local revoke/second API, delayed send/cancellation, expiry, uncertain commit, slow client, process death/sealed failover; instrument actual enqueue/Ack order. |

## HR04 — accepted

**Status: Repaired design; migration/runtime capacity validation pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Per-document model switches yield eligible docs in incompatible spaces without a defined query encoder or complete corpus route. |
| Verified contradiction/evidence | Verified release_member single-generation/query snapshot omission and equal-dimension different-space M04 example; dimensions alone cannot ensure compatibility. |
| Affected documents/interfaces | C02/C06/C07/C08/C13; representation registry/dense query/migration/caches/rollback; P00/P06/P07/P09. |
| Reviewer correction evaluation | Accept one complete corpus profile, rather than multi-space query fusion/extra model footprint. Explicitly budget overlap; use approved lexical maintenance if overlap cannot fit. |
| Simplest selected contract | C13 immutable profile + complete corpus revision mapping release/rendition to generation; source release separate from model serving; shadow/delta/CAS after exact eligible-set validation. |
| Why it works / failure behavior | A remains complete while B builds; publication must supply A, deletion invalidates both; switch chooses queryB and full corpusB together. Old-profile responses discard; rollback covers today's sources. |
| Migration/compatibility | Add profile/corpus/member/migration tables, heads/snapshot/cache identity; reindex B without source replacement; old release generation pointer is provenance, not sole serving authority. |
| Deterministic acceptance | T04 same-dimension revision negative, incomplete third migration, concurrent publish/delete/source replace, cutover/old query/rollback/new doc; no omission or cross-space score. |

## HR05 — modified

**Status: Mitigated by enforced singleton journal; A09/durable-storage recovery validation pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | A durable delete intent can survive failed SQL but be invisible to another serving reader or restarted stale journal consumer. |
| Verified contradiction/evidence | Verified C10 required deny-on-SQL-failure while no live append/read/watermark topology was specified; review HR05/ST16 schedule is valid for replicas, not a measured deployed leak. |
| Affected documents/interfaces | C10/C16/S05/S09; journal/guard/delete API/storage/supervisor/restore; P02/P03/P07/P09. |
| Reviewer correction evaluation | Accept simplest single-authority alternative, with second reader rejected. Do not pretend a file journal plus asynchronous subscriptions is cross-process linearizable. |
| Simplest selected contract | Encrypted independent fsync ledger, contiguous hash chain/head/anchor, sole append/read authority and gate; install deny before SQL acknowledgement; no TTL deny cache or journal compaction. RR03 separates record_id/sequence from operation_id, uses UNIQUE(tenant,entry_kind,operation_id) and a linked SQL authority_operations outcome/checkpoint. |
| Why it works / failure behavior | All supported readers consult the sole current deny state. SQL rollback keeps it; unknown append/gap/corrupt/rolled-back journal seals. Replacement confirms death and replays current journal/identity/key state before serving. |
| Migration/compatibility | Deployment/API503+stable-operation semantics change; multi-reader/HA deferred. Durable intent cannot be cancelled to resume visibility; independent journal backup/head required for restore. |
| Deterministic acceptance | T05 fsync+SQL rollback+next read, rejected second API, same operation two typed records/stable replay/digest conflict, intent-only and SQL-committed checkpoint recovery, lost Ack, old SQL restore, corrupt tail/gap/head rollback/unknown fsync; deny or remain not ready. |

## HR06 — accepted

**Status: Repaired design; semantic transaction/race implementation pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Accepted facts/links/applicability can change while immutable source and release identities remain unchanged, leaving trusted filters/buffers stale. |
| Verified contradiction/evidence | Verified C05 correction/undo allowed but C08 lacked semantic snapshot and acceptance interval; review M05/ST17 reproduces finite stale-hash reasoning. |
| Affected documents/interfaces | C05/C06/C08/C12/C14; accepted exact values/entity aliases/sketches/cache/final guard/publication; P00/P05/P07/P08. |
| Reviewer correction evaluation | Select monotonic semantic epoch + append-only events/intervals, simpler than republishing all source/vector content for every decision. |
| Simplest selected contract | C11 separate published-reviews subject/capability/read/history/revision path requires no staged package; C14 guarded transaction appends acceptance/retraction/correction/link/applicability events, updates current projections/dependencies, increments epoch and roots; snapshot/cache includes epoch, final checks current trust. |
| Why it works / failure behavior | Unchanged original hash does not defeat epoch mismatch. Literal vectors remain source-only; semantic-derived sketches disabled, so a correction need not silently remove a document from dense coverage. |
| Migration/compatibility | Add events/intervals/head hashes/publication provenance; immutable observation validation is historical, current accepted values join epoch. Existing raw observations need reviewed current projection rebuild. |
| Deterministic acceptance | T06/ST17 publish125 first, then actual published-reviews API without package: permission/source/epoch/If-Match/prior-decision/replay negatives, buffered retraction/correction/link undo and applicability change with same source/R/vector; no stale trusted filter or supported claim. |

## HR07 — accepted

**Status: Repaired design; full canonical adapter validation pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | NFC admits NUL/invalid code units not representable in PostgreSQL text/JSONB; late stripping breaks hash/span authority. |
| Verified contradiction/evidence | Primary PostgreSQL JSON documentation confirms NUL/surrogate limits; NFC preserves NUL. Control-percentage routing threshold does not prevent it. |
| Affected documents/interfaces | C01/C03/C04/C06; canonical hash/import/raw diagnostic storage; P00/P03/P04. |
| Reviewer correction evaluation | Choose prehash reject-to-review plus optional new mapped replacement extraction; no silent deletion or alternate database. |
| Simplest selected contract | unicode-pg-v1 scalar/control domain applies to every canonical string/key; raw invalid code units remain binary artifacts; unsupported text is permanent quality violation, not infra retry. |
| Why it works / failure behavior | Accepted hash/text/SQL projection agree; cluster-enclosing maps handle combining reordering/emoji and reviewed replacement, not false per-character monotonicity. |
| Migration/compatibility | Previously accepted incompatible candidates must quarantine/rederive a new extraction/hash; strict 2.2/version conversion, no offset reuse. |
| Deterministic acceptance | T07 actual PostgreSQL NUL/surrogate negatives and valid control/astral round-trip plus raw→NFC reorder/maps; permanent quality error occurs before accepted canonical import. |

## HR08 — modified

**Status: Repaired design; retrieval/packing quality measurements pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Three 100-candidate slot unions exceed120 global cap without allocation; search20 versus answer10 and unnamed packing units conflict. |
| Verified contradiction/evidence | Review M07 arithmetic verifies300 potential unique IDs. Missing allocator allows slot starvation; actual recall magnitude is unmeasured. |
| Affected documents/interfaces | C07/C08/C15; algorithm defaults5–9; planner/fusion/rerank/dedup/packer/UI/evaluator P00/P03/P06/P07. |
| Reviewer correction evaluation | Adopt round-robin unique admission and model-independent scalar packing; preserve separate actual E5 counts. No extra optimizer/service required. |
| Simplest selected contract | C15 per-slot20/40/40, within-channel variant/sketch budget, round-robin120 retaining multi-slot membership; search top_k1..20 separate from10 answer seeds and complete bundle expansion. |
| Why it works / failure behavior | Three disjoint lists get 40 each; oversized exception cannot be truncated. unicode-scalar-v1 parent900/total2400 counts all metadata; lexical-cp-v1 needs no encoder. |
| Migration/compatibility | New versioned compiler/allocator/packing/chunker identity changes comparable profiles; API clarifies top_k instead of silently capping display10. |
| Deterministic acceptance | T08 disjoint/duplicate/short slots/ties, rare slot, top_k1/10/20, lexical-only and qualifier oversized; measure recall before/after admission/packing. |

## HR09 — accepted

**Status: Repaired design; lexical quality/engine comparisons pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | FTS dictionary and ranker do not define natural-question tsquery semantics; all-term AND can miss relevant clause due to fillers. |
| Verified contradiction/evidence | Verified primary PostgreSQL query constructors and source example; current Node any-positive-term behavior is not the unspecified future SQL behavior. |
| Affected documents/interfaces | C15/C07; lexical channel/query plan/profile/glossary; algorithm R01/R03/R14; E02/P00/P03/P06. |
| Reviewer correction evaluation | Accept bounded content OR + boosts/protected IDs; scoped BM25/segmentation remains a measured challenger, no premature engine replacement. |
| Simplest selected contract | vi-en-or-v1 safe typed OR single-term nodes, named whole-phrase fillers,32 lexeme cap, retained conditions/negation, original/folded aliases merged within lexical40; no raw query operators. |
| Why it works / failure behavior | Candidate recall is not reduced by requiring every question word; exact identifier authority stays separate. EvidenceGate still checks full condition; OR match never implies legal support. |
| Migration/compatibility | Compiler/glossary hashes in profile/cache/evaluator; changing stemming/segmentation is new profile. No hidden English morphology guarantee. |
| Deterministic acceptance | T09 actual SQL encoder-off filler VI/đ/EN alias/quotes/negation/punctuated code cases and safe literal operators; E02 measures scoped BM25 alternatives. |

## HR10 — accepted

**Status: Repaired retention/GC design; actual integrity/purge evidence pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Superseded artifact TTL may purge evidence needed by an active cross-source semantic/applicability object even without a saved citation. |
| Verified contradiction/evidence | Review HR10 retention ambiguity is valid; prior deletion traversal existed, but active semantic roots and GC/publication race contract did not. |
| Affected documents/interfaces | C10/C12/C14/C16; evidence/artifact DAGs, roots/GC/publication/restore; P00/P02/P07/P09. |
| Reviewer correction evaluation | Accept explicit active semantic/applicability/serving roots and fenced GC; no need to prohibit all cross-source facts. |
| Simplest selected contract | C16 root registry traverses both DAGs; separate artifact_gc live/gc_pending/purging/purged plus exact tombstone/retention claims serialize new-root acceptance with cleanup; rag_purger only assigned manifests/receipts, including unrooted superseded artifacts of live documents; active dependent evidence cannot age out. Delete invalidates first; hold retains custody only. |
| Why it works / failure behavior | Publication either roots before GC or refuses pending/purging target and rebuilds. Missing source fails resolver immediately, invalidates dependents/readiness; no surviving trusted dangling fact. |
| Migration/compatibility | Backfill roots/dependency checks before enabling TTL cleanup; already purged sources cannot be repaired by an edge and must invalidate/review dependents. |
| Deterministic acceptance | T10 cross-source retired evidence beyond TTL, unrooted R1/live R2 retention claim, artifact/GC state separation, narrow-role/version/tenant negatives, both publication/hold/claim orders, exact physical retries, explicit delete+hold and missing object; retain or invalidate transactionally, never dangling trust. |

## HR11 — modified

**Status: Mitigated resource design; long-scan automatic support/throughput deferred to measurements.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Page/temp/time caps do not by themselves bound whole-document working set or prevent45min worker monopolization/retry waste. |
| Verified contradiction/evidence | Review M09 arithmetic is valid for uncompressed200-page rasters, not a measurement of compressed storage/OCR. Actual200/300-page time remains unknown. |
| Affected documents/interfaces | C09/C16/S07; streaming adapters/job scheduler/counters/admission; E01/E09/T11/P02/P04/P09. |
| Reviewer correction evaluation | Accept bounded page streaming, charged cumulative budget and page/120 s quantum. Treat unproven long-scan feasibility as support/operational gate, not wholesale architecture blocker. |
| Simplest selected contract | Checkpoint/upload scratch per page; one current+bounded transform raster;2700s charged work across attempts/alternate passes and max4 failures; fair tenant/document quanta; no budget reset on crash. |
| Why it works / failure behavior | Working set is bounded independent of page count and retry count. Budget exhaustion enters honest review; a safe state is not automatic-ingestion success.30min p95 remains measured workload target, not40min worst-case cycle proof. |
| Migration/compatibility | Job counters/checkpoint/scheduler semantics change; normal yield is not failure. Long scans initially processing/review-only until T11 promotion; no silently dropped eval strata. |
| Deterministic acceptance | T11 actual200/300-page scan+short docs+search pressure, crash100/alternate/temp/disk/scanner faults, cumulative counters/progress/accepted pages and8h target-day run. |

## HR12 — modified

**Status: Mitigated query/churn design; advertised-scale SLO remains unvalidated.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Authorization joins/dependency policy and coarse epoch invalidation may dominate exact-vector arithmetic, latency or error rate. |
| Verified contradiction/evidence | Review risk is credible but no actual plans/churn distribution prove a performance defect. Exact search remains correctness oracle; missing timings do not justify a new engine. |
| Affected documents/interfaces | C06/C13/C14/C16/S07; RLS/source-set query/final checks/pool/admission; E09/P01/P06/P07/P09. |
| Reviewer correction evaluation | Use indexed request-local authorized source relation and dependency-targeted positive-source checks; retain coarse auth/semantic revalidation. Measure before partition/ANN adoption. |
| Simplest selected contract | No cross-request authorization cache. Positive answer may survive unrelated source additions if exact dependencies/profile/semantics remain current; negative/global claims require current membership. Actual-role plans and stale/error/mutation metrics mandatory. |
| Why it works / failure behavior | Avoids unnecessary ingestion-induced positive aborts without freezing ACLs; coarse semantic churn cost remains visible. Index choice/scale is replaceable if evidence graphs/tenant keys preserved. |
| Migration/compatibility | New snapshot/dependency validation semantics; no equivalence claim for an untested optimizer.80k pilot and optional1M/3M scale claims have distinct gates. |
| Deterministic acceptance | T12 actual roles80k/100k/1M/3M,1/10/100% scope, deep/shared dependencies, cold cache, ingestion/permission/semantic churn, pool/slow-client faults; report EXPLAIN/BUFFERS and errors/stale/mutation p95. |

## HR13 — accepted

**Status: Repaired gold/metric design; A10 ratification and measured quality pending.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Relevance pool conflates interchangeable alternatives with jointly required evidence; precision without coverage can pass all-abstain behavior. |
| Verified contradiction/evidence | Review M08 twenty-alternative Recall@10=.5 counterexample and all-abstain denominator issue hold independently of neural performance. |
| Affected documents/interfaces | Evaluation GoldQuery/metrics/targets, C15 EvidenceBundle/packer; E02–E07/E16/P00/P06/P07/P09. |
| Reviewer correction evaluation | Accept OR-of-complete-bundles, AND within each, separate relevance diagnostics and numeric complete-answer coverage. Do not force high recall over all interchangeable copies. |
| Simplest selected contract | Fully permitted bundle suffices; do not remove denied members from a bundle. Bundle recall/success gate, pool recall diagnostic. Complete supported coverage80% overall/70% established slices, exact tasks95%, pending A10. |
| Why it works / failure behavior | All-abstain/partial-only/one-answer-only cannot game numerator; irrelevant locator support still fails. Sparse slices remain unestablished with reported denominators/intervals. |
| Migration/compatibility | Gold/evaluator version changes and possible reannotation; freeze supported scope before heldout, disclose new-profile narrowing after failure. |
| Deterministic acceptance | T13 alternatives/mandatory exception/inaccessible bundle/alternative sources/all-abstain/one-answer-only/sparse slices; evaluator self-tests before gold freeze, quality measurements later. |

## HR14 — modified

**Status: Mitigated review design; staffing/accuracy/capacity acceptance deferred to T14/A11.**

| Attribute | Reconciliation |
| --- | --- |
| Actual defect/risk | Manual review can be overloaded or accept wrong critical associations; reporting review minutes alone establishes no safety fallback capacity. |
| Verified contradiction/evidence | Risk valid as an operational omission, not evidence that reviewers fail or that80–120h is enough. Gold and correlated human errors need blind adjudication. |
| Affected documents/interfaces | C16/evaluation/S07; review UI/intake circuit/semantic retraction/runbooks; P05/P08/P09 and A11. |
| Reviewer correction evaluation | Accept named capacity/backlog/age/ready-time/error gates and throttle intake; do not solve unspecified staffing with an extra model. |
| Simplest selected contract | Proposed200-page/1 staffed-day backlog stop; resume<100+operator ack; demand≤80% measured service capacity, ready p95≤2 business days. Zero missed planted critical errors/≥99% adjudicated decisions; critical disagreement holds. |
| Why it works / failure behavior | Queue pressure cannot silently bypass review; sparse evidence keeps double review/no automation. Detected accepted error invokes C14 retraction, so human approval is not infallible authority. |
| Migration/compatibility | Add review queue counters/circuit/calendar/owners and blind batch process; replace hour estimate as a capacity promise. Existing reads/deletes continue during intake stop. |
| Deterministic acceptance | T14 blind wrong digit/header/party/qualifier cases, independent adjudication, per-slice service/error intervals, backlog stop/hysteresis and8h workload; ratify A11 before operational commitments. |

## Closure accounting

All 14 findings have explicit disposition, implementation contract, compatibility and verification. Eight confirmed omissions (HR01/02/04/06/07/08/09/13) have corrected designs, not merely promised tests. HR10 root/GC ambiguity is repaired explicitly. HR03/05 strict claims are constrained to the A09 envelope, with runtime confidentiality gate still open. HR11/12/14 operational and executable evidence is deferred to the phases that produce it. No finding is rejected outright; no reviewer performance hypothesis is promoted to a measured defect.

Use [verification matrix](verification-matrix.md) for exact T01–T14/phase/ST mapping, [revised invariants](revised-invariants.md) for guarantees, [changelog](architecture-changelog.md) for cross-document deltas, [remaining decisions](remaining-decisions.md) for owner choices, and [readiness](../rag-readiness-assessment.md) for the five verdicts. Independent re-review should challenge C11/C12/C13/C14/C16 and S05 against W13–W17 before permanent schema/API freeze.
