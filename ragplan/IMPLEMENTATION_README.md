# Enterprise RAG implementation entry point

**[FINAL_IMPLEMENTATION_SPEC.md](FINAL_IMPLEMENTATION_SPEC.md) is the sole authoritative implementation blueprint.** It consolidates contract 2.2.0, HR01–HR14, RR01–RR05 and the latest final hostile review, including FR01's corrected HTTP-header example. Historical planning/review files remain audit evidence; do not select alternative behavior from them.

## How developers should use it

1. Read the specification's [authority/scope](FINAL_IMPLEMENTATION_SPEC.md#authority-and-scope), [architecture](FINAL_IMPLEMENTATION_SPEC.md#system-architecture), [pipeline](FINAL_IMPLEMENTATION_SPEC.md#pipeline-execution), [invariants](FINAL_IMPLEMENTATION_SPEC.md#exact-invariants), and [pending approvals](FINAL_IMPLEMENTATION_SPEC.md#approvals).
2. Start P00 using [C01–C16](FINAL_IMPLEMENTATION_SPEC.md#data-contracts), [S01–S09](FINAL_IMPLEMENTATION_SPEC.md#security-contracts) and the [corrected synthetic examples](FINAL_IMPLEMENTATION_SPEC.md#corrected-examples). Materialize maintained strict schemas/OpenAPI/SQL/DTOs with header/body/ownership/state/Unicode/hash/manifest negatives. Revision-1 schema 1.0.0 does not validate 2.2.0. The old reconciliation fixture retains its known invalid headers for audit; copy the corrected example instead.
3. Follow the [module/migration/phase contracts](FINAL_IMPLEMENTATION_SPEC.md#implementation-contracts). Run sealed migrations 0001–0007 before CP3. Pull the minimum review/semantic/profile/publication/dispatch/journal/deny/retention guards into the first published lexical slice. P07 completes lifecycle integration; it is not the first security phase. Spike actual synchronous transport and journal recovery early.
4. Use [T01–T14/ST01–ST21](FINAL_IMPLEMENTATION_SPEC.md#acceptance-matrix), [E01–E17](FINAL_IMPLEMENTATION_SPEC.md#evaluation-contracts) and the [failure traces](FINAL_IMPLEMENTATION_SPEC.md#failure-contracts) as consumer acceptance. Use pytest for backend/real SQL/fault behavior, Vitest for meaningful frontend contracts/components and Playwright for actual Vietnamese browser workflows. Read installed UI/UX Pro Max for interface work and the Playwright skill for browser work. Report executed results and limitations; documentation checks or test discovery are not runtime passes.
5. Settle A01/A02a/A03/A09 before permanent dependent architecture integration. Other approvals and measurements attach to their consumers. Disabled optional models, migration and synthesis do not block an otherwise qualified baseline. Keep unsupported/sparse cases explicitly review-only/unestablished.

The current task creates documentation only. Synthetic prototyping is **GO** and staged implementation **CONDITIONAL GO** when implementation is separately instructed. Confidential-data integration and production are **NO-GO** pending their approvals and executed gates. No owner approval is recorded by this specification.

## Non-negotiable workspace boundaries

Preserve the existing four-module shared data/Node authority and offline localStorage. Enterprise content uses its separate private service and never browser persistence. Use synthetic fixtures and keep real imported uniform/locker records outside the corpus, source, bundles, reports and external APIs. Preserve the imported workspace's sticky OpenRouter deny; enterprise inference is local only. No real SAP. UI/errors are Vietnamese and every button must work. Mock RBAC is not real security.

## Historical material and changes

`1/` contains the original research/schema/examples and superseded roadmap. `2/` contains the revised plans, independent hostile reports and reconciliation/evidence. `3/` contains a separate historical handbook prompt; it is not an additional deliverable or implementation instruction for consolidation. Top-level prompt files record prior tasks. The specification's [inventory](FINAL_IMPLEMENTATION_SPEC.md#source-inventory) and [traceability](FINAL_IMPLEMENTATION_SPEC.md#decision-traceability) identify the retained sources.

Use historical links to understand rationale or reproduce a counterexample, not to override the consolidated contract. New approved decisions must update the authoritative specification, impacted models/profiles/migrations and acceptance mapping together, with rationale and owner/evidence recorded. Preserve historical reports. If implementation reveals a concrete incompatible contract or essential unapproved choice, record it explicitly and stop only the unsafe/dependent branch; never silently relax an invariant or infer authority from a benchmark.

Read the [completeness assessment](FINAL_IMPLEMENTATION_SPEC.md#completeness-assessment) before making a readiness or release claim. Nothing in this entry point authorizes application implementation, external calls, deployment or additional real-data processing.
