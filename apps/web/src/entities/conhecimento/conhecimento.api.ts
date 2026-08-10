import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type { KnowledgeGraphResponse } from './conhecimento.types';

export interface KnowledgeGraphQuery {
  projetoId?: string;
  produtoId?: string;
  maxNodes?: number;
}

export function useKnowledgeGraph(query: KnowledgeGraphQuery = {}) {
  return useQuery({
    queryKey: ['knowledge-graph', query.projetoId ?? null, query.produtoId ?? null, query.maxNodes ?? 180],
    queryFn: () => httpClient.get<KnowledgeGraphResponse>('/conhecimento/grafo', { params: query }).then((response) => response.data),
  });
}
