import { Icon, type IconName } from '../Icon/Icon';
import { AddButton } from '../Button/AddButton';
import { useDark } from '../hooks/useDark';

export interface EmptyStateProps {
  title?: string;
  message?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  style?: React.CSSProperties;
}

export function EmptyState({ title = 'Nenhum item encontrado', message, description, actionLabel, onAction, icon = 'box', style = {} }: EmptyStateProps) {
  const dark = useDark();
  const subtleBg = dark ? 'var(--color-bg-subtle)' : '#f8f9fb';
  const subtleBdr = dark ? 'var(--color-border)' : '#eaecef';
  return (
    <div style={{ padding: '40px 20px', borderRadius: 8, textAlign: 'center', background: subtleBg, border: `1px dashed ${subtleBdr}`, ...style }}>
      <Icon name={icon} size={44} width={1.3} stroke={dark ? 'var(--color-text-tertiary)' : 'rgba(0,0,0,.2)'} style={{ marginBottom: 12, display: 'inline-block' }} />
      <div className="dbc-text" style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        {title}
      </div>
      {(message ?? description) && (
        <div className="dbc-text-2" style={{ fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
          {message ?? description}
        </div>
      )}
      {actionLabel && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AddButton onClick={onAction}>{actionLabel}</AddButton>
        </div>
      )}
    </div>
  );
}
