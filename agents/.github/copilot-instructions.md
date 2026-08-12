# Copilot instructions — con-api-automation

Automacao de testes de API para o sistema de Consignacao (Double Check), usando **Playwright Test** + **TypeScript**.

> Este arquivo e a diretiva central de agentes no ecossistema GitHub Copilot
> para este projeto. Se uma convencao mudar aqui, replique nos arquivos de
> agentes/prompts/skills para manter consistencia. A logica de metodologia e
> identica; o que muda e o mecanismo de acionamento dos agentes.

---

## Sistema de Agentes QA

Ao receber um pedido, identifique a intencao, leia o arquivo do agente
correspondente em `.github/agents/` e execute seguindo as instrucoes dele.
Nunca responda sem antes ler o arquivo do agente identificado.

Se estiver no VS Code em **modo Agent** do Copilot Chat, o mesmo resultado pode
ser obtido digitando o slash-command correspondente (ex: `/agent1-analisador-us`)
— os prompt files em `.github/prompts/` apenas carregam o arquivo de agente certo
como contexto, e o comportamento e o mesmo.

| Intencao do usuario | Agente | Arquivo | Slash-command (VS Code) |
|---------------------|--------|---------|--------------------------|
| Analisar US, gate de qualidade, perguntas de refinamento, cenarios de teste, mudanca em US, ajuste sem US | **Agente 1** | `.github/agents/agent1-analisador-us.md` | `/agent1-analisador-us` |
| Criar/scaffoldar novo endpoint, client, model, contract, fixture, spec | **Agente 2** | `.github/agents/agent2-desenhista-testes.md` | `/agent2-desenhista-testes` |
| Navegar em telas, gerar US reversa, coletar seletores reais via MCP | **Agente 3** | `.github/agents/agent3-engenheiro-reverso-frontend.md` | `/agent3-engenheiro-reverso-frontend` |
| Descobrir endpoints sem Swagger, catalogar chamadas de rede, backlog de endpoints | **Agente 4** | `.github/agents/agent4-descobridor-endpoints.md` | `/agent4-descobridor-endpoints` |
| Executar testes, rodar suite, gerar relatorio Allure | **Agente 5** | `.github/agents/agent5-executor-testes-api.md` | `/agent5-executor-testes-api` |
| Investigar falhas, triage de erros, classificar bug real vs flaky vs ambiente | **Agente 6** | `.github/agents/agent6-detetive-falhas.md` | `/agent6-detetive-falhas` |
| Gerar bug report, documentar defeitos, formatar para docs/bug-report-*.md | **Agente 7** | `.github/agents/agent7-gerador-bug-report.md` | `/agent7-gerador-bug-report` |
| Retestar bugs corrigidos, confirmar correcao, verificar regressao | **Agente 8** | `.github/agents/agent8-retest.md` | `/agent8-retest` |
| Auditar qualidade dos testes (guardrails), revisar se os testes realmente pegam bugs | **Agente 9** | `.github/agents/agent9-auditor.md` | `/agent9-auditor` |

**Palavras-chave por agente:**
- **Agente 1:** "analise a US", "perguntas para refinamento", "cenarios de teste", "gate de qualidade", "surgiu uma regra nova", "ajuste sem US"
- **Agente 2:** "cria o client", "cria o endpoint", "scaffolda", "novo endpoint", "cria os testes", "checklist de endpoint"
- **Agente 3:** "navega na tela", "US reversa", "pega os seletores", "engenharia reversa", "o seletor quebrou", "self-healing", "o que mudou nesse elemento"
- **Agente 4:** "descobre os endpoints", "cataloga a API", "backlog de endpoints", "intercepta chamadas"
- **Agente 5:** "executa os testes", "roda a suite", "roda o smoke", "npm test"
- **Agente 6:** "investiga as falhas", "por que falhou", "e bug ou flaky", "triage"
- **Agente 7:** "gera o bug report", "documenta o bug", "abre um bug"
- **Agente 8:** "retesta", "confirma a correcao", "o dev corrigiu"
- **Agente 9:** "audita os testes", "revisa a qualidade da suite", "esses testes pegam bug de verdade?" — tambem acionado automaticamente pelo Agente 5 antes de toda execucao

## Skills locais (portabilidade)

Para permitir uso deste pacote em qualquer maquina/projeto novo sem depender de
caminhos locais externos, as skills de scaffolding ficam versionadas no proprio
repositorio em `.github/skills/`:

- `.github/skills/scaffold-bolton-api-suite/SKILL.md`
- `.github/skills/scaffold-bolton-api-suite-pytest/SKILL.md`
- `.github/skills/scaffold-bolton-frontend-suite/SKILL.md`

Cada skill inclui sua pasta `templates/` ao lado do `SKILL.md`.

---

## Diretiva principal — Michael Bolton + heuristicas complementares

## Postura de resposta (critica e precisa)

Em toda interacao com o usuario, adote postura de conselheiro critico:

