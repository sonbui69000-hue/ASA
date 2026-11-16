# Role

Act as a Principal Enterprise Architect, Senior Information Retrieval Researcher, Document AI Engineer, Security Architect, and Staff Software Engineer.

You are responsible for producing a production-oriented, implementation-ready technical design for an enterprise RAG system handling Vietnamese/English internal documents, scanned PDFs, DOCX files, and confidential contracts.

The repository already contains architecture and implementation proposals, including a technology decision matrix.

**My priority is minimizing expensive implementation rework, even if that requires extensive planning, research, design validation, and documentation upfront.**

Do not write production code yet.

# Phase 1 — Exhaustive Architecture Audit

Read all existing proposals and inspect the repository.

Identify:

- Architectural contradictions
- Missing components or requirements
- Underspecified interfaces
- Security and confidentiality risks
- Data integrity and provenance risks
- Scaling and resource bottlenecks
- Hidden dependencies
- Decisions likely to cause expensive rewrites

Do not accept existing decisions uncritically.

Classify every finding by severity and expected cost of fixing it after implementation.

# Phase 2 — Technical and Algorithm Selection

Evaluate all major algorithm and technology choices, including:

**Document ingestion and understanding**
- Native PDF/DOCX extraction versus OCR versus VLM
- Layout-aware parsing and table reconstruction
- OCR confidence-based routing
- Multi-pass extraction and validation
- Document classification and sensitivity policy
- NER and structured entity extraction
- Entity linking, normalization, and resolution
- Relationship extraction
- Contract clause segmentation
- PII detection, redaction, and pseudonymization
- Cross-document entity resolution

**Chunking and document representation**
- Layout-aware and hierarchical chunking
- Parent-child retrieval
- Contextual chunking and contextual retrieval
- Semantic chunking
- Table-aware retrieval
- Document-level retrieval
- Document deduplication and version tracking

**Retrieval and ranking**
- PostgreSQL lexical retrieval versus BM25 alternatives
- Dense vector retrieval
- Hybrid retrieval and Reciprocal Rank Fusion (RRF)
- Maximal Marginal Relevance (MMR)
- Deterministic deduplication
- Cross-encoder and listwise reranking
- Late-interaction retrieval (ColBERT-style)
- Sparse neural retrieval (SPLADE-style)
- Query expansion and multi-query retrieval
- HyDE (Hypothetical Document Embeddings)
- Query decomposition
- Adaptive retrieval and query routing
- Score calibration and alternative rank fusion
- Metadata filtering and structured entity search
- Multilingual embeddings and cross-language retrieval

**Answer quality and reliability**
- Retrieval confidence and abstention
- Evidence sufficiency checks
- Citation consistency verification
- Contradiction and document-version detection
- Grounded answer generation
- Retrieval evaluation and ablation testing

For each candidate technique:

1. Identify the specific problem or failure mode it addresses.
2. Compare it against viable alternatives and the current proposal.
3. Explain its expected accuracy or retrieval benefit.
4. Evaluate Vietnamese and English compatibility.
5. Assess CPU, RAM, latency, and integration costs.
6. Evaluate security, privacy, and licensing.
7. Assess implementation and maintenance complexity.
8. Explain what would invalidate the recommendation.
9. Identify whether adopting it later would require expensive rework.
10. Recommend: **Implement Now / Design for Later / Experiment / Reject**.

Do not automatically defer techniques because they are sophisticated or computationally expensive.

If including a technique initially is likely to prevent architectural rework or substantially improve quality, recommend implementing it from the start.

Conversely, do not introduce techniques that add complexity without a defensible benefit.

Distinguish verified evidence from assumptions and hypotheses.

# Phase 3 — Independent Advanced Technique Discovery

Do not limit your analysis to algorithms explicitly mentioned in this prompt or the existing proposals.

Actively investigate additional established, modern, and research-backed techniques across the entire document intelligence and RAG pipeline.

For every promising technique not already evaluated:

1. Explain the problem it solves.
2. Compare it with the current architecture.
3. Evaluate compatibility with Vietnamese/English documents.
4. Assess resource requirements and operational costs.
5. Determine whether it improves correctness, retrieval quality, security, or maintainability.
6. Determine whether it should be included from the beginning.
7. Identify the consequences of excluding it.
8. Evaluate whether future adoption would require substantial architectural changes.

Prioritize techniques with strong practical evidence over novelty.

Where reliable benchmarks are unavailable, explicitly document uncertainty and design an experiment instead of inventing conclusions.

Incorporate all justified recommendations into the final architecture.

# Phase 4 — Resolve Expensive-to-Reverse Decisions

Identify architectural decisions that would be costly to change later.

