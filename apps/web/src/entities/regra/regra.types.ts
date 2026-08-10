export const STATUS_REGRA_LIST = ['Ativo', 'Inativo'] as const;
export type StatusRegra = (typeof STATUS_REGRA_LIST)[number];

export const PRIORIDADE_REGRA_LIST = ['Alta', 'Média', 'Baixa'] as const;
export type PrioridadeRegra = (typeof PRIORIDADE_REGRA_LIST)[number];

export interface Regra {
  id: string;
  produtoId: string;
  grupoId: string;
  numeroVersao: number;
  versaoAtual: boolean;
  nome: string;
  status: StatusRegra;
  condicao?: string | null;
  resultadoEsperado?: string | null;
  excecoes: string[];
  exemplos: string[];
  prioridade?: PrioridadeRegra | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  moduloIds: string[];
  funcionalidadeIds: string[];
  jornadaIds: string[];
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegraVersaoResumo {
  id: string;
  numeroVersao: number;
  versaoAtual: boolean;
  nome: string;
  status: StatusRegra;
  createdAt: string;
}
