# Task — Consolidate RAG Architecture Into One Authoritative Implementation Blueprint

Read all documents under `ragplan/`, including the original plans, hostile reviews, reconciliation documents, and latest re-review.

Create a single authoritative implementation specification at:

`ragplan/FINAL_IMPLEMENTATION_SPEC.md`

Your job is to consolidate, not redesign.

Requirements:

1. Incorporate all accepted corrections from the reconciliation and latest hostile re-review.
2. Resolve contradictions using the latest explicitly approved decisions. Never silently choose between unresolved alternatives.
3. Include the complete architecture, algorithms, data models, APIs, security boundaries, ingestion pipeline, retrieval pipeline, failure handling, and deployment assumptions.
4. Include implementation phases, dependencies, acceptance criteria, and test requirements.
5. Preserve important edge cases, especially revocation during database failure, amendments, deletion races, embedding migration, and semantic fact updates.
6. Distinguish mandatory requirements from optional optimizations and deferred features.
7. Include exact invariants and implementation-ready contracts, not just high-level descriptions.
8. Add traceability references to the original documents for significant decisions.
9. Identify any remaining blockers or approvals that must be resolved before their affected phases.
10. Check the consolidated specification for omissions, contradictions, ambiguous interfaces, and invalid examples.

Do not modify production code or delete historical planning documents.

Create `ragplan/IMPLEMENTATION_README.md` explaining which document is authoritative and how developers should use it.

**The final specification must be sufficiently complete that a fresh Codex session can implement the system without needing to interpret conflicting historical plans.**

If essential details cannot be consolidated without making new decisions, report them explicitly instead of inventing answers.

Finish with a completeness assessment and GO/NO-GO for staged implementation.
