# COPILOT.md — __PROJECT_NAME__

Automacao de testes de API, usando **Playwright Test** + **TypeScript**.

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

- **SFDPOT (James Bach, HTSM)** — antes de cobrir um endpoint novo, varra as seis dimensoes
  do produto (Estrutura, Funcao, Dados, Plataforma, Operacoes, Tempo) para garantir que
  nenhuma fique de fora do planejamento. Ver secao "Categorias de cenarios".
- **Test Heuristics Cheat Sheet (Elisabeth Hendrickson)** — torna sistematica a cobertura de
  dados de borda, sequencias anomalas e estados de arquivamento (soft-delete), em vez de
  depender so da intuicao de quem escreve o teste.
- **Quadrantes de Teste Agil (Lisa Crispin & Janet Gregory)** — garante equilibrio entre os
  quatro quadrantes de teste; em particular, da estrutura operacional real para exploracao
  (Q3) e para performance/seguranca (Q4), que sem isso ficam so como discurso.
- **Ataques de software (James Whittaker)** — complementa os oraculos reflexivos de Bolton
  com tecnicas de ataque concretas e repetiveis, com destaque para ataques de **autorizacao
  entre perfis/grupos** — historicamente um dos tipos de bug mais graves e mais faceis de
  passar despercebido quando a suite so testa autenticacao (`@auth`), nao autorizacao (`@authz`).

---

## Stack

- **Runtime**: Node.js + TypeScript (ES2020, strict)
- **Framework de teste**: Playwright Test (API testing, sem browser)
- **Validacao de contrato**: AJV + ajv-formats (JSON Schema)
- **Reports**: Custom console reporter + Allure Playwright + Playwright HTML report

## Comandos

```bash
npm test                    # Roda a suite padrao (exclui @opt-in e @claims)
npm run test:smoke          # Apenas @smoke
npm run test:contract       # Apenas @contract
npm run test:flow           # Apenas @flow
npm run test:claims         # Apenas @claims (fora do npm test padrao)
npm run test:regression     # Apenas @regression
npm run test:auth           # Apenas @auth (autenticacao)
npm run test:authz          # Apenas @authz (autorizacao entre perfis/grupos)
npm run test:idempotency    # Apenas @idempotency
npm run test:performance    # Apenas @performance
npm run test:create         # Todos os @create, de qualquer modulo
npm run test:exclude -- "<regex>"   # Exclui qualquer combinacao de tags pontualmente
npm run test:allure         # Roda com reporter Allure
npm run allure:generate     # Gera relatorio Allure
npm run allure:open         # Abre relatorio Allure
npm run report              # Abre relatorio HTML do Playwright
```

`npm test` (e `test:headed`/`test:allure`) excluem `@opt-in` e `@claims` por padrao
(`--grep-invert "@opt-in|@claims"`) — claims e testes de criacao ainda nao liberados pelo time
sao gates separados, nao rodam em toda execucao.

Adicione novos scripts `test:<tag>` no `package.json` conforme novas tags de dominio surgirem (ex: `@health`, `@login`, ou tags especificas do dominio da API).

## Variaveis de ambiente

Definidas em `.env.example`. Defaults podem existir no codigo (`src/api/config/environment.ts`) para dev local.

- `API_BASE_URL` — URL base da API
- Demais credenciais de autenticacao, se a API exigir login

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
  fixtures/
    api.fixture.ts                 # Worker fixtures (apiContext, clients, authToken)
    instrumented-request.ts        # Envolve o apiContext pra anexar request/response nos reports
  api/                             # Suites organizadas por dominio/recurso
  flows/                           # Jornadas de usuario (cross-endpoint) — criar quando necessario
  claims/                          # Oraculo Claims — Swagger/OpenAPI vs realidade — criar quando necessario

docs/
  bugs-index.md                    # Fonte unica de status de bugs/claims
  test-catalog.md                  # Gerado automaticamente pelo reporter — nao editar
  test-standards.md                # Exemplos de codigo detalhados (anatomia de teste, etc.)
  bug-report-<data>-<tema>.md      # Um por investigacao de bug — historico, nao status atual
  exploratory-log/
    INDEX.md                       # Indice de uma linha por investigacao
    <data>-<tema>.md               # Achados/decisoes de uma sessao de investigacao
