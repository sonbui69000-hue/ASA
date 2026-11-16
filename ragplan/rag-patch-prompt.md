# Task — Reconcile Hostile Review and Patch RAG Architecture Before Implementation

Act as a Principal Enterprise Architect, Security Architect, Distributed Systems Engineer, and Senior Information Retrieval Engineer.

The independent hostile review has completed and issued:

**NO-GO for implementing the current blueprint unchanged.**

Your task is to **repair the architecture, data contracts, security design, evaluation plan, and implementation blueprint** so that the identified defects are resolved before production engineering begins.

This is an architecture reconciliation task, NOT an implementation task.

## 1. Read all relevant sources

Read:

- All original RAG proposals and technology decisions
- All `ragplan/2/*.md` documents
- All `ragplan/2/review/*.md` documents
- `ragplan/2/review/evidence-results.json`, if available
- Relevant existing application architecture and integration contracts

Treat the hostile review as independent evidence, not unquestionable authority.

For every finding, verify the evidence and determine whether the proposed correction is sufficient.

Do not dismiss a finding merely because the original plan describes an intended safeguard.

Do not accept a finding without examining its technical reasoning.

## 2. Reconcile all 14 hostile-review findings

Address HR01–HR14 individually.

For each finding:

1. Restate the actual defect or risk.
2. Identify the precise contradiction or missing contract.
3. Identify all affected documents and interfaces.
4. Evaluate the reviewer's proposed correction.
5. Select the simplest defensible solution.
6. Explain why it works.
7. Define implementation-ready data/API/security contracts.
8. Identify migration or compatibility implications.
9. Define deterministic tests or executable acceptance criteria.
10. Record whether the issue is resolved, mitigated, deferred with explicit constraints, or still blocking.

Prioritize architectural defects and expensive-to-reverse decisions.

Do not treat every performance risk or unexecuted benchmark as an architectural blocker.

## 3. Mandatory high-priority corrections

### HR01 — Unpublished-document review access

Separate staged-review authorization from published evidence retrieval.

Define:
- Who can inspect unpublished documents
- How reviewer/custodian authority is established
- Exact extraction/revision identity
- Safe-preview and malware-scan prerequisites
- Review-package APIs
- Audit requirements
- RLS and service-layer enforcement

Ordinary search must never expose unpublished content.

### HR02 — Contract amendments and legal applicability

Fix the assumption that a single active source version represents the entire currently applicable contract.

Define:
- Contract family identity
- Original contract, amendment, appendix and replacement relationships
- Independent source releases
- Effective dates and applicability
- Clause-level supersession or supplementation
- Conflicting amendments
- Reviewer-approved applicability decisions
- Cross-document authorization
- Citation reconstruction
- Unknown/ambiguous applicability behavior

Preserve unchanged original clauses when an amendment modifies only part of a contract.

Do not infer legal precedence solely from upload order.

### HR03 — Revocation under database/session failure

Reevaluate the claimed permission-revocation guarantee.

Explicitly model:
- Database connection loss
- Lost advisory locks
- HTTP response already authorized but not dispatched
- Revocation committed by another process
- In-flight responses
- Cached authorization
- Failover and slow clients

Choose and document one enforceable revocation consistency model.

Options may include:
- Strict dispatch fencing with an independently enforceable permit protocol
- Bounded authorization leases with explicitly approved revocation delay
- A narrower deployment/failure envelope with fail-closed behavior

Do not claim immediate global revocation if the architecture cannot guarantee it.

Define the exact meaning of revocation acknowledgement and its relationship to response dispatch.

Distinguish prevention of new sends from recalling already transmitted bytes.

### HR04 — Corpus-wide embedding migration

Define a corpus-level serving profile.

Specify:
- Embedding model and revision identity
- Vector-space compatibility
- Query encoder routing
- Shadow indexing
- Completeness validation
- Atomic serving-profile switching
- Concurrent ingestion, deletion and publication
- Rollback
- Handling partially migrated documents
- Memory and latency constraints

Never silently omit eligible documents because their active embeddings use another vector space.

### HR05 — Deletion deny-journal consistency

Define:
- Authoritative journal storage
- Durable append and acknowledgement
- Reader visibility guarantees
- Cross-process consistency
- Restart reconciliation
- Corruption/gap handling
- SQL transaction failure behavior
- Fail-closed lookup behavior

A deletion intent must not become invisible to another serving process merely because SQL commit failed.

If the pilot has a single-process deployment constraint, state and enforce it explicitly.

### HR06 — Semantic fact and relationship revisions

Define:
- Immutable semantic decision revisions or monotonic semantic epochs
- Accepted fact snapshots
- Entity-link and applicability revisions
- Retractions and corrections
- Cache invalidation
- Publication coupling
- Final response validation

A response must not present a retracted fact as trusted simply because its original document bytes are unchanged.

### HR10 — Retention and dependency integrity

