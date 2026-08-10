export const DOCUMENTO_STATUS = ['Rascunho', 'Revisao', 'Publicado', 'Arquivado'] as const;
export const DOCUMENTO_SORTABLE_FIELDS = ['titulo', 'codigo', 'tipo', 'status', 'versao', 'updatedAt', 'createdAt'] as const;
export const DOCUMENTO_ENTITY_TYPES = ['Projeto', 'Time', 'Pessoa', 'Produto', 'PublicoAlvo', 'Modulo', 'Funcionalidade', 'Jornada', 'Regra', 'Integracao'] as const;

export type DocumentoEntityType = (typeof DOCUMENTO_ENTITY_TYPES)[number];
