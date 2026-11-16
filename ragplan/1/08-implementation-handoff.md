# Deliverable 8 — Implementation handoff

## Scope of the next coding task

Implement the ingestion/search pilot in [the five-week roadmap](05-roadmap.md), using the contracts in [deliverable 4](04-data-model.md) and [the schema bundle](schemas/ragplan.schema.json). This handoff is a specification, not existing application code. The only repository content at research start was `ragplan.md`; create an application repository when implementation is authorized. Do not pretend a schema-only package is an implemented secure RAG system.

## Proposed repository structure

```text
enterprise-rag/
  README.md
  pyproject.toml
  uv.lock
  apps/
    api/                      # FastAPI routes, OIDC middleware, DI, request context
    worker/                   # job supervisor, lease heartbeat, sweeper, artifact broker
    web/                      # Vietnamese upload/status/review/search/evidence UI
  src/rag_ingest/
    domain/                   # immutable IDs, enums, policy/version/state contracts
    authz/                    # authoritative grants, ABAC, epochs, DB context
    intake/                   # streaming limits, hash, sniffing, quarantine registration
    validation/               # OOXML/PDF probes, malware scan result contracts
    sandbox/                  # launcher, resource policy, safe result validation
    extraction/
      router.py               # page/region features and routing decisions
      adapters/               # docling_pdf, digital_pdf, docx_ooxml, OCR adapters
      transforms.py           # rotation/crop coordinates and normalization offset maps
    canonical/                # schema models, graph/table validation, serializers
    classification/           # independent type and sensitivity suggestions
    privacy/                  # local recognizers, annotations, rendition policy
    contracts/                # optional fields, evidence validation and review
    chunking/                 # heading/clause/table projections, ACL dependencies
    embeddings/               # local E5/BGE interface and tokenizer budget
    retrieval/                # authorized lexical/vector/numeric queries and RRF
    previews/                 # authenticated raster/text presentation and citations
    lifecycle/                # active generation, corrections, revocation, purge
    jobs/                     # SQL queue, idempotency, checkpoints and fencing
    storage/                  # filesystem and approved object-store adapters
    audit/                    # content-free audit and retention/deletion ledger
  schemas/                    # approved contracts from this planning package
  migrations/                 # relational schema, RLS, roles and indexes
  containers/
    api/
    supervisor/
    parser/                   # no credentials/network; reviewed model assets
  deploy/                     # local pilot manifests, limits, identity/storage wiring
  tests/
    unit/                     # pure table/offset/date/token/permission logic
    integration/              # actual PostgreSQL/pgvector roles and queue/store behavior
    acceptance/               # upload-to-search, review, citations, version/delete
    security/                 # RLS, hostile files, egress, cache/revocation races
    fixtures/synthetic/       # no confidential company data
  benchmarks/
    manifests/                # hashes and splits; private corpus paths excluded
    gold/                     # synthetic/public approved annotations
    configs/                  # engine/model/config pins
    reports/                  # metadata-only results
  docs/runbooks/              # restore, purge, retry, label review, upgrade, incidents
```

The API, worker and parsers share one domain package. Separate executables and trust boundaries do not require microservices or independent business databases. Parser modules run only through the sandbox launcher. No model/network dependency initializes during API startup or an upload request.

## Component-level work breakdown

Estimates are engineering hours for the 320 planned hours; the roadmap retains 80 additional hours for integration/failures. Dependencies refer to work IDs. Each item includes meaningful behavioral acceptance, not tests that merely mirror function implementation.

