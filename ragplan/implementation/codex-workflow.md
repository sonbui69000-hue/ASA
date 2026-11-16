# Codex implementation, handoff and independent review

The specification remains [architectural authority](../FINAL_IMPLEMENTATION_SPEC.md#authority-and-scope); this [roadmap](README.md) governs execution. An implementation session begins only when coding is separately requested. This planning task creates no service, installs no assets, calls no external inference and deploys nothing.

## Session procedure

1. Read repository AGENTS.md, specification authority/invariants/approvals, the assigned ticket, every referenced source unit and its predecessor handoffs. Inspect current code and worktree before changing anything. Preserve unrelated user changes and the imported workspace. Never read/copy its records into a RAG fixture.
2. Check dependencies, accepted contract/profile revisions, relevant owner decisions and actual environment/assets. Missing later benchmarks do not block building their harness. Missing required authority or actual security boundary blocks that dependent acceptance. Continue independent safe work while recording a precise blocker.
3. Claim the ticket in progress.md with session/date/base commit/worktree and planned scope. Obtain one integration owner for schemas, migrations, heads, DTOs and other shared files. Use a worktree for independent modules only when dependencies and file ownership permit it; do not infer permission to delegate to agents from a parallelism table.
4. Write meaningful behavior assertions for assigned requirements before the component change, as required by the specification. Implement only assigned scope. Reuse shared strict contracts, context, transaction/lock order and generated DTOs. Never silently redefine an enum, identifier, revision, score/token unit, route, predicate, hash body or lifecycle guarantee.
5. Run required checks at the actual boundary. Unit fixtures can isolate models; actual SQL/RLS/pool, OIDC protocol, sandbox, scanner, broker, journal, storage, transport and browser acceptance require those integrations. An injected encoder never establishes actual tokenization/neural quality. Never weaken security or use blanket mocks to make tests pass.
6. Capture exact command, working directory/configuration, commit, exit code, collected/executed/passed/failed/skipped counts, duration and private artifact hashes. Inspect failures; report missing/unexecuted tests honestly. Listing/discovery and historical counts are not results. Do not add empty/skip-only tests to satisfy a named file.
7. Reconcile every assigned requirement to actual implementation and exact test nodes, including negatives and fault schedules. Keep unsupported optional consumers disabled. Run relevant existing-app regressions if touched; preserve offline localStorage/shared business data and sticky imported-workspace deny.
8. Produce the handoff below and request independent code review. The implementer can set REVIEW_READY; only reviewed acceptance evidence permits DONE. Deferred/blocked/failed gates remain visible. Update progress/matrix metadata without silently dropping scope.

## Status and evidence rules

Ticket status is TODO, IN_PROGRESS, BLOCKED, REVIEW_READY, DONE, or EVALUATED_DISABLED. All tickets start TODO. Test result status is separately passed, failed, blocked, not_executed. A source requirement remains PLANNED until linked evidence exists; a document inventory is never a runtime pass. Where a source unit spans several tickets, each completes only its numbered contribution. Record PARTIAL until all enabled contributions and final consumer checks are accepted. A schema ticket finishing does not complete later API, transport, lifecycle or operating controls; those later controls also do not create a circular prerequisite for the schema ticket.

Optional E-series tickets may finish a valid experiment while failing promotion; record EVALUATED_DISABLED and its failure/negative result. A baseline ticket whose consumer gate is blocked is not DONE. A phase exits only when its minimum required consumers and gates pass; disabled optional models, larger unsupported scale, optional import and free synthesis do not block a qualified baseline. Real-data/identity/security/operations approvals cannot be replaced by a benchmark. Approval cannot replace executed tests.

Changes to status require evidence links under `services/enterprise-rag/docs/checkpoints/<ticket>/` for synthetic metadata or an opaque protected artifact manifest. Real-corpus raw outputs, queries, notes and screenshots stay private outside repository/build/public reports. Shared handoffs use synthetic examples/aggregate metrics only. Evidence IDs/metadata can themselves be sensitive; retain them under the approved policy.

## Standard implementation handoff

```text
Ticket / phase / base and result commit / contract and profile revisions:
Session and isolated synthetic environment/worktree:
Objective delivered; enabled versus disabled consumer scope:
Requirements:
  REQ-ID -> actual code symbol/transaction/route -> exact test node -> result artifact/hash
  Unfinished clauses and why they remain blocked/deferred:
Files changed and purpose; migration/contract/generated-file changes:
Interfaces/state/epoch/lock-order impact and downstream consumers:
Tests:
  command; cwd/config; exit code; collected/executed/pass/fail/skip; duration; artifact hash
  actual versus injected model/scanner/SQL/transport/browser boundaries
  deterministic race/fault schedule and observed order/invariant
Failures / blocked / not_executed; exact missing prerequisite and owner:
Deviations and approval record (or none); unrelated behavior preserved:
Data/egress/browser-storage evidence; no real records in reports:
Residual risk, supported/unestablished slices and limitations:
Independent reviewer, review evidence and unresolved findings:
Next ready ticket and any shared-file integration reservation:
```

For large test runs, prepare the executable automation and checkpoint run state, then resume evidence collection. Do not fake a long soak/reviewer observation or mark DONE merely because one interactive session ends.

## Independent code review

The reviewer uses a fresh session or accountable reviewer distinct from the implementer. This does not spawn or authorize another agent automatically. Review actual code, migrations, roles, tests, configuration and artifacts; do not trust the handoff alone.

1. Load specification, assigned requirement clauses and exact diff. Confirm every change has a legitimate requirement and every assigned clause has an implementation assertion. Check contract compatibility/ownership and unrelated app preservation.
2. Inspect source/ancestor tenant constraints, FORCE RLS/runtime/helper privileges, live deny overlay, all-source permissions and separate review capabilities. Inspect actual query plans/context resets where applicable.
3. Trace visible mutations through stable operation/replay authorization, canonical gate/SQL lock order, revision/semantic/family/corpus/root changes, immutable outcome, fsynced checkpoint and Ack. Inspect actual synchronous transport and original blocks, uncertainty sealing, death fencing and expiry limitations.
4. Trace evidence/maps/typed facts/qualifiers/intervals/complete membership/profile manifests and source/hash validation. Confirm semantic correction cannot leave an alias trusted in static vectors; model cutover cannot omit a source; retention cannot destroy a current root or widen purger privileges.
5. Run the ticket's meaningful acceptance commands in an isolated synthetic environment and inspect exact test nodes/fault barriers. Mutation/metamorphic tests must fail if the required guard is removed. Verify actual model/tokenizer claims separately. A mocked API response does not establish browser/API integration.
6. Record severity, concrete counterexample, violated REQ/spec section, affected consumer, required fix and retest. Reopen only the concrete incompatible branch; do not start another general redesign without evidence. No Critical/High violation remains for accepted scope. Blocked resources/approvals remain named gates.
7. Sign requirement-level disposition with command/artifact evidence. Only then update DONE/phase checkpoint. Production recommendation additionally needs CP9 owners and actual operational/representative evidence; a reviewer cannot grant a new audience or deploy by signing code review.

## Change control

Record a deviation before changing any architectural requirement. Include existing exact source, concrete counterexample, proposed change/rationale, security/lifecycle impact, dependent tickets/migrations/profiles/DTOs/gold/tests and owner decision required. Obtain approval from the appropriate user/security/business/records/operations authority before applying a requirement change. Routine implementation choices within already authorized scope need no repeated permission.

Update the sole specification, its implementation entry point, this roadmap/matrix/plan-data, contracts and acceptance together once approved. Preserve historical hostile reports/fixtures; do not overwrite a counterexample to conceal the defect. A source-hash audit failure forces reconciliation, not a silent baseline refresh. Rejected A09(topology/expiry/slow recovery) reopens that protocol; there is no lock-only, lease-based or HA fallback selected by a developer.

## Integration discipline

Take predecessor acceptance evidence before merging dependent behavior. Contract/migration owner serializes schemas/OpenAPI/DTOs,0001–0007,`db/models`, transaction heads, authority gate, profiles and evidence manifests. Independent parser/frontend/benchmark worktrees may consume frozen fixtures/contracts; do not merge placeholder authorization or incomplete schema into a serving environment. Resolve conflicts by rechecking actual ownership/invariants and rerun affected tests. Schema rollback is forward repair/read compatibility, never destructive downgrade or reseeding. Re-estimate after CP3; preserve the specification's 20% integration reserve and do not promise the superseded five-week plan.
