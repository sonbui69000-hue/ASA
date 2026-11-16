# Enterprise RAG implementation roadmap

This roadmap turns the approved contract 2.2.0 into **70 implementation tickets: 56 baseline tickets and 14 disabled optional tickets**. It contains 812 source requirement units, each mapped to owners, tickets, planned verification, dependencies and status. It creates no production code and records no runtime pass or owner approval.

[FINAL_IMPLEMENTATION_SPEC.md](../FINAL_IMPLEMENTATION_SPEC.md) is the sole architectural authority. This directory governs implementation sequencing and evidence, without changing that specification. Current user instructions and repository [AGENTS.md](../../AGENTS.md) govern authorization/data handling. Historical plans, hostile reviews and reconciliation under `ragplan/2/` provide rationale and regression witnesses; their superseded alternatives are not implementation choices. [IMPLEMENTATION_README.md](../IMPLEMENTATION_README.md) remains the specification entry point.

1. Read the specification's authority, C01–C16, S01–S09, invariants and approvals, then [module-boundaries.md](module-boundaries.md) and the assigned ticket.
2. Use [dependency-graph.md](dependency-graph.md) and [phases.md](phases.md) to select a ready ticket. Implementation requires a separately authorized coding task. Disposable synthetic experiments can use recorded provisional assumptions; permanent dependent integration still needs its approvals.
3. Read every assigned source clause in [requirements-matrix.md](requirements-matrix.md). Units are paragraphs/list items/table rows/examples, with all conjunctive obligations retained. The 812 count is not an artificial count of atomic sentences.
4. Implement only the ticket; use [verification-strategy.md](verification-strategy.md) to create meaningful tests and collect actual evidence. Future Python/frontend paths and commands are proposed targets, not existing harnesses or passing tests.
5. Follow [codex-workflow.md](codex-workflow.md) for handoff, independent review and change control. Update [progress.md](progress.md) only with evidence. Keep blocked, failed and unexecuted checks explicit.

The current repository is a React 19/TypeScript 6/Vite 8/Tailwind 4 prototype with Node services, Zod schemas, Vitest/RTL and Playwright. The offline store uses localStorage; the online business authority uses local JSON. Existing `server/rag/` uses demo document state, UTF16 citations, its own BM25-like retrieval and optional ONNX adapter. That code supplies context and regression obligations; it does not implement the proposed enterprise Python/OIDC/PostgreSQL/RLS/worker/journal/transport boundaries. No `services/enterprise-rag/` application/harness exists at this planning baseline. Exact installed package versions and model/runtime readiness have not been certified by reading manifests.

Preserve the four administrative modules and the imported workspace. Enterprise content uses a separate origin/session/authority/private persistence and local-only inference, with no provider credential/transport route. Do not inspect, copy, reset or seed from the real uniform/locker workbooks. Synthetic fixtures and reports only; no real SAP; Vietnamese UI/errors; every button works. Enterprise content/tokens/responses never persist in browser localStorage/service-worker caches. Mock RBAC is not real security.

The first implementation assignments are [RAG-001](tickets/RAG-001.md), followed by [RAG-002](tickets/RAG-002.md), [RAG-003](tickets/RAG-003.md) and [RAG-004](tickets/RAG-004.md). Contracts/API/DDL/evaluator foundations then unlock actual-role identity and early transport/journal spikes. Do not start an unguarded search route while waiting for later lifecycle work. Sealed migrations 0001–0007 and the minimum review/semantic/profile/publication/dispatch/journal/deny/root controls precede CP3. Staged serving also waits for the authority kernel; trusted fact acceptance waits for both semantic-review routes. Full P07 automation extends those controls.

No approval is recorded for A01(service), A02a(tenant), A03(review/family/records), A09(singleton/failure/expiry/manual-recovery). These block permanent dependent freeze, not completion of this roadmap or isolated synthetic learning. Live IdP A02b, representative data A04, environment A05, exact assets A06 and utility/review A10/A11 attach to their consumers. Optional A07 import/A08 synthesis do not block the baseline. Concrete gate ownership and stop conditions are in [progress.md](progress.md#decision-and-evidence-register).

Run the maintained **documentation integrity** audit from repository root:

```bash
python3 ragplan/implementation/verify-plan.py
```

It verifies source preservation/coverage, bidirectional mappings, local links/anchors, ticket structure, DAG and regression inventories. It does not validate the future enterprise API, RLS, fsync, transport, OCR, model quality, browser behavior or production readiness. [audit-results.json](audit-results.json) records only this planning audit. [plan-data.json](plan-data.json) is the machine-readable source-unit/ticket/test metadata companion; reconcile it and Markdown together when a contract changes.

The plan preserves synthetic prototyping GO, staged implementation CONDITIONAL GO and confidential/production NO-GO until the specification's actual gates. There is no new general design blocker identified by this decomposition. Concrete subordinate wire catalogs, transport adapter feasibility, physical journal/anchor/key selection and owner decisions remain explicitly bounded work. Ticket size risks and executed audit limits appear in [progress.md](progress.md#final-planning-audit).
