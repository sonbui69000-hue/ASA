# Deliverable 6 — Testing and benchmarking

## Corpus and ground truth

No benchmark results are claimed here. Build a 60-document pilot set (~300 pages), with 120 carefully transcribed gold pages, 40 gold tables, 1,000 labeled numeric cells, 2,000 known synthetic PII instances, and 180 retrieval questions. These are annotation targets, not artifacts already produced. Source families and synthetic generation make gold labels affordable; reviewers still inspect render/OCR and table annotations. Expand to at least 200 documents and more real approved local holdouts before assuming broad production coverage.

Use only synthetic documents in demos, automated tests and external services. An approved confidential local evaluation set may be kept in the enterprise boundary under its original permissions, entirely outside source control and CI artifacts. Never send real secret documents, excerpts, images, entities or embeddings to a public benchmark or hosted evaluator.

| Primary stratum | Pilot docs | What must be represented |
| --- | ---: | --- |
| Simple born-digital PDFs | 10 | Headings, lists, columns, ligatures, text encoding, misleading metadata |
| Scanned PDFs | 10 | 150/300 DPI, skew/rotation, blur, stamps, diacritics, blank/photo pages |
| Hybrid PDFs | 10 | Alternating digital/scanned pages; native paragraph plus scanned clause on one page; bad hidden OCR |
| Complex DOCX | 10 | Horizontal/vertical merges, omitted cells, nested tables, headers, comments/revisions, text boxes, embedded images |
| Confidential contracts | 10 | Synthetic parties/IDs, unknown dates, amendments, conditional payment terms, signature block and signature image cases |
| Financial tables/reports | 10 | Multi-level headers, currencies, negative amounts, totals, footnotes, blank cells, cross-page continuation |

Across the set target 30 Vietnamese, 20 English and 10 mixed-language documents; these language categories are orthogonal to the primary strata. Include at least 20 with PII, 10 ambiguous layouts and every sensitivity class/unknown state. Confidentiality ground truth includes an authoritative label and business scenario; a document's text alone does not define the right sensitivity label.

Split by document/template/source family: 30 development, 10 validation, 20 held-out test. Do not put a clean export in development and a rasterized copy of the same template in test. Freeze raw bytes/hashes, annotation revision and the held-out query set before tuning thresholds. Queries: 60 Vietnamese, 60 English, 30 cross-language and 30 unanswerable; include specific amounts, header/row association, clause-to-table links, dates, names, renamed parties and misleading similar numbers. Keep per-split/per-language counts in the benchmark manifest.

Ground truth includes text, visible order, headings, table anchor cells/spans/header edges, exact numeric/date values, source boxes/OOXML locators, label authority, PII spans, expected permission decisions and relevant evidence units for each question. Two reviewers independently adjudicate critical amounts and ambiguous contract fields; record disagreement instead of forcing false precision.

## Reproducible runs

Record CPU model/cores, RAM, GPU/VRAM if any, OS/container digest, package locks, model and tokenizer hashes, OCR language assets, settings, schema/extraction/chunker versions, seeds, batch/concurrency limits, cache state, corpus and evaluator revision. Prefetch models in a controlled build environment. Run parsers with external network blocked and capture attempted egress without source payloads.

Compare independent stages before comparing whole systems:

1. Native PDF adapter vs Docling layout on the same digital gold pages; python-docx/OOXML fidelity on native DOCX gold structures.
2. Tesseract eng+vie fast/best vs a pinned conventional PaddleOCR model, with identical rasterization and preprocessing.
3. Docling table pipeline vs PP-StructureV3 and a reviewed MinerU local configuration on the same table crops/pages.
4. Only failing hard pages: conventional winner vs GraniteDocling (English subset) and PaddleOCR-VL-1.6; retain non-generative baseline output.
5. Chunking ablation: fixed token baseline, heading/clause/table aware, then optional semantic splitting. Keep embedding/retrieval settings fixed.
6. Retrieval ablation: lexical only, dense only, exact numeric/identifier paths, hybrid RRF, then optional local reranking. Compare E5-small and BGE-M3 with their own correct tokenizers/prefixes and separate index generations.

Run cold-start once and warm runs three times, randomizing order to limit cache bias. Report mean/p50/p95, peak RSS/VRAM, throughput, failures, human-review fraction and attempted network connections. Confidence intervals should be bootstrapped by **document**, not independent chunks from the same source. Compare ANN against exact authorized-neighbor results using multiple ACL selectivities. A warm single-page average is not the upload-to-search p95.

