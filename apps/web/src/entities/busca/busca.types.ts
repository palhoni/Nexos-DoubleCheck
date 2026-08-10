export type GlobalSearchType =
  | 'Projeto' | 'Time' | 'Pessoa' | 'Produto' | 'PublicoAlvo' | 'Modulo'
  | 'Funcionalidade' | 'Jornada' | 'Regra' | 'Integracao' | 'Fonte' | 'Documento';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchType;
  title: string;
  code: string | null;
  status: string | null;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  productId: string | null;
  productName: string | null;
  route: string;
  updatedAt: string | null;
  meta: Record<string, string | number | boolean | null>;
}

export interface GlobalSearchResponse {
  query: string;
  projectId: string | null;
  results: GlobalSearchResult[];
  counts: Record<string, number>;
  total: number;
  types: GlobalSearchType[];
}
