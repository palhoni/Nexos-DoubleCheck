# Próximos passos — a partir de 2026-08-07

## 1. Prioridade imediata: bug "não está dando para cadastrar produtos"

Relatado no fim do dia 06/08, ainda sem diagnóstico — o usuário não confirmou se o modal abre, se aparece algum
erro (toast/campo em vermelho), ou se a tela trava. Antes de qualquer outra coisa:
- Pedir print da tela ou descrição exata do que acontece ao tentar salvar um Produto.
- Hipóteses já descartadas por revisão de código: fluxo de criação (`EntityListPage` → `EntityFormModal` →
  `createMutation`) é idêntico ao de Times/Pessoas, que já funciona; DTO `CreateProdutoDto` aceita exatamente os
  campos que o form envia (whitelist casa 1:1).
- Hipóteses ainda não verificadas: erro de constraint única (`codigo` duplicado dentro do mesmo projeto — ex.
  tentar "CFG" ou "COP" que já existem no seed) retornando um 500 pouco amigável; algum campo `select`/`multiselect`
  enviando valor inesperado.
- Se necessário, reproduzir via curl o payload exato que o usuário tentou (pedir para ele copiar o payload como fez
  na vez do bug de Projetos, se souber inspecionar a aba Network do navegador).

## 2. Confirmar os dois fixes de Pessoas do dia anterior

Ainda não confirmado no navegador:
- Dropdown "Time" preenchido corretamente no modal "Nova Pessoa" aberto pela aba "Pessoas do Time".
- Erro de validação do campo "Nome" não fica mais travado na tela depois de `mode: 'onChange'`.

## 3. Continuar o Epic de Produto — sub-entidades (Epics 5-13)

Seguindo a mesma dinâmica usada para "Pessoas do Time" dentro de Time: cada sub-entidade vira uma aba real dentro
do Detalhe de Produto conforme for construída, escopada por `produtoId` (rota aninhada
`/projetos/:projetoId/produtos/:produtoId/<sub-entidade>`).

Ordem sugerida (mesma do texto original do usuário):
1. **Público-alvo** (Epic 5) — nome do público, perfil, tipo de usuário, descrição, necessidades, dores, objetivos,
   frequência de uso, canais utilizados, países onde se aplica, observações. Caso "leve" (sem abas próprias).
2. **Módulos** (Epic 6) — nome, código, descrição, objetivo, responsável, status, ordem de exibição, observações.
   Caso "leve".
3. **Funcionalidades** (Epic 7) — nome, código, módulo (FK), descrição, objetivo, comportamento esperado, usuários,
   responsável, status, observações. Caso "leve", mas com FK para Módulo.
4. **Jornadas** (Epic 9 — não existe Epic 8 no texto original do usuário, é um gap real da especificação, não erro
   de extração) — nome, descrição, público-alvo, objetivo, evento inicial, resultado esperado, etapas, produtos
   participantes, módulos, funcionalidades, países, status. Provavelmente precisa de tela própria (não só
   list/detail genérico) para as etapas visuais.
5. **Regras** (Epic 10) — a mais complexa: tem versionamento (nova versão, comparar versões, histórico da regra),
   condição/resultado esperado/exceções/exemplos, prioridade, vigência, vínculos com módulo/funcionalidade/jornada/
   integrações. Vai exigir desenho de schema para versionamento antes de implementar.
6. **Integrações** (Epic 11) — direção, produto relacionado (FK para outro Produto, possivelmente de outro
   Projeto), tipo, API/endpoint/evento/fila/banco/arquivo, síncrona ou assíncrona, criticidade, time proprietário.
   Tem também uma "visualização gráfica das relações" (NX-PRD-INT-006) — provavelmente bespoke, fora do scaffold.
7. **Documentos** (Epic 12) — upload de PDF/DOCX, vínculo com Confluence/Figma, metadados, validação/rejeição de
   fonte, histórico de versões. Vai exigir decidir estratégia de armazenamento de arquivo (local disk vs S3-like)
   — ainda não decidido com o usuário.
8. **Maturidade** (Epic 13) — indicadores agregados (visão geral, público-alvo, países, módulos, funcionalidades,
   jornadas, regras, integrações, documentos, responsáveis) + pendências + conflitos + "base pronta para agents".
   É a tela que depende de todas as outras existirem primeiro — deixar por último.

Nenhuma dessas 8 sub-entidades tem valores de dropdown/enum explicitamente dados pelo usuário na especificação
original — como já fizemos em Áreas de Negócio/Ambientes/Países, vamos continuar inventando allow-lists
razoáveis e ajustando se o usuário pedir.

## 4. Pendente de conversa (explicitamente adiado pelo usuário)

Explicar o que cada "AGENT" de IA vai fazer depois que o Setup/Configurador estiver maduro — ainda não discutido
em profundidade. Só faz sentido depois que a Maturidade (Epic 13) começar a tomar forma.

## 5. Lembrete de processo

- Sem automação de navegador nesta sessão — todo bug reportado precisa da descrição/print do usuário; validação
  do nosso lado é sempre via curl/tsc/build/psql.
- Um Epic por vez, confirmando com o usuário antes de pular pra frente (padrão que se repetiu em Times → Pessoas
  → Produtos).
