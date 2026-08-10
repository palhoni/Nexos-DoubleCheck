# COPILOT.md — __PROJECT_NAME__

Automacao de testes E2E de frontend para **__APP_NAME__**, usando **Playwright Test** + **TypeScript**.

---

## Diretiva principal — Michael Bolton + heuristicas complementares

**Toda atividade neste projeto deve seguir a mentalidade de Michael Bolton (context-driven testing).** Isso se aplica a:

- **Explorar** uma pagina ou funcionalidade nova — investigar como um testador, nao como um verificador
- **Analisar** o que testar — priorizar por risco ao negocio, nao por cobertura de campos
- **Projetar** cenarios — usar os oraculos HICCUPPS para questionar consistencia
- **Categorizar** testes — tags mapeiam diretamente para os oraculos
- **Criar** testes — cada check automatizado deve nascer de uma investigacao real
- **Questionar** comportamentos — sinalizar quando algo parece errado, mesmo que o teste passe

Antes de qualquer acao, pergunte: **"O que eu estou tentando aprender sobre o produto?"**

Para reduzir pontos cegos que a mentalidade Bolton sozinha nem sempre cobre por si so, este
projeto tambem aplica quatro heuristicas complementares:

- **SFDPOT (James Bach, HTSM)** — antes de cobrir uma pagina/feature nova, varra as seis
  dimensoes do produto (Estrutura, Funcao, Dados, Plataforma, Operacoes, Tempo) para garantir
  que nenhuma fique de fora do planejamento. Ver secao "Categorias de cenarios".
- **Test Heuristics Cheat Sheet (Elisabeth Hendrickson)** — torna sistematica a cobertura de
  dados de borda, sequencias anomalas e estados de arquivamento, em vez de depender so da
  intuicao de quem escreve o teste.
- **Quadrantes de Teste Agil (Lisa Crispin & Janet Gregory)** — garante equilibrio entre os
  quatro quadrantes de teste; em particular, da estrutura operacional real para exploracao
  (Q3) e para performance/seguranca (Q4), que sem isso ficam so como discurso.
- **Ataques de software (James Whittaker)** — complementa os oraculos reflexivos de Bolton
  com tecnicas de ataque concretas e repetiveis, com destaque para ataques de **autorizacao
  entre perfis/grupos** — historicamente um dos tipos de bug mais graves e mais faceis de
  passar despercebido quando a suite so testa "a tela pede login?" (`@security`), nao "o que
  este perfil especifico pode ver/acessar na tela?" (`@authz`).

---

## Stack

- **Runner**: Playwright Test + TypeScript
- **Reports**: Custom console reporter + Allure Playwright + Playwright HTML report
- **Autenticacao**: storageState (login unico salvo em arquivo) — se aplicavel
- **UI**: __FRAMEWORK_UI__
- **Idioma do app**: __APP_LANGUAGE__

## Comandos

```bash
npm test                    # Roda a suite padrao (exclui @opt-in)
npm run test:smoke          # Apenas @smoke
npm run test:security       # Apenas @security (a tela pede login/protege a rota?)
npm run test:authz          # Apenas @authz (o que este perfil pode ver/acessar na tela?)
npm run test:validation     # Apenas @validation
npm run test:ux             # Apenas @ux
npm run test:boundary       # Apenas @boundary
npm run test:idempotency    # Apenas @idempotency
npm run test:performance    # Apenas @performance
npm run test:regression     # Apenas @regression
npm run test:create         # Todos os @create, de qualquer modulo
npm run test:exclude -- "<regex>"   # Exclui qualquer combinacao de tags pontualmente
npm run test:wip            # Debug — headed + trace + 1 worker
npm run test:allure         # Roda com reporter Allure
npm run allure:generate     # Gera relatorio Allure
npm run allure:open         # Abre relatorio Allure
npm run allure:serve        # Gera e abre em um passo so
npm run report              # Abre relatorio HTML do Playwright
```

Adicione novos scripts `test:<tag>` no `package.json` conforme novas tags de dominio surgirem.

## Variaveis de ambiente

Definidas em `.env.example`.

