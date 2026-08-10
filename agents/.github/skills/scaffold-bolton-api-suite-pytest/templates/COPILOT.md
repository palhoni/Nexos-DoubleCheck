# COPILOT.md — __PROJECT_NAME__

Automacao de testes de API, usando **pytest** + **Python**.

---

## Diretiva principal — Michael Bolton + heuristicas complementares

**Toda atividade neste projeto deve seguir a mentalidade de Michael Bolton (context-driven testing).** Isso se aplica a:

- **Explorar** uma pagina ou funcionalidade nova — investigar como um testador, nao como um verificador
- **Analisar** o que testar — priorizar por risco ao negocio, nao por cobertura de campos
- **Projetar** cenarios — usar os oraculos HICCUPPS para questionar consistencia
- **Categorizar** testes — marcadores (markers) mapeiam diretamente para os oraculos
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
  passar despercebido quando a suite so testa autenticacao (`auth`), nao autorizacao (`authz`).

---

## Stack

- **Runtime**: Python 3.9+
- **Framework de teste**: pytest (API testing, sem browser)
- **Cliente HTTP**: requests (via `InstrumentedSession`, ver Fixtures)
- **Validacao de contrato**: jsonschema (Draft7Validator)
- **Modelos**: pydantic (tipos e validacao de request/response)
- **Reports**: Custom reporter (`conftest.py` + `src/reporters/console_reporter.py`) + Allure Pytest

## Comandos

```bash
pytest                              # Roda a suite padrao (exclui opt_in e claims, ver pytest.ini)
pytest -m smoke                     # Apenas smoke
pytest -m contract                  # Apenas contract
pytest -m flow                      # Apenas flow
pytest -m claims                    # Apenas claims (fora da suite padrao)
pytest -m regression                # Apenas regression
pytest -m auth                      # Apenas auth (autenticacao)
pytest -m authz                     # Apenas authz (autorizacao entre perfis/grupos)
pytest -m idempotency               # Apenas idempotency
pytest -m performance                # Apenas performance
pytest -m create                    # Todos os create, de qualquer modulo
pytest -m "not <marker>"             # Exclui um marker pontualmente
allure generate allure-results --clean -o allure-report   # Gera relatorio Allure
allure open allure-report                                  # Abre relatorio Allure
```

`pytest` (sem `-m`) exclui `opt_in` e `claims` por padrao (`addopts` no `pytest.ini`: `-m "not opt_in and not claims"`) — claims e testes de criacao ainda nao liberados pelo time sao gates separados, nao rodam em toda execucao. Passar `-m` explicitamente na linha de comando substitui esse filtro padrao (comportamento normal do pytest), entao `pytest -m smoke` roda smoke normalmente sem precisar reexcluir nada.

Adicione novos markers em `pytest.ini` conforme novas tags de dominio surgirem (ex: `health`, `login`, ou tags especificas do dominio da API).

**Nota de adaptacao**: no stack Playwright+TS, tags vao no nome do teste como `[@smoke]`. Em Python isso nao e possivel (nomes de funcao nao aceitam `@`/`[`/`]`) — o equivalente e um **marker** do pytest (`@pytest.mark.smoke`), com o mesmo efeito de filtro (`pytest -m smoke` em vez de `--grep @smoke`). A tag `@opt-in` (TS) vira o marker `opt_in` (Python, com underscore — hifen nao e um identificador Python valido).

## Variaveis de ambiente

Definidas em `.env.example`, carregadas via `python-dotenv`. Defaults podem existir no `conftest.py` para dev local:

- `API_BASE_URL` — URL base da API
- Demais credenciais de autenticacao, se a API exigir login

## Arquitetura do projeto

