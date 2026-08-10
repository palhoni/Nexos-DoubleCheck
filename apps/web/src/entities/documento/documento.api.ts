import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type {
  DocumentoConhecimento,
  DocumentoDetail,
  DocumentoEntityType,
  DocumentoHistoryResult,
  DocumentoPaginatedResult,
  DocumentoPayload,
  DocumentoQuery,
  DocumentoResumo,
  DocumentoUpdatePayload,
  DocumentoVersionPayload,
  DocumentoVersao,
  DocumentoVinculo,
} from './documento.types';

const keys = {
  all: ['documentos'] as const,
  list: (query: DocumentoQuery) => ['documentos', 'list', query] as const,
  detail: (id?: string) => ['documentos', 'detail', id] as const,
  versions: (id?: string) => ['documentos', 'versions', id] as const,
  history: (id?: string) => ['documentos', 'history', id] as const,
  links: (entityType: DocumentoEntityType, entityId?: string) => ['documentos', 'links', entityType, entityId] as const,
};

export function useDocumentos(query: DocumentoQuery, enabled = true) {
  return useQuery({
    queryKey: keys.list(query),
    enabled,
    queryFn: () => httpClient.get<DocumentoPaginatedResult>('/documentos', { params: query }).then((response) => response.data),
  });
}

export function useDocumentoResumo(projetoId?: string) {
  return useQuery({
    queryKey: ['documentos', 'resumo', projetoId],
    enabled: !!projetoId,
    queryFn: () => httpClient.get<DocumentoResumo>('/documentos/resumo', { params: { projetoId } }).then((response) => response.data),
  });
}

export function useDocumento(id?: string) {
  return useQuery({
    queryKey: keys.detail(id),
    enabled: !!id,
    queryFn: () => httpClient.get<DocumentoDetail>(`/documentos/${id}`).then((response) => response.data),
  });
}

export function useDocumentoVersoes(id?: string) {
  return useQuery({
    queryKey: keys.versions(id),
    enabled: !!id,
    queryFn: () => httpClient.get<DocumentoVersao[]>(`/documentos/${id}/versoes`).then((response) => response.data),
  });
}

export function useDocumentoHistorico(id?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...keys.history(id), page, pageSize],
    enabled: !!id,
    queryFn: () => httpClient.get<DocumentoHistoryResult>(`/documentos/${id}/historico`, { params: { page, pageSize } }).then((response) => response.data),
  });
}

export function useDocumentosVinculados(entityType: DocumentoEntityType, entityId?: string) {
  return useQuery({
    queryKey: keys.links(entityType, entityId),
    enabled: !!entityId,
    queryFn: () => httpClient.get<DocumentoVinculo[]>('/documentos/vinculos', { params: { entityType, entityId } }).then((response) => response.data),
  });
}

export function useDocumentoMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: keys.all });

  const create = useMutation({
    mutationFn: (payload: DocumentoPayload) => httpClient.post<DocumentoConhecimento>('/documentos', payload).then((response) => response.data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocumentoUpdatePayload }) => httpClient.patch<DocumentoConhecimento>(`/documentos/${id}`, payload).then((response) => response.data),
    onSuccess: invalidate,
  });
  const createVersion = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocumentoVersionPayload }) => httpClient.post<DocumentoConhecimento>(`/documentos/${id}/versoes`, payload).then((response) => response.data),
    onSuccess: invalidate,
  });
  const link = useMutation({
    mutationFn: ({ documentoId, entityType, entityId, contexto }: { documentoId: string; entityType: DocumentoEntityType; entityId: string; contexto?: string }) =>
      httpClient.post<DocumentoVinculo>(`/documentos/${documentoId}/vinculos`, { entityType, entityId, contexto }).then((response) => response.data),
    onSuccess: invalidate,
  });
  const unlink = useMutation({
    mutationFn: ({ documentoId, vinculoId }: { documentoId: string; vinculoId: string }) =>
      httpClient.delete(`/documentos/${documentoId}/vinculos/${vinculoId}`).then((response) => response.data),
    onSuccess: invalidate,
  });

  return { create, update, createVersion, link, unlink };
}
