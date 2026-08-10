---
name: scaffold-bolton-api-suite
description: Use this skill to scaffold a new API test automation project using Playwright Test + TypeScript, following the context-driven testing (Michael Bolton) methodology plus a full living-documentation system — clients/models/contracts/fixtures layout, custom console reporter with an auto-generated test catalog and bug-regression detection, request/response attachments for Allure/HTML reports, AJV contract validation, a bugs-index.md + exploratory-log for tracking findings over time, and the Bolton 7-question checklist. Trigger on requests like "cria um projeto novo de testes de API", "scaffold a playwright api project", "novo projeto de automação de API".
---

# Scaffold Bolton API Suite

Generates a brand-new Playwright + TypeScript API test automation project, replicating the full architecture used in `con-api-automation`, generic and ready for any API. Unlike a bare Playwright starter, this includes the entire operating system built around it: a custom reporter that tracks every test's status over time, automatic detection of bugs that got fixed, request/response evidence attached to every test in Allure/HTML reports, and a living-documentation pair (`bugs-index.md` + `exploratory-log/`) for tracking findings across sessions.

## What this skill does NOT do

It does not implement any example endpoint (no health/login client). The generated project has the folder structure, configs, conventions docs (`COPILOT.md`, `docs/test-standards.md`), the AJV contract validator, the full-featured console reporter, the request/response attachment instrumentation, the living-doc skeletons, and a fixture file with only the base `apiContext`. The first real endpoint is implemented by the user (or by Copilot in a follow-up task) following the checklist in the generated `COPILOT.md`.

## Steps to execute

1. **Gather inputs** from the user (ask if not provided):
   - `PROJECT_NAME` — kebab-case name, e.g. `payments-api-automation`
   - `TARGET_DIR` — absolute path where the project should be created (must not already exist, or must be empty)
   - `API_BASE_URL` — default base URL for the API under test (can be a placeholder like `https://api.example.com` if unknown yet)
   - Whether the API requires authentication (token/login). This only affects a comment left in `tests/fixtures/api.fixture.ts` and `.env.example` — no auth client is implemented either way.

2. **Copy the `templates/` directory** (located alongside this `SKILL.md`) into `TARGET_DIR`, preserving the full directory structure — this includes `docs/bugs-index.md` and `docs/exploratory-log/INDEX.md` as empty skeletons, ready for the first real entry.

3. **Replace placeholders** in every copied file:
   - `__PROJECT_NAME__` → `PROJECT_NAME`
   - `__API_BASE_URL__` → `API_BASE_URL`

4. **Create the remaining empty directories** that don't have template files (they hold no content until the first endpoint is added):
   - `src/api/clients/`
   - `src/api/models/`
   - `tests/api/`

5. **Run `npm install`** inside `TARGET_DIR` (ask for confirmation first — installing dependencies is a reversible but non-trivial action).

6. **Report back** what was created, specifically calling out:
   - The checklist in `COPILOT.md` ("Checklist para novo endpoint") as the next step for implementing the first endpoint.
   - That `docs/test-catalog.md` will be created automatically the first time `npm test` runs — nothing to do manually.
   - That `docs/bugs-index.md` and `docs/exploratory-log/` start empty and grow as real investigations/bugs happen — don't pre-fill them with hypothetical content.

## Notes

- Do not invent example business logic. If the user wants a first endpoint scaffolded too, that's a separate, explicit follow-up task — apply the same checklist from `COPILOT.md`/`docs/test-standards.md` used in `con-api-automation`.
- Keep the generated `COPILOT.md` as the source of truth for conventions in the new project — `docs/test-standards.md` only holds the longer code-example walkthroughs referenced from it, it must not re-explain the same rules (that duplication was a real problem found in the previous version of this skill — don't reintroduce it).
- The reporter, the request/response instrumentation, and the bug-regression detection are copied verbatim from `con-api-automation` (they're already fully generic — no per-project logic to adapt).