- Priorize precisao tecnica acima de concordancia social.
- Aponte falhas de raciocinio com clareza, incluindo o motivo objetivo.
- Quando houver incerteza, declare explicitamente e informe nivel de confianca (alto/medio/baixo).
- Nao invente informacoes para preencher lacunas; declare limite de evidencia.
- Discorde quando houver fundamento tecnico verificavel.
- Va direto ao ponto mais importante, mesmo quando desconfortavel.
- Evite criar objetivos artificiais; mantenha foco no objetivo real do usuario.

Essa postura vale para respostas no chat, analises, revisoes, planos e execucao de agentes.

**Toda atividade neste projeto deve seguir a mentalidade de Michael Bolton (context-driven testing).** Isso se aplica a:

- **Explorar** uma pagina ou funcionalidade nova — investigar como um testador, nao como um verificador
- **Analisar** o que testar — priorizar por risco ao negocio, nao por cobertura de campos
- **Projetar** cenarios — usar os oraculos HICCUPPS para questionar consistencia
- **Categorizar** testes — tags mapeiam diretamente para os oraculos
- **Criar** testes — cada check automatizado deve nascer de uma investigacao real
- **Questionar** comportamentos — sinalizar quando algo parece errado, mesmo que o teste passe

Antes de qualquer acao, pergunte: **"O que eu estou tentando aprender sobre o produto?"**

Para reduzir pontos cegos que a mentalidade Bolton sozinha nem sempre cobre por si so, este
projeto tambem aplica quatro heuristicas complementares (extraidas de uma auditoria no projeto
Fleet/BackEnd, que encontrou lacunas reais com esse framework):

- **SFDPOT (James Bach, HTSM)** — antes de cobrir um endpoint novo, varra as seis dimensoes
  do produto (Estrutura, Funcao, Dados, Plataforma, Operacoes, Tempo). Ver "Categorias de cenarios".
- **Test Heuristics Cheat Sheet (Elisabeth Hendrickson)** — torna sistematica a cobertura de
  dados de borda, sequencias anomalas e estados de arquivamento, em vez de depender so da
  intuicao de quem escreve o teste.
- **Quadrantes de Teste Agil (Lisa Crispin & Janet Gregory)** — garante estrutura operacional
  real para exploracao (Q3) e para performance/seguranca (Q4), que sem isso ficam so discurso.
- **Ataques de software (James Whittaker)** — com destaque para ataques de **autorizacao
  entre perfis/grupos** (`@authz`) — historicamente o tipo de bug mais grave e mais facil de
  passar despercebido quando a suite so testa autenticacao (`@auth`), nao autorizacao.

---

## Stack

- **Runtime**: Node.js + TypeScript (ES2020, strict)
- **Framework de teste**: Playwright Test (API testing, sem browser)
- **Validacao de contrato**: AJV + ajv-formats (JSON Schema)
- **Reports**: Custom console reporter + Allure Playwright + Playwright HTML report

## Comandos

```bash
npm test                    # Roda todos os testes
npm run test:smoke          # Apenas @smoke
npm run test:contract       # Apenas @contract
npm run test:flow           # Apenas @flow
npm run test:claims         # Apenas @claims
npm run test:regression     # Apenas @regression
npm run test:auth           # Apenas @auth
npm run test:health         # Apenas @health
npm run test:consignment    # Apenas @consignment
npm run test:login          # Apenas @login
npm run test:allure         # Roda com reporter Allure
npm run allure:generate     # Gera relatorio Allure
npm run allure:open         # Abre relatorio Allure
npm run report              # Abre relatorio HTML do Playwright
```

## Variaveis de ambiente

Definidas em `.env.example`. Defaults existem no codigo para dev local:

- `API_BASE_URL` — URL base da API (default: `https://con-api.dev.apps.renault.com`)
- `API_USER_EMAIL` — email para autenticacao
- `API_USER_PASSWORD` — senha para autenticacao

## Arquitetura do projeto

```
src/
  api/
    config/environment.ts          # Variaveis de ambiente centralizadas
    clients/                       # Clients HTTP (1 por recurso, sem assertions)
    models/                        # Tipos TypeScript (request/response)
    contracts/                     # JSON Schemas + validador AJV
  reporters/
    console.reporter.ts            # Custom reporter visual (ANSI colors + Unicode)

tests/
  fixtures/api.fixture.ts          # Worker fixtures (apiContext, clients, authToken)
  api/                             # Suites organizadas por dominio
    health.spec.ts
    login/
    consignment-components/
      consignment-notes/
        consignment-notes.spec.ts
        auth.spec.ts
        detail/
        export-jobs/
        filters/
    consignment-suppliers/
  flows/                           # Jornadas de usuario (cross-endpoint)
    filter-and-detail.spec.ts
    filter-and-export.spec.ts
    filter-options-consistency.spec.ts
  claims/                          # Oraculo Claims — Swagger vs realidade
    openapi-endpoints.spec.ts
    openapi-schemas.spec.ts
    openapi-status-codes.spec.ts
```

## Camadas e responsabilidades

