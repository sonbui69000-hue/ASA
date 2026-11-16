# Verification strategy and evidence gates

These are **planned tests**, not executed results. [Specification acceptance](../FINAL_IMPLEMENTATION_SPEC.md#acceptance-matrix) and [evaluation contracts](../FINAL_IMPLEMENTATION_SPEC.md#evaluation-contracts) supply the exact conditions. Every requirement's V-RAG suite link below must become behavior assertions plus exact executed test node IDs in the handoff; sharing a suite does not itself prove coverage. The current task runs only the documentation integrity audit.

## Test layers and commands

| Layer | Required boundary | Target command / prerequisite |
| --- | --- | --- |
| Domain/schema/property | Maintained Draft2020-12 validator + formats, strict Pydantic/OpenAPI/DTO round trips, invalid ownership/state/hash/Unicode | In future `services/enterprise-rag`: `uv run pytest tests/unit tests/contracts`. RAG-001–007 create harness and real SQL scalar probes; domain fixtures are synthetic. |
| Backend integration | Real disposable PostgreSQL18/pgvector runtime roles, psycopg pool, OIDC protocol, private immutable versioned store, scanner, worker/sandbox | `uv run pytest tests/integration`; RAG-001 provisions isolated synthetic endpoints/assets and refuses imported-workspace paths. No SQLite/in-memory replacement for RLS acceptance. |
| Security/concurrency/fault | Actual API/routes, transport enqueue, file/directory fsync/process death, DB backend termination, unknown outcomes, torn tail, physical absence, controlled race barriers | `uv run pytest tests/security`; required per-ticket tests use barriers/events rather than timing-only sleeps. Test both orderings and collect operation/revision/watermark/dispatch sequence. Finite models are explanatory, not physical durability evidence. |
| Frontend logic/component | Generated strict DTOs, Vitest/RTL, session/principal/stale-response/error/keyboard behavior | In future `services/enterprise-rag/web`: `npm run test -- --run`. Use installed UI/UX Pro Max for interface implementation. |
| Browser | Actual synthetic API/IdP/SQL/storage/scanner/worker, desktop/mobile/keyboard, Vietnamese workflows | Future web `npm run test:e2e`; installed Playwright skill before execution; no API-wide route mocks. Include storage/log/egress canaries and synthetic screenshots. |
| Inference/quality | Actual pinned local tokenizer/weights/runtime, source-family split, evidence gold and exact authorized dense oracle | `uv run python -m enterprise_rag.benchmarks.run --profile pilot-v2`; RAG-043 builds the baseline runner. Frozen profile plus exact asset/corpus/evaluator hashes required; no hash vectors/injected arrays as inference. |
| Operations/load | Target approved host/VM/primary/store/journal/anchors/keys, real quotas, ingestion, churn, reviewers, backups/holds | Same benchmark runner plus explicit per-ticket T11/T12/T14 and recovery test files.≥1000 queries/arm over≥30 min at target load, one full 8 h worker day and staffed-day reviewer observation as specified. |
| Existing demo preservation | Existing synthetic root app/server/component/browser behavior | Root `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e -- documents.spec.ts assistant.spec.ts demo.spec.ts`, and `npm run test:e2e:online` when affected. These existing commands are not enterprise acceptance; online fixtures use isolated test state. |

All enterprise paths/commands above are future harness targets; no dependency/model installation or runtime command is authorized by this documentation task. A future session must provision the actual approved environment before execution. A missing executable/environment is blocked or not_executed, never a pass. Zero executed applicable tests or only skips fails acceptance.

## Regression and cross-module gate register

| IDs / witness | Required actual regression | Owning ticket suites |
| --- | --- | --- |
|HR01/T01/ST07–08/I02 | Exact assigned reviewer reads safe unpublished package; uploader/reader/search/answer cannot;expired/replaced package/scan/assignment denies |009,025,033,050,052 |
|HR02/RR02/T02/I03–04/I24/W07/W18 | O warranty preserved while scoped payment amended;S1→new M2 changes complete head/invalidates set despite fresh epoch;pending/conflicting/future/excluded/withdrawn/denied cases and both races |036,037,044,045,048,050 |
|HR03/RR05/T03/ST15/I05–06/W16 | Kill SQL backend after last check;second process rejects;local revoke waits;no new old enqueue after Ack;expiry before admission, OS suspension afterward separately limited, cancel/unknown send/death/slow-client faults |010,026,045,048,053 |
|HR04/RR05/T04/I07–08/I27/W14 | Same-dimension incompatible spaces, incompleteB, new publication/delete/replace delta;external prewarm then short CAS;old-profile discard;rollback covers today's sources and denies |019,040,042,048,054 |
|HR05/RR03/T05/ST16/I09–10/I25/W17 | One operation two typed records, same-kind stable replay, digest conflict, key-rotation lookup;intent+SQL rollback remains denied;SQL outcome/checkpoint/Ack crash states;behind-head fresh approvals and highwaters |011,026,046,048,055 |
|HR06/RR01/T06/ST17/I11/I22–23/W15 | Published F125 real `/published-reviews`, no package;retract/correct/link undo with unchanged source/vector removes exact alias trust and buffered claim;current-source replay before new CAS;classification separate |035,044,045,048,050 |
|HR07/T07/I12 | Invalid every-string Unicode before hash→quality review;real SQL text/JSONB round trip for admitted domain;cluster maps/emoji/insert/delete/replacement/UTF16 negatives |002,003,016,023,024,031 |
|HR08/T08/I13 | Three disjoint100→40 each at 120unique;shared membership/no variant votes;short-slot redistribution;top_k independent;mandatory qualifier too large→partial |007,028,039,041,044 |
|HR09/T09/I14 | Actual encoder-off SQL VI filler/content OR, accentless đ, EN alias limits, quoted boosts, protected issuer/slash/hyphen/zero IDs, negation/conditions, typed parameter injection negatives |028,043 |
|HR10/RR04/T10/ST20/I15–16/I26/W19 | Rooted oldR1 survivesTTL;unrooted oldR1 of liveR2 retention claim;root/hold versus claim both orders;pending-family-no-set roots;exact-version physical absence;purger privilege/widened receipt negatives |012,021,036,046,047,048,055 |
|HR11/T11/ST21/I17 | Actual200/300 page scans/hybrid, crash100, timeout/alternate, temp/scanner pressure, short docs/ten searches, page working set,2700 s cumulative/four failures, quantum fairness and honest review outcomes |014,030,055 |
|HR12/T12/I18 | Actual-role plans at 1/10/100%scope,80k/100k andexploratory 1M/3M, deep dependencies, cold/warm, pool/slow client/churn;positive exact-source validity versus negative completeness |009,041,045,054 |
|HR13/T13/I19 | OR alternative/AND qualifier correctness, denied bundle cannot shrink;all-abstain/one-answer-only/partial-only coverage fail;sparse and failed holdout denominators preserved |007,043,044,056 |
|HR14/T14/I20 | Blinded critical wrong digits/header/party/condition, independent adjudication/retraction;backlog/age circuit/hysteresis;measured staffing/service rate and ready latency |038,050,055 |
|FR01 | Decode actual If-Match with quotes;UUID key;unquoted/weak/malformed/missing negatives, bodies and cross-branch validation;historical defective fixture preserved |005,035,048 |
|Final composition1 | Delete-authorized actor without rights to other family members still triggers internal invalidation, returns no other member metadata/no replacement-set authority |036,046,047,048 |
|Final composition2–7 | Committed review replay after own epoch;retained digest keys;pending-membership roots;missing published evidence;staging cleanup/adoption races;late hold409 and incident |012,035,036,046,047,048,055 |

ST01 identity, ST02 pool/roles, ST03 denied vectors, ST04 parent/table, ST05 citations/original, ST06 alias/fact/count, ST09 injection, ST10 PDF bombs, ST11 OOXML, ST12 broker paths, ST13 worker fence, ST14 delete stages, ST18 logs/browser/cache, ST19 egress/secrets and ST21 resource/scanner remain separate actual-boundary assertions in RAG-048, with their component suites first. No endpoint, title, count, job, preview, original, cursor, replay or accepted structured-filter path is exempt. Exact authorized ranks/content must be invariant to denied-row additions/deletions; shared-host timing isolation is not claimed.

## Quality and operating targets

Retain every numeric target in the matrix/specification; none is achieved here. Native CER≤.5%, reading-order≥98%, heading/clauseF1≥.95;clean/degraded scan CER≤3/8%, region recall≥99%, no silently omitted critical clauses. Table header/spanF1 andTEDS-S≥.95, accepted critical cells≥99.5%, zero known wrong automated critical values.100%immutable source/citation resolution. Accepted facts≥99%precision, no invented fields;accepted links≥99.5%, no known false person merge. PII IDs/contact recall≥99%, names/address≥95%by language/type;below gate retains mandatory privacy review.

Retrieval bundle recall@10≥.90overall/.85 major slices, MRR/nDCG@10≥.80, any permitted complete bundle success≥.85/.80, exact-ID/table≥.95. Answers≥99%adjudicated support, zero unsupported critical claims, unanswerable abstention≥95%, complete supported coverage≥80%overall/70%established slices, with A10 ratification. Required qualifiers/units/conditions remain in AND bundles; no forced support to hit coverage. Per-promoted critical rule/slice, prespecified95%upper error≤.5%with family dependence accounted, or review-only. Zero errors from correlated cells do not establish independent600-case evidence.

Search warmp50≤500 ms/p95≤2 s at 10 concurrent/80kchildren during ingestion;hard5 s. Gate≤250 ms;mutation Ackp95≤500 ms/hard≤2 s. Rerank optionaladdedp95≤1 s, total≤2 s. Accepted-upload registrationp95≤2 s after bytes;10 page digitalcomputep95≤60 s/cleanscan≤240 s excludingqueue/review.1000mixedpages/8 h, queuep95≤30 min agreedburst, readyincludingreviewp95≤2businessdays. No sustained hostRSS>70%target/no process caps violated. Lease reclaim≤120 s, onlinepurge≤24hunlessheld, backups≤35dayspendingpolicy. Report queue/compute/review/ready, cold/warm, failures/timeouts/stale/denied and mutation metrics separately.

E01–E09 enabled baseline measurements are produced by their components/harnesses; they do not predate their implementation. Optional E04 reranker, E06 BGE/q8 and E10–E17 arms require their own exact promotion thresholds from the [experiment register](../FINAL_IMPLEMENTATION_SPEC.md#controlled-experiment-register), approved assets and no security loss. E08 rule/review baseline stays mandatory while neural challenger is optional. No optional result is a universal baseline blocker. Each E17 technique has its own ticket; no multi-arm catch-all code session is required.

Gold target 120 documents/~600 pages:six20-documentstrata,60 VI/40 EN/20 mixed;separate200/300 page long-tail fixtures.240transcribedpages,80tables,2000numericcells,4000PIImentions, ≥40PIIdocs/≥20ambiguousqualitycases;family 60/20/40split,360questions180/60/120 with 120 VI/100 EN/80cross/60unanswerable. All translations/versions/exports/amendments of a family stay together.≥20answerable major-language holdout cases or unestablished. Develop/validate first;evaluate frozen holdout once per release profile. Later answer/representative testing uses its own frozen permitted task set;do not tune a tested holdout or rerun unchanged gates merely for larger counts.

## Evidence and runtime gates

Every result records commit/contract/profile/asset/corpus/evaluator hashes, hardware/OS/cgroup/thread limits, DB flags/actual role/query plan, pool, cache/concurrency, command/exit/counts and private artifact location/hash. Run one cold start and≥3randomized warm repetitions per arm;paired family-clustered≥1000 bootstrap resamples with fixed seed. Final tail latency needs≥1000 observations over≥30 min;T11 one 8hworker day;T14 actual blindedstaffedreviews, not estimates. Public reports use aggregates/synthetic examples;private real evaluations require A04 and stay outside source/build/report bundles.

Confidential exposure requires actual identity/reviewer/data/records/asset authority plus real RLS/pool/all-endpoint isolation, sandbox/egress/scanner, process/transport/journal/delete/sealed restore controls. Production adds A10/A11, supported-scope quality/load/review/browser/operations and CP9 independent acceptance. Sparse/unsupported formats remain review-only/unestablished. The 80kpilot need not qualify3M/ANN/HA/optionalmodels. Every security failure blocks its exposure regardless of aggregate utility.

## Planned suite registry

Each V-RAG entry below is a stable planning identifier for its named future files and behavioral cases. The implementer replaces planning links with exact executed test nodes in the handoff. All entries currently have result **not_executed**.

<a id="v-rag-001"></a>

### V-RAG-001 — Isolated harness, asset inventory and decision register

Owner [RAG-001](tickets/RAG-001.md);planned result **not_executed**. Future files: `tests/unit/test_rag_001.py`, `tests/integration/test_rag_001.py`, `tests/security/test_rag_001.py`.

- Imported workspace paths and provider credentials cannot be mounted or inherited.
- An unavailable optional asset blocks its consumer only; missing E5 leaves lexical engineering available.
- A06 approval and offline asset integrity are checked before the specific asset is used.

<a id="v-rag-002"></a>

### V-RAG-002 — Scalar types, Unicode, hashes and offset algebra

Owner [RAG-002](tickets/RAG-002.md);planned result **not_executed**. Future files: `tests/unit/test_rag_002.py`, `tests/integration/test_rag_002.py`, `tests/security/test_rag_002.py`.

- T07: NUL, C0/C1, noncharacters, lone surrogates reject before hash; TAB/LF/CR succeed.
- Combining-mark reordering, astral emoji, empty intervals and inverse enclosing-source maps reconstruct exact original contributors.
- Oversized Epoch/Decimal, NaN and post-hash rewriting reject; real PostgreSQL UTF8 text/JSONB probe uses admitted strings only.

<a id="v-rag-003"></a>

### V-RAG-003 — Canonical evidence and observation schema catalog

Owner [RAG-003](tickets/RAG-003.md);planned result **not_executed**. Future files: `tests/unit/test_rag_003.py`, `tests/integration/test_rag_003.py`, `tests/security/test_rag_003.py`.

- Known values require exact evidence and typed value; unknown/ambiguous/not_applicable require null.
- Reject cyclic parents/headers, overlapping cells, wrong ancestor IDs, invalid boxes, fabricated DOCX pages and signature legality booleans.
- Confidence raw scales/calibration IDs remain distinct from channel rank and human decisions.

<a id="v-rag-004"></a>

### V-RAG-004 — Lifecycle, review, family, serving and ledger contracts

Owner [RAG-004](tickets/RAG-004.md);planned result **not_executed**. Future files: `tests/unit/test_rag_004.py`, `tests/integration/test_rag_004.py`, `tests/security/test_rag_004.py`.

- T02/T04/T05/T06/T10: foreign union keys, incomplete/duplicate family members, equal-dimension incompatible spaces, duplicate record-kind identities and purging-to-live reject.
- State tables cover cancellation, failed optional enrichment, retired sources and every required nullable field.
- Delete caller without family rights can trigger internal invalidation but cannot approve replacement applicability.

<a id="v-rag-005"></a>

### V-RAG-005 — OpenAPI, generated client DTOs and wire negatives

Owner [RAG-005](tickets/RAG-005.md);planned result **not_executed**. Future files: `tests/unit/test_rag_005.py`, `tests/integration/test_rag_005.py`, `tests/security/test_rag_005.py`.

- FR01: decoded "8" succeeds, unquoted 8, weak W/"8", malformed UUID and missing precondition reject as specified.
- Opaque five-minute cursors bind principal/filter/snapshot, page100; hidden and nonexistent objects share404.
- T06 replay authorizes existing subject/result and returns committed outcome before new-operation epoch CAS; changed digest409.

<a id="v-rag-006"></a>

### V-RAG-006 — Migration ownership and transition verification blueprint

Owner [RAG-006](tickets/RAG-006.md);planned result **not_executed**. Future files: `tests/unit/test_rag_006.py`, `tests/integration/test_rag_006.py`, `tests/security/test_rag_006.py`.

- Every content table has ENABLE+FORCE RLS from creation and indexed composite referencing FKs.
- No runtime DDL/TRUNCATE/BYPASSRLS/owner rights or PUBLIC helper execution.
- All 27 invariants and all source tables have one owner; schema drafts alone never authorize serving.

<a id="v-rag-007"></a>

### V-RAG-007 — Gold bundles, synthetic fixtures and evaluator self-tests

Owner [RAG-007](tickets/RAG-007.md);planned result **not_executed**. Future files: `tests/unit/test_rag_007.py`, `tests/integration/test_rag_007.py`, `tests/security/test_rag_007.py`.

- T13 must fail all-abstain and one-answer-only against80/70 coverage, and exact tasks95; pool Recall@10=.5 alone must not fail a full alternative.
- Family variants/translations/exports/amendments cannot leak across splits.
- Every failed/review/timeout case stays in its prescribed denominator; sparse slices remain unestablished.

<a id="v-rag-008"></a>

### V-RAG-008 — OIDC, live identity registry and Vietnamese API shell

Owner [RAG-008](tickets/RAG-008.md);planned result **not_executed**. Future files: `tests/unit/test_rag_008.py`, `tests/integration/test_rag_008.py`, `tests/security/test_rag_008.py`.

- ST01: wrong audience/org, forged X-User/X-Tenant, browser roles and Node account IDs cannot supply authority.
- Logout/principal switch invalidates in-flight state; stale registry fails closed.
- No public fake-login endpoint or content-bearing control-plane telemetry.

<a id="v-rag-009"></a>

### V-RAG-009 — Migration 0001 and actual-role pooled authorization

Owner [RAG-009](tickets/RAG-009.md);planned result **not_executed**. Future files: `tests/unit/test_rag_009.py`, `tests/integration/test_rag_009.py`, `tests/security/test_rag_009.py`.

- ST02: alternate100 allowed/denied/missing-context transactions on pool1, including connection exceptions.
- Probe runtime/helper privileges, recursive policy leakage, cross-tenant FK insertion and unknown-label restricted handling.
- CP1 real API+SQL metadata authorization; sign/grant-admin/upload rights do not imply read/original.

<a id="v-rag-010"></a>

### V-RAG-010 — Actual synchronous transport and singleton fault spike

Owner [RAG-010](tickets/RAG-010.md);planned result **not_executed**. Future files: `tests/unit/test_rag_010.py`, `tests/integration/test_rag_010.py`, `tests/security/test_rag_010.py`.

- T03/ST15: kill SQL backend after validation; second API rejects and local revoke waits; no old enqueue follows RevocationAck.
- Expiry before final admission denies without epoch bump; suspend-after-admission is separately reported with no hard wall-time guarantee.
- 256 KiB final response/250 ms final gate and no detached authorized body; uncertain sender seals and terminates.

<a id="v-rag-011"></a>

### V-RAG-011 — Durable typed journal and immutable operation outcome spike

Owner [RAG-011](tickets/RAG-011.md);planned result **not_executed**. Future files: `tests/unit/test_rag_011.py`, `tests/integration/test_rag_011.py`, `tests/security/test_rag_011.py`.

- T05/ST16: one delete has distinct linked intent/commit records; changed payload409 and no duplicate epoch/event.
- Lookup through old digest-key revisions survives rotation; missing key/head/segment seals.
- No truncate-and-serve, no compaction, no purge before confirmed tombstone; SQL rollback leaves live deny.

<a id="v-rag-012"></a>

### V-RAG-012 — Migration 0002 and immutable intake registration

Owner [RAG-012](tickets/RAG-012.md);planned result **not_executed**. Future files: `tests/unit/test_rag_012.py`, `tests/integration/test_rag_012.py`, `tests/security/test_rag_012.py`.

- Interrupted/over-limit streams never publish; filename never becomes path.
- DB-after-blob failure leaves a private orphan, retry yields one source/job, changed digest409.
- Cleanup claim first blocks adoption; registration first creates roots/excludes cleanup; no live workspace copied.

<a id="v-rag-013"></a>

### V-RAG-013 — Job leases, fenced checkpoints and cancellation

Owner [RAG-013](tickets/RAG-013.md);planned result **not_executed**. Future files: `tests/unit/test_rag_013.py`, `tests/integration/test_rag_013.py`, `tests/security/test_rag_013.py`.

- ST13: pause epoch 7, reclaim8, resume 7 before/after adopt; no stale/duplicate release.
- Expired heartbeat/checkpoint fails even without replacement; succeeded stage replay returns prior committed result.
- CP2 kill/resume verifies same input/config/artifacts; terminal jobs carry no live lease.

<a id="v-rag-014"></a>

### V-RAG-014 — Fair scheduler, charged work and admission circuits

Owner [RAG-014](tickets/RAG-014.md);planned result **not_executed**. Future files: `tests/unit/test_rag_014.py`, `tests/integration/test_rag_014.py`, `tests/security/test_rag_014.py`.

- T11/ST21: long/short jobs progress, crash overcharges safely, budget exhaustion enters waiting_review.
- Search pressure throttles parsing; priority cannot bypass quota; scanner/review/disk circuit stops new intake without disabling reads/deletes.
- No automatic200/300-page completion promise;40 min worst cycle is distinct from30 min measured p95.

<a id="v-rag-015"></a>

### V-RAG-015 — Structural allowlists and clean-scan attestations

Owner [RAG-015](tickets/RAG-015.md);planned result **not_executed**. Future files: `tests/unit/test_rag_015.py`, `tests/integration/test_rag_015.py`, `tests/security/test_rag_015.py`.

- ST10/ST11/ST21: benign synthetic bombs/spoofs/external hyperlink inputs reject within bounds and next safe job proceeds.
- Scanner errors never become clean; no password/converter/arbitrary-image path.
- Harmless antivirus sentinel verifies actual scanner boundary; parser stderr/filename never enters user errors.

<a id="v-rag-016"></a>

### V-RAG-016 — Migration 0003 canonical and safe-review ownership

Owner [RAG-016](tickets/RAG-016.md);planned result **not_executed**. Future files: `tests/unit/test_rag_016.py`, `tests/integration/test_rag_016.py`, `tests/security/test_rag_016.py`.

- T07 before first canonical acceptance; Unicode invalid metadata/key cannot reach hash/SQL.
- No forward reference to0006 releases or nonexistent0004 assignment tables.
- Package member cannot refer to another extraction/tenant or an unverified unsafe preview.

<a id="v-rag-017"></a>

### V-RAG-017 — Migration 0004 observations and review capability policies

Owner [RAG-017](tickets/RAG-017.md);planned result **not_executed**. Future files: `tests/unit/test_rag_017.py`, `tests/integration/test_rag_017.py`, `tests/security/test_rag_017.py`.

- T01/ST07/ST08: uploader receipt does not grant inspection; stale assignment/scan/source/revision denies.
- Wrong subject union/typed endpoint/cross-source ownership rejects.
- Actual reader/reviewer/worker roles cannot directly create false accepted facts or downgrade labels.

<a id="v-rag-018"></a>

### V-RAG-018 — Complete migration 0004 semantic and family heads

Owner [RAG-018](tickets/RAG-018.md);planned result **not_executed**. Future files: `tests/unit/test_rag_018.py`, `tests/integration/test_rag_018.py`, `tests/security/test_rag_018.py`.

- T02: two-way membership equality, pending nonpublication, reviewed exclusions and explicit half-open intervals.
- T06: close old trust without editing literal source; projection reconstructs event history.
- No current set is required to root pending family membership; no family mutation bypass via direct relation rows.

<a id="v-rag-019"></a>

### V-RAG-019 — Migration 0005 representation and complete corpus schema

Owner [RAG-019](tickets/RAG-019.md);planned result **not_executed**. Future files: `tests/unit/test_rag_019.py`, `tests/integration/test_rag_019.py`, `tests/security/test_rag_019.py`.

- T04: equal dimension with different weights/tokenizer/prefix is incompatible.
- Reject NaN/zero/wrong dimension/norm/input hash and mixed-extraction generation.
- Lexical computed counts are not fabricated; pending cannot masquerade as complete hybrid.

<a id="v-rag-020"></a>

### V-RAG-020 — Migration 0006 release ownership and publication commands

Owner [RAG-020](tickets/RAG-020.md);planned result **not_executed**. Future files: `tests/unit/test_rag_020.py`, `tests/integration/test_rag_020.py`, `tests/security/test_rag_020.py`.

- T02/T04/ST13: incomplete generation/mixed rendition, expired fence, source race and stale expected release abort.
- Failed replacement preserves previous allowed release; source replacement invalidates or rebinds applicability.
- No schema-serving interval or forward DDL reference is allowed.

<a id="v-rag-021"></a>

### V-RAG-021 — Migration 0007 deletion, retention claims and restore guards

Owner [RAG-021](tickets/RAG-021.md);planned result **not_executed**. Future files: `tests/unit/test_rag_021.py`, `tests/integration/test_rag_021.py`, `tests/security/test_rag_021.py`.

- ST20/T10: purger has no general content SELECT/write/path deletion/claim issuance.
- Retention claims allow old unrooted R1 of liveR2 without tombstoningR2; tombstone claims require confirmed tombstone.
- Wrong tenant/version/claim kind/receipt and purging→live reject; all tables retain FORCE RLS.

<a id="v-rag-022"></a>

### V-RAG-022 — Disposable sandbox, trusted broker and watchdog

Owner [RAG-022](tickets/RAG-022.md);planned result **not_executed**. Future files: `tests/unit/test_rag_022.py`, `tests/integration/test_rag_022.py`, `tests/security/test_rag_022.py`.

- ST10–12/ST19: traversal/absolute/symlink/hardlink/huge JSON/NaN/foreign source/wrong hash outputs cannot be adopted.
- Compromised parser cannot access DB/KMS/storage/provider credentials or imported workspace.
- No parser/model work in API event loop; scanner clean does not confer parser-output trust.

<a id="v-rag-023"></a>

### V-RAG-023 — Native PDF canonical evidence vertical path

Owner [RAG-023](tickets/RAG-023.md);planned result **not_executed**. Future files: `tests/unit/test_rag_023.py`, `tests/integration/test_rag_023.py`, `tests/security/test_rag_023.py`.

- T07/W02: 100% accepted evidence hash/span/page reconstruction; rotated/cropped text and raw/NFC offsets agree.
- Invisible OCR/unsupported complex region cannot silently use native success elsewhere.
- Invalid input retained raw with permanent CANONICAL_TEXT_UNSUPPORTED review, no SQL retry loop.

<a id="v-rag-024"></a>

### V-RAG-024 — Native OOXML canonical path and unsupported coverage

Owner [RAG-024](tickets/RAG-024.md);planned result **not_executed**. Future files: `tests/unit/test_rag_024.py`, `tests/integration/test_rag_024.py`, `tests/security/test_rag_024.py`.

- W01/ST11: no invented DOCX pages, arbitrary ZIP relationship fetch or deleted-text current evidence.
- Simple accepted fixture resolves exact immutable part/runs; unsupported complex fixture enters review.
- Nested/merged parts never disappear from coverage merely because python-docx body API omits them.

<a id="v-rag-026"></a>

### V-RAG-026 — Minimum singleton mutation, journal and semantic kernel

Owner [RAG-026](tickets/RAG-026.md);planned result **not_executed**. Future files: `tests/unit/test_rag_026.py`, `tests/integration/test_rag_026.py`, `tests/security/test_rag_026.py`.

- T03/T05/T06 minimum actual-process regressions; SQL rollback cannot remove durable deny.
- Committed replay is authorized before returning original result, never emits duplicate events/epochs.
- No worker, identity-sync sidecar or maintenance tool independently commits visible heads; no content egress bypass.

<a id="v-rag-025"></a>

### V-RAG-025 — Safe previews and exact staged review package API

Owner [RAG-025](tickets/RAG-025.md);planned result **not_executed**. Future files: `tests/unit/test_rag_025.py`, `tests/integration/test_rag_025.py`, `tests/security/test_rag_025.py`.

- T01/ST07/ST08: reviewer succeeds before publication, uploader/reader/search/answer/original fail appropriately.
- Wrong extraction, expired package/assignment, changed scan/coverage/preview and unsafe preview deny.
- Revocation during preview buffering uses actual singleton dispatch; metadata and candidate pages≤100items/256 KiB.

<a id="v-rag-027"></a>

### V-RAG-027 — Minimum source publication and complete lexical corpus

Owner [RAG-027](tickets/RAG-027.md);planned result **not_executed**. Future files: `tests/unit/test_rag_027.py`, `tests/integration/test_rag_027.py`, `tests/security/test_rag_027.py`.

- CP3 prerequisites:0001–0007 installed sealed; no incomplete source publication or old-worker adoption.
- Lexical no-model profile is labeled honestly; history and ordinary-current reads stay distinct.
- Delete-authorized caller lacking family rights still clears dependent trust without exposing other members.

<a id="v-rag-028"></a>

### V-RAG-028 — Lexical chunker, safe OR compiler and bounded search

Owner [RAG-028](tickets/RAG-028.md);planned result **not_executed**. Future files: `tests/unit/test_rag_028.py`, `tests/integration/test_rag_028.py`, `tests/security/test_rag_028.py`.

- T09 real SQL: filler VI/EN, accentless đ, slash/hyphen/leading zeros, phrase boost and injection negatives.
- T08 three disjoint100 lists→40 each, duplicates retain all slots, short lists redistribute.
- Empty/nonmeaningful/over32-term/over3-slot input clarifies; no all-question AND or fake E5 count.

<a id="v-rag-029"></a>

### V-RAG-029 — Guarded synthetic lexical end-to-end checkpoint

Owner [RAG-029](tickets/RAG-029.md);planned result **not_executed**. Future files: `tests/unit/test_rag_029.py`, `tests/integration/test_rag_029.py`, `tests/security/test_rag_029.py`.

- T01/T03/T05/T07/T08/T09 minimum guard set actually executes; test listing/mocked API is insufficient.
- Failed replacement leaves old allowed source and no duplicated/stale publication.
- No confidential content/browser persistence/external inference; existing demo remains untouched.

<a id="v-rag-030"></a>

### V-RAG-030 — Region router, selective OCR and streaming long input

Owner [RAG-030](tickets/RAG-030.md);planned result **not_executed**. Future files: `tests/unit/test_rag_030.py`, `tests/integration/test_rag_030.py`, `tests/security/test_rag_030.py`.

- W03/T11: clean native region cannot hide scanned clause on same page; misleading OCR layer/blank/photo appendix is accounted.
- Crash at page100 resumes checkpoints without budget reset/full raster retention.
- 200/300-page fixtures complete or honestly review; measured support promotion remains P09.

<a id="v-rag-031"></a>

### V-RAG-031 — Complex tables, physical transforms and continuation

Owner [RAG-031](tickets/RAG-031.md);planned result **not_executed**. Future files: `tests/unit/test_rag_031.py`, `tests/integration/test_rag_031.py`, `tests/security/test_rag_031.py`.

- E01/W04: anchor/span/header F1, exact critical values and physical evidence resolve independently.
- Arithmetic counts logical cell once, refuses mixed currencies/tax scopes/subtotal duplicates.
- Off-page/nonfinite/noninvertible transforms and unsupported nonaffine warps reject exact-region release.

<a id="v-rag-032"></a>

### V-RAG-032 — Full OOXML fidelity, appendices and signature observations

Owner [RAG-032](tickets/RAG-032.md);planned result **not_executed**. Future files: `tests/unit/test_rag_032.py`, `tests/integration/test_rag_032.py`, `tests/security/test_rag_032.py`.

- W01–W05 CP4:100% accepted physical/source integrity and explicit valid/review/reject paths.
- Deleted tracked text cannot become current evidence; repeated headers suppress only in retrieval projection.
- Missing appendix cannot be claimed parsed; rendered DOCX never acquires intrinsic pages.

<a id="v-rag-033"></a>

### V-RAG-033 — Type, sensitivity and privacy review policy

Owner [RAG-033](tickets/RAG-033.md);planned result **not_executed**. Future files: `tests/unit/test_rag_033.py`, `tests/integration/test_rag_033.py`, `tests/security/test_rag_033.py`.

- ST08/T01: public upload/parser claims and absence of detected PII cannot downgrade restricted policy.
- Label escalation immediately applies stricter live handling without vector rewrite.
- E08 baseline reports language/type/scan recall and any-miss; no egress/pseudonym/redaction authority inferred.

<a id="v-rag-034"></a>

### V-RAG-034 — Mentions, normalization and reversible entity links

Owner [RAG-034](tickets/RAG-034.md);planned result **not_executed**. Future files: `tests/unit/test_rag_034.py`, `tests/integration/test_rag_034.py`, `tests/security/test_rag_034.py`.

- ST06/E07/E08: common-name different-ID false merge rejects; unknown phone country does not guess E.164.
- Link undo removes current alias trust without changing mentions; all dependent source permissions conjunct.
- Key rotation rebuilds lookup projection; deleted sole-source alias disappears; no cross-tenant keys/IDs.

<a id="v-rag-035"></a>

### V-RAG-035 — Typed facts and real published semantic review API

Owner [RAG-035](tickets/RAG-035.md);planned result **not_executed**. Future files: `tests/unit/test_rag_035.py`, `tests/integration/test_rag_035.py`, `tests/security/test_rag_035.py`.

- T06/ST17: publish F125, no package, retract/correct/undo while answer buffers; old filters vanish and final buffer rejects unchanged bytes/release/vector.
- Wrong release/tenant/dependency/peer/staged-only/classification authority and cross-branch payload deny.
- Known→ambiguous or currency/installment/party/condition change closes old scoped trust; committed replay emits no new event.

<a id="v-rag-036"></a>

### V-RAG-036 — Complete family membership registration and invalidation

Owner [RAG-036](tickets/RAG-036.md);planned result **not_executed**. Future files: `tests/unit/test_rag_036.py`, `tests/integration/test_rag_036.py`, `tests/security/test_rag_036.py`.

- T02/W18: accepted S1 then register M2 invalidates S1 even on a fresh-epoch query and without old dependency edge.
- Pending/conflicting/future/excluded/withdrawn/replaced/tombstoned members and both query/mutation race orders.
- Hidden family returns opaque authorized operation result, never partial counts/names or replacement-set power.

<a id="v-rag-037"></a>

### V-RAG-037 — Reviewed applicability, scoped effects and legal composition

Owner [RAG-037](tickets/RAG-037.md);planned result **not_executed**. Future files: `tests/unit/test_rag_037.py`, `tests/integration/test_rag_037.py`, `tests/security/test_rag_037.py`.

- T02: O warranty survives payment amendment; beforeD paymentO, afterD O+M+condition+decision evidence.
- Missing/duplicate/foreign member, pending registry relation, overlap without reviewed precedence and stale heads reject accepted completeness.
- Denied M2 yields generic insufficient with independent allowed references only; no ordinal/signature/filename legal precedence.

<a id="v-rag-038"></a>

### V-RAG-038 — Review backlog circuit and adjudication workflow

Owner [RAG-038](tickets/RAG-038.md);planned result **not_executed**. Future files: `tests/unit/test_rag_038.py`, `tests/integration/test_rag_038.py`, `tests/security/test_rag_038.py`.

- T14: blinded wrong digit/header/party/qualifier cannot pass unresolved disagreement.
- Circuit429 REVIEW_CAPACITY_EXCEEDED applies only new intake; demand forecast≤80%staffed trailing5 days.
- 99%adjudicated/zero missed planted errors and 2 business-day ready target remain unachieved until timed qualification.

<a id="v-rag-039"></a>

### V-RAG-039 — Hierarchical, clause and table source-mapped chunks

Owner [RAG-039](tickets/RAG-039.md);planned result **not_executed**. Future files: `tests/unit/test_rag_039.py`, `tests/integration/test_rag_039.py`, `tests/security/test_rag_039.py`.

- E05/T08/ST04: long rows/conditions preserve exact source ranges and all header/footnote dependencies.
- No silent truncation or fictionally computed tokenizer counts; semantic correction never needs reembedding literal source.
- Near-identical conflicting clauses/cells/versions remain distinct.

<a id="v-rag-040"></a>

### V-RAG-040 — Actual local E5 tokenizer, encoder and exact dense oracle

Owner [RAG-040](tickets/RAG-040.md);planned result **not_executed**. Future files: `tests/unit/test_rag_040.py`, `tests/integration/test_rag_040.py`, `tests/security/test_rag_040.py`.

- ST03/T04:100denied exact matches cannot change allowed candidate content/rank; never global top-k then filter.
- Wrong same-dimension model/query prefix/input hash/NaN/zero/overlimit rejects.
- Actual inference results reported separately from injected contract encoders; missing assets block hybrid promotion only.

<a id="v-rag-041"></a>

### V-RAG-041 — Hybrid fusion, fair admission and complete-bundle expansion

Owner [RAG-041](tickets/RAG-041.md);planned result **not_executed**. Future files: `tests/unit/test_rag_041.py`, `tests/integration/test_rag_041.py`, `tests/security/test_rag_041.py`.

- T08:three 100 disjoint→40 each, duplicate multi-slot, short-slot refill,top_k1/10/20 and overlarge qualifier→partial.
- ST04/ST06: denied expansion/accepted fact/alias/source cannot enter model or answer buffer.
- E02/E03/E05/E07 raw/admitted/final per-slot recall and before/after packing sufficient bundles measured.

<a id="v-rag-042"></a>

### V-RAG-042 — Corpus shadow migration, atomic cutover and current rollback

Owner [RAG-042](tickets/RAG-042.md);planned result **not_executed**. Future files: `tests/unit/test_rag_042.py`, `tests/integration/test_rag_042.py`, `tests/security/test_rag_042.py`.

- T04/RR05: equal-dimension incompatible A/B, incomplete thirdB, concurrent publish/delete/replace and lateB workers.
- Instrument prewarm outside gate, short final CAS and request/rollback retention roots.
- Rollback never resurrects deletion or drops eligible source; query encoder failure degrades complete membership.

<a id="v-rag-043"></a>

### V-RAG-043 — Freeze baseline retrieval and parsing quality evidence

Owner [RAG-043](tickets/RAG-043.md);planned result **not_executed**. Future files: `tests/unit/test_rag_043.py`, `tests/integration/test_rag_043.py`, `tests/security/test_rag_043.py`.

- T13 denominator gaming and family leakage fail; no hash/injected vectors counted as inference.
- Acceptance targets in spec retained exactly; wrong autoaccepted critical value disables rule/pattern;95%upper error≤.5%per promoted critical rule/slice or review-only.
- No holdout retuning/retroactive exclusions; failed holdout requires new version/new holdout.

<a id="v-rag-044"></a>

### V-RAG-044 — Evidence sufficiency, deterministic answers and exact citations

Owner [RAG-044](tickets/RAG-044.md);planned result **not_executed**. Future files: `tests/unit/test_rag_044.py`, `tests/integration/test_rag_044.py`, `tests/security/test_rag_044.py`.

- ST09/T13: fake citation/exfil/tool JSON in text/scan/table/title/metadata produces no tool/network/write/policy effect.
- Unknown total, wrong installment/party/currency/condition, missing exception and resolvable-unrelated citation cannot support claim.
- 100%citation resolution,≥99%adjudicated support/zero unsupported critical claims and≥95%unanswerable abstention remain measured gates.

<a id="v-rag-045"></a>

### V-RAG-045 — Revocation, all-route dispatch and bounded original export

Owner [RAG-045](tickets/RAG-045.md);planned result **not_executed**. Future files: `tests/unit/test_rag_045.py`, `tests/integration/test_rag_045.py`, `tests/security/test_rag_045.py`.

- T03/ST05/ST15: SQL backend loss, cancel/deferred-send/slow-client/expiry/clock anomaly/incarnation and predecessor-death races on actual adapter.
- No post-Ack old enqueue, prior in-flight bytes explicitly allowed; suspension limit reported honestly.
- Uncertain enqueue/commit/journal seals; no asynchronous sender survives authority release.

<a id="v-rag-046"></a>

### V-RAG-046 — Deletion outcomes, sealed restore and key-rotation recovery

Owner [RAG-046](tickets/RAG-046.md);planned result **not_executed**. Future files: `tests/unit/test_rag_046.py`, `tests/integration/test_rag_046.py`, `tests/security/test_rag_046.py`.

- T05/ST14/ST16/ST20: intent+SQL rollback every channel denies; no physical purge yet; lostAck and rotated keys yield same operation.
- Missing/corrupt/gap/rolledback ledger or missing lookup keys stays sealed, hash chain alone insufficient.
- Delete-authorized/no-family-right caller succeeds without hidden member metadata; restore cannot revive fact125/revoked grants/deleted source.

<a id="v-rag-047"></a>

### V-RAG-047 — Dependency roots, exact GC claims, holds and physical purge

Owner [RAG-047](tickets/RAG-047.md);planned result **not_executed**. Future files: `tests/unit/test_rag_047.py`, `tests/integration/test_rag_047.py`, `tests/security/test_rag_047.py`.

- T10/ST20: rooted retiredR1 pastTTL survives; unrooted expiredR1 of liveR2 retention purges without tombstoningR2.
- Root/hold first blocks claim; claim first publication/new hold409 HOLD_TARGET_UNAVAILABLE plus private incident; no purging→live.
- Wrong kind/tenant/version/widened receipt/arbitrary SQL/path/read rejects; identical completed receipt returns result without another delete.

<a id="v-rag-048"></a>

### V-RAG-048 — Cross-module adversarial lifecycle checkpoint

Owner [RAG-048](tickets/RAG-048.md);planned result **not_executed**. Future files: `tests/unit/test_rag_048.py`, `tests/integration/test_rag_048.py`, `tests/security/test_rag_048.py`.

- RR01–RR05 and FR01 each have executable regressions; published review uses route not projection edit.
- No forbidden current content, stale/duplicate publication, lost root or restored authority resurrects.
- Do not claim unsupported real identity/physical durability/production load passed; attach blocked/not_executed explicitly.

<a id="v-rag-049"></a>

### V-RAG-049 — Enterprise client session and strict response contracts

Owner [RAG-049](tickets/RAG-049.md);planned result **not_executed**. Future files: `web/src/test/rag-049.test.tsx`, `web/tests/e2e/rag-049.spec.ts`.

- ST18: content canaries absent from browser storage/bundles/cache and late old-principal responses ignored.
- Malformed schema/snapshot/header rejects without leaking private keys or falling back to demo/provider.
- Actual session API errors and cancellation are distinguishable from empty authorized results.

<a id="v-rag-050"></a>

### V-RAG-050 — Vietnamese upload, status and staged-published review UI

Owner [RAG-050](tickets/RAG-050.md);planned result **not_executed**. Future files: `web/src/test/rag-050.test.tsx`, `web/tests/e2e/rag-050.spec.ts`.

- Vitest/RTL covers stale package/review conflict,unknown labels,ambiguous values,circuit and lost authority.
- T01/T02/T06/T14 browser fixtures use actual APIs; inspect_staged alone cannot retract published facts.
- No original export implied by safe preview; byte corrections request new package, semantic corrections do not.

<a id="v-rag-051"></a>

### V-RAG-051 — Vietnamese search, evidence and lifecycle UI

Owner [RAG-051](tickets/RAG-051.md);planned result **not_executed**. Future files: `web/src/test/rag-051.test.tsx`, `web/tests/e2e/rag-051.spec.ts`.

- Vitest/RTL: wrong literal source/astral span/stale fact/profile 409 and permissions switched during fetch.
- Denied/nonexistent targets show same unavailable state, no hidden titles/names/counts.
- Delete503deny_durable is access-blocked pending reconciliation, never claimed successful tombstone/instant erasure.

<a id="v-rag-052"></a>

### V-RAG-052 — Real browser journeys and existing-demo regressions

Owner [RAG-052](tickets/RAG-052.md);planned result **not_executed**. Future files: `web/src/test/rag-052.test.tsx`, `web/tests/e2e/rag-052.spec.ts`.

- CP8 real journeys and controls perform meaningful actions with Vietnamese labels/errors.
- Enterprise identity/content never flows into Node/demo/OpenRouter or existing localStorage.
- Report executed project/browser/count/exit codes; discovery and old demo tests are not enterprise runtime passes.

<a id="v-rag-053"></a>

### V-RAG-053 — Deployment, observability, updates and operator runbooks

Owner [RAG-053](tickets/RAG-053.md);planned result **not_executed**. Future files: `tests/unit/test_rag_053.py`, `tests/integration/test_rag_053.py`, `tests/security/test_rag_053.py`.

- ST18/ST19: canary error/log/cache/report scan and actual egress denial, second-process/reload/sidecar bypass probes.
- Asset/compiler/tokenizer/schema upgrade invalidates profile/evaluation as specified and cannot revive deletes.
- No deployment execution or audience grant inferred from manifests; CP9 requires owner sign-off.

<a id="v-rag-054"></a>

### V-RAG-054 — Actual-role SQL scale, churn and latency qualification

Owner [RAG-054](tickets/RAG-054.md);planned result **not_executed**. Future files: `tests/unit/test_rag_054.py`, `tests/integration/test_rag_054.py`, `tests/security/test_rag_054.py`.

- T12/I18: unrelated positive-source churn preserves valid dependency tuples;negative completeness becomes stale.
- No query crosses rights on optimization,denied added/deleted rows cannot change exact authorized ranking.
- Capacity review triggers100k authorized chunks/70%memory/disk70%/p95>2 s/queue>30 min; ANN/new engine stays off until separate approval/oracle proof.

<a id="v-rag-055"></a>

### V-RAG-055 — Long intake, reviewer capacity and recovery operating drills

Owner [RAG-055](tickets/RAG-055.md);planned result **not_executed**. Future files: `tests/unit/test_rag_055.py`, `tests/integration/test_rag_055.py`, `tests/security/test_rag_055.py`.

- T11/T14/ST21: one-page scratch,cumulative2700 s,max4 failures,fair progress and honest review-only long formats.
- Zero missed planted critical errors,≥99%adjudicated on established slices; sparse evidence retains double review.
- Online purge24 h/backup35 d and≤120slease reclaim measured subject to approved hold/records policy.

<a id="v-rag-056"></a>

### V-RAG-056 — Representative acceptance, independent review and release packet

Owner [RAG-056](tickets/RAG-056.md);planned result **not_executed**. Future files: `tests/unit/test_rag_056.py`, `tests/integration/test_rag_056.py`, `tests/security/test_rag_056.py`.

- No leak/security failure can be traded for aggregate relevance; absent optional model does not block qualified baseline.
- Critical rule95%upper error≤.5%per promoted slice or automation disabled;unsupported/sparse scope explicitly unestablished.
- Real data/identity/records/assets/runtime/browser evidence and owner approvals all verified before production recommendation.

<a id="v-rag-057"></a>

### V-RAG-057 — Synthetic-only legacy lineage and offset converter

Owner [RAG-057](tickets/RAG-057.md);planned result **not_executed**. Future files: `tests/unit/test_rag_057.py`, `tests/integration/test_rag_057.py`, `tests/security/test_rag_057.py`.

- Surrogate-interior/stale hash/missing source/ambiguous amendment mapping rejects/quarantines.
- No workbook paths/provider route used and no old citation retarget.
- Dry-run report and independent lifecycle/permission review before one-time import.

<a id="v-rag-058"></a>

### V-RAG-058 — Bounded local cross-encoder E04 comparison

Owner [RAG-058](tickets/RAG-058.md);planned result **not_executed**. Future files: `tests/unit/test_rag_058.py`, `tests/integration/test_rag_058.py`, `tests/security/test_rag_058.py`.

- E04 same pool/inputs and no source/ACL failures;unknown score is never support probability.
- ST03/ST04 inputs remain authorized and delete/revoke during ranking discards.
- Missing assets/resources/results leaves reranker=none.

<a id="v-rag-059"></a>

### V-RAG-059 — Embedding challenger and quantization E06 comparison

Owner [RAG-059](tickets/RAG-059.md);planned result **not_executed**. Future files: `tests/unit/test_rag_059.py`, `tests/integration/test_rag_059.py`, `tests/security/test_rag_059.py`.

- E06/T04 full corpus rebuild/cutover/delete/rollback;quantization changes immutable space identity.
- No fake q8 parity from injected arrays;actual local assets/inference required.
- Missing challenger leaves E5 baseline and is not a universal gate.

<a id="v-rag-060"></a>

### V-RAG-060 — Specialist OCR or VLM hard-subset E10 experiment

Owner [RAG-060](tickets/RAG-060.md);planned result **not_executed**. Future files: `tests/unit/test_rag_060.py`, `tests/integration/test_rag_060.py`, `tests/security/test_rag_060.py`.

- E10/ST19 no egress or model download;output cannot alter canonical truth unreviewed.
- All accepted proposed facts have exact physical source and semantic decisions.
- Unqualified asset/geometry keeps conventional path/review.

<a id="v-rag-061"></a>

### V-RAG-061 — Learned type and bilingual NER E08 E11 evaluation

Owner [RAG-061](tickets/RAG-061.md);planned result **not_executed**. Future files: `tests/unit/test_rag_061.py`, `tests/integration/test_rag_061.py`, `tests/security/test_rag_061.py`.

- E08/E11: unknown/conflicting templates,English-only VI failure and decomposed-name span negatives.
- Current semantic/source permissions still gate accepted links and facts.
- Missing neural assets do not block rule+review baseline.

<a id="v-rag-062"></a>

### V-RAG-062 — Generated context, query expansion and HyDE E12 arms

Owner [RAG-062](tickets/RAG-062.md);planned result **not_executed**. Future files: `tests/unit/test_rag_062.py`, `tests/integration/test_rag_062.py`, `tests/security/test_rag_062.py`.

- E12/ST09 retraction makes semantic-derived projection immediately unavailable;cannot silently omit eligible sources.
- No approved model means not_executed;literal baseline remains active.
- No hidden repair model/external retry/tool loop.

<a id="v-rag-063"></a>

### V-RAG-063 — Near duplicates and OCR identifier E13 variants

Owner [RAG-063](tickets/RAG-063.md);planned result **not_executed**. Future files: `tests/unit/test_rag_063.py`, `tests/integration/test_rag_063.py`, `tests/security/test_rag_063.py`.

- E13: O/0,I/1,leading zeros,punctuation,shared names and independent identical uploads.
- Denied duplicate cannot leak global upload existence or change allowed rank.
- No silent legal replacement or source hash mutation.

<a id="v-rag-064"></a>

### V-RAG-064 — Local listwise E14 comparison after cross-encoder

Owner [RAG-064](tickets/RAG-064.md);planned result **not_executed**. Future files: `tests/unit/test_rag_064.py`, `tests/integration/test_rag_064.py`, `tests/security/test_rag_064.py`.

- E14 permutation sensitivity and fabricated/dropped candidate IDs reject.
- Retraction/revocation/delete during ranking still blocks final release.
- No measured need/approved assets→not_executed.

<a id="v-rag-065"></a>

### V-RAG-065 — Sparse and late-interaction E15 channel qualification

Owner [RAG-065](tickets/RAG-065.md);planned result **not_executed**. Future files: `tests/unit/test_rag_065.py`, `tests/integration/test_rag_065.py`, `tests/security/test_rag_065.py`.

- E15/ST03/ST14 current denied rows never become inputs;delete purges all representations/rollback roots.
- English-only checkpoint cannot establish Vietnamese quality.
- New channel cannot add votes per alias or bypass global 120pool.

<a id="v-rag-066"></a>

### V-RAG-066 — Local answer, NLI and risk E16 qualification

Owner [RAG-066](tickets/RAG-066.md);planned result **not_executed**. Future files: `tests/unit/test_rag_066.py`, `tests/integration/test_rag_066.py`, `tests/security/test_rag_066.py`.

- E16/T13/ST09 unrelated resolvable citations,number/currency/date/party/negation/conditions and hypothetical sources.
- Probability requires matching calibration manifest;raw logits/RRF never calibrated support.
- No external judge/API or whole-workbook/history input.

<a id="v-rag-067"></a>

### V-RAG-067 — Late chunking E17 compatible-encoder arm

Owner [RAG-067](tickets/RAG-067.md);planned result **not_executed**. Future files: `tests/unit/test_rag_067.py`, `tests/integration/test_rag_067.py`, `tests/security/test_rag_067.py`.

- E17/ST03/ST14 all projection inputs and returned sources remain authorized and purgeable.
- No compatible model/task/resources means disabled;no unsupported superiority claim.
- Lost qualifier/party/date/geometry or hallucinated summary cannot become accepted fact.

<a id="v-rag-068"></a>

### V-RAG-068 — Visual page retrieval E17 arm

Owner [RAG-068](tickets/RAG-068.md);planned result **not_executed**. Future files: `tests/unit/test_rag_068.py`, `tests/integration/test_rag_068.py`, `tests/security/test_rag_068.py`.

- E17/ST03/ST14 all projection inputs and returned sources remain authorized and purgeable.
- No compatible model/task/resources means disabled;no unsupported superiority claim.
- Lost qualifier/party/date/geometry or hallucinated summary cannot become accepted fact.

<a id="v-rag-069"></a>

### V-RAG-069 — RAPTOR overview E17 arm

Owner [RAG-069](tickets/RAG-069.md);planned result **not_executed**. Future files: `tests/unit/test_rag_069.py`, `tests/integration/test_rag_069.py`, `tests/security/test_rag_069.py`.

- E17/ST03/ST14 all projection inputs and returned sources remain authorized and purgeable.
- No compatible model/task/resources means disabled;no unsupported superiority claim.
- Lost qualifier/party/date/geometry or hallucinated summary cannot become accepted fact.

<a id="v-rag-070"></a>

### V-RAG-070 — Proposition retrieval E17 arm

Owner [RAG-070](tickets/RAG-070.md);planned result **not_executed**. Future files: `tests/unit/test_rag_070.py`, `tests/integration/test_rag_070.py`, `tests/security/test_rag_070.py`.

- E17/ST03/ST14 all projection inputs and returned sources remain authorized and purgeable.
- No compatible model/task/resources means disabled;no unsupported superiority claim.
- Lost qualifier/party/date/geometry or hallucinated summary cannot become accepted fact.
