export const STATUS_MODULO_LIST = ['Ativo', 'Inativo'] as const;
export type StatusModulo = (typeof STATUS_MODULO_LIST)[number];

export interface Modulo {
  id: string;
  produtoId: string;
  nome: string;
  codigo: string;
  status: StatusModulo;
  descricao?: string | null;
  objetivo?: string | null;
  responsavelPrincipal?: string | null;
  ordemExibicao?: number | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
