# Progresso — 2026-08-07

## Contexto geral

Continuação do Nexus 2.0 (Fase 2, produto real). O usuário optou por pular os dois itens pendentes do fim do dia
anterior (bug "não dá para cadastrar produtos" e confirmação dos fixes de Pessoas no navegador — ver
`docs/dev/2026-08-06-progresso.md` e `docs/dev/2026-08-07-proximos-passos.md`) e seguir direto para o Epic 5.

## Epic 5 — Público-alvo (primeira sub-entidade de Produto)

Implementado seguindo exatamente a mesma dinâmica das sub-entidades anteriores: aba real dentro do Detalhe de
Produto, escopada por `produtoId`, réplica 1:1 da receita de `Time` dentro de `Projeto`.

### Modelo de dados

Campos do texto original do usuário (nome do público, perfil, tipo de usuário, descrição, necessidades, dores,
objetivos, frequência de uso, canais utilizados, países onde se aplica, observações) + `status` (Ativo/Inativo,
padrão de toggle igual todo o resto do sistema). `necessidades`/`dores`/`objetivos` foram modelados como 3 listas
aditivas (`String[]`, com endpoint próprio de add/remove) em vez de um textarea único — são atributos plurais,
seguindo a mesma convenção já usada em `Pessoa.responsabilidades/especialidades/produtos`.

Listas fechadas inventadas (nenhuma foi especificada pelo usuário — ajustar se ele pedir):
- Tipo de Usuário: Cliente Final, Usuário Interno, Parceiro, Administrador, Operador, Outro.
- Frequência de Uso: Diária, Semanal, Quinzenal, Mensal, Esporádica.
- Canais Utilizados: Web, Aplicativo Mobile, E-mail, WhatsApp, API, Telefone, Presencial.
- Países onde se Aplica: mesma lista de 8 países já usada em Time/Produto.

### Backend

- `Prisma.PublicoAlvo` + `PublicoAlvoStatus`, migration `20260807131216_add_publico_alvo`.
- Módulo `apps/api/src/publico-alvo/*` (controller/service/dtos/constants/module), registrado em `app.module.ts`.
- Rota aninhada `produtos/:produtoId/publico-alvo`, com `assertProdutoExists` no service (mesmo padrão de
  `assertProjetoExists`).
- `necessidades`/`dores`/`objetivos`: endpoints `POST`/`DELETE :id/<campo>/:valor`, igual `PessoasService`.
- Validado via PowerShell/curl: create, list (com filtro), get by id, update, toggle-status (ida e volta),
  histórico (4 entradas registradas corretamente), add/remove nas 3 listas aditivas, isolamento de escopo
  (404 ao buscar por um produto diferente do dono do registro) e 404 ao criar sob `produtoId` inexistente.
- `npx tsc --noEmit` limpo.

### Frontend

- `apps/web/src/entities/publico-alvo/{publico-alvo.types,publico-alvo.config,publico-alvo.hooks}.ts` — 100%
  reaproveitando o scaffold genérico `entities/crud/*`, sem nenhuma alteração nele.
- `apps/web/src/pages/projetos/{PublicoAlvoTabPanel,PublicoAlvoDetailPage}.tsx` — padrão `TimesTabPanel`/
  `TimeDetailPage` (lista embutida verdadeiramente escopada por `produtoId`, com página de detalhe própria —
  diferente do padrão `fixedQuery` usado em "Pessoas do Time", que não se aplicava aqui).
  Detalhe tem 5 abas: Configurações, Necessidades, Dores, Objetivos, Histórico.
- Aba "Público-alvo" adicionada em `produto.config.ts` (`kind: 'bespoke'`) e registrada em
  `ProdutoDetailPage.tsx` via `bespokeComponents`.
  Rota nova em `router.tsx`: `/projetos/:projetoId/produtos/:produtoId/publico-alvo/:publicoAlvoId`.
- `npm run build` (`tsc -b && vite build`) limpo.

## Epic 6 — Módulos (segunda sub-entidade de Produto)

Mesmo padrão do Epic 5, réplica da receita de `Time`/`PublicoAlvo`. Campos: nome, código (único por produto,
igual `Produto.codigo` por projeto), descrição, objetivo, responsável (`responsavelPrincipal`, mesma convenção de
nome usada em Time/Produto/Projeto), status (Ativo/Inativo) e ordem de exibição.

**Extensão de escopo genuína no scaffold do front-end**: "ordem de exibição" é um campo numérico — não existia
tipo `'number'` em `entities/crud/types.ts`/`EntityFormFields.tsx`/`formSchema.ts` (só text/textarea/select/
multiselect/date/boolean). Adicionado o tipo `'number'` ao scaffold genérico (input HTML `type="number"`,
coerção para `number|undefined` no `onChange`, Zod `z.number().optional()`) porque é uma necessidade real, não
opcional — os demais arquivos do scaffold (`FieldValue`/`renderEntityCell`) já tratavam bem valores numéricos via
`String(value)`, sem precisar de mudança.

- Backend: `apps/api/src/modulos/*`, migration `20260807133758_add_modulos`, rota
  `produtos/:produtoId/modulos`. `QueryModuloDto` ordena por `ordemExibicao asc` por padrão (em vez de
  `createdAt desc`, diferente dos outros Epics) porque é literalmente o propósito do campo.
  Validado via curl: create (x2, para testar ordenação), list, get, update, toggle-status, histórico, código
  duplicado no mesmo produto (500 — mesmo comportamento não tratado que já existe em Produto, não é regressão),
  isolamento de escopo (404).
- Frontend: `apps/web/src/entities/modulo/*`, `ModulosTabPanel`/`ModuloDetailPage`, aba "Módulos" no Detalhe de
  Produto, rota `/projetos/:projetoId/produtos/:produtoId/modulos/:moduloId`.
- `tsc --noEmit` (api) e `npm run build` (web) limpos.

## Epic 7 — Funcionalidades (terceira sub-entidade de Produto)

Mesmo padrão, com uma diferença importante: **primeira sub-entidade com FK para outra sub-entidade** (Módulo,
via `moduloId` opcional). Campos: nome, código (único por produto), módulo (FK), descrição, objetivo,
comportamento esperado, usuários (texto livre, mesmo padrão de `Produto.usuariosPrincipais` — não é lista, é
descrição de quem usa), responsável, status, observações.

- Backend: réplica do padrão já usado em `Produto.timeResponsavelId` (FK opcional cruzando para outra entidade
  escopada) — `assertModuloBelongsToProduto(produtoId, moduloId)` no `FuncionalidadesService`, verificado tanto
  no create quanto no update. Validado via curl: create com FK válida, FK inválida (400, módulo não pertence ao
  produto), isolamento de escopo (404), CRUD completo + histórico.
- Frontend: `FuncionalidadesTabPanel`/`FuncionalidadeDetailPage` buscam a lista de Módulos do produto atual via
  `moduloHooks.useList` e passam como `extraOptions={{ modulos }}` — mesmo padrão usado em `ProdutoDetailPage`
  para resolver `timeResponsavelId`.
- `tsc --noEmit` (api) e `npm run build` (web) limpos.

## Epic 9 — Jornadas (quarta sub-entidade de Produto; não existe Epic 8 no texto original)

De longe a mais complexa até agora. Três decisões de arquitetura foram levadas ao usuário antes de implementar
(via pergunta direta, não assumidas):

