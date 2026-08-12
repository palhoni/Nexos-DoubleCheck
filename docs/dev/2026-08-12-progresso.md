# Progresso — 2026-08-12

## Contexto geral

Sessão com dois blocos de trabalho distintos, na ordem em que aconteceram:

1. **Uso do Nexus como produto**: estudo funcional completo de um sistema real de terceiro (LUF — Liga
   Uberabense de Futebol) e cadastro de toda a sua estrutura de conhecimento dentro do Nexus (Projeto → Produto →
   Módulos → Funcionalidades → Regras → Público-alvo → Jornadas → Integrações → Documentos).
2. **Desenvolvimento do próprio Nexus**: um bug de UI encontrado durante o uso acima foi documentado e corrigido,
   e evoluiu para a construção de um recurso novo de produto — um Agent de IA ("Mapeador de Jornadas") que
   automatiza parte do trabalho manual feito no bloco 1.

Ambiente já estava de pé no início da sessão (API NestJS em `:3000`, front Vite em `:5173`, watch mode nos dois).

---

## Bloco 1 — Estudo e cadastro do projeto LUF no Nexus

### Estudo do código-fonte

Sistema real em `C:\xampp\htdocs\luf` — PHP 8.2 puro (sem framework), MySQL/MariaDB, 430 arquivos PHP, 67
migrations, sem cobertura de teste completa. Estudado por **9 agentes em paralelo**, cada um responsável por um
domínio funcional, lendo routes + src + views + migrations + docs relevantes na íntegra:

1. Autenticação, Usuários e Controle de Acesso
2. Clubes, Filiação/Licenciamento e Governança (Atas de Diretoria via IA)
3. Cadastro/Inscrição de Atletas, Aprovação Documental (IA) e Credenciamento
4. Competições, Partidas/Súmula e Portal Público
5. Movimentações e Transferências Institucionais
6. Arbitragem (Escalação, Diretor de Arbitragem, Pré-Jogo, Custeio)
7. Tribunal Desportivo/Disciplinar (denúncia → citação → sessões → julgamento → execução de penas)
8. Documentos, Relatórios, Configurações, Operações e Segurança
9. Contexto transversal (temporadas/categorias, arquitetura geral, roadmap, cobertura de testes)

Os 9 relatórios completos (com citações `arquivo:linha` para cada regra de negócio) foram salvos como Documentos
de Conhecimento no Nexus — ver seção "Cadastro no Nexus" abaixo.

### Cadastro no Nexus

Projeto **"LUF - Liga Uberabense de Futebol"** (`cmsq3da60000090vpph1m8nh2`) → Produto **"Sistema de Competições
LUF"** (`cmsq3da79000290vprzgf7v8x`), cadastrado via scripts Node chamando a API REST do Nexus (login admin +
`POST`/`PATCH` sequenciais), não pela UI:

| Entidade | Quantidade |
|---|---:|
| Módulos | 31 |
| Funcionalidades | 118 |
| Regras de negócio | 169 |
| Público-alvo | 10 |
| Integrações | 13 |
| Documentos de conhecimento (relatórios completos) | 9 |
| Jornadas (número final, após o Bloco 1 e a auditoria) | 11 |

Achados de qualidade do próprio sistema LUF registrados como observações (não são bugs do Nexus, são do LUF):
inconsistência de critério de desempate entre 3 telas de classificação; ausência de instância de recurso no
Tribunal Desportivo; sem rotação de chave de criptografia; nomenclatura de colunas de taxa invertida da semântica
real; sem fluxo de recuperação de senha self-service.

### Vínculo Regra → Funcionalidade

Cadastro inicial das 169 regras só linkou `moduloIds` (não `funcionalidadeIds`), deixando o indicador de
Maturidade "Regras" em 0%. Corrigido revisando as 169 regras uma a uma e vinculando cada uma à(s) Funcionalidade(s)
que ela realmente rege — incluindo alguns vínculos legítimos entre módulos diferentes (ex.: uma regra do módulo
"Pré-Jogo/Mesário" que rege a funcionalidade "Homologar Súmula", do módulo "Partidas e Súmula").

Resultado: **167 de 169 regras** vinculadas a pelo menos uma Funcionalidade. As 2 exceções ficaram deliberadamente
sem vínculo de Funcionalidade — são regras transversais de `RouteAccessPolicy` (controle de acesso por rota) que
não pertencem a nenhuma Funcionalidade específica do módulo de Usuários; mantêm o vínculo com o Módulo.