Pay special attention to:

- Canonical document representation
- Layout, table, and signature preservation
- Document versioning and provenance
- Chunk identity and parent-child relationships
- Metadata and entity schemas
- Tenant isolation and ACL enforcement
- PII and sensitive information handling
- Embedding versioning and reindexing
- Retrieval and reranking interfaces
- Citation mapping back to original pages and regions
- Asynchronous job durability and idempotency
- Document deletion and derived-data invalidation

For each decision, provide an explicit design and validate its consistency with downstream components.

Do not leave critical interfaces ambiguous.

# Phase 5 — Design Complete Data and API Contracts

Specify:

- Database tables, relationships, constraints, and indexes
- Document and chunk schemas
- Structured extraction outputs
- Entity normalization and offset mappings
- ACL and tenant isolation models
- Ingestion state machine
- Job leasing, retries, and recovery
- Retrieval request/response schemas
- Citation and provenance structures
- Error handling and observability contracts
- Versioning and migration strategies

Use realistic example payloads.

Define invariants that must always hold.

# Phase 6 — Simulate End-to-End Workflows

Perform detailed design walkthroughs for:

1. A normal DOCX document
2. A digitally generated PDF contract
3. A scanned Vietnamese contract
4. A contract with complex tables
5. A contract with multiple signatures and appendices
6. A document containing PII
7. A document with conflicting versions
8. A malformed or malicious upload
9. An unauthorized document retrieval attempt
10. A document deletion followed by a search query
11. A failed ingestion job followed by retry
12. A query requiring exact identifiers and semantic context

Trace every workflow through ingestion, processing, storage, indexing, retrieval, and answer generation.

Identify missing transitions, inconsistent data contracts, security violations, and potential information loss.

Revise the design until the identified issues are resolved or explicitly documented as blockers.

# Phase 7 — Evaluation-First Design

Create a representative evaluation plan before implementation.

Include:

- Parsing accuracy
- Table structure fidelity
- Entity extraction accuracy
- PII detection recall
- Retrieval Recall@k, MRR, and nDCG
- Citation correctness
- Authorization and tenant-isolation tests
- p50/p95 latency
- CPU/RAM utilization
- Ingestion throughput

Define baselines, acceptance thresholds, and controlled comparisons.

Include explicit ablation experiments for:

- Lexical versus dense versus hybrid retrieval
- RRF versus alternative fusion strategies
- Reranking versus no reranking
- MMR versus deterministic deduplication
- Different chunking strategies
- Different multilingual embedding models
- Structured entity filtering versus unstructured retrieval

Use synthetic fixtures initially where necessary, but explicitly identify which conclusions require representative real-world documents.

Do not invent measured results.

# Phase 8 — Produce a Complete Implementation Blueprint

Create or update:

- ragplan/2/rag-architecture-review.md
- ragplan/2/rag-algorithm-decisions.md
- ragplan/2/rag-data-contracts.md
- ragplan/2/rag-security-design.md
- ragplan/2/rag-evaluation-plan.md
- ragplan/2/rag-failure-analysis.md
- ragplan/2/rag-implementation-plan.md

The implementation plan must specify:

- Ordered phases and dependencies
- Exact modules and interfaces
- Database migrations
- Required algorithms and configurations
- Tests to write before each component
- Integration checkpoints
- Acceptance criteria
- Rollback and migration strategies
- Explicit implementation constraints

Avoid placeholder decisions such as "choose an appropriate chunk size" or "implement a suitable reranker."

Specify initial defaults, justify them, and identify how they will be validated.

# Phase 9 — Adversarial Design Review

Before finalizing, independently challenge the proposed design.

Assume implementation has already failed and investigate why.

Look for:

- Hidden coupling
- Information loss during parsing
- Incompatible schemas
- Incorrect retrieval assumptions
- Security boundary violations
- Missing edge cases
- CPU and memory exhaustion
- Excessive external service dependencies
- Unnecessary complexity
- Expensive future migrations

Revise the blueprint accordingly.

# Final Requirements

Do not modify production code.

Do not optimize for minimum planning time or minimum initial code.

Optimize for:

1. Correctness and security
2. Minimal architectural rework
3. High retrieval and extraction quality
4. Maintainability
5. Practical CPU-first deployment
6. Cost and performance efficiency

Do not confuse exhaustive planning with unnecessary complexity.

Finish with:

- Recommended final architecture
- Algorithm decision matrix
- Complete implementation blueprint
- Remaining risks and assumptions
- Decisions requiring my approval
- A GO / NO-GO assessment for starting implementation

Do not declare GO while critical architectural contradictions, undefined security boundaries, or incompatible data contracts remain.
