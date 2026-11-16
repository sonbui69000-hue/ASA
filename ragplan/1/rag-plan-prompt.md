# Role: Senior Document AI Architect, RAG Engineer & Information Security Specialist

Act as a team of:

- Senior AI/ML Engineer specializing in document intelligence, OCR, VLMs, and RAG.
- Senior Backend Engineer specializing in Python, FastAPI, asynchronous processing, and scalable ingestion pipelines.
- Enterprise Security Architect specializing in confidential documents, PII protection, access controls, and data governance.
- Technical Product Manager responsible for turning research into an achievable development roadmap.

Your task is to **research, evaluate, and design a production-oriented document ingestion and indexing pipeline** for an internal enterprise RAG web application.

I want a technically rigorous, actionable development plan. Do not start implementing code yet.

## 1. Project context

I'm building a web application that allows employees to upload, search, and ask questions about internal documents.

Documents may include:

- Public company documents.
- Confidential internal documents.
- Contracts and legal agreements.
- Financial and operational reports.
- DOCX files.
- PDFs exported from Word or other digital applications.
- Scanned PDFs containing images of documents.
- Hybrid PDFs containing selectable text and scanned pages.
- Tables, forms, signature blocks, stamps, and other complex layouts.

Some documents are highly confidential and must never be sent to unauthorized external services.

The long-term goal is a secure, accurate, permission-aware enterprise RAG system.

My immediate goal is to develop the **document ingestion, classification, extraction, normalization, and indexing pipeline**.

Assume a small development team and limited infrastructure budget.

Prefer practical open-source solutions and local-first processing when feasible.

## 2. Required ingestion pipeline

Research and design a pipeline covering the following stages.

### Stage A — File intake and validation

When an employee uploads a file:

1. Validate the actual file format, not just its extension.
2. Detect corrupted, encrypted, password-protected, and unsupported documents.
3. Check file size, page count, and other processing limits.
4. Address malware risks, malicious file structures, and unsafe parsing.
5. Register the document and create a processing job.
6. Preserve the original securely.
7. Ensure that unclassified content is not sent to external AI providers.

Research appropriate validation, sandboxing, and storage techniques.

### Stage B — Document format detection

Determine how to classify incoming documents as:

- Native DOCX.
- Born-digital PDF with extractable text.
- Image-based/scanned PDF requiring OCR.
- Hybrid PDF containing both digital text and scanned content.
- Other document types requiring special processing.

Handle classification at the **page or region level** when appropriate, rather than assuming an entire PDF requires the same extraction method.

Investigate heuristics such as text-layer quality, image coverage, text density, and extraction confidence.

Explain what can and cannot be inferred about a PDF's original authoring format.

### Stage C — Document type and confidentiality classification

These must be separate classification dimensions.

**Document type:**
- Contract.
- Report.
- Policy.
- Financial record.
- Administrative document.
- General document.
- Other / unknown.

**Sensitivity:**
- Public.
- Internal.
- Confidential.
- Restricted / highly sensitive.
- Unknown / needs review.

Research whether to use deterministic rules, document metadata, NLP classifiers, local LLMs, or hybrid approaches.

Critically evaluate how reliably confidentiality can be inferred from content alone.

Design a policy where uncertain documents default to restricted handling until authorized personnel review them.

Include human review and confidentiality-label overrides.

### Stage D — Content extraction: OCR versus VLM

Research and compare current approaches for:

- Born-digital text extraction.
- DOCX parsing.
- OCR for scanned PDFs.
- Layout-aware document parsing.
- Table recognition.
- VLM-assisted extraction.
- Local versus cloud inference.
- Hybrid pipelines that invoke expensive models only when necessary.

Investigate relevant tools such as Docling, PyMuPDF, OCRmyPDF, Tesseract, PaddleOCR, MinerU, and other currently competitive alternatives.

Do not assume these are automatically the best choices. Research current capabilities, maintenance status, deployment requirements, licensing, and limitations.

Compare approaches on:

- Extraction accuracy.
- Table preservation.
- CPU/RAM/GPU requirements.
- Privacy and security.
- Latency.
- Cost per 100 and 1,000 documents.
- Ease of integration.
- Vietnamese and English document support.
- Complex layouts, scanned documents, and signatures.

