import os
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.reporters.console_reporter import (  # noqa: E402
    find_bug_regression_flips,
    load_catalog,
    merge_and_save_catalog,
)
from tests.fixtures.instrumented_session import InstrumentedSession  # noqa: E402

_catalog_updates = []
_previous_catalog = {}


def pytest_sessionstart(session):
    global _previous_catalog
    _previous_catalog = load_catalog()


def pytest_runtest_logreport(report):
    is_final_call = report.when == "call"
    is_setup_error = report.when == "setup" and report.outcome != "passed"
    if not (is_final_call or is_setup_error):
        return

    status = "passed" if report.outcome == "passed" else "failed"
    file_part, *rest = report.nodeid.split("::")
    if len(rest) >= 2:
        suite, title = rest[0], "::".join(rest[1:])
    else:
        suite = Path(file_part).stem
        title = rest[0] if rest else report.nodeid

    _catalog_updates.append(
        {
            "suite": suite,
            "title": title,
            "file": file_part,
            "status": status,
            "lastRun": date.today().isoformat(),
        }
    )


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    if not _catalog_updates:
        return

    flips = find_bug_regression_flips(_catalog_updates, _previous_catalog)
    if flips:
        terminalreporter.write_line("")
        terminalreporter.write_line(
            "⚠ Possíveis bugs corrigidos — testes que falhavam agora passam:",
            yellow=True,
            bold=True,
        )
        for row, bug_ids in flips:
            terminalreporter.write_line(
                f"  {', '.join(bug_ids)} — \"{row['title']}\" ({row['file']}) passou nesta execução."
            )
        terminalreporter.write_line(
            "  Confirme e atualize docs/bugs-index.md se for uma correção real."
        )
        terminalreporter.write_line("")

    merge_and_save_catalog(_catalog_updates, _previous_catalog)


@pytest.fixture(scope="session")
def base_url():
    return os.getenv("API_BASE_URL", "__API_BASE_URL__")


@pytest.fixture(scope="session")
def api_session():
    session = InstrumentedSession()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


# Se a API requer autenticacao, adicione uma fixture de token aqui, ex:
#
# @pytest.fixture(scope="session")
# def auth_token(api_session, base_url):
#     response = api_session.post(
#         f"{base_url}/auth/login",
#         json={
#             "email": os.getenv("API_USER_EMAIL", ""),
#             "password": os.getenv("API_USER_PASSWORD", ""),
#         },
#     )
#     assert response.ok, f"Authentication setup failed with HTTP {response.status_code}: {response.text}"
#     body = response.json()
#     assert body.get("token"), "Authentication setup did not return a token"
#     return body["token"]
