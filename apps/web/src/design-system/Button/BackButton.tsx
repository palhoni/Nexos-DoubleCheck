import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { tokens } from '../tokens';
import { useDark } from '../hooks/useDark';

export interface BackButtonProps {
  onClick?: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export function BackButton({ onClick, label = 'Voltar', style = {} }: BackButtonProps) {
  const dark = useDark();
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 13,
        fontFamily: tokens.font,
        color: hover ? '#26537d' : dark ? 'rgba(255,255,255,.5)' : 'rgba(5,5,5,.45)',
        transition: 'color .15s',
        ...style,
      }}
    >
      <Icon name="arrowL" size={14} />
      {label}
    </button>
  );
}