```
src/
  clients/                        # Clients HTTP (1 por recurso, sem assertions)
  models/                         # Modelos Pydantic (request/response)
  contracts/
    contract_validator.py         # compile_contract + validate_contract + format_contract_errors (jsonschema)
  reporters/
    console_reporter.py           # Catalogo de testes + deteccao de bug corrigido

tests/
  fixtures/
    instrumented_session.py       # requests.Session que anexa request/response nos reports
  api/                            # Suites organizadas por dominio/recurso

conftest.py                       # Hooks do reporter + fixtures base (api_session, base_url, authToken se aplicavel)

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
| **Client** | `src/clients/` | Chamada HTTP pura, sem assertion. Recebe `token: Optional[str]` para permitir testes sem auth. |
| **Model** | `src/models/` | Classes Pydantic das requests e responses. |
| **Contract** | `src/contracts/` | JSON Schema validado com jsonschema (`compile_contract` + `format_contract_errors`). |
| **Fixture** | `conftest.py` | Fixtures `session`-scoped: `api_session`, clients, e `auth_token` (login automatico, se aplicavel). |
| **Teste** | `tests/api/` | Assertions de negocio. Toda logica de validacao fica aqui. |
| **Reporter** | `src/reporters/` | Hooks do pytest (`pytest_runtest_logreport`, `pytest_terminal_summary`). Sem dependencias externas alem do pytest. |

## Convencoes de teste

### Estrutura obrigatoria

- Cada passo logico de um teste deve ser claro e isolado — se o framework de steps nao estiver disponivel, use comentarios `# Step: ...` ou funcoes auxiliares nomeadas para manter a mesma legibilidade que `test.step()` do Playwright.
- Nomes de request incluem metodo HTTP, endpoint e parametros relevantes (no nome da funcao de teste ou no comentario do step).
- Validacao de status HTTP isolada e explicita.
- Parse do body isolado, com retorno tipado (via modelo Pydantic) quando usado em asserts seguintes.
- Mensagens descritivas em **todos** os `assert` (`assert condicao, "mensagem explicando o que era esperado"`).

### Markers (tags)

Registrados em `pytest.ini`, aplicados com `@pytest.mark.<nome>` no teste:

| Marker | Quando usar |
|--------|-------------|
| `smoke` | Golden path de fluxo critico |
| `contract` | Validacao de JSON Schema |
| `auth` | **Autenticacao** apenas (sem token, token invalido, JWT malformado, esquema errado) — quem e voce |
| `authz` | **Autorizacao/escopo entre perfis e grupos** — o que voce pode acessar, mesmo autenticado. Cobre acesso cruzado por ID direto entre grupos (IDOR) e comparacao de conteudo entre perfis quando ambos recebem 200 — ver secao "Categorias de cenarios". Nao confundir com `auth` |
| `flow` | Jornada de usuario (cross-endpoint, simula o que o usuario faz na tela) |
| `claims` | Oraculo Claims — valida que a API cumpre o que o Swagger/OpenAPI afirma. Fora da suite padrao |
| `regression` | Teste nascido de um bug real — inclui o ID do bug no nome da funcao ou docstring (ex: `test_reject_invalid_date_bug_001`) |
| `idempotency` | Escrita repetida (retry de POST/PUT) nao deve gerar efeito colateral duplicado, alem da idempotencia de leitura ja coberta pela pergunta 5 |
| `performance` | Tempo de resposta dentro do esperado; cobre o quadrante tecnico-critico (Q4) |
| `create` | Informativo: cria dados reais sem operacao de delete correspondente na API. Rodar todos via `pytest -m create` |
| `opt_in` | Controla o que fica fora da suite padrao (junto com `claims`). Usar em `create` de modulos que o time ainda nao liberou para criar dados em toda execucao |
| `pending` | Golden path identificado mas nao implementado — usar `@pytest.mark.skip(reason="...")` explicando o motivo, nunca deixar o cenario ausente silenciosamente |

Adicione markers de dominio conforme necessario (ex: `health`, `login`, `<recurso>`).

Exploracao (Q3 dos Quadrantes de Teste Agil) nao vira marker — por definicao, e investigacao
aberta, nao um check fechado. Ver secao "Log de atividades exploratorias".

### Marker `create` e `opt_in`

`create` e **informativo**: marca testes que criam registros reais via endpoints sem operacao de delete correspondente na API. Todo teste `create` deve limpar o que criou quando possivel (arquivar/inativar quando nao houver delete) e seguir uma convencao de nomenclatura reconhecivel (prefixo tipo `QA Automation <Recurso>`, dominio de email reservado tipo `@example-test.invalid`, sempre incluindo um valor unico tipo timestamp). `pytest -m create` roda todos, de qualquer modulo.

