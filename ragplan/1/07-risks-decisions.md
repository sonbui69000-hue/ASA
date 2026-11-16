# Deliverable 7 — Risks, trade-offs and decisions

## Highest-risk assumptions

| Assumption / risk | Consequence | Decision or validation |
| --- | --- | --- |
| Content reveals confidentiality reliably | A mundane-looking contract can still carry private obligations; machine false negatives cause disclosure | Trusted labels/review are authority. Unknown handling is restricted. No external AI in MVP. |
| OCR/table output is numerically trustworthy | Wrong digit, unit, header or row changes a payment obligation | Exact numeric evaluation, literal source preservation, typed decimal cells, evidence, review on disagreement. |
| Vietnamese support equals enterprise quality | Diacritics, names, multiword addresses and mixed scans can fail | Language-specific held-out tests; Tesseract/Paddle challenger; custom PII recognizers and review. |
| Small team can operate many AI services | Infrastructure consumes the five-week schedule | One codebase, separate worker and parser boundary, PostgreSQL jobs and private storage. No required GPU, Redis, vector cluster or model-serving fleet. |
| Filtering vector metadata is authorization | Caller-controlled tags or stale ACLs can expose other departments | Trusted identity, authoritative relational ACLs, RLS, live epoch checks and secure expansions/previews. |
| Shared ANN gives stable filtered recall/isolation | Denied vectors can affect candidate selection and query behavior | Exact authorized baseline first; measure filtered recall; partition/separate tenant stores for stronger boundaries. [pgvector notes](https://github.com/pgvector/pgvector#filtering). |
| PII masking clears confidential data for cloud inference | Secrets can be non-PII; detectors miss information | A sanctioned sanitized rendition remains subject to disclosure policy. No confidence threshold bypasses approval. [Presidio limits](https://presidio.dataprivacystack.org/faq/). |
| Every uploaded object can be parsed safely | Parser vulnerabilities, zip bombs and allocation attacks | No-network credential-free sandbox, bounds, patched dependencies, fail-closed antivirus health and dedicated worker separation before production. |
| Original signatures survive conversion | Rewriting PDFs can invalidate cryptographic signatures | Preserve originals unchanged; derivatives labeled; signature verification separately scoped. [OCRmyPDF signature behavior](https://ocrmypdf.readthedocs.io/en/latest/pdfsecurity.html). |
| Model/provider terms remain unchanged | License or API economics differ from the plan | Freeze exact reviewed software/model artifacts and terms; recheck on upgrade. Current MinerU terms are conditional, PyMuPDF is AGPL/commercial. [MinerU license](https://github.com/opendatalab/MinerU/blob/master/LICENSE.md), [PyMuPDF terms](https://pymupdf.readthedocs.io/en/latest/about.html). |
| Five weeks yields a production platform | Real SSO, governance, recovery and security review take organizational time | Commit to a measured pilot; explicitly gate confidential exposure. Preserve security work when cutting experimental scope. |
| Cloud unit price dominates spending | Idle resources and manual review dominate small volumes | Separate incremental inference cost from reserved infrastructure, review, licensing and operations. [Cost comparison](02-technology-decisions.md). |
| Document deletion is a single DB delete | Cached snippets, old storage versions, workers or restores resurrect content | Tombstone first, purge all generations/derivatives, external deletion ledger and backup expiry reconciliation. |

## Decisions that simplify the first release

Use rules for file allowlists, package limits, known templates, clause numbering, currency/date parsing, field validation, permission checks and job transitions. These require deterministic behavior and inspectable failures. Do not use an LLM to decide whether a caller has access, whether a ZIP is safe or how to sum a monetary column.

Use heading/clause/table boundaries before semantic chunking. A trained or LLM-based splitter adds another failure surface without proven local value. Retain parent references, table header context and the exact tokenizer budget; measure retrieval before adding reranking. PostgreSQL full-text ranking plus vector RRF is sufficient to establish a baseline; call it that, not BM25.

Make contract extraction optional and typed. Title/number/template dates can be useful early; renewal and termination semantics require careful evidence and potentially review. Search can work well over canonical clauses before a legal-obligation model exists. Do not block every report upload on a contract extraction service.

Treat PII detection as an annotation/rendition aid. The MVP's raw local index remains useful for authorized party/amount search. Fine-grained field masking requires separate indexing scopes and tests, so it is deferred rather than approximated by erasing all names and values. Reversible tokens preserve linkage but introduce a vault, key lifecycle and equality leakage; only build them when a specific permitted workflow needs them.

Use PostgreSQL jobs with leases because the initial concurrency and scheduling needs are small. That is not a claim that a naive row status is a durable queue: fencing, retries, idempotency, crash recovery and monitoring are mandatory. Move to Celery only when operational needs justify broker complexity; retain the DB as job authority. [Locking primitives](https://www.postgresql.org/docs/current/sql-select.html), [Celery delivery caveats](https://docs.celeryq.dev/en/stable/userguide/tasks.html).

Avoid running OCRmyPDF universally, converting all DOCX to PDF, flattening every table to prose, embedding giant documents or having a general VLM transcribe every page. Each adds cost or loses useful original structure. Local specialist models can help hard cases, but even a small VLM must demonstrate literal correctness and locator completeness.

## Explicit final stack

| Layer | Selected starting stack | Supporting reason / alternative |
| --- | --- | --- |
| API and models | Python 3.12 supported dependency baseline, FastAPI, Pydantic v2, SQLAlchemy/Alembic and psycopg | Common Python integration path; validate compatibility and freeze lock in week 1. Reuse enterprise OIDC rather than invent credentials. |
| Job execution | Dedicated Python supervisor + PostgreSQL durable jobs/leases; disposable rootless parser containers | Small operational footprint with explicit recovery. Dedicated worker VM for confidential production isolation. |
| Validation | Content sniffing, bounded PDF/OOXML probes, ClamAV, ZIP/XML defenses | Layered local controls; no file opens in API request process. [Upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). |
| Extraction | Docling standard PDF layout pipeline; pypdfium2 renderer/probe; pdfplumber digital/table fallback; python-docx + explicit OOXML adapter | Structure and provenance, with a cheap digital path and native Word semantics. [Docling](https://github.com/docling-project/docling), [PDFium](https://github.com/pypdfium2-team/pypdfium2), [pdfplumber](https://github.com/jsvine/pdfplumber), [DOCX](https://python-docx.readthedocs.io/en/latest/). |
| OCR | Tesseract eng+vie baseline; conventional PaddleOCR promoted only if the benchmark wins | CPU entry point and explicit bilingual data; no claim of universal best accuracy. [Tesseract languages](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html), [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR). |
| Type/sensitivity/PII | Bilingual type rules; trusted sensitivity labels/review; Presidio/custom recognizers/local NER with honest Vietnamese gaps | Explainable initial behavior. VnCoreNLP optional after license/quality review. [Presidio language configuration](https://github.com/data-privacy-stack/presidio/blob/main/docs/analyzer/languages.md). |
| Retrieval | Structure/table-aware chunks; local multilingual-e5-small; PostgreSQL 18 + pgvector exact cosine + FTS/exact filters + RRF | CPU-sized baseline, one transactional permission authority; BGE-M3 is a measured upgrade. [E5](https://huggingface.co/intfloat/multilingual-e5-small), [pgvector](https://github.com/pgvector/pgvector). |
| Storage | Existing approved private object storage; encrypted filesystem adapter for single-host pilot; immutable versioned artifacts | Preserves originals and traceability without introducing another distributed platform. |
| UI | Thin React/Next.js upload/status/review/search/evidence interface, Vietnamese labels | Current objective is ingestion. Existing enterprise frontend can reuse the API. No mock browser-only security. |
| VLM/answer generation | Disabled for MVP; local specialist extraction trial later; eventual answer provider separately approved | Keeps confidential processing local and costs measurable. No selected hosted answer model is implied. |
| Observability and operations | Content-free structured events, protected append-only audit export, resource/queue alerts, encrypted backup + restore/delete drill | Operational evidence is required before confidential rollout. |

This is a recommended baseline to benchmark, not a promise that a specific parser is always best. Current model cards and repositories change quickly; notably current PaddleOCR includes conventional PP-OCRv6 and specialist VL-1.6, and current MinerU has CPU paths with changed license terms. Keep version selection reversible behind adapters. [PaddleOCR updates](https://github.com/PaddlePaddle/PaddleOCR), [MinerU documentation](https://github.com/opendatalab/MinerU).

## Questions whose answers would materially change the architecture

1. What jurisdiction/residency, internal classification policy and legal-hold/retention requirements apply, and is **any** external OCR/AI processing permitted for explicitly approved public/sanitized data? This decides egress policy and storage placement; no external inference is assumed now.
2. Which identity provider and existing document permissions are authoritative, and do users need field/section-level access or only whole-document access? Are departments within one enterprise or legally isolated tenants? This determines rendition design and whether separate databases are needed.
3. What are actual daily pages, peak uploads, document sizes, searchable corpus size and required time-to-search/concurrent search SLA? This decides worker count, exact vs ANN indexing and whether a GPU/broker is justified.
4. Are the hard cases mainly clean printed Vietnamese/English, handwriting/stamps, complex financial tables or signed/revised contracts; which exact facts require near-perfect precision and who can review failures? This changes OCR/VLM candidates and human workload.
5. What approved hardware/storage/operations capacity and software/model license constraints already exist? Can the organization run copyleft/conditionally licensed dependencies, and can it supply a reviewer and security owner during the five weeks? This decides adapters, deployment and schedule.

Proceed with the stated local-only, document-level, CPU-first pilot assumptions until these are answered; none is a prerequisite for producing the implementation specification.
