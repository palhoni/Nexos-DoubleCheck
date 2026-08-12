# BUG-001 — Step "Regras" do Setup Stepper nunca reflete dados reais cadastrados

**Status:** Corrigido
**Severidade:** Low
**Prioridade sugerida:** Baixa
**Componente:** `apps/web` (frontend) — Setup Stepper / `apps/api` (backend) — Regras
**Ambiente:** Nexus 2.0, http://localhost:5173, qualquer projeto/produto
**Data de descoberta:** 2026-08-12
**Data de correção:** 2026-08-12

## Descrição

O passo **"Regras"** do stepper de Setup (barra de progresso exibida no topo das telas de configuração de um Projeto: Projeto → Time → Pessoas → Produtos → Regras → Documentos) nunca é marcado como concluído (`done`) a partir de páginas anteriores à etapa "Documentos", **mesmo quando o produto já possui regras de negócio cadastradas**.

Diferente dos demais passos do mesmo componente (Time, Pessoas, Produtos, Documentos), que usam a contagem real de registros como critério de conclusão quando o usuário ainda não navegou até aquela etapa, o passo "Regras" depende **exclusivamente da rota atual** — ele nunca consulta se existe alguma Regra cadastrada nos produtos do projeto.

## Passos para reproduzir

1. Cadastre um Produto dentro de um Projeto.
2. Cadastre pelo menos uma Regra de negócio nesse Produto (`/projetos/:projetoId/produtos/:produtoId?tab=regras` ou `/projetos/:projetoId/regras`).
3. Navegue para a visão geral do projeto: `/projetos/:projetoId`.
4. Observe o step "Regras" no Setup Stepper, no topo da página.

## Resultado obtido

O step "Regras" aparece com o estado `upcoming` (não marcado), independentemente de existirem regras cadastradas.

Exemplo real usado nesta investigação: projeto "LUF - Liga Uberabense de Futebol" (`cmsq3da60000090vpph1m8nh2`), produto "Sistema de Competições LUF", com **169 regras de negócio já cadastradas** — o step "Regras" continua aparecendo como não concluído ao visitar `/projetos/cmsq3da60000090vpph1m8nh2`.

## Resultado esperado

O step "Regras" deveria refletir a existência real de regras cadastradas nos produtos do projeto — assim como os steps "Time", "Pessoas", "Produtos" e "Documentos" já fazem para suas respectivas entidades — aparecendo como `done` sempre que existir ao menos uma Regra em algum Produto do projeto, mesmo antes de o usuário navegar até a etapa "Documentos".

## Evidência técnica (causa raiz)

Arquivo: `apps/web/src/shell/setup/SetupStepper.tsx`

Comparação entre os passos do stepper:

```tsx
// "time" (linha 97) — usa dado real como fallback
state: secao === 'times' ? 'current' : secao !== 'projeto' || (timesData?.meta.total ?? 0) > 0 ? 'done' : 'upcoming',

// "pessoas" (linha 104) — usa dado real como fallback
state: secao === 'pessoas' ? 'current' : ['produtos', 'regras', 'documentos'].includes(secao) || (pessoasData?.meta.total ?? 0) > 0 ? 'done' : 'upcoming',

// "produtos" (linhas 72 e 111) — usa dado real como fallback, via `produtoDone`
const produtoDone = (produtosData?.meta.total ?? 0) > 0 || secao === 'regras';
...
state: secao === 'produtos' ? 'current' : ['regras', 'documentos'].includes(secao) || produtoDone ? 'done' : 'upcoming',

// "regras" (linha 118) — NÃO usa nenhum dado real, só a rota atual
state: secao === 'regras' ? 'current' : secao === 'documentos' ? 'done' : 'upcoming',

// "documentos" (linha 125) — usa dado real via endpoint dedicado /documentos/resumo
state: secao === 'documentos' ? 'current' : (documentosResumo?.total ?? 0) > 0 ? 'done' : 'upcoming',
```

O componente não faz nenhuma consulta (`useQuery`) para contar regras — não existe, dentro de `SetupStepper.tsx`, nenhum hook equivalente a `timeHooks.useList` / `pessoaHooks.useList` / `produtoHooks.useList` / `useDocumentoResumo` para Regras.

### Causa provável

