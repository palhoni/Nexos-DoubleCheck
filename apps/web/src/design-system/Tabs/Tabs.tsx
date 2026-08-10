import { useEffect, useRef } from 'react';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /** `underline` para navegação secundária; `pill` para filtros/alternâncias. */
  variant?: 'underline' | 'pill';
  size?: 'sm' | 'md';
  /** Inset horizontal opcional da tira. */
  padX?: number;
  ariaLabel?: string;
}

/** Navegação por abas do Design System com rolagem horizontal e teclado completo
 *  (setas, Home e End). O foco acompanha a seleção para não deixar o usuário de teclado
 *  perdido em barras longas. */
export function Tabs({ items, value, onChange, variant = 'underline', size = 'md', padX = 0, ariaLabel = 'Abas' }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  function enabledIndexes() {
    return items.map((item, index) => (!item.disabled ? index : -1)).filter((index) => index >= 0);
  }

  function selectAndFocus(index: number) {
    const item = items[index];
    if (!item || item.disabled) return;
    onChange(item.key);
    requestAnimationFrame(() => buttonRefs.current[index]?.focus());
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const enabled = enabledIndexes();
    if (enabled.length === 0) return;

    if (event.key === 'Home') {
      event.preventDefault();
      selectAndFocus(enabled[0]);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      selectAndFocus(enabled[enabled.length - 1]);
      return;
    }

    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();

    const current = enabled.indexOf(index);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(current + direction + enabled.length) % enabled.length];
    selectAndFocus(next);
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`dbc-tabs dbc-tabs--${variant} dbc-tabs--${size}`}
      style={{ paddingInline: padX || undefined }}
    >
      {items.map((item, index) => {
        const active = item.key === value;

        return (
          <button
            key={item.key}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            tabIndex={active ? 0 : -1}
            className={`dbc-tab dbc-tab--${variant}${active ? ' dbc-tab--active' : ''}`}
            onClick={() => !item.disabled && onChange(item.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
