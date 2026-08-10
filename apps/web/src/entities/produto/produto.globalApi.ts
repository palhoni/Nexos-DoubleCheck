import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';

export interface ProdutoGlobal {
  id: string;
  nome: string;
  codigo: string;
  status: 'Ativo' | 'Planejamento' | 'Inativo';
  projetoId: string;
  createdAt: string;
  projeto: { nome: string };
  timeResponsavel: { id: string; nome: string; pessoas: { id: string; nome: string }[] } | null;
}

/** Lista Produtos de qualquer Projeto — usado por seletores cross-projeto,
 *  ex.: "produtos participantes" de uma Jornada. */
export function useAllProdutos() {
  return useQuery({
    queryKey: ['produtos-global'],
    queryFn: () => httpClient.get<ProdutoGlobal[]>('/produtos').then((r) => r.data),
  });
}