- `BASE_URL` — URL base do sistema
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — credenciais de teste, se o app exigir login

## Arquitetura do projeto

```
src/
  pages/                          # Page Objects (.page.ts), um por pagina/tela
  fixtures/
    index.ts                      # test/expect com page objects injetados + evidenceScreenshot auto
  auth/                            # so existe se o app exige login (AUTH_REQUIRED)
    setup.ts                      # Login unico que salva storageState
    .auth/                        # Cookies salvos (gitignored)
  reporters/
    console.reporter.ts           # Custom reporter visual (ANSI colors + Unicode)
  utils/                          # Utilitarios (criado vazio)

tests/                             # Specs (.spec.ts) por feature

docs/
  bugs-index.md                    # Fonte unica de status de bugs/claims
  test-catalog.md                  # Gerado automaticamente pelo reporter — nao editar
  test-standards.md                # Exemplos de codigo detalhados (anatomia de teste, etc.)
  bug-report-<data>-<tema>.md      # Um por investigacao de bug — historico, nao status atual
  exploratory-log/
    INDEX.md                       # Indice de uma linha por investigacao
    <data>-<tema>.md               # Achados/decisoes de uma sessao de investigacao

playwright.config.ts
```

## Camadas e responsabilidades

| Camada | Local | Responsabilidade |
|--------|-------|------------------|
| **Page Object** | `src/pages/` | Locators e acoes de uma pagina. Sem assertions de negocio (so `expectLoad()`). |
| **Fixture** | `src/fixtures/index.ts` | Injeta page objects no `test`/`expect`; `evidenceScreenshot` roda em todo teste automaticamente. |
| **Auth** | `src/auth/setup.ts` | Login unico que salva `storageState` — reusado por todos os testes que precisam estar logados. |
| **Teste** | `tests/` | Assertions de negocio e de UX. Toda logica de validacao fica aqui. |
| **Reporter** | `src/reporters/` | Custom reporter do Playwright. Sem dependencias externas. |

## Convencoes de teste

### Estrutura obrigatoria

- Specs importam **sempre** de `../src/fixtures` — nunca de `@playwright/test` diretamente (perde os page objects e o `evidenceScreenshot`).
- Onde o framework de steps estiver disponivel, usar `test.step()` nomeando a acao do usuario ("Navigate to X", "Submit Y"), nao a chamada tecnica.
- Assertions do Playwright (`expect(locator).toBeVisible()`) — nunca `waitForTimeout`.
- Seletores: `data-testid` > role/aria > CSS class — nunca XPath.
- Mensagens descritivas em **todos** os `expect()`.

### Tags (HICCUPPS)

Tags no formato `{ tag: ['@tag'] }` em `test()` ou `test.describe()`:

| Tag | Oraculo | Pergunta de risco |
|-----|---------|-------------------|
| `@smoke` | Purpose | O sistema serve ao proposito central? |
| `@security` | Statutes/Standards | **Autenticacao** — a tela exige login, expira sessao, redireciona quando deslogado? Quem e voce |
| `@authz` | Statutes/Standards | **Autorizacao/escopo entre perfis e grupos** — o que este perfil pode ver/acessar na tela, mesmo logado? Cobre acesso direto por URL a recurso de outro grupo (IDOR) e comparacao do que cada perfil ve na mesma tela quando ambos tem acesso — ver secao "Categorias de cenarios". Nao confundir com `@security` |
| `@validation` | Claims | O sistema rejeita dados invalidos como promete? |
| `@ux` | Users' expectations | O usuario esperaria esse comportamento? |
| `@boundary` | Comparable Products / Product | O sistema lida com inputs incomuns? |
| `@idempotency` | Claims | Duplo clique/duplo submit no mesmo formulario nao deveria gerar efeito colateral duplicado |
| `@performance` | Product | Tempo de carregamento/resposta da tela dentro do esperado; cobre o quadrante tecnico-critico (Q4) |
| `@regression` | History | Teste nascido de um bug real — inclui o ID do bug no titulo (ex: `BUG-003`) |
| `@create` | — | Informativo: cria dados reais via UI sem acao de exclusao correspondente. Rodar todos via `npm run test:create` |
| `@opt-in` | — | Controla o que fica fora do `npm test` padrao. Usar em `@create` de features que o time ainda nao liberou para criar dados em toda execucao |
| `@pending` | — | Cenario de golden path identificado mas nao implementado — usa `test.fixme()`, nao `test.skip()`, com comentario explicando o motivo |
| `@wip` | debug | Headed + trace + 1 worker, para depuracao manual |

