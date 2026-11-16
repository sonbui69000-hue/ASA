# Final re-review corrections — contract 2.2.0

Date: 2026-11-16. Executes [rag-patch-prompt-2.md](../../rag-patch-prompt-2.md). The [independent re-review](../review/re-review.md), including its 10 resolved/4 partial findings and NO-GO freeze verdict for2.1, is preserved byte-for-byte. This register reports the subsequent correction, not a rewritten independent verdict or a runtime certification.

## Verification of the findings before patching

Each finding was checked against the actual2.1 contracts before editing:

| Finding | Confirmed source conflict/omission | Selected bounded repair |
| --- | --- | --- |
| RR01 | C08 required C11 staged package for fact retraction, while C11 excluded fully published subjects; algorithm C07 still enabled approved entity-ID sketches against C14 literal-only baseline. | Separate published review subject/route/capability; literal-only static sketches and live semantic exact channels. |
| RR02 | C12 covered original clauses and selected members but did not bind complete registered membership or require addition of M2 to invalidate accepted S1. | Immutable complete membership head/revision/hash, exhaustive member considerations and atomic set invalidation/replacement. |
| RR03 | C16's unique operation-ID wording did not distinguish two record kinds for one delete or specify SQL-committed/checkpoint-missing recovery. | Separate command/record identity, typed-record key, SQL immutable operation outcome and explicit crash/replay states. |
| RR04 | C06 artifact enum lacked pending/purging and purger was tombstone-only; C16 required retention GC of superseded artifacts in live documents. | Separate GC lifecycle and narrowly scoped tombstone/retention claims; unchanged artifact processing enum. |
| RR05 | C13 placed prewarm inside the gate despite W14's external prewarm; W16 expiry wording omitted S05's suspension limitation. | External prewarm then short guarded CAS; consistent final-admission expiry wording, with A09 still pending. |

No new infrastructure, retrieval engine, remote inference or unrelated business-state redesign is introduced. Proposed contract version is2.2.0 within the unimplemented `/api/enterprise-rag/v2` namespace. Old payload meanings are not silently accepted. Existing sources/evidence, singleton authority, corpus profiles, synthetic-only fixtures and workbook AI deny remain intact.

## Files changed for each correction

The following exact common files carry **each** RR01–RR05 through the package: [README](../README.md), [architecture](../rag-architecture-review.md), [data/API contracts](../rag-data-contracts.md), [security](../rag-security-design.md), [algorithm decisions](../rag-algorithm-decisions.md), [failure analysis](../rag-failure-analysis.md), [evaluation](../rag-evaluation-plan.md), [implementation](../rag-implementation-plan.md), [readiness](../rag-readiness-assessment.md); reconciliation [dispositions](finding-disposition.md), [changelog](architecture-changelog.md), [invariants](revised-invariants.md), [verification matrix](verification-matrix.md), [remaining decisions](remaining-decisions.md), this register, [checker](verify.py) and [current evidence](../verification.md). The generated [checker result](verification-results.json) records executed design checks only.

[Synthetic contract examples](final-contract-examples.json) add exact published-review payload, membership manifest/hash, a linked intent/commit pair and retention claim/target manifest for RR01–RR04. The existing answer example now binds the same membership revision/hash. The previous checker result is retained as [2.1 evidence](verification-results-2.1.json); the historical SQL script/results and all independent review files are unchanged.

## RR01 — Published fact/link/semantic review

**Status: RESOLVED at design level.**

Exact contracts: C08 adds POST `/documents/{id}/published-reviews`; C11 defines disjoint StagedReviewSubject/PublishedReviewSubject, strict branch payloads, source/read/history and review authority, If-Match document revision, expected semantic epoch/prior decisions and idempotency. C06 review assignments/decision ownership and P00/0003/0004/0006 carry the types/constraints. C14/S05 preserve event invalidation, audit, commit/checkpoint and final stale-buffer denial. Algorithm C07 and C14 agree on literal spans only. W15/T06 use the actual published route, not a direct test projection update. I22/I23 state the invariants.

The original witness now succeeds safely: an authorized reviewer targets published E/R/F125 without a staged package. Retraction closes its acceptance interval and advances semantic epoch; a buffered answer at the prior epoch is discarded even with unchanged bytes/R/vector. An inspect_staged assignment alone cannot authorize it; neither can original-export or sign authority. First human fact acceptance also has an explicit candidate→new accepted observation branch; canonical-backed staged fact/link review retains its package/capability checks. Corrections append new observations/decisions; they do not edit source text. Family relation decisions embed C12 membership transition rather than updating a relation in isolation. Classification retains its separate policy/approver checks.

