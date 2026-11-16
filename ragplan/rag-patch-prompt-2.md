# Task — Fix Final RAG Re-Review Findings

Read `ragplan/2/review/re-review.md`, the latest architecture documents, and `ragplan/2/reconciliation/`.

The independent reviewer found **10 resolved and 4 partially resolved original findings**, plus two minor wording conflicts. Architecture freeze remains NO-GO.

Your task is to resolve **RR01–RR05** with precise, implementation-ready corrections.

## Required fixes

**RR01 — Published fact retraction**
- Add an authorized review/correction route for already-published extractions.
- Support fact retraction, entity-link correction and semantic decisions without requiring a staged extraction.
- Preserve revision checks, audit, authorization, epoch invalidation and fail-closed response behavior.
- Resolve the conflict between literal-only sketches and approved entity-ID sketches.

**RR02 — Contract-family membership**
- Bind applicability sets to a specific family-membership revision.
- Account for every known registered family instrument, including pending, excluded, conflicting and future-effective amendments.
- Invalidate or replace applicability decisions atomically when family membership changes.
- Prevent stale applicability claims and unauthorized cross-document answers.

**RR03 — Journal idempotency**
- Separate operation identity from individual journal-record identity.
- Define durable intent and authority-commit records, replay semantics, payload conflicts and crash recovery.
- Ensure retries cannot duplicate mutations, erase denies or lose acknowledged checkpoints.

**RR04 — Retention garbage collection**
- Reconcile GC lifecycle states with the database schema.
- Define narrowly scoped purger permissions for both tombstoned documents and unreachable superseded artifacts.
- Preserve dependency roots, retention holds and concurrent publication safety.

**RR05 — Documentation consistency**
- Move embedding-model prewarming outside the gated cutover.
- Align permission-expiry guarantees with the approved decision-time semantics and stated suspension limitations.

## Execution requirements

1. Verify each finding against the actual contracts before modifying them.
2. Patch all affected `ragplan/2/` architecture, data-contract, security, algorithm, failure-analysis, implementation and readiness documents.
3. Update the reconciliation register, invariants, verification matrix and remaining decisions.
4. Extend T02, T05, T06 and T10 to cover the exact counterexamples from the re-review.
5. Check all related schemas, enums, API payloads, state transitions, authorization predicates and migration dependencies.
6. Preserve existing sound decisions, including the singleton revocation authority, corpus serving profiles and evidence graph.
7. Do not introduce unnecessary infrastructure or redesign unrelated components.
8. Do not modify production code or overwrite independent review reports.

## Final validation

Perform a cross-document consistency audit and validate examples where feasible.

For each RR01–RR05, report:
- Exact files and contracts changed
- How the original counterexample is now prevented
- Remaining assumptions and runtime tests
- Whether the issue is **RESOLVED**, **PARTIAL**, or **UNRESOLVED**

Separate pending owner approvals from architectural defects. Do not claim runtime guarantees have been tested merely because the documentation is consistent.

Finish with updated GO/CONDITIONAL GO/NO-GO verdicts for architecture freeze, synthetic prototyping, staged implementation and production deployment.

**Goal: Close the remaining design contradictions so the architecture can be consolidated and implementation can begin. Do not start coding.**
