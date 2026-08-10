---
name: scaffold-bolton-frontend-suite
description: Use this skill to scaffold a new frontend E2E test automation project using Playwright Test + TypeScript, following the context-driven testing (Michael Bolton) methodology plus the full living-documentation system — Page Objects, storageState auth, custom console reporter with an auto-generated test catalog and bug-regression detection, automatic screenshot evidence for Allure/HTML reports, a bugs-index.md + exploratory-log for tracking findings over time, and HICCUPPS-tagged scenarios. This is the frontend counterpart of scaffold-bolton-api-suite — same living-documentation conventions and file formats, different domain (UI instead of HTTP). Trigger on requests like "cria projeto de automação de frontend", "scaffold frontend", "novo projeto E2E", "criar suite de frontend".
---

# Scaffold Bolton Frontend Suite

Generates a brand-new Playwright + TypeScript frontend E2E test automation project. Unlike a bare Playwright starter, this includes the entire operating system built around it: a custom reporter that tracks every test's status over time, automatic detection of bugs that got fixed, screenshot evidence attached to every test in Allure/HTML reports, and a living-documentation pair (`bugs-index.md` + `exploratory-log/`) for tracking findings across sessions — the same conventions used by `scaffold-bolton-api-suite`, adapted to a UI domain (Page Objects instead of clients, HICCUPPS tags instead of the API 7-question checklist).

## What this skill does NOT do

It does not implement any real page or business logic. The generated project has the folder structure, configs, conventions docs (`COPILOT.md`, `docs/test-standards.md`), the full-featured console reporter, the automatic screenshot-evidence fixture, the living-doc skeletons, and boilerplate templates prefixed with `_` (`_template.page.ts`, `_template.spec.ts`) meant to be copied and adapted, not run as-is. The first real page/feature is implemented by the user (or by Copilot in a follow-up task) following the checklist in the generated `COPILOT.md`.

## Steps to execute

1. **Gather inputs** from the user (ask if not provided):
   - `PROJECT_NAME` — kebab-case name, e.g. `portal-consignado-frontend`
   - `TARGET_DIR` — absolute path where the project should be created (must not already exist, or must be empty)
   - `APP_NAME` — name of the app under test, used in Allure's environment info, e.g. `Portal Consignado`
   - `BASE_URL` — default base URL of the system (can be a placeholder like `https://app.example.com` if unknown yet)
   - `AUTH_REQUIRED` — does the app require login? (yes/no) — this changes which `playwright.config.ts` variant and which files get copied (see step 3)
   - `FRAMEWORK_UI` — UI framework of the app under test (Chakra UI, Material UI, etc. — informs selector guidance left as comments)
   - `APP_LANGUAGE` — main language of the app (informs a note in `COPILOT.md` about element text language)

2. **Copy the `templates/` directory** (located alongside this `SKILL.md`) into `TARGET_DIR`, preserving the full directory structure — this includes `docs/bugs-index.md` and `docs/exploratory-log/INDEX.md` as empty skeletons, ready for the first real entry. Do **not** copy `_auth-optional/`, `playwright.config.auth.ts`, or `playwright.config.noauth.ts` as-is — handle those in step 3.

3. **Resolve the `AUTH_REQUIRED` branch**:
   - If **yes**: copy `templates/playwright.config.auth.ts` to `TARGET_DIR/playwright.config.ts`, and copy the contents of `templates/_auth-optional/src/auth/` into `TARGET_DIR/src/auth/` (this brings `setup.ts` and the empty `.auth/` folder with its `.gitkeep`). Keep `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` in `.env.example`.
   - If **no**: copy `templates/playwright.config.noauth.ts` to `TARGET_DIR/playwright.config.ts` instead, do **not** create `src/auth/`, and remove the `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` lines from the copied `.env.example`.
   - Either way, delete the source `playwright.config.auth.ts`/`playwright.config.noauth.ts` filenames from `TARGET_DIR` after picking one — only `playwright.config.ts` should remain.
   - Note left in the generated project for the `auth` case: the `logged-in`/`logged-out` Playwright projects in `playwright.config.ts` match spec files by name pattern (`home.*\.spec\.ts` / `login\.spec\.ts`) — mention this naming convention when reporting back, since specs that don't follow it won't get `storageState` injected automatically.

4. **Replace placeholders** in every copied file:
   - `__PROJECT_NAME__` → `PROJECT_NAME`
   - `__APP_NAME__` → `APP_NAME`
   - `__BASE_URL__` → `BASE_URL`
   - `__FRAMEWORK_UI__` → `FRAMEWORK_UI`
   - `__APP_LANGUAGE__` → `APP_LANGUAGE`

5. **Create the remaining empty directories** that don't have template files (they hold no content until the first page/feature is added):
   - `src/pages/` (keep `_template.page.ts` as a reference; real page objects are added alongside it)
   - `src/utils/`

6. **Set up dependencies** (ask for confirmation first — this is reversible but non-trivial):
   ```bash
   cd TARGET_DIR
   npm install
   npx playwright install chromium
   ```

7. **Report back** what was created, specifically calling out:
   - The checklist in `COPILOT.md` ("Checklist para nova página/feature") as the next step for implementing the first page.
   - That `docs/test-catalog.md` will be created automatically the first time `npm test` runs — nothing to do manually.
   - That `docs/bugs-index.md` and `docs/exploratory-log/` start empty and grow as real investigations/bugs happen — don't pre-fill them with hypothetical content.
   - If `AUTH_REQUIRED` was yes: the spec-filename convention (`home*.spec.ts` / `login.spec.ts`) the Playwright projects rely on to apply `storageState`, and that `src/auth/setup.ts` has `TODO`s that must be adapted to the app's real login selectors before the `setup` project can pass.
   - The HICCUPPS tags (`@smoke`/`@security`/`@validation`/`@ux`/`@boundary`/`@regression`) and that `@regression` is the one tag that must stay wired to `docs/bugs-index.md` for the bug-regression detection to work.

## Notes

- Do not invent example pages or business logic. If the user wants a first page scaffolded too, that's a separate, explicit follow-up task — apply the same checklist from `COPILOT.md`/`docs/test-standards.md`.
- Keep the generated `COPILOT.md` as the source of truth for conventions in the new project — `docs/test-standards.md` only holds the longer code-example walkthroughs referenced from it, it must not re-explain the same rules.
- The reporter (`src/reporters/console.reporter.ts`) and the `test-catalog.md`/bug-regression-detection logic are copied verbatim from the same design used in `scaffold-bolton-api-suite` — they're stack-agnostic (they only look at Playwright's `Suite`/`TestCase`/`TestResult` and file paths), no per-project logic to adapt.
- If a project needs **both** an API stack and a frontend stack, each lives in its own `TARGET_DIR` — never mix stacks in the same project.