Maturidade do Produto LUF após o ajuste:

| Categoria | Antes | Depois |
|---|---:|---:|
| Regras | 0% | 74% |
| Geral | — | 78% |

Categorias ainda abaixo de 100%: **Perfil do Produto** (71%) e **Responsáveis** (0%) — não tratadas nesta sessão,
listadas em "Próximos passos".

### Auditoria e expansão de Jornadas

Cadastro inicial trouxe 6 Jornadas (fluxos ponta-a-ponta mais complexos: inscrição de atleta, transferência,
homologação de súmula + disciplinar automático, processo disciplinar completo, regularização de diretoria,
escalação de arbitragem), cobrindo só 32 das 118 Funcionalidades.

Auditoria (script que cruza `funcionalidadeIds` de todas as Jornadas contra todas as Funcionalidades do produto)
encontrou 86 Funcionalidades sem nenhuma Jornada. Proposta apresentada e aprovada pelo usuário antes de executar:

**5 Jornadas novas:**
- Concessão de Acesso e Primeiro Login
- Cadastro de Clube e Ativação do Painel Operacional
- Estruturação de uma Competição, do Cadastro ao Primeiro Jogo
- Torcedor Acompanha a Liga pelo Portal Público
- Renovação Anual de Vínculo do Atleta

**5 Jornadas existentes estendidas** (funcionalidades e etapas que faziam parte da mesma narrativa mas ficaram de
fora do cadastro inicial — ex.: "Minhas Partidas" e "Preparar Partida" entrando na jornada de Súmula, "Painel de
Transferências" na jornada de Transferência).

Resultado: cobertura de **32/118 (27%) → 88/118 (75%)**. As 30 Funcionalidades restantes ficaram **deliberadamente**
fora de qualquer Jornada — são capacidades de suporte sem narrativa própria (configuração, relatórios, auditoria,
busca global, notificações, telas de CRUD simples), consistente com o princípio de não forçar toda Funcionalidade
a pertencer a uma Jornada.

---

## Bloco 2 — Desenvolvimento no próprio Nexus

### BUG-001 — Step "Regras" do Setup Stepper nunca refletia dados reais

**Como foi encontrado**: ao revisar o produto LUF já com 169 regras cadastradas, o step "Regras" do stepper de
Setup (`/projetos/:id`) continuava aparecendo como não concluído.

**Causa raiz**: `apps/web/src/shell/setup/SetupStepper.tsx` — os steps "Time", "Pessoas", "Produtos" e "Documentos"
usam a contagem real de registros como critério de conclusão quando o usuário não está naquela página; o step
"Regras" era o único que dependia **só** da rota atual (`secao === 'documentos' ? 'done' : 'upcoming'`), nunca
verificando se existia alguma Regra cadastrada.

**Documentado em**: [`docs/bugs-encontrados/BUG-001-setup-stepper-regras-sem-dados.md`](../bugs-encontrados/BUG-001-setup-stepper-regras-sem-dados.md)
(descrição completa, passos para reproduzir, evidência técnica, causa raiz, critério de aceite violado, sugestão
de correção com 2 abordagens).

**Correção aplicada** (opção "endpoint agregado", mais consistente com o padrão já usado por Documentos):
- Backend: `RegrasService.resumoPorProjeto(projetoId)` (`apps/api/src/regras/regras.service.ts`) — conta `Regra`
  com `versaoAtual: true` via `produto: { projetoId }`. Exposto por um novo `RegrasResumoController`
  (`apps/api/src/regras/regras.controller.ts`, registrado em `regras.module.ts`) em `GET /regras/resumo?projetoId=...`
  — mesmo padrão de `GET /documentos/resumo`. Retorna 400 sem `projetoId`, 404 para projeto inexistente.
- Frontend: hook `useRegrasResumo(projetoId)` (`apps/web/src/entities/regra/regra.hooks.ts`), consumido em
  `SetupStepper.tsx`. O step "Regras" passou a usar `secao === 'documentos' || (regrasResumo?.total ?? 0) > 0`
  como critério de `done`.

Validado via API (`GET /regras/resumo?projetoId=<id-do-LUF>` → `{"total":169}`) e via `tsc -b` dos dois lados.
Status do bug atualizado para **Corrigido** no próprio arquivo de documentação.

### Novo recurso de produto: Agent "Mapeador de Jornadas"

Motivação: a auditoria/expansão de Jornadas feita manualmente no Bloco 1 (script Node + curadoria humana) é
exatamente o tipo de trabalho que um Agent de IA do próprio Nexus deveria conseguir fazer pela UI, para qualquer
Produto cadastrado — não só para o LUF.

**Persona do agent**: [`​.claude/agents/agent-mapeador-jornadas.md`](../../.claude/agents/agent-mapeador-jornadas.md)
— documenta as pré-condições (Produto precisa já ter Módulos/Funcionalidades e Público-alvo cadastrados — Jornada
nunca inventa Funcionalidade nova), o fluxo obrigatório (auditar cobertura → julgar narrativa vs. capacidade de
suporte → redigir proposta → persistir) e o contrato JSON usado no modo "execução via API do Nexo".

**Decisão de nomenclatura**: não recebeu número de "agentN" da trilha de QA (1→2→4→5→6→7→8→9, todos já reservados
no catálogo, incluindo os ainda "planned"). É um agent de estruturação de conhecimento do Produto, mesmo domínio
do Setup — por isso ficou em um estágio novo, **"Conhecimento"**, com badge número **10** (só identificador visual,
sem implicar ordem de pipeline).

**Arquitetura** (replicando exatamente o padrão já usado pelos agents 1, 2, 4 e 7 — fila em memória +
`AgentExecution` no Postgres + persistência com debounce + `AgentRunnerFactory` para runtime Claude):

- `apps/api/src/agents/dto/start-journey-mapper.dto.ts` *(novo)* — `{ produtoId!, foco? }`.
- `apps/api/src/agents/journey-mapper.service.ts` *(novo)* — `JourneyMapperService`:
  - `start()`: valida produto existe, valida pré-condições (≥1 Funcionalidade, ≥1 Público-alvo) com
    `BadRequestException` explícita antes de criar qualquer execução; cria `AgentExecution`; dispara execução
    assíncrona.
  - `buildContext()`: monta o contexto real do produto (módulos, funcionalidades com nomes das regras vinculadas
    e flag `jaEmJornada`, público-alvo, jornadas já existentes) direto via Prisma.
  - `runModel()`: carrega a persona via `loadAgentDefinition('agent-mapeador-jornadas')`, monta o prompt (persona +
    regras de execução + contexto serializado), chama `AgentRunnerFactory`.
  - `parseProposal()`: parse robusto do JSON de resposta (mesmo utilitário `json-salvage` dos demais agents, com
    fallback para JSON truncado por `max_tokens`).
  - `persistProposal()`: para cada jornada nova/estendida proposta, valida que os ids referenciados pertencem de
    fato ao produto e **reaproveita o `JornadasService` já existente** (`create`/`update`/`addEtapa`) em vez de
    duplicar lógica de Prisma — herda toda a validação e o registro de histórico do CRUD normal. Cada item é
    `try/catch` individual (uma jornada inválida não derruba as demais); etapas maiores que 120 caracteres são
    truncadas defensivamente antes de persistir.
- `apps/api/src/agents/agents.controller.ts` *(alterado)* — 3 rotas novas: `POST agents/mapeador-jornadas/iniciar`,
  `GET .../execucoes`, `GET .../execucoes/:id`.
- `apps/api/src/agents/agents.module.ts` *(alterado)* — registra `JourneyMapperService`, importa `JornadasModule`.
- `apps/api/src/jornadas/jornadas.module.ts` *(alterado)* — passou a `exports: [JornadasService]` para ficar
  reutilizável fora do próprio módulo.
- `apps/api/src/agents/runtime/agent-runner.factory.ts` *(alterado)* — `'agent-mapeador-jornadas': 'text'` no mapa
  `AGENT_RUNTIME` (sem isso, `runners.for(...)` lançaria `InternalServerErrorException`).
- `apps/web/src/entities/agents/journey-mapper.api.ts` *(novo)* — `startJourneyMapper`/`getJourneyMapperExecution`/
  `listJourneyMapperExecutions`, mesmo padrão de `bug-report.api.ts`.
- `apps/web/src/pages/agents/JourneyMapperPage.tsx` *(novo)* — formulário (Projeto → Produto → foco opcional),
  overlay de processamento com polling (mesmo padrão recorrente de `BugReportPage.tsx` e demais páginas de agent —
  não existe hook de polling compartilhado no projeto, é replicado por página de propósito, consistente com o
  código já existente), resumo final (jornadas criadas/estendidas, cobertura antes/depois, itens fora de escopo,
  erros de persistência), navega para a aba "Jornadas" do Produto ao concluir.
- `apps/web/src/pages/agents/agents.catalog.ts` *(alterado)* — novo `AgentStage = 'conhecimento'`, nova entrada em
  `AGENT_STAGES`, nova entrada em `AGENTS_CATALOG` (`id: 'agent-mapeador-jornadas'`, `integration: 'live'`,
  `routes.start: '/agents/mapeador-jornadas'`, sem `routes.list` — resultado são Jornadas, que já têm índice
  próprio fora da árvore de agents).
- `apps/web/src/pages/agents/agents-orchestration.css` *(alterado)* — tom visual `blue` para o estágio
  "Conhecimento" (os 4 tons existentes — violet/teal/amber/red — eram 1:1 com os 4 estágios de QA); classe
  `.agent-processing-summary` para o resumo de múltiplas métricas no overlay de conclusão.
- `apps/web/src/router.tsx` *(alterado)* — rota `/agents/mapeador-jornadas` → `JourneyMapperPage`.

**Validação**: `npm run build:api` e `npm run build:web` (ambos com `tsc -b`/`nest build`, type-check completo)
passam limpos; as 3 rotas novas aparecem mapeadas no log de boot da API; os arquivos novos do frontend transformam
sem erro no dev server do Vite.

**Não executado nesta sessão**: uma chamada real do agent (que gravaria Jornadas de verdade em algum produto,
usando a sessão local do Claude Code já que não há `ANTHROPIC_API_KEY` configurada em `apps/api/.env`) — ficou
como sugestão de próximo passo, para não mutar dados do LUF sem confirmação explícita.

---

## Arquivos alterados/criados hoje (18)

| Arquivo | Caminho | Tipo |
|---|---|---|
| `agent-mapeador-jornadas.md` | `.claude/agents/` | novo |
| `agents.controller.ts` | `apps/api/src/agents/` | alterado |
| `agents.module.ts` | `apps/api/src/agents/` | alterado |
| `journey-mapper.service.ts` | `apps/api/src/agents/` | novo |
| `start-journey-mapper.dto.ts` | `apps/api/src/agents/dto/` | novo |
| `agent-runner.factory.ts` | `apps/api/src/agents/runtime/` | alterado |
| `jornadas.module.ts` | `apps/api/src/jornadas/` | alterado |
| `regras.controller.ts` | `apps/api/src/regras/` | alterado |
| `regras.module.ts` | `apps/api/src/regras/` | alterado |
| `regras.service.ts` | `apps/api/src/regras/` | alterado |
| `router.tsx` | `apps/web/src/` | alterado |
| `journey-mapper.api.ts` | `apps/web/src/entities/agents/` | novo |
| `regra.hooks.ts` | `apps/web/src/entities/regra/` | alterado |
| `agents-orchestration.css` | `apps/web/src/pages/agents/` | alterado |
| `agents.catalog.ts` | `apps/web/src/pages/agents/` | alterado |
| `JourneyMapperPage.tsx` | `apps/web/src/pages/agents/` | novo |
| `SetupStepper.tsx` | `apps/web/src/shell/setup/` | alterado |
| `BUG-001-setup-stepper-regras-sem-dados.md` | `docs/bugs-encontrados/` | novo |

Nenhum desses commits foi feito ainda — mudanças estão só no working tree local (ver `git status`).

---

## Próximos passos

1. **Rodar um teste real do "Mapeador de Jornadas"** contra o produto LUF (já tem 88/118 cobertos) para validar se
   o julgamento do agent ("isso vira jornada ou fica fora de escopo?") bate com o critério humano usado nesta
   sessão — bom teste de estresse porque a maior parte do trabalho fácil já foi feita manualmente.
2. **Maturidade do produto LUF** — dois itens ainda abaixo de 100%:
   - "Perfil do Produto" (71%): campos do cadastro do Produto ainda incompletos.
   - "Responsáveis" (0%): produto sem `timeResponsavelId` vinculado.
3. Nenhum commit git foi criado nesta sessão — decidir se as mudanças de código (Bloco 2) e o cadastro de dados do
   LUF (Bloco 1, já persistido no Postgres, fora do controle de versão) devem ser tratados/commitados agora.
