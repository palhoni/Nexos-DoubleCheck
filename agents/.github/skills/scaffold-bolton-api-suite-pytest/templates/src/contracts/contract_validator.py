"""Validador de contrato JSON Schema — equivalente Python de
src/api/contracts/contract-validator.ts (que usa AJV no stack TS).
Usa a biblioteca `jsonschema`.
"""

from typing import Any, Dict, List

from jsonschema import Draft7Validator
from jsonschema.exceptions import ValidationError


def compile_contract(schema: Dict[str, Any]) -> Draft7Validator:
    return Draft7Validator(schema)


def format_contract_errors(errors: List[ValidationError]) -> str:
    if not errors:
        return "No contract errors"

    lines = []
    for error in errors:
        path = "/" + "/".join(str(p) for p in error.absolute_path) if error.absolute_path else "/"
        lines.append(f"{path} {error.message}")
    return "\n".join(lines)


def validate_contract(validator: Draft7Validator, instance: Any) -> List[ValidationError]:
    """Retorna a lista de erros (vazia se valido) — chame format_contract_errors()
    para uma mensagem legivel a passar pro assert."""
    return sorted(validator.iter_errors(instance), key=lambda e: list(e.absolute_path))
