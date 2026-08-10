import { EntityChipList, resolveOptionLabel, resolveOptionLabels, formatDateBR, type ExtraOptions } from './shared';
import type { EntityConfig, FieldConfig } from './types';

/** Extraído de EntityDetailPage — encontra a definição de um campo pela key, percorrendo
 *  todas as seções do formulário. Compartilhado pelas telas genéricas de detalhe. */
export function findFieldDef<T extends { id: string }>(config: EntityConfig<T>, key: string): FieldConfig<T> | undefined {
  for (const section of config.form.sections) {
    const f = section.fields.find((f) => f.key === key);
    if (f) return f;
  }
  return undefined;
}

/** Renderiza o valor de um campo genérico conforme seu `type` — mesma lógica usada tanto na
 *  grade "Visão Geral" das telas de detalhe. */
export function FieldValue<T extends { id: string }>({ field, value, extraOptions }: { field: FieldConfig<T>; value: unknown; extraOptions?: ExtraOptions }) {
  const resolved = resolveOptionLabel(value, field.optionsFrom, extraOptions);
  if (resolved != null) return <span>{resolved}</span>;
  if (field.type === 'boolean') return <span>{value ? 'Sim' : 'Não'}</span>;
  if (field.type === 'multiselect') {
    const resolvedLabels = resolveOptionLabels(value, field.optionsFrom, extraOptions);
    return <EntityChipList values={resolvedLabels ?? (Array.isArray(value) ? (value as string[]) : [])} />;
  }
  if (field.type === 'date') return <span>{value ? formatDateBR(value as string) : '—'}</span>;
  if (field.type === 'textarea') return <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{(value as string) || '—'}</span>;
  return <span>{value || value === 0 ? String(value) : '—'}</span>;
}
