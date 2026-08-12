import { Icon, type IconName } from '../Icon/Icon';
import { useDark } from '../hooks/useDark';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

const THEME: Record<AlertType, { icon: IconName; c: string; bg: string; bdr: string; title: string; msg: string; bgD: string; bdrD: string }> = {
  success: { icon: 'check', c: '#52c41a', bg: '#f6ffed', bdr: '#b7eb8f', title: '#135200', msg: '#237804', bgD: 'rgba(82,196,26,.08)', bdrD: 'rgba(82,196,26,.3)' },
  error: { icon: 'error', c: '#ff4d4f', bg: '#fff2f0', bdr: '#ffa39e', title: '#820014', msg: '#a8071a', bgD: 'rgba(255,77,79,.08)', bdrD: 'rgba(255,77,79,.3)' },
  warning: { icon: 'warning', c: '#faad14', bg: '#fffbe6', bdr: '#ffe58f', title: '#613400', msg: '#7c4a00', bgD: 'rgba(250,173,20,.08)', bdrD: 'rgba(250,173,20,.3)' },
  info: { icon: 'info', c: '#306ba1', bg: '#eff5fa', bdr: '#9dc1e2', title: '#1b3c5a', msg: '#26537d', bgD: 'rgba(59,130,196,.10)', bdrD: 'rgba(59,130,196,.28)' },
};

export interface AlertProps {
  type?: AlertType;
  title?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Alert({ type = 'info', title, children, style = {} }: AlertProps) {
  const dark = useDark();
  const t = THEME[type];
  return (
    <div
      style={{
        background: dark ? t.bgD : t.bg,
        border: `1px solid ${dark ? t.bdrD : t.bdr}`,
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        ...style,
      }}
    >
      <Icon name={t.icon} size={16} stroke={t.c} style={{ marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 13, fontWeight: 600, color: dark ? t.c : t.title, marginBottom: 2, lineHeight: 1.3 }}>{title}</div>}
        {children && <div style={{ fontSize: 12, color: dark ? t.c : t.msg, lineHeight: 1.5 }}>{children}</div>}
      </div>
    </div>
  );
}
