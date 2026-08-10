# Scaffold de Entidades — Configurador do Nexo

> Guia de referência para adicionar um novo CRUD (Epics 2–13) reaproveitando o
> scaffold genérico. Baseado nos dois configs de referência: `projetoConfig.jsx`
> (caso "com abas") e o exemplo "leve" abaixo.

## Regra de decisão

**Lista/criar/detalhe/editar/inativar sobre 1 entidade → config no scaffold.**
**Qualquer outra coisa (comparação de versões, grafo, upload multi-caminho,
dashboard agregado) → arquivo bespoke, construído só com primitivos `DBCUI`.**

Não force uma tela bespoke dentro do scaffold genérico "porque agora é o
padrão" — isso é o que gera os `if (config.key === "x")` espalhados que o
scaffold existe justamente para evitar.

## As 3 peças do scaffold

| Arquivo | Papel |
|---|---|
| `entityCrud.js.jsx` | `useEntityCrud(config, scopeId)` — persistência localStorage escopada, `createItem`/`updateItem`/`toggleStatus`/`updateField`. Também: `EntityBreadcrumb`, `EntityStatusBadge`, `EntityChipList`, `renderEntityCell`, `formatDateBR`/`formatDateTimeBR`. |
| `EntityListPage.jsx` | Lista genérica: filtros colapsáveis, tabela responsiva (breakpoints `compact`/`wide`), paginação, toggle de status, modal de criar. |
| `EntityFormModal.jsx` | Modal único de criar/editar (`isNew = !item`). Campos: `text`, `textarea`, `select`, `multiselect`, `date`. Suporta `readOnly: true` + `badge` (ex.: referência do Jira). |
| `EntityDetailPage.jsx` | Detalhe: modo leve (cards) ou modo shell (header + abas), escolhido pela presença de `config.detail.shell`. |

## Formato do config — campos obrigatórios

```jsx
const MEU_CONFIG = {
  key: "minhaEntidade",
  label: { singular: "Item", plural: "Itens" },
  storageKey: "nexus-minha-entidade",   // chave localStorage — composta com scopeId automaticamente
  idField: "id",
  seed: MEUS_ITEMS_SEED_RAW,
  scopedBy: "produtoId",                // opcional — documenta de quem esta entidade depende (Epics 5-12)

  list: {
    columns: [ /* { key, label, primary?, minWidth, hideBelow: "compact"|"wide", render: "statusBadge"|"chipList"|"dateTime"|fn, sortable: false? } */ ],
    filters: [ /* { key, label, type: "text"|"select", options? } */ ],
  },

  statusField: "status",
  statusPresets: { "Valor A": "ativo", "Valor B": "inativo" },   // presets do DBCBadge: ativo|sucesso|pendente|erro|inativo|analise|info
  inactivate: { mode: "toggle", activeValue: "Valor A", inactiveValue: "Valor B" },

  form: {
    title: { create: "Novo Item", edit: "Editar Item" },
    sections: [ { title: "Seção", fields: [ /* { key, label, type, required?, colSpan?, options?, optionsFrom?, readOnly?, badge? } */ ] } ],
    validate(data) { return {}; },      // retorna { campo: "mensagem" }
    afterSave: "detail",                // opcional — navega para o Detalhe após criar (ex.: Produto)
  },

  detail: {
    header: { title: r => r.nome, badges: [{ field: "status" }] },
    shell: {                                   // OMITIR para o caso "leve"
      fixedHeaderFields: [{ key, label }],     // tira fixa rica (só Produto usa hoje)
      tabs: [
        { key, label, kind: "genericFields", fields: [...] },   // subconjunto read-only do form
        { key, label, kind: "simpleList", field: "arrayField" }, // países/fontes — array de strings no próprio item
        { key, label, kind: "history" },                          // usa item.historico (mantido automaticamente)
        { key, label, kind: "entityList", entity: OUTRO_CONFIG, scopeKey: "..." }, // sub-CRUD (Epics 2-12 dentro do Produto)
        { key, label, kind: "bespoke", component: "NomeDoComponente" }, // ver extraOptions.bespokeComponents
      ],
    },
  },
};
```

## Dois exemplos completos

- **Caso "com abas"**: `components/configs/projetoConfig.jsx` (Epic 1) — `detail.shell.tabs` com `genericFields` + `simpleList` + `history`.
- **Caso "leve"**: qualquer entidade sem `detail.shell` renderiza só breadcrumb + cards read-only (Editar/Inativar) — é o padrão esperado para Público-alvo, Módulos e Funcionalidades (Epics 5-7).

## Convenções

- Toda entidade nova **usa sempre** os primitivos já existentes (`DBCButton`, `DBCModal`, `DBCBadge`, `DBCInput`, `DBCPagination`, `DBCEmptyState`, `DBCToast`) — nunca forkar um clone local (é a duplicação que o próprio DBC 2.0 já tem e que o scaffold existe para evitar).
- Toda função pensada para uso **fora do arquivo onde é declarada** precisa aparecer no `Object.assign(window, {...})` no fim do arquivo — é a convenção que documenta o "público" de cada arquivo (mesmo que, tecnicamente, `function` de topo já vire global).
- `historico` é mantido automaticamente por `createItem`/`updateItem`/`toggleStatus` (via `pushHistory`) — não popule manualmente fora do seed inicial.
- Teste o isolamento de escopo (`storageKey:scopeId`) manualmente ao introduzir a primeira entidade escopada (Epic 2 — Times): crie 2 projetos, confirme que os Times de um não aparecem no outro.
