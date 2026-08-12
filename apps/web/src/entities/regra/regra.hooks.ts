import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import { createEntityHooks } from '@/entities/crud/createEntityHooks';
import { REGRA_CONFIG } from './regra.config';
import type { Regra, RegraVersaoResumo } from './regra.types';

export const regraHooks = createEntityHooks<Regra>(REGRA_CONFIG);

/** Lista resumida de todas as versões do mesmo grupo da regra — não faz parte do
 *  scaffold genérico porque versionamento é uma capacidade específica de Regra. */
export function useVersoesRegra(id: string | undefined, produtoId: string | undefined) {
  return useQuery({
    queryKey: ['regras', produtoId, 'versoes', id],
    queryFn: () => httpClient.get<RegraVersaoResumo[]>(`/produtos/${produtoId}/regras/${id}/versoes`).then((r) => r.data),
    enabled: id != null && produtoId != null,
  });
}

export function useCriarNovaVersaoRegra(produtoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => httpClient.post<Regra>(`/produtos/${produtoId}/regras/${id}/nova-versao`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regras', produtoId] }),
  });
}

export interface RegrasResumo {
  total: number;
}

/** Total de regras vigentes do projeto (somando todos os produtos) — usado pelo
 *  SetupStepper para saber se a etapa "Regras" já tem dado real, sem depender de navegação. */
export function useRegrasResumo(projetoId: string | undefined) {
  return useQuery({
    queryKey: ['regras', 'resumo', projetoId],
    queryFn: () => httpClient.get<RegrasResumo>('/regras/resumo', { params: { projetoId } }).then((r) => r.data),
    enabled: !!projetoId,
  });
}
