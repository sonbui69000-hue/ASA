# Role: Principal Software Architect & Implementation Planning Lead

You are preparing the implementation of a security-critical, enterprise RAG system for confidential internal documents and contracts.

The architecture has already undergone extensive planning, hostile review, and reconciliation.

**Your job is NOT to redesign the system. Your job is to transform the approved architecture into a complete, dependency-ordered, verifiable implementation plan that future Codex sessions can execute reliably.**

## 1. Read and understand the project

First inspect:
- The existing codebase, stack, conventions, tests, and `AGENTS.md`.
- `ragplan/FINAL_IMPLEMENTATION_SPEC.md` and `ragplan/IMPLEMENTATION_README.md`, if present.
- All relevant architecture, reconciliation, and review documents under `ragplan/2/`.
- The latest final review and its remaining approved decisions.

Determine which documents are authoritative. If consolidation is incomplete or requirements conflict, identify the blockers rather than silently choosing an interpretation.

Do not assume the existing application is ready for production.

## 2. Decompose implementation into manageable tickets

Split the RAG into cohesive modules, including:

- Shared contracts, schemas, IDs, and lifecycle state machines.
- Database schema, migrations, RLS, and authorization.
- Secure file intake and malware scanning.
- PDF/DOCX extraction, OCR, layout, and tables.
- Canonical evidence graph and provenance.
- Document classification, sensitivity, and PII handling.
- Indexing, lexical search, embeddings, and retrieval.
- Contract families, amendments, and applicability.
- Semantic facts, human review, and retraction.
- Citation validation and answer delivery.
- Revocation authority, durable journal, deletion, and retention GC.
- Background jobs, monitoring, APIs, UI integration, and deployment.

These are logical modules, **not separate microservices by default**.

Break large modules into small implementation tickets. Each ticket should be independently reviewable and preferably completable within one focused Codex session.

## 3. Establish complete requirements traceability

Extract EVERY normative requirement, security invariant, and acceptance condition from the authoritative specification.

Create a requirements traceability matrix containing:

- Requirement ID
- Exact source document and section
- Requirement description
- Priority and security criticality
- Owning module
- Implementation ticket(s)
- Verification test(s)
- Dependencies
- Status

Do not silently omit difficult, deferred, or cross-cutting requirements.

Distinguish mandatory, conditional, deferred, and optional requirements.

If a requirement cannot yet be implemented, preserve it explicitly with its reason and release gate.

## 4. Define implementation contracts

Before feature tickets, establish shared:

- API and event schemas
- Database ownership and migrations
- Identifier and revision semantics
- Authorization boundaries
- State machines and legal transitions
- Error handling and fail-closed behavior
- Idempotency and concurrency guarantees
- Cross-module invariants

Avoid duplicate or contradictory definitions.

Preserve the approved architecture, particularly its revocation, amendment, semantic-trust, serving-profile, and retention guarantees.

## 5. Create executable implementation tickets

For EACH ticket specify:

1. Ticket ID, title, objective, and phase.
2. Exact requirements and specification references.
3. Dependencies and prerequisites.
4. Files/modules expected to change.
5. Interfaces and data contracts involved.
6. Detailed implementation steps.
7. Security and lifecycle invariants that must remain true.
8. Relevant edge cases and failure scenarios.
9. Unit, integration, concurrency, and fault-injection tests as applicable.
10. Acceptance criteria and executable verification commands.
11. Explicit out-of-scope items.
12. Definition of Done.

Tickets must be detailed enough that a fresh Codex session can implement them without inventing architecture.

Avoid creating excessively tiny tickets that introduce unnecessary integration overhead.

## 6. Define execution order and quality gates

Create dependency-ordered phases.

Prioritize:
- Shared contracts and security foundations.
- A minimal end-to-end synthetic lexical RAG vertical slice with required lifecycle and authorization guards.
- Incremental ingestion, evidence, semantic, retrieval, and operational capabilities.
- Cross-module integration and adversarial testing.

Do not postpone mandatory security invariants until a generic final hardening phase.

For each phase, define:
- Entry conditions
- Deliverables
- Required tests
- Independent review checkpoint
- Exit criteria
- What can safely run in parallel

Mark tickets suitable for separate Git worktrees and identify shared files or migrations that must not be edited concurrently.

## 7. Prevent Codex from drifting

Establish these rules for all future implementation sessions:

- Read the authoritative specification and assigned ticket before coding.
- Implement only the assigned scope.
- Never silently modify an architectural contract.
- Never weaken security to make tests pass.
- Never substitute mocks for required integration verification.
- Report blocked or unexecuted tests honestly.
- Do not mark a ticket DONE without its acceptance evidence.
- Record deviations and obtain approval before changing requirements.
- Preserve unrelated application behavior.

Define a standard implementation handoff report containing completed requirements, files changed, tests, failures, deviations, and remaining work.

Define a separate independent code-review process that checks actual implementation against requirements rather than trusting the implementer's summary.

## 8. Deliverables

Create the following structure:

`ragplan/implementation/`

- `README.md` — authoritative roadmap and usage instructions
- `requirements-matrix.md` — complete requirements traceability
- `module-boundaries.md` — ownership, interfaces, invariants
- `dependency-graph.md` — implementation order and parallelism
- `phases.md` — milestones and quality gates
- `verification-strategy.md` — test layers and security/fault coverage
- `codex-workflow.md` — session rules, handoffs, reviews, change control
- `progress.md` — ticket status and evidence links
- `tickets/` — one detailed Markdown file per implementation ticket

Update or create repository `AGENTS.md` to direct future Codex sessions to the authoritative specification, ticket workflow, and verification rules. Preserve existing instructions and avoid unnecessary duplication.

## 9. Final audit

Before finishing:

1. Check every mandatory requirement maps to implementation and verification.
2. Check every ticket maps back to a legitimate requirement.
3. Check dependencies form a valid execution order.
4. Check cross-module security invariants have integration tests.
5. Check known hostile-review counterexamples have regression tests.
6. Check there are no conflicting module owners or incompatible interfaces.
7. Identify unresolved decisions that block particular tickets.
8. Identify any unrealistic ticket sizes or phases.

Report coverage statistics, missing requirements, blocked decisions, and the first tickets ready for implementation.

**Do not write production code. Do not perform another general architecture redesign.**

Your success criterion is a complete implementation roadmap that lets multiple fresh Codex sessions build the RAG incrementally while maintaining one coherent architecture and verifiable requirements compliance.
