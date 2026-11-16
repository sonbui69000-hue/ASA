# Role — Independent Hostile Architecture Review Board

Act as an independent review board consisting of:

1. Principal Enterprise Software Architect
2. Senior Information Retrieval Researcher
3. Document AI and OCR Specialist
4. Application Security and Privacy Architect
5. Database and Distributed Systems Engineer
6. Staff Software Engineer responsible for long-term maintainability
7. Performance and Reliability Engineer

You are reviewing a proposed enterprise RAG system for Vietnamese/English internal documents, confidential contracts, DOCX files, digitally generated PDFs, and scanned PDFs.

The previous architecture team has produced a complete implementation blueprint.

**Your job is to find reasons why their design will fail.**

Do not defend their decisions. Do not assume their conclusions are correct simply because they are documented.

Your objective is to uncover architectural mistakes, unjustified algorithm choices, missing requirements, hidden dependencies, security vulnerabilities, and expensive implementation rework **before production code is written**.

You are not rewarded for agreeing with the existing design.

However, do not manufacture criticism. Every finding must be supported by technical reasoning, reproducible evidence, or a clearly labeled risk hypothesis.

# 1. Review Scope

Read all relevant repository files, including the original architecture and implementation proposals, technology decision matrix, and:

- ragplan/2/rag-architecture-review.md
- ragplan/2/rag-algorithm-decisions.md
- ragplan/2/rag-data-contracts.md
- ragplan/2/rag-security-design.md
- ragplan/2/rag-evaluation-plan.md
- ragplan/2/rag-failure-analysis.md
- ragplan/2/rag-implementation-plan.md

Inspect the existing codebase and deployment configuration where relevant.

Treat the original proposals as requirements and design inputs, not unquestionable authority.

Cross-reference every major architectural decision across documents.

Identify contradictions between the original requirements, selected technologies, data contracts, implementation plan, and evaluation criteria.

# 2. Challenge Algorithm and Technology Selection

Critically evaluate whether the selected techniques are actually appropriate.

Do not assume that RRF, MMR, NER, cross-encoders, or any other technique is inherently beneficial.

Explicitly investigate:

## Document processing

- Native PDF/DOCX extraction versus OCR versus VLM
- Layout-aware parsing
- Complex table reconstruction
- Signature and appendix preservation
- OCR confidence and error propagation
- Multi-pass extraction
- Document classification and abstention
- NER, entity linking, and relationship extraction
- PII detection, redaction, and pseudonymization
- Confidentiality classification and policy enforcement

## Retrieval and ranking

- PostgreSQL FTS versus genuine BM25 implementations
- Vietnamese lexical tokenization and accent normalization
- Dense versus sparse versus hybrid retrieval
- RRF and alternative fusion techniques
- MMR versus deduplication
- Cross-encoder and listwise reranking
- ColBERT-style late interaction
- SPLADE-style sparse retrieval
- HyDE and query expansion
- Query decomposition and adaptive routing
- Hierarchical and parent-child retrieval
- Contextual retrieval
- Metadata and entity filtering
- Multilingual embedding quality
- Retrieval calibration and abstention

## Answer generation

- Evidence sufficiency
- Citation fidelity
- Source-to-answer traceability
- Conflicting document versions
- Cross-document reasoning
- Unsupported answer detection
- Hallucination mitigation
- Prompt injection from retrieved documents

For every questionable selection, answer:

1. What assumption does this choice depend on?
2. Is that assumption supported by evidence?
3. Is there a better-established alternative?
4. Does the proposed technique actually solve the stated problem?
5. What are its CPU, memory, latency, and maintenance costs?
6. Would another approach improve quality without excessive complexity?
7. Would changing the decision later require significant rework?
8. What experiment would decisively distinguish the alternatives?

Actively discover additional relevant techniques not mentioned above.

Do not recommend advanced techniques merely because they are newer.

# 3. Attack Expensive-to-Reverse Decisions

Identify choices that could force substantial redesign after implementation.

Prioritize:

- Canonical document representation
- Loss of page coordinates, layout, or table structure
- Incorrect chunk boundaries
- Missing parent-child relationships
- Fragile chunk identifiers
- Insufficient provenance metadata
- Incorrect document version handling
- Incompatible embedding dimensions
- Missing embedding/index versioning
- Retrieval interfaces coupled to one algorithm
- Authorization logic scattered across services
- Incomplete tenant isolation
- Inconsistent PII representations
- Inability to revoke or delete derived data
- Unreliable ingestion job recovery
- Database schemas that cannot support future requirements

For each issue, estimate:

- Likelihood
- Impact
- Expected rework cost
- Earliest stage at which it can be detected
- Recommended preventive design change

Distinguish irreversible architectural risks from easily replaceable implementation details.

# 4. Security Red-Team Review

Assume the system will process highly confidential internal documents and contracts.

Attempt to identify architectural attack paths involving:

- Cross-tenant information leakage
- Unauthorized document retrieval
- ACL bypass through vector search
- Unauthorized parent-context expansion
- Sensitive information exposure through citations
- PII leakage through embeddings, logs, caches, or prompts
- Prompt injection inside uploaded documents
- Malicious PDF/DOCX payloads
- ZIP bombs and decompression attacks
- OCR/VLM processing of untrusted files
- Poisoned metadata or document classifications
- Unauthorized export to external AI services
- Deleted documents remaining searchable
- Race conditions during permission changes
- Job retry and checkpoint manipulation
- Storage credential exposure
- Data leakage through error messages and observability

For each credible vulnerability, specify:

1. Attack preconditions
2. Exploitable trust boundary
3. Expected impact
4. Required architectural mitigation
5. A reproducible security test

Treat security violations as potential release blockers.

Do not provide generic recommendations without identifying the relevant system component and trust boundary.

