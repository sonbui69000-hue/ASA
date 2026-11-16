# Final hostile review of the corrected RAG architecture

Date: 2026-11-16. Reviewed contract: **2.2.0**. Baselines: the original [HR01–HR14 review](hostile-review.md), its supporting reports/evidence, and the [2.1 re-review](re-review.md).

**Proceed to specification consolidation and isolated synthetic implementation. RR01–RR05 PASS at design level. No remaining Critical/High design blocker was substantiated within the stated pilot scope.** One Low fixture-conformance defect needs correction during consolidation/P00. The pending owner decisions and executable controls below prevent unconditional permanent freeze or production approval; they do not justify another general planning cycle.

## Four verdicts

| Decision | Verdict | Exact condition |
| --- | --- | --- |
| Architecture freeze | **CONDITIONAL GO** | The five required design repairs are complete. Record A01 service/scope, A02a tenant boundary, A03 review/family capability policy and A09 failure/availability envelope before permanently freezing their dependent boundaries. Materialize and check P00 models/OpenAPI/DDL, including the small corrections below. Production benchmarks are unnecessary for this decision. |
| Synthetic prototyping | **GO** | Start isolated P00 and focused SQL/transport/journal/parser experiments under recorded provisional assumptions, with synthetic data and the minimum controls/assets needed for each experiment. Keep the imported workspace outside the service and all enterprise inference local. |
| Staged implementation | **CONDITIONAL GO** | Follow the specified dependency order, implement minimum lifecycle controls before the first published lexical slice, and execute each consumer's acceptance tests before enabling it. Settle expensive boundary decisions before permanent integration. Missing later quality/load results do not prevent building their components or harnesses. |
| Production deployment | **NO-GO** | No enterprise implementation or runtime acceptance is established. Real authority/data/records/asset approvals, executed security/recovery controls, supported-scope quality/capacity/review/browser evidence and CP9 acceptance remain required. |

## Scope and evidence standard

Read all 13 top-level `ragplan/2/*.md` files, every reconciliation Markdown/JSON/Python/SQL artifact, and the prior review reports and supporting evidence. Historical prompts/reports establish requirements and counterexamples; they do not override the current contracts. Closure labels in the correction register were checked against the substantive API, schema, algorithm, security, lifecycle and phase descriptions.

**PASS means the original root cause has an implementable normative correction**, rather than a promise to test around it. It does not mean the corresponding API, database role, transport or storage control has passed. No owner acceptance is recorded in the decision packet, so the narrower failure model is not labelled an ACCEPTED RISK. This is a contract review, not a penetration test or independent organizational sign-off.

References below use C for [data/API contracts](../rag-data-contracts.md), S for [security](../rag-security-design.md), W for [failure traces](../rag-failure-analysis.md), and P for [implementation/migrations](../rag-implementation-plan.md). The [algorithm matrix](../rag-algorithm-decisions.md), [evaluation plan](../rag-evaluation-plan.md), [invariants](../reconciliation/revised-invariants.md), [test matrix](../reconciliation/verification-matrix.md) and [owner decisions](../reconciliation/remaining-decisions.md) supply the corresponding consumer contracts.

## RR01–RR05 results

### RR01 — Published semantic review: PASS

**Original counterexample:** E/R/F125 is fully published. Its staged package is expired or ineligible, so the only review route cannot retract the accepted amount while source bytes remain unchanged. An approved entity-ID sketch can also outlive link undo.

**Correction verified:** C08 adds `/documents/{id}/published-reviews`; C11 lines469–481 defines its strict published subject and decision union separately from staged `/reviews`. It binds exact document/version/extraction/rendition/release, current versus explicitly historical scope, `review_semantics` or distinct classification authority, all supporting source-read rights, document If-Match, expected semantic epoch and prior decisions. Neither staged inspection nor signing/export substitutes for those rights. Evidence uses ordinary authorized safe routes. Semantic correction appends observations/events without replacing canonical bytes; unknown/ambiguous replacements close old trust without creating accepted-value rows. Canonical-backed staged semantic review remains possible through its own package branch.

C14/S05 commit the event, acceptance/projection/dependency invalidations and checkpoint before success; a buffered epoch9/F125 answer fails after retraction advances epoch10. A committed retry resolves its authorized existing result before testing new-operation revisions, avoiding failure on its own epoch advance. Algorithm matrix C07 and C14 agree that baseline sketches/vectors contain literal source spans; semantic aliases remain live exact-channel projections. A literal quote can remain searchable without remaining a trusted fact.

**Consistency and gate:** S03/S05 and the final security bindings, W15, P05/P07, migrations0003/0004/0006, I22/I23 and T06 agree. T06 explicitly starts published and calls the real API without a package; direct projection edits cannot satisfy it. Actual route/RLS/replay/classification and buffering tests remain implementation gates. FR01 below affects an illustrative request's headers, not the existence or authority of this route.

