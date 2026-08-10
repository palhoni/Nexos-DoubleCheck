import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';

export interface EcossistemaProjetoNode {
  id: string;
  nome: string;
  codigo: string;
  status: 'Ativo' | 'Planejamento' | 'Inativo';
  areaNegocio: string | null;
  principal: boolean;
}

export interface EcossistemaProdutoRef {
  id: string;
  nome: string;
  codigo: string;
  projetoId: string;
  projetoNome: string;
}

export interface EcossistemaConexao {
  id: string;
  nome: string;
  status: 'Ativo' | 'Inativo';
  tipo: string | null;
  modo: string | null;
  criticidade: string | null;
  direcao: string | null;
  papelDependencia: string | null;
  dadosTrafegados: string | null;
  origem: EcossistemaProdutoRef;
  destino: EcossistemaProdutoRef;
  crossProject: boolean;
}

export interface ProjetoEcossistema {
  projeto: EcossistemaProjetoNode;
  projetosRelacionados: EcossistemaProjetoNode[];
  conexoes: EcossistemaConexao[];
  resumo: {
    totalConexoes: number;
    conexoesCrossProject: number;
    projetosRelacionados: number;
    produtosDoProjetoConectados: number;
    entradas: number;
    saidas: number;
    altaCriticidade: number;
  };
}

export function useProjetoEcossistema(projetoId?: string) {
  return useQuery({
    queryKey: ['projeto-ecossistema', projetoId],
    enabled: !!projetoId,
    queryFn: () => httpClient.get<ProjetoEcossistema>(`/projetos/${projetoId}/ecossistema`).then((r) => r.data),
  });
}
