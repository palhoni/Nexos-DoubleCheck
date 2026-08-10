import { isAxiosError } from 'axios';
import { Badge, type StatusPreset } from '@/design-system';
import type { ColumnConfig, EntityConfig, OptionsSource, SelectOption } from './types';

export type ExtraOptions = Record<string, SelectOption[]>;

/** Normaliza uma lista estática ("Ativo", "Inativo", ...) para o formato {value,label}
 *  usado por listas dinâmicas (ex.: nomes de Time vindos de outra entidade). */
export function normalizeOptions(options: OptionsSource | undefined): SelectOption[] {
  if (!options) return [];
  return options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
}

export function resolveOptionLabel(rawValue: unknown, optionsFrom: string | undefined, extraOptions: ExtraOptions | undefined): string | undefined {
  if (!optionsFrom || rawValue == null) return undefined;
  const options = extraOptions?.[optionsFrom];
  return options?.find((o) => o.value === rawValue)?.label;
}

/** Mesmo propósito de resolveOptionLabel, mas para campos multiselect cujo valor gravado
 *  é um array de ids (ex.: moduloIds de uma Jornada) — resolve cada id para seu label,
 *  caindo no id bruto se não encontrado (ex.: registro relacionado já removido). */
export function resolveOptionLabels(rawValues: unknown, optionsFrom: string | undefined, extraOptions: ExtraOptions | undefined): string[] | undefined {
  if (!optionsFrom || !Array.isArray(rawValues)) return undefined;
  const options = extraOptions?.[optionsFrom];
  return rawValues.map((v) => options?.find((o) => o.value === v)?.label ?? String(v));
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (typeof data?.message === 'string') return data.message;
  }
  return 'Não foi possível completar a operação. Tente novamente.';
}

export function formatDateBR(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Formata datas YYYY-MM-DD sem deslocamento de fuso. */
export function formatDateOnlyBR(d?: string | Date | null): string {
  if (!d) return '—';
  if (typeof d === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return formatDateBR(d);
}

export function formatDateTimeBR(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDateBR(dt)} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

export function EntityStatusBadge<T extends { id: string }>({
  config,
  value,
  onToggle,
}: {
  config: EntityConfig<T>;
  value: string;
  onToggle?: () => void;
}) {
  const preset: StatusPreset = (config.statusPresets?.[value] as StatusPreset) ?? 'info';
  const clickable = config.inactivate?.mode === 'toggle' && !!onToggle;
  const badge = <Badge kind="status" preset={preset}>{value}</Badge>;
  if (!clickable) return badge;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      title="Clique para alternar o status"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {badge}
    </button>
  );
}

export function EntityChipList({ values }: { values: string[] }) {
  if (!values?.length) return <span className="dbc-text-3" style={{ fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {values.map((v) => (
        <span
          key={v}
          className="dbc-text-2"
          style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#fff8d9', border: '1px solid #f0ca35', color: '#6d5700' }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

export function renderEntityCell<T extends { id: string }>(row: T, col: ColumnConfig<T>, extraOptions?: ExtraOptions): React.ReactNode {
  const value = row[col.key] as unknown;
  if (typeof col.render === 'function') return col.render(row);
  if (col.render === 'chipList') {
    const resolved = resolveOptionLabels(value, col.optionsFrom, extraOptions);
    return <EntityChipList values={resolved ?? (Array.isArray(value) ? (value as string[]) : [])} />;
  }
  if (col.render === 'dateTime') return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTimeBR(value as string)}</span>;
  const resolved = resolveOptionLabel(value, col.optionsFrom, extraOptions);
  if (resolved != null) return resolved;
  if (value == null || value === '') return <span className="dbc-text-3">—</span>;
  return String(value);
}