### RR02 — Complete family membership: PASS

**Original counterexample:** S1 covers O/M1; M2 subsequently joins, but S1 has no dependency edge to it. A new request at the latest semantic epoch still treats S1 as complete and may ignore an inaccessible amendment.

**Correction verified:** C12 lines485–511 separates the complete membership head from family command revision and binds immutable applicability sets to its revision/hash. Exact two-way equality against server-registered membership forbids omissions, extras and duplicates. Pending instruments are registered; exclusions require reviewed reason/evidence; future-effective instruments remain inventoried. Accepted completeness requires reviewed current sources, no pending/conflicting members and covered scopes. This covers registered documents, not documents never supplied/registered.

Registering M2 advances the membership head and invalidates/clears S1 in the same gated transaction unless a complete replacement is approved against the new head. Relation changes, withdrawal, source publication/replacement and tombstone invoke the same rule, including when S1 has no edge to M2. C13/S05 final validation checks the current set pointer **and** exact membership revision/hash, plus semantic trust and every source/decision permission, including exclusions. A fresh epoch cannot repair S1's old binding; denied M2 produces generic insufficient without its metadata. Independent authorized quotations remain available. Unchanged original warranty evidence stays independently current.

The membership head and pending dependencies remain retention roots even when there is no current applicability set. The manifest has its own SQL identity; it does not require a document-owned artifact for an empty family.

**Consistency and gate:** C02/C14, algorithm A04/D02, S03/S05, W07/W18, legal gold, migrations0004/0006, I24 and T02 agree. T02 includes M2 added after accepted S1, fresh-epoch queries, pending/conflicting/future/excluded/withdrawn/denied cases and source races. Execute those transactions before accepting legal composition; automatic legal precedence remains outside scope.

### RR03 — Journal command versus record identity: PASS

**Original counterexample:** One delete X needs both an intent and a commit checkpoint, but globally unique operation-as-record identity makes the second record collide or leaves retries uncorrelated.

**Correction verified:** C16 lines561–585 distinguishes server operation UUID from record UUID/global sequence and specifies `UNIQUE(tenant_id,entry_kind,operation_id)`. X's linked intent and commit therefore coexist. Same-kind identical replay returns the original record/sequence/hash; changed payload conflicts. The strict branches and synthetic linked pair agree. SQL `authority_operations` stores the immutable command outcome with the mutation; these identities survive the ordinary seven-day HTTP replay window. Retained digest-key revisions participate in retry lookup; missing lookup capability seals mutations rather than allocating a duplicate operation.

The crash table covers no durable intent, intent with known SQL rollback, SQL committed/checkpoint missing, checkpoint durable/Ack lost, and stale restored SQL. Intent-only failure keeps deny and forbids purge. Verified committed SQL can reconstruct a missing checkpoint while sealed, without repeating events/epochs. Lost Ack returns the authorized existing result. SQL behind an acknowledged checkpoint requires fresh approval/new incarnation/high-water handling; it cannot prove the operation never committed. Denies and prior identities are retained.

**Consistency and gate:** C06/C09/C10, S05/S09, W17, P02/P07, migrations0002/0007, I25 and T05 agree. Physical fsync/torn-tail/crash/replay/key-rotation/restore behavior is unexecuted. Those are essential tests of the proposed protocol, not an unresolved record-identity design.

### RR04 — GC lifecycle and purge capability: PASS

**Original counterexample:** A live document serves R2 while an expired, unrooted R1 artifact needs collection. The closed artifact enum cannot express pending/purging, and a tombstone-only purger cannot collect R1 without overbroad privileges.

**Correction verified:** C06 explicitly separates processing state `staged/verified/adopted/purged` from `artifact_gc` state `live/gc_pending/purging/purged`. C16 lines589–599 specifies claim issuance/CAS, cancellation only before claim with revalidation, and no new roots or return to live after purging starts. Exact version/hash manifests and root/GC/hold/tombstone revisions bind claims and receipts. A retention claim handles unreachable, expired, unheld R1 while R2 stays live; a tombstone claim additionally requires confirmed SQL tombstone.

`rag_purger` receives only assigned claim-manifest/receipt functions; it cannot select general content, issue claims or choose arbitrary SQL/storage targets. The trusted broker deletes only claimed versions outside the gate, and verified absence precedes purged adoption. Current semantic/family/applicability/serving/citation/records/hold roots prevent TTL cleanup. Root/hold first blocks claim; claim first makes a new root/publication/hold fail explicitly rather than promising disappearing bytes. Explicit delete still invalidates access/dependents despite retained custody.

