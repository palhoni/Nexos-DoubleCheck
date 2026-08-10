import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';

export interface ResumoContagem {
  total: number;
  ativos: number;
  inativos: number;
}

export interface DashboardResumo {
  projetos: ResumoContagem;
  times: ResumoContagem;
  pessoas: ResumoContagem;
  produtos: ResumoContagem;
  prontidao: {
    produtos: number;
    regras: number;
    integracoes: number;
    documentos: number;
  };
}

export interface AtividadeItem {
  id: string;
  entityType: string;
  label: string;
  actorNome: string | null;
  ts: string;
}

export interface Pendencia {
  produtoId: string;
  projetoId: string;
  produtoNome: string;
  descricao: string;
  prioridade: 'Alta' | 'Média';
}

export interface PendenciasResponse {
  total: number;
  itens: Pendencia[];
}

export function useDashboardResumo() {
  return useQuery({
    queryKey: ['dashboard-resumo'],
    queryFn: () => httpClient.get<DashboardResumo>('/dashboard/resumo').then((r) => r.data),
  });
}

export function useAtividadeRecente(limit = 8) {
  return useQuery({
    queryKey: ['dashboard-atividade-recente', limit],
    queryFn: () => httpClient.get<AtividadeItem[]>('/dashboard/atividade-recente', { params: { limit } }).then((r) => r.data),
  });
}

export function usePendenciasDocumentacao(limit = 6) {
  return useQuery({
    queryKey: ['dashboard-pendencias', limit],
    queryFn: () => httpClient.get<PendenciasResponse>('/dashboard/pendencias', { params: { limit } }).then((r) => r.data),
  });
}
