# __PROJECT_NAME__

Automação de testes de API usando Playwright Test e TypeScript.

## Configuração inicial

1. Instale dependências:

```bash
npm install
```

2. Execute o instalador do Playwright se quiser usar relatórios locais:

```bash
npx playwright install
```

## Execução dos testes

```bash
npm test
```

### Executar testes por tag

```bash
npm run test:smoke
npm run test:contract
npm run test:flow
npm run test:claims
npm run test:regression
npm run test:auth
```

### Executar relatórios Allure

```bash
npm run test:allure
npm run allure:generate
npm run allure:open
```

Todo teste — passando ou falhando — anexa o request e o response reais no Allure e no HTML report (`npm run report`), automaticamente. Nenhuma configuração adicional é necessária, ver `tests/fixtures/instrumented-request.ts`.

## Variáveis de ambiente

- `API_BASE_URL` - substitui a URL base padrão definida em `src/api/config/environment.ts`.
- Demais credenciais/variáveis de autenticação devem ser adicionadas conforme a necessidade da API (ver `.env.example`).

## Estrutura do projeto

- `src/api/config` - configuração centralizada de ambiente.
- `src/api/clients` - encapsulamento das chamadas HTTP por recurso (criado vazio — ver `COPILOT.md`).
- `src/api/models` - tipos das requisições e respostas (criado vazio).
- `src/api/contracts` - JSON Schemas e utilitários de validação de contrato (AJV).
- `tests/fixtures` - contexto HTTP, clientes e autenticação reutilizáveis, incluindo o request/response attachment.
- `tests/api` - suítes organizadas por domínio e endpoint (criado vazio).
- `playwright.config.ts` - configuração do Playwright Test.
- `docs/bugs-index.md` - fonte única de status de bugs/claims encontrados pelos testes (começa vazio).
- `docs/test-catalog.md` - catálogo de todo teste já executado, gerado automaticamente pelo reporter (não existe até o primeiro `npm test`).
- `docs/exploratory-log/` - achados e decisões de sessões de investigação (começa vazio).

## Convenções

Este projeto segue a mentalidade de Michael Bolton (context-driven testing). Veja `COPILOT.md` (regras e convenções) e `docs/test-standards.md` (exemplos de código) para os detalhes completos — incluindo o checklist para adicionar um novo endpoint e como manter `docs/bugs-index.md` e `docs/exploratory-log/` atualizados.