1. **Etapas**: modeladas como lista simples aditiva (`String[]`, mesmo padrão de Necessidades/Dores/Objetivos do
   Público-alvo), não como sub-entidade estruturada com tela visual própria. Decisão do usuário — pode evoluir
   depois sem perder dados se ele quiser uma tela de mapeamento visual.
2. **Produtos participantes / Módulos / Funcionalidades**: modelados como referências relacionais reais (M2M no
   Prisma), não texto livre — para preservar a integridade que os futuros AGENTS de IA vão precisar. Decisão do
   usuário.
3. **Alcance de "produtos participantes"**: pode ser de **qualquer Projeto**, não só do mesmo Projeto da Jornada.
   Decisão do usuário — isso exigiu um novo endpoint global.

### Consequências técnicas dessas decisões

- **Primeira entidade com relações muitos-para-muitos reais** no schema: `Jornada.modulos`/`funcionalidades`
  (M2M implícito do Prisma, escopados ao mesmo produto — validado via `assertModulosBelongToProduto`/
  `assertFuncionalidadesBelongToProduto`) e `Jornada.produtosParticipantes` (M2M cross-projeto, só valida
  existência via `assertProdutosParticipantesExist`, sem checar escopo). `Jornada.publicoAlvoId` é FK simples
  (mesmo padrão de `Funcionalidade.moduloId`).
- API sempre serializa essas relações como arrays planos de ids (`moduloIds`, `funcionalidadeIds`,
  `produtoParticipanteIds`) via um helper `serialize()` no `JornadasService`, nunca objetos aninhados — mantém a
  API consistente com o padrão `string[]` já usado em todo o resto do sistema.
- Create usa `connect`, update usa `set` (substitui a lista inteira) — `set` é o correto porque o campo é editado
  como um multiselect comum dentro do formulário (todas as seleções são enviadas de uma vez), não como uma
  lista aditiva com endpoint próprio (só "etapas" tem endpoint próprio de add/remove).
- **Novo endpoint global `GET /produtos`** (`ProdutosGlobalController`, `ProdutosService.findAllGlobal`) — o
  primeiro endpoint de Produto não aninhado por Projeto, necessário para popular o seletor cross-projeto de
  "produtos participantes". Retorna até 200 produtos com o nome do projeto embutido para desambiguação na UI.
- **Extensão no scaffold genérico do front-end**: até agora, campos `multiselect` com `optionsFrom` já
  populavam as opções do formulário corretamente, mas a exibição (lista e detalhe) sempre mostrava os valores
  brutos via `EntityChipList`, nunca resolvia o label — não era um problema enquanto os valores dos multiselects
  eram literais (ex. "Brasil", "Web"). Para Jornada, os valores são ids opacos, então adicionei
  `resolveOptionLabels` em `shared.tsx` e liguei em `renderEntityCell` (lista) e `FieldValue` (detalhe) — mesma
  ideia de `resolveOptionLabel` (já usado por `select`), só que para arrays.
- Validado via curl: create com as 4 referências cruzadas de uma vez, list/get, update trocando
  `produtoParticipanteIds` via `set`, toggle-status, etapas add/remove, histórico, módulo de outro produto (400),
  produto participante inexistente (400), isolamento de escopo (404), e o endpoint global `/produtos`.
- `tsc --noEmit` (api) e `npm run build` (web) limpos.

## Epic 10 — Regras (quinta sub-entidade de Produto)

A mais complexa do dia — três decisões de arquitetura levadas ao usuário antes de codificar (mesmo processo do
Epic 9), todas na opção recomendada:

1. **Versionamento**: cada versão é uma linha própria na tabela `regras`, todas compartilhando um `grupoId`
   (para a v1, `grupoId = id`, setado num segundo passo depois do insert porque o id só existe depois de criar).
   Uma flag `versaoAtual: Boolean` marca qual linha do grupo é a vigente. `numeroVersao: Int` incrementa a cada
   nova versão. Rejeitada a alternativa de guardar um JSON de snapshots num único registro — ficaria inconsistente
   com o resto do sistema, que é todo relacional.
2. **Dependência de Integrações (Epic 11, ainda não construído)**: Regras foi implementada com vínculos reais
   para Módulo/Funcionalidade/Jornada (M2M, mesmo padrão de Jornada), mas **sem** o vínculo de Integrações — será
   adicionado quando o Epic 11 existir.
3. **Prioridade/vigência**: prioridade é lista fechada (Alta/Média/Baixa) e vigência é um intervalo de datas
   (`vigenciaInicio`/`vigenciaFim`, `@db.Date`, mesmo fix de Prisma 7 usado no `dataInicio` do Projeto:
   `@Type(() => Date) @IsDate()`, não `@IsDateString()`).

**Correção durante a implementação**: cheguei a modelar `prioridade` como enum Prisma com um valor acentuado
("Média") usando `@map()` — mas isso seria a primeira vez no sistema que um enum de status/categoria carrega
acento; todo o resto ("frequenciaUso", "tipoUsuario", "areaNegocio" etc.) já usa `String` simples validada só no
DTO (`@IsIn`), reservando enum Prisma de verdade só para os campos `status` (sempre Ativo/Inativo/Planejamento,
sempre ASCII). Corrigi para manter a mesma convenção — `prioridade` é `String?`, não um enum novo.

### Endpoints e comportamento

- CRUD padrão em `/produtos/:produtoId/regras`, mas **a listagem (`GET`) só mostra `versaoAtual: true`** — o
  usuário pensa em "regras" como uma lista de regras vigentes, não uma lista de cada linha histórica.
- `POST :id/nova-versao` — clona todos os campos da versão informada para uma nova linha (`numeroVersao + 1`,
  `versaoAtual: true`), desmarca `versaoAtual` de todas as outras linhas do mesmo `grupoId`, registra histórico
  em ambas as linhas ("Nova versão criada" / "Substituída pela vN").
- `GET :id/versoes` — lista resumida (id/numeroVersao/versaoAtual/nome/status/createdAt) de todas as versões do
  grupo, para o seletor de versões da UI.
- `excecoes`/`exemplos`: listas aditivas (mesmo padrão de `etapas` da Jornada).
- Validado via curl: create v1 com as 3 refs cruzadas, nova-versão (v1→v2, confirma histórico e filtro da
  listagem), listar versões, excecoes/exemplos, FK inválida para módulo/funcionalidade/jornada (400 cada),
  isolamento de escopo (404), toggle-status, update substituindo relação via `set`.

### Frontend

- `entities/regra/*` segue o scaffold genérico (list/form/detail/simpleList/history), mas o versionamento em si
  **não cabe no scaffold genérico** — é bespoke de verdade: `regra.hooks.ts` expõe `useVersoesRegra` e
  `useCriarNovaVersaoRegra` além dos hooks padrão de `createEntityHooks`.
- Nova aba bespoke "Versões" (`VersoesTabPanel.tsx`) dentro do Detalhe de Regra: botão "Nova versão" (cria e
  navega para a versão nova) + dois seletores de versão com uma tabela de comparação campo a campo, destacando
  linhas divergentes. Campos de relação (módulos/funcionalidades/jornadas) são comparados por contagem/ids, não
  por nome — simplificação deliberada para não precisar carregar `extraOptions` dentro do painel de comparação.
- `tsc --noEmit` (api) e `npm run build` (web) limpos.

## Epic 11 — Integrações (sexta sub-entidade de Produto)

