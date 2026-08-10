import type { PaginatedResult, HistoryEntryDto } from '@/entities/crud/types';

export type FonteStatus = 'Ativa' | 'Revisao' | 'Inativa';
export type FonteEntityType = 'Projeto' | 'Time' | 'Pessoa' | 'Produto' | 'PublicoAlvo' | 'Modulo' | 'Funcionalidade' | 'Jornada' | 'Regra' | 'Integracao' | 'Documento';

export interface FonteProjetoRef {
  id: string;
  nome: string;
  codigo: string;
}

export interface FonteConhecimento {
  id: string;
  projetoId: string;
  projeto: FonteProjetoRef;
  nome: string;
  tipo: string;
  referencia: string;
  status: FonteStatus;
  oficial: boolean;
  responsavel: string | null;
  descricao: string | null;
  ultimaVerificacao: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  vinculosTotal: number;
  vinculosCrossProject: number;
}


export interface FonteUso {
  id: string;
  fonteId: string;
  projetoContextoId: string;
  projetoContexto: FonteProjetoRef;
  entityType: FonteEntityType;
  entityId: string;
  contexto: string | null;
  createdAt: string;
}

export interface FonteDetail extends FonteConhecimento {
  vinculos: FonteUso[];
}

export interface FonteVinculo {
  id: string;
  fonteId: string;
  projetoContextoId: string;
  entityType: FonteEntityType;
  entityId: string;
  contexto: string | null;
  createdAt: string;
  fonte: FonteConhecimento;
  projetoContexto: FonteProjetoRef;
}

export interface FonteQuery {
  page?: number;
  pageSize?: number;
  projetoId?: string;
  consumidorProjetoId?: string;
  busca?: string;
  tipo?: string;
  status?: FonteStatus;
  oficial?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface FontePayload {
  projetoId: string;
  nome: string;
  tipo: string;
  referencia: string;
  status?: FonteStatus;
  oficial?: boolean;
  responsavel?: string;
  descricao?: string;
  ultimaVerificacao?: string;
  observacoes?: string;
}

/** Atualização preserva a propriedade original da fonte. */
export type FonteUpdatePayload = Omit<FontePayload, 'projetoId'>;

export type FontePaginatedResult = PaginatedResult<FonteConhecimento>;
export type FonteHistoryResult = PaginatedResult<HistoryEntryDto>;

export interface FonteResumo {
  total: number;
  ativas: number;
  oficiais: number;
  emRevisao: number;
  semVerificacao: number;
  consumosCrossProject: number;
  fontesExternasConsumidas: number;
}
