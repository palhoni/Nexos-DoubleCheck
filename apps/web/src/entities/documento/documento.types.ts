import type { HistoryEntryDto, PaginatedResult } from '@/entities/crud/types';

export type DocumentoStatus = 'Rascunho' | 'Revisao' | 'Publicado' | 'Arquivado';
export type DocumentoEntityType = 'Projeto' | 'Time' | 'Pessoa' | 'Produto' | 'PublicoAlvo' | 'Modulo' | 'Funcionalidade' | 'Jornada' | 'Regra' | 'Integracao';

export interface DocumentoProjetoRef {
  id: string;
  nome: string;
  codigo: string;
}

export interface DocumentoAutorRef {
  id: string;
  nome: string;
}

export interface DocumentoConhecimento {
  id: string;
  projetoId: string;
  projeto: DocumentoProjetoRef;
  codigo: string;
  titulo: string;
  tipo: string;
  status: DocumentoStatus;
  resumo: string | null;
  conteudo: string | null;
  responsavel: string | null;
  versao: number;
  /** Última versão efetivamente publicada. Pode ser menor que `versao` quando há uma revisão em andamento. */
  versaoPublicada: number | null;
  /** Enquanto preenchido, existe uma publicação ativa disponível para consumo. */
  publicadoEm: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  vinculosTotal: number;
  vinculosCrossProject: number;
  fontesTotal: number;
}

export interface DocumentoVersao {
  id: string;
  documentoId: string;
  numero: number;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  motivoAlteracao: string | null;
  createdByUserId: string | null;
  createdBy: DocumentoAutorRef | null;
  createdAt: string;
}

export interface DocumentoUso {
  id: string;
  documentoId: string;
  projetoContextoId: string;
  projetoContexto: DocumentoProjetoRef;
  entityType: DocumentoEntityType;
  entityId: string;
  entityLabel?: string;
  entityPath?: string | null;
  targetAvailable?: boolean;
  contexto: string | null;
  createdAt: string;
}

export interface DocumentoDetail extends DocumentoConhecimento {
  createdBy: DocumentoAutorRef | null;
  versoes: DocumentoVersao[];
  versaoPublicadaSnapshot: DocumentoVersao | null;
  vinculos: DocumentoUso[];
}

export interface DocumentoVinculo {
  id: string;
  documentoId: string;
  projetoContextoId: string;
  projetoContexto: DocumentoProjetoRef;
  entityType: DocumentoEntityType;
  entityId: string;
  contexto: string | null;
  createdAt: string;
  documento: DocumentoConhecimento;
}

export interface DocumentoQuery {
  page?: number;
  pageSize?: number;
  projetoId?: string;
  consumidorProjetoId?: string;
  disponivelParaProjetoId?: string;
  busca?: string;
  tipo?: string;
  status?: DocumentoStatus;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface DocumentoPayload {
  projetoId: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status?: DocumentoStatus;
  resumo?: string;
  conteudo?: string;
  responsavel?: string;
}

export interface DocumentoUpdatePayload {
  tipo?: string;
  status?: DocumentoStatus;
  responsavel?: string;
}

export interface DocumentoVersionPayload {
  titulo?: string;
  resumo?: string;
  conteudo: string;
  motivoAlteracao?: string;
}

export interface DocumentoResumo {
  total: number;
  rascunhos: number;
  emRevisao: number;
  publicados: number;
  arquivados: number;
  semFonte: number;
  consumosCrossProject: number;
  documentosExternosConsumidos: number;
}

export type DocumentoPaginatedResult = PaginatedResult<DocumentoConhecimento>;
export type DocumentoHistoryResult = PaginatedResult<HistoryEntryDto>;
