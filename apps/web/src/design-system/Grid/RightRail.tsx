import { tokens } from '../tokens';

export interface RightRailProps {
  children: React.ReactNode;
  /** Acompanha o scroll apenas quando o PageGrid está em duas colunas. */
  sticky?: boolean;
  gap?: number;
  style?: React.CSSProperties;
}

export function RightRail({ children, sticky = false, gap = tokens.space.md, style }: RightRailProps) {
  return (
    <aside
      className="setup-right-rail"
      style={{
        gap,
        ...(sticky ? { position: 'sticky', top: tokens.space.md } : undefined),
        ...style,
      }}
    >
      {children}
    </aside>
  );
}
