# Synthetic schema examples

These ten JSON files illustrate nine record kinds; parsed-document and parsed-docx show the two provenance branches. They are hand-authored specification examples, not extraction/model/benchmark output. No original PDF/DOCX exists for these examples. Zero SHA-256 values, source byte counts, coordinates, IDs and timestamps are illustrative. Monetary values and names are synthetic.

The document waits for sensitivity review and remains restricted. The chunk is staged: tokenizer count, model revision, embedding input hash and vector reference stay null because no model ran. It must not be published. The contract's payment installment does not imply the whole contract value; that field and absent dates remain unknown. Confidence stays unavailable rather than inventing model scores. `accepted` synthetic cell/field values describe the proposed gold record shape, not an executed approval workflow.

PDF text offsets use NFC Unicode code points, and table evidence identifies anchor cells. DOCX page number and all PDF geometry are null; its OOXML locator is the citation. Artifact keys are internal examples and are not search API fields.

Validate against [the schema bundle](../schemas/ragplan.schema.json) with a Draft 2020-12 validator and format checking enabled. Cross-record IDs, spans, source geometry, table occupancy/header relationships, accepted-field evidence, policy monotonicity and exact tokenizer/vector metadata still require semantic checks; a schema cannot prove factual correctness or authorization.