Define:
- Active semantic dependencies as retention roots
- Evidence/artifact dependency traversal
- Garbage-collection eligibility
- Concurrent publication and cleanup
- Explicit deletion versus retention hold
- Safe invalidation when evidence becomes unavailable

Never leave published facts or citations pointing to irretrievably purged evidence.

## 4. Resolve remaining findings

Address:

- HR07: Canonical Unicode/PostgreSQL compatibility
- HR08: Candidate allocation across query slots
- HR09: Vietnamese/English lexical query compilation
- HR11: Long scanned-document resource limits and queue fairness
- HR12: Authorization query performance and policy churn
- HR13: Alternative sufficient evidence bundles and evaluation coverage
- HR14: Human-review throughput and accuracy

For HR07–HR09 and HR13, resolve underspecified contracts before their dependent implementation phases.

For HR11, HR12 and HR14, distinguish architectural requirements from measurements that require executable prototypes.

Do not invent benchmark results.

## 5. Perform end-to-end consistency checks

Trace the revised architecture through:

Upload → Validation → Extraction → Staged review → Publication → Indexing → Authorization → Retrieval → Evidence expansion → Answer release → Revocation → Deletion → Retention.

Also trace:

- Original contract → Amendment → Applicability decision → Query → Citation
- Embedding model A → Shadow model B → Corpus switch → Rollback
- Fact accepted → Answer buffered → Fact retracted → Response release
- Permission check → Database session lost → Revocation acknowledged → HTTP dispatch
- Deletion intent → SQL failure → Second reader → Restart recovery

For every flow, identify the authoritative state, transaction boundaries, invariants, and failure behavior.

Ensure the revised components can actually interoperate.

## 6. Patch existing planning documents

Update the relevant files under `ragplan/2/`, including:

- `rag-architecture-review.md`
- `rag-algorithm-decisions.md`
- `rag-data-contracts.md`
- `rag-security-design.md`
- `rag-evaluation-plan.md`
- `rag-failure-analysis.md`
- `rag-implementation-plan.md`
- `rag-readiness-assessment.md`

Only modify files where changes are needed.

Preserve sound decisions and previously completed research.

Do not create a parallel architecture that contradicts the original documents.

Update diagrams, schemas, pseudocode, API examples, phase dependencies, tests and approval decisions wherever affected.

Maintain backward consistency across all documents.

## 7. Create reconciliation artifacts

Create:

`ragplan/2/reconciliation/`

With:

- `finding-disposition.md` — HR01–HR14, accepted/rejected/modified, justification and evidence
- `architecture-changelog.md` — What changed and why
- `revised-invariants.md` — Exact security, data and consistency guarantees
- `verification-matrix.md` — Tests mapped to findings and implementation phases
- `remaining-decisions.md` — Decisions requiring my approval, with recommended defaults

Each correction must be traceable from hostile-review finding to modified contract to verification test.

## 8. Prevent overengineering

Preserve the core stack unless evidence justifies changing it.

Prefer:
- Small, well-defined contracts
- Explicit invariants
- Replaceable retrieval algorithms
- Minimal operational dependencies
- CPU-first feasibility
- Clear failure behavior
- Conservative confidentiality handling

Do not introduce Kafka, distributed consensus, additional databases, dedicated vector databases, complex agent frameworks, or new LLM dependencies without demonstrating necessity.

If a strict guarantee requires disproportionate infrastructure, explain the trade-off and recommend a narrower enforceable guarantee for the pilot.

Do not silently weaken security requirements.

## 9. Reassess implementation readiness

After patching, issue separate verdicts for:

1. Architecture approval
2. Synthetic prototyping
3. Staged implementation
4. Confidential-data integration
5. Production deployment

Use GO / CONDITIONAL GO / NO-GO.

Classify remaining items as:
- Confirmed architectural defect
- Security/authority decision requiring approval
- Operational prerequisite
- Executable validation requirement
- Optional improvement

Missing benchmarks should block only the phases that depend on those results.

Do not declare a defect resolved merely because a future test is planned. The design contract itself must be corrected.

## 10. Final validation

Before finishing:

- Verify every HR01–HR14 finding has an explicit disposition.
- Verify cross-document terminology and identifiers.
- Validate example JSON and SQL where feasible.
- Check Markdown links.
- Check implementation phase ordering and prerequisites.
- Identify incompatible or circular dependencies.
- Confirm no production code was modified.
- Clearly distinguish design verification from runtime verification.

Do not rewrite the hostile-review documents; preserve them as the independent audit record.

## Final response

Provide:

1. Findings resolved and how
2. Findings deferred and why
3. Important architectural changes
4. Decisions requiring my approval
5. Remaining implementation blockers
6. Revised readiness verdict
7. Exact files changed
8. Recommended next step for independent re-review

**Do not implement production code.**

Your objective is to produce one internally consistent, implementable blueprint that addresses the hostile review without unnecessarily redesigning the entire system.