Campos: nome, status, direção (Entrada/Saída/Bidirecional), produto relacionado (FK cross-projeto, mesmo padrão
de "produtos participantes" da Jornada, mas singular), tipo (API/Evento/Fila/Banco de Dados/Arquivo), endpoint
(texto livre — o significado depende do tipo), modo (Síncrona/Assíncrona), criticidade (Alta/Média/Baixa), time
proprietário (FK, mas validada contra o **mesmo Projeto do Produto**, não contra o próprio produtoId — Integração
só carrega produtoId, então o service busca o projetoId do produto antes de validar o Time).

O usuário decidiu explicitamente construir a "visualização gráfica das relações" (NX-PRD-INT-006) já nesta
sessão, em vez de deixar só o CRUD e adiar o diagrama.

### Backend

- CRUD padrão em `/produtos/:produtoId/integracoes`.
- **Novo endpoint global `GET /integracoes`** (`IntegracoesGlobalController`) — todas as integrações de todos os
  produtos/projetos, com nome + projetoId do produto dono e do produto relacionado embutidos — alimenta o mapa
  visual sem precisar varrer produto por produto.
- Validado via curl: create com produto relacionado cross-produto e time proprietário do mesmo projeto,
  produto relacionado inexistente (400), isolamento de escopo (404), toggle-status, histórico, endpoint global.
- **Nota de processo**: os valores acentuados de teste ("Saída", "Assíncrona", "Média") vinham corrompidos ao
  passar direto na linha de comando do PowerShell — não é bug da aplicação. Resolvido escrevendo o payload JSON
  num arquivo UTF-8 (via ferramenta de escrita) e lendo os bytes no PowerShell antes de enviar, em vez de
  interpolar acentos direto no comando.

### Frontend

- `entities/integracao/*` + `IntegracoesTabPanel`/`IntegracaoDetailPage` seguem o scaffold genérico, igual aos
  Epics anteriores — nada de novo aqui.
- **Mapa de Integrações** (`pages/integracoes/IntegracoesMapaPage.tsx`): página de topo nova (fora do Detalhe de
  Produto), rota `/integracoes`, item novo na Sidebar (ícone `network`, adicionado ao design system). Busca todas
  as integrações via o endpoint global, monta os Produtos únicos envolvidos (dono + relacionado) num layout
  circular (SVG puro, sem biblioteca de grafos), desenha uma linha por integração colorida por criticidade
  (Alta=vermelho/Média=âmbar/Baixa=azul/sem-criticidade=cinza) com seta indicando a direção (Entrada/Saída/
  Bidirecional via `marker-start`/`marker-end` com `orient="auto-start-reverse"`). Clicar num nó abre o Produto;
  clicar numa linha abre a Integração. Integrações sem produto relacionado (não desenháveis como aresta) aparecem
  numa lista separada abaixo, para não desaparecerem silenciosamente da visão.
- `tsc --noEmit` (api) e `npm run build` (web) limpos.

## Base de dados de DEV populada com dados realistas (extensão do `prisma/seed.ts`)

A pedido do usuário, `apps/api/prisma/seed.ts` foi bastante ampliado para popular a base de DEV como se fosse uma
base real — não só o Projeto "Nexus" já existente, mas 3 projetos com profundidade completa e 3 projetos leves
(escala escolhida pelo usuário: "menos projetos, mais profundidade cada").

**Projetos com profundidade completa** (times, pessoas, 2 produtos cada, com todas as 6 sub-entidades por
produto): Nexus — Configurador do Nexo (já existia, ganhou as sub-entidades), Onboarding Digital CPF/CNPJ,
Motor de Regras de Crédito.

**Projetos leves** (1 time, poucas pessoas, 1 produto com sub-entidades mais escassas): Copiloto de Atendimento,
Integração Jira-Confluence, Portal do Cliente 2.0.

**Volume final**: 9 Produtos, 20 Público-alvo, 26 Módulos, 37 Funcionalidades, 17 Jornadas (algumas com
`produtosParticipantes` cross-projeto de verdade — ex. a Jornada de elegibilidade do Motor de Elegibilidade
referencia os Produtos do projeto Onboarding Digital), 32 linhas de Regra (28 regras + 4 delas com uma segunda
versão, para demonstrar o versionamento — ex. "Score Mínimo para Aprovação Automática" v1=600/v2=650), 20
Integrações (várias cross-produto/cross-projeto, ex. Score de Crédito → Motor de Elegibilidade).

**Antes de popular**: removidos os registros de teste que eu mesmo criei via curl durante a validação dos Epics
5-11 (Público-alvo "Gerentes de Operacoes", Módulos "Cadastro de Projetos/Times", Funcionalidade "Criar Projeto",
Jornada "Onboarding de Novo Projeto", Regra "Limite de desconto" v1+v2, Integração "Notifica Copiloto...") —
deletados por id específico (não um `deleteMany({})` cego), então re-rodar o seed no futuro nunca apaga dados
reais criados por outra pessoa via UI.

**Pendência identificada, não tratada**: existe um "Produto Teste Curl" (código TST) dentro do projeto Nexus,
criado numa sessão anterior à de hoje (antes do Epic 5) — não fazia parte do escopo de limpeza que o usuário
aprovou hoje. Perguntar se ele quer que esse também seja removido.

**Como rodar de novo**: `npx prisma db seed` dentro de `apps/api` (não usar `npx tsx prisma/seed.ts` direto — sem
o carregamento de `.env` do Prisma CLI, a conexão com o Postgres falha). O script é idempotente (upsert por id
fixo), então rodar de novo não duplica nada.

## Refinamento de Integração: papel da dependência + vínculo com Funcionalidade

Discussão com o usuário sobre "tipos de integração entre produtos" (ele deu exemplos: fornecer informação, enviar
informação, sincronizar) levou a duas mudanças de modelagem em `Integracao`, ambas implementadas:

1. **`papelDependencia`** — campo novo, lista fechada (`String` simples validada via `IsIn`, mesma convenção de
   sempre): Consulta / Notificação / Publicação-Assinatura / Delegação / Sincronização. Ortogonal aos campos que
   já existiam: `direção` diz o sentido do dado, `tipo` diz o mecanismo técnico, `papelDependencia` diz *por que*
   a integração existe.
2. **`funcionalidades` (M2M)** — Integração agora pode se vincular a uma ou mais Funcionalidades específicas do
   mesmo produto (mesmo padrão M2M + `assertFuncionalidadesBelongToProduto` já usado em Jornada/Regra), em vez de
   só ficar no nível de Produto. Resolve o problema de "não dá para saber qual funcionalidade exatamente depende
   de X" que só a ligação transitiva Funcionalidade→Produto→Integração não respondia.

Back-end: `serialize()` no `IntegracoesService` agora expõe `funcionalidadeIds` (mesmo padrão de Jornada/Regra);
`findAllGlobal()` passou a incluir `papelDependencia` e as funcionalidades (com nome) para o mapa visual.
Validado via curl (create com `funcionalidadeIds`+`papelDependencia`, funcionalidade de outro produto → 400).

Front-end: `integracao.config.ts` ganhou os dois campos novos no formulário/detalhe; `IntegracoesTabPanel`/
`IntegracaoDetailPage` passaram a buscar as Funcionalidades do produto como `extraOptions`.

**Mapa de Integrações** (a pedido explícito do usuário — "mostrar isso com mais detalhes" no grafo):
- Cada linha do diagrama agora tem um rótulo textual do papel da dependência sobre a própria linha (ex.
  "consulta", "publica/assina"), além da cor por criticidade e seta por direção que já existiam.
