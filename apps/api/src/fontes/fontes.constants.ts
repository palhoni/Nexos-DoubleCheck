export const FONTE_STATUS = ['Ativa', 'Revisao', 'Inativa'] as const;
export const FONTE_SORTABLE_FIELDS = ['nome', 'tipo', 'status', 'oficial', 'ultimaVerificacao', 'updatedAt', 'createdAt'] as const;
export const FONTE_ENTITY_TYPES = ['Projeto', 'Time', 'Pessoa', 'Produto', 'PublicoAlvo', 'Modulo', 'Funcionalidade', 'Jornada', 'Regra', 'Integracao', 'Documento'] as const;

export type FonteEntityType = (typeof FONTE_ENTITY_TYPES)[number];
