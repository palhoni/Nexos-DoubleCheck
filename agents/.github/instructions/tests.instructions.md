---
applyTo: "tests/**"
---

# Convencoes de teste — con-api-automation

Aplicam-se a qualquer arquivo dentro de `tests/**`. Ver `.github/copilot-instructions.md`
para a diretiva geral (metodologia Bolton + heuristicas complementares).

## Estrutura obrigatoria

- Todo codigo dentro de `test()` **deve** estar em `test.step()` — sem excecao.
- Steps de request incluem metodo HTTP, endpoint e parametros relevantes no nome.
- Step separado para validacao de status HTTP.
- Step separado para parse do body (quando usado em steps seguintes).
- Mensagens descritivas em **todos** os `expect()`.

## Tags

Tags no formato `[@tag]` no nome do `test()` ou `test.describe()`:

| Tag | Quando usar |
|-----|-------------|
| `@smoke` | Golden path de fluxo critico |
| `@contract` | Validacao de JSON Schema |
| `@auth` | **Autenticacao** apenas (sem token, token invalido, JWT malformado, esquema errado) — quem e voce |
| `@authz` | **Autorizacao/escopo entre perfis e grupos** — o que voce pode acessar, mesmo autenticado. Acesso cruzado por ID direto (IDOR) e comparacao de conteudo entre perfis quando ambos recebem 200 — ver "Categorias de cenarios". Nao confundir com `@auth` |
| `@login` | Testes especificos de login |
| `@health` | Health check |
| `@consignment` | Dominio de consignacao |
| `@flow` | Jornada de usuario (cross-endpoint, simula o que o usuario faz na tela) |
| `@claims` | Oraculo Claims — valida que a API cumpre o que o Swagger afirma |
| `@regression` | Teste nascido de um bug real — inclui o ID do bug no nome (ex: `BUG-001`) |
| `@idempotency` | Escrita repetida (retry de POST/PUT) nao deve gerar efeito colateral duplicado |
| `@performance` | Tempo de resposta dentro do esperado — cobre o quadrante Q4 |
| `@create` | Informativo: cria dados reais sem delete correspondente. Ver `@opt-in` |
| `@opt-in` | Controla o que fica fora do `npm test` padrao junto com `@create` ainda nao liberado pelo time |

## Categorias de cenarios (7 perguntas Bolton + heuristicas complementares)

### Passo 0 — SFDPOT (James Bach)

Antes das 7 perguntas, varra o endpoint pelas seis dimensoes do HTSM (Estrutura, Funcao,
Dados, Plataforma, Operacoes, Tempo). Se uma dimensao nao for relevante, diga isso
explicitamente em vez de pular a etapa.

### As 7 perguntas Bolton

1. **O que este endpoint promete?** → Smoke + Contrato
2. **Ele cumpre o que promete?** → Consistencia interna (count vs length, totais vs parciais)
3. **Os dados fazem sentido sozinhos?** → Integridade (unicidade, formato, completude — ver checklist Hendrickson abaixo)
4. **Os dados fazem sentido no contexto do sistema?** → Cross-reference entre endpoints
5. **O resultado e deterministico na leitura?** → Idempotencia de leitura
6. **O que acontece nos limites?** → Boundaries, filtros, paginas vazias (ver checklist Hendrickson abaixo)
7. **O que acontece quando algo esta errado?** → `@auth`, validacao de entrada, erros

### Pergunta 8 — autorizacao entre perfis (`@authz`)

8. Um token valido de um perfil/grupo consegue acessar, por ID direto, um recurso de outro
   grupo? Trate com o mesmo rigor da pergunta 7 — nunca pular por ja existir `@auth`.

### Pergunta 8b — o 200 esta certo, mas o conteudo esta certo pra esse perfil?

Quando dois perfis diferentes recebem 200 do mesmo endpoint, o *conteudo* (campos, linhas,
contagens) e o que cada perfil deveria ver? Nao basta comparar status HTTP — comparar o
payload em si entre dois perfis que ambos acessam o mesmo endpoint.

### Checklist de dados (Elisabeth Hendrickson) e ataques de software (James Whittaker)

Hendrickson, ao investigar integridade/limites: CRUD+arquivamento (recurso inativado some das
listagens ativas mas continua no historico?), sequencias anomalas (criar 2x rapido, atualizar
recurso ja arquivado, retry apos timeout — ver `@idempotency`), dados goldilocks (limite exato,
vazio, nulo, excessivo), payload malformado (JSON quebrado, encoding, injecao).

Whittaker, ao fechar cobertura: repeticao/rate limit, metodo HTTP inesperado, dependencia
externa lenta/falhando.

### Verificacao final por Quadrantes de Teste Agil (Crispin & Gregory)

Antes de considerar um modulo pronto: Q1 (contrato/model), Q2 (`@flow`), Q3 (sessao
exploratoria registrada — ver "Log de atividades exploratorias" em `copilot-instructions.md`),
Q4 (`@performance`/`@authz`). Se Q3 ou Q4 ficaram sem cobertura, e uma lacuna a resolver,
nao um "nice to have".

### Reauditoria de modulos ja cobertos

Uma pergunta/heuristica nova aqui nao se aplica so a modulos futuros — pergunte se modulos ja
cobertos precisam de nova rodada por causa dela.

## Testes de fluxo (`tests/flows/`)

Testes que simulam a jornada do usuario cruzando multiplos endpoints.
Steps descrevem acoes do usuario ("User opens the dropdown"), nao chamadas HTTP.

## Testes de claims (`tests/claims/`)

Oraculo Claims do Bolton: "se o produto faz uma afirmacao sobre si mesmo, teste essa afirmacao."
O Swagger (`/openapi`) e a afirmacao oficial da API.
Divergencias encontradas sao documentadas em `docs/bug-report-<data>-<tema>.md` com prefixo `CLAIM-`.

## Testes de regressao (`@regression`)

Quando um teste nasce de um bug real documentado em `docs/bug-report-*.md`,
adicionar `[@regression]` no nome junto com o ID do bug.
Formato: `[@regression] descricao do teste (BUG-XXX)`.

## Padroes especificos de fixture/teste

- Testes de auth seguem padrao: sem token, token invalido (`invalid-token`), JWT malformado (`a.b.c`), esquema errado (`Basic`).
- Fixtures sao `worker`-scoped — login acontece uma vez por worker, nao por teste.

## Checklist para novo endpoint

### Infraestrutura

1. Criar client em `src/api/clients/<recurso>.client.ts`
2. Criar model em `src/api/models/<recurso>.models.ts`
3. Criar contract em `src/api/contracts/<recurso>.contract.ts`
4. Registrar client como worker fixture em `tests/fixtures/api.fixture.ts`
5. Criar pasta de testes em `tests/api/<dominio>/<recurso>/`

### Cenarios

Aplicar as 7 perguntas Bolton: smoke, contrato, consistencia interna, integridade,
cross-reference, idempotencia, auth, filtros/boundaries, validacao de entrada.
