# Research source register

Retrieved/reviewed for this plan on **2026-11-15**. Links are primary project documentation, repositories, publisher model cards, or benchmark/paper sources. Dynamic pages describe what was visible during research, not immutable deployment pins. The linked source establishes only the capabilities/terms noted; our hardware budgets, routing thresholds, release criteria and implementation schedule are engineering proposals.

No enterprise document, excerpt, image or embedding was submitted to an external inference service. Research browsing used public technical queries. This register is not a package vulnerability audit, license opinion, provider data-processing approval or executed local performance benchmark.

## Intake, parser and structure evidence

| ID | Source | Evidence used / important limit |
| --- | --- | --- |
| S01 | [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Layered format, size, storage and scanning controls. No single MIME/extension check establishes safety. |
| S02 | [Python XML security](https://docs.python.org/3/library/xml.html) | XML expansion/resource and external-resource risks. Actual protection also depends on the linked runtime/parser version. |
| S03 | [ClamAV configuration](https://docs.clamav.net/manual/Usage/Configuration.html) | Scanner/definition configuration and operational setup; antivirus is not a hostile-parser sandbox. |
| S04 | [Docling repository](https://github.com/docling-project/docling) | Local document conversion, PDF/DOCX and structured output; MIT toolkit. Dependency/weight rights remain separate. |
| S05 | [Docling advanced options](https://docling-project.github.io/docling/usage/advanced_options/) | Offline asset prefetch, explicit remote-service opt-in, resource/document limits and parser/model thread settings. Remote opt-in is not a complete network firewall. |
| S06 | [Docling document model](https://docling-project.github.io/docling/concepts/docling_document/) | Hierarchy, text/tables, provenance and optional layout; absence of layout for a source cannot be repaired by inventing it. |
| S07 | [Docling confidence scores](https://docling-project.github.io/docling/concepts/confidence_scores/) | Quality grades, internal score caveats and currently unimplemented table score. Not a calibrated correctness probability for our documents. |
| S08 | [Docling chunking](https://docling-project.github.io/docling/concepts/chunking/) | Hierarchical/token-aware chunking and context serialization. Application ACL/dependency checks are our design. |
| S09 | [pypdfium2 repository](https://github.com/pypdfium2-team/pypdfium2) | PDFium Python binding, rendering/extraction and Apache/BSD licensing with dependency notices. Review the actual binary distribution. |
| S10 | [pdfplumber repository](https://github.com/jsvine/pdfplumber) | Character/geometry/table access, MIT; best suited to machine-generated PDFs, not an OCR replacement. |
| S11 | [pypdf text extraction discussion](https://pypdf.readthedocs.io/en/stable/user/extract-text.html) | PDF semantic/order ambiguity, scan/OCR distinction and decompressed-content memory concerns. Metadata cannot prove original authoring format. |
| S12 | [pypdf license](https://github.com/py-pdf/pypdf/blob/main/LICENSE) | Permissive BSD-style conditions; validate the selected release and dependencies. |
| S13 | [PyMuPDF licensing documentation](https://pymupdf.readthedocs.io/en/latest/about.html) | AGPL/commercial alternatives. This plan does not make a blanket conclusion about internal enterprise legal obligations. |
| S14 | [python-docx documentation](https://python-docx.readthedocs.io/en/latest/) | Native Word object/API coverage; supplement where OOXML features are not exposed. |
| S15 | [python-docx table semantics](https://python-docx.readthedocs.io/en/latest/user/tables.html) | Merged and omitted cells; uniform row iteration can repeat merged values. |
| S16 | [python-docx license](https://github.com/python-openxml/python-docx/blob/master/LICENSE) | MIT project license. |
| S17 | [Tesseract repository](https://github.com/tesseract-ocr/tesseract) | Local OCR engine and Apache-2.0 code license; no enterprise accuracy guarantee. |
| S18 | [Tesseract language data](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html) | `eng` and `vie` trained data across model sets. Coverage does not establish clean/degraded Vietnamese CER. |
| S19 | [OCRmyPDF security](https://ocrmypdf.readthedocs.io/en/latest/pdfsecurity.html) | Malware/sanitization disclaimers, password/encryption limitations, signature-image vs digital-signature behavior. |
| S20 | [OCRmyPDF license](https://github.com/ocrmypdf/OCRmyPDF/blob/main/LICENSE) | MPL-2.0 project terms; external executables have independent terms. |
| S21 | [PaddleOCR repository and updates](https://github.com/PaddlePaddle/PaddleOCR) | Current project includes conventional PP-OCRv6, PP-StructureV3 and VL-1.6. Reported vendor benchmark gains are not our results. Apache-2.0 project. |
| S22 | [PaddleOCR multilingual recognition](https://www.paddleocr.ai/latest/en/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.html) | Explicit Vietnamese support in the documented multilingual model family. Match language coverage to the exact chosen model version. |
| S23 | [PaddleOCR conventional OCR API](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html) | Language codes including `vi`, model/backend settings; CPU compatibility depends on the chosen conventional stack. |
| S24 | [PaddleOCR-VL-1.6 model card](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6) | Specialist 0.9B model, structured outputs and Apache-2.0 card. Review custom runtime code; no assured local Vietnamese contract score. |
| S25 | [GraniteDocling 258M model card](https://huggingface.co/ibm-granite/granite-docling-258M) | Apache-2.0, English-tagged specialist and limitations. Vietnamese capability is unestablished here; suggested trial RAM/VRAM is our budget. |
| S26 | [MinerU current repository/requirements](https://github.com/opendatalab/MinerU) | Current local tiers include ONNX CPU and ONNX+llama.cpp options and accelerated paths. Do not import stale GPU-only assumptions from older releases. |
| S27 | [MinerU current license text](https://github.com/opendatalab/MinerU/blob/master/LICENSE.md) | Apache-based terms with additional commercial thresholds and attribution. Current text cites consolidated affiliate thresholds; review exact release/weights and enterprise context. |

## Classification, privacy, embedding and platform evidence

| ID | Source | Evidence used / important limit |
| --- | --- | --- |
| S28 | [Presidio project](https://github.com/data-privacy-stack/presidio) | Local customizable PII tooling, MIT; current repository is under data-privacy-stack stewardship. Historical Microsoft URLs may redirect or fail. |
| S29 | [Presidio language extension](https://github.com/data-privacy-stack/presidio/blob/main/docs/analyzer/languages.md) | Default English setup; other languages need NLP and recognizer/context configuration. This is not turnkey Vietnamese PII coverage. |
| S30 | [Presidio FAQ](https://presidio.dataprivacystack.org/faq/) | Automated detection misses sensitive data and needs local customization; no guarantee of complete detection. |
| S31 | [VnCoreNLP repository](https://github.com/vncorenlp/VnCoreNLP) | Vietnamese segmentation/NER toolkit and Java interface; useful candidate, not a complete privacy classifier. |
| S32 | [VnCoreNLP license](https://github.com/vncorenlp/VnCoreNLP/blob/master/LICENSE.md) | GPL-3.0-or-later terms. An optional adapter does not remove the need to review deployment/distribution obligations. |
| S33 | [scikit-learn text feature extraction](https://scikit-learn.org/stable/modules/feature_extraction.html) | Conventional text-vector features for a lightweight later classifier. Training data and rule design are not supplied by this documentation. |
| S34 | [scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html) | Probability calibration and reliability evaluation; a raw engine score is not automatically a calibrated probability. |
| S35 | [multilingual-e5-small model card](https://huggingface.co/intfloat/multilingual-e5-small) | MIT, 384 dimensions, query/passage prefixes and 512-token truncation limit. Our 480-token total budget is a conservative design choice. |
| S36 | [BGE-M3 model card](https://huggingface.co/BAAI/bge-m3) | MIT multilingual model, 1,024 dimensions and long-input capabilities. Longer input does not imply better enterprise chunks. |
| S37 | [BGE reranker v2 M3 model card](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Apache-2.0 multilingual relevance scoring. A relevance score is not evidence confidence. |
| S38 | [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | Default denial with enabled policies, role/owner/superuser exceptions and forced RLS semantics. Application identity context remains trusted. |
| S39 | [PostgreSQL SELECT/locking](https://www.postgresql.org/docs/current/sql-select.html) | `SKIP LOCKED` behavior suitable for queue consumers. Leases, fencing, retries and a reaper are application responsibilities. |
| S40 | [PostgreSQL full-text search](https://www.postgresql.org/docs/current/textsearch-intro.html) | Lexical indexing/ranking architecture; native FTS must not be described as BM25 by default. |
| S41 | [pgvector repository](https://github.com/pgvector/pgvector) | Exact/ANN search, iterative filtered scans since 0.8.0, dimension types and multitenancy recall effects. Live RLS/ACL enforcement is still necessary. |
| S42 | [Qdrant repository](https://github.com/qdrant/qdrant) | Apache-2.0 vector service; default quickstart warns about insecure exposure. Additional service/ACL synchronization is a project cost. |
| S43 | [Celery task semantics](https://docs.celeryq.dev/en/stable/userguide/tasks.html) | Acknowledgments, idempotency and worker-loss exceptions. Switching queues does not create exactly-once processing. |
| S44 | [Valkey repository](https://github.com/valkey-io/valkey) | BSD-3-Clause key-value server; client/broker compatibility with the chosen Celery stack requires testing. |
| S45 | [FastAPI BackgroundTasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) | In-process background mechanism and heavier-work caveat. It is not selected as the persistent OCR queue. |
| S46 | [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) | Reusable time-limited capabilities; application ACL revocation does not automatically reauthorize each use. AWS is not implied to be an approved storage destination. |
| S47 | [S3 object versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) | Delete markers and retained versions; physical purge must account for versions and lifecycle. |
| S48 | [Google Document AI pricing](https://cloud.google.com/products/document-ai/pricing) | Gross OCR $1.50/1,000 pages and Layout Parser $10/1,000 pages as displayed; allowances, discounts/add-ons/regions can change actual bills. |
| S49 | [Google Document AI processor/language list](https://docs.cloud.google.com/document-ai/docs/processors-list) | OCR includes Vietnamese; processor features/versions differ. No approved disclosure policy is inferred. |
| S50 | [Google Gemini layout parser](https://docs.cloud.google.com/document-ai/docs/layout-parse-chunk) | Current managed layout path uses OCR and generative parsing capabilities. Cloud egress/privacy terms are separate from extraction utility. |
| S51 | [Amazon Textract current limits](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html) | Current OCR language/feature limits; Vietnamese is not listed. Historical blanket six-language statements are out of date for all current OCR operations. |
| S52 | [OmniDocBench](https://github.com/opendatalab/OmniDocBench) | Public extraction/table/reading-order evaluation and changing benchmark versions. Aggregate scores do not validate Vietnamese confidentiality/contract workflows. |
| S53 | [Google DeepMind gbench OmniDocBench configuration](https://github.com/google-deepmind/gbench/blob/main/docs/evals/omnidocbench.md) | Reproducible evaluator/dataset revision practice and metric scope. It is not a direct evaluation of our pipeline. |
| S54 | [OWASP prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | Indirect/multimodal/RAG attacks and layered mitigations. Prompt formatting/detectors do not constitute authorization. |
| S55 | [Docling technical paper](https://arxiv.org/abs/2501.17887) | Background on specialized layout/table conversion; historical paper is not a current hardware/performance guarantee. |
| S56 | [BGE-M3 paper](https://arxiv.org/abs/2402.03216) | Multilingual/multifunction embedding method; evaluate present model artifacts and local queries. |
| S57 | [PaddleOCR 3.0 technical report](https://arxiv.org/abs/2507.05595) | Background on OCR/layout/key-information stages; later PP-OCRv6/VL releases require current documentation as well. |

## What was not established by public research

No common benchmark establishes which candidate wins on our exact Vietnamese/English contracts, financial tables, OCR quality, CPU host and permissions. No API latency, local RAM/VRAM peak, CER, table exactness, PII recall or retrieval score in this plan is measured. Hardware ranges are trial reservations; cost timings and hourly rates are explicit assumptions. No cloud provider's contract/region/subprocessor/retention terms have been approved for enterprise data. The plan therefore selects a replaceable local baseline and a reproducible evaluation, not a universal tool ranking.

Deployment lock artifacts still to produce during implementation: exact Python/OS/parser versions, container digests, OCR data/model/tokenizer commit hashes, license/notice manifests, model custom-code review, vulnerability scan results and selected DB/extension compatibility. Floating `latest`, upstream `main` and a mutable model name are not production pins.
