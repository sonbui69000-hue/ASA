# Research evidence register

Reviewed online on 2026-11-16. Only primary documentation, upstream model cards/repositories and original papers support recommendations. No private workbook/document contents were sent to research tools. No inference API was called. Entries establish capabilities or research mechanisms, not measured Vietnamese contract performance. Version branches and licenses must be frozen and reviewed again at M00; design budgets and promotion thresholds are project choices.

| ID | Primary source | Verified scope and limits |
| --- | --- | --- |
| S01 | [Docling document model](https://docling-project.github.io/docling/concepts/docling_document/) | Structured document and provenance model; application-owned canonical schema still needed. |
| S02 | [Docling advanced options](https://docling-project.github.io/docling/usage/advanced_options/) | Offline assets, optional remote features and conversion limits; network denial is separate. |
| S03 | [Docling confidence](https://docling-project.github.io/docling/concepts/confidence_scores/) | Scores/grades differ; table score is documented as unimplemented on review date. |
| S04 | [python-docx tables](https://python-docx.readthedocs.io/en/latest/user/tables.html) | Merged and omitted cells complicate grid traversal; plain row iteration is insufficient. |
| S05 | [pdfplumber](https://github.com/jsvine/pdfplumber) | Native PDF geometry/table tooling; no automatic guarantee for scans. |
| S06 | [Tesseract language data](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html) | English and Vietnamese traineddata exist; accuracy must be evaluated locally. |
| S07 | [PaddleOCR upstream](https://github.com/PaddlePaddle/PaddleOCR) | Current README includes PP-OCRv6, PP-StructureV3, VL-1.6 and HPD-Parsing. Reported speed/accuracy are upstream claims, not our measurements. Model-specific Vietnamese coverage must be checked. |
| S08 | [MinerU license](https://github.com/opendatalab/MinerU/blob/master/LICENSE.md) | Apache base with added commercial-threshold/attribution provisions at current HEAD; not plain Apache, not a legal suitability opinion. |
| S09 | [E5-small model card](https://huggingface.co/intfloat/multilingual-e5-small) | MIT, multilingual dense representation, 384 dimensions, prefixes and 512-token limit; not application answerability calibration. |
| S10 | [BGE-M3 model card](https://huggingface.co/BAAI/bge-m3), [M3 paper](https://arxiv.org/abs/2402.03216) | Dense/sparse/multivector multilingual candidate; separate quality/resource evaluation for each mode. |
| S11 | [BGE reranker model card](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Multilingual cross-encoder, Apache-2.0; sigmoid score is not validated factual-support probability. |
| S12 | [PostgreSQL ranking](https://www.postgresql.org/docs/current/textsearch-controls.html), [dictionaries](https://www.postgresql.org/docs/current/textsearch-dictionaries.html) | FTS ranking/dictionary mechanisms; `ts_rank_cd` is not BM25. |
| S13 | [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | Default deny when enabled without policies, role/owner exceptions and command semantics. |
| S14 | [pgvector](https://github.com/pgvector/pgvector) | Exact/ANN vectors, filtered recall considerations, iterative scans and multitenancy caveats. |
| S15 | [SELECT locking](https://www.postgresql.org/docs/current/sql-select.html), [explicit locks](https://www.postgresql.org/docs/current/explicit-locking.html) | SKIP LOCKED is a queue primitive, not full task durability or response revocation. |
| S16 | [RRF original paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) | Rank-list fusion; no task-independent superiority guarantee. |
| S17 | [Fusion function analysis](https://arxiv.org/abs/2210.11934) | Convex score fusion is a credible challenger; RRF parameters also need validation. |
| S18 | [MMR original paper](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf) | Relevance/diversity tradeoff; may discard similar but legally distinct clauses. |
| S19 | [ColBERT](https://arxiv.org/abs/2004.12832) | Token-level late interaction; original evaluations do not establish Vietnamese quality. |
| S20 | [SPLADE](https://arxiv.org/abs/2107.05720) | Learned sparse expansion; original research is not proof of a bilingual model/license fit. |
| S21 | [HyDE](https://arxiv.org/abs/2212.10496) | Hypothetical passage embeddings can improve retrieval; hypothetical text contains invented details and is never evidence. |
| S22 | [Query rewriting](https://arxiv.org/abs/2305.14283) | Rewrite-retrieve-read mechanism; may alter identifiers or intent. |
| S23 | [Contextual retrieval](https://www.anthropic.com/research/contextual-retrieval) | Author's contextual indexing experiment; no authorization to call that vendor's API or transfer claimed gains. |
| S24 | [GraphRAG](https://arxiv.org/abs/2404.16130) | Graph/community summaries for corpus-level questions; generated summaries bring provenance and ACL dependencies. |
| S25 | [RAPTOR](https://arxiv.org/abs/2401.18059) | Recursive summary tree; useful research alternative to plain children, requires summary correctness/security evaluation. |
| S26 | [Self-RAG](https://arxiv.org/abs/2310.11511), [CRAG](https://arxiv.org/abs/2401.15884) | Adaptive/critique approaches; trained models and web fallback in research are not launch requirements here. |
| S27 | [ColPali](https://arxiv.org/abs/2407.01449), [upstream ColVision](https://github.com/illuin-tech/colpali) | Visual page retrieval reduces dependence on text parsing; does not supply exact accepted amounts or fine-grained citations by itself. |
| S28 | [Late chunking](https://arxiv.org/abs/2409.04701) | Embedding before chunk pooling requires compatible long-context token representations; cannot be simulated by concatenating E5 vectors. |
| S29 | [Dense X Retrieval](https://arxiv.org/abs/2312.06648) | Proposition granularity candidate; generated atomic statements must retain qualifiers/evidence. |
| S30 | [RankLLM](https://github.com/castorini/rank_llm) | Listwise reranking toolkit and local-model routes; ordering and resource costs need separate tests. |
| S31 | [VnCoreNLP](https://github.com/vncorenlp/VnCoreNLP), [PhoBERT paper](https://arxiv.org/abs/2003.00744), [PhoNLP paper](https://arxiv.org/abs/2101.01476) | Vietnamese NLP/NER alternatives; task/corpus and pinned artifact licensing need inspection. |
| S32 | [Presidio language extension](https://github.com/data-privacy-stack/presidio/blob/main/docs/analyzer/languages.md) | Recognizers/language setup must be configured; English defaults do not establish Vietnamese PII coverage. The former Microsoft language URL returned 404 and was replaced with this upstream source. |
| S33 | [OWASP file upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Layered validation, storage and execution controls; not a substitute for sandbox tests. |
| S34 | [OWASP prompt injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | Untrusted-source/tool/output boundaries; detectors/delimiters alone cannot guarantee prevention. |
| S35 | [ParadeDB](https://github.com/paradedb/paradedb) | Postgres BM25 extension candidate; Community currently declares AGPL-3.0, Enterprise commercial. RLS/statistics semantics must be tested. |
| S36 | [Lost in the Middle](https://arxiv.org/abs/2307.03172) | Long-context position sensitivity motivates bounded context-order experiments; not a prediction for every current model. |

Unavailable or unrelated search hits were not used as technical evidence. No paid price comparison is necessary for this local-only architecture; earlier cost rows remain illustrative historical assumptions. All local latency/RAM/quality expectations in revision 2 are explicitly unmeasured targets.

## Reconciliation source checks, 2026-11-16

The repair rechecked four primary technical sources; the earlier extraction/model research above is retained, not claimed rerun. No document/workbook content was submitted to browsing or inference.

| ID | Primary evidence / confirmed mechanism | Design inference and limit |
| --- | --- | --- |
| S37 | [PostgreSQL18 advisory locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS): session locks end when the session ends. | HR03: SQL lock ownership alone does not fence an independently live transport. S05 singleton serialization is our design, not a PostgreSQL feature. |
| S38 | [ASGI response body send](https://asgi.readthedocs.io/en/latest/specs/www.html#response-body-send-event): transport handoff/completion has protocol semantics. | Handoff is not recipient delivery or a permission fence; actual bounded enqueue integration needs T03. |
| S39 | [PostgreSQL18 JSON constraints](https://www.postgresql.org/docs/18/datatype-json.html): JSONB Unicode handling has NUL/surrogate constraints. | HR07 unicode-pg-v1 is a stricter project prehash policy. Narrow local PostgreSQL18.4 probes confirm examples, not production compatibility/security. |
| S40 | [PostgreSQL18 query construction](https://www.postgresql.org/docs/18/textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES): query constructors differ in term/phrase/operator behavior. | HR09 vi-en-or-v1 explicitly builds bounded OR of safe nodes; its Vietnamese quality still needs E02/T09. |

No new parser/model/version recommendation was made from browsing. Installed PostgreSQL18.4 was used only for disposable synthetic SQL probes; it is not a reviewed production patch pin. Reconciliation effects, budgets, utility thresholds and review staffing are project contracts/hypotheses, not facts supplied by these sources. Independent review evidence/check results were examined as finite counterexamples/arithmetic, not accepted as deployed exploits or benchmark results.
