import { useDark } from '../hooks/useDark';

export type IconTileSize = 'sm' | 'md' | 'lg';
export type IconTileTone = 'neutral' | 'primary' | { color: string; bg: string };

const SIZE_PX: Record<IconTileSize, number> = { sm: 28, md: 32, lg: 44 };
const RADIUS_PX: Record<IconTileSize, number> = { sm: 8, md: 8, lg: 12 };

export interface IconTileProps {
  size?: IconTileSize;
  shape?: 'square' | 'circle';
  tone?: IconTileTone;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Tile de ícone com tamanho/tone consistentes — substitui os 4 tamanhos/radius diferentes
 *  hoje espalhados pelo HomePage (44/r10, 34/r50%, 32/r8, 28/r50%). */
export function IconTile({ size = 'md', shape = 'square', tone = 'neutral', children, style }: IconTileProps) {
  const dark = useDark();
  const px = SIZE_PX[size];
  const resolved = typeof tone === 'string' ? { color: tone === 'primary' ? 'var(--color-primary)' : '#4a4a4a', bg: dark ? 'var(--color-fill-secondary)' : tone === 'primary' ? 'var(--dbc-blue-1)' : '#f1f1f1' } : tone;
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: shape === 'circle' ? '50%' : RADIUS_PX[size],
        background: resolved.bg,
        color: resolved.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
