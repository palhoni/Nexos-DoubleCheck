import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entityApiClient, type ListQuery } from './entityApiClient';
import type { EntityConfig } from './types';

/**
 * Gera os hooks de uma entidade. Para entidades escopadas (config.endpoint é função),
 * cada hook aceita `scopeId` como último argumento — ex.: `useList(query, projetoId)`.
 * Para entidades de topo, `scopeId` fica de fora (undefined).
 */
export function createEntityHooks<T extends { id: string }>(config: EntityConfig<T>) {
  const api = entityApiClient(config);

  const keys = {
    all: (scopeId?: string) => [config.key, scopeId] as const,
    list: (query: ListQuery, scopeId?: string) => [config.key, scopeId, 'list', query] as const,
    detail: (id: string, scopeId?: string) => [config.key, scopeId, 'detail', id] as const,
    historico: (id: string, page: number, pageSize: number, scopeId?: string) => [config.key, scopeId, 'historico', id, page, pageSize] as const,
  };

  function useList(query: ListQuery, scopeId?: string, opts?: { enabled?: boolean }) {
    return useQuery({
      queryKey: keys.list(query, scopeId),
      queryFn: () => api.list(query, scopeId),
      placeholderData: keepPreviousData,
      enabled: opts?.enabled ?? true,
    });
  }

  function useDetail(id: string | undefined, scopeId?: string) {
    return useQuery({
      queryKey: keys.detail(id ?? '', scopeId),
      queryFn: () => api.getById(id as string, scopeId),
      enabled: id != null,
    });
  }

  function useHistorico(id: string | undefined, page: number, pageSize: number, scopeId?: string) {
    return useQuery({
      queryKey: keys.historico(id ?? '', page, pageSize, scopeId),
      queryFn: () => api.historico(id as string, page, pageSize, scopeId),
      enabled: id != null,
    });
  }

  function useCreate(scopeId?: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (dto: Partial<T>) => api.create(dto, scopeId),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scopeId) }),
    });
  }

  function useUpdate(scopeId?: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, dto }: { id: string; dto: Partial<T> }) => api.update(id, dto, scopeId),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scopeId) }),
    });
  }

  function useToggleStatus(scopeId?: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.toggleStatus(id, scopeId),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(scopeId) }),
    });
  }

  function useAddListItem(scopeId?: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, subResource, valor }: { id: string; subResource: string; valor: string }) => api.addListItem(id, subResource, valor, scopeId),
      onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: keys.detail(id, scopeId) }),
    });
  }

  function useRemoveListItem(scopeId?: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, subResource, valor }: { id: string; subResource: string; valor: string }) => api.removeListItem(id, subResource, valor, scopeId),
      onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: keys.detail(id, scopeId) }),
    });
  }

  return { useList, useDetail, useHistorico, useCreate, useUpdate, useToggleStatus, useAddListItem, useRemoveListItem };
}

export type EntityHooks<T extends { id: string }> = ReturnType<typeof createEntityHooks<T>>;
