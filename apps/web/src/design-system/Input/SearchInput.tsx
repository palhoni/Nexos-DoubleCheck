import { Icon } from '../Icon/Icon';
import { tokens } from '../tokens';
import { useDark } from '../hooks/useDark';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  style?: React.CSSProperties;
  wrapStyle?: React.CSSProperties;
}

export function SearchInput({ placeholder = 'Buscar...', style = {}, wrapStyle = {}, ...rest }: SearchInputProps) {
  const dark = useDark();
  return (
    <div
      className="dbc-input-wrap"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 12px',
        borderRadius: 6,
        border: `1px solid ${dark ? 'var(--color-border)' : '#d9d9d9'}`,
        background: dark ? 'var(--color-bg-subtle)' : '#fff',
        ...wrapStyle,
      }}
    >
      <Icon name="search" size={14} stroke={dark ? 'rgba(255,255,255,.4)' : 'rgba(5,5,5,.35)'} width={2} />
      <input
        placeholder={placeholder}
        className="dbc-search-input"
        {...rest}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: 14,
          fontFamily: tokens.font,
          flex: 1,
          color: dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)',
          ...style,
        }}
      />
    </div>
  );
}
