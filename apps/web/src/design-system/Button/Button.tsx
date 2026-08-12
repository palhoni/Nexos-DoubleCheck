import { useState } from 'react';
import { Icon, type IconName } from '../Icon/Icon';
import { tokens } from '../tokens';
import { useDark } from '../hooks/useDark';

export type ButtonVariant = 'default' | 'secondary' | 'primary' | 'dashed' | 'ghost' | 'link' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName | React.ReactNode;
  iconRight?: IconName | React.ReactNode;
  loading?: boolean;
  block?: boolean;
  children?: React.ReactNode;
}

const SIZES: Record<ButtonSize, { height: number; padding: string; fontSize: number }> = {
  lg: { height: 44, padding: '0 22px', fontSize: 15 },
  md: { height: 36, padding: '0 16px', fontSize: 14 },
  sm: { height: 28, padding: '0 12px', fontSize: 12 },
};

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  block = false,
  children,
  style,
  onClick,
  ...rest
}: ButtonProps) {
  const dark = useDark();
  const [hover, setHover] = useState(false);
  const isDisabled = disabled || loading;
  const sz = SIZES[size];

  const base: React.CSSProperties = {
    display: block ? 'flex' : 'inline-flex',
    width: block ? '100%' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: sz.height,
    padding: variant === 'link' ? '0 4px' : sz.padding,
    fontSize: sz.fontSize,
    borderRadius: 6,
    fontFamily: tokens.font,
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all .15s',
    whiteSpace: 'nowrap',
  };

  const text = dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)';
  const dBorder = dark ? 'var(--color-border)' : '#d9d9d9';
  const variants: Record<ButtonVariant, { rest: React.CSSProperties; hover: React.CSSProperties }> = {
    primary: {
      rest: { background: '#3b82c4', color: '#fff', border: '1px solid #3b82c4' },
      hover: { background: '#306ba1', color: '#fff', border: '1px solid #26537d' },
    },
    default: {
      rest: { background: dark ? 'var(--color-bg-subtle)' : '#fff', color: text, border: `1px solid ${dBorder}` },
      hover: { background: dark ? 'var(--color-bg-subtle)' : '#fff', color: '#111', border: '1px solid #3b82c4' },
    },
    secondary: {
      rest: { background: dark ? 'var(--color-bg-subtle)' : '#fff', color: text, border: `1px solid ${dBorder}` },
      hover: { background: dark ? 'var(--color-bg-subtle)' : '#fff', color: '#111', border: '1px solid #3b82c4' },
    },
    dashed: {
      rest: { background: 'transparent', color: '#26537d', border: '1px dashed #3b82c4' },
      hover: { background: dark ? 'rgba(59,130,196,.12)' : 'rgba(59,130,196,.10)', color: '#111', border: '1px dashed #3b82c4' },
    },
    ghost: {
      rest: { background: 'transparent', color: text, border: '1px solid transparent' },
      hover: { background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)', color: text, border: '1px solid transparent' },
    },
    link: {
      rest: { background: 'transparent', color: '#26537d', border: 'none' },
      hover: { background: 'transparent', color: '#111', border: 'none' },
    },
    danger: {
      rest: { background: dark ? 'rgba(255,77,79,.1)' : '#fff1f0', color: '#ff4d4f', border: '1px solid #ffa39e' },
      hover: { background: dark ? 'rgba(255,77,79,.18)' : '#ffe7e6', color: '#ff4d4f', border: '1px solid #ff7875' },
    },
  };
  const v = variants[variant];

  const disabledStyle: React.CSSProperties = {
    background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
    color: dark ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)',
    border: `1px solid ${dBorder}`,
  };

  const finalStyle: React.CSSProperties = {
    ...base,
    ...(isDisabled ? disabledStyle : hover ? v.hover : v.rest),
    ...style,
  };

  function renderIcon(ic: IconName | React.ReactNode | undefined) {
    if (!ic) return null;
    if (typeof ic === 'string') {
      return <Icon name={ic as IconName} size={size === 'lg' ? 15 : size === 'sm' ? 12 : 14} />;
    }
    return ic;
  }

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={finalStyle}
      {...rest}
    >
      {loading ? (
        <Icon name="spinner" size={size === 'lg' ? 15 : size === 'sm' ? 12 : 14} style={{ animation: 'ds-spin 1s linear infinite' }} />
      ) : (
        renderIcon(icon)
      )}
      {children}
      {renderIcon(iconRight)}
    </button>
  );
}