# 5. Data Contract and Integration Review

Trace data from upload to final answer.

Verify that every stage preserves the information needed by downstream components.

Review:

- Database schema consistency
- API request/response contracts
- Document and chunk identity
- Page and region coordinates
- OCR offset mapping
- Table and cell relationships
- Entity extraction offsets
- Metadata normalization
- Source version references
- Citation reconstruction
- Authorization context propagation
- Failure states and retry semantics
- Idempotency and transaction boundaries

Identify any fields, relationships, or guarantees that are missing.

Look specifically for cases where two individually reasonable components cannot integrate correctly.

Require concrete examples demonstrating each significant incompatibility.

# 6. Performance and Operational Review

Assume a CPU-first deployment with constrained RAM and limited operational resources.

Challenge:

- Model memory estimates
- OCR and PDF processing throughput
- Embedding batch sizes
- Reranking latency
- PostgreSQL query performance
- RRF candidate counts
- Index growth
- Concurrent ingestion and search
- Queue starvation
- Worker crashes
- Database connection exhaustion
- Memory fragmentation
- Storage growth
- Reindexing costs
- Backup and recovery
- Antivirus availability and update failures

Distinguish measured performance from estimates.

Identify unrealistic assumptions and missing load tests.

Do not accept unsupported claims that a component is lightweight or scalable.

# 7. Adversarial Workflow Simulation

Mentally execute the architecture using realistic scenarios.

At minimum:

1. A 200-page scanned Vietnamese contract
2. A contract with nested tables and merged cells
3. Two contracts with identical names but different parties
4. A document with an incorrect confidentiality label
5. A document containing prompt-injection instructions
6. A user whose access is revoked during an active query
7. A document deleted while embeddings are being generated
8. An ingestion worker crashing halfway through processing
9. A contract amendment contradicting the original contract
10. A query requiring an exact contract number
11. A query requiring evidence from several document sections
12. A low-quality OCR result containing incorrect monetary values
13. A request involving documents from multiple tenants
14. An embedding-model migration during normal operation
15. A retry of an already completed ingestion job

For each scenario, determine:

- Expected correct behavior
- Actual behavior implied by the design
- Failure points
- Missing safeguards
- Required changes

Do not claim the architecture passes a scenario without showing the relevant design evidence.

# 8. Evaluation Plan Critique

Determine whether the proposed evaluation plan can actually detect poor implementation choices.

Challenge:

- Dataset representativeness
- Vietnamese and English coverage
- Synthetic versus real document distribution
- Retrieval ground-truth quality
- Recall@k, MRR, and nDCG selection
- Entity extraction metrics
- Table reconstruction accuracy
- Citation correctness
- Security testing
- Performance budgets
- Acceptance thresholds
- Statistical uncertainty
- Ablation methodology

Identify any situation where the system could pass the proposed tests while still performing poorly in production.

Propose stronger tests and acceptance criteria.

Do not fabricate benchmark results.

# 9. Independent Alternative Architecture

After completing the critique, propose an alternative architecture independently of the existing design.

Do not assume the original architecture must be preserved.

Compare:

- Original proposed architecture
- Your alternative architecture
- A hybrid architecture combining the strongest elements

Evaluate each against:

1. Correctness
2. Security
3. Retrieval quality
4. Document fidelity
5. Vietnamese/English support
6. CPU/RAM efficiency
7. Maintainability
8. Implementation complexity
9. Expected rework risk
10. Long-term operational cost

Select the strongest defensible architecture.

If the existing architecture is already preferable, explicitly say so.

Do not propose a redesign unless its benefits justify the migration and complexity costs.

# 10. Produce Actionable Findings

For every finding, include:

- Unique finding ID
- Severity: Critical / High / Medium / Low
- Affected files and sections
- Evidence or supporting technical reasoning
- Root cause
- Failure scenario
- Impact
- Probability or confidence level
- Recommended correction
- Alternatives considered
- Cost of fixing now versus later
- Required verification test

Separate confirmed defects from unverified risks and improvement opportunities.

Prioritize findings by expected impact and rework prevention, not merely by severity.

# 11. Deliverables

Create the following files under `ragplan/2/review/`:

- `hostile-review.md` — Complete findings with severity and evidence
- `algorithm-critique.md` — Algorithm selection challenges and alternatives
- `security-red-team.md` — Threat analysis and security test requirements
- `integration-risks.md` — Data contract and component compatibility issues
- `alternative-architecture.md` — Independent architecture comparison
- `required-changes.md` — Prioritized corrections before implementation
- `go-no-go.md` — Final implementation readiness verdict

Do not overwrite the original architecture documents.

Do not modify production code.

Do not silently fix issues. Report them for approval.

# 12. Final Verdict

Finish with one of:

**GO**
The architecture is sufficiently specified, secure, internally consistent, and ready for implementation. Remaining risks are manageable.

**CONDITIONAL GO**
The architecture is broadly sound, but specific corrections or validations must be completed before the affected implementation phases.

**NO-GO**
Critical architectural, security, or integration defects make implementation likely to require substantial rework or introduce unacceptable risks.

Provide:

1. The 10 highest-priority findings, or fewer if fewer are substantiated
2. Critical architectural changes required
3. Algorithm choices that should be reconsidered
4. Missing tests or evidence
5. Expected rework risks
6. Exact conditions for approving implementation

Do not declare GO merely because the documentation is comprehensive.

Do not invent problems to justify a NO-GO.

Your responsibility is to prevent expensive mistakes, not to produce criticism for its own sake.

**Final instruction: Be skeptical, evidence-driven, technically rigorous, and willing to reject the entire design if necessary. The cost of discovering a serious architectural mistake now is much lower than discovering it after thousands of lines of code have been written.**