**Consistency and gate:** C10/C12/C14, S05/S09, W19, migrations0002/0006/0007, I26 and T10 agree. Real-role privilege negatives, both claim/hold/publication orderings, live-R2 retention cleanup and physical-version retries remain required before enabling purge. The proposed handling of a late hold needs records-owner acceptance; no such acceptance is inferred.

### RR05 — Prewarm order and expiry claim: PASS

**Original conflicts:** C13 placed prewarm inside the short mutation gate while W14 placed it outside; W16 could be read as promising expiry at enqueue despite suspension after the final clock decision.

**Correction verified:** C13 line527 puts allocation/load/prewarm outside S05, then briefly gates current completeness/head/policy and already-warm readiness checks before CAS. W14, algorithm final constraints, P and T04 match. No long encoder load is permitted inside the gate.

S05, W16, HR03 disposition, I06/I27 and A09 now consistently define expiry at final gated admission with a conservative clock reserve. Suspension inside the synchronous call after that decision has no hard real-time lateness bound. The held gate still prevents a revocation Ack overtaking the call; already-enqueued bytes can arrive later. This is a bounded claim, not a deferred fix to an advertised zero-lateness guarantee.

**Gate:** A09 acceptance remains pending. T03 must distinguish expiry before admission from suspension afterward and exercise the actual transport; T04 must instrument prewarm order/readiness and memory fit. Neither result is needed before writing its prototype.

## Cross-contract hostile checks and expensive commitments

No new Critical/High issue was found in the following compositions:

- **Database loss during revocation:** S05's process-local gate survives SQL-session loss. A second content process cannot serve or acknowledge; the local revoker waits. Known enqueue precedes Ack, or the buffer is discarded. Uncertain send/commit seals, and an unproven detached sender requires confirmed process death. This excludes the original two-process lock-loss schedule within the selected topology. A normal ASGI response wrapper does not establish that boundary.
- **Durable delete with SQL rollback:** C06/C10/C16 combine the independent live deny overlay with SQL policy before candidate text/value selection, and repeat dependency checks before model input/final dispatch. SQL rollback returns503 plus durable-deny operation reference; it neither clears deny nor authorizes purge. Unknown journal state seals all content. Tombstone completion is reconciled separately from acknowledgement.
- **Old SQL restore:** Independent authority checkpoints cover grants and semantic trust as well as deletion. Behind-checkpoint SQL stays sealed; old sessions/grants/review assignments/accepted facts/applicability/serving heads are invalidated before fresh approval/rebuild. A hash chain alone is not claimed to detect complete-file rollback. Anchor/key durability and recovery remain operational tests.
- **Embedding migration and rollback:** C13 requires complete eligible membership in one exact space, including equal-dimension revisions, rather than omitting inconvenient sources. Publication maintains A while B catches up; cutover discards old-profile buffers. Rollback covers today's sources/denies, backfilling new sources where necessary. Whole-corpus lexical maintenance is explicit if dual encoders cannot fit. Missing memory/latency results qualify online migration, not the source/profile separation.

The expensive unresolved **choices**, rather than new defects, are the service/tenant authority boundary and the single-host, single-egress, sole-writer failure model with slow fresh-approval recovery. Owners must accept those before permanent commitment. If HA or rapid automatic recovery is an actual requirement, A09 cannot be signed unchanged and the dispatch/recovery protocol must be revisited. No such requirement should be invented to reject this bounded pilot. Source/evidence identities, membership-bound applicability, semantic epochs and corpus profiles now have compatible designs worth preserving.

## New findings and consolidation corrections

**New Critical issues: none substantiated. New High/Medium design blockers: none substantiated.**

**FR01 — Low, confirmed fixture/header mismatch; high confidence.** C08 line413 requires a quoted decimal `If-Match` value and UUID `Idempotency-Key`. The [published-review example](../reconciliation/final-contract-examples.json), lines8–9, instead supplies the actual values `8` and `SYN-RR01-001`. JSON quotation delimiters do not put quotation marks into the decoded header value. A faithful strict API would reject this example before testing semantic retraction. This is a static incompatibility, not an observed API failure or security bypass.

Required correction during consolidation/P00: preserve C08's grammar; use JSON `"If-Match": "\"8\""` and a valid synthetic UUID idempotency key. Validate headers as well as bodies in maintained API-schema/round-trip fixtures, with invalid-header negatives. The existing finite checker reads this request's body, so its passing result does not refute FR01. Fixing this is a fixture edit now; allowing divergent client/server interpretations would cause avoidable API rework later. It does not block starting synthetic implementation or reopen RR01.

