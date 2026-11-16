# Planning artifact verification

This file records checks on the documentation, schemas and synthetic examples. It does not assert that the proposed application, extraction pipeline or security architecture is implemented or tested.

Verification date: **2026-11-15**. Final local artifact checks passed with the limitations below.

| Check actually executed | Result |
| --- | --- |
| Parse all delivered JSON with Python's JSON parser | 12 files parsed successfully |
| Apply a local checker for schema keywords used in this bundle | All 10 synthetic examples accepted |
| Resolve local schema references | 205 references resolved; no external schema fetch required |
| Inspect object-schema required/property consistency | 42 object schema shapes checked |
| Negative mutations against schema constraints | 16 invalid cases rejected |
| Resolve example source references and Unicode spans | 41 source references checked against example elements; NFC text and span bounds checked |
| Validate page geometry, parent/relation IDs, table occupancy and headers | Passed; merged table covers six grid positions without duplicate anchors |
| Verify the PII example's exact source substring | Resolves to the intended synthetic name |
| Preserve unknown contract total despite a known payment installment | Passed; contract total remains null |
| Prevent illustrative data from claiming computed embeddings/publication | Staged chunk has pending embedding/null model metadata; document has no active generation |
| Recompute cost scenario arithmetic from assumptions | All 16 scenarios match within $0.000001 rounding tolerance |
| Check reserved CPU/GPU monthly arithmetic | $87.60 CPU; $117.60 CPU + allowance; $547.50 GPU at stated assumed rates |
| Sum component-level implementation effort | 16 work items total 320 planned hours; roadmap reserves 80 additional hours |
| Check source-register entry count | 57 entries |
| Check local Markdown file links | No broken local file links |
| Check deliverable code-fence pairing and accidental research placeholders | Passed |

Negative cases covered: a non-null unknown date; known field without evidence; invented DOCX page; weakened unknown handling; enabled external processing; excessive token budget; computed embedding without metadata; running job without a lease; content added to audit; zero merged-cell span; calibrated probability without a calibration ID; missing PDF page; wrong contract field value type; weakening an approved restricted label; pseudonymization without a vault reference; and sensitivity used as a document-type enum.

The checks used a temporary standard-library verification program at `/tmp/ragplan-verify.py`. It evaluates the reference, type, object, array, string, numeric, format, composition and conditional keywords present in this bundle, plus separate example semantics. It is **not a full or certified Draft 2020-12 validator** and does not establish complete JSON Schema conformance. Python `jsonschema`/`referencing` and Node Ajv were unavailable. An attempt to install `jsonschema` into a temporary directory failed because this environment could not resolve PyPI; no application dependencies were added to the workspace.

During implementation, add a maintained Draft 2020-12 validator to CI, run its metaschema check and validate each example with date/date-time format checking enabled. Repeat semantic checks in the application: schema validity cannot prove authorization, literal OCR correctness, complete PII protection, source hashes, renderer safety or tokenizer/vector correctness.

Not executed or claimed: original PDF/DOCX extraction, OCR/model inference, real tokenizer counts, measured hardware/resource use, retrieval benchmarks, load tests, malware penetration testing, SSO/RLS application tests, backup recovery of a deployed service, cloud inference or any application implementation. The evaluation design and acceptance gates specify that later work. Synthetic example hashes/byte counts/coordinates are illustrative and are explicitly labeled in [the example notes](../examples/README.md).
