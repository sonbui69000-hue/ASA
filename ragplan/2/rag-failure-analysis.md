# End-to-end design simulations and adversarial review

Date: 2026-11-16. These are **design walkthroughs**, not executed ingestion/browser/model tests. Each scenario is synthetic and follows the same reconciled2.2 C01–C16 interfaces, S01–S09 controls and E01–E17 evaluation gates. State, storage, indexing, retrieval and answer outcomes are traced explicitly. Revisions discovered during the walkthroughs are incorporated into the other six deliverables.

## W01 Normal DOCX

Intake: authorized user uploads `SYN-quy-trinh.docx`; stream quota/hash, quarantine, clean scanner, safe OOXML probe confirm allowed internal relationships. Durable original/artifact/version/job registration returns 202. `validating→extracting`; adapter inventories body, header/footer, footnotes, endnotes, text boxes, tables and tracked revisions before deciding coverage. Native text/styles/list numbering become elements with part/path/run locators; no physical page number. NFC mapping preserves original runs. Required text parts are accounted, type rule suggests policy; trusted source label or reviewer sets handling. PII candidates enter local review even if none detected.

Storage/index: original and raw OOXML extraction remain private; accepted extraction projects graph, sources and annotations to SQL. Heading/paragraph children plus deterministic path context and complete source maps feed lexical/E5 generation. Required chunks/vectors/hashes validated; release pointer commits atomically under publisher fence. Search: permitted VI or EN query runs authorized lexical/dense channels, RRF/dedup and same-rendition parent expansion. Evidence resolves to exact OOXML source. Answer: excerpt or approved fact template, Vietnamese output; preview shows safe text and source paragraph. Optional rendered preview explicitly says “Trang kết xuất”, not original DOCX page.

Discovered issue: a parser traversing only body paragraphs would falsely claim complete extraction; C03 coverage inventory now blocks unsupported required parts. No render dependency is introduced just to invent citations. Tests: part coverage, NFC/run mapping, no deleted revision leakage, real browser DOCX-source navigation.

## W02 Digitally generated PDF contract

Intake: `SYN-HD-2026-001.pdf` passes type/size/active-content/encryption scan and is stored unchanged, including signature fields. Probe finds clean native text and simple layout on page 1, complex payment table page 2; router selects native+layout by region. Extraction stores glyph boxes, reading order, clause hierarchy, table cells and literal identifiers. Native/visual disagreement on critical digits invokes alternate local OCR/review rather than accepting selectability as truth.

Enrichment: contract rules propose number/party/payment/date fields with evidence; accepted source number narrows exact queries, absent total/effective date remains unknown. Applicability unknown prevents an assertion of current legal obligation until reviewed. Classification and optional field-enrichment statuses are independent. Storage/index retains canonical/raw/original, cell/header/qualifier dependencies, E5 child projections and typed accepted facts. Release names one version/extraction and complete raw generation.

Retrieval: query combining exact contract number and delivery terms first authorizes accepted identifier observations, then ranks clauses within matching permitted documents. Answer cites physical page/box/clauses and preserves “working days” vs calendar days. Signature image/field does not become a legally-signed flag.

Discovered issue: source ordinal, signature date and legal effective date were easy to conflate. C02/C05 now separate applicability/recorded time and signature observations. Tests: native box transform, exact identifier+semantic clause, unknown effective date, unsupported financial total.

## W03 Scanned Vietnamese contract

Intake/probe: synthetic scan passes validation; source remains immutable. Image union covers page and useful glyph count is low; page route OCR. Bounded 300-DPI raster/rotation correction records inverse transform. Tesseract vie+eng emits text/word boxes/raw scores; Docling layout arranges blocks/table candidates. A low-grade or native/visual-disagreement region triggers one alternate conventional pass. Amount `125.000.000` vs `128.000.000` remains competing candidates; neither averaging nor a language model “fix” is allowed. After unresolved disagreement: `extracting→awaiting_review`; structured fact stays ambiguous/null.