| ID | Owner / hours | Work and boundary | Dependencies / acceptance |
| --- | --- | --- | --- |
| W01 | Both / 12 | Domain records, schema versioning, settings and lock/license/model manifest | None; all synthetic examples parse; unknown/known field invariants enforced |
| W02 | Backend / 24 | OIDC, tenants/groups, authoritative document ACLs, RLS migrations and request transaction context | W01; denied/other-tenant/missing context cannot read content through actual runtime role |
| W03 | Backend / 18 | Private storage adapters, bounded stream upload/hash, immutable original registration and orphan cleanup | W01/W02; interruption leaves no visible document; retry is idempotent |
| W04 | Backend / 22 | SQL jobs, leases/heartbeat/fencing, checkpoints and recovery sweeper | W01/W03; kill/reclaim/stale-worker/duplicate-publication tests pass |
| W05 | Backend / 24 | Sandboxed validation/parser launch, antivirus health, ZIP/XML/PDF limits, no-network model assets | W03/W04; hostile inputs stay bounded; child has no credentials/host writes/egress |
| W06 | Ingestion / 16 | Native PDF probing, geometry and raster preview adapter | W01/W05; clean digital page has locatable blocks and source crop |
| W07 | Ingestion / 22 | Native DOCX/OOXML structure, merge/omitted/nested cells, revision policy and coverage warnings | W01/W05; no invented pages, no duplicate merged-cell amounts, unsupported constructs flagged |
| W08 | Ingestion / 28 | Docling layout adapter, Tesseract, hybrid routing/merge and preprocessing transforms | W06; missing scanned clause is recovered without duplicating native text |
| W09 | Ingestion / 20 | Canonical graph/table validation, immutable normalization revisions and locators | W06/W07/W08; span/cell references resolve, topology and offset checks pass |
| W10 | Backend / 20 | Type rules, sensitivity authority/review, bilingual PII recognizer scaffolding and annotations | W02/W09; unknown restricted, downgrade audit, no automatic public label from low PII score |
| W11 | Ingestion / 24 | Heading/clause/table chunker, local E5, exact numeric projections and embeddings | W09/W10; no ACL crossover or tokenizer truncation; each chunk has evidence |
| W12 | Backend / 22 | Authorized lexical/vector/numeric queries, RRF, previews and API serialization | W02/W06/W11; denied content never reaches any reranker/model/context builder |
| W13 | Backend / 20 | Version generation activation, permission epochs, deletion/hold/ledger and cache rules | W04/W11/W12; failed replacement safe, immediate access blocking and purge reconciliation |
| W14 | Ingestion / 8 | Optional deterministic contract fields and validation status | W09/W10; absent dates remain null; title/number/known fields have evidence; cut first if behind |
| W15 | Both / 20 | Thin Vietnamese upload/status/review/search/evidence UI | W03/W10/W12; all visible controls have working behavior; no browser-only authority |
| W16 | Both / 20 | Corpus harness/report, resource/cost measurements, operational runbooks/restore drill | Starts W01; completes W13; actual results and open failures recorded |

Security tests are implemented alongside their owning components, not only under W16. Narrow project scope if identity or infrastructure is delayed; do not remove W02/W05/W13 in exchange for AI features.

## API contracts

All routes require enterprise authentication; tenant and caller attributes come from verified server context. JSON bodies use strict Pydantic models, maximum sizes and opaque IDs. Reject arbitrary object URLs, local paths, user-selected parser commands or remote model endpoints. Errors use `{error: {code, message, retryable, request_id}}` without raw parser stderr. Return `404` for objects the caller cannot discover; avoid distinguishable status/title leaks. Unauthorized actions on a discoverable object may use `403` under a consistent policy.

