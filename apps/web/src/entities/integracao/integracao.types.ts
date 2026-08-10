export const STATUS_INTEGRACAO_LIST = ['Ativo', 'Inativo'] as const;
export type StatusIntegracao = (typeof STATUS_INTEGRACAO_LIST)[number];

export const DIRECAO_INTEGRACAO_LIST = ['Entrada', 'Saída', 'Bidirecional'] as const;
export type DirecaoIntegracao = (typeof DIRECAO_INTEGRACAO_LIST)[number];

export const TIPO_INTEGRACAO_LIST = ['API', 'Evento', 'Fila', 'Banco de Dados', 'Arquivo'] as const;
export type TipoIntegracao = (typeof TIPO_INTEGRACAO_LIST)[number];

export const MODO_INTEGRACAO_LIST = ['Síncrona', 'Assíncrona'] as const;
export type ModoIntegracao = (typeof MODO_INTEGRACAO_LIST)[number];

export const CRITICIDADE_INTEGRACAO_LIST = ['Alta', 'Média', 'Baixa'] as const;
export type CriticidadeIntegracao = (typeof CRITICIDADE_INTEGRACAO_LIST)[number];

export const PAPEL_DEPENDENCIA_INTEGRACAO_LIST = ['Consulta', 'Notificação', 'Publicação-Assinatura', 'Delegação', 'Sincronização'] as const;
export type PapelDependenciaIntegracao = (typeof PAPEL_DEPENDENCIA_INTEGRACAO_LIST)[number];

export interface Integracao {
  id: string;
  produtoId: string;
  nome: string;
  status: StatusIntegracao;
  direcao?: DirecaoIntegracao | null;
  papelDependencia?: PapelDependenciaIntegracao | null;
  produtoRelacionadoId?: string | null;
  funcionalidadeIds: string[];
  tipo?: TipoIntegracao | null;
  endpoint?: string | null;
  modo?: ModoIntegracao | null;
  criticidade?: CriticidadeIntegracao | null;
  dadosTrafegados?: string | null;
  timeProprietarioId?: string | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
