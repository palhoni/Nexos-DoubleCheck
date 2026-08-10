import { httpClient } from '@/lib/httpClient';
import type { EntityConfig, PaginatedResult, HistoryEntryDto } from './types';

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  [filterKey: string]: unknown;
}

function resolveEndpoint<T extends { id: string }>(config: EntityConfig<T>, scopeId?: string): string {
  if (typeof config.endpoint === 'function') {
    if (!scopeId) throw new Error(`Entidade "${config.key}" é escopada (${config.scopedBy ?? 'scopeId'}) mas nenhum scopeId foi informado.`);
    return config.endpoint(scopeId);
  }
  return config.endpoint;
}

export function entityApiClient<T extends { id: string }>(config: EntityConfig<T>) {
  return {
    list: (query: ListQuery, scopeId?: string) => httpClient.get<PaginatedResult<T>>(resolveEndpoint(config, scopeId), { params: query }).then((r) => r.data),

    getById: (id: string, scopeId?: string) => httpClient.get<T>(`${resolveEndpoint(config, scopeId)}/${id}`).then((r) => r.data),

    create: (dto: Partial<T>, scopeId?: string) => httpClient.post<T>(resolveEndpoint(config, scopeId), dto).then((r) => r.data),

    update: (id: string, dto: Partial<T>, scopeId?: string) => httpClient.patch<T>(`${resolveEndpoint(config, scopeId)}/${id}`, dto).then((r) => r.data),

    toggleStatus: (id: string, scopeId?: string) => httpClient.patch<T>(`${resolveEndpoint(config, scopeId)}/${id}/toggle-status`).then((r) => r.data),

    historico: (id: string, page = 1, pageSize = 10, scopeId?: string) =>
      httpClient.get<PaginatedResult<HistoryEntryDto>>(`${resolveEndpoint(config, scopeId)}/${id}/historico`, { params: { page, pageSize } }).then((r) => r.data),

    addListItem: (id: string, subResource: string, valor: string, scopeId?: string) =>
      httpClient.post<{ [key: string]: string[] }>(`${resolveEndpoint(config, scopeId)}/${id}/${subResource}`, { valor }).then((r) => r.data),

    removeListItem: (id: string, subResource: string, valor: string, scopeId?: string) =>
      httpClient.delete<{ [key: string]: string[] }>(`${resolveEndpoint(config, scopeId)}/${id}/${subResource}/${encodeURIComponent(valor)}`).then((r) => r.data),
  };
}
