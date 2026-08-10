import type { IconName } from '../Icon/Icon';
import { Icon } from '../Icon/Icon';
import { tokens } from '../tokens';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: IconName | React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

function renderIcon(icon: IconName | React.ReactNode) {
  if (typeof icon === 'string') return <Icon name={icon as IconName} size={15} stroke="var(--color-text-tertiary)" width={2} />;
  return icon;
}

/** Cabeçalho padrão de card: ícone/título/subtítulo à esquerda e ação à direita. */
export function SectionHeader({ title, subtitle, icon, action, onClick, style }: SectionHeaderProps) {
  return (
    <div
      className="dbc-section-header"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.space.md,
        padding: tokens.layout.cardPad,
        cursor: onClick ? 'pointer' : undefined,
        userSelect: onClick ? 'none' : undefined,
        ...style,
      }}
    >
      <div className="dbc-section-header__copy">
        <div className="dbc-section-header__title-row">
          {icon && (
            <span style={{ display: 'flex', flexShrink: 0 }} aria-hidden>
              {renderIcon(icon)}
            </span>
          )}
          <span className="dbc-text dbc-section-header__title" style={tokens.text.sectionTitle}>
            {title}
          </span>
        </div>
        {subtitle && (
          <div className="dbc-text-3 dbc-section-header__subtitle" style={tokens.text.caption}>
            {subtitle}
          </div>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