`opt_in` controla o que fica fora da suite padrao (`-m "not opt_in and not claims"` no `pytest.ini`). Um teste `create` so fica de fora da execucao padrao se tambem tiver `opt_in`. Use esse par quando o time ainda nao confirmou que e seguro criar aquele tipo de dado em toda execucao. Quando o time libera, o teste mantem `create` mas remove `opt_in`.

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
7. **O que acontece quando algo esta errado?** → `auth` (autenticacao), validacao de entrada, erros

#### Pergunta 8 — autorizacao entre perfis e grupos (oraculo Statutes + ataque de autorizacao)

8. **Este endpoint respeita o limite de autorizacao entre perfis e grupos, nao so a
   autenticacao?** → `authz`. Testar explicitamente: um token valido de um perfil/grupo
   consegue acessar, por ID direto, um recurso de outro grupo? Trate esta pergunta com o
   mesmo rigor da pergunta 7 — nunca a pule por ja existir `auth` cobrindo autenticacao. Esta
   e, historicamente, a categoria de bug mais grave e mais facil de deixar descoberta quando a
   suite so pensa em "quem e voce" e nao em "o que voce pode acessar".

#### Pergunta 8b — o 200 esta certo, mas o conteudo esta certo pra esse perfil?

8b. **Quando dois perfis diferentes recebem 200 do mesmo endpoint, o *conteudo* retornado e o
    que cada perfil deveria ver — campos sensiveis mascarados/omitidos, linhas filtradas,
    listas e contagens coerentes entre si?** Nao basta comparar status HTTP entre perfis; e
    preciso comparar os dados. Padroes concretos a que ficar atento: linhas que deveriam ser
    filtradas nao sao (ou sao filtradas demais) num endpoint de listagem/contagem cujo irmao de
    detalhe (por ID) faz o filtro corretamente; ou um campo que parece interno vazando pra um
    perfil externo. Ao revisar `authz` de um endpoint que varios perfis acessam, sempre inclua
    um teste que **compare o payload em si** entre dois perfis, nao so o status. Quando o
    comportamento correto ainda nao foi confirmado pelo time, documente o estado atual como
    `authz` sem assumir certo/errado, e registre a duvida em `docs/bugs-index.md`.

#### Checklist de dados e sequencia ao responder as perguntas 3 e 6 (Elisabeth Hendrickson)

Ao investigar integridade (pergunta 3) e limites (pergunta 6), passe por estes filtros em vez
de confiar so na intuicao:

- **CRUD + arquivamento:** se nao ha DELETE real no projeto, todo endpoint que cria recurso
  precisa responder: o recurso arquivado/inativado desaparece de onde deveria (listagens
  ativas) e continua aparecendo onde deveria (historico, auditoria, referencias ja existentes)?