I am particularly concerned that local VLMs may be expensive to run, while hosted VLM APIs may expose confidential information.

Determine whether a VLM is actually needed, and precisely when it offers sufficient value over conventional parsing and OCR.

### Stage E — Preserve document structure

This is extremely important.

I do not want PDFs flattened into giant strings where their structure is lost.

Preserve when possible:

- Headings and section hierarchy.
- Paragraphs and reading order.
- Tables, rows, columns, and merged cells.
- Key-value pairs.
- Page references.
- Document metadata.
- Contract parties and legal clauses.
- Signature sections and signatory roles.
- References between tables and surrounding text.
- Original source locations and extraction confidence.

Investigate representations such as structured JSON, Markdown, HTML tables, and document-layout models.

Explain which formats are appropriate for storage, retrieval, and LLM context construction.

Design a canonical document representation that preserves content, layout relationships, and source provenance.

Do not confuse detecting a signature block with verifying that a document was legally signed.

### Stage F — Structured extraction for contracts

Investigate whether the pipeline should extract structured fields such as:

- Contract title and number.
- Contracting parties.
- Effective and expiration dates.
- Payment obligations.
- Contract value and currency.
- Renewal terms.
- Termination provisions.
- Signatories and their roles.
- Important clauses.
- Associated tables or appendices.

Structured fields should link back to the exact evidence in the original document.

Design confidence scores and validation.

Unknown fields must remain unknown, not be hallucinated.

Explain whether contract-specific extraction should be a separate optional stage rather than a mandatory step for every document.

### Stage G — PII and sensitive-data protection

This is a critical requirement.

Research robust approaches to identifying:

- Personal names.
- Addresses and contact information.
- National identification numbers.
- Financial account information.
- Employee information.
- Patient information, if applicable.
- Sensitive contract details.
- Company-specific confidential identifiers.

Compare local NER/PII detectors, regexes, dictionaries, Presidio, and model-assisted detection.

Design a security architecture that distinguishes between:

1. Original files.
2. Raw extracted content.
3. Sanitized or pseudonymized representations.
4. Searchable indexes.
5. Content authorized users may retrieve.

Determine where masking, redaction, encryption, or deterministic pseudonymization is appropriate.

Consider that some contract searches legitimately require party names and monetary amounts, so blindly removing every entity could make RAG useless.

Explicitly discuss:

- False negatives in PII detection.
- Irreversible redaction versus reversible pseudonymization.
- Access to original text.
- Redaction of returned snippets.
- Audit trails.
- Logging without leaking sensitive content.
- Retention and deletion.
- Whether external LLM calls should be permitted at all.

Do not claim automated PII detection provides guaranteed protection.

### Stage H — Chunking, embedding, and storage

Research techniques suitable for complex enterprise documents.

Evaluate:

- Semantic chunking.
- Heading-aware chunking.
- Layout-aware chunking.
- Clause-aware chunking for contracts.
- Table-aware chunking.
- Parent-child retrieval.
- Hybrid keyword and vector search.
- Reranking.
- Multilingual Vietnamese/English embeddings.

I want to preserve both **the original document and a structured representation**, with embeddings linked to their source.

Pay special attention to tables: how should I index a table so a user can search by specific row, column, amount, or contract obligation without losing context?

Evaluate whether to embed text, table descriptions, individual rows, full tables, or multiple representations.

Propose a practical database/storage design.

Possible stack:
- Python + FastAPI.
- PostgreSQL + pgvector.
- Object storage for original documents.
- Redis/Celery or another job processing system.
- React/Next.js web frontend.

You may recommend alternatives if justified.

### Stage I — Retrieval security and answer generation

Although ingestion is the current priority, ensure that the proposed indexing architecture supports secure RAG later.

Include:

- Document-level and chunk-level authorization.
- RBAC/ABAC and permission inheritance.
- Authorization-aware retrieval before content reaches the model.
- Avoidance of cross-user information leakage.
- Tenant or department isolation.
- Reliable citations to document, page, section, and table.
- Safe access to original document previews.
- Prompt-injection defenses for malicious document content.
- Handling modifications, permission changes, and document deletion.
- Reindexing and version control.

Explain why metadata filters alone may be insufficient without trustworthy authorization enforcement.

