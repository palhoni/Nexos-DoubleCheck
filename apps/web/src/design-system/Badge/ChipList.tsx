import { tokens } from '../tokens';

export interface ChipListProps {
  values: string[];
  emptyText?: string;
}

/** Lista de valores em formato de chip (pill azul claro) — versão pura, sem conhecimento
 *  de `EntityConfig`. `EntityChipList` (entities/crud/shared.tsx) delega pra esta. */
export function ChipList({ values, emptyText = '—' }: ChipListProps) {
  if (!values?.length) {
    return (
      <span className="dbc-text-3" style={{ fontSize: 12 }}>
        {emptyText}
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {values.map((v) => (
        <span
          key={v}
          className="dbc-text-2"
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: tokens.radius.pill,
            background: '#fff8d9',
            border: '1px solid #f0ca35',
            color: '#6d5700',
          }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}