Storage/index: raw candidates/raster/transforms/coverage survive; reviewer with C11 package/scan/preview authority inspects the exact synthetic page, confirms literal amount and source region, creates a new immutable accepted extraction/correction revision. Old attempt cannot mutate accepted text. PII and label review run; source-supported accepted fields and chunks build a staged generation. Only complete reviewed coverage publishes. If optional specialist VLM is approved by E10, it can propose one hard-region candidate; absent exact location still requires reviewer linkage.

Retrieval/answer: authorized Vietnamese paraphrase uses actual local E5 + lexical if provisioned; model failure yields labeled lexical-only result. Exact amount comes from accepted field, reference points to original physical region via raster transform. Illegible critical data yields “Chưa đủ bằng chứng” with permitted source excerpt, never guessed digits.

Discovered issue: engine confidence cannot serve as factual acceptance probability. C05/C07 separate raw grades, validation and support calibration. Tests: diacritics, skew map inversion, amount disagreement, required-region coverage, degraded mode.

## W04 Contract with complex tables

Intake/extraction: multi-level merged headers, omitted cells and a table continued onto page 3 trigger layout/table route; native and OCR candidates are retained as needed. Grid validator stores anchor cells once, validates spans/nonoverlap/bounds, distinguishes blank from missing, resolves header paths/units/footnotes and retains each physical segment. Repeated header on page 3 is a separate observation linked to logical header; a continued payment row needs compatible columns, row identity and accepted continuation, not matching column count alone.

Enrichment/storage: amount facts depend on value cell + row label + hierarchical column headers + VND/tax/footnote + applicable clause. Decimal strings retain literal separators and currency. Unknown topology or continuation blocks accepted aggregate and default publish until review; source remains inspectable by custodian. Accepted grid/canonical and all segments stay private. Index uses caption/schema sketch, bounded row/column groups with repeated context, accepted cell channel and full-table expansion references; an overlong row is never silently truncated.

Retrieval/answer: “giá trị chưa VAT đợt 2” matches typed scope and semantic row context. Authorize every expanded header/footnote/cell; answer cites value plus relevant qualifier. Deterministic summation counts logical cells once, excludes subtotal duplicates and never combines currencies or incomparable tax scopes.

Discovered issue: inherited headers could create either duplicate numeric facts or hidden scope leakage. C03/C06 define header dependencies and logical-cell identity; no fine-grained mixed-scope tables are supported initially. Tests: occupancy, multi-page mapping, blank/omitted cells, currency/tax aggregate refusal.

## W05 Multiple signatures and appendices

Intake: signed PDF bytes remain unchanged; passive signature fields recorded without a validity claim, active attachments rejected under initial profile. Appendices within the document are inventoried through all physical pages. A separate appendix upload is a **new independently published document/instrument** in a reviewed C12 family, not automatically appended to a current contract.

Processing: signature blocks retain region, neighboring party/role/name observations, multiple marks and uncertain association; no OCR/VLM legal execution inference. Clause→appendix/table relations are candidates grounded in numbering and references. If “Phụ lục 02” is referenced but missing, record required missing-evidence warning and withhold answers requiring that appendix. General reference publication can proceed only after explicit coverage/applicability review defining unsupported questions; it cannot claim the missing appendix was parsed.

Storage/index: clauses, signature observations, appendix references, source hashes and relation decisions are preserved. Search projections may index authorized adjacent role text, but do not invent “signed by” facts. Normal evidence retrieval follows only accepted same-scope relation edges; cross-document appendix expansion requires both permissions and active/approved versions. Answer distinguishes visible signature block from unperformed cryptographic/legal validation, and cites each supporting physical page.

Discovered issue: page-complete extraction alone does not mean reference-complete evidence. C05 relation statuses and A02 slot sufficiency now include unresolved appendices. Tests: two signature marks/roles, missing appendix, separate restricted appendix, no signature-validity claim.

## W06 Document containing PII

Intake: unknown source label receives effective restricted; uploader receipt does not grant restricted content access. Authorized intake custodian can review. Processing runs local bilingual patterns/dictionaries and approved NER candidate adapters; NFC/word/glyph mappings preserve PII spans through OCR and normalization. Missing NER or unproven Vietnamese recall keeps mandatory privacy review, not an “anonymous” status.

