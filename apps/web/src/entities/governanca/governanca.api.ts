import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type { GovernanceResponse } from './governanca.types';

export function useGovernanceSummary(projetoId?: string | null) {
  return useQuery({
    queryKey: ['governance-summary', projetoId ?? null],
    queryFn: () => httpClient.get<GovernanceResponse>('/governanca/resumo', { params: projetoId ? { projetoId } : undefined }).then((response) => response.data),
  });
}
