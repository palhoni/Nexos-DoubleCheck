export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'boolean' | 'number';

export interface SelectOption {
  value: string;
  label: string;
}

/** Lista estática (mesmo texto = valor e label) ou lista de {value,label} — usada
 *  quando o valor gravado (ex.: um id) é diferente do texto exibido (ex.: nome). */
export type OptionsSource = readonly string[] | readonly SelectOption[];

export interface BaseField<T> {
  key: keyof T & string;
  label: string;
  required?: boolean;
  colSpan?: 1 | 2;
  readOnly?: boolean;
  badge?: string;
  placeholder?: string;
  hint?: string;
  /** Chave em `extraOptions` (passado pela página) de onde vêm as opções dinamicamente —
   *  usado para campos que referenciam outra entidade (ex.: Time de uma Pessoa). */
  optionsFrom?: string;
}

export type FieldConfig<T> =
  | (BaseField<T> & { type: 'text' | 'textarea' | 'date' | 'boolean' | 'number' })
  | (BaseField<T> & { type: 'select'; options?: OptionsSource })
  | (BaseField<T> & { type: 'multiselect'; options?: OptionsSource });

export interface FormSection<T> {
  title: string;
  fields: FieldConfig<T>[];
}

export type ColumnRender<T> = 'statusBadge' | 'chipList' | 'dateTime' | ((row: T) => React.ReactNode);

export interface ColumnConfig<T> {
  key: keyof T & string;
  label: string;
  primary?: boolean;
  minWidth?: number;
  hideBelow?: 'compact' | 'wide';
  sortable?: boolean;
  render?: ColumnRender<T>;
  /** Mesmo propósito de BaseField.optionsFrom, mas para resolver o label na coluna da lista. */
  optionsFrom?: string;
}

export interface FilterConfig<T> {
  key: keyof T & string;
  label: string;
  type: 'text' | 'select';
  options?: readonly string[];
  placeholder?: string;
}

export type DetailTab<T> =
  | { key: string; label: string; kind: 'genericFields'; fields: (keyof T & string)[] }
  | { key: string; label: string; kind: 'simpleList'; field: keyof T & string; subResource?: string }
  | { key: string; label: string; kind: 'history' }
  | { key: string; label: string; kind: 'bespoke'; component: string };

export interface EntityConfig<T extends { id: string }> {
  key: string;
  label: { singular: string; plural: string };
  /** Entidades de topo usam uma string fixa; entidades escopadas (ex.: Times por Projeto)
   *  recebem uma função que monta a rota a partir do scopeId (ex.: projetoId). */
  endpoint: string | ((scopeId: string) => string);
  /** Documenta o que o scopeId representa (ex.: "projetoId") — só para leitura humana. */
  scopedBy?: string;
  idField: keyof T & string;

  list: {
    columns: ColumnConfig<T>[];
    filters: FilterConfig<T>[];
  };

  statusField?: keyof T & string;
  statusPresets?: Record<string, 'ativo' | 'sucesso' | 'pendente' | 'erro' | 'inativo' | 'analise' | 'info'>;
  inactivate?: { mode: 'toggle'; activeValue: string; inactiveValue: string };

  form: {
    title: { create: string; edit: string };
    sections: FormSection<T>[];
  };

  detail?: {
    header: { title: (row: T) => string; badges?: { field: keyof T & string }[] };
    shell?: {
      fixedHeaderFields?: { key: string; label: string }[];
      tabs: DetailTab<T>[];
    };
  };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface HistoryEntryDto {
  label: string;
  ts: string;
  actorUserId: string | null;
  actorNome?: string | null;
}