Storage: originals/raw mentions/identity lookup keys remain private; ordinary logs contain opaque IDs only. Initially approved raw rendition is accessible only under raw document/rendition grants and clearance. Reviewer can approve authorized retention of contract parties/amounts without erasing useful legal search context. A request for a broadly shared masked view is unsupported at launch; future sanitized rendition must remove hidden layers/metadata/pixels, independently validate and build separate entity/fact/lexical/vector projections.

Retrieval/answer: allowed raw reader can search a permitted party; denied peer sees no party/alias/title/count/score. Parent/header expansion respects same dependencies. Even a no-PII result does not authorize external generation. Output uses allowed excerpts and never receives confidential browser persistence. Any pseudonym reidentification requires separate vault capability.

Discovered issue: global entity alias search could expose a PII value even if document search was filtered. C05/C06/S04 now bind alias visibility to authorized observations. Tests: decomposed accents/surrogate offsets, alias negative, unknown-label uploader, no egress/no content logs.

<a id="w07-conflicting-versions"></a>

## W07 Source replacement versus partial amendment — T02

Synthetic original O has warranty W (12 months), payment P (125 units) and delivery L. M changes only payment to150 from 2026-12-01; appendix A adds a payment condition. M/A are new independent documents in the same contract family, with their own active releases, extraction IDs and grants. They are not O version2. A true corrected/consolidated version of O may replace O only after review; source replacement still cannot assert legal replacement implicitly.

Authority: family custodian/reviewer must inspect every supporting source through published read or C11 exact staged packages. Each source publishes separately into the complete current serving profile. Under singleton gate and C12/C14 transaction, reviewer approves scope inventory: preserve O.W/O.L; supersede O.P with M.P2 only from dateD; supplement that payment scope with A.C. Family set stores exact source releases, clause effects, dates and decision evidence, and roots them for retention. No source text is copied to manufacture a consolidated original.

Query at D with current-only reader rights on O/M/A uses the accepted set/date/semantic epoch. Warranty resolves O.W; payment resolves original scope+M.P2+A.C and decision evidence. Reader needs conjunction authorization for the full set. Before D payment remains O.P; unknown D or unresolved competing M2 produces unknown/conflicting, never latest-upload precedence. A denied member prevents a complete legal claim but does not disclose its title/existence; independently permitted excerpts remain reference material. Broad history rights are not granted to fix current original access.

Citation carries family/set/effect/decision plus all exact release/extraction/element spans. Source replacement retires only that instrument, rebinding reviewed applicability or invalidating the set transactionally; it cannot leave old set facts trusted. Old citations never retarget. Test original+partial amendment+appendix+future effect+conflict+denied member, both current-only and explicit history users, and source replacement invalidation. This repairs the pre-review W07 counterexample rather than merely planning to test it.

## W08 Malformed or malicious upload

Intake: attacker sends DOCX with traversal/duplicate XML/ZIP bomb/external relationship or PDF with giant decode stream/JS. Byte limit applies during stream before RAM accumulation; quarantine inaccessible to search. Scanner timeout/stale signatures/limit does not count clean. Bounded structural probe/sandbox rejects permanent format/active-content issues with safe Vietnamese code; no data parsing in API process and no fetched URL/template/DDE target.

Processing/storage: parser has no network/secrets/host writes; malicious output paths/oversized JSON/schema violations fail broker validation. Runtime CPU/RAM/PID/time/temp caps kill process group; trusted supervisor records failure without parser stderr/source text. `validating→rejected` for malicious/permanent input; infrastructure scanner outage enters retry_wait/hold. Quarantine retained only under approved rejected-input schedule; crash temp swept, adoption never occurs.

Index/retrieval/answer: no generation/release created, no attacker-derived content searchable or passed to answer adapter. Uploader sees only its receipt/status capability, other users cannot discover filename/existence. Repeated attacks hit tenant/user admission limits; no indefinite retry storm. A parser crash does not implicitly reject every tenant or compromise DB credentials.

Discovered issue: treating scan-limit errors as clean plus trusting emitted JSON would cross two boundaries. S06 now explicitly fails closed at both. Tests: synthetic hostile files, harmless antivirus test string, SSRF/host-secret canary, output path abuse, bounded recovery.

## W09 Unauthorized retrieval attempt

