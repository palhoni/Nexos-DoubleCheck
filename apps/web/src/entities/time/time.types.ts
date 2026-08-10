export const STATUS_TIME_LIST = ['Ativo', 'Inativo'] as const;
export type StatusTime = (typeof STATUS_TIME_LIST)[number];

export const PAISES_ATUACAO_LIST = ['Brasil', 'Portugal', 'Estados Unidos', 'México', 'Colômbia', 'Argentina', 'Chile', 'Espanha'] as const;
export type PaisAtuacao = (typeof PAISES_ATUACAO_LIST)[number];

export const CANAIS_COMUNICACAO_LIST = ['E-mail', 'Slack', 'Microsoft Teams', 'WhatsApp', 'Reunião presencial', 'Videoconferência'] as const;
export type CanalComunicacao = (typeof CANAIS_COMUNICACAO_LIST)[number];

export interface Time {
  id: string;
  projetoId: string;
  nome: string;
  status: StatusTime;
  missao?: string | null;
  descricao?: string | null;
  responsavelPrincipal?: string | null;
  paisesAtuacao: PaisAtuacao[];
  canaisComunicacao: CanalComunicacao[];
  produtosAtendidos: string[];
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
