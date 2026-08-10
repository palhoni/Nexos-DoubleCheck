# Exemplos de código — Padrão de Testes de API (pytest)

Este documento **não repete** as regras e a mentalidade já descritas no `COPILOT.md` — ele existe só para os exemplos de código completos que não cabem confortavelmente num arquivo de regras enxuto. Leia o `COPILOT.md` primeiro (diretiva Bolton, 7 perguntas, markers, checklist); volte aqui quando precisar ver como o código realmente fica.

---

## Estrutura de diretórios

```
tests/
  fixtures/
    instrumented_session.py     # requests.Session que anexa request/response no Allure
  api/
    <dominio>/
      <recurso>/
        test_<recurso>.py
        test_auth.py
        test_<filtro>.py
        ...

src/
  clients/                      # Clients HTTP por recurso
  contracts/                    # JSON Schemas + validador jsonschema
  models/                       # Modelos Pydantic das respostas/requests

conftest.py                     # Fixtures base + hooks do reporter
```

**Regra**: cada endpoint ou domínio tem sua própria pasta. Dentro dela, os testes são organizados por funcionalidade (filtros, autenticação, contrato, etc.).

---

## Camadas do projeto

### 1. Client (`src/clients/`)

Encapsula as chamadas HTTP. Cada recurso da API tem seu próprio client.

```python
from typing import Optional
from requests import Response
from tests.fixtures.instrumented_session import InstrumentedSession


class ExampleClient:
    def __init__(self, session: InstrumentedSession, base_url: str):
        self.session = session
        self.base_url = base_url

    def list(self, token: Optional[str], page: int, page_size: int, filter_: Optional[str] = None) -> Response:
        headers = {"accept": "application/json"}
        if token:
            headers["authorization"] = f"Bearer {token}"
        params = {"page": page, "pageSize": page_size}
        if filter_:
            params["filter"] = filter_
        return self.session.get(f"{self.base_url}/example-resource", headers=headers, params=params)
```

### 2. Model (`src/models/`)

Classes Pydantic que representam as requisições e respostas da API.

```python
from typing import List
from pydantic import BaseModel


class ExampleItem(BaseModel):
    id: str
    name: str


class ExampleResultset(BaseModel):
    count: int


class ExampleMetadata(BaseModel):
    resultset: ExampleResultset


class ExampleResult(BaseModel):
    items: List[ExampleItem]


class ExampleResponse(BaseModel):
    metadata: ExampleMetadata
    result: ExampleResult
```

### 3. Contract (`src/contracts/`)

JSON Schema usado para validação estrutural da resposta via jsonschema.

```python
example_contract = {
    "type": "object",
    "additionalProperties": False,
    "required": ["metadata", "result"],
    "properties": {
        # ...
    },
}
```

### 4. Fixture (`conftest.py`)

Registra clients como fixtures do pytest. Ao adicionar um novo client, registre-o aqui:

```python
import pytest
from src.clients.example_client import ExampleClient


@pytest.fixture(scope="session")
def example_client(api_session, base_url):
    return ExampleClient(api_session, base_url)
```

---

## Anatomia de um teste

Cada passo lógico deve ser claro e isolado. Como `pytest` não tem um equivalente nativo a `test.step()`, use funções auxiliares nomeadas ou comentários `# Step:` para manter a mesma legibilidade — o anexo de request/response já aparece automaticamente no Allure graças à `InstrumentedSession`, então o foco aqui é a legibilidade da lógica de teste.

```python
import pytest
from src.models.example_models import ExampleResponse


@pytest.mark.smoke
def test_should_do_something_expected(example_client, auth_token):
    # Step 1 — Chamada HTTP (descrever o método, endpoint e parâmetros relevantes)
    response = example_client.list(auth_token, page=1, page_size=100, filter_="value")

    # Step 2 — Validação de status HTTP
    assert response.status_code == 200, "Expected the request to return HTTP 200"

    # Step 3 — Parse do body (quando necessário para asserts seguintes)
    body = ExampleResponse.model_validate(response.json())

    # Step 4+ — Validações de negócio
    assert len(body.result.items) > 0
    assert all(
        item.filter == "value" for item in body.result.items
    ), "Expected the filter not to leak unrelated items"
```

### Regras da anatomia

| Regra | Detalhe |
|-------|---------|
| **Passos claramente isolados** | Comentário `# Step:` ou função nomeada por etapa |
| **Nome/comentário descritivo na chamada HTTP** | Incluir método HTTP, endpoint e parâmetros relevantes |
| **Assert de status HTTP isolado** | Sempre validar o status antes de seguir |
| **Parse do body isolado, tipado** | Use o modelo Pydantic correspondente |
| **Asserts agrupados por tema** | Separe validação de paginação de validação de filtro, por exemplo |
| **Mensagens em todos os `assert`** | `assert condicao, "mensagem explicando o que era esperado"` |

### Critérios para `@pytest.mark.smoke`

Um teste recebe o marker `smoke` quando valida que o caminho principal de um fluxo crítico está funcionando. Exemplos:
- API respondendo (reachability)
- Login com credenciais válidas retornando token (se aplicável)
- Endpoint principal retornando dados com autenticação
- Acesso sem token sendo bloqueado com 401 (se aplicável)