| Endpoint | Input / success response | Authorization and behavior |
| --- | --- | --- |
| `POST /v1/documents` | Streamed multipart file + optional claimed label/type; `Idempotency-Key`. `202` with document ID, version ID, job ID, state, policy/revision IDs | Upload capability; claimed labels never directly lower handling. Acknowledges after durable original + DB job registration. No parse inline. |
| `GET /v1/jobs/{job_id}` | `200` job status, stage, completed/total pages or null, warning codes, safe errors | Uploader/custodian with job visibility; no text or object keys. `Retry-After` for polling; SSE optional later. |
| `GET /v1/documents/{document_id}` | `200` authorized metadata, current version, effective label, review/publication state | Document discover/read policy. Unknown metadata is restricted too. |
| `GET /v1/documents/{id}/structure?version_id=...` | Paginated canonical nodes/table references; internal model metadata filtered | Current read/rendition scope; max page size 100; no arbitrary raw extractor dump. |
| `POST /v1/documents/{id}/classification-decisions` | Dimension, proposed label, reason code, optional protected note, `If-Match` revision; `201` pending/approved decision and new revision | Reviewer/downgrade authority; conflict `409`; required second approval represented as pending, no lower effective label yet. |
| `POST /v1/documents/{id}/quality-decisions` | Version/extraction revision, approve/reject/correct, scoped element IDs, reason, `If-Match`; `201` decision/new revision/job | Quality reviewer; corrections cannot rewrite old citations; accepted corrections reindex. |
| `POST /v1/documents/{id}/grants` | Principal/group, action, validity, expected permission epoch; `201` new epoch | Grant administrator; cannot create cross-tenant/wider-than-source chunk rights. |
| `DELETE /v1/documents/{id}/grants/{grant_id}` | Expected permission epoch; `200` updated epoch | Revoke capability; commit blocks new content before response. |
| `POST /v1/documents/{id}/versions` | New bounded file, expected current revision; `202` new version/job | Update capability; same intake checks; previous active version remains until publication. |
| `POST /v1/documents/{id}/reprocess` | Approved processing profile ID and expected version; `202` job ID | Operator/reprocess capability; idempotent config digest; client cannot select cloud provider or bypass checks. |
| `POST /v1/jobs/{id}/cancel` | Expected job revision; `202` cancellation requested | Owner/custodian with cancel capability; checkpoint fences publication. |
| `POST /v1/search` | Query ≤2,000 chars, `top_k` 1–20, allowed type/date/currency/decimal-range filters; `200` authorized hits and citations | No caller-supplied tenant/ACL predicate. All channels apply live policy; no global totals; typed numeric filters use accepted values only. |
| `GET /v1/documents/{id}/tables/{table_id}?version_id=...&rendition_id=...` | Paginated cell grid, headers, units, source refs | Rechecks document/rendition/cell dependency scope; no raw full-table expansion across restrictions. |
| `GET /v1/documents/{id}/previews/pages/{page}?version_id=...` | PNG plus immutable preview metadata; or `404` | Current read policy per request, `private,no-store`; crop parameters strictly bounded. DOCX preview separate rendered artifact if implemented. |
| `GET /v1/documents/{id}/original?version_id=...` | Authenticated attachment stream | Separate original-read capability; no inline active content or reusable original URL in search JSON. |
| `DELETE /v1/documents/{id}` | Expected revision; `202` tombstoned, deletion job/status ID | Delete capability; hold changes physical purge state, never returns deleted content to ordinary readers. |
| `GET /v1/documents/{id}/deletion-status` | `200` online purge, hold and backup expiry state | Custodian/operator; accurately distinguishes access blocking, online deletion and backup expiry. |

Example request/response shapes are design contracts; IDs/text below are synthetic:

```json
{
  "request": {
    "query": "Khoản thanh toán đợt 1 của hợp đồng mẫu là bao nhiêu?",
    "top_k": 10,
    "filters": {"document_type": ["contract"], "currency": "VND"}
  },
  "response": {
    "request_id": "req-synthetic-001",
    "hits": [{
      "document_id": "doc-synthetic-001",
      "version_id": "ver-synthetic-001",
      "chunk_id": "chunk-synthetic-001",
      "rendition_id": "rendition-raw-001",
      "snippet": "Đợt 1; Giá trị thanh toán; 125.000.000 VND",
      "citations": [{"element_id": "table-001", "page_number": 1, "table_id": "table-001", "cell_ids": ["cell-2-1"]}],
      "coverage_warnings": []
    }],
    "index_generation": "generation-001"
  }
}
```

The eventual answer endpoint is deliberately not required now. Its future contract must accept the same authorized evidence IDs, recheck policy before dispatch and release, and buffer sensitive output until the final authorization check. Never allow caller-selected system prompts or arbitrary model/tool URLs.

## Background job contracts

