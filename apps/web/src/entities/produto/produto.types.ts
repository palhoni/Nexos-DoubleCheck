export const STATUS_PRODUTO_LIST = ['Ativo', 'Planejamento', 'Inativo'] as const;
export type StatusProduto = (typeof STATUS_PRODUTO_LIST)[number];

export const AMBIENTES_PRODUTO_LIST = ['Produção', 'Homologação', 'Desenvolvimento', 'Sandbox'] as const;
export type AmbienteProduto = (typeof AMBIENTES_PRODUTO_LIST)[number];

/** Estabilidade em produção — indicador separado da Maturidade de documentação (essa mede
 *  saúde operacional/bugs em PRD, controlado manualmente pelo PO). */
export const ESTABILIDADE_PRODUTO_LIST = ['Em Desenvolvimento', 'Em Evolução', 'Estável'] as const;
export type EstabilidadeProduto = (typeof ESTABILIDADE_PRODUTO_LIST)[number];

export interface Produto {
  id: string;
  projetoId: string;
  nome: string;
  nomeCurto?: string | null;
  codigo: string;
  status: StatusProduto;
  descricao?: string | null;
  objetivo?: string | null;
  problemaResolve?: string | null;
  usuariosPrincipais?: string | null;
  areaNegocio?: string | null;
  areasBeneficiadas: string[];
  timeResponsavelId?: string | null;
  responsavelPrincipal?: string | null;
  ambientes: AmbienteProduto[];
  paises: string[];
  observacoes?: string | null;
  estabilidadeStatus: EstabilidadeProduto;
  estabilidadeObservacao?: string | null;
  createdAt: string;
  updatedAt: string;
}