Preparation: a restricted synthetic contract has a valid active release and entity aliases; attacker is active in same tenant without read grant, then repeats from another tenant with guessed UUID. Request cannot set principal/tenant/role/scope through filters or headers. Server verifies enterprise identity and context. Every lexical, exact, vector, typed-fact and entity query applies live predicate before returning candidates; SQL RLS is exercised with actual runtime role.

Storage/index behavior: denied rows may exist in encrypted DB but cannot become candidate text, reranker input, parent expansions, table cells, autocomplete or metadata counts. No global alias endpoint confirms existence. Forged citation/evidence UUID resolves through ownership/active release and returns generic unavailable; no model URL is trusted. Alternate rendition/original/job endpoints enforce distinct capabilities.

Answer: empty authorized evidence gives Vietnamese insufficient response without naming hidden document or suggesting “ask administrator about contract X”. Timings are bounded but no false claim of perfect shared-host timing isolation. Credential/session changed while generation waits causes final guard discard. UI hides prior principal response and ignores late fetch completion.

Discovered issue: document-only tests would miss entities/numeric/job/preview paths. C06/S03/E09 enumerate all projections and pool-context reuse. Tests: denied peer, cross-tenant composite-FK insert, missing context, worker/reader roles, every API alias/count path.

## W10 Deletion followed by search

Delete: authorized user submits current If-Match. Singleton holds its local gate, fsyncs C16 independent deny journal and installs the deny, then commits tombstone/source+semantic+serving invalidations/job fences/purge before202. SQL rollback returns503 with durable-deny operation ref; deny remains effective. Any already-running search/answer still buffering detects intent/epoch at release; it discards content. A response synchronously enqueued before the gated mutation precedes its acknowledgement and may still arrive; prior delivered bytes are not recalled.

Processing/storage/index: purge enumerates all original storage versions, canonical/raw/crops/previews, attempts/orphans, tables/facts/chunks/vectors/representations, annotations/vault mappings, aliases/relations and caches. Cross-doc derived summaries/links invalidate and rebuild without removed source. Another document's independent evidence is retained. A legal hold keeps retained originals in restricted hold custody, never searchable ordinary projections. Purge outage leaves tombstone, retries idempotently, reports access blocked vs online purge vs backup expiry honestly.

Search/answer: next current query cannot return deleted source or entity facts derived solely from it; exact ID lookup returns same unavailable behavior as nonexistent. Restore old DB in sealed mode replays delete **and current identity revocations/key state**, validates watermark, purges/denies restored projections then serves traffic. Journal unavailable/gap blocks readiness.

Discovered issue: SQL-only delete ledger and orphan cleanup would resurrect content after restore or erase held artifacts. C10 external deny journal/retention roots fix the design. Tests: delete during OCR/answer, held bytes, object versions, stale cache, sealed restore.

## W11 Failed ingestion job followed by retry

Intake has already committed durable source/version/job. Worker claims stage with lease_epoch 7, processes pages 1–3 and commits verified checkpoints. It dies before page4 adoption. Supervisor process death releases runtime resources; sweeper finds expired lease, worker2 claims epoch8 and validates checkpoint input/config hashes. It resumes page4, not a new logical source or duplicate generation. Temporary DB/blob outage receives retry_wait using 5/30/120 s schedule, max four attempts; malformed source is permanent rejected, low quality is waiting_review.

Storage: worker1's late raw artifact under epoch7 key is an unadopted orphan, never an overwrite of canonical output. It cannot heartbeat/checkpoint/publish after expiry even before reclaim; CAS verifies epoch/owner/status/DB-time expiry, cancellation/tombstone and expected release. New worker may reuse adopted page1–3 manifests only after hash/coverage checks. Failed optional contract enrichments do not poison completed general search, but their facts never appear accepted.

Index/retrieval/answer: new generation is staged until all required cells/chunks/vectors and reviews complete. Publish under current fence switches one release once; duplicate acknowledgement/retry returns same release. No partial index exposed, no prior active version destroyed. If attempts exhaust, operator gets safe failure/reprocess option and current search remains consistent.

Discovered issue: a random lease token without expiry and monotonic fencing did not fully specify stale blob adoption. C09 keys/CAS/checkpoint contract now does. Tests: kill/late writer, lost ack, DB outage at publication, optional-stage failure, cancellation at every stage.