Adicione tags de dominio conforme necessario (ex: `@login`, `@checkout`, `@<feature>`).

Exploracao (Q3 dos Quadrantes de Teste Agil) nao vira tag automatizada — por definicao, e
investigacao aberta, nao um check fechado. Ver secao "Log de atividades exploratorias".

**Por que essas tags e nao as do stack de API** (`@contract`/`@auth`/`@flow`/`@claims`): o mapeamento HICCUPPS e o mesmo framework de risco, mas os oraculos que mais importam mudam com o tipo de teste. Em frontend, "o usuario esperaria isso?" (`@ux`) e um risco de primeira classe que nao existe em teste de API; contrato de schema (`@contract`) nao se aplica a UI. `@security`/`@authz` cobrem a mesma divisao que `@auth`/`@authz` cobrem no stack de API (autenticacao vs autorizacao entre perfis), so que `@security` usa o nome do oraculo Statutes/Standards em vez do nome tecnico. `@regression` e a unica tag que **precisa** ser identica entre os stacks — e o que fecha o ciclo bug -> teste -> retest via `docs/bugs-index.md` e a deteccao automatica do reporter (ver secao Reporters).

### Tag `@create` e `@opt-in`

`[@create]` e **informativo**: marca testes que criam registros reais via acoes de UI (preencher formulario e submeter) sem acao de exclusao correspondente na tela. Todo teste `@create` deve limpar o que criou quando possivel e seguir uma convencao de nomenclatura reconhecivel nos dados preenchidos (prefixo tipo `QA Automation <Recurso>`, dominio de email reservado tipo `@example-test.invalid`, sempre incluindo um valor unico tipo timestamp) — isso permite ao time localizar e remover em lote os registros de teste sem risco de apagar dados reais. `npm run test:create` roda todos, de qualquer feature.

`[@opt-in]` controla o que fica fora do `npm test` padrao (`--grep-invert "@opt-in"`). Um teste `@create` so fica de fora da execucao padrao se tambem tiver `[@opt-in]`. Use esse par quando o time ainda nao confirmou que e seguro criar aquele tipo de dado em toda execucao da suite. Quando o time libera, o teste mantem `[@create]` mas remove `[@opt-in]`.

### Categorias de cenarios (HICCUPPS + heuristicas complementares)

#### Passo 0 — Mapeamento SFDPOT antes das tags (James Bach)

Antes de cobrir uma pagina/feature nova, varra-a pelas seis dimensoes do HTSM. Se uma
dimensao nao for relevante para esta pagina especifica, diga isso explicitamente em vez de
pular a etapa silenciosamente:

- **Estrutura:** de que componentes/APIs esta pagina depende?
- **Funcao:** o que ela calcula, transforma ou submete?
- **Dados:** quais formatos, volumes e estados (inclusive listas vazias/arquivadas) ela exibe?
- **Plataforma:** o comportamento muda entre navegadores, viewports ou ambientes (dev/staging/prod)?
- **Operacoes:** ha uso concorrente real (dois usuarios editando o mesmo recurso ao mesmo tempo)?
- **Tempo:** o que acontece com sessao expirando no meio de uma acao, ou uma chamada de API lenta/falhando?

#### `@authz` — autorizacao entre perfis e grupos (oraculo Statutes + ataque de autorizacao)

Testar explicitamente: um usuario logado de um perfil/grupo consegue acessar, por URL direta,
uma tela ou recurso de outro grupo? E quando dois perfis diferentes acessam a mesma tela com
sucesso, o **conteudo** exibido (linhas de tabela, campos, contagens) e o que cada perfil
deveria ver — nao so "a tela carregou"? Dois padroes concretos a que ficar atento:
- **Linhas que deveriam ser filtradas nao sao (ou sao filtradas demais):** uma listagem que,
  pra um perfil, deveria mostrar um subconjunto dos itens.