---

## Categorias de cenários — exemplos de código

Cada categoria abaixo corresponde a uma das 7 perguntas Bolton do `COPILOT.md`. Só o esqueleto do teste, sem repetir a explicação da pergunta.

### Smoke / Contrato

```python
@pytest.mark.smoke
def test_should_return_resources_with_valid_filters(...): ...

@pytest.mark.contract
def test_should_comply_with_the_response_contract(...): ...
```

### Consistência interna

`metadata.resultset.count` vs `len(result.items)`, totais parciais somando o total geral.

```python
def test_should_report_a_count_that_matches_the_actual_number_of_items(...): ...
```

### Integridade dos dados

Unicidade, formato, completude, ausência de lixo.

```python
def test_should_return_unique_values_without_duplicates(...): ...
def test_should_return_values_in_the_expected_standard_format(...): ...
```

### Cross-reference

```python
def test_should_only_list_values_that_return_results_when_used_as_a_filter(...): ...
def test_should_list_every_value_that_exists_in_the_main_resource(...): ...
```

### Idempotência

```python
def test_should_return_the_same_options_on_consecutive_calls(...): ...
```

### Autenticação

```python
@pytest.mark.auth
class TestResourceAuthentication:
    def test_should_return_401_when_no_token_is_provided(self, ...): ...
    def test_should_return_401_when_token_is_invalid(self, ...): ...
    def test_should_return_401_when_token_is_malformed_jwt(self, ...): ...
    def test_should_return_401_when_authorization_header_has_wrong_scheme(self, ...): ...
```

### Autorização entre perfis/grupos — pergunta 8 (IDOR) e 8b (conteúdo por perfil)

```python
@pytest.mark.authz
class TestResourceCrossTenantAccess:
    # Pergunta 8 — acesso cruzado por ID direto
    def test_should_return_403_or_404_when_client_requests_a_resource_id_from_another_group(
        self, resource_client, client_auth_token
    ):
        response = resource_client.get_by_id(client_auth_token, OTHER_GROUP_RESOURCE_ID)
        assert response.status_code in (403, 404)

    # Pergunta 8b — dois perfis recebem 200, mas o conteúdo deveria divergir
    def test_should_scope_the_listing_to_the_caller_group_even_when_status_is_200_for_both_profiles(
        self, resource_client, admin_auth_token, client_auth_token
    ):
        admin_view = resource_client.list(admin_auth_token).json()
        client_view = resource_client.list(client_auth_token).json()

        assert client_view["result"]["total"] < admin_view["result"]["total"], (
            "CLIENT nao deveria enxergar o dataset completo da plataforma"
        )
```

Quando o comportamento correto ainda não foi confirmado pelo time, documente o estado atual como `authz` sem assumir certo/errado, e registre a dúvida em `docs/bugs-index.md`.

### Idempotência de escrita (`idempotency`)

```python
@pytest.mark.idempotency
def test_should_not_duplicate_the_resource_when_the_same_post_is_retried(resource_client, auth_token):
    idempotency_key = f"test-{int(time.time())}"
    first = resource_client.create(auth_token, payload, idempotency_key=idempotency_key)
    retry = resource_client.create(auth_token, payload, idempotency_key=idempotency_key)

    assert retry.status_code == first.status_code
    listing = resource_client.list(auth_token).json()
    matches = [i for i in listing["result"]["items"] if i.get("idempotencyKey") == idempotency_key]
    assert len(matches) == 1
```

### Ataques de software (Whittaker)

```python
@pytest.mark.boundary
def test_should_reject_an_unexpected_http_method(api_session, base_url, auth_token):
    response = api_session.delete(
        f"{base_url}/read-only-resource", headers={"authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code in (404, 405)


@pytest.mark.boundary
def test_should_handle_rapid_repeated_requests_without_corrupting_state(resource_client, auth_token):
    responses = [resource_client.create(auth_token, payload) for _ in range(10)]
    # Confirma que ou todas sucederam de forma consistente, ou a API rejeitou
    # o excesso com um status claro (429/409) — nunca um estado parcialmente corrompido.
```

### Filtros / Boundaries

```python
class TestResourceFilterName:
    def test_should_return_a_contract_compliant_result_for_a_valid_filter_value(self, ...): ...
    def test_should_include_items_exactly_on_the_boundary_value(self, ...): ...
    def test_should_produce_a_subset_when_the_filter_narrows(self, ...): ...
    def test_should_preserve_totals_when_page_size_changes(self, ...): ...
    def test_should_return_a_consistent_empty_page_for_a_nonexistent_value(self, ...): ...

    @pytest.mark.parametrize("invalid_value", ["invalid-format", " spaces ", "wrong/format"])
    def test_should_reject_invalid_filter_value(self, invalid_value, ...): ...
```

### Validação de entrada

Valida que a API retorna 400 com erros descritivos para entradas inválidas. Ajuste o formato do erro conforme o contrato real da API.

---

## Helper functions

Quando múltiplos testes repetem as mesmas assertions, extraia para uma função helper no final do arquivo:

```python
def assert_validation_error_response(response) -> None:
    body = response.json()
    assert body["level"] == "error"
    assert body["statusCode"] == 400
    # ...
```
