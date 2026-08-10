"""Sessao HTTP instrumentada — equivalente Python de
tests/fixtures/instrumented-request.ts do stack Playwright+TS.

Toda chamada feita atraves desta Session anexa um resumo de
request/response ao teste em execucao via allure.attach() — capturado
automaticamente pelo Allure e (quando configurado) pelo HTML report.
"""

import json
import re
from typing import Any, Dict

import allure
import requests

MAX_BODY_CHARS = 5000


def _truncate(text: str) -> str:
    if len(text) > MAX_BODY_CHARS:
        return f"{text[:MAX_BODY_CHARS]}\n... (truncado, {len(text)} caracteres no total)"
    return text


def _redact_headers(headers: Dict[str, str]) -> Dict[str, str]:
    clone = dict(headers)
    for key in list(clone.keys()):
        if key.lower() == "authorization":
            clone[key] = re.sub(r"^(Bearer\s+).+", r"\1<redacted>", clone[key], flags=re.IGNORECASE)
    return clone


def _summarize_request(kwargs: Dict[str, Any]) -> str:
    lines = []

    headers = kwargs.get("headers")
    if headers:
        lines.append(f"Headers: {json.dumps(_redact_headers(dict(headers)))}")

    params = kwargs.get("params")
    if params:
        lines.append(f"Query params: {json.dumps(params)}")

    json_body = kwargs.get("json")
    if json_body is not None:
        lines.append(f"Body:\n{_truncate(json.dumps(json_body, indent=2, ensure_ascii=False))}")

    data = kwargs.get("data")
    if data is not None:
        if isinstance(data, (bytes, bytearray)):
            lines.append(f"Body: [bytes, {len(data)} bytes]")
        else:
            lines.append(f"Body:\n{_truncate(str(data))}")

    files = kwargs.get("files")
    if files:
        items = files.items() if isinstance(files, dict) else files
        file_lines = []
        for key, value in items:
            name = value[0] if isinstance(value, (list, tuple)) else getattr(value, "name", str(value))
            file_lines.append(f"  {key}: <file {name}>")
        lines.append("Multipart:\n" + "\n".join(file_lines))

    return "\n".join(lines) if lines else "(sem corpo)"


def _summarize_response(response: requests.Response) -> str:
    content_type = response.headers.get("content-type", "")
    try:
        body_bytes = response.content
    except Exception:
        return "[corpo indisponível]"

    is_text_like = (
        "json" in content_type
        or content_type.startswith("text/")
        or "xml" in content_type
        or content_type == ""
    )
    if is_text_like:
        return _truncate(body_bytes.decode("utf-8", errors="replace"))
    return f"[binário: {len(body_bytes)} bytes, content-type: {content_type or 'desconhecido'}]"


class InstrumentedSession(requests.Session):
    """requests.Session que anexa request/response de toda chamada ao
    relatorio do teste atual. Todos os verbos (get/post/put/delete/patch)
    passam por `request()` internamente — um unico ponto de interceptacao."""

    def request(self, method: str, url: str, *args: Any, **kwargs: Any) -> requests.Response:
        response = super().request(method, url, *args, **kwargs)

        try:
            attachment = "\n".join(
                [
                    f"{method.upper()} {url}",
                    "",
                    "--- REQUEST ---",
                    _summarize_request(kwargs),
                    "",
                    "--- RESPONSE ---",
                    f"Status: {response.status_code}",
                    f"Headers: {json.dumps(dict(response.headers))}",
                    f"Body:\n{_summarize_response(response)}",
                ]
            )
            allure.attach(
                attachment,
                name=f"{method.upper()} {url}",
                attachment_type=allure.attachment_type.TEXT,
            )
        except Exception:
            pass  # Nunca deixar o anexo quebrar o teste de verdade.

        return response
