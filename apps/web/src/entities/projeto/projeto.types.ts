export const STATUS_PROJETO_LIST = ['Ativo', 'Planejamento', 'Inativo'] as const;
export type StatusProjeto = (typeof STATUS_PROJETO_LIST)[number];

export const AREAS_NEGOCIO_LIST = ['Produto', 'Tecnologia', 'Operações', 'Comercial', 'Jurídico', 'Dados & IA', 'Financeiro'] as const;
export type AreaNegocio = (typeof AREAS_NEGOCIO_LIST)[number];

export const IDIOMAS_LIST = ['Português', 'Inglês', 'Espanhol'] as const;
export type Idioma = (typeof IDIOMAS_LIST)[number];

export interface Projeto {
  id: string;
  nome: string;
  codigo: string;
  status: StatusProjeto;
  descricao?: string | null;
  objetivo?: string | null;
  areaNegocio?: AreaNegocio | null;
  idiomas: Idioma[];
  dataInicio?: string | null;
  responsavelPrincipal?: string | null;
  jiraRef?: string | null;
  confluenceRef?: string | null;
  observacoes?: string | null;
  paisesDisponiveis: string[];
  fontesGerais: string[];
  createdAt: string;
  updatedAt: string;
}