- **Sequencias anomalas:** criar duas vezes em sequencia rapida (corrida por unicidade),
  atualizar um recurso ja arquivado, repetir um POST apos timeout de rede (ver `idempotency`)
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
- **Q2 (negocio, apoia o time):** `flow` cobre os exemplos de negocio combinados com o time?
- **Q3 (negocio, critica o produto):** houve sessao exploratoria registrada (ver secao "Log
  de atividades exploratorias")? Nao basta a intencao declarada na diretriz principal.
- **Q4 (tecnico, critica o produto):** existe `performance` e `authz`/ataques cobrindo este
  modulo, ou ficou so no funcional?

Se Q3 ou Q4 ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar o modulo
pronto, nao um "nice to have".

### Testes de fluxo (`tests/flows/`)

Testes que simulam a jornada do usuario cruzando multiplos endpoints. Diferem dos testes em `tests/api/` porque validam **expectativas do usuario**, nao o endpoint isolado. Criar esta pasta quando o primeiro fluxo cross-endpoint surgir.

### Testes de claims (`tests/claims/`)

Oraculo Claims do Bolton: "se o produto faz uma afirmacao sobre si mesmo, teste essa afirmacao." Se a API expoe um spec OpenAPI/Swagger, criar esta pasta para comparar o spec com a realidade (endpoints existem, schemas batem, status codes batem). Divergencias encontradas sao documentadas em `docs/bug-report-<data>-<tema>.md` com prefixo `CLAIM-`.

### Testes de regressao (`regression`)

Oraculo History do Bolton: "o que ja quebrou antes tem mais chance de quebrar de novo."

Quando um teste nasce de um bug real documentado em `docs/bug-report-*.md`, adicionar o marker `@pytest.mark.regression` e o ID do bug no nome da funcao ou na docstring. Formato sugerido: `def test_<descricao>_bug_xxx(): """[@regression] descricao do teste (BUG-XXX)"""`.

Status atual de cada bug e claim (corrigido, aceito como intencional, ou aberto): ver `docs/bugs-index.md` — fonte unica de verdade, atualizada a cada novo bug-report. Os arquivos `bug-report-*.md` continuam existindo como registro historico da investigacao, mas nao sao a referencia para status atual.

Executar `pytest -m regression` para verificar se algum bug corrigido voltou.

### Helpers

Quando multiplos testes repetem as mesmas assertions, extrair para funcao helper no **final do arquivo** (nao em arquivo separado).

## Checklist para novo endpoint

### Infraestrutura

1. Criar client em `src/clients/<recurso>_client.py`
2. Criar model em `src/models/<recurso>_models.py`
3. Criar contract em `src/contracts/<recurso>_contract.py`
4. Registrar client como fixture em `conftest.py`
5. Criar pasta de testes em `tests/api/<dominio>/<recurso>/`

### Cenarios

Aplicar o Passo 0 (SFDPOT) e as 8 perguntas Bolton (as 7 originais + a pergunta 8 de
autorizacao, incluindo a 8b de conteudo por perfil) e implementar os cenarios aplicaveis:
smoke, contrato, consistencia interna, integridade (com checklist Hendrickson),
cross-reference, idempotencia de leitura e escrita, `auth`, `authz` (acesso cruzado por ID
**e** comparacao de conteudo entre perfis quando ambos recebem 200), filtros/boundaries,
validacao de entrada, ataques de Whittaker pertinentes. Fechar o modulo conferindo o
equilibrio dos Quadrantes de Teste Agil — se Q3 (exploracao) ou Q4 (`performance`/`authz`)
ficaram sem cobertura, isso e uma lacuna a resolver antes de considerar o modulo pronto.

Achados relevantes da exploracao (algo inesperado, uma decisao de escopo, uma duvida ainda nao confirmada) vao para `docs/exploratory-log/` **antes** dos testes finais serem escritos — nao esperar o fim da implementacao para registrar, o raciocinio se perde. Ver secao "Log de atividades exploratorias".

### Reauditoria de modulos ja cobertos

Uma pergunta ou heuristica nova adicionada a este `COPILOT.md` **nao se aplica so a modulos
futuros** — sempre que uma pergunta/heuristica for adicionada ou reforcada aqui, vale
perguntar explicitamente se os modulos ja cobertos precisam de uma nova rodada de testes por
causa dela, em vez de assumir que "cobertura completa" de um modulo antigo continua valendo
para sempre.

## Reporters

Hooks customizados definidos em `conftest.py`, com a logica reutilizavel em `src/reporters/console_reporter.py`. Usa apenas os hooks nativos do pytest (`pytest_sessionstart`, `pytest_runtest_logreport`, `pytest_terminal_summary`) — sem plugin externo alem do `allure-pytest`.

### Catalogo de testes

O mesmo reporter mantem `docs/test-catalog.md` — uma tabela com todo teste que ja rodou (suite, titulo, arquivo, status, data da ultima execucao). Atualizado automaticamente em `pytest_terminal_summary`, mesclando com o conteudo existente (rodar um subconjunto, ex: `pytest -m smoke`, so atualiza as linhas daquele subconjunto, sem apagar o resto). Nao editar manualmente — o arquivo e reescrito a cada corrida. **Mesmo formato do stack Playwright+TS** — se um dia o projeto migrar de stack ou tiver ambos, o arquivo continua consistente.

### Anexos de request/response (Allure)

`tests/fixtures/instrumented_session.py` define `InstrumentedSession`, uma subclasse de `requests.Session` que sobrescreve `request()` — o metodo unico por onde `get`/`post`/`put`/`delete`/`patch` passam internamente na biblioteca `requests`. A cada chamada, anexa um resumo texto (metodo, URL, headers — `authorization` mascarado —, query params, corpo da requisicao, status, headers e corpo da resposta) ao teste em execucao via `allure.attach()`. Aparece automaticamente no relatorio Allure.

Corpos texto/JSON sao truncados em 5000 caracteres; corpos binarios (imagens, arquivos) aparecem como `[binário: N bytes, content-type: X]`, sem embutir os bytes. Como a fixture `api_session` retorna essa sessao instrumentada, isso funciona pra suite inteira sem precisar tocar em nenhum client ou teste — ao registrar um client novo que recebe `api_session`, ele ja herda a instrumentacao automaticamente.

### Deteccao de bug corrigido

O reporter compara o status anterior (lido do `test-catalog.md`) com o resultado da corrida atual. Se um teste referenciado na coluna "Teste(s)" de um bug **aberto** em `docs/bugs-index.md` vira de falhou para passou, um aviso aparece no terminal (`⚠ Possiveis bugs corrigidos`) via `pytest_terminal_summary`. A granularidade e por arquivo `.py`, nao por titulo exato de teste (a coluna e texto livre).

Isso so detecta bugs cujo teste falha por design (afirma o comportamento correto e falha ate ser corrigido) — bugs cujo teste so documenta o comportamento atual (e ja passa hoje) exigem que alguem reescreva a expectativa do teste quando corrigidos, nao ha sinal automatico possivel nesse caso. O aviso e so deteccao — atualizar o status no `bugs-index.md` continua sendo manual, para confirmar que e uma correcao real e nao uma instabilidade pontual.

## Padroes de codigo

- Clients recebem `token: Optional[str]` para suportar testes com e sem autenticacao (quando aplicavel).
- Contracts (`compile_contract`) usam `additionalProperties: False` no JSON Schema para detectar campos inesperados.
- Fixtures de sessao (`scope="session"`) — login (se houver) acontece uma vez por sessao de teste, nao por teste individual.
- Testes de auth seguem padrao: sem token, token invalido (`"invalid-token"`), JWT malformado (`"a.b.c"`), esquema errado (`"Basic ..."`).
- Se a API tem RBAC/multi-perfil, registre uma fixture de token nomeada por perfil (ex:
  `admin_auth_token`, `client_auth_token`, `<perfil>_auth_token`) em vez de um unico
  `auth_token` — e o que viabiliza escrever `authz` sem precisar logar manualmente dentro de
  cada teste.

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
- **Se algo virou teste automatizado** (`regression`, `authz`, etc.) como consequencia

Sessoes que nao encontram nada tambem devem ser registradas — isso e dado sobre cobertura, nao
so sobre bugs. Nao e log cronologico de tarefas ("hoje trabalhei em X"); so entra o que tem
valor para investigacoes futuras.

Cada entrada e indexada em uma linha no `docs/exploratory-log/INDEX.md`. Quando uma descoberta se confirma como padrao recorrente, ela "sobe" para uma regra neste `COPILOT.md`; quando vira um bug confirmado, vira entrada em `docs/bugs-index.md`. Entradas resolvidas saem do `INDEX.md` (o arquivo original fica no historico do Git).

## Bug reports

Bugs encontrados pelos testes sao documentados em `docs/bug-report-<data>-<tema>.md` com: severidade, endpoint, como reproduzir, resultado atual vs esperado, e quais testes falham.

Todo bug-report novo, ou mudanca de status de um bug/claim existente (corrigido, aceito como intencional, reaberto), **deve** atualizar `docs/bugs-index.md` no mesmo momento — esse arquivo e a fonte unica de verdade para status atual, os `bug-report-*.md` sao o registro historico da investigacao.