Two small wording edits belong in consolidation: qualify C11 line459's broad “Corrections create a new extraction” as **extraction-byte corrections**, matching lines465/471/475; change C16 line567's “A09/A05 explicitly accept” to **must explicitly accept**, matching the decision packet's recorded pending status. The detailed contracts already state both intended rules, so these are clarity corrections rather than surviving original counterexamples.

## Remaining implementation and production gates

1. **P00/consolidation:** Materialize the corrected strict subject/decision unions, header grammar, closed state enums, complete membership/hash constraints, typed journal operations and exact GC claims into maintained schemas/OpenAPI/DDL. Resolve FR01 and the wording above. Keep one normative specification and trace the preserved review IDs to executable tests. This is engineering work; another general architecture review is unnecessary unless it exposes a concrete incompatible contract.
2. **Early synthetic fault spikes:** Test the actual synchronous transport enqueue, SQL-session loss, rejected second process, cancellation/death fencing and journal SQL-outcome/checkpoint recovery before committing to a server adapter. This reduces the largest implementation uncertainty without requiring production load certification. Settle A01/A02a/A03 policy/A09 before their permanent dependent integration. Actual named enterprise reviewers, live IdP and records schedules can arrive at their consumer gates.
3. **First published lexical slice:** P specifies sealed migrations0001–0007 before CP3, including delayed attachment of release FKs once0006 exists. Build the minimum review, semantic/profile, publication/final-dispatch, journal deny and root controls early; P07 later completes lifecycle integration. T07 precedes canonical acceptance, T09 baseline lexical scoring and T13 gold freeze. Full OCR/dense/review/load evidence is not a prerequisite to creating this slice.
4. **Consumer acceptance:** Execute actual-role/API/SQL T01/T02/T04/T06 and journal/transport/storage T03/T05/T10. Include a document-delete-authorized caller lacking family-management/read rights to other members: mandatory internal invalidation must complete without granting authority to approve replacement legal trust. C10's deny and C12's invalidation are required consequences of deletion; P00 should make that distinction explicit when translating the membership command's all-source authorization into handlers. Test roots for pending families with no accepted set, all-source exclusion permissions, committed replay after its own epoch advance and retained-key lookup. No mock projection update substitutes for these workflows.
5. **Before confidential exposure:** Obtain actual identity/reviewer/data/records/asset authority and execute actual pool/RLS/helper/all-endpoint isolation, sandbox/no-egress/scanner controls, process/transport fencing, durable delete/journal and sealed restore/purge tests. Provision approved storage/keys/independent anchors and enforce A09 topology. Real workbook records remain outside fixtures/corpus/reports/APIs; enterprise external inference and real SAP remain prohibited. Demo RBAC supplies no real security evidence.
6. **Before production and promised automation/scale:** Ratify A10 supported tasks/coverage and A11 review staffing/error/backlog/ready-time limits; execute the applicable E-series and T11/T12/T14, actual selected encoder/tokenizer checks, authorized representative quality evaluation, supported mixed-load/long-document/recovery drills, Vietnamese Vitest/Playwright workflows and CP9 operational/security acceptance. Sparse quality slices remain unestablished and long scans review-only until qualified. Disabled optional models, HA and larger unsupported scales are not universal gates.

## Verification actually performed and preservation

- Re-ran `python3 ragplan/2/reconciliation/verify.py --baseline /tmp/asa-rag-final-review-baseline.json --output /tmp/asa-rag-final-review-design-checks.json`. Final result after adding this report: **exit0, 210 finite design/documentation checks passed, 0 failed**. The extra check compared with the prior209 is this report's Markdown fence check. Reviewed the checker's scope; passing finite models/phrase checks is not proof that every prose contract or API header conforms.
- Ran an independent Python standard-library header probe against the decoded fixture: UUID parsing and quoted-decimal matching found **two nonconforming header values**, recorded in `/tmp/asa-rag-final-review-fixture-check.json`. These reproduce FR01 without asserting runtime rejection was observed.
- Read the historical SQL script/result and prior evidence records. The17 narrow SQL probes and46 demo tests are historical; neither was rerun or counted as enterprise validation. No enterprise API/RLS, transport/fsync fault, physical GC/restore, OCR/model, benchmark/load, reviewer batch, Vitest or Playwright execution occurred in this documentation review.
- Strict SHA-256 comparison confirms **all408 pre-existing baseline files unchanged**. Only this report was added under `ragplan/2/`; architecture, reconciliation/checker/results, previous reviews and production code remain unchanged. Local report links were checked. No imported workspace data was opened or changed.

The remaining uncertainty is best reduced by consolidation and the specified synthetic implementation spikes. Reopen a design issue only for a concrete new counterexample, rejected foundational assumption or failed implementation experiment that requires a contract change.
