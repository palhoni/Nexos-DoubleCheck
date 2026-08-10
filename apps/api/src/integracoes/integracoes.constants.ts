export const STATUS_INTEGRACAO = ['Ativo', 'Inativo'] as const;

export const DIRECAO_INTEGRACAO = ['Entrada', 'Saída', 'Bidirecional'] as const;

export const TIPO_INTEGRACAO = ['API', 'Evento', 'Fila', 'Banco de Dados', 'Arquivo'] as const;

export const MODO_INTEGRACAO = ['Síncrona', 'Assíncrona'] as const;

export const CRITICIDADE_INTEGRACAO = ['Alta', 'Média', 'Baixa'] as const;

/** Papel que a dependência representa — ortogonal a `direcao` (sentido do dado) e `tipo`
 *  (mecanismo técnico): explica *por que* a integração existe. */
export const PAPEL_DEPENDENCIA_INTEGRACAO = ['Consulta', 'Notificação', 'Publicação-Assinatura', 'Delegação', 'Sincronização'] as const;

export const INTEGRACAO_SORTABLE_FIELDS = ['nome', 'status', 'criticidade', 'createdAt', 'updatedAt'] as const;
