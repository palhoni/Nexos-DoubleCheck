import { useContainerWidth } from '../hooks/useContainerWidth';
import { tokens } from '../tokens';

export interface PageGridProps {
  /** Coluna principal. */
  children: React.ReactNode;
  /** Coluna direita opcional. Em larguras menores ela é empilhada — nunca descartada. */
  rail?: React.ReactNode;
  railBreakpoint?: number;
  gap?: number;
  style?: React.CSSProperties;
}

/**
 * Layout de página com conteúdo principal + painel lateral opcional (`RightRail`).
 * A decisão é baseada na largura do CONTÊINER. Em modo estreito o rail cai abaixo do
 * conteúdo, preservando informações e ações importantes em vez de simplesmente sumir.
 */
export function PageGrid({ children, rail, railBreakpoint = tokens.layout.railBreakpoint, gap = tokens.layout.pageGridGap, style }: PageGridProps) {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const twoColumns = !!rail && (width === 0 || width >= railBreakpoint);

  return (
    <div
      ref={ref}
      className={`setup-page-grid${twoColumns ? ' setup-page-grid--two-columns' : ' setup-page-grid--stacked'}`}
      style={{
        gridTemplateColumns: twoColumns ? `minmax(0, 1fr) ${tokens.layout.railWidth}` : 'minmax(0, 1fr)',
        gap,
        ...style,
      }}
    >
      <div className="setup-page-grid__main" style={{ gap: tokens.space.md }}>
        {children}
      </div>
      {rail && <div className="setup-page-grid__rail">{rail}</div>}
    </div>
  );
}