- **Campo/acao que parece interna aparecendo pra um perfil externo:** um botao ou coluna que
  sugere uma acao que aquele perfil nao deveria poder fazer.
Quando o comportamento correto ainda nao foi confirmado pelo time, documente o estado atual
como `[@authz]` sem assumir certo/errado, e registre a duvida em `docs/bugs-index.md`.

#### Checklist de dados e sequencia (Elisabeth Hendrickson)

Ao investigar formularios e listagens, passe por estes filtros em vez de confiar so na intuicao:
- **CRUD + arquivamento:** um recurso arquivado/inativado desaparece de onde deveria (listagens
  ativas) e continua aparecendo onde deveria (historico)?
- **Sequencias anomalas:** submeter o mesmo formulario duas vezes rapidamente (ver
  `@idempotency`), editar um recurso ja arquivado, navegar com o botao "voltar" apos submeter
- **Dados goldilocks:** valor exatamente no limite de um campo, um a mais, um a menos, vazio,
  caracteres especiais
- **Payload malformado:** colar texto muito longo, caracteres de injecao (`<script>...`) em
  campos de texto livre

#### Ataques de software (James Whittaker)

- **Repeticao/duplo clique:** clicar em "Enviar" varias vezes rapidamente
- **Navegacao inesperada:** usar o botao "voltar" do navegador apos uma acao, recarregar a
  pagina no meio de um fluxo multi-step
- **Dependencia externa:** simular uma chamada de API que a pagina depende ficando lenta ou
  falhando — a tela mostra um erro tratado, ou quebra?

#### Verificacao final por Quadrantes de Teste Agil (Crispin & Gregory)

Antes de considerar a cobertura de uma feature completa, confira o equilibrio:
- **Q1 (tecnico, apoia o time):** os Page Objects e fixtures cobrem a base tecnica?
- **Q2 (negocio, apoia o time):** `@smoke`/`@validation` cobrem os exemplos de negocio
  combinados com o time?
