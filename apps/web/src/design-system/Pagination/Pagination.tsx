import { tokens } from '../tokens';

export interface PaginationProps {
  page: number;
  total: number;
  onChange: (page: number) => void;
  style?: React.CSSProperties;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/** Janela de páginas com reticências (1 … 4 5 [6] 7 8 … 50) em vez de um botão por página —
 *  sem isso, listas com muitas páginas estouram a largura do card horizontalmente. */
function buildPageWindow(page: number, total: number, siblings = 1): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: PageItem[] = [1];
  const start = Math.max(2, page - siblings);
  const end = Math.min(total - 1, page + siblings);
  if (start > 2) items.push('ellipsis-start');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push('ellipsis-end');
  items.push(total);
  return items;
}

export function Pagination({ page = 1, total = 1, onChange, style = {} }: PaginationProps) {
  function go(p: number) {
    if (p >= 1 && p <= total && p !== page) onChange(p);
  }

  function cell(active: boolean, content: string, target: number, disabled: boolean) {
    return (
      <button
        type="button"
        key={`${content}-${target}`}
        onClick={() => !disabled && go(target)}
        disabled={disabled}
        style={{
          minWidth: 30,
          height: 30,
          padding: '0 6px',
          borderRadius: 6,
          border: `1px solid ${active ? '#141414' : 'var(--color-border)'}`,
          background: active ? '#141414' : 'transparent',
          color: active ? '#ffcc00' : disabled ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)',
          fontSize: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: tokens.font,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </button>
    );
  }

  const items = buildPageWindow(page, total);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', ...style }}>
      {cell(false, '‹', page - 1, page <= 1)}
      {items.map((it) =>
        typeof it === 'number' ? (
          cell(it === page, String(it), it, false)
        ) : (
          <span key={it} style={{ width: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            …
          </span>
        ),
      )}
      {cell(false, '›', page + 1, page >= total)}
    </div>
  );
}