Assumptions/remaining evidence: A03 must name actual published reviewers and policy authorities. P00 materializes maintained strict schemas/OpenAPI; T06 must run actual authorization, route/revision/prior-decision/replay negatives, classification separation, trusted exact/alias projection changes and the S05 buffering race. The finite payload/authority model does not implement API or RLS enforcement.

## RR02 — Complete family membership and applicability

**Status: RESOLVED at design level.**

Exact contracts: C12 adds membership_revision/hash, immutable FamilyMembershipRevision and entry schema, exhaustive consideration enum, family-management assignments and POST membership command. Applicability manifest and C13 snapshot bind that head. C02/C14/S05 publication/relation/retraction/delete paths invoke the atomic head/set rule; C06/0004/0006 attach ownership and forward release FKs/complete-manifest validators. Algorithm A04/D02, W18, T02, evaluation legal gold and I24 use the complete current manifest.

After accepted S1 on head4, registering pending M2 appends head5 and clears/invalidates S1 in the same transaction. A query at the new tenant epoch still cannot validate S1's old head or pointer. The new membership head and its pending registration/source dependencies are retention roots even while no current applicability set exists. A replacement must account for every server-registered instrument in both directions: no omission, duplicates or foreign member. Pending/conflicting/unknown cannot yield accepted completeness; excluded needs reviewed reason/evidence; future-effective remains listed with its interval. Every source/decision, including exclusions, must be permitted. Otherwise the response is generic insufficient, without hidden names/counts; independent permitted quotations remain references.

Assumptions/remaining evidence: the service knows registered instruments, not never-supplied documents; legal precedence/withdrawal is reviewer authority. A03 supplies custodians/timezone/authority. T02 must execute post-S1 registration, stale/fresh-epoch requests, pending/conflicting/future/excluded/withdrawn/denied M2, complete-manifest rejection and source/publication races using actual transactions. This design deliberately favors incomplete outcomes over falsely complete legal answers.

## RR03 — Operation and journal record identity

**Status: RESOLVED at design level within the existing singleton envelope.**

Exact contracts: C16 defines common record fields and strict deny_intent/authority_commit branches, UNIQUE(tenant,entry_kind,operation_id), record_id/sequence, command/scope digests, SQL authority_operations and five explicit crash states. C09 exempts these lifetime identities from ordinary seven-day HTTP replay expiry. C10/S05/W17 and P02/P07/0002/0007 use committed outcome→fsynced typed checkpoint→Ack. I25/T05 include replay and recovery; no second ledger/database/broker is introduced.

Delete X now has two different records tied to one operation, so its checkpoint cannot collide with its intent. Same-kind exact replay returns the original immutable record; altered payload conflicts. Retained-key scope lookup preserves operation identity across digest-key rotation; missing lookup capability seals rather than allocating anew. Intent-only SQL rollback retains deny and no purge; retry reconciles the same operation. SQL committed/checkpoint missing seals and reconstructs the missing record from verified-current immutable SQL outcome, without repeating the mutation. Lost Ack returns the current-authorized existing result. A snapshot behind an acknowledged checkpoint cannot be treated as a never-committed operation; it follows sealed fresh approval with new incarnation/high-water counters, retaining all denies/checkpoints and old identities.

Assumptions/remaining evidence: A09 still must accept one host/one writer/one egress, no HA/rolling overlap, decision-time expiry and slow fresh-approval recovery. Operations supplies durable storage, independent anchors/backups and keys. T05 requires real fsync/file-directory rotation, unknown/torn tail, SQL outcomes/crashes, same-ID conflict/replay, checkpoint/Ack loss, second-process rejection and stale SQL restore. Synthetic record hashes/replay models establish none of that physical durability.

## RR04 — GC state and purge capability

**Status: RESOLVED at design level.**

Exact contracts: C06 preserves processing state staged/verified/adopted/purged and declares C16 artifact_gc live/gc_pending/purging/purged plus gc_claims. Tombstone and retention claim kinds have exact immutable storage-version target manifests and root/GC/hold/tombstone revisions. S05/S09, W19, P02/P07/0002/0006/0007, I26/T10 and records decisions use the same authority-issued claim/receipt boundary. rag_purger has only assigned manifest/receipt functions; trusted broker removes only exact claimed versions.

Expired unrooted superseded R1 can be collected while R2's document stays live, using kind=retention. A tombstone claim additionally requires confirmed SQL tombstone. Roots/records/preexisting holds prevent claim. Root/hold first wins; claim first makes new publication/root/hold fail rather than promising retention of bytes being destroyed. Pending may be cancelled under lock before claim; purging never returns live. Physical deletion runs outside gate with same-claim exact-version retries, and only verified absence permits purged adoption. Neither a broad SQL delete privilege nor caller-chosen object path is needed.

