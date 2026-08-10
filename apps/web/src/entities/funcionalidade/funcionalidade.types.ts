export const STATUS_FUNCIONALIDADE_LIST = ['Ativo', 'Inativo'] as const;
export type StatusFuncionalidade = (typeof STATUS_FUNCIONALIDADE_LIST)[number];

export interface Funcionalidade {
  id: string;
  produtoId: string;
  nome: string;
  codigo: string;
  moduloId?: string | null;
  status: StatusFuncionalidade;
  descricao?: string | null;
  objetivo?: string | null;
  comportamentoEsperado?: string | null;
  usuarios?: string | null;
  responsavelPrincipal?: string | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
