# Deliverable 4 — Data model and output schemas

## Storage representation

Use application-owned structured JSON as the canonical extraction representation. Preserve original files and raw extractor JSON separately. Markdown is useful for prose context and review; HTML tables represent merged cells in previews/context; neither is a sufficient sole source of provenance, access policy or table identity. JSON holds ordered elements, heading hierarchy, cells/spans, relationships, source locations, warnings and versions. [Docling's source model](https://docling-project.github.io/docling/concepts/docling_document/) is a useful adapter, not our database contract.

The [Draft 2020-12 schema bundle](schemas/ragplan.schema.json) defines nine requested records plus shared types. Each top-level record is selected by `kind`; `$defs` exposes the individual contracts. All examples are synthetic. Opaque readable example IDs satisfy the same string contract; production IDs must be server-generated, globally unique random identifiers, never derived from names or source filenames.

| Requested output | Bundle definition | Example | Meaning |
| --- | --- | --- | --- |
| Document metadata | `document` | [document.json](examples/document.json) | Logical document, immutable source version, current publication and handling |
| Classification | `classification` | [classification.json](examples/classification.json) | Type proposal, sensitivity claims/proposal/approval/effective handling |
| Parsed structure | `parsed_document` | [parsed-document.json](examples/parsed-document.json) | Pages/elements/relationships plus a separate [DOCX locator example](examples/parsed-docx.json) |
| Tables | `table` | [table.json](examples/table.json) | Anchor cells, spans, headers, typed values and provenance |
| Contract fields | `contract` | [contract.json](examples/contract.json) | Independent fields with unknown/ambiguous/known status and evidence |
| PII/sensitivity annotation | `pii_annotation` | [pii-annotation.json](examples/pii-annotation.json) | Entity/secret region, detector confidence and rendition action |
| Chunk and references | `chunk` | [chunk.json](examples/chunk.json) | Contextualized retrieval projection tied to exact sources |
| Processing job | `job` | [job.json](examples/job.json) | Durable phase, lease, retry, checkpoints and safe failure code |
| Audit event | `audit_event` | [audit-event.json](examples/audit-event.json) | Actor/action/policy revision without document text or raw entity values |

The schema intentionally excludes binary originals, images and actual vector arrays. Those live in blob storage or a dimension-checked DB embedding column; the chunk schema describes the embedding reference. Pending staged chunks may have null token counts, model revisions and embedding hashes; computed/published chunks require measured tokenizer metadata and computed vectors. Schema validation cannot establish factual accuracy, authorized access, absence of PII, foreign-key integrity, coordinate transforms or a valid table topology. Those need explicit semantic checks.

## Source references and normalized offsets

Every reference includes document ID, source version, extraction revision and element ID. PDF references have physical one-based `page_number`, a box in points, page size and the common coordinate convention: top-left origin, upright visible CropBox, x right and y down. Store the transform back to the original PDF/page rotation for rotated/cropped pages. DOCX references instead have `page_number: null`, part and OOXML locator; an optional rendered preview is a different source artifact and never an asserted original page.

`span.start`/`end` are zero-based, half-open **Unicode code-point offsets** in the immutable NFC element text. They are not UTF-8 byte offsets or JavaScript UTF-16 indices. Rendering adapters must translate. `original_text` and offset maps remain in raw artifacts; normalization changes or reviewer corrections create a new extraction revision. Evidence text comes from source spans/cells; the model does not supply a free-form supporting quote as a substitute for resolving them.

Table row/column coordinates are zero-based, spans positive, and each merged cell is stored once at its anchor. Header relations use cell IDs; blank and missing/omitted cells differ. In a table passage, include row labels, header paths, units, currency, footnotes and associated clause references. Link cross-page table segments with `continuation_of` and preserve physical segment locators; do not merge solely because column counts match.

The [table example](examples/table.json) includes a merged header, synthetic payment row, decimal VND amount and source boxes. A `numeric_value` uses a decimal string with a declared unit/currency, never binary float or an assumed currency. Empty/ambiguous cells retain raw text and null typed values. Rendering repeats inherited headers for retrieval without multiplying numeric facts.

## Confidence and fields

The shared `confidence` type stores engine score, scale, grade, optional calibrated probability and calibration revision. Null means unavailable. A rule score or OCR token score is not a probability. Keep conversion quality, classification likelihood, source-grounding quality and human approval distinct. In particular, do not fill table confidence from a tool's unimplemented table metric. [Docling confidence caveats](https://docling-project.github.io/docling/concepts/confidence_scores/).

A contract field is an observation, not automatically an accepted business fact. `unknown`, `ambiguous`, and `not_applicable` require null `value`; ambiguous alternatives live in candidate records. `known` requires a typed non-null value and evidence. Validation status is independent: `needs_review` candidates must not drive trusted financial filters/aggregates; exact numeric filters only use fields/cells meeting the selected validation policy. `not_applicable` requires an explicit rule/reviewer reason. Missing values never become empty strings, zero amounts, inferred dates or a false signature-validity flag.

Contract fields are enumerated for title, number, parties, effective/expiration dates, payment obligations, value, renewal, termination, signatories, clauses and appendix/table links. Clause/party arrays are typed; individual array members carry evidence. The contract stage has its own enabled/status/revision fields and can remain absent entirely for other document types.

## Relational schema specification

This is a migration design, not an executed migration. IDs below are opaque `text` with a maximum 128-character check and unique server generation. Every tenant-owned table has `tenant_id NOT NULL`; composite foreign keys include tenant ID to prevent cross-tenant linkage. Do not depend on an application query convention to achieve this.

| Table | Primary/unique keys and principal columns | Rules and indexes |
| --- | --- | --- |
| `tenants` | `id`, identity-provider organization, config/policy revision | Trusted provisioning only |
| `principals`, `groups`, `memberships` | `(tenant_id,id)`; membership validity/revision | Identity mappings sourced from enterprise identity; index membership principal/group |
| `documents` | `(tenant_id,id)`; owner/custodian, department, title, approved/proposed/effective sensitivity, `permission_epoch`, `active_version_id`, `active_generation_id`, `deleted_at`, retention/hold | RLS; current-pointer constraints; title is protected content |
| `document_versions` | `(tenant_id,id)`; `document_id`, version ordinal, source hash/key/bytes/MIME, created actor/time, state | Unique `(tenant_id,document_id,ordinal)`; source object immutable |
| `artifacts` | `(tenant_id,id)`; version, extraction revision, kind, blob key, SHA-256, producer/config digests, bytes | Unique artifact logical key; never overwrite a cited revision |
| `classification_decisions` | `(tenant_id,id)`; version, dimension, proposal/approval/effective label, confidence JSONB, evidence, reviewer and reason code | Append-only revisions; current decision pointer; no destructive override |
| `document_grants` | Tenant/doc/principal-or-group/action, validity/revision | Separate capabilities: read/search original, review, relabel, export, delete; clearance/department checks additional |
| `renditions` | `(tenant_id,id)`; version/extraction revision, `raw`/`sanitized`, transformation revision, policy scope, publication state | Raw and sanitized indexes never share a reader-visible projection |
| `elements`, `element_relations` | Tenant/rendition/element ID; kind, parent, order, text, section path, source JSONB, quality; relation endpoints/type | RLS; index version/parent/order; canonical blob is authority, rows are query projections |
| `tables`, `table_cells` | Table ID and cell ID; anchor row/col, spans, header IDs, raw text, decimal `numeric(38,10)`, currency, units, dates, source, validation state | Index tenant/rendition/table/row; partial indexes on approved numeric/date values; geometry checked in application |
| `contract_extractions`, `contract_fields` | Version/extraction/enrichment revision; field key/item ordinal, status, typed JSONB, evidence, validation/reviewer | Only accepted known values used as authoritative query filters |
| `sensitive_annotations` | Tenant/rendition/annotation ID; entity type, element/span/box, detector/version, action, confidence | No raw entity in ordinary telemetry; same ACL as source |
| `pseudonym_mappings` | Tenant/key revision/token; encrypted mapping reference and purpose | Separate role and key access; no search-reader access; optional stage |
| `index_generations` | `(tenant_id,id)`; rendition, chunker/parser/tokenizer/embedding revisions, state, counts/digests | Atomic publication via document pointers; retired generations not queryable |
| `chunks`, `chunk_sources`, `chunk_restrictions` | Tenant/generation/chunk ID; parent, text, section/table projection, token count, lexical tsvector; source refs and optional narrowing scopes | RLS; GIN lexical index; btree generation/parent; dependencies retain strongest scope |
| `chunk_embeddings_e5` | Tenant/generation/chunk ID, model revision, input hash, `vector(384)` | Same RLS via chunk join; no embeddings exposed via API; cosine exact first |
| `processing_jobs`, `job_checkpoints` | Tenant/job ID; version, stage, status, attempts, schedule, lease owner/token/expiry, safe error, checkpoint hashes | Unique active idempotency scope; partial ready queue index on `(available_at,priority)` and expired-lease index |
| `audit_events`, `deletion_ledger` | Event sequence/ID, tenant, actor, action, target opaque IDs, request ID, policy epochs, outcome/reason code, timestamp | Append-only service grants; external audit retention/export; deletion replay before restore serves traffic |

An embedding-model change uses a separate dimension-specific table/generation (e.g. `vector(1024)` for BGE-M3), a full rebuild and an atomic switch. Never mix 384/1,024 dimensions or vectors from different model revisions in one ranked channel. PostgreSQL JSONB is for flexible evidence/annotations, not a reason to store every security relation as an unindexed JSON array. [pgvector types/index behavior](https://github.com/pgvector/pgvector).

For MVP, `chunk_restrictions` can be empty and document-level grants govern all chunks. Its authorization path must nevertheless support narrowing before enabling section-level access. A restricted region's heading, table headers, parent passage or synopsis can disclose it; compute dependency scope for every derived chunk. Field-level retrieval is deferred until approved sanitized renditions and mixed-scope tests exist.

Recommended policy predicate in words: live tenant membership AND nondeleted document AND active published generation AND allowed rendition AND document action grant AND department/purpose/clearance requirements AND every chunk-specific restriction. Unknown effective handling uses restricted clearance. Parent expansion and SQL numeric results use the same predicate. ACL checks cannot be optional filter fields in a search request.

Enable and force RLS on tenant content and projection tables. Use a separate migration owner, runtime reader role and constrained worker writer role; workers do not get broad read access via the API. Explicitly revoke public/schema/default grants and test privilege changes. Schema owners/superusers can bypass ordinary row policies, so backups, maintenance and admin access remain privileged operations. [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Storage keys and manifests

```text
quarantine/<tenant-id>/<upload-id>/input
originals/<tenant-id>/<document-id>/<version-id>/source
derived/<tenant-id>/<document-id>/<version-id>/<extraction-revision>/
  manifest.json
  extractor/<adapter-id>/raw.json
  canonical/document.json
  canonical/tables/<table-id>.json
  previews/pages/<page-number>.png
  normalization/offset-map.json
  enrichments/<enrichment-revision>/contract.json
  renditions/<rendition-id>/document.json
  renditions/<rendition-id>/transform-manifest.json
  indexes/<generation-id>/chunk-manifest.json
```

Object keys never contain party names or filenames; manifests record source/artifact hashes, producing versions and permitted scope. Temp input/output directories are job-scoped and deleted on success/failure; persistent source files stay in original storage. Do not duplicate originals into index payloads or a queue. Queue records reference IDs only. Raster preview artifacts carry original sensitivity.

Object and SQL state are coordinated with staged writes plus durable manifests and an orphan reconciler; there is no assumed distributed transaction between PostgreSQL and storage. Publication requires all manifest references and hashes to exist. Deletion tracks every storage version, index generation and derivative, including pseudonym vault records and backup retention. [S3 version semantics](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).