## W12 Exact identifiers plus semantic context

Input: “Hợp đồng SYN-HD-2026-001 với SYN-ORG thanh toán đợt 1 bao nhiêu và trong bao lâu?” Ingestion previously extracted exact accepted contract ID/issuer, party observations, amount/currency and due-condition clause; unknown or unvalidated facts remain candidates. Chunking preserved clause exceptions, row labels/headers/footnotes and path context; title-only dense sketch cannot be evidence for amount.

Planning/retrieval: normalize identifier under issuer-specific profile, preserve leading zeros/punctuation, authorize accepted identifier observations, resolve ambiguity safely. Deterministic planner builds ≤3 slots/subqueries (contract identity, first-installment amount, due condition); exact tier narrows permitted documents, lexical+dense ranks relevant rows/clauses, RRF merges per-channel votes without double-counting rewrites. Reranker only sees permitted evidence if enabled. Parent/table expansion adds authorized qualifier/header/currency sources within budget; source version/applicability consistent across bundle.

Answer: fact template renders Decimal/currency and time/condition from accepted values with supporting exact evidence IDs. Missing due condition yields partial or insufficient, never guessed “10 working days” from a related contract. A likely OCR ID variant can retrieve candidates but cannot turn into accepted exact identity without evidence/review. Two matching contracts require clarification; inaccessible duplicates are not revealed.

Discovered issue: hard filters from unvalidated NER may erase correct documents, while dense rank may favor a similar code. C05 validation and R19 exact/semantic route now distinguish accepted narrowing from candidate expansion. Tests: punctuation/leading zeros, party collision, scope/currency, missing second slot, negative denied duplicate.

## Separate adversarial premortem pass

Assume the implementation has failed after six months. This pass challenges the proposed revision-2 design rather than accepting its own recommendations. It is an additional design pass by the same reviewer, not a claim of a second independent agent or a penetration test.

| Failure hypothesis | Adversarial trace / resolution incorporated | Remaining validation |
| --- | --- | --- |
| Hidden Node/Python dual write | Node editing contract while Python independently indexes creates irreconcilable versions. Isolate authority and explicit one-time approved importer; no live bridge. | A01/A07 approval; legacy mapping integration tests. |
| Schemas parse but citations point nowhere | Markdown chunks lack coordinate/run maps; conversion upgrade shifts offsets. Immutable raw/NFC/projection maps and version-specific source resolver mandatory. | E01/C04 property tests; actual OCR/runtime unverified. |
| RLS good, aliases leak people | Entity global names/counts join before document ACL. Observation-first visibility; no readable registry/global IDF. | E07/E09 all endpoints and query plans. |
| Revocation TOCTOU | Recheck passes, then permission commits before dispatch. S05 singleton gate survives DB-session loss; synchronous enqueue and sole mutation writer define ordering. Second content processes reject startup; uncertain send/commit seals serving. | Race/load tests; in-flight network bytes remain a limit. |
| Barrier becomes global outage | Holding lock during generation/download blocks every permission change. Only bounded synchronous final enqueue; per-block export check, no awaited slow-client backpressure in the gate; unavailable/uncertain state fails closed. | p95 mutation/lock wait stress E09; pilot single-authority serialization and conservative auth/semantic epoch checks. |
| Complete parse misses appendix | Parser says success after dropping textboxes/scanned region; page count alone passes. Required coverage/reference inventory + missing-slot gate. | W01/W03/W05 tests, real template diversity unknown. |
| Table math doubles invoices | Repeated page headers/merged values counted multiple times. Logical cell IDs and accepted scoped facts; aggregate only matching units/currency/tax. | Adjudicated numeric/header gold. |
| New model corrupts old search | Same vector column/query encoder silently changes. Immutable embedding space, dimension tables, shadow rebuild, C13 complete corpus serving-profile switch; old query encoder stays pinned until requests finish or are discarded. | E06 actual model parity/rank evaluation. |
| Dead workers publish deleted data | Fencing only at job claim, old worker uploads stable canonical key. Attempt-scoped immutable keys and publication/checkpoint fence under row locks. | Crash schedules, DB/blob fault injection. |
| Restore resurrects old ACLs | Delete journal replay works but pre-revocation membership snapshot restored. Replay current identity/policy/key revisions too; readiness fails on missing watermarks. | Sealed restore drill and IdP synchronization contract A02. |
| Purger deletes held originals | Orphan sweeper ignores legal hold/ref roots. Explicit hold custody/retention roots; no shared physical blobs at launch. | Hold/purge reconciliation test, A03 retention approval. |
| Too many sophisticated models exhaust CPU | OCR + E5 + BGE + VLM loaded together on 15GiB machine. Approved32GiB envelope, reservations and serial experiments; no GPU assumption. | A05 hardware; measured RSS/throughput, no performance claim. |
| RRF appears confident on irrelevant evidence | Dense top40 always returns something. Rank scores never support scores; slot/accepted-fact/abstention gate; excerpts for free prose. | Unanswerable/NLI calibration evaluation; unknown real confidence. |
| Privacy review bottleneck defeats operations | English NER misses VI people/addresses; everything requires correction. C16 backlog/age/accuracy/ready-time circuit, blinded T14 review and measured staffing/service capacity; stop new intake on breach, no external escape hatch. | E08 representative real subset permission A04/reviewer A05. |
| Exact search collapses at yearly growth | 100docs/day yields millions of children. Capacity trigger, partition-compatible keys, exact oracle/HNSW filtered comparison before enabling ANN. | E02/E09 load at100k/1M/3M synthetic children. |
| Generated summaries contaminate source | Context/HyDE/RAPTOR becomes cited fact, mixing ACLs. Generated projection markers, conjunction dependencies, never source evidence. | E12/E17 negatives; baseline no generator. |
| Documentation validation gives false deployment GO | Links/JSON pass but SSO/RLS/model/scan paths absent. Verification explicitly limited; architecture approval/synthetic prototyping can proceed while actual production acceptance waits. | No application test claim; RB17–RB29 specify when executable evidence is required. |

