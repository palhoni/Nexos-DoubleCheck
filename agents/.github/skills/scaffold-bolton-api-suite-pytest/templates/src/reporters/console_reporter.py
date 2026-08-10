"""Reporter customizado para pytest — equivalente Python do
src/reporters/console.reporter.ts do stack Playwright+TS.

Mantem docs/test-catalog.md (mesmo formato do stack TS) e detecta quando
um teste ligado a um bug aberto em docs/bugs-index.md vira de falhou
para passou entre execucoes.
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "docs" / "test-catalog.md"
BUGS_INDEX_PATH = REPO_ROOT / "docs" / "bugs-index.md"

CATALOG_HEADER = (
    "# Catalogo de testes\n\n"
    "Gerado automaticamente pelo reporter (`src/reporters/console_reporter.py`, via `conftest.py`) apos cada "
    "execucao que valida (roda) o teste — nao editar manualmente, o conteudo e mesclado a cada corrida de "
    "`pytest`.\n\n"
    "| Suite | Teste | Arquivo | Status | Ultima execucao |\n"
    "|---|---|---|---|---|"
)

CatalogRow = Dict[str, str]


def catalog_key(row: CatalogRow) -> str:
    return f"{row['file']}::{row['suite']}::{row['title']}"


def status_badge(status: str) -> str:
    return {
        "passed": "✅ passou",
        "failed": "❌ falhou",
        "timedOut": "⏰ timeout",
    }.get(status, f"❓ {status}")


def parse_status_badge(badge: str) -> str:
    if "✅" in badge:
        return "passed"
    if "⏰" in badge:
        return "timedOut"
    return "failed"


def load_catalog() -> Dict[str, CatalogRow]:
    catalog: Dict[str, CatalogRow] = {}
    if not CATALOG_PATH.exists():
        return catalog

    content = CATALOG_PATH.read_text(encoding="utf-8")
    for line in content.splitlines():
        if not line.startswith("|") or line.startswith("|---") or "| Suite |" in line:
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 5:
            continue
        suite, title, file_, status, last_run = cells[:5]
        if not suite or not title:
            continue
        row: CatalogRow = {
            "suite": suite,
            "title": title,
            "file": file_,
            "status": parse_status_badge(status),
            "lastRun": last_run,
        }
        catalog[catalog_key(row)] = row
    return catalog


def save_catalog(catalog: Dict[str, CatalogRow]) -> None:
    rows = sorted(catalog.values(), key=lambda r: (r["file"], r["title"]))
    lines = [
        f"| {r['suite']} | {r['title']} | {r['file']} | {status_badge(r['status'])} | {r['lastRun']} |"
        for r in rows
    ]
    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(CATALOG_HEADER + "\n" + "\n".join(lines) + "\n", encoding="utf-8")


def load_open_bug_file_map() -> Dict[str, List[str]]:
    """Mapeia cada arquivo .py mencionado na coluna "Teste(s)" de um bug
    ABERTO em docs/bugs-index.md para o(s) ID(s) de bug que o referenciam.
    Granularidade por arquivo, nao por titulo exato de teste — mesma
    limitacao/motivo do reporter TS (a coluna e texto livre)."""
    bug_map: Dict[str, List[str]] = {}
    if not BUGS_INDEX_PATH.exists():
        return bug_map

    content = BUGS_INDEX_PATH.read_text(encoding="utf-8")
    for line in content.splitlines():
        if not re.match(r"^\|\s*BUG-\d+\s*\|", line):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 5:
            continue
        bug_id, _, _, status, testes = cells[:5]
        if not bug_id or "✅" in status:
            continue
        files = re.findall(r"`([\w.-]+\.py)`", testes or "")
        for file_ in files:
            bug_map.setdefault(file_, []).append(bug_id)
    return bug_map


def find_bug_regression_flips(
    catalog_updates: List[CatalogRow],
    previous_catalog: Dict[str, CatalogRow],
) -> List[Tuple[CatalogRow, List[str]]]:
    bug_map = load_open_bug_file_map()
    if not bug_map:
        return []

    flips: List[Tuple[CatalogRow, List[str]]] = []
    for row in catalog_updates:
        if row["status"] != "passed":
            continue
        previous = previous_catalog.get(catalog_key(row))
        if not previous or previous["status"] != "failed":
            continue
        bug_ids = bug_map.get(Path(row["file"]).name)
        if bug_ids:
            flips.append((row, sorted(set(bug_ids))))
    return flips


def merge_and_save_catalog(
    catalog_updates: List[CatalogRow],
    previous_catalog: Optional[Dict[str, CatalogRow]] = None,
) -> None:
    if not catalog_updates:
        return
    merged = dict(previous_catalog) if previous_catalog is not None else load_catalog()
    for row in catalog_updates:
        merged[catalog_key(row)] = row
    save_catalog(merged)
