import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type { ActivityResponse } from './atividade.types';

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
  projetoId?: string;
  tipos?: string[];
  actorUserId?: string;
  q?: string;
  de?: string;
  ate?: string;
}

export function useActivityFeed(query: ActivityQuery) {
  return useQuery({
    queryKey: ['activity-feed', query],
    queryFn: () => httpClient.get<ActivityResponse>('/atividade', {
      params: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 30,
        projetoId: query.projetoId,
        tipos: query.tipos?.join(','),
        actorUserId: query.actorUserId,
        q: query.q || undefined,
        de: query.de || undefined,
        ate: query.ate || undefined,
      },
    }).then((response) => response.data),
    staleTime: 20_000,
  });
}
