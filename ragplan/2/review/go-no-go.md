# Implementation readiness verdict

Date: 2026-11-16.

**NO-GO** for implementing the current blueprint unchanged as the permanent enterprise schema/API/security design. The reason is a set of concrete workflow and identity incompatibilities plus unresolved security failure semantics. It is not merely that implementation benchmarks have not yet been run.

The underlying Python/PostgreSQL/private-storage/local-OCR stack remains defensible. Recommend the [corrected hybrid architecture](alternative-architecture.md), preserving its useful evidence and isolation design. A wholesale RAG-stack replacement is not justified.

## Ten highest-priority findings

Priority reflects impact and later rework, not just severity. D = confirmed contract defect/omission; R = credible unverified runtime risk. Detailed evidence, root cause, probability/confidence, alternatives, cost and tests appear in [the complete findings](hostile-review.md).

| Priority | ID / severity / class | Required correction |
| --- | --- | --- |
| 1 | HR01 / High / D | Add a separate staged-review read contract. The published-only resolver cannot expose the source needed to approve a first publication. |
| 2 | HR02 / High / D | Separate replacement source versions from co-applicable original/amendment/appendix evidence. One active source cannot answer unchanged original terms plus amended terms. |
| 3 | HR03 / Critical / R | Resolve dispatch after DB-session lock loss and time-based grant expiry. A DB advisory lock does not by itself fence the independent HTTP transport. |
| 4 | HR04 / High / D | Define a corpus serving profile or explicit multi-space query protocol for online embedding migration; per-document switches are insufficient. |
| 5 | HR06 / High / D | Bind accepted facts, links and applicability to semantic revisions/current rechecks; unchanged source hashes do not detect a retracted fact. |
| 6 | HR05 / High / R | Specify current live visibility of external deletion deny intents during journal/SQL partial failure, across processes and restart. |
| 7 | HR10 / High / R | Make active semantic/source dependencies explicit retention roots before superseded GC can destroy needed evidence. |
| 8 | HR11 / High / R | Specify and validate page streaming, cumulative attempt budgets and fairness for 200-page scans within temp/time limits. |
| 9 | HR12 / High / R | Measure actual-role RLS/dependency query cost, corpus churn and connection contention before accepting exact-search capacity. |
| 10 | HR07 / Medium / D | Reconcile canonical Unicode/control acceptance with PostgreSQL text/JSONB, including NUL and surrogate rejection/mapping. |

Other substantiated corrections: HR08 candidate/packing/top_k semantics, HR09 natural-language FTS compiler, HR13 alternative sufficient gold bundles and coverage gates, HR14 reviewer accuracy/backlog capacity. These are not reasons to add a larger model by default.

## Critical changes and choices to reconsider

Before durable schema/API freeze, approve explicit contracts for staged review, legal applicability, semantic acceptance and corpus serving. Define the policy/journal/transport failure model and retention roots. Preserve immutable originals, canonical structure, PDF/OOXML provenance, tenant ownership and job fencing.

Reconsider RRF60 only through controlled fusion comparisons; compare genuine scoped BM25 with a fully specified FTS compiler; test VI folding/segmentation and actual E5 VI/EN/cross-language quality; compare deduplication/MMR using complete evidence, not diversity alone. Optional cross-encoder/BGE/VLM/sparse/listwise/HyDE techniques require task-specific quality/resource evidence before promotion. None fixes the missing source/security state contracts.

Missing decisive evidence includes unpublished-review SQL policy, partial-amendment current search, same-dimension online encoder migration, semantic retraction races, DB-session-loss dispatch, live journal/SQL split, active-dependency GC, canonical-to-SQL edge cases, 200-page mixed-load working set, actual-role query plans, reviewer workload/error and realistic bilingual held-out gold. Final browser journeys and recovery drills belong to implementation/release acceptance, not a demand to produce the finished system before coding it.

Later rework is largest for legal source identity, policy boundaries, serving/semantic snapshots and evidence irreversibly lost by GC. Fixing those after persistence can require schema migration, reindexing, changed history grants, repaired citations and reaccepted facts. Query compiler/fusion/reranker choices are mostly replaceable adapters if canonical evidence and profile versioning remain intact.

## Exact conditions for approving implementation

1. **Contract closure:** approve the concrete G1 changes in [required changes](required-changes.md) and materialize consistent strict schemas/API/SQL specifications. Resolve HR01/HR02/HR04/HR06 before dependent permanent schema/API freeze; define HR07/HR08/HR09/HR10 semantics before their consumers are accepted. A proposal that explicitly narrows an affected feature can qualify if it still matches approved product scope.
2. **Security protocol closure:** choose and document G2's dispatch/journal failure model, process topology, expiration semantics and fail-closed recovery. Demonstrate the minimal T03/T05 fault cases before confidential exposure or a strict revocation/deletion claim. Any reduction to bounded revocation requires explicit approval of the changed guarantee; it is not presumed.
3. **Preserved boundaries:** retain the existing application authority/shared business data, synthetic fixtures, imported-workspace AI deny, no SAP APIs, local enterprise inference only, no confidential localStorage, and no browser identity bypass. Confirm existing A01 service/scope and A02a tenant assumptions before making them permanent; attach other approvals to their actual integrations.
4. **Executable validation commitment:** implement G3–G5 gates alongside components with named owners and supported-scope criteria. Actual RLS/sandbox/journal/model behavior cannot be replaced by fixture success. Produce quality/capacity/security/browser evidence before each corresponding promotion, with blocked/not-executed results explicit. Optional disabled models do not need results to release a qualified baseline.

Changing the architecture-freeze verdict does not require every final benchmark in advance. It requires the conflicting contracts to be resolved and the security semantics to have an implementable, falsifiable design. Production acceptance still requires actual implementation, applicable organizational approvals and executed G2–G5 evidence.

## What may proceed now

Isolated synthetic contract generation and focused review-policy, source-applicability, encoder-serving, semantic-retraction, SQL/job/journal/dispatch fault experiments can proceed when implementation is separately requested. No imported data, external inference, deployment or production-code change is authorized by this review. Independent safe work need not wait for an unrelated optional model experiment.

## Evidence from this review

All seven requested review documents were created. Original plans and production code were preserved. Existing `npm run test:rag` executed successfully: **46 tests in 2 files**, exit 0. The supporting [evidence checker](evidence-check.py) and [result record](evidence-results.json) reproduce finite synthetic contract counterexamples and arithmetic and verify document/source integrity. They are not enterprise integration, OCR/model benchmarks or a penetration test. Playwright and enterprise runtime tests were not executed because no UI or enterprise implementation was changed.

**Final verdict: NO-GO for the unchanged blueprint; proceed with targeted contract corrections and isolated synthetic validation, then reassess the affected implementation gates.**