Assumptions/remaining evidence: records/operations owners select physical retention/hold policy and handle attempts to hold already-purging targets honestly. T10 must execute actual-role negative privileges, cross-tenant/wrong-version/widened claim rejection, rooted past-TTL R1, unrooted R1/live R2, both publication/hold/claim schedules and storage retry/absence. The synthetic claim/state model is not a storage or RLS test.

## RR05 — Cutover and expiry wording

**Status: RESOLVED as documentation/ordering contracts.**

Exact contracts: C13 step3, W14 and algorithm D13 place allocation/model load/prewarm outside S05; the gated step rechecks already-prewarmed identity/readiness and current completeness before head CAS. W16, HR03 disposition, I06/I27, evaluation and A09 consistently describe final-gated-admission expiry, conservative clock reserve and no hard lateness bound after arbitrary suspension within the synchronous call. The gate still prevents a revocation Ack overtaking that call; already-enqueued bytes remain in flight.

The patch request's reference to approved semantics is not evidence that A09 has been approved. Its acceptance remains pending. T04 must instrument prewarm/gate ordering and memory fit; T03 must test expiry before final admission separately from suspend-after-admission behavior, actual transport enqueue, cancellation and predecessor fencing. No zero-lateness or recipient-delivery claim has been tested.

## Schema, enum, predicate and dependency audit

- C08/C11 route/subject unions reject cross-branch fields and unknown payload keys. Published decisions bind exact source and prior decision/epoch; C06 assignment capability vocabulary and ownership validators include published review. Family predicates carry expected membership heads and require family authority. No ordinary/staged-reader OR expansion or original-export shortcut was added.
- C12 complete membership equality, nullable pending versus nonpending source identity, reviewed exclusions, immutable manifest versus current invalidation projection, final set/head checks and whole-set permissions agree. C13 snapshots and the synthetic answer include the new binding, with a computed fixture manifest hash.
- C16 typed journal common/branch fields, per-kind operation uniqueness, stable record replay, lifetime SQL outcome key and crash-state transitions agree. New epoch high-water/incarnation applies only to sealed recovery; it is not an automatic replay of old rights or accepted values.
- C06/C16 artifact processing enum and separate GC enum do not overload extraction quality. Exact claims and constrained functions express retention cleanup in a live document. Holds/new roots and physical deletion use the same claim fence, with no purging→live resurrection.
- Migration0002 declares GC/operation keys;0003 staged subjects;0004 published review/family assignments and complete membership models;0006 attaches release/current-set/head FKs and atomic commands after target tables exist;0007 installs/validates purge/recovery functions/privileges. Sealed0001–0007 still precedes CP3, which uses a minimal guarded lexical slice rather than waiting for full P07 integration. Later runtime measurements do not create circular prerequisites.

P00 still must generate full maintained-validator schemas/OpenAPI/DDL. Prose contracts, fixture payloads and finite validation are not claimed to be those implemented schemas. No confirmed remaining RR01–RR05 design contradiction is knowingly deferred to a benchmark; failures discovered during implementation reopen the affected contract.

## Remaining decisions, tests and verdicts

All five RRs are design-resolved. Owner decisions remain separate: A01 service/scope, A02a tenant authority, A03 actual reviewers/family/records policy and A09 singleton/failure/expiry/recovery envelope before their permanent commitment. Live identity, real-data/asset/resources approvals gate their consumers. A10/A11 ratify utility/reviewer acceptance; no risk is represented as already owner-accepted. Runtime T01–T14/E-series evidence remains necessary at the stated exposure/promotion gates, not universally before prototyping.

| Decision | Updated verdict | Remaining condition |
| --- | --- | --- |
| Architecture freeze | **CONDITIONAL GO** | RR01–RR05 contracts are closed; record A01/A02a/A03/A09 and materialize/review strict P00 schemas/OpenAPI/DDL before permanent dependent freeze. No production benchmarks required first. |
| Synthetic prototyping | **GO** | Isolated synthetic environment/assets/minimum controls for the run; no imported workspace or external enterprise inference. |
| Staged implementation | **CONDITIONAL GO** | P00 contracts, pulled-forward minimum lifecycle guards and consumer-specific tests; later measurements qualify capabilities/scale. |
| Production deployment | **NO-GO** | Enterprise implementation, owner approvals and actual security/identity/sandbox/journal/transport/recovery/GC, quality/capacity/review/browser evidence and CP9 acceptance are absent. |

[Verification](../verification.md) records only commands actually executed. This documentation patch starts no application implementation, dependency install, real-data processing or deployment and changes no independent review report.