`DocumentoConhecimento` tem `projetoId` direto no schema Prisma, o que permite um endpoint agregado simples por projeto (`GET /documentos/resumo?projetoId=...`, consumido por `useDocumentoResumo`). Já `Regra` só tem `produtoId` (não tem `projetoId` direto) — para saber "quantas regras existem neste projeto" é preciso agregar por todos os Produtos do projeto primeiro. Não existe hoje nenhum endpoint equivalente a `/documentos/resumo` para Regras, então o `SetupStepper` não tem um dado pronto para consumir aqui e ficou apenas com a lógica de navegação.

## Critério de aceite violado

Consistência de UX já estabelecida pelo próprio padrão dos demais passos do componente: todo step do Setup Stepper que representa uma entidade cadastrável deveria refletir a existência real dessa entidade, não apenas a posição de navegação do usuário no wizard.

## Impacto

Cosmético / informativo — não há perda ou corrupção de dado. O único efeito é o usuário achar (erroneamente) que ainda falta cadastrar regras, quando elas já existem. Pode gerar retrabalho ou desconfiança sobre o estado real do cadastro.

## Sugestão de correção

Adicionar ao `SetupStepper.tsx` uma forma de saber se existe ao menos 1 Regra no projeto, por uma das duas abordagens:

1. **Endpoint agregado (mais correto)** — criar `GET /regras/resumo?projetoId=...` no backend (mesmo padrão de `GET /documentos/resumo`), contando `Regra` via join com `Produto.projetoId = X`, e consumir esse endpoint no lugar da checagem hoje baseada só em `secao`.
2. **Fallback client-side (mais rápido, sem mudança de backend)** — reaproveitar a lista de produtos já buscada (`produtosData`) e verificar a contagem de regras via `regraHooks.useList({ page: 1, pageSize: 1 }, produtoId)` para o(s) produto(s) do projeto, usando `meta.total > 0` como fallback — análogo ao que já é feito para Time/Pessoas/Produtos.

## Resolução aplicada

Implementada a **opção 1** (endpoint agregado), por ser a mais consistente com o padrão já usado por Documentos:

- **Backend**: novo método `RegrasService.resumoPorProjeto(projetoId)` (`apps/api/src/regras/regras.service.ts`), contando `Regra` com `versaoAtual: true` via `produto: { projetoId }`. Exposto em `GET /regras/resumo?projetoId=...` por um novo `RegrasResumoController` (`apps/api/src/regras/regras.controller.ts`, registrado em `regras.module.ts`) — mesmo padrão de `GET /documentos/resumo`. Retorna 400 sem `projetoId` e 404 para projeto inexistente.
- **Frontend**: novo hook `useRegrasResumo(projetoId)` (`apps/web/src/entities/regra/regra.hooks.ts`), consumido em `SetupStepper.tsx`. O step "Regras" passou a usar:
  ```tsx
  state: secao === 'regras' ? 'current' : secao === 'documentos' || (regrasResumo?.total ?? 0) > 0 ? 'done' : 'upcoming',
  ```
- Validado via API: `GET /regras/resumo?projetoId=<id-do-LUF>` retorna `{"total":169}`, confirmando que o step agora reconhece o cadastro já existente.

## Notas adicionais

Encontrado durante a sessão de cadastro do projeto "LUF - Liga Uberabense de Futebol" no Nexus (169 regras de negócio cadastradas via script de automação), ao investigar por que o step "Regras" não aparecia como concluído mesmo com o cadastro completo.

**Observação correlata (não é o mesmo bug):** as 169 regras cadastradas para o LUF foram vinculadas apenas a Módulos (`moduloIds`), sem vínculo com Funcionalidades (`funcionalidadeIds`). Isso **não é uma falha de validação ausente no CRUD** — tanto o `CreateRegraDto` (backend) quanto `regra.config.ts` (formulário do frontend) tratam módulos, funcionalidades e jornadas como relações igualmente opcionais, por design. É uma lacuna do cadastro automatizado, que faz o indicador "Maturidade → Regras" do produto (`apps/api/src/produtos/produtos.service.ts:159-160`, que mede a % de Funcionalidades com ao menos 1 Regra vinculada) aparecer em 0%. Correção prevista separadamente, fora deste bug.
