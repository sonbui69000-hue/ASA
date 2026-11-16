# Task — Create a Complete RAG Technical Explanation & Defense Handbook

Act as a Senior RAG Engineer, Enterprise Architect, Security Engineer, and Technical Educator.

I need to understand, explain, and defend every important technical decision, algorithm, failure scenario, and edge case in our enterprise RAG system.

The system handles Vietnamese/English internal documents, confidential contracts, DOCX files, scanned PDFs, document search, and question answering.

**This is a knowledge-transfer task, not another architecture redesign.**

Do not modify production code or existing planning/review documents.

## 1. Read all project sources

Read the original architecture and implementation proposals, technology decision matrix, and all documents under:

- `ragplan/2/`
- `ragplan/2/review/`

Include the latest readiness assessment, approval decisions, and hostile review findings.

Treat these documents as the source of truth for what is actually proposed, selected, deferred, rejected, or unresolved.

Clearly distinguish:
- Implemented
- Approved for implementation
- Proposed but awaiting approval
- Experimental
- Deferred
- Rejected
- Unresolved

Do not describe a proposed feature as already implemented.

## 2. Explain every relevant technique

Create a comprehensive technique catalog.

Include all techniques selected, evaluated, or challenged in the documents, plus directly relevant techniques needed to understand the architecture.

At minimum cover:

### Document processing
- File content sniffing and structural validation
- Antivirus scanning and sandbox isolation
- Native PDF/DOCX extraction
- OCR and VLM
- Layout-aware parsing
- Table structure recognition
- OCR confidence and fallback routing
- Document classification
- NER and entity linking
- PII detection and pseudonymization
- Contract clause segmentation
- Document versioning and amendment relationships

### Retrieval and ranking
- Dense embeddings and cosine similarity
- BM25 and PostgreSQL full-text search
- Hybrid retrieval
- Reciprocal Rank Fusion (RRF)
- Maximal Marginal Relevance (MMR)
- Deterministic deduplication
- Cross-encoder reranking
- ColBERT and late interaction
- SPLADE and sparse retrieval
- Parent-child retrieval
- Contextual and semantic chunking
- Hierarchical retrieval
- Metadata filtering
- Query expansion and decomposition
- HyDE
- Multilingual embeddings
- Embedding migration and reindexing

### Security and reliability
- Authentication versus authorization
- Tenant isolation and document ACL
- Row-Level Security (RLS)
- Fail-closed authorization
- Permission revocation and consistency
- Idempotency
- Transaction boundaries
- Durable job queues, leases, and retries
- Checkpointing
- Data provenance and citation verification
- Prompt injection defenses
- Data deletion and derived-data invalidation

For each technique, explain:

1. **Plain-English explanation:** What it does in 2–4 sentences.
2. **Technical explanation:** How it works internally.
3. **Concrete example:** Prefer a Vietnamese hospital contract or internal document.
4. **Problem solved:** Why the technique exists.
5. **Our architecture:** Whether and where we use it.
6. **Why selected or rejected:** Compare relevant alternatives.
7. **Trade-offs:** Accuracy, latency, CPU/RAM, security, complexity.
8. **Limitations:** What it cannot solve.
9. **Failure modes:** How it can go wrong.
10. **How to explain it:** A concise 30-second explanation suitable for a technical presentation.
11. **Likely reviewer questions:** At least two challenging questions with technically defensible answers.

Use formulas and pseudocode when they materially improve understanding, especially for RRF, MMR, similarity scoring, and reranking.

Do not confuse related techniques. For example, explain why RRF, MMR, and cross-encoder reranking solve different problems.

## 3. Create an exhaustive edge-case and failure-scenario catalog

Extract every edge case, threat scenario, operational failure, and adversarial workflow from the planning and review documents.

Then identify additional realistic cases that could affect the proposed architecture.

Organize by:

- File upload and validation
- Parsing, OCR, and tables
- Classification and PII
- Chunking and indexing
- Retrieval and answer generation
- Contract amendments and version conflicts
- Authentication, authorization, and tenant isolation
- Database and network failures
- Background jobs and concurrency
- Embedding migration
- Deletion and retention
- Infrastructure and resource exhaustion

For each scenario provide:

1. Trigger and preconditions
2. Step-by-step failure sequence
3. Expected correct system behavior
4. What could go wrong in a naive implementation
5. Proposed mitigation in our architecture
6. Whether the mitigation is designed, implemented, or unverified
7. How to test it
8. Severity and business impact
9. A concise explanation I can give to a reviewer

