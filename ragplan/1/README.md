# Enterprise document ingestion and indexing plan

Research date: **2026-11-15**. This package executes the research and design request in [ragplan.md](ragplan.md). It contains specifications and synthetic examples; it does not implement the application.

Recommendation: build one Python application with a separate worker process, isolated parsing subprocesses, Docling plus native DOCX parsing, selective local Tesseract OCR, local multilingual embeddings, PostgreSQL/pgvector, and private original/derivative storage. Start with no external AI access. Use document permissions from the first demonstrable slice. Add a VLM only if a controlled evaluation justifies it.

Read the requested deliverables in this order:

1. [Recommended architecture](01-architecture.md)
2. [Technology decision matrix and cost comparison](02-technology-decisions.md)
3. [Detailed processing pipeline](03-processing-pipeline.md)
4. [Data model and output schemas](04-data-model.md)
5. [Five-week development roadmap](05-roadmap.md)
6. [Testing and benchmarking](06-testing-benchmarking.md)
7. [Risks, trade-offs, final stack, and material questions](07-risks-decisions.md)
8. [Implementation handoff](08-implementation-handoff.md)

Supporting artifacts:

- [Source register](research/sources.md): primary documentation, repositories, model cards, and papers, with limits on what each establishes.
- [Cost assumptions](research/cost-assumptions.json) and [cost scenarios](research/cost-scenarios.csv): explicit arithmetic for 100 and 1,000 ten-page documents.
- [JSON Schema bundle](schemas/ragplan.schema.json): Draft 2020-12 contracts for all requested output categories.
- [Synthetic examples](examples/): matching examples, including unknown contract fields and DOCX citations without invented page numbers.
- [Artifact verification](research/verification.md): checks actually performed on this planning package.

Assumptions: two full-time engineers, a part-time security/operations owner and document reviewer; one enterprise with department separation; Vietnamese and English; initially 100 documents/day averaging 10 pages, 50 concurrent logged-in users, and at most 10 simultaneous searches. This is a sizing hypothesis, not a capacity claim. A five-week outcome is a controlled internal pilot. Real confidential use requires the security gates in deliverables 5 and 6.

Path interpretation: the requested `/ragplan` is represented by this existing `ragplan` workspace, `/home/sonbui/Downloads/ASA/ragplan`. The original prompt is preserved. There was no existing application or usable Git repository here to inspect.

Evidence convention: cited capabilities are documented observations as retrieved on the research date. Resource budgets, routing cutoffs, cost timings, schedules, and acceptance targets are **design assumptions**, not published benchmark results. Upstream branches and prices can change; freeze reviewed package versions, model revisions, licenses, and container digests during week 1. No extraction, model inference, application load test, or security penetration test was run as part of this research.
