# __PROJECT_NAME__

Automação de testes E2E de frontend para **__APP_NAME__**, usando Playwright Test e TypeScript.

## Configuração inicial

1. Instale dependências:

```bash
npm install
npx playwright install chromium
```

2. Copie `.env.example` para `.env` e ajuste `BASE_URL` e credenciais de teste.

## Execução dos testes

```bash
npm test
```

### Executar testes por tag

```bash
npm run test:smoke
npm run test:security
npm run test:validation
npm run test:ux
npm run test:boundary
npm run test:regression
npm run test:wip          # headed + trace + 1 worker, para depuração manual
```

### Executar relatórios Allure

```bash
npm run test:allure
npm run allure:generate
npm run allure:open
# ou, em um passo só:
npm run allure:serve
```

Todo teste — passando ou falhando — anexa um screenshot full-page de cada aba aberta no Allure e no HTML report (`npm run report`), automaticamente. Nenhuma configuração adicional é necessária, ver `src/fixtures/index.ts` (`evidenceScreenshot`).

## Variáveis de ambiente

- `BASE_URL` — URL base do sistema sob teste.
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — credenciais de teste, se o app exigir login (ver `src/auth/setup.ts`).

## Estrutura do projeto

- `src/pages` — Page Objects, um por página/tela (criado vazio — ver `COPILOT.md`).
- `src/fixtures/index.ts` — injeta os page objects no `test`/`expect` e a fixture automática `evidenceScreenshot`.
- `src/auth` — login único que salva `storageState` (só existe se o app exigir autenticação).
- `src/reporters/console.reporter.ts` — reporter customizado (catálogo de testes + detecção de bug corrigido).
- `tests` — specs organizados por feature (criado vazio).
- `playwright.config.ts` — configuração do Playwright Test.
- `docs/bugs-index.md` — fonte única de status de bugs/claims encontrados pelos testes (começa vazio).
- `docs/test-catalog.md` — catálogo de todo teste já executado, gerado automaticamente pelo reporter (não existe até o primeiro `npm test`).
- `docs/exploratory-log/` — achados e decisões de sessões de investigação (começa vazio).

## Convenções

Este projeto segue a mentalidade de Michael Bolton (context-driven testing), com tags HICCUPPS (`@smoke`, `@security`, `@validation`, `@ux`, `@boundary`, `@regression`) em vez das 7 perguntas usadas no stack de API. Veja `COPILOT.md` (regras e convenções) e `docs/test-standards.md` (exemplos de código) para os detalhes completos — incluindo o checklist para adicionar uma nova página/feature e como manter `docs/bugs-index.md` e `docs/exploratory-log/` atualizados.