## W13 Full lifecycle consistency trace

This is a transaction/invariant trace of C01–C16, not an executed workflow. Blob finalize precedes SQL adoption; no distributed transaction or publish-from-worker shortcut is assumed.

| Transition | Authoritative state / transaction boundary | Invariant and failure behavior |
| --- | --- | --- |
| Upload→validation | Trusted identity/quota; immutable source blob fsync then SQL source/job/idempotency commit | No202 before both; SQL failure leaves private orphan, no content visibility. |
| Validation→extraction | Exact-source clean scan attestation and bounded supported-format inventory | Scanner outage/unsafe format holds/rejects; no parser in API or external fetch. |
| Extraction→canonical | Fenced page checkpoints; raw originals/maps; C04 scalar/coverage/table validation before canonical hash/adoption | Invalid Unicode is permanent quality review; lost lease output remains orphan. No fake ready/missing regions. |
| Canonical→staged review | C11 package assignment, exact extraction/subject revision, scan and safe preview | Separate review RLS/service resolver; ordinary search stays empty. Expired/changed package cannot approve different bytes. |
| Review→source publication | Singleton + tenant heads/family/doc/job locks; complete required generation/current serving space, review/root/deny validation | Complete lexical slice may publish honestly; full hybrid needs actual vectors. Failed replacement leaves previous authorized source; amendment is separate instrument. |
| Publication→legal/semantic trust | C12 exact family members/clause effects + C14 immutable acceptance events in guarded SQL transactions | Unknown applicability stays unknown; every acceptance/retraction changes semantic epoch; no source hash can stand in for current trust. |
| Indexing→corpus serving | C13 immutable profile/membership with exact eligible-release coverage | Shadow never queryable; publication cannot omit a source with incomplete current-space vectors. |
| Authorization→retrieval | Request-local live identity/RLS + pinned profile/corpus/semantic/time | Every channel returns permitted IDs only; no unrestricted candidate text/model input. |
| Retrieval→expansion | C15 bounded OR compiler/fair slots; source resolver rechecks parent/header/qualifier dependencies | No candidate starvation from slot order; required bundle too large returns partial/insufficient, not truncated exception. |
| Evidence→answer release | Buffered claims/facts, S05 fresh dependency/semantic/identity/journal/profile checks and synchronous gated enqueue | Fact retraction/used source replacement/profile switch/denial discards; no detached future sender. |
| Release→revocation | Same sole authority gate; confirmed SQL commit/local install then Ack with dispatch watermark | No later new enqueue under revoked rights; already enqueued bytes remain in flight; SQL uncertainty seals. |
| Revocation→deletion | C16 fsync intent/install deny before tombstone/purge transaction | SQL failure cannot hide deny; second content process cannot start; corrupt ledger/readiness fails closed. |
| Deletion→retention | Root-aware dependency traversal, GC pending/purging claim serialized with publication; holds override destruction only | Semantic/citation roots protect surviving evidence; explicit delete invalidates dependents before purge; held data never resumes search. |