Explicitly include scenarios such as:

- Database becomes unavailable during permission revocation
- Permission is revoked during an active retrieval request
- Authorization checks succeed but the database fails before answer delivery
- Cached search results outlive permission changes
- Parent-context expansion exposes unauthorized content
- Document deletion races with embedding generation
- A worker crashes after committing data but before acknowledging completion
- The same job executes twice
- A scanned contract has an incorrect monetary amount due to OCR
- A table loses merged-cell relationships
- A contract amendment supersedes an original clause
- Two conflicting amendments have overlapping effective dates
- An embedding model changes from 384 to 1,024 dimensions
- A new embedding index is only partially populated
- A malicious document contains prompt-injection instructions
- A user requests information from an unauthorized department
- A document's confidentiality classification is incorrect
- Antivirus scanning times out
- PostgreSQL becomes unavailable during retrieval
- The application runs out of memory while processing a large PDF

For every security-related scenario, identify the trust boundary and whether the system fails open or fails closed.

Distinguish a guaranteed property from a desired property that still requires design or testing.

## 4. Explain the complete system end to end

Describe the complete architecture in chronological order:

1. File upload
2. Validation and security scanning
3. Document type and sensitivity classification
4. Parsing, OCR, or VLM routing
5. Structured document representation
6. PII and entity extraction
7. Chunking and metadata enrichment
8. Embedding and indexing
9. User query and authorization
10. Lexical/vector retrieval
11. Fusion, deduplication, and optional reranking
12. Evidence expansion and citation generation
13. Answer generation or extractive response
14. Logging, deletion, and lifecycle management

For each stage, explain what data enters, what comes out, what component handles it, and what happens on failure.

Clearly label optional or deferred stages rather than presenting them as mandatory.

## 5. Explain difficult architectural decisions

Create a decision-defense section answering questions such as:

- Why PostgreSQL and pgvector instead of a dedicated vector database?
- Why RRF rather than relying exclusively on cosine similarity?
- Why might MMR help, and when might it hurt?
- Why not use a VLM for every document?
- Why not use an LLM to classify every contract?
- Why use NER instead of only regex?
- Why preserve original document layout?
- Why is document-level authorization necessary?
- Why can't embedding vectors from different models be mixed?
- Why isn't redacting all names and monetary values always appropriate?
- Why do we need version and amendment relationships?
- Why does a database outage affect permission revocation guarantees?
- Why can a system be architecturally ready but not production-ready?

Base each answer on the actual project decisions.

If a decision is still unresolved, present the competing options and explain what must be approved.

## 6. Build a technical presentation cheat sheet

Create a concise reference containing:

- One-sentence definitions of important algorithms
- Key formulas and examples
- Architecture decisions and their justifications
- The 20 most important edge cases
- The 20 hardest reviewer questions and suggested answers
- Common misconceptions to avoid
- Unresolved decisions that I must not present as finalized

Write this section for someone who understands software engineering but needs to confidently explain enterprise RAG architecture.

## 7. Deliverables

Create the following documents under `ragplan/2/knowledge/`:

- `00-system-overview.md`
- `01-techniques-explained.md`
- `02-edge-cases-and-failures.md`
- `03-architecture-decisions-defended.md`
- `04-reviewer-questions-and-answers.md`
- `05-presentation-cheat-sheet.md`
- `06-open-decisions-and-uncertainties.md`

Use internal links between documents where helpful.

For every project-specific assertion, reference the relevant source file and section.

Avoid unsupported claims, fabricated benchmarks, and invented implementation status.

## 8. Quality requirements

- Be comprehensive without repeating identical explanations.
- Prefer clear explanations over unnecessary jargon.
- Include concrete examples, diagrams, tables, formulas, and pseudocode where useful.
- Explain why techniques interact, not just what each does independently.
- Distinguish security guarantees from best-effort mitigations.
- Explain both normal operation and failure behavior.
- Flag contradictions between planning and hostile review documents.
- Do not silently resolve unresolved decisions.
- Ensure examples use synthetic information, not real confidential contract contents.

## Final output

Summarize:

1. Total techniques covered
2. Total edge cases documented
3. Most important architectural decisions
4. Highest-risk failure scenarios
5. Unresolved decisions requiring approval
6. Recommended reading order for learning the system

Do not write or modify production code.

The objective is to make me capable of explaining, defending, and critically questioning the entire architecture—not merely memorizing algorithm names.