OmniDocBench provides useful text/table/formula/reading-order evaluators; its overall score is a composite, not a probability that an enterprise document is correct. It is not evidence of Vietnamese confidentiality classification or payment accuracy. Pin dataset/evaluator versions and inspect domain/language coverage. Use TEDS/TEDS-S as supplementary table metrics alongside exact critical-cell correctness. [Upstream benchmark](https://github.com/opendatalab/OmniDocBench), [independent reproducibility configuration](https://github.com/google-deepmind/gbench/blob/main/docs/evals/omnidocbench.md).

## Metrics and proposed release targets

All thresholds below are project targets to ratify on validation data; they are not achieved measurements. A failed security gate blocks confidential rollout even if quality averages pass. Report all metrics per language, format, scan quality and sensitivity, including failed pages/documents in the denominator.

| Area | Metric definition | Proposed pilot target / response to failure |
| --- | --- | --- |
| Native extraction | Character error rate: substitutions + insertions + deletions / gold characters; reading-order pair accuracy | CER ≤0.5% on supported native pages; order ≥98%. Unextractable regions flagged, not dropped. |
| OCR | CER and WER, preserving accents; separate exact ID/name/amount tests | CER ≤3% on clean scans and ≤8% on degraded supported scans; difficult pages may be reviewed. No inferred missing digits. |
| Structure | Heading/paragraph boundary F1, section-parent correctness, source locator resolution | Boundary F1 ≥0.95; 100% published chunks resolve to immutable evidence. Unsupported DOCX structure must be visible. |
| Routing | Scan/region recall, false OCR rate, blank/figure false text rate | ≥99% recall on annotated text-bearing scanned regions; zero silent omitted critical clauses in held-out cases. Publish counts and uncertainty. |
| Tables | Cell text exact match, row/column/span/header-edge F1, TEDS-S, numeric exact match | Critical accepted numeric cells ≥99.5% exact; header/span F1 ≥0.95; TEDS-S ≥0.95 on supported tables. Any wrong critical held-out cell forces review for that pattern. |
| Type | Macro-F1, per-class precision/recall, abstention/coverage | Macro-F1 ≥0.85 on supported classes, plus explicit unknown/other behavior. Rules may abstain; no pressure to force a label. |
| Sensitivity | Underclassification rate vs authoritative policy; unknown routing; unauthorized downgrade count | Zero unauthorized downgrades and 100% unknown → restricted in tests. Report machine suggestion confusion separately; do not use accuracy to authorize export. |
| PII | Span/type precision and recall; entity-level recall by class/language; whole-document miss rate | Structured ID/contact recall target ≥99%, person/address ≥95%, false positives reported. With 2,000 synthetic instances this does not prove protection on unseen data. False negatives never authorize external calls. |
| Contract fields | Exact normalized match, evidence correctness, unsupported-value rate, abstention, reviewer time | 100% non-null published fields grounded; zero invented accepted fields in test; target ≥98% precision for automated known fields, otherwise review. |
| Retrieval | Recall@10 over gold evidence units, nDCG@10, MRR; exact row/column/amount success | Recall@10 ≥0.90 overall and ≥0.85 per major language/format slice; exact table fact task success ≥0.95. ACL-denied gold is excluded from relevant set and leakage scored separately. |
| Future answers | Citation validity, citation support, unsupported claims, correct abstention | Citation resolvability 100%; critical unsupported claims zero in acceptance set. Human evidence review, not an external LLM judge. Not an MVP release dependency. |
| Performance | Upload acknowledged, queue wait, compute time, ready latency, concurrent search p95 | Starting objectives: 10-page native ≤60 s and scan ≤240 s compute p95; 10 concurrent searches ≤2 s p95 for MVP-sized corpus. Track queue delay separately; re-scope if hardware misses targets. |
| Cost | Occupied CPU/GPU wall-time, API usage if approved, storage/backup, review minutes | Report $/100 and $/1,000 documents and monthly allocation using actual page counts; compare against the explicit [cost model](research/cost-assumptions.json). |
| Reliability | Retry recovery, duplicate publication, orphan artifacts, coverage accounting | Zero duplicate active chunks; worker death recovers within 2 minutes; no `ready` generation with missing required artifacts/pages. |

The cost model link is [research/cost-assumptions.json](research/cost-assumptions.json) with [scenario calculations](research/cost-scenarios.csv). Measure actual occupied wall-time; a four-thread job is not four times the full worker hourly rate. For uncertain measures give numerators, denominators and intervals. With zero failures across `n` independent cases, a rough 95% upper failure bound is `3/n`; passing a small test does not establish zero real-world failures. Correlated pages reduce effective sample size further.

## Required security tests

| Test group | Concrete cases and expected result |
| --- | --- |
| Tenant and role isolation | Same query by allowed reader, denied peer, lower-clearance group, other tenant, disabled account and unknown-label uploader. No unauthorized text, title, filename, count, facet, similarity score, suggestion, table amount or citation. |
| RLS and query paths | Use actual runtime DB role/pool; direct allowed SQL through the service, joins, vector, FTS, table-cell filter, parent expansion, preview, export, metadata endpoints and job status. Missing context denies; pooled identity does not bleed between requests. Runtime role has no owner/superuser/BYPASSRLS path. |
| Revocation races | Revoke group/document access while search, reranking, expansion and answer buffering are paused at controlled checkpoints. After revocation commit, no newly released content; no stale cache/hit/preview. Record that previously delivered bytes remain delivered. |
| Chunk dependencies | Restricted row under a broadly shared parent/table; caption/summary includes restricted amount; overlap joins two scopes. Derived content must inherit all supporting restrictions; no broadened parent expansion. |
| Renditions and snippets | Redacted-only principal cannot search raw vectors/text/numeric facts; raw titles and counts not exposed. Mask spans across Unicode normalization and chunk boundaries. Unmasked original download stays denied. |
| Hostile file inputs | Wrong extension/polyglot, truncated PDF, encryption, PDF JS/launch/attachments, very large compressed streams, malformed cross-references, OOXML zip-slip/bomb/duplicate names/DTD/external targets/macros. Bounded rejection; no host file read, outbound request, persistent process or API worker crash. |
| Malware scanner | Harmless standard antivirus test fixture, scan timeout, definition-stale condition, archive/decompression limit hit. No status other than a completed clean scan permits acceptance. |
| Network/model supply chain | DNS/HTTP probes inside parser and model code; model downloader, remote OCR/VLM option, tracing and error reporting. Egress blocked, no credentials; missing weights fail locally. Review custom model code and artifact digests. |
| Preview and HTML | Filename/Markdown/table-cell XSS, source link SSRF, forged source ID, off-page crop, active PDF. Escaped text, safe raster proxy, tenant/version validation and original attachment gating. |
| Prompt injection | Vietnamese/English instructions in text, OCR image, table/metadata, invisible text, citations and adversarial links. No permission expansion, network/tool action, secret leakage or acceptance of fabricated source IDs. Detector success is not the only control. |
| Logs and operations | Seed synthetic canary IDs/names/bank values; inspect API/proxy/job/model/error traces, metrics labels, core dumps, temp files and CI artifacts. No content in normal logs; restricted audit intentionally records only permitted metadata. |
| Lifecycle and backup | Delete during OCR/indexing; duplicate job; stale fenced worker; reprocess old version; storage version retention; legal hold; restore snapshot predating delete. No resurrection, all online derivatives purged, backup expiry honestly tracked. |
| Queue abuse | Tenant flooding, worker OOM, lease expiration, DB unavailable, repeated parser fault. Quotas/fairness, bounded retries, no partial publication or noisy infinite loop. |

Security methodology follows layered [upload controls](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [RLS semantics](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) and [prompt-injection defenses](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html); the test cases above are our proposed application-specific acceptance suite.

## VLM promotion and final report

Only compare VLMs on a frozen hard subset identified by the baseline's development-set behavior; choose thresholds on validation data, then evaluate held-out documents. Require ≥5 percentage-point absolute gain in exact critical-cell correctness, no increase in unsupported content, complete evidence for every accepted critical field, and an approved latency/cost budget. Report fallback fraction, failures and human correction time. A prettier Markdown table is insufficient.

Publish a metadata-only report with pinned versions, corpus composition, excluded cases, metrics/intervals, quality failures, rejected formats, review load, resource peaks, throughput and cost. Restricted artifacts stay local. If a major language/format slice has too few held-out examples, label its capability unestablished and keep review enabled. No application-level tests described here have been executed by this planning task.
