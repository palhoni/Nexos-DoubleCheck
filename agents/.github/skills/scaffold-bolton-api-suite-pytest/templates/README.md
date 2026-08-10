# __PROJECT_NAME__

Automação de testes de API usando pytest e Python.

## Configuração inicial

1. Crie e ative um ambiente virtual:

```bash
python3 -m venv venv
source venv/bin/activate
```

2. Instale as dependências:

```bash
pip install -r requirements.txt
```

3. Copie `.env.example` para `.env` e ajuste conforme necessário.

## Execução dos testes

```bash
pytest
```

### Executar testes por marker

```bash
pytest -m smoke
pytest -m contract
pytest -m flow
pytest -m claims
pytest -m regression
pytest -m auth
```

### Executar relatórios Allure

```bash
pytest --alluredir=allure-results
allure generate allure-results --clean -o allure-report
allure open allure-report
```

Todo teste — passando ou falhando — anexa o request e o response reais no Allure, automaticamente. Nenhuma configuração adicional é necessária, ver `tests/fixtures/instrumented_session.py`.

## Variáveis de ambiente

- `API_BASE_URL` - substitui a URL base padrão definida em `conftest.py`.
- Demais credenciais/variáveis de autenticação devem ser adicionadas conforme a necessidade da API (ver `.env.example`).

## Estrutura do projeto

- `src/clients` - encapsulamento das chamadas HTTP por recurso (criado vazio — ver `COPILOT.md`).
- `src/models` - modelos Pydantic das requisições e respostas (criado vazio).
- `src/contracts` - JSON Schemas e utilitários de validação de contrato (jsonschema).
- `src/reporters` - lógica do reporter customizado (catálogo de testes + detecção de bug corrigido).
- `tests/fixtures` - sessão HTTP instrumentada, reutilizável por todos os clients.
- `tests/api` - suítes organizadas por domínio e endpoint (criado vazio).
- `conftest.py` - hooks do reporter + fixtures base (`api_session`, `base_url`, `auth_token` se aplicável).
- `docs/bugs-index.md` - fonte única de status de bugs/claims encontrados pelos testes (começa vazio).
- `docs/test-catalog.md` - catálogo de todo teste já executado, gerado automaticamente pelo reporter (não existe até o primeiro `pytest`).
- `docs/exploratory-log/` - achados e decisões de sessões de investigação (começa vazio).

## Convenções

Este projeto segue a mentalidade de Michael Bolton (context-driven testing). Veja `COPILOT.md` (regras e convenções) e `docs/test-standards.md` (exemplos de código) para os detalhes completos — incluindo o checklist para adicionar um novo endpoint e como manter `docs/bugs-index.md` e `docs/exploratory-log/` atualizados.
