import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';

export interface IntegracaoGlobal {
  id: string;
  nome: string;
  status: 'Ativo' | 'Inativo';
  direcao: string | null;
  papelDependencia: string | null;
  tipo: string | null;
  modo: string | null;
  criticidade: string | null;
  dadosTrafegados: string | null;
  updatedAt: string;
  timeProprietarioId: string | null;
  timeProprietario: { id: string; nome: string } | null;
  produtoId: string;
  produto: { nome: string; projetoId: string; projeto: { nome: string } };
  produtoRelacionadoId: string | null;
  produtoRelacionado: { nome: string; projetoId: string; projeto: { nome: string } } | null;
  funcionalidades: { id: string; nome: string }[];
}

/** Lista todas as Integrações de todos os Produtos/Projetos — usada pelo mapa visual. */
export function useAllIntegracoes() {
  return useQuery({
    queryKey: ['integracoes-global'],
    queryFn: () => httpClient.get<IntegracaoGlobal[]>('/integracoes').then((r) => r.data),
  });
}
