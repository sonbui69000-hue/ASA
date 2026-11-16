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