## W14 Embedding A→shadow B→corpus switch→rollback — T04

A profile+complete corpus revision is serving; requests encode only inA. B shadows exact source releases; a new upload is staged, while an already-published source remains inA. Publication during build adds complete A representations and advances membership; B catches up. Delete durably denies and removes the source from all candidate mappings, fences late output. Equal-dimension B revisions still get distinct spaces.

At cutover, prewarmB within reserved memory, then briefly gate/lock tenant head and compare exact current eligible source set withB members/hashes/counts. IncompleteB or concurrent source change failsCAS, leavingA. On success atomically move profile+membership head toB; oldA requests may finish computation but final guard discards because active profile changed. Unrelated A membership additions before cutover need not discard positive used-source responses; global absence claims still need unchanged membership.

Retain oldA artifacts/encoder while bounded request pins/approved rollback root require them. Rollback is a **new** complete corpus revision onA validated against today's sources/denies/semantics. If newly published source lacksA, rebuildA or remain onB; never resurrect a deleted source from an old snapshot. Insufficient dual-encoder RAM requires an approved whole-corpus labeled lexical maintenance window, with complete lexical coverage before unloadingA. Model memory, WAL/disk/backup overlap and actual latency remain T04/T12 measurements, not assumed free.

## W15 Accepted fact→buffered answer→retraction→release — T06

FactF125 is accepted and source extraction E/releaseR is fully published at semantic epoch9; query pins9 and source releaseR, buffers an amount template. Reviewer calls C11 POST /documents/{id}/published-reviews without a staged package, with exact E/R subject, current review/read authority, If-Match document revision, expected epoch9/prior decision and idempotency key. Under the same authority gate: validate source/reviewer/expected epoch, append semantic event, close acceptance interval, update exact/entity projections, invalidate dependent applicability, increment epoch10/root revision and commit. Original bytes/R/vector are unchanged; baseline vector text is literal source-only.

Release checks epoch and used fact IDs under gate.9≠10 discards the entire supported buffer; it cannot emit F125 as trusted. A new independently requested evaluation may use a newly accepted fact at10; no automatic privilege-changing retry is hidden. Historical semantic decisions remain audit evidence, not current trusted filters. Link undo/applicability invalidation follows the same transaction, including cached query plans/sketch dependencies. Request-local cache/projection hashes alone cannot override current epoch/no-deny checks.

## W16 Permission check→DB session lost→revocation→HTTP dispatch — T03

A computes authorized payload, takes local gate and completes fresh SQL read; backend dies before enqueue while API stays alive. The gate is process-local, so database advisory-lock loss does not release it. Independent API B fails the lifetime lock/startup policy, has no listener and cannot acknowledge revoke; workers cannot write policy. A local revoke task waits.

If A observes lost session before enqueue, it discards/seals; if it has not yet observed loss and performs a synchronous valid-deadline enqueue, that send is ordered before the waiting mutation. A releases gate only after known enqueue/no-send. Mutation obtains gate, commits and installs current state, returns Ack watermark; A cannot later resume an old detached sender. If commit/send outcome is uncertain, no acknowledgement/content until sealed reconciliation; unproven sender cancellation kills the authority and requires confirmed death before replacement. A crash destroys unsent tasks; already enqueued TLS/proxy/network bytes remain in flight. SQL failover is manual/sealed. Expired grant/session at final gated admission denies even without epoch change. A suspension after that decision inside the synchronous call has no hard real-time expiry-lateness bound; the held gate still prevents RevocationAck overtaking it (S05/A09). This model deliberately excludes independent policy writers/multiple egress processes; approving HA would reopen its proof.

