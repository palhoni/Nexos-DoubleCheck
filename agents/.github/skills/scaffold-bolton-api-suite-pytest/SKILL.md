---
name: scaffold-bolton-api-suite-pytest
description: Use this skill to scaffold a new API test automation project using pytest + Python, following the context-driven testing (Michael Bolton) methodology plus the full living-documentation system — clients/models/contracts/fixtures layout, custom reporter (pytest hooks) with an auto-generated test catalog and bug-regression detection, request/response attachments for Allure via an instrumented requests.Session, jsonschema contract validation, a bugs-index.md + exploratory-log for tracking findings over time, and the Bolton 7-question checklist. This is the pytest counterpart of scaffold-bolton-api-suite (Playwright+TS) — same conventions and file formats, different stack. Trigger on requests like "cria um projeto novo de testes de API em Python", "scaffold a pytest api project", "novo projeto de automação de API com pytest".
---

# Scaffold Bolton API Suite (pytest)

Generates a brand-new pytest + Python API test automation project, following the exact same conventions and living-documentation formats as `scaffold-bolton-api-suite` (the Playwright+TypeScript version) — `docs/bugs-index.md` and `docs/test-catalog.md` are **byte-format-compatible** between the two stacks, so tooling and agents built against one work against the other without changes.

## What this skill does NOT do

It does not implement any example endpoint (no health/login client). The generated project has the folder structure, configs, conventions docs (`COPILOT.md`, `docs/test-standards.md`), the jsonschema contract validator, the full-featured reporter (`conftest.py` + `src/reporters/console_reporter.py`), the request/response attachment instrumentation (`InstrumentedSession`), the living-doc skeletons, and a `conftest.py` with only the base `api_session`/`base_url` fixtures. The first real endpoint is implemented by the user (or by Copilot in a follow-up task) following the checklist in the generated `COPILOT.md`.

## Steps to execute

1. **Gather inputs** from the user (ask if not provided):
   - `PROJECT_NAME` — kebab-case name, e.g. `payments-api-automation`
   - `TARGET_DIR` — absolute path where the project should be created (must not already exist, or must be empty)
   - `API_BASE_URL` — default base URL for the API under test (can be a placeholder like `https://api.example.com` if unknown yet)
   - Whether the API requires authentication (token/login). This only affects a comment left in `conftest.py` and `.env.example` — no auth client is implemented either way.

2. **Copy the `templates/` directory** (located alongside this `SKILL.md`) into `TARGET_DIR`, preserving the full directory structure — this includes `docs/bugs-index.md` and `docs/exploratory-log/INDEX.md` as empty skeletons, ready for the first real entry.

3. **Replace placeholders** in every copied file:
   - `__PROJECT_NAME__` → `PROJECT_NAME`
   - `__API_BASE_URL__` → `API_BASE_URL`

4. **Create the remaining empty directories** that don't have template files (they hold no content until the first endpoint is added):
   - `src/clients/`
   - `src/models/`
   - `tests/api/`

5. **Set up the environment and install dependencies** (ask for confirmation first — this is reversible but non-trivial):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
   Deliberately uses `requirements.txt`, not `pip install -e .` — the project isn't meant to be installed as a package (`conftest.py` adds the project root to `sys.path` directly), and editable installs from a bare `pyproject.toml` require pip 21.3+, which isn't a safe assumption.

6. **Report back** what was created, specifically calling out:
   - The checklist in `COPILOT.md` ("Checklist para novo endpoint") as the next step for implementing the first endpoint.
   - That `docs/test-catalog.md` will be created automatically the first time `pytest` runs — nothing to do manually.
   - That `docs/bugs-index.md` and `docs/exploratory-log/` start empty and grow as real investigations/bugs happen — don't pre-fill them with hypothetical content.
   - That the marker-based tag convention (`@pytest.mark.smoke`, etc.) replaces the `[@tag]`-in-name convention from the Playwright/TS stack, since Python identifiers can't contain those characters — same filtering effect via `pytest -m <marker>`.

## Notes

- Do not invent example business logic. If the user wants a first endpoint scaffolded too, that's a separate, explicit follow-up task — apply the same checklist from `COPILOT.md`/`docs/test-standards.md`.
- Keep the generated `COPILOT.md` as the source of truth for conventions in the new project — `docs/test-standards.md` only holds the longer code-example walkthroughs referenced from it, it must not re-explain the same rules.
- The reporter (`src/reporters/console_reporter.py` + the `pytest_sessionstart`/`pytest_runtest_logreport`/`pytest_terminal_summary` hooks in `conftest.py`) and the request/response instrumentation (`InstrumentedSession`) are copied verbatim — they're already fully generic, no per-project logic to adapt.
- If a project needs **both** an API stack and a frontend stack (e.g. this API project alongside a `scaffold-bolton-frontend-suite` project), each lives in its own `TARGET_DIR` — never mix stacks in the same project.