```

## Camadas e responsabilidades

| Camada | Local | Responsabilidade |
|--------|-------|------------------|
| **Client** | `src/api/clients/` | Chamada HTTP pura, sem assertion. Recebe `token \| undefined` para permitir testes sem auth. |
| **Model** | `src/api/models/` | Tipos TypeScript das requests e responses. |
| **Contract** | `src/api/contracts/` | JSON Schema validado com AJV (`compileContract` + `formatContractErrors`). |
| **Fixture** | `tests/fixtures/api.fixture.ts` | Worker-scoped fixtures: `apiContext`, clients, e `authToken` (login automatico, se aplicavel). |
| **Teste** | `tests/api/` | Assertions de negocio. Toda logica de validacao fica aqui. |
| **Reporter** | `src/reporters/` | Custom reporters do Playwright. Sem dependencias externas — apenas tipos do Playwright. |

## Convencoes de teste

### Estrutura obrigatoria

- Todo codigo dentro de `test()` **deve** estar em `test.step()` — sem excecao.
- Steps de request incluem metodo HTTP, endpoint e parametros relevantes no nome.
- Step separado para validacao de status HTTP.
- Step separado para parse do body (quando usado em steps seguintes).
- Mensagens descritivas em **todos** os `expect()`.

### Tags

Tags no formato `[@tag]` no nome do `test()` ou `test.describe()`:

| Tag | Quando usar |
|-----|-------------|
| `@smoke` | Golden path de fluxo critico |
| `@contract` | Validacao de JSON Schema |
| `@auth` | **Autenticacao** apenas (sem token, token invalido, JWT malformado, esquema errado) — quem e voce |
| `@authz` | **Autorizacao/escopo entre perfis e grupos** — o que voce pode acessar, mesmo autenticado. Cobre dois eixos: (1) acesso cruzado por ID direto entre grupos (IDOR) e (2) quando dois perfis recebem 200 do mesmo endpoint, se o *conteudo* retornado (campos, linhas, contagens) e o que cada perfil deveria ver, nao so o status — ver secao "Categorias de cenarios". Nao confundir com `@auth`: um token valido e sem erro de autenticacao ainda pode — e deve ser testado se — estar tentando acessar algo fora do seu escopo |
| `@flow` | Jornada de usuario (cross-endpoint, simula o que o usuario faz na tela) |
| `@claims` | Oraculo Claims — valida que a API cumpre o que o Swagger/OpenAPI afirma. Fora do `npm test` padrao (ver `npm run test:claims`) |
| `@regression` | Teste nascido de um bug real — inclui o ID do bug no nome (ex: `BUG-001`) |
| `@idempotency` | Escrita repetida (retry de POST/PUT) nao deve gerar efeito colateral duplicado, alem da idempotencia de leitura ja coberta pela pergunta 5 das "7 perguntas Bolton" |
| `@performance` | Tempo de resposta dentro do esperado para o endpoint/fluxo; cobre o quadrante tecnico-critico (Q4) que sem isso fica so no funcional |
| `@create` | Informativo: cria dados reais sem operacao de delete correspondente na API. Nao controla sozinho a execucao — ver `@opt-in`. Rodar todos via `npm run test:create` |
| `@opt-in` | Controla o que fica fora do `npm test` padrao (junto com `@claims`). Usar em `@create` de modulos que o time ainda nao liberou para criar dados em toda execucao (ver secao "Tags `@create` e `@opt-in`") |
| `@pending` | Cenario de golden path identificado mas **nao implementado** ainda — usa `test.fixme()`, nao `test.skip()`, para aparecer destacado no relatorio do Playwright como pendencia, nao como ausencia silenciosa. Inclui um comentario explicando o motivo e o que falta decidir. Buscar por `test.fixme` no repo para listar todas as pendencias |

Adicione tags de dominio conforme necessario (ex: `@health`, `@login`, `@<recurso>`).

Exploracao (Q3 dos Quadrantes de Teste Agil) nao vira tag automatizada — por definicao, e
investigacao aberta, nao um check fechado. Ver secao "Log de atividades exploratorias" para
como isso e registrado neste projeto sem virar so discurso sem rastro.

### Tags `@create` e `@opt-in`

`[@create]` e **informativo**: marca testes que criam registros reais via endpoints sem operacao de delete correspondente na API. Todo teste `@create` deve limpar o que criou quando possivel (ex: arquivar/inativar quando nao houver delete) e seguir a convencao de nomenclatura abaixo. `npm run test:create` roda **todos** os testes `@create`, de qualquer modulo.

`[@opt-in]` e quem controla o que fica **fora do `npm test` padrao** (`--grep-invert "@opt-in|@claims"`). Um teste `@create` so fica de fora da execucao padrao se tambem tiver `[@opt-in]`. Use esse par quando o time ainda nao confirmou que e seguro criar aquele tipo de dado em toda execucao da suite. Quando o time libera a criacao daquele recurso especifico sem ressalvas, o teste mantem `[@create]` para fins de documentacao/filtro, mas remove `[@opt-in]` — passando a rodar normalmente no `npm test`. Para saber quais modulos ainda tem `[@opt-in]` hoje, rode `grep -rl "@opt-in" tests/` em vez de confiar em documentacao que pode ficar desatualizada.

Para excluir qualquer combinacao de tags pontualmente, sem editar scripts, use `npm run test:exclude -- "<regex>"` (ex: `npm run test:exclude -- "@opt-in"` para incluir `@claims` mas nao `@opt-in`).

### Convencao de nomenclatura para dados criados em `@create`

Todo dado criado por um teste `@create` **deve** seguir um padrao reconhecivel, para permitir limpeza manual em lote sem risco de apagar dados reais:

- Campos de nome/descricao: prefixo `QA Automation <Recurso>` (ex: `QA Automation User`, `QA Automation Company ${Date.now()}`).
- Campos de email: dominio reservado (ex: `@example-test.invalid` — o TLD `.invalid` e reservado pela RFC 2606 e nunca resolve de verdade) com prefixo `qa-automation-`.
- Sempre incluir `Date.now()` (ou outro valor unico) no campo que precisar ser unico no banco, para evitar colisao entre execucoes.

Adapte os prefixos/dominio ao combinar com o time do projeto especifico — o importante e a convencao existir e ser buscavel.

### Categorias de cenarios (7 perguntas Bolton + heuristicas complementares)

#### Passo 0 — Mapeamento SFDPOT antes das perguntas (James Bach)

Antes de responder as 7 perguntas abaixo, varra o endpoint pelas seis dimensoes do HTSM. Se
uma dimensao nao for relevante para este endpoint especifico, diga isso explicitamente em vez
de pular a etapa silenciosamente:

- **Estrutura:** de que componentes/integracoes este endpoint depende?
- **Funcao:** o que ele calcula, transforma ou transaciona?
- **Dados:** quais formatos, volumes e estados (inclusive arquivado/inativo) ele manipula?
- **Plataforma:** o comportamento muda entre ambientes (dev/staging/prod) ou entre versoes de contrato?
- **Operacoes:** ha uso concorrente real (dois clientes criando/alterando o mesmo recurso ao mesmo tempo)?
- **Tempo:** o que acontece com token expirando no meio da chamada, timeout, ou retry apos falha de rede?

#### As 7 perguntas Bolton

1. **O que este endpoint promete?** → Smoke + Contrato
2. **Ele cumpre o que promete?** → Consistencia interna (count vs length, totais vs parciais)
3. **Os dados fazem sentido sozinhos?** → Integridade (unicidade, formato, completude)
4. **Os dados fazem sentido no contexto do sistema?** → Cross-reference entre endpoints
5. **O resultado e deterministico na leitura?** → Idempotencia de leitura
6. **O que acontece nos limites?** → Boundaries, filtros, paginas vazias
7. **O que acontece quando algo esta errado?** → `@auth` (autenticacao), validacao de entrada, erros

#### Pergunta 8 — autorizacao entre perfis e grupos (oraculo Statutes + ataque de autorizacao)

8. **Este endpoint respeita o limite de autorizacao entre perfis e grupos, nao so a
   autenticacao?** → `@authz`. Testar explicitamente: um token valido de um perfil/grupo
   consegue acessar, por ID direto, um recurso de outro grupo? Este e o oraculo de
   "consistencia com normas" (dado de outro grupo e dado que este perfil nao tem direito de
   ver) combinado com o ataque de "estado invalido" de Whittaker. Trate esta pergunta com o
   mesmo rigor da pergunta 7 — nunca a pule por ja existir `@auth` cobrindo autenticacao. Esta
   e, historicamente, a categoria de bug mais grave e mais facil de deixar descoberta quando a
   suite so pensa em "quem e voce" e nao em "o que voce pode acessar".

#### Pergunta 8b — o 200 esta certo, mas o conteudo esta certo pra esse perfil?

Testamos que um endpoint retorna 200 (ou 401) para cada perfil, mas isso sozinho nao prova
nada sobre o *conteudo* da resposta quando o mesmo endpoint atende varios perfis. Isso e
diferente da pergunta 8 (IDOR/acesso cruzado por ID) e diferente de `@auth` (autenticacao) —
e um terceiro eixo:

8b. **Quando dois perfis diferentes recebem 200 do mesmo endpoint, o *conteudo* retornado e o
    que cada perfil deveria ver — campos sensiveis mascarados/omitidos, linhas filtradas,
    listas e contagens coerentes entre si?** Nao basta comparar status HTTP entre perfis (isso
    so prova que o endpoint nao bloqueia); e preciso comparar os dados. Dois padroes
    concretos a que ficar atento:
    - **Linhas que deveriam ser filtradas nao sao (ou sao filtradas demais):** um endpoint de
      listagem/contagem que, pra um perfil, deveria mostrar um subconjunto das linhas — e o
      endpoint irmao de detalhe (por ID) faz esse filtro corretamente, mas a listagem/contagem
      nao (ou zera tudo por engano).
    - **Campo que parece interno vazando pra um perfil externo:** nomes de campo que sugerem
      visibilidade diferente por perfil (ex: um campo de preco/custo interno) nao garantem
      nada sozinhos sem testar de verdade — confirmar comparando o payload de um perfil
      privilegiado contra o de um perfil restrito para o mesmo recurso, campo a campo, nao so
      o status.
    Ao criar ou revisar `@authz` de um endpoint que varios perfis conseguem acessar (200 para
    mais de um perfil), sempre inclua pelo menos um teste que **compare o payload em si** entre
    dois desses perfis — nao so o status. Quando o comportamento correto ainda nao foi
    confirmado pelo time, documente o comportamento atual como `[@authz]` (sem assumir
    certo/errado) e registre a duvida em `docs/bugs-index.md`/`docs/exploratory-log/`.

#### Checklist de dados e sequencia ao responder as perguntas 3 e 6 (Elisabeth Hendrickson)

Ao investigar integridade (pergunta 3) e limites (pergunta 6), passe por estes filtros em vez
de confiar so na intuicao:

- **CRUD + arquivamento:** se nao ha DELETE real no projeto, todo endpoint que cria recurso
  precisa responder: o recurso arquivado/inativado desaparece de onde deveria (listagens
  ativas) e continua aparecendo onde deveria (historico, auditoria, referencias ja existentes)?
- **Sequencias anomalas:** criar duas vezes em sequencia rapida (corrida por unicidade),
  atualizar um recurso ja arquivado, repetir um POST apos timeout de rede (ver `@idempotency`)
- **Dados goldilocks:** valor exatamente no limite, um a mais, um a menos, vazio, nulo, tipo
  errado, tamanho excessivo
- **Payload malformado:** nao so campo com tipo errado — JSON incompleto/quebrado, encoding
  inesperado, caracteres de injecao em campos de texto livre

#### Ataques de software ao fechar a cobertura de um endpoint (James Whittaker)

Alem do ataque de autorizacao (pergunta 8), considere:
- **Repeticao/rate limit:** disparar a mesma requisicao repetidas vezes rapidamente
- **Metodo HTTP inesperado:** chamar o endpoint com um verbo que ele nao deveria aceitar
- **Dependencia externa:** se o endpoint depender de outro servico, simular lentidao/falha dele

#### Verificacao final por Quadrantes de Teste Agil (Crispin & Gregory)

Antes de considerar a cobertura de um modulo completa, confira o equilibrio:
- **Q1 (tecnico, apoia o time):** contrato/model cobrem a base tecnica?
- **Q2 (negocio, apoia o time):** `@flow` cobre os exemplos de negocio combinados com o time?
- **Q3 (negocio, critica o produto):** houve sessao exploratoria registrada (ver secao "Log
  de atividades exploratorias")? Nao basta a intencao declarada na diretriz principal.
- **Q4 (tecnico, critica o produto):** existe `@performance` e `@authz`/ataques cobrindo este
  modulo, ou ficou so no funcional?

Se Q3 ou Q4 ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar o modulo
pronto, nao um "nice to have".

### Testes de fluxo (`tests/flows/`)

Testes que simulam a jornada do usuario cruzando multiplos endpoints. Diferem dos testes em `tests/api/` porque validam **expectativas do usuario**, nao o endpoint isolado. Os steps descrevem acoes do usuario ("User opens the dropdown", "User clicks Export"), nao chamadas HTTP. Criar esta pasta quando o primeiro fluxo cross-endpoint surgir.

### Testes de claims (`tests/claims/`)

Oraculo Claims do Bolton: "se o produto faz uma afirmacao sobre si mesmo, teste essa afirmacao." Se a API expoe um spec OpenAPI/Swagger, criar esta pasta para comparar o spec com a realidade (endpoints existem, schemas batem, status codes batem). Divergencias encontradas sao documentadas em `docs/bug-report-<data>-<tema>.md` com prefixo `CLAIM-`.

### Testes de regressao (`@regression`)

Oraculo History do Bolton: "o que ja quebrou antes tem mais chance de quebrar de novo."

Quando um teste nasce de um bug real documentado em `docs/bug-report-*.md`, adicionar `[@regression]` no nome do teste junto com o ID do bug entre parenteses. Formato: `[@regression] descricao do teste (BUG-XXX)`.

Status atual de cada bug e claim (corrigido, aceito como intencional, ou aberto): ver `docs/bugs-index.md` — fonte unica de verdade, atualizada a cada novo bug-report. Os arquivos `bug-report-*.md` continuam existindo como registro historico da investigacao, mas nao sao a referencia para status atual.

Executar `npm run test:regression` para verificar se algum bug corrigido voltou.

### Helpers

Quando multiplos testes repetem as mesmas assertions, extrair para funcao helper no **final do arquivo** (nao em arquivo separado).

## Checklist para novo endpoint

### Infraestrutura

1. Criar client em `src/api/clients/<recurso>.client.ts`
2. Criar model em `src/api/models/<recurso>.models.ts`
3. Criar contract em `src/api/contracts/<recurso>.contract.ts`
4. Registrar client como worker fixture em `tests/fixtures/api.fixture.ts`
5. Criar pasta de testes em `tests/api/<dominio>/<recurso>/`

### Cenarios

Aplicar o Passo 0 (SFDPOT) e as 8 perguntas Bolton (as 7 originais + a pergunta 8 de
autorizacao, incluindo a 8b de conteudo por perfil) e implementar os cenarios aplicaveis:
smoke, contrato, consistencia interna, integridade (com checklist Hendrickson),
cross-reference, idempotencia de leitura e escrita, `@auth`, `@authz` (acesso cruzado por ID
**e** comparacao de conteudo entre perfis quando ambos recebem 200), filtros/boundaries,
validacao de entrada, ataques de Whittaker pertinentes. Fechar o modulo conferindo o
equilibrio dos Quadrantes de Teste Agil — se Q3 (exploracao) ou Q4 (`@performance`/`@authz`)
ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar o modulo pronto.

Achados relevantes da exploracao (algo inesperado, uma decisao de escopo, uma duvida ainda nao confirmada) vao para `docs/exploratory-log/` **antes** dos testes finais serem escritos — nao esperar o fim da implementacao para registrar, o raciocinio se perde. Ver secao "Log de atividades exploratorias".

### Reauditoria de modulos ja cobertos

Uma pergunta ou heuristica nova adicionada a este `COPILOT.md` **nao se aplica so a modulos
futuros** — sempre que uma pergunta/heuristica for adicionada ou reforcada aqui (ex: a
pergunta 8b so foi adicionada apos uma auditoria encontrar essa lacuna em modulos ja
considerados "prontos"), vale perguntar explicitamente se os modulos ja cobertos precisam de
uma nova rodada de testes por causa dela, em vez de assumir que "cobertura completa" de um
modulo antigo continua valendo para sempre.

## Reporters

Custom console reporter em `src/reporters/console.reporter.ts`, registrado no array `reporter` do `playwright.config.ts`. Implementa a interface `Reporter` de `@playwright/test/reporter` com `export default`. Sem dependencias externas.

### Catalogo de testes

O mesmo reporter mantem `docs/test-catalog.md` — uma tabela com todo teste que ja rodou (suite, titulo, arquivo, status, data da ultima execucao). Atualizado automaticamente em `onEnd`, mesclando com o conteudo existente (rodar um subconjunto, ex: `npm run test:smoke`, so atualiza as linhas daquele subconjunto, sem apagar o resto). Nao editar manualmente — o arquivo e reescrito a cada corrida.

### Anexos de request/response (Allure e HTML report)

`tests/fixtures/instrumented-request.ts` envolve o `apiContext` num `Proxy` que intercepta os metodos HTTP (`get`, `post`, `put`, `patch`, `delete`, `head`, `fetch`). A cada chamada, anexa um resumo texto (metodo, URL, headers — `authorization` mascarado —, query params, corpo da requisicao, status, headers e corpo da resposta) ao teste em execucao via `testInfo.attach()`. Isso e nativo do Playwright, entao aparece tanto no HTML report quanto no Allure automaticamente, sem precisar chamar nada especifico de cada reporter.

Corpos texto/JSON sao truncados em 5000 caracteres; corpos binarios (imagens, arquivos) aparecem como `[binario: N bytes, content-type: X]`, sem embutir os bytes. Como o `apiContext` e compartilhado por todos os clients, isso funciona pra suite inteira sem precisar tocar em nenhum client ou teste — ao registrar um client novo na fixture, ele ja herda a instrumentacao automaticamente.

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

- Clients recebem `token: string | undefined` para suportar testes com e sem autenticacao (quando aplicavel).
- Contracts usam `additionalProperties: false` para detectar campos inesperados.
- Fixtures sao `worker`-scoped — login (se houver) acontece uma vez por worker, nao por teste.
- Testes de auth seguem padrao: sem token, token invalido (`invalid-token`), JWT malformado (`a.b.c`), esquema errado (`Basic`).
- Se a API tem RBAC/multi-perfil, registre uma fixture de token nomeada por perfil (ex:
  `adminAuthToken`, `clientAuthToken`, `<perfil>AuthToken`) em vez de um unico `authToken` —
  e o que viabiliza escrever `@authz` sem precisar logar manualmente dentro de cada teste.

## Log de atividades exploratorias

A diretriz principal deste projeto abre com "explorar como testador, nao como verificador" —
mas exploracao, por definicao, nao vira `test()` automatizado fechado. Para essa parte da
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

Bugs encontrados pelos testes sao documentados em `docs/bug-report-<data>-<tema>.md` com: severidade, endpoint, como reproduzir, resultado atual vs esperado, e quais testes falham.

Todo bug-report novo, ou mudanca de status de um bug/claim existente (corrigido, aceito como intencional, reaberto), **deve** atualizar `docs/bugs-index.md` no mesmo momento — esse arquivo e a fonte unica de verdade para status atual, os `bug-report-*.md` sao o registro historico da investigacao.
