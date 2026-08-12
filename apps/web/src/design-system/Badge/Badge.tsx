export type BadgeKind = 'status' | 'category' | 'solid';
export type StatusPreset = 'ativo' | 'sucesso' | 'pendente' | 'erro' | 'inativo' | 'neutral' | 'analise' | 'info';

export const STATUS_PRESETS: Record<StatusPreset, { color: string; bg: string; border: string }> = {
  ativo: { color: '#389e0d', bg: 'rgba(82,196,26,.12)', border: 'rgba(82,196,26,.3)' },
  sucesso: { color: '#389e0d', bg: 'rgba(82,196,26,.12)', border: 'rgba(82,196,26,.3)' },
  pendente: { color: '#d48806', bg: 'rgba(250,173,20,.12)', border: 'rgba(250,173,20,.35)' },
  erro: { color: '#cf1322', bg: 'rgba(255,77,79,.12)', border: 'rgba(255,77,79,.35)' },
  inativo: { color: 'rgba(0,0,0,.45)', bg: 'rgba(0,0,0,.05)', border: 'rgba(0,0,0,.12)' },
  neutral: { color: 'rgba(0,0,0,.45)', bg: 'rgba(0,0,0,.05)', border: 'rgba(0,0,0,.12)' },
  analise: { color: '#531dab', bg: 'rgba(114,46,209,.1)', border: 'rgba(114,46,209,.25)' },
  info: { color: '#26537d', bg: '#eff5fa', border: '#9dc1e2' },
};

export interface BadgeProps {
  kind?: BadgeKind;
  preset?: StatusPreset;
  color?: string;
  bg?: string;
  border?: string;
  dot?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge({ kind = 'status', preset, color, bg, border, dot, children, style = {} }: BadgeProps) {
  const p = preset ? STATUS_PRESETS[preset] : null;
  const c = color || p?.color || '#26537d';
  const b = bg || p?.bg || '#eff5fa';
  const bd = border || p?.border || '#9dc1e2';

  if (kind === 'solid') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: 4,
          background: bg || c,
          color: color || '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.05em',
          ...style,
        }}
      >
        {children}
      </span>
    );
  }

  if (kind === 'category') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 20,
          background: b,
          color: c,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '.02em',
          ...style,
        }}
      >
        {children}
      </span>
    );
  }

  const showDot = dot !== false;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        background: b,
        border: `1px solid ${bd}`,
        fontSize: 12,
        fontWeight: 500,
        color: c,
        ...style,
      }}
    >
      {showDot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
