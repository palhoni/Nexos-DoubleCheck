import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type {
  FonteConhecimento,
  FonteDetail,
  FonteEntityType,
  FonteHistoryResult,
  FontePaginatedResult,
  FontePayload,
  FonteQuery,
  FonteResumo,
  FonteUpdatePayload,
  FonteVinculo,
} from './fonte.types';

const keys = {
  all: ['fontes'] as const,
  list: (query: FonteQuery) => ['fontes', 'list', query] as const,
  detail: (id?: string) => ['fontes', 'detail', id] as const,
  history: (id?: string) => ['fontes', 'history', id] as const,
  links: (entityType: FonteEntityType, entityId?: string) => ['fontes', 'links', entityType, entityId] as const,
};

export function useFontes(query: FonteQuery, enabled = true) {
  return useQuery({ queryKey: keys.list(query), enabled, queryFn: () => httpClient.get<FontePaginatedResult>('/fontes', { params: query }).then((response) => response.data) });
}

export function useFonteResumo(projetoId?: string) {
  return useQuery({ queryKey: ['fontes', 'resumo', projetoId], enabled: !!projetoId, queryFn: () => httpClient.get<FonteResumo>('/fontes/resumo', { params: { projetoId } }).then((response) => response.data) });
}

export function useFonte(id?: string) {
  return useQuery({ queryKey: keys.detail(id), enabled: !!id, queryFn: () => httpClient.get<FonteDetail>(`/fontes/${id}`).then((response) => response.data) });
}

export function useFonteHistorico(id?: string, page = 1, pageSize = 10) {
  return useQuery({ queryKey: [...keys.history(id), page, pageSize], enabled: !!id, queryFn: () => httpClient.get<FonteHistoryResult>(`/fontes/${id}/historico`, { params: { page, pageSize } }).then((response) => response.data) });
}

export function useFontesVinculadas(entityType: FonteEntityType, entityId?: string) {
  return useQuery({ queryKey: keys.links(entityType, entityId), enabled: !!entityId, queryFn: () => httpClient.get<FonteVinculo[]>('/fontes/vinculos', { params: { entityType, entityId } }).then((response) => response.data) });
}

export function useFonteMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: keys.all });
  const create = useMutation({ mutationFn: (payload: FontePayload) => httpClient.post<FonteConhecimento>('/fontes', payload).then((response) => response.data), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: FonteUpdatePayload }) => httpClient.patch<FonteConhecimento>(`/fontes/${id}`, payload).then((response) => response.data), onSuccess: invalidate });
  const toggleStatus = useMutation({ mutationFn: (id: string) => httpClient.patch<FonteConhecimento>(`/fontes/${id}/toggle-status`).then((response) => response.data), onSuccess: invalidate });
  const link = useMutation({ mutationFn: ({ fonteId, entityType, entityId, contexto }: { fonteId: string; entityType: FonteEntityType; entityId: string; contexto?: string }) => httpClient.post<FonteVinculo>(`/fontes/${fonteId}/vinculos`, { entityType, entityId, contexto }).then((response) => response.data), onSuccess: invalidate });
  const unlink = useMutation({ mutationFn: ({ fonteId, vinculoId }: { fonteId: string; vinculoId: string }) => httpClient.delete(`/fontes/${fonteId}/vinculos/${vinculoId}`).then((response) => response.data), onSuccess: invalidate });
  return { create, update, toggleStatus, toggle: toggleStatus, link, unlink };
}
