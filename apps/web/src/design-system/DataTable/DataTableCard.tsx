import { useContainerWidth } from '../hooks/useContainerWidth';
import { SectionCard } from '../Card/SectionCard';
import { tokens } from '../tokens';

export interface RowActionButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

/** Botão canônico de ação de linha. O estado visual é resolvido por CSS e o nome
 *  acessível é sempre derivado de `title`. */
export function RowActionButton({ onClick, title, children }: RowActionButtonProps) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} className="dbc-row-action-button">
      {children}
    </button>
  );
}

export interface DataTableColumn<T> {
  key: string;
  label?: React.ReactNode;
  header?: React.ReactNode;
  minWidth?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  primary?: boolean;
  render: (row: T) => React.ReactNode;
  /** Impede que o clique nesta célula dispare `onRowClick` (ex.: badge de status, ações). */
  stopRowClick?: boolean;
}

export type DataTableDensity = 'comfortable' | 'default' | 'compact';

export interface DataTableCardProps<T> {
  columns: DataTableColumn<T>[];
  rows?: T[];
  data?: T[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  rowKey: (row: T) => string;
  density?: DataTableDensity;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  toolbar?: React.ReactNode;
  /** Renderiza cada linha como um bloco empilhado abaixo de `narrowAt` px de contêiner. */
  narrowRender?: (row: T) => React.ReactNode;
  narrowAt?: number;
  /** Nome acessível da tabela. Útil quando uma página possui mais de uma tabela. */
  ariaLabel?: string;
}

/** Tabela padrão do app com estados acessíveis, ordenação por botão e navegação de linha
 *  por teclado. Mantém a mesma API pública usada pelas telas atuais. */
export function DataTableCard<T>({
  columns,
  rows: rowsProp,
  data,
  title,
  subtitle,
  rowKey,
  density = 'default',
  sortBy,
  sortDir = 'asc',
  onSort,
  onRowClick,
  rowActions,
  loading,
  empty,
  footer,
  toolbar,
  narrowRender,
  narrowAt = 560,
  ariaLabel = 'Tabela de dados',
}: DataTableCardProps<T>) {
  const rows = rowsProp ?? data ?? [];
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const isNarrow = narrowRender != null && width > 0 && width < narrowAt;
  const cellPad = tokens.layout.tableCell[density];

  function activateRow(row: T, event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onRowClick(row);
  }

  return (
    <div ref={ref} className="dbc-data-table-shell" aria-busy={loading || undefined}>
      <SectionCard padding="none" title={title} subtitle={subtitle}>
        {toolbar}

        {loading ? (
          <div className="dbc-data-table-state" role="status" aria-live="polite">
            Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="dbc-data-table-empty">{empty}</div>
        ) : isNarrow ? (
          <div className="dbc-data-table-narrow" role="list" aria-label={ariaLabel}>
            {rows.map((row) => (
              <div key={rowKey(row)} className="dbc-data-table-narrow__item" role="listitem">
                {narrowRender!(row)}
              </div>
            ))}
          </div>
        ) : (
          <div className="dbc-data-table-scroll" tabIndex={0} aria-label={`Área rolável — ${ariaLabel}`}>
            <table className="dbc-data-table" aria-label={ariaLabel}>
              <thead>
                <tr>
                  {columns.map((col) => {
                    const active = sortBy === col.key;
                    const canSort = col.sortable !== false && !!onSort;
                    const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={canSort ? ariaSort : undefined}
                        style={{ textAlign: col.align ?? 'left', minWidth: col.minWidth, width: col.width, padding: cellPad }}
                        className={active ? 'dbc-data-table__head dbc-data-table__head--active' : 'dbc-data-table__head'}
                      >
                        {canSort ? (
                          <button
                            type="button"
                            className="dbc-data-table__sort"
                            onClick={() => onSort!(col.key)}
                            style={{ appearance: 'none', WebkitAppearance: 'none', border: 0, background: 'transparent', boxShadow: 'none' }}
                          >
                            <span>{col.label ?? col.header}</span>
                            <svg
                              aria-hidden="true"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3}
                              strokeLinecap="round"
                              className={`dbc-data-table__sort-icon${active ? ' dbc-data-table__sort-icon--active' : ''}${active && sortDir === 'desc' ? ' dbc-data-table__sort-icon--desc' : ''}`}
                            >
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                        ) : (
                          <span className="dbc-data-table__label">{col.label ?? col.header}</span>
                        )}
                      </th>
                    );
                  })}
                  {rowActions && <th scope="col" className="dbc-data-table__head dbc-data-table__head--actions" aria-label="Ações" />}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={onRowClick ? 'dbc-data-table-row dbc-data-table-row--clickable' : 'dbc-data-table-row'}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (event) => activateRow(row, event) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{ padding: cellPad, textAlign: col.align ?? 'left' }}
                        className={`${col.primary ? 'dbc-text' : 'dbc-text-2'} dbc-data-table__cell`}
                        onClick={col.stopRowClick ? (event) => event.stopPropagation() : undefined}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="dbc-data-table__cell dbc-data-table__cell--actions" style={{ padding: cellPad }} onClick={(event) => event.stopPropagation()}>
                        <div className="dbc-data-table__actions">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {footer && rows.length > 0 && <div className="dbc-data-table-footer">{footer}</div>}
      </SectionCard>
    </div>
  );
}
