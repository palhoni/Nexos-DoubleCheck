export const STATUS_JORNADA_LIST = ['Ativo', 'Inativo'] as const;
export type StatusJornada = (typeof STATUS_JORNADA_LIST)[number];

export const PAISES_JORNADA_LIST = ['Brasil', 'Portugal', 'Estados Unidos', 'México', 'Colômbia', 'Argentina', 'Chile', 'Espanha'] as const;
export type PaisJornada = (typeof PAISES_JORNADA_LIST)[number];

export interface Jornada {
  id: string;
  produtoId: string;
  nome: string;
  status: StatusJornada;
  descricao?: string | null;
  publicoAlvoId?: string | null;
  objetivo?: string | null;
  eventoInicial?: string | null;
  resultadoEsperado?: string | null;
  etapas: string[];
  paises: PaisJornada[];
  moduloIds: string[];
  funcionalidadeIds: string[];
  produtoParticipanteIds: string[];
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
