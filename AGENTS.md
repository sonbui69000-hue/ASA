# Vinmec Administrative Prototype

- Demo seed and automated-test data must be synthetic. The user explicitly authorized importing original uniform/locker workbook records into the local workspace; those records stay out of source, fixtures, bundles, public reports, and external APIs. OpenRouter must be blocked for the imported workspace.
- No real SAP APIs. Phase 6.2 explicitly permits server-side OpenRouter calls using synthetic, authorized data only; no other external LLM APIs.
- Vietnamese UI throughout.
- All buttons must perform meaningful actions.
- All modules must use consistent shared data.
- Use localStorage for demo persistence.
- Business rules must be deterministic.
- AI responses must be grounded in mock data.
- Test workflows with Playwright.
- Maintain a professional enterprise UI.
- Never claim mock RBAC provides real security.
- Use installed project skills when relevant. Use UI/UX Pro Max for interface design, Playwright for browser verification, and Vitest for automated logic and component testing. Never claim a test passed unless it was executed.

## Enterprise RAG implementation sessions

- The sole architecture authority is [ragplan/FINAL_IMPLEMENTATION_SPEC.md](ragplan/FINAL_IMPLEMENTATION_SPEC.md), contract 2.2.0. Read [ragplan/implementation/README.md](ragplan/implementation/README.md), the assigned ticket, and its exact requirement clauses before coding; historical plans/reviews are rationale and regression evidence.
- Follow [codex-workflow.md](ragplan/implementation/codex-workflow.md), dependencies and phase gates. Implement only the assigned scope; never silently change contracts or weaken security. Record deviations and obtain the applicable owner approval before changing requirements. Preserve unrelated application behavior. Pending approvals block their dependent permanent integration/exposure, not safe isolated synthetic preparation.
- The enterprise service is separate from the Node business authority and offline demo. Use synthetic tests only; keep the imported workspace outside its corpus and external calls. Enterprise inference is local only, and enterprise content/tokens/responses never persist in browser localStorage or offline caches. Preserve all existing instructions above.
- Use pytest for the proposed Python backend and actual SQL/RLS, process, transport, journal and storage verification; use Vitest/RTL for frontend behavior and Playwright for real Vietnamese browser workflows. Required integration checks cannot be replaced by mocks. Report failed, blocked and unexecuted tests honestly; discovery or historical results are not passes.
- Do not mark a ticket DONE without requirement-level acceptance evidence and independent code review. Update [progress.md](ragplan/implementation/progress.md) with files, commands/configuration/exit codes/counts/artifact hashes, failures, deviations and remaining work. Run `python3 ragplan/implementation/verify-plan.py` for roadmap integrity; it does not establish runtime readiness.
