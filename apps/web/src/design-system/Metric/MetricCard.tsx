import { SectionCard } from '../Card/SectionCard';
import { IconTile } from '../Avatar/IconTile';
import { tokens } from '../tokens';

export interface MetricCardLegendItem {
  label: string;
  value: React.ReactNode;
  dotColor?: string;
}

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  legend?: MetricCardLegendItem[];
  onClick?: () => void;
  loading?: boolean;
  minWidth?: number;
  style?: React.CSSProperties;
}

/** Card de indicador — substitui o `StatCard` local do HomePage e o cartão de indicador da
 *  Visão Geral (paddings/fontes hoje distintos entre os dois). */
export function MetricCard({ label, value, hint, icon, legend, onClick, loading, minWidth = 190, style }: MetricCardProps) {
  return (
    <SectionCard padding="compact" onClick={onClick} style={{ flex: 1, minWidth, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {icon && <IconTile size="lg" tone="primary">{icon}</IconTile>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dbc-text-2" style={{ ...tokens.text.caption, fontWeight: 600, marginBottom: 2 }}>
            {label}
          </div>
          <div className="dbc-text" style={{ ...tokens.text.metric, marginBottom: legend?.length ? 3 : 0 }}>
            {loading ? '—' : value}
          </div>
          {hint && <div className="dbc-text-3" style={{ fontSize: 11 }}>{hint}</div>}
          {legend && legend.length > 0 && (
            <div className="dbc-text-2" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
              {legend.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.dotColor ?? 'rgba(120,120,120,.5)', flexShrink: 0 }} />
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
