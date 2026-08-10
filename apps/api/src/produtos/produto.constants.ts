export const STATUS_PRODUTO = ['Ativo', 'Planejamento', 'Inativo'] as const;

export const AMBIENTES_PRODUTO = ['Produção', 'Homologação', 'Desenvolvimento', 'Sandbox'] as const;

/** Estabilidade em produção — indicador separado da Maturidade de documentação: aqui mede
 *  saúde operacional (bugs/erros em PRD), controlado manualmente pelo PO até existir uma
 *  integração real com ferramenta de bugs/incidentes. */
export const ESTABILIDADE_PRODUTO = ['Em Desenvolvimento', 'Em Evolução', 'Estável'] as const;

export const PRODUTO_SORTABLE_FIELDS = [
  'nome',
  'codigo',
  'status',
  'areaNegocio',
  'responsavelPrincipal',
  'createdAt',
  'updatedAt',
] as const;