## W17 Deletion intent→SQL failure→second reader→restart — T05

A authenticates delete, gates, appends journal sequence18 with operationX, fsyncs and installs denyD; SQL tombstone transaction rolls back. Response503 says durable deny/operationX, not successful tombstone. Existing A requests/next searches must check current deny and cannot enqueue D, even though SQL still says active. A second content-reader process B is **unsupported and rejected before serving**, not permitted to read SQL with stale deny state. Delayed cache/subscription is not a reader path in this topology.

Crash A, confirm death, acquire singleton lock and validate full ledger/head against independent anchor in sealed startup. Replay18 into SQL, compare acknowledged authority checkpoints and current identity/key state. Current SQL can reconcile and reopen; a snapshot behind an acknowledged head requires C16 fresh approval with all restored grants/semantic trust/serving heads invalidated before rebuild/reapproval. No delete-only replay restores old rights/facts. Then allow readiness. A corrupt/missing18, corrupt tail, unknown fsync outcome or mismatched head keeps serving closed until verified restore/operator recovery; never truncate and reopen. RepeatingX resolves the same operation/digest and does not remove deny. Once SQL outcome commits, its linked authority_commit is a distinct record from intent18, with UNIQUE(tenant,entry_kind,operation_id); same-kind replay returns its original record/sequence. Crash after SQL but before checkpoint seals and reconstructs the missing checkpoint from verified-current committed outcome, never repeats the mutation. Ack loss returns the existing authorized result; changed payload is409. Stale SQL cannot masquerade as a never-committed operation. Holds retain physical evidence under custody after tombstone but not ordinary access. Tests must actually force SQL rollback and rejected second process/startup; a finite state model is only design evidence.

## Consistency closure and blockers

The independent review's pre-patch counterexamples remain in `review/`. Reconciled contracts now compose the upload/review/source/legal/semantic/index/transport/journal/retention flows without treating a pointer/hash/DB lock as unrelated authority. [Dispositions](reconciliation/finding-disposition.md) trace every correction; [invariants](reconciliation/revised-invariants.md) name exact guarantees.

Architecture/staged implementation are **CONDITIONAL GO** under A01/A02a/A03/A09, isolated synthetic prototyping is **GO**, confidential integration and production remain **NO-GO** until their actual authority/control/quality/operations gates. Missing long-scan/RLS/review measurements remain implementation validation requirements, not claimed repaired runtime behavior. No UI/browser, OCR/model, distributed fault or enterprise RLS workflow above was executed by writing this file; the verification record distinguishes narrow SQL/design checks if run.

## W18 Newly registered amendment after an accepted set — RR02 / T02

O/M1 produce accepted S1 bound to membership revision4/hashH4. Register pending M2 under family-management/inspection authority and expected head4: one gated transaction appends head5/hashH5, invalidates S1/clears its pointer, appends semantic invalidation, updates roots and commits/checkpoints. A new query at the new semantic epoch cannot reuse S1 because its membership binding/current pointer fails. Pending/conflicting M2 gives generic insufficient; denied M2 reveals no name/count/reason. Future-effective M2 is included with reviewed interval; excluded M2 needs reviewed reason/evidence. A complete permitted S2 bound to5 can restore supported applicability. O warranty quotations remain source references while completeness is unknown. Source replacement/withdrawal repeats the same rule.

## W19 Superseded artifact GC on a live document — RR04 / T10

Live document serves R2; expired R1 artifact keeps processing state adopted and separate artifact_gc state live. If active fact/set/citation/hold roots R1, GC skips regardless of TTL. Otherwise the authority marks gc_pending, rechecks under lifecycle lock and issues kind=retention exact-version claim with CAS to purging, without tombstoning R2. rag_purger can fetch only that assigned manifest and report receipts; no arbitrary SQL/path deletion or original read. Root/hold first prevents claim; claim first makes publication/new hold fail409 rather than promising retention of disappearing bytes. Physical delete retries same versions outside gate; verified absence lets authority mark both states purged. A tombstone claim follows the same hold/records fence and additionally requires confirmed SQL tombstone.