## 3. Research requirements

Use current technical documentation, benchmarks, papers, repositories, and credible engineering discussions.

Verify current capabilities instead of relying on outdated assumptions.

For every major technology recommendation:

- Provide source links.
- Explain its advantages and disadvantages.
- Identify infrastructure requirements.
- Identify known limitations.
- Explain why it is or isn't suitable for confidential enterprise data.

Distinguish documented capabilities from your own assumptions.

If reliable benchmark comparisons are unavailable, say so and propose a reproducible local evaluation instead.

Do not simply recommend using a large LLM or VLM for every step.

## 4. Required deliverables

Produce the following in order.

**Deliverable 1 — Recommended architecture**

Provide a complete ingestion architecture, preferably with a Mermaid diagram.

Explain each component, its responsibilities, security boundaries, and data flow.

**Deliverable 2 — Technology decision matrix**

Compare realistic extraction, OCR, VLM, classification, PII, embedding, and storage options.

Give a primary recommendation and fallback for each component.

Explicitly identify which components can run CPU-only.

**Deliverable 3 — Detailed processing pipeline**

Describe what happens from file upload to document becoming searchable.

Include branching logic for DOCX, digital PDFs, scanned PDFs, and hybrid PDFs.

Include failures, retry logic, confidence thresholds, and human-review points.

**Deliverable 4 — Data model and output schemas**

Provide example JSON schemas for:

- Document metadata.
- Classification results.
- Parsed document structure.
- Tables.
- Contract-specific extracted fields.
- PII/sensitivity annotations.
- RAG chunks and source references.
- Processing jobs and audit events.

Also recommend a relational database schema and storage layout.

**Deliverable 5 — Development roadmap**

Create a realistic 5-week implementation plan for a small team.

Break it into development stages with dependencies, deliverables, and acceptance criteria.

Separate:
- Must-have MVP.
- Nice-to-have improvements.
- Production-hardening requirements.
- Future experimental AI features.

Prioritize a demonstrable vertical slice before adding complexity.

**Deliverable 6 — Testing and benchmarking**

Design an evaluation plan using representative documents:

- Simple digital PDF.
- Scanned PDF.
- Mixed-content PDF.
- DOCX with complex tables.
- Confidential contract.
- Financial tables.
- Vietnamese and English documents.
- Documents with PII.
- Documents with tricky or ambiguous layouts.

Propose measurable metrics for extraction fidelity, table correctness, classification, PII detection, retrieval accuracy, latency, and cost.

Include security and authorization tests.

**Deliverable 7 — Risks, trade-offs, and decisions**

Identify the highest-risk assumptions.

Challenge unnecessary complexity and explain where a simpler rule-based approach is better than AI.

Give an explicit final recommended stack with supporting reasons.

**Deliverable 8 — Implementation handoff**

Provide a concrete component-level work breakdown that I can hand to Codex for implementation.

Include repository structure, modules, API contracts, background jobs, acceptance tests, and implementation order.

Do not write the full application yet.

## 5. Important constraints

- Security takes priority over convenience.
- Confidential documents must not be sent to third-party AI services without an explicit approved policy.
- Never use real secret documents for external benchmarking.
- Prefer local parsing/OCR before involving LLMs.
- Avoid paying for VLM inference unless there is demonstrable improvement.
- Preserve original source files and traceability.
- Keep extraction and indexing replaceable so individual components can be upgraded later.
- Do not assume that embedding a document makes it secure.
- Do not assume PII masking alone resolves confidentiality concerns.
- Avoid unnecessary microservices and overengineering.
- Prefer technologies that can realistically be operated by a small development team.

## 6. How I want you to work

First, research current technologies and identify the main architectural choices.

Then propose a recommended architecture and critically compare alternatives.

After that, develop the implementation roadmap and schemas.

If I provide a repository, inspect its existing implementation before proposing changes.

Make reasonable assumptions where information is missing, clearly label those assumptions, and proceed with an initial recommendation.

Finish by identifying the few questions whose answers would materially change the architecture.

I want you to act as a critical engineering advisor—not simply validate my ideas.

The final result should be **specific enough to begin coding, security-conscious, technically justified, and feasible for an actual enterprise RAG application.**. The output files should be placed in /ragplan
