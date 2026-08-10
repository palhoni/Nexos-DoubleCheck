# Progresso — 2026-08-06

## Contexto geral

O Nexus 2.0 deixou de ser um protótipo mocado (Fase 1, `project/` + `server.js`, React sem build) e passou a ser
construído como produto real (Fase 2): back-end NestJS + PostgreSQL nativo (sem Docker) + front-end Vite/React/TS,
com autenticação JWT própria. Ver plano completo em `C:\Users\User\.claude\plans\swift-scribbling-valley.md`.

## O que foi concluído hoje

### Infraestrutura
- PostgreSQL 17 instalado nativamente no Windows (winget), sem Docker — decisão explícita do usuário.
- Prisma ORM v7.9.1 configurado com driver adapter (`@prisma/adapter-pg`) — obrigatório no Prisma 7 mesmo usando o
  generator clássico `prisma-client-js`. `prisma.config.ts` substitui a config embutida no schema.
- Backend NestJS em `apps/api`, front-end Vite+React+TS em `apps/web`, monorepo simples com npm workspaces
  (sem pnpm/turborepo).

### Epic 0 — Autenticação
- Login JWT (e-mail + senha, hash Argon2id via `@node-rs/argon2`), token único de acesso (8h, sem refresh token —
  simplificação deliberada), guardado em `sessionStorage` via Zustand.

### Epic 1 — Projetos
- CRUD completo (list/detail/create/update/toggle-status/histórico/países/fontes) — topo da hierarquia, não escopado.
- Bug corrigido: `dataInicio` causava 500 (Prisma 7 rejeitava string de data pura) — resolvido trocando
  `@IsDateString()` por `@Type(() => Date) @IsDate()` no DTO. Também corrigido: falhas de create/update eram
  silenciosas na UI — agora mostram toast de erro.

### Epic 2 — Times
- CRUD completo, escopado por `projetoId` (rota aninhada `/projetos/:projetoId/times`).

### Epic 3 — Pessoas
- CRUD completo, escopado por `projetoId`, com FK opcional para `timeId`.
- Dois bugs relatados e corrigidos no modal "Nova Pessoa" aberto pela aba "Pessoas do Time":
  1. Dropdown de "Time" vazio — `PessoasDoTimeTabPanel.tsx` não passava `extraOptions={{times}}` (as outras duas
     telas que usam o form de Pessoa já passavam corretamente). Corrigido.
  2. Erro Zod "Invalid input: expected string, received undefined" no campo Nome mesmo preenchido — schema Zod
     validado isoladamente e confirmado correto; aplicado `mode: 'onChange'` no `useForm()` do `EntityFormModal`
     como robustez contra erro de validação desatualizado na tela.
  - **Essas duas correções ainda não foram reconfirmadas pelo usuário no navegador.**

### Epic 4 — Produtos
- Especificação exata (campos de Produto + as 8 sub-entidades) resgatada do histórico da conversa via agente,
  já que nunca tinha sido implementada na Fase 1 (não havia referência).
- Model `Produto` no Prisma: escopado por `projetoId`, com `timeResponsavelId` opcional (FK para Time), status de
  3 estados (Ativo/Planejamento/Inativo, mesmo toggle assimétrico do Projeto), campos nome/nome curto/código/
  descrição/objetivo/problema que resolve/usuários principais/área de negócio/áreas beneficiadas/responsável
  principal/ambientes/observações + aba "Países" (lista aditiva, mesmo padrão do Projeto).
- Back-end validado via curl: create/update/toggle-status/países/histórico, isolamento de escopo (404 cross-projeto,
  400 ao vincular Time de outro projeto).
- Front-end: aba "Produtos" dentro do Detalhe de Projeto + página de Detalhe de Produto própria — 100% reaproveitando
  o scaffold genérico existente, sem precisar de nenhuma mudança nele.
- `tsc -b` e `npm run build` limpos nos dois lados (api e web).
- **Bug em aberto**: usuário reportou "não está dando para cadastrar produtos" pela UI. Ainda não diagnosticado —
  aguardando descrição/print da tela (não há automação de navegador disponível nesta sessão).

## Convenções e decisões que valem para os próximos Epics
- Toda entidade escopada segue o padrão: rota aninhada `/projetos/:projetoId/<entidade>`, `assertProjetoExists` +
  (quando aplicável) `assertXBelongsToProjeto` no service, sem base genérica dinâmica no back-end (lógica de negócio
  explícita por módulo, só copiando a receita).
- Histórico sempre via `HistoryService` genérico (`entityType` + `entityId`), nunca reimplementado por entidade.
- "Inativar" é sempre toggle de status, nunca delete físico.
- No front-end, o scaffold `entities/crud/*` já suporta: entidades escopadas, modo `embedded` (para abas dentro de
  detalhe), `optionsFrom` (select relacional, ex. Time), campos `boolean`, `fixedQuery` (filtro fixo + valor padrão
  no create). Produtos não precisou de nenhuma generalização nova — sinal de que o scaffold já está maduro.