- Clicar numa linha não navega mais direto — abre um painel de detalhe abaixo do diagrama com todos os campos
  (direção/papel/tipo/modo/criticidade) e a lista de Funcionalidades dependentes como chips, com um botão para
  abrir a integração completa se o usuário quiser.
- A lista "Integrações sem produto relacionado" também ganhou papel + contagem de funcionalidades na linha.

**20 Integrações do seed** foram todas anotadas com `papelDependencia` e, na maioria, `funcionalidadeIds` reais
(ex. "Consulta Serasa" → Consulta, vinculada à funcionalidade "Consulta Serasa" do Cadastro Digital). Isso exigiu
um backfill único fora do fluxo normal de upsert (as linhas já existiam de antes desses campos existirem, então
o `update: {}` do upsert não as tocaria) — rodado uma vez e depois removido do script, então o comportamento
padrão do seed (nunca sobrescrever edições feitas pela UI) continua intacto para o futuro.

## Massa de dados adicional: densificar as vinculações de Integração

O usuário pediu para usar todos os dados já existentes no banco para preencher bem as vinculações novas
(`papelDependencia` + `funcionalidades`). Auditoria das 20 Integrações + 37 Funcionalidades encontrou:

- 2 Integrações que já existiam sem nenhuma Funcionalidade vinculada ("Sincroniza Épicos do Jira" → agora ligada
  a "Cadastrar Projeto"/"Editar Histórico de Projeto"; "Envia Dados para Score de Crédito" → ligada a "Fila de
  Aprovação Manual").
- Várias Funcionalidades plausivelmente dependentes de sistema externo mas sem nenhuma Integração: OCR de
  documento, verificação facial e armazenamento de documento (Cadastro Digital), resposta do copiloto via LLM,
  classificação de texto/NLP do Copiloto Comercial, busca de documento assinado e envio de e-mail (Portal do
  Cliente). Criadas 7 Integrações novas para cobrir esses casos.

Total de Integrações: 20 → **27**. Todas as 27 agora têm ao menos uma Funcionalidade vinculada — conferido via
`GET /api/integracoes` filtrando por `funcionalidades.length === 0` (retornou vazio). Funcionalidades que
continuam sem nenhuma Integração (ex. exceções cadastrais, ajuste de parâmetros do modelo, bloqueio manual de
limite) foram deixadas assim de propósito — são ações internas/de governança sem dependência externa real, não
uma lacuna.

Mesma ressalva de antes: 2 das Integrações já existiam de antes desses campos existirem, então precisou de um
backfill único (fora do upsert normal) — aplicado e removido do script depois, preservando a idempotência padrão
para o futuro.

## Redesign do Mapa de Integrações (Fase 1 de um protótipo maior do usuário)

O usuário trouxe um protótipo próprio de dashboard bem mais rico (cards de produto com foto/stats/time
responsável, "Maturidade da base", "Base pronta para agents", tabela de integrações, resumo de impacto). Como
"Maturidade" é o Epic 13 (não construído, precisa de fórmula definida) e "Base pronta para agents" é o assunto de
AGENTS explicitamente adiado desde o início do projeto, combinamos atacar só a Fase 1 agora: o mapa de
relacionamentos redesenhado + tabela rica + resumo de impacto, com o que já existe na base.

**Decisão de design registrada**: em vez de desenhar linhas conectando os cards (como no protótipo original), as
conexões aparecem como uma lista de badges dentro de cada card ("→ Produto X · papel"). Desenhar linhas exatas
entre cards de grid é arriscado de acertar sem inspeção visual ao vivo (nem essa sessão nem o usuário estavam
testando no navegador em tempo real); o badge transmite a mesma informação com menos risco de ficar ilegível.

**Campo novo**: `dadosTrafegados` (texto livre, ex. "CPF/CNPJ, restritivos, score externo") — alimenta a coluna
"Dados" da tabela. Populado nas 27 Integrações existentes (mesmo backfill único de sempre, removido do script
depois).

**Endpoints estendidos** (sem endpoint novo, só mais campos nos que já existiam):
- `GET /produtos` (global) — passou a incluir `timeResponsavel` com `nome` + até 5 `pessoas` (para o avatar
  stack do card).
- `GET /integracoes` (global) — passou a incluir `dadosTrafegados`, `updatedAt`, `timeProprietario`.

**Página nova** (`IntegracoesMapaPage.tsx`, mesma rota `/integracoes`): resumo de impacto (4 stat tiles), grid de
cards por Produto (status, contagem de integrações por tipo, time responsável com avatar stack de iniciais,
lista de conexões), tabela completa de Integrações com filtro por tipo. Só mostra Produtos que participam de
pelo menos 1 Integração (evita grid vazio poluindo a tela).

## Epic 13 — Maturidade (dois indicadores separados, por decisão explícita do usuário)

O usuário trouxe o contexto de negócio que motiva todo o Nexus 2.0: hoje regras de negócio vivem só na cabeça
dos devs, times trabalham isolados, e uma mudança pode quebrar silenciosamente outro produto sem ninguém saber
até o bug explodir em produção. O Nexus é a base para futuros AGENTS de IA que vão ler uma task, cruzar com as
regras/funcionalidades/integrações documentadas, e avisar proativamente o impacto de uma mudança antes dela ser
feita. Isso está registrado em detalhe na memória entre sessões
(`nexus2_visao_agents.md`) porque deve orientar toda decisão de modelagem futura.

Nessa conversa, o usuário propôs medir "maturidade" pelo nível de bugs em produção — identifiquei que isso é um
conceito diferente do que "Base pronta para agents" precisa (completude da documentação, não qualidade em
produção), e o usuário concordou em tratar como **dois indicadores separados**:

### 1. Maturidade de Documentação (alimenta o agent)
Calculada sob demanda (não armazenada), por Produto, via `GET /projetos/:projetoId/produtos/:id/maturidade`.
7 categorias, cada uma 0-100%, média simples = maturidade geral:
- **Perfil do Produto**: % de 7 campos-chave preenchidos (descrição, objetivo, problema que resolve, usuários
  principais, área de negócio, responsável principal, países).
- **Público-alvo**: tem pelo menos 1 cadastrado? (binário)
- **Módulos → Funcionalidades**: % de Módulos com pelo menos 1 Funcionalidade vinculada.
- **Regras**: % de Funcionalidades com pelo menos 1 Regra vinculada — a categoria mais importante pro caso de
  uso do agent, é literalmente a regra que hoje só existe na cabeça do dev virando dado real.
- **Jornadas**: tem pelo menos 1 cadastrada? (binário)
- **Integrações**: tem pelo menos 1 mapeada (como dono ou relacionado)? (binário)
- **Responsáveis**: Produto tem Time Responsável definido? (binário)

"Documentos" ficou de fora por enquanto (Epic 12 ainda não existe).

### 2. Estabilidade em Produção (indicador separado, manual)
Campos novos em Produto: `estabilidadeStatus` (Em Desenvolvimento / Em Evolução / Estável) e
`estabilidadeObservacao` (texto livre) — atualizados manualmente pelo PO, sem integração com bug tracker por
enquanto (não existe essa fonte de dado no Nexus hoje; seria uma Integração de verdade no futuro).

### Frontend
Nova aba "Maturidade" no Detalhe de Produto: anel de progresso com o percentual geral + rótulo qualitativo
(Avançado/Em Progresso/Inicial), barra por categoria, e o status de Estabilidade em Produção com a observação do
PO. Validado com dados reais variados (Cadastro Digital 91% geral vs. Sincronizador 88%, cálculo de "Regras"
conferido manualmente — 33% para o Sincronizador bate com 1 de suas 3 funcionalidades tendo regra vinculada).

`tsc --noEmit` (api) e `npm run build` (web) limpos.

## Pendências que continuam em aberto (não tratadas hoje, por escolha do usuário)

- Bug "não está dando para cadastrar produtos" — ainda sem diagnóstico, aguardando print/descrição do usuário.
- Confirmação no navegador dos dois fixes de Pessoas do dia 06/08 (dropdown "Time" e validação do campo "Nome").

## Redesign da tela de Login

O usuário trouxe um protótipo de terceiro (tela "Nexo" com painel escuro à esquerda) e pediu para replicar o
padrão de layout com a identidade visual do Nexus (não a da marca do protótipo). Reescrito `LoginPage.tsx`:
painel escuro à esquerda (`HeroPanel`) com headline + parágrafo + `GrafoConceitos` (SVG decorativo: 4 conceitos —
Necessidades/Conhecimento/Impacto/Decisões — ligados a um hub central, ilustrando a proposta do produto, não um
grafo de dados real) e formulário de login à direita, sem alterar a lógica de autenticação. Por decisão explícita
do usuário, ficaram de fora por enquanto: "manter conectado", "esqueci senha" e qualquer botão de SSO/Okta (não
existe essa integração hoje — não fabricar).

Depois de ver a tela renderizada, o usuário reportou CSS ruim no painel escuro (parágrafo e área do gráfico).
Causa raiz: `justify-content: space-between` no container flex de 3 níveis (logo/conteúdo/rodapé) espalhava
espaços vazios grandes em telas altas. Corrigido tornando o bloco de conteúdo `flex:1` com
`justifyContent:'center'` interno (se autocentraliza), reduzindo also os pontos decorativos do grafo de 12 para 4
(1 por linha, no meio) para tirar poluição visual, e ajustando opacidade/largura do parágrafo. `npm run build`
limpo nas duas rodadas.

## Home (pós-login) redesenhada a partir de protótipo do usuário

O usuário trouxe um terceiro protótipo (dashboard "Olá, Maria Silva!" com cards de estatística, atividade
recente, acessos rápidos, listas recentes e "Minhas tarefas") e pediu para aplicar exatamente esse layout na
Home do Nexus (rota `/`), com a identidade visual própria. Antes de implementar, separei o que é dado real do que
seria inventado (mesmo critério já usado no Mapa de Integrações e no Login) e perguntei ao usuário:

- **Barra de busca / sino de notificação / "Personalizar dashboard"** do protótipo não têm nada por trás no Nexus
  hoje (não existe motor de busca, sistema de notificação nem preferências salvas de usuário) — usuário escolheu
  **tirar da tela por agora** em vez de deixar botões decorativos sem função. (Nota: o Topbar do shell já tem um
  sino de notificação pré-existente com um aviso fixo de boas-vindas — isso não faz parte desta tela e não foi
  alterado.)
- **"Minhas tarefas"** (com prioridade/prazo) não tem nenhum modelo de dado equivalente no Nexus — não existe
  conceito de tarefa/atribuição em lugar nenhum do produto. Substituído por **"Pendências de Documentação"**,
  dado 100% real gerado a partir dos mesmos critérios do cálculo de Maturidade (ver Epic 13 acima).

### Backend novo

- **Labels de histórico enriquecidos com o nome da entidade** — as 10 services que chamam
  `HistoryService.record()` (Projeto/Time/Pessoa/Produto/PublicoAlvo/Modulo/Funcionalidade/Jornada/Regra/
  Integracao) passaram a incluir o nome do registro no label (ex. `Registro criado: "Autenticação"` em vez de só
  `Registro criado`). Sem isso o feed global de atividade ficaria ilegível (só diria "Módulo — Registro editado",
  sem dizer qual módulo). Entradas de histórico já existentes não são retroativamente reescritas (o label é
  gravado no momento do evento).
- `HistoryService.listGlobal(limit)` — feed cross-entidade, mais recentes primeiro, com o nome do autor via
  `include: { actor: { select: { nome: true } } }`.
- **Módulo novo `apps/api/src/dashboard/*`** (`DashboardController`/`DashboardService`, cross-projeto, cada rota
  usada por um bloco da Home):
  - `GET /dashboard/resumo` — contagens ativos/inativos de Projeto/Time/Pessoa/Produto (queries `count()`
    diretas, sem endpoint global novo para Times/Pessoas — mais simples que expor listas completas só para
    contar).
  - `GET /dashboard/atividade-recente?limit=` → `HistoryService.listGlobal`.
  - `GET /dashboard/pendencias?limit=` — mesma lógica de gaps do `calcularMaturidade` (produto sem Time
    responsável/Público-alvo/Jornada, módulo sem Funcionalidade, funcionalidade sem Regra), em formato de lista
    acionável com prioridade (Alta = falta algo no nível do Produto; Média = falta algo no nível de
    Módulo/Funcionalidade), ordenada por prioridade.
- `GET /produtos` (global) ganhou `createdAt` no select, para a Home poder ordenar "Produtos recentes" por
  recência (o endpoint em si continua ordenando por nome — a ordenação por recência é feita no front).
- Validado via PowerShell/curl: os 3 endpoints do dashboard retornando dados reais da base seed, e um
  toggle-status de ida e volta confirmando que o novo formato de label aparece corretamente no feed
  (`Status alterado para "Inativo": "Copiloto de Atendimento"`). `npx tsc --noEmit` limpo.

### Frontend

`apps/web/src/entities/dashboard/dashboard.api.ts` (hooks novos: `useDashboardResumo`, `useAtividadeRecente`,
`usePendenciasDocumentacao`). `HomePage.tsx` reescrita: cabeçalho de saudação (nome real de quem logou), 4 cards
de estatística (Projetos/Times/Pessoas/Produtos com contagem Ativos/Inativos), "Atividade recente" (feed real) +
"Acessos rápidos" (só destinos que existem de verdade: Novo Projeto, Mapa de Integrações, Visão Geral — o app não
tem páginas globais de Times/Pessoas/Produtos fora do contexto de um Projeto específico, então não dá pra
oferecer "criar" com 1 clique pra essas três), e uma linha de 3 colunas com Projetos recentes / Produtos
recentes / Pendências de Documentação. `npm run build` limpo.

## Pendências que continuam em aberto

- Bug "não está dando para cadastrar produtos" — ainda sem diagnóstico, aguardando print/descrição do usuário.
- Confirmação no navegador dos dois fixes de Pessoas do dia 06/08 (dropdown "Time" e validação do campo "Nome").
- Confirmação visual do usuário sobre os ajustes de CSS do Login e sobre a Home nova (nenhuma automação de
  navegador nesta sessão — depende do usuário testar e reportar).

## Redesign de layout da Home (protótipo de terceiro, só como referência de UX)

O usuário trouxe outro protótipo (dashboard com sidebar preta e destaques amarelos) pedindo para copiar
**estrutura/proporção/densidade**, não a paleta — regra explícita: manter 100% a identidade visual do Nexus
(branco, cinzas, azul `#0551c2` via tokens). Nenhuma cor nova foi criada; tudo usa `--shadow-xs`,
`--color-border`, `--dbc-blue-*` etc. já existentes em `colors_and_type.css`.

- **`global.css`**: adicionadas as regras base (modo claro) para `.dbc-nav-item:hover` e
  `.dbc-sidebar-section-label` — essas classes já eram usadas por `dark-overrides.css` mas nunca tinham uma regra
  base fora do modo escuro; completar isso não é algo específico da Home. Também `.dbc-topbar-breadcrumb`
  (some abaixo de 700px pra abrir espaço pra busca).
- **`design-system/Icon/Icon.tsx`**: dois ícones novos (`home`, `chart`) — a Sidebar usava `box` tanto pra Home
  quanto pra Projetos (duplicado) e `search` pra Visão Geral (sem sentido). Ícones adicionados servem a Sidebar
  inteira, não só a Home.
- **`shell/Sidebar.tsx`**: usa os ícones novos, e ganhou labels de seção discretas ("Navegação"/"Preferências")
  usando a classe que já existia. Fundo continua branco, item ativo continua com o tint azul (`--dbc-blue-1`) que
  já existia — nada de sidebar preta.
- **`shell/Topbar.tsx`**: campo de busca (`SearchInput`, componente do design system que já existia mas nunca
  tinha sido usado em lugar nenhum) — pedi confirmação ao usuário se deveria ser real ou só estrutural, e ele
  escolheu **busca real, só no front**: filtra Projetos (`projetoHooks`) e Produtos (`useAllProdutos`) já
  carregados por hooks existentes, mostra até 8 resultados num dropdown, clique navega pro registro real. Sem
  endpoint novo, sem alterar backend.
- **`pages/HomePage.tsx`**: sombra sutil (`--shadow-xs`) nos cards; "Acessos rápidos" virou grid 2 colunas de
  mini-cards com borda (em vez de lista de botões); "Atividade recente" com o tempo relativo alinhado à direita
  (antes estava embutido no texto secundário); as 4 listas (atividade/projetos/produtos/pendências) ganharam um
  componente `ListRow` compartilhado com separador entre linhas + hover. Adicionado `<style>` com breakpoints
  responsivos (900px/1200px/700px/420px) pros 3 grids da página — antes eles eram `display:grid` fixo sem
  nenhuma regra de colapso em tablet/mobile, o que teria causado overflow horizontal em telas estreitas.
  Nenhum hook/dado foi alterado (`projetoHooks.useList`, `useAllProdutos`, `useDashboardResumo`,
  `useAtividadeRecente`, `usePendenciasDocumentacao` continuam exatamente como estavam).
- `npm run build` (`tsc -b && vite build`) limpo depois de todas as mudanças.

## Segundo redesign da tela de Login (painel institucional claro, card de autenticação)

Novo protótipo de terceiro (tela "Nexo" com painel preto+amarelo e card branco de login) trazido só como
referência de composição/proporção — mesma regra de sempre: copiar estrutura, não identidade visual. Reescrito
`LoginPage.tsx` inteiro (lógica de auth 100% preservada: `useMutation`, `useAuthStore`, redirect, tratamento de
erro Axios, show/hide senha, Enter pra logar, loading):

- **Painel institucional deixou de ser escuro** (`#060f1e`) e virou claro (`linear-gradient` suave de branco/azul
  bem claro em modo claro, `var(--color-bg-subtle)` em modo escuro) — headline/parágrafo/rodapé "Double Check"
  agora usam tokens de texto (`--color-text`, `--color-text-secondary`, `--color-text-tertiary`) que já
  adaptam sozinhos ao dark mode, e o destaque da headline trocou de dourado (`#f5c344`) pro azul primário
  (`--dbc-blue-6`).
- **`GrafoConceitos` recolorido** pro fundo claro: nós e hub usam tints de azul (`--dbc-blue-1/2/4/6`) e cinza de
  borda (`--color-border`) em vez do dourado/branco pensados pro fundo escuro removido. Mesmo conceito (4 nós:
  Necessidades/Conhecimento/Impacto/Decisões), mesma estrutura, só cor.
- **Card de autenticação de verdade**: antes o formulário ficava solto num fundo cinza; agora fica dentro de um
  card branco (`var(--color-bg-container)`, borda, `border-radius:16px`, `box-shadow: var(--shadow-sm)`)
  centralizado — usa só tokens já existentes, nenhum valor novo inventado.
- **Campo de senha passou a reusar o componente `Input`** do design system (antes era uma `<div>` com borda
  própria construída à mão) — o botão de olho virou um botão posicionado em cima do `Input` via
  `position:absolute`, em vez de fazer parte de uma caixa customizada. Resultado: e-mail e senha agora têm
  exatamente a mesma altura/borda/foco/erro, e não precisei tocar no componente `Input` compartilhado.
- **Responsividade em 3 níveis** (antes só escondia o painel inteiro abaixo de 880px):
  - Desktop (>1024px): dois painéis lado a lado, ~46%/54%.
  - Tablet (641–1024px): painel institucional encolhe pra ~36% da largura e o grafo decorativo some (prioriza o
    formulário), mas headline/parágrafo continuam visíveis.
  - Mobile (≤640px): painel institucional vira uma faixa compacta no topo (`MobileHeader`, logo + 1 frase) em vez
    de simplesmente desaparecer; formulário empilha abaixo, largura total, sem overflow.
- Nada do que não existe de verdade foi adicionado: sem SSO, sem "manter conectado"/"esqueci senha", sem central
  de ajuda, sem lista de "serviços corporativos" — o card ficou verticalmente centralizado então não sobrou
  buraco visual sem esses blocos.
- `npm run build` (`tsc -b && vite build`) e `npm run lint` (oxlint) limpos — nenhum warning novo introduzido
  (os warnings existentes no lint são todos de outros arquivos, pré-existentes).

## Ajuste de fidelidade da Home (segunda rodada, feedback pontual sobre o redesign anterior)

Usuário revisou o redesign da Home (visto na íntegra no navegador) e trouxe uma lista de 12 desvios pontuais em
relação ao mock de referência — pediu **ajuste de composição, não uma nova reformulação de identidade**
("manter sidebar clara, fundo claro, azul do DS, cards brancos, APIs/hooks/dados/rotas, dark mode, Pendências de
Documentação — não usar preto/amarelo"). Antes de mexer em qualquer texto, perguntei sobre um ponto contraditório
do próprio feedback (pedia pra padronizar o nome visível pra "Nexo", que é justamente a marca fictícia do mock
que estávamos evitando copiar) — usuário confirmou manter "Nexus" (nome usado em toda a base). Mudanças feitas,
todas só em `apps/web/src/pages/HomePage.tsx` + 2 arquivos do shell:

1. **Cabeçalho "Olá, ..." sem card** — antes era `<section className="dbc-card">`, virou um `<div>` solto direto
   sobre o fundo da página (sem background/border/shadow), igual ao mock.
2. **`StatCard` reformulado**: ícone (44×44) numa coluna à esquerda, label/total/ativos-inativos empilhados numa
   coluna à direita — antes era ícone+label numa linha e total/status abaixo, ocupando a largura toda. Padding
   reduzido (`16px 18px`) pra ficar mais compacto verticalmente.
3. **Grid do meio corrigido pra 50/50** (`repeat(2, minmax(0,1fr))`) — antes era `1.6fr/1fr`, o que fazia
   Atividade Recente dominar 62% da linha e forçava Acessos Rápidos a esticar pra acompanhar a altura, sobrando
   um vazio enorme.
4. **`useAtividadeRecente(8)` → `useAtividadeRecente(5)`** — 8 itens deixava o card alto demais e empurrava a
   terceira linha (Projetos/Produtos/Pendências) pra fora da primeira viewport.
5. **Atividade Recente com avatar por `entityType`** em vez do pontinho verde genérico: `ENTITY_TYPE_META` ganhou
   `bg`+`icone` por tipo (Projeto=pasta, Time=pessoas, Pessoa=usuário, Produto/Módulo=box, Público-alvo=olho,
   Funcionalidade=check, Jornada=seta, Regra=edit, Integração=network — todos reaproveitando ícones que já
   existiam no `Icon` compartilhado ou ícones locais já criados na rodada anterior, nenhum ícone novo entrou no
   design system). Layout de cada linha: ícone circular + descrição/tempo na mesma linha + "tipo · por autor"
   embaixo.
6. **Acessos Rápidos**: removido o hack `gridColumn:'1 / -1'` que esticava o 3º item pra preencher a linha.
   Continuam só 3 atalhos reais (Novo Projeto/Mapa de Integrações/Visão Geral) — **reconfirmei que não existe
   rota real pra "Novo Produto/Nova Pessoa/Novo Time/Módulos" isolados**: essas entidades só têm criação aninhada
   dentro do Detalhe de um Projeto específico (aba própria), não existe uma página global `/produtos`,
   `/pessoas`, `/times` ou `/modulos`. Por instrução explícita do usuário ("não inventar rota"), não criei
   nenhuma dessas páginas nem linkei pra um Projeto arbitrário só pra preencher a grade.
7. **Ícones nos headers dos 5 cards** (relógio/raio/pasta/box/prancheta — todos ícones locais novos no arquivo,
   não no design system) e **"Ver todos" só em Projetos recentes** (→ `/projetos`, rota real) — Produtos recentes
   e Atividade recente não ganharam "Ver todos" porque não existe página de listagem global pra nenhum dos dois
   (mesma lógica do item 6).
8. **Breadcrumb "Home" escondido só na Home** (`shell/AppShell.tsx`: removida a entrada `['/', 'Home']` de
   `ROUTE_LABELS`, as outras rotas não foram tocadas) + `shell/Topbar.tsx` só renderiza o `<div>` do breadcrumb
   quando ele não é vazio (evita reservar espaço/gap à toa), deixando a busca começar mais à esquerda.
- `npm run build` e `npm run lint` limpos, nenhum warning novo.

## Ajuste de escala/proporção do Login (segunda rodada, não era mais problema de cor)

Usuário confirmou que a paleta do Login estava certa, mas a tela tinha espaço vazio demais — sensação de "layout
pensado pra 1366px exibido numa tela enorme". Pediu de novo pra padronizar o nome visível pra "Nexo" (mesmo item
#9 da rodada anterior); mantive "Nexus" sem perguntar de novo, já que isso tinha sido explicitamente decidido e
confirmado na rodada anterior (o "Nexo" é a marca fictícia do mock, não o nome real do produto). Só
`apps/web/src/auth/LoginPage.tsx` foi alterado, só escala/proporção — nenhuma cor nova, nenhuma lógica de auth
tocada:

- **Card de login**: `max-width` 400px → 520px (460px em tablet, 100% em mobile), padding 40px → 48px.
- **Inputs e botão**: `Input` ganhou `style={{height:44,fontSize:15}}` em cada instância (sem tocar no componente
  compartilhado — a prop `style` já é aceita e sobrescreve só naquele uso); o botão "Entrar" passou a usar
  `size="lg"` (já existia no `Button`, dá exatamente 44px) em vez de inventar um novo componente.
- **Cabeçalho do card**: "Entrar no Nexus" 22px → 27px.
- **Painel institucional**: `minWidth` 380→420, largura interna do conteúdo 440→560px, parágrafo 380→480px,
  padding 48px/56px → 56px/64px.
- **Headline**: 34px → 44px desktop (com override pra 30px em tablet via `.nexus-login-hero h1` no CSS
  responsivo, já que o painel encolhe lá).
- **`GrafoConceitos`**: `maxWidth` do SVG 340px → 460px em desktop. Só a escala do contêiner mudou (mesmo
  viewBox/coordenadas) — sem distorcer nem redesenhar os nós.
- **Grafo não some mais tão cedo**: antes tinha `display:none` abaixo de 1024px; agora só encolhe
  (`.nexus-login-graph-wrap svg { max-width: 300px }` em tablet) e continua visível até o painel inteiro sumir no
  breakpoint mobile (≤640px, onde o `MobileHeader` assume).
- **Fundo do lado direito**: de `var(--color-bg-layout)` (cinza chapado) pra um gradiente quase imperceptível
  (`#fbfcfe → #f4f6fa`) no modo claro — só tokens/valores muito próximos dos já usados, mantém modo escuro como
  estava.
- **Rodapé "Double Check"**: ganhou `border-top` + tratamento tipográfico (uppercase, letter-spacing) pra parecer
  proposital em vez de um texto perdido no canto — nenhum conteúdo novo inventado (nem "©", nem tagline).
- Nada de SSO/recuperação de senha/central de ajuda foi adicionado — ganho veio só de escala/proporção, como
  pedido.
- `npm run build` e `npm run lint` limpos, nenhum warning novo.

## Consolidação de design do fluxo de Setup — Fase 1 (primitivas, sem mudança visual ainda)

O usuário trouxe ~15 mockups de terceiro (fluxo de Setup completo: Projetos/Times/Pessoas/Produtos/Detalhe-
Novo-Editar Produto/Públicos/Regras) pedindo pra consolidar o "CSS diferente em cada tela" que existe hoje. Modo
de planejamento foi usado (2 sub-agentes de investigação + 2 de design, ver
`C:\Users\User\.claude\plans\synchronous-humming-conway.md`) — achado principal: quase todas as ~20 páginas do
fluxo são wrappers finos (17-42 linhas) em cima de só 2 componentes genéricos
(`entities/crud/EntityListPage.tsx` e `EntityDetailPage.tsx`), então consolidar é um esforço concentrado em ~10
arquivos centrais + ~16 primitivas novas, não uma migração página-por-página.

Decisões confirmadas com o usuário antes de implementar: **SetupStepper com só 4 etapas reais** (Projeto→Time→
Pessoas→Produtos — Regras/Documentos/Agentes ficam de fora, Regras é aba de um Produto específico e
Documentos/Agentes não existem), **visível só em telas com um Projeto no contexto**, e **sem git** (projeto não
tem `.git` em lugar nenhum; seguir sem rede de segurança, compensando com `build`+`lint` a cada etapa).

**Fase 1 concluída** (só aditiva — nada consome essas primitivas ainda, zero mudança visual em qualquer tela):
- `design-system/tokens.ts` ganhou `space`/`shadow`/`text`/`layout` (radius também revisado: `pill` 20→999, sem
  consumidores existentes) — antes só tinha `color`/`font`.
- `design-system/hooks/useContainerWidth.ts` (extraído do padrão ResizeObserver que já existia em
  `EntityListPage.tsx`).
- Novas primitivas de UI: `Card/SectionCard`+`SectionHeader`, `Tabs/Tabs` (variantes underline/pill),
  `Grid/FormGrid`+`FormGridItem` (colunas fixas + span, não `auto-fill`), `Grid/PageGrid`+`RightRail`,
  `Actions/PageActions`, `DataTable/DataTableCard`, `Metric/MetricCard`+`ProgressRow`, `Badge/ChipList`+
  `StatusBadge` (versões puras de `EntityChipList`/`EntityStatusBadge`), `Avatar/IconTile`, `Stepper/Stepper`.
- `shell/Avatar.tsx` foi movido pra `design-system/Avatar/Avatar.tsx` (ganhou suporte a iniciais) — único import
  existente (`Topbar.tsx`) atualizado.
- `Pagination.tsx` ganhou windowing (1 … 4 5 [6] 7 8 … 50) — antes renderizava um botão por página, estourava a
  largura com muitas páginas.
- `EntityConfig.detail.shell.fixedHeaderFields` (declarado desde sempre, nunca lido) agora tem um consumidor
  real: `entities/crud/EntitySummaryCard.tsx`.
- `createEntityHooks.ts`'s `useList` ganhou um 3º parâmetro opcional `{ enabled }` (default `true`, não quebra
  nenhum dos ~12 call sites existentes) — necessário pro `SetupStepper` não disparar `useList` de entidades
  escopadas sem `scopeId` (o que lançaria erro dentro do `queryFn`).
- Ícones novos em `Icon.tsx`: `folder`/`users`/`user`/`clock`/`zap`/`clipboardCheck`.
- `shell/setup/SetupPage.tsx`+`SetupPageHeader.tsx`+`SetupStepper.tsx` (novo diretório) — o Stepper já está
  montado em `AppShell.tsx` entre a Topbar e o container de scroll, com os 4 passos reais e dado real (contagem
  via `meta.total`, sem inventar progresso).
- `npm run build` e `npm run lint` limpos — só os warnings de fast-refresh já pré-existentes no projeto (mistura
  de export de componente + helper no mesmo arquivo, convenção já usada em `shared.tsx`/`Badge.tsx`).

Usuário confirmou seguir pra Fase 2 após o checkpoint.

## Consolidação de design do fluxo de Setup — Fase 2 (migração, muda a aparência de ~20 páginas)

Migração em ordem de raio de impacto crescente, `build`+`lint` limpos depois de cada arquivo (sem git, essa foi a
rede de segurança combinada com o usuário):

1. **`VisaoGeralPage.tsx`** (canário) — header vira `SetupPageHeader`, os 4 cards viram `SectionCard`, as duas
   listas de progresso usam o `ProgressRow` compartilhado, o card de contagem de Projetos vira `MetricCard`, e a
   grade 2-col/4-col vira `FormGrid`. Botão "Voltar ao início" (que ficava sozinho no rodapé, `variant="default"`)
   virou o link discreto "Voltar para Home" no topo, dentro do `SetupPageHeader` — mesmo padrão de todas as
   outras páginas agora.
2. **`HomePage.tsx`** — removidos `useCardStyle`/`CardHeader`/`StatCard`/6 SVGs locais (folder/users/user/clock/
   zap/clipboardCheck, agora ícones do design system); `StatCard`→`MetricCard`; avatares/ícones dos cards viram
   `IconTile`; iniciais usam `getInitials` importado; a grade de 2/3 colunas com `<style>`+media queries some,
   vira `FormGrid` respondendo à largura do contêiner.
3. **`EntityDetailPage.tsx`** (afeta as 11 páginas de detalhe do fluxo de uma vez) — `TabStrip` local vira `Tabs`
   (variant underline); `FieldGrid` (que usava `auto-fill minmax(220px,1fr)` e **ignorava `colSpan` em
   silêncio**) vira `FormGrid`, que agora respeita `colSpan:2` de verdade — campos longos do Produto
   (descrição/objetivo/problema que resolve) deixam de ficar espremidos numa coluna de 220px na visualização.
   **Bug real corrigido**: Produto tinha DUAS abas chamadas "Visão Geral" (uma sintética do componente genérico +
   uma própria do `produto.config.ts`) — corrigido detectando o caso por label+kind exatos (não por heurística
   ampla, pra não esconder o overview completo de outras entidades como Projeto, cujo primeiro tab próprio é só
   um subconjunto de campos). Botão "Voltar" trocou de link azul sempre visível pro `BackButton` do design
   system (existia, nunca tinha sido usado — cinza, azul só no hover). Ganhou prop opcional `rightRail` (sem uso
   ainda). `activeTab` agora reseta ao trocar de registro (bug de tab travada corrigido de brinde).
4. **`EntityListPage.tsx`** (afeta a lista de Projetos + os 9 `*TabPanel.tsx` embutidos de uma vez, já que
   nenhum deles tem estilo próprio) — tabela vira `DataTableCard` (com `RowActionButton` canônico substituindo
   os SVGs `EyeIcon`/`EditIcon` locais, que eram cópia idêntica dos ícones do design system); `Pagination` ganhou
   paginação com reticências (1 … 4 5 [6] 7 8 … 50 — antes renderizava um botão por página, estourava a largura
   com muitas páginas); card de filtros vira `SectionCard` colapsável.
5. **`EntityFormModal.tsx` + `EntityFormFields.tsx`** — grade 2 colunas fixa vira `FormGrid`/`FORM_GRID_EDIT`
   (mesmo comportamento, `colSpan` continua funcionando); pills de badge/multiselect passam a usar
   `tokens.radius.pill`.
6. **Cauda bespoke**: `VersoesTabPanel.tsx` (grade de comparação vira `FormGrid`, padding de célula vira o token
   `compact`, removida uma condicional morta que sempre retornava o mesmo valor); `MaturidadeTabPanel.tsx`
   (`BarraCategoria` local vira `ProgressRow` compartilhado); `IntegracoesMapaPage.tsx` (cards de produto viram
   `SectionCard`, tiles de estatística viram `MetricCard`, filtro de tipo vira `Tabs variant="pill"`, tabela vira
   `DataTableCard` com densidade `compact`, e ganhou um `EmptyState` pra quando um filtro não retorna nada — gap
   que não existia antes).

`npm run build` e `npm run lint` limpos depois de **cada** uma das 6 etapas — nenhum erro novo, nenhum warning
novo em nenhuma etapa.

## Próximo passo

Confirmação visual do usuário no navegador (nenhuma automação nesta sessão) — checklist de risco no plano
(`C:\Users\User\.claude\plans\synchronous-humming-conway.md`, seção "Validação"): dark mode em todas as telas do
fluxo, overflow horizontal (tira de 10 abas do Produto em 768px, paginação com muitas páginas), larguras de
CONTÊINER (não viewport, já que várias telas renderizam embutidas numa aba) em 1920/1440/1024/768/mobile com a
Sidebar expandida e recolhida, cliques em linha de tabela (badge/ações não devem navegar), e o formulário de
Produto (5 seções, 15 campos, 8 com `colSpan:2`).

Separadamente, ainda pendente: confirmação visual do usuário sobre os redesigns anteriores desta sessão (Home/
Sidebar/Topbar antes desta consolidação, duas rodadas do Login). E, mais adiante, o Epic 12 (Documentos) —
upload de PDF/DOCX, vínculo com Confluence/Figma, metadados, validação/rejeição de fonte, histórico de versões.
Vai exigir decidir estratégia de armazenamento de arquivo (disco local vs. S3-like) antes de implementar — parar
e perguntar ao usuário, mesmo padrão usado para Jornadas/Regras/Integrações. Considerar também, em algum
momento, voltar em Regras (Epic 10) para adicionar o vínculo com Integrações que ficou de fora por decisão do
usuário.
