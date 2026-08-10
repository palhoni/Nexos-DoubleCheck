export const STATUS_PROJETO = ['Ativo', 'Planejamento', 'Inativo'] as const;
export type StatusProjeto = (typeof STATUS_PROJETO)[number];

export const AREAS_NEGOCIO = [
  'Produto',
  'Tecnologia',
  'Operações',
  'Comercial',
  'Jurídico',
  'Dados & IA',
  'Financeiro',
] as const;
export type AreaNegocio = (typeof AREAS_NEGOCIO)[number];

export const IDIOMAS = ['Português', 'Inglês', 'Espanhol'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const PROJETO_SORTABLE_FIELDS = [
  'nome',
  'codigo',
  'status',
  'areaNegocio',
  'responsavelPrincipal',
  'dataInicio',
  'createdAt',
  'updatedAt',
] as const;
