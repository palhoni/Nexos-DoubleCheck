import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';

export interface MaturidadeCategoria {
  chave: string;
  label: string;
  percentual: number;
}

export interface MaturidadeProduto {
  produtoId: string;
  categorias: MaturidadeCategoria[];
  geral: number;
  estabilidadeStatus: string;
  estabilidadeObservacao: string | null;
}

export function useMaturidadeProduto(projetoId: string | undefined, produtoId: string | undefined) {
  return useQuery({
    queryKey: ['produtos', projetoId, 'maturidade', produtoId],
    queryFn: () => httpClient.get<MaturidadeProduto>(`/projetos/${projetoId}/produtos/${produtoId}/maturidade`).then((r) => r.data),
    enabled: !!projetoId && !!produtoId,
  });
}
