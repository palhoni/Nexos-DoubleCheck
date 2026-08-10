import { tokens } from '../tokens';

export interface ProgressRowProps {
  label: React.ReactNode;
  /** 0–100 */
  percent: number;
  /** O que mostrar à direita — default `${percent}%`. */
  valueLabel?: React.ReactNode;
  color?: string;
  labelWidth?: number;
  valueWidth?: number;
  height?: number;
}

/** Linha de barra de progresso — unifica `ProgressRow` (Visão Geral) e `BarraCategoria`
 *  (Maturidade), que hoje são a mesma ideia com largura de label e altura de barra
 *  ligeiramente diferentes. A cor da barra é decidida pelo caller (ex.: Maturidade calcula
 *  verde/âmbar/vermelho por faixa), este componente só desenha. */
export function ProgressRow({ label, percent, valueLabel, color = '#ffcc00', labelWidth = 150, valueWidth = 38, height = 8 }: ProgressRowProps) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        className="dbc-text-2"
        title={typeof label === 'string' ? label : undefined}
        style={{ width: labelWidth, flexShrink: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {label}
      </div>
      <div style={{ flex: 1, height, borderRadius: tokens.radius.pill, background: 'var(--color-border-secondary)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: tokens.radius.pill, transition: 'width .3s' }} />
      </div>
      <div className="dbc-text" style={{ width: valueWidth, textAlign: 'right', fontSize: 12.5, fontWeight: 600 }}>
        {valueLabel ?? `${pct}%`}
      </div>
    </div>
  );
}