| Job/stage | Input references | Output / idempotency and security |
| --- | --- | --- |
| `validate_version` | Tenant/version, source artifact, policy profile | Validation manifest; permanent rejected codes or accepted probe summary; no raw bytes in queue |
| `extract_version` | Validated version, adapter/config/model digests | Raw/canonical candidates and page routes; bounded sandbox; checkpoints keyed by page/region and input/config hashes |
| `classify_and_annotate` | Canonical revision and trusted label source | Type/sensitivity proposals and PII annotations; unknown restricted; may enqueue review |
| `review_resume` | Signed reviewer decision/revision | Continues approved immutable revision; rechecks authority/current source and label |
| `extract_contract` | Enabled contract version + canonical revision | Optional candidate fields; independent status; no block on basic search when optional enrichment fails |
| `build_generation` | Approved rendition + tokenizer/chunker/embedding digest | Staged chunk/cell/embedding rows; no user visibility until complete |
| `publish_generation` | Staged generation, expected source/permission epoch and fencing token | Atomic active pointer update or conflict/retry policy gate |
| `purge_document` | Tombstoned doc + deletion ledger/hold revision | Idempotent online purge and object-version confirmation; backup expiry recorded separately |
| `sweep_expired_jobs` / `reconcile_artifacts` | Lease/manifest/DB state | Recover safe work, discard orphan output, remove crash temp; never bypass tombstone or reintroduce old generation |

Model adapters share this logical contract: accept a staged local artifact reference, requested pages/regions and a reviewed processing profile; return typed blocks/cells/source transforms/warnings, engine/model/config identity and raw quality measures. They cannot choose external services, update grants or publish indexes. A VLM adapter is disabled unless an enabled profile and local evaluation allow it.

## Implementation order and acceptance workflow

1. W01–W06 plus the smallest W09/W12/W15 subset: one synthetic digital PDF becomes a permission-checked lexical hit with a working page crop. Run actual DB-role isolation and worker-recovery tests.
2. W07–W10: native DOCX, scanned/hybrid PDFs, table fidelity, sensitivity/review/PII annotations. Use the four branch fixtures before expanding the corpus.
3. W11–W12: bilingual embedding, table rows/cells, exact vector and RRF. Run evidence-level retrieval evaluation and tokenizer/source invariants.
4. W13: transactional activation, ACL/group revocation, cancellation, deletion/purge/restore fencing. Run race tests and stale worker tests with controlled checkpoints.
5. W14 if time remains, W15 completion, W16 report/runbooks. Hold a concrete pilot review with measured results and explicit unsupported cases.

Required executable acceptance names for implementation: `upload_digital_pdf_to_authorized_hit`, `hybrid_page_preserves_scanned_clause`, `docx_merged_cell_not_double_counted`, `unknown_label_remains_restricted`, `cross_tenant_and_denied_peer_no_leak`, `pool_context_does_not_bleed`, `raw_index_denies_redacted_only_reader`, `revocation_before_release_blocks_content`, `stale_worker_cannot_publish`, `failed_new_version_preserves_active_version`, `deleted_doc_not_resurrected_after_restore`, `sandbox_cannot_egress_or_read_host_secret`, and `all_published_chunks_resolve_evidence`. These are specifications of tests to write, not executed results.

Use pytest for backend/integration/security behavior and Playwright for upload/review/search/preview workflows. Use frontend unit tests only for meaningful logic, not snapshots of trivial labels. Pin actual dependencies and provide one documented command for each test group during implementation. Do not add fake authorization mocks to make integration tests green.

## Suggested next instruction to the coding agent

> Read these eight deliverables and the schema bundle. Implement the week-1 secure vertical slice first, then continue through the must-have pilot scope in dependency order. Use only synthetic fixtures; preserve originals; block external AI and parser egress; enforce actual server-side grants and PostgreSQL RLS; isolate all parsing; retain source evidence and unknown values. Run the acceptance tests for each completed component and report measured results. Do not enable VLMs, cloud processing, field-level sanitized access, or generative answers without the defined evaluation and policy gates. Keep the current schema examples and this plan as contracts, and record any necessary design changes explicitly.
