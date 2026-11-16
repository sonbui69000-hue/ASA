# Enterprise RAG design review, revision 2.2 final corrections

Design date and readiness reassessment: 2026-11-16. Repository baseline: `f01a2af`. This package executes [revision-2 request](rag-plan-prompt-2.md) and the subsequent request for stage-specific blocker classification. It contains design specifications, synthetic examples and design validation; it changes no production code.

Readiness: **CONDITIONAL GO for architecture approval and staged implementation; GO for isolated synthetic prototyping; NO-GO for confidential-data integration and production deployment**. Conditions include service/tenant/staged-review authority, A09 single-egress/no-HA envelope, and strict P00 materialization; RR01–RR05 from the independent re-review now have explicit corrected contracts; evidence/operational gates attach to their consumers. Missing benchmarks belong to the implementation/validation phases that produce them. These verdicts are engineering recommendations, not recorded user approval or authorization to start code in this documentation-only task.

Read in this order:

1. [Architecture audit and final architecture](rag-architecture-review.md)
2. [Algorithm decisions and independent technique discovery](rag-algorithm-decisions.md)
3. [Normative data, API and lifecycle contracts](rag-data-contracts.md)
4. [Security boundaries and threat controls](rag-security-design.md)
5. [Evaluation design and ablations](rag-evaluation-plan.md)
6. [Twelve end-to-end walkthroughs and adversarial review](rag-failure-analysis.md)
7. [Ordered implementation blueprint and approval gates](rag-implementation-plan.md)
8. [Stage-specific readiness and complete blocker classification](rag-readiness-assessment.md)

[Research sources](research-sources.md) distinguish externally documented capabilities from project recommendations. [Verification](verification.md) records only checks actually executed for this documentation task.

Revision 2 supersedes conflicting implementation advice in `ragplan/1`; that package remains unchanged as historical evidence. Its JSON Schema 1.0.0 is **not** a validator for the reconciled 2.2.0 contracts. The existing Node demo and its prior reports remain separate from the proposed enterprise document service. Historical test counts are not new test results.

Recommended architecture: preserve the existing business demo; introduce an isolated Python document service and durable worker, private immutable artifacts, application-owned layout/evidence representation, PostgreSQL with RLS and pgvector, local native/OCR extraction, multilingual E5 dense plus lexical/exact retrieval, deterministic fusion, authorized parent/table expansion and evidence-first answers. All enterprise content stays local. The imported workbook workspace remains blocked from OpenRouter.

The consolidated approval packet is [A01–A11](reconciliation/remaining-decisions.md), retaining the original A01–A08 and adding singleton failure envelope, utility coverage and review-capacity decisions. A01/A02a/A03/A09 precede permanent dependent service/schema/security freeze. Live identity, records/residency, real-corpus authorization, operating resources and exact asset reviews gate their affected integrations/exposures. Migration and free-form synthesis remain optional; preserving the existing workspace and its AI deny is already required. The readiness register classifies all residual items by exact missing decision/evidence, resolution, affected phase and planning-versus-execution requirement. No approval to code, deploy, call a paid API or process additional real records is inferred from this planning request.

Reconciliation readout: [HR01–HR14 dispositions](reconciliation/finding-disposition.md), [changelog](reconciliation/architecture-changelog.md), [exact invariants](reconciliation/revised-invariants.md), [test/phase matrix](reconciliation/verification-matrix.md), [remaining owner decisions](reconciliation/remaining-decisions.md). The unchanged `review/` contains both the original audit and the2.1 re-review; their NO-GO verdicts remain evidence for those reviewed blueprints. The2.2 normative files incorporate RR01–RR05 and supersede conflicting2.0/2.1 advice without overwriting the independent reports. C11–C16 add staged packages, legal applicability, corpus serving, semantic epochs, deterministic query budgets and journal/retention/operational contracts. No production code was modified.

Final patch: [RR01–RR05 status, exact file/contract changes and acceptance limits](reconciliation/final-corrections.md). Published-review route, complete family membership binding, typed journal idempotency/recovery and claim-scoped GC close the remaining design contradictions. Owner approvals and actual runtime control/quality/operations tests remain separate pending gates.
