import { createElement } from 'react';
import type { IconName } from '../Icon/Icon';
import { SectionHeader } from './SectionHeader';
import { tokens } from '../tokens';

export type SectionCardPadding = 'default' | 'compact' | 'none';
export type SectionCardElevation = 'none' | 'xs' | 'sm';
export type SectionCardTone = 'container' | 'subtle' | 'dashed';

const BODY_PADDING: Record<SectionCardPadding, string> = {
  default: tokens.layout.cardPad,
  compact: tokens.layout.cardPadCompact,
  none: '0',
};

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: IconName | React.ReactNode;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onHeaderClick?: () => void;
  /** Mostra a linha divisória entre header e corpo. Default: true quando há título. */
  divider?: boolean;
  padding?: SectionCardPadding;
  elevation?: SectionCardElevation;
  tone?: SectionCardTone;
  as?: 'section' | 'div' | 'aside' | 'article';
  bodyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  /** Torna o card inteiro clicável. O card recebe suporte de teclado automaticamente. */
  onClick?: () => void;
  /** Nome acessível recomendado quando o card inteiro é clicável. */
  ariaLabel?: string;
  children?: React.ReactNode;
}

/** Anatomia única de card do app: header opcional + divisor + corpo. A superfície é
 *  controlada pelos tokens do Design System e cards clicáveis são acessíveis por teclado. */
export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  actions,
  className: customClassName,
  onHeaderClick,
  divider,
  padding = 'default',
  elevation = 'xs',
  tone = 'container',
  as = 'section',
  bodyStyle,
  style,
  onClick,
  ariaLabel,
  children,
}: SectionCardProps) {
  const resolvedAction = action ?? actions;
  const hasHeader = !!(title || resolvedAction);
  const showDivider = divider ?? hasHeader;
  const className = `${tone === 'subtle' ? 'dbc-card-subtle' : 'dbc-card'} dbc-section-card${onClick ? ' dbc-section-card--clickable' : ''}${customClassName ? ` ${customClassName}` : ''}`;

  const surface: React.CSSProperties =
    tone === 'subtle'
      ? { background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-secondary)' }
      : { background: 'var(--color-bg-container)', border: `1px ${tone === 'dashed' ? 'dashed' : 'solid'} var(--color-border-secondary)` };

  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': ariaLabel,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onClick();
        },
      }
    : {};

  return createElement(
    as,
    {
      className,
      onClick,
      ...interactiveProps,
      style: {
        ...surface,
        borderRadius: tokens.layout.cardRadius,
        boxShadow: tokens.shadow[elevation],
        display: 'flex',
        flexDirection: 'column',
        ...style,
      },
    },
    <>
      {hasHeader && <SectionHeader title={title} subtitle={subtitle} icon={icon} action={resolvedAction} onClick={onHeaderClick} />}
      {showDivider && <div className="dbc-divider dbc-section-card__divider" />}
      {children != null && (
        <div className="dbc-section-card__body" style={{ padding: BODY_PADDING[padding], ...bodyStyle }}>
          {children}
        </div>
      )}
    </>,
  );
}
