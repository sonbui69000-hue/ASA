# Module boundaries and shared contracts

Architecture authority: specification [C01–C16](../FINAL_IMPLEMENTATION_SPEC.md#data-contracts), [S01–S09](../FINAL_IMPLEMENTATION_SPEC.md#security-contracts), [module/migration contracts](../FINAL_IMPLEMENTATION_SPEC.md#implementation-contracts). All proposed backend paths below are under `services/enterprise-rag/src/enterprise_rag/`; web paths are under `services/enterprise-rag/web/`. Logical modules share one service and database; they are not default microservices.

## Ownership register

| Owner | Data and code authority | Tickets | Boundary and shared-file rule |
| --- | --- | --- | --- |
| foundation/domain | Strict schema/types/hash/offset/state/API wire catalog; `domain/`, `schemas/`, generated web DTOs |001–007 | Pure domain has no DB/parser/model dependency. Contract editor serializes generated schemas, OpenAPI, DTOs and profile catalogs. Feature owners consume them. |
| identity | `identity/`, `api/auth.py`; server tenant/principal mapping and live registry input |008 | OIDC independent of Node; sync submits authority commands, cannot edit policy heads directly. |
| db | `db/`, locked `authz` SQL functions, sealed migrations |006,009,012,016–021 | One migration integrator. Content RLS arrives with each table. Feature tickets extend approved repositories/commands, never bypass their constraints. |
| authz | `authz/context,predicate,dispatch_authority`; actual same-process transport |009,010,026,045 | One final content-egress process/gate. Contract/tool prototype010 informs production integration026/045; no competing egress implementations. |
| intake/storage | `intake/`, `storage/`; private bytes, verified manifests, source registration |012,015 | Broker owns opaque keys/storage versions. Original bytes immutable; SQL registration follows durable finalize. Filename is display metadata only. |
| jobs/worker/sandbox | `jobs/`, `worker/`, `sandbox/`; leases, stage keys, cumulative budget, broker |013,014,022 | Worker stages/proposes only. No policy/publication credentials; no authority call while holding SQL locks. Parser no network/credentials. |
| extraction/canonical | `extraction/`, `canonical/`; raw candidates, source maps, coverage, accepted graph |002,003,023,024,030–032 | Parser adapter proposes; canonical validator accepts immutable graph. SQL is hash-bound projection. Enrichment does not rewrite text/maps. |
| enrichment | `enrichment/`; type/sensitivity/PII/mention/entity/field proposals, review capacity |033,034,038 | Proposals carry evidence/ownership. Trust and access change only via lifecycle commands. Privacy/rendition policy remains document-level raw at launch. |
| lifecycle | `lifecycle/`; source publications, family/applicability, semantic acceptance, deny journal, roots/GC/restore |011,020,021,026,027,035–037,046,047 | Sole mutation authority owns SQL outcome, epoch/root/head changes and fsynced checkpoint. RAG-035 may add field candidate extraction in enrichment but cannot create another semantic transaction owner. |
| chunking/representations/ranking | `chunking/`, `representations/`, `ranking/`; literal projections, spaces, manifests, encoder/rerank |019,039,040,042,058–070 | Generations separate from source release; optional models disabled. Ranker cannot grant rights/add IDs; profile cutover is lifecycle command, representation module prepares manifests only. |
| retrieval/answers | `retrieval/`, `answers/`; plan/compiler/channels/fusion/expansion/EvidenceGate/templates |028,041,044 | Candidate IDs authorized before text; resolver checks every dependency. No content path may bypass final authz authority. |
| frontend | `web/src/client/`, `web/src/features/`; Vietnamese enterprise UI |049–052 | Separate origin/session, strict generated DTOs, no sensitive browser persistence; no new business state writer. |
| benchmarks/integration/operations | `benchmarks/`, `tests/`, `observability/`, `deploy/`, `runbooks/` |007,029,043,048,053–056 | Private raw evidence versus synthetic/shareable aggregate reports. Operators approve resources/policies; configuration is not deployment authorization. |

Numeric ticket ranges refer to [progress.md](progress.md); exact IDs/paths and dependencies are in each ticket. Interface changes are serialized by the contract owner; module ownership does not confer permission to change the specification.

## Shared interface register

| Contract | Producer → consumer | Shared definition and failure behavior |
| --- | --- | --- |
| IDs/revisions | domain → all | UUID IDs, lowercase64hex hashes, UTC instants, LocalDate, Decimal strings, numeric(38,10), Epoch decimal strings; exact schema2.2.0. All owned FKs include tenant and required ancestors. No caller tenant authority. |
| Evidence graph | extraction → canonical → SQL/resolver | Original→raw→NFC→search-only/projection maps remain distinct. Codepoint half-open spans; explicit UTF16 conversion. Every element/cell/coverage/producer/locator/confidence subordinate schema is closed and bounded. Invalid Unicode is permanent quality review before hashing. |
| Adapter proposals | sandbox → broker | `ExtractionAdapter.extract` receives staged local handle/profile/regions/cancellation, returns bounded candidates/coverage/transforms/manifests. Broker validates paths/ownership/hash/size; no DB/storage/publish credentials in parser. |
| Canonical/rendition | canonical → chunking/review | `CanonicalValidator.validate` returns accepted immutable revision or typed violations. `RenditionBuilder.build` creates a separate raw identity; future sanitized release requires its own approved full projection/lifecycle contract. |
| Channels | planner → exact/lexical/dense | `RetrievalChannel.retrieve(ctx,snapshot,QueryPlan,limit,deadline)` returns authorized CandidateRef IDs, matching evidence, typed score/profile/space and safe diagnostics. It never returns unrestricted content. |
| Embedder/reranker | representations/ranking → retrieval | Exact space/input hashes, actual token budgets, finite unit vectors or typed failure. Reranker returns same authorized IDs with distinct score domain. Null calibration stays null. |
| Resolver/gate/answer | retrieval → answers → authz | `EvidenceResolver.resolve` expands only authorized exact dependencies within budgets; `EvidenceGate.assess` returns supported/partial/insufficient/conflicting plus missing slots; `AnswerAdapter.generate` produces current supplied evidence/fact IDs only. |
| Review subjects | API/review → lifecycle | Disjoint staged package vs exact published source; `inspect_staged`, `review_semantics`, `review_classification`, read/history, original/export, sign, grant, family management remain distinct. Published route never needs a staged package. |
| Authority commands | API/identity/worker proposal → lifecycle | Current auth, stable operation/digest, replay existing committed authorized outcome before new CAS; lock order then SQL mutation/outcome, fsynced typed checkpoint, local install, Ack. Uncertainty seals. Worker has no mutation-head authority. |
| Semantic/family | lifecycle → exact filters/EvidenceGate | Append-only events/acceptance intervals at semantic epoch; family complete registered membership revision/hash separate from command revision. Any membership/source change invalidates/replaces active set atomically. Unknown/pending/conflicting cannot support complete legal trust. |
| Serving | representations → lifecycle → retrieval | One complete immutable corpus revision/profile; query encoder exact compatible space covers every eligible active rendition. New generation does not rewrite source release. Two-way equality; B prewarm outside gate, brief CAS inside. |
| Dispatch | buffered response → `ResponseReleaseGuard.release` | Actual in-process synchronous non-yielding `DispatchAdapter.enqueue_if_current(payload,deadline,incarnation)` under singleton gate after fresh READ COMMITTED checks. No reusable permit/deferred sender.≤256 KiB/250 ms, backpressure rejects; original blocks≤1 MiB/≤1 s buffered. |
| Journal/operation | lifecycle → disk/SQL/recovery | Distinct operation and record UUIDs; UNIQUE(tenant, kind, operation), global contiguous sequence/hash, private versioned keyed digests, SQL immutable outcome and retained-key replay indexes for ledger lifetime. Intent/commit coexist; unknown durability seals. |
| Retention/GC | authority → purger → broker → authority | Closed root DAG, artifact processing versus separateGC state; exact tombstone/retention version claim and constrained receipt. Physical delete outside gate;verified absence before completion; no purging→live. |
| Events/errors | every owner → API/audit/outbox | C08 Vietnamese typed errors with opaque refs/generic404, body32 KiB/upload metadata8 KiB; source-free outbox/audit. Outbox never supplies live deny/trust safety. No raw content/query/filename/vector/secret logs. |

Do not invent exact subordinate shape catalogs, malformed-header error mappings, transport adapter, physical journal/key/anchor configuration or business policy to fill missing details. RAG-002–006/010/011 materialize or spike them. If an essential semantic choice cannot be derived, record an interface blocker and stop that consumer's freeze. Ordinary representation choices must preserve all specified semantics and round-trip/negative tests.

## Revision and state ownership

| State | Authority / identity | Required transition discipline |
| --- | --- | --- |
| Original instrument | document + immutable source_version | Ordinal is ingest order; separate amendments/appendices become separate documents. New extraction/rendition/generation/release IDs have separate meaning. |
| Extraction/rendition/generation | C06 closed enums | Extraction staged/extracting/awaiting_review/accepted/rejected/failed; rendition staged/approved/rejected/retired; generation staged/building/validated/published/retired/failed. Accepted text/maps immutable. |
| Job/version processing | C09 exact state table | Lease/running owner/epoch/expiry/heartbeat; terminal no live lease; DB-time CAS. Preserve every C09 transition including cancel/delete/retry/review and optional-enrichment independence. |
| Policy | authority_revision, auth_epoch, permission_epoch, document_revision, identity_revision | Every visible authority mutation advances authority_revision/checkpoint; authorization-affecting changes advance auth_epoch. Document metadata/publication/published review uses document_revision; no same-number synonym across axes. |
| Trust/current legal effect | semantic_epoch, semantic event head, family revision, membership revision/hash, current set pointer | Current trust rebuilt from event intervals; historical observation assessment immutable. Membership mutation invalidates even absent old dependency edges. |
| Corpus | corpus_epoch, corpus_revision, profile head | Broad churn epoch distinct from complete membership revision. Positive exact-source claims need no false abort on unrelated corpus churn; negative/global claims need unchanged relevant membership. Active profile change always discards old profile buffers. |
| GC | processing staged/verified/adopted/purged plus GC live/gc_pending/purging/purged | Pending cancellation only before claim after revalidation. Root/hold first blocks claim; claim first rejects new root/publication/hold409. Claim receipt identical replay returns completion. |
| Readiness | journal/SQL/identity/key/incarnation/watermark | Missing/corrupt/uncertain state seals. Behind-checkpoint SQL requires fresh authority/trust/serving invalidation, reapproval/rebuild and counters above highwaters/new incarnation. No automatic HA/failover. |

Full closed transitions are generated once in RAG-004/006 and verified against SQL writes. This table indexes the contracts; it does not replace their full state machines or enable extra transitions.

## Migration integration ownership

| File under `services/enterprise-rag/migrations/` | Author tickets in serial order | Required delayed work |
| --- | --- | --- |
|0001_identity_policy.sql |009 | Identity-only metadata first; content policies activate with their tables. |
|0002_intake_jobs.sql |012;013/014 use constrained repositories | Source/artifact cyclic keys deferrable;GC/operation/root declarations now;no claims yet. |
|0003_canonical.sql |016 | Default-deny staged content until assignments/helper installed in0004. |
|0004_observations.sql |017 then018 | One file staged serially; family/published-review release columns get validated FKs in0006. |
|0005_representations.sql |019 | Corpus release-reference FKs attach in0006;no ANN/optional1024. |
|0006_releases.sql |020 | Attach all forward source-release FKs, current active pointer and complete-head constraints. |
|0007_deletion_restore.sql |021 | Exact constrained claim/receipt/recovery functions;purge not enabled until047/T10. |
|0008_bge_challenger.sql |059 only if enabled | Reviewed optional1024 representation;all isolation/delete rules unchanged. |

Only the migration integrator edits migration order/shared models/grants; feature owners request reviewed amendments and forward repairs. Initial0001–0007 complete under sealed traffic before CP3; no temporary permissive policies or not-yet-created-table references. PostgreSQL18/compatiblepgvector0.8.x are specified families; exact patches/digests/licenses are A06/P00 work, not asserted installed here.

## Cross-module invariants

| Invariants | Required composition evidence |
| --- | --- |
|I01 |001/022/049/052/053:local enterprise processing, synthetic artifacts, preserved Node/offline/workbook deny. ST18/ST19 probe actual runtime and browser. |
|I02, I22, I23 |025/035/039/045/050:T01/T06 route+RLS, published F125 retraction without package, literal-only static sketches, stale buffer discard. |
|I03, I04, I24 |036/037/044/045/046:T02 membership addition at fresh epoch, full member/exclusion rights, scoped legal effects, delete caller without family rights. |
|I05, I06, I09, I10, I25, I27 |010/011/026/042/045/046/055:T03/T04/T05 actual enqueue/backend death/second-process rejection/expiry/unknown SQL+fsync/restore/key rotation;prewarm outside gate. |
|I07, I08 |019/040/042/046:T04 full corpus/profile equality, source deltas, current rollback and old-profile buffer rejection. |
|I11 |035/036/044/045:T06 live accepted filters and final semantic epoch despite unchanged source bytes. |
|I12 |002/023/024/031:T07 before canonical acceptance;source/SQL/hash/offset equality with all strings and Unicode negatives. |
|I13, I14 |028/039/041/044:T08/T09 actual SQL, slot fairness, typed scores, complete qualifier packing. |
|I15, I16, I26 |012/021/036/046/047:T10 roots including pending families and retained citations, claim/hold races, exact physical absence and liveR2 oldR1 retention. |
|I17, I18, I20 |014/030/038/054/055:T11/T12/T14 actual bounded streams/roles/churn/load/reviewer/error/circuit evidence. |
|I19, I21 |007/012/013/027/043/044/048:T13 anti-gaming bundles plus durable register/fenced complete source publication. |

All visible mutations use **singleton gate → tenant serving/semantic/lifecycle heads → families UUID order → documents UUID order → job/target rows**. Expensive parsing, model load/prewarm, index builds and physical purge run outside the gate. This owner/order contract is shared by publication, semantics, families, revocation, GC, restore and identity sync; no module may introduce an independent writer or lock inversion.
