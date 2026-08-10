export const STATUS_PESSOA_LIST = ['Ativo', 'Inativo'] as const;
export type StatusPessoa = (typeof STATUS_PESSOA_LIST)[number];

export const NIVEL_DECISAO_LIST = ['Estratégico', 'Tático', 'Operacional'] as const;
export type NivelDecisao = (typeof NIVEL_DECISAO_LIST)[number];

export interface Pessoa {
  id: string;
  projetoId: string;
  nome: string;
  status: StatusPessoa;
  emailCorporativo?: string | null;
  papel?: string | null;
  cargo?: string | null;
  timeId?: string | null;
  produtos: string[];
  responsabilidades: string[];
  especialidades: string[];
  nivelDecisao?: NivelDecisao | null;
  pessoaReferencia: boolean;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