- **Q3 (negocio, critica o produto):** houve sessao exploratoria registrada (ver secao "Log
  de atividades exploratorias")? Nao basta a intencao declarada na diretriz principal.
- **Q4 (tecnico, critica o produto):** existe `@performance` e `@authz`/ataques cobrindo esta
  feature, ou ficou so no funcional?

Se Q3 ou Q4 ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar a feature
pronta, nao um "nice to have".

### Testes de regressao (`@regression`)

Oraculo History do Bolton: "o que ja quebrou antes tem mais chance de quebrar de novo."

Quando um teste nasce de um bug real documentado em `docs/bug-report-*.md`, adicionar a tag `@regression` e o ID do bug no titulo do teste entre parenteses. Formato: `should <comportamento correto> (BUG-XXX)`.

Status atual de cada bug e claim (corrigido, aceito como intencional, ou aberto): ver `docs/bugs-index.md` — fonte unica de verdade, atualizada a cada novo bug-report. Os arquivos `bug-report-*.md` continuam existindo como registro historico da investigacao, mas nao sao a referencia para status atual.

Executar `npm run test:regression` para verificar se algum bug corrigido voltou.

### Helpers

Quando multiplos testes repetem as mesmas assertions, extrair para funcao helper no **final do arquivo** (nao em arquivo separado).

## Checklist para nova pagina/feature

### Infraestrutura

1. Criar Page Object em `src/pages/<pagina>.page.ts`
2. Registrar o Page Object como fixture em `src/fixtures/index.ts`
3. Criar spec em `tests/<feature>.spec.ts` (ou `tests/<feature>/<sub-feature>.spec.ts` se a feature tiver varias sub-telas)
4. Se a pagina exigir login e o projeto ainda nao tiver `src/auth/`, avaliar se precisa (normalmente ja existe desde o scaffold, se `AUTH_REQUIRED` foi confirmado)

### Cenarios

Aplicar o Passo 0 (SFDPOT) e as tags HICCUPPS e implementar os cenarios aplicaveis: smoke,
security (autenticacao), authz (autorizacao entre perfis, com checklist Hendrickson pra dados),
validation, ux, boundary (com ataques de Whittaker pertinentes), idempotency, performance. So
criar `@regression` quando houver um bug real documentado. Fechar a feature conferindo o
equilibrio dos Quadrantes de Teste Agil — se Q3 (exploracao) ou Q4 (`@performance`/`@authz`)
ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar a feature pronta.

Achados relevantes da exploracao (algo inesperado, uma decisao de escopo, uma duvida ainda nao confirmada) vao para `docs/exploratory-log/` **antes** dos testes finais serem escritos — nao esperar o fim da implementacao para registrar, o raciocinio se perde. Ver secao "Log de atividades exploratorias".

### Reauditoria de features ja cobertas

Uma tag ou heuristica nova adicionada a este `COPILOT.md` **nao se aplica so a features
futuras** — sempre que uma tag/heuristica for adicionada ou reforcada aqui, vale perguntar
explicitamente se as features ja cobertas precisam de uma nova rodada de testes por causa
dela, em vez de assumir que "cobertura completa" de uma feature antiga continua valendo para
sempre.

## Reporters

Custom console reporter em `src/reporters/console.reporter.ts`, registrado no array `reporter` do `playwright.config.ts`. Implementa a interface `Reporter` de `@playwright/test/reporter` com `export default`. Sem dependencias externas.

### Catalogo de testes

O mesmo reporter mantem `docs/test-catalog.md` — uma tabela com todo teste que ja rodou (suite, titulo, arquivo, status, data da ultima execucao). Atualizado automaticamente em `onEnd`, mesclando com o conteudo existente (rodar um subconjunto, ex: `npm run test:smoke`, so atualiza as linhas daquele subconjunto, sem apagar o resto). Nao editar manualmente — o arquivo e reescrito a cada corrida.

### Evidencia visual (Allure e HTML report)

`src/fixtures/index.ts` define a fixture automatica `evidenceScreenshot` (`{ auto: true }`) — roda em todo teste, passe ou falhe, sem precisar ser declarada nos parametros. Ao final do teste, tira um screenshot full-page de cada aba/pagina ainda aberta e anexa via `testInfo.attach()`, visivel automaticamente no HTML report e no Allure. E o equivalente, para frontend, dos anexos de request/response do stack de API — a diferenca e que aqui a evidencia e visual (PNG), nao texto de request/response.

Quando houver mais de uma pagina aberta (ex: popup, nova aba), cada uma gera um anexo numerado (`evidence-2`, `evidence-3`, ...).

### Deteccao de bug corrigido

O reporter compara o status anterior (lido do `test-catalog.md`) com o resultado da corrida atual. Se um teste referenciado na coluna "Teste(s)" de um bug **aberto** em `docs/bugs-index.md` vira de falhou para passou, um aviso aparece no console (`⚠ Possiveis bugs corrigidos`). A granularidade e por arquivo `.spec.ts`, nao por titulo exato de teste (a coluna e texto livre).

Isso so detecta bugs cujo teste falha por design (afirma o comportamento correto e falha ate ser corrigido) — bugs cujo teste so documenta o comportamento atual (e ja passa hoje) exigem que alguem reescreva a expectativa do teste quando corrigidos, nao ha sinal automatico possivel nesse caso. O aviso e so deteccao — atualizar o status no `bugs-index.md` continua sendo manual, para confirmar que e uma correcao real e nao uma instabilidade pontual.

### ANSI colors

```
reset \x1b[0m   bold \x1b[1m    dim \x1b[2m
green \x1b[32m  red \x1b[31m    yellow \x1b[33m
cyan \x1b[36m   magenta \x1b[35m  white \x1b[37m
bgRed \x1b[41m  bgGreen \x1b[42m
```

### Estrutura da saida

**1. Banner de inicio (`onBegin`)** — caixa com bordas duplas Unicode em cyan+bold. Contem o nome do projeto e a quantidade de testes encontrados (contagem recursiva de todas as suites).

**2. Agrupamento por suite (`onTestBegin`)** — ao entrar em uma nova suite (`test.parent.title`), imprimir o nome em magenta+bold com prefixo `▸` e indentacao de 2 espacos.

**3. Resultado por teste (`onTestEnd`)** — indentacao de 4 espacos, icone emoji por status, duracao em dim:

| Status | Icone | Cor do titulo | Duracao |
|--------|-------|---------------|---------|
| `passed` | ✅ | green | dim |
| `failed` | ❌ | red+bold | dim |
| `timedOut` | ⏰ | yellow | dim |
| `skipped` | ⏭️ | dim | nao exibir |

**4. Falhas detalhadas (`onEnd`, se houver)** — caixa com bordas simples Unicode em red+bold com titulo centralizado "FALHAS DETALHADAS". Para cada falha: numero sequencial + titulo em red+bold, localizacao do arquivo em dim, primeiras 8 linhas da mensagem de erro em red, primeiras 6 linhas do snippet em dim.

**5. Resumo final (`onEnd`)** — separadores em cyan+bold, contadores condicionais (so exibir se > 0) com icone, badge final verde "PASSOU" ou vermelho "FALHOU".

**Formatacao de duracao**: abaixo de 1000ms exibir como `Xms`, acima como `X.Xs` (1 casa decimal).

## Padroes de codigo

- Um Page Object por pagina.
- Specs importam sempre de `../src/fixtures` — nunca de `@playwright/test`.
- `waitForLoadState('networkidle')` apos acoes que disparam requests relevantes pro teste.
- Dados sensiveis: variaveis de ambiente do `.env`, nunca hardcode.
- Describe blocks e comentarios: ingles. Textos de elementos do app: idioma original do app (__APP_LANGUAGE__).
- Allure obrigatorio em todo teste: `epic`, `feature`, `story`, `severity`, `owner` (via `allure-js-commons`).
- Se o app tem RBAC/multi-perfil, registre um Page Object de login (ou fixture) que produza
  um `storageState` por perfil (ex: `admin.state.json`, `client.state.json`) em vez de um
  unico estado logado — e o que viabiliza escrever `@authz` sem precisar logar manualmente
  dentro de cada teste.

## Log de atividades exploratorias

A diretriz principal deste projeto abre com "explorar como testador, nao como verificador" —
mas exploracao, por definicao, nao vira teste automatizado fechado. Para essa parte da
filosofia Bolton nao ficar so no discurso (Q3 dos Quadrantes de Teste Agil), toda sessao
exploratoria relevante deve deixar um registro em `docs/exploratory-log/<data>-<tema>.md` com,
no minimo:

- **Charter usado** (formato "Explore [area] usando [tecnica], com o objetivo de [o que se
  quer descobrir]")
- **Tempo gasto**
- **O que foi encontrado** (bug, risco, ou "nada relevante desta vez")
- **Se algo virou teste automatizado** (`@regression`, `@authz`, etc.) como consequencia

Sessoes que nao encontram nada tambem devem ser registradas — isso e dado sobre cobertura, nao
so sobre bugs. Nao e log cronologico de tarefas ("hoje trabalhei em X"); so entra o que tem
valor para investigacoes futuras.

Cada entrada e indexada em uma linha no `docs/exploratory-log/INDEX.md`. Quando uma descoberta se confirma como padrao recorrente, ela "sobe" para uma regra neste `COPILOT.md`; quando vira um bug confirmado, vira entrada em `docs/bugs-index.md`. Entradas resolvidas saem do `INDEX.md` (o arquivo original fica no historico do Git).

## Bug reports

Bugs encontrados pelos testes sao documentados em `docs/bug-report-<data>-<tema>.md` com: severidade, pagina/feature, como reproduzir, resultado atual vs esperado, e quais testes falham.

Todo bug-report novo, ou mudanca de status de um bug/claim existente (corrigido, aceito como intencional, reaberto), **deve** atualizar `docs/bugs-index.md` no mesmo momento — esse arquivo e a fonte unica de verdade para status atual, os `bug-report-*.md` sao o registro historico da investigacao.