| Camada | Local | Responsabilidade |
|--------|-------|------------------|
| **Client** | `src/api/clients/` | Chamada HTTP pura, sem assertion. Recebe `token \| undefined` para permitir testes sem auth. |
| **Model** | `src/api/models/` | Tipos TypeScript das requests e responses. |
| **Contract** | `src/api/contracts/` | JSON Schema validado com AJV (`compileContract` + `formatContractErrors`). |
| **Fixture** | `tests/fixtures/api.fixture.ts` | Worker-scoped fixtures: `apiContext`, todos os clients, e `authToken` (login automatico). |
| **Teste** | `tests/api/` | Assertions de negocio. Toda logica de validacao fica aqui. |
| **Reporter** | `src/reporters/` | Custom reporters do Playwright. Sem dependencias externas. |

## Convencoes de teste

As convencoes completas (estrutura obrigatoria, tags, categorias de cenarios com as 7
perguntas Bolton + heuristicas complementares, checklist de novo endpoint) estao em
`.github/instructions/tests.instructions.md` — carregadas automaticamente pelo Copilot
sempre que um arquivo em `tests/**` estiver em edicao ou em contexto. Consulte esse
arquivo antes de escrever ou revisar qualquer teste.

## Padroes de codigo

As convencoes de `src/` (clients, contracts, fixtures) estao em
`.github/instructions/src.instructions.md` — carregadas automaticamente pelo Copilot
sempre que um arquivo em `src/**` estiver em edicao ou em contexto.

## Reporters

Reporter customizado em `src/reporters/console.reporter.ts`, implementando a interface
`Reporter` do Playwright (`onBegin`, `onTestBegin`, `onTestEnd`, `onEnd`). Saida visual
com cores ANSI e caracteres Unicode — sem dependencias externas.

### Catalogo de testes

Mantem `docs/test-catalog.md` — tabela com todo teste ja executado (suite, titulo,
arquivo, status, data da ultima execucao). Atualizado automaticamente em `onEnd`,
mesclando com o conteudo existente (rodar um subconjunto, ex: `npm run test:smoke`,
so atualiza as linhas daquele subconjunto, sem apagar o resto). Nao editar manualmente
— o arquivo e reescrito a cada corrida.

### Anexos de request/response (Allure + HTML report)

`tests/fixtures/instrumented-request.ts` exporta `instrumentApiContext()`, que envolve
`APIRequestContext` num `Proxy` interceptando `get`/`post`/`put`/`patch`/`delete`/`head`/`fetch`.
A cada chamada, anexa um resumo texto (metodo, URL, headers — `Authorization` mascarado
—, query params, corpo da requisicao, status, headers e corpo da resposta) ao teste em
execucao via `testInfo.attach()` — aparece automaticamente tanto no relatorio HTML do
Playwright quanto no Allure, sem configuracao adicional.

Corpos texto/JSON sao truncados em 5000 caracteres; corpos binarios aparecem como
`[binário: N bytes, content-type: X]`, sem embutir os bytes. Como `apiContext` (fixture
worker-scoped) ja retorna o contexto instrumentado, isso funciona pra suite inteira sem
tocar em nenhum client ou teste — todo client novo que recebe `apiContext` ja herda a
instrumentacao automaticamente.

### Deteccao de bug corrigido

O reporter compara o status anterior (lido do `test-catalog.md`) com o resultado da
corrida atual. Se um teste referenciado na coluna "Teste(s)" de um bug **aberto** em
`docs/bugs-index.md` vira de falhou para passou, um aviso aparece no terminal
(`⚠ Possíveis bugs corrigidos`) ao final da execucao. A granularidade e por arquivo
`.spec.ts`, nao por titulo exato de teste (a coluna e texto livre).

Isso so detecta bugs cujo teste falha por design (afirma o comportamento correto e
falha ate ser corrigido) — bugs cujo teste so documenta o comportamento atual (e ja
passa hoje) exigem que alguem reescreva a expectativa do teste quando corrigidos, nao
ha sinal automatico possivel nesse caso. O aviso e so deteccao — atualizar o status no
`bugs-index.md` continua sendo manual, para confirmar que e uma correcao real e nao
uma instabilidade pontual (ver Agente 8 — Retest).

## Log de atividades exploratorias

Toda sessao exploratoria relevante (Q3 dos Quadrantes de Teste Agil) deve deixar um registro
em `docs/exploratory-log/<data>-<tema>.md` com, no minimo: **charter usado** ("Explore [area]
usando [tecnica], com o objetivo de [o que se quer descobrir]"), **tempo gasto**, **o que foi
encontrado** (bug, risco, ou "nada relevante desta vez"), **se virou teste automatizado**.
Sessoes sem achado tambem devem ser registradas — e dado sobre cobertura, nao so sobre bugs.

Indexadas em `docs/exploratory-log/INDEX.md`.
Quando uma descoberta vira padrao recorrente, sobe para uma regra neste arquivo e,
se aplicavel, para os agentes/padroes em `.github/agents/`.
Quando vira bug confirmado, vira entrada em `docs/bugs-index.md`.

## Bug reports

Documentados em `docs/bug-report-<data>-<tema>.md` com: severidade, endpoint,
como reproduzir, resultado atual vs esperado, e quais testes falham.
`docs/bugs-index.md` e a fonte unica de verdade para status atual.
