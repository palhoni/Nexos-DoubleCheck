import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type { GlobalSearchResponse, GlobalSearchType } from './busca.types';

export interface GlobalSearchQuery {
  q: string;
  projetoId?: string;
  tipos?: GlobalSearchType[];
  limit?: number;
}

export function useGlobalSearch(query: GlobalSearchQuery, enabled = true) {
  return useQuery({
    queryKey: ['global-search', query.q, query.projetoId ?? null, query.tipos?.join(',') ?? null, query.limit ?? 8],
    queryFn: () => httpClient.get<GlobalSearchResponse>('/busca', {
      params: {
        q: query.q,
        projetoId: query.projetoId,
        tipos: query.tipos?.join(','),
        limit: query.limit ?? 8,
      },
    }).then((response) => response.data),
    enabled: enabled && query.q.trim().length >= 2,
    staleTime: 30_000,
  });
}
