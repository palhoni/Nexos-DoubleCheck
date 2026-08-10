import { useState } from 'react';
import { tokens } from '../tokens';
import { useDark } from '../hooks/useDark';

export type InputState = 'default' | 'error' | 'disabled';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  state?: InputState;
  error?: string;
  label?: string;
  hint?: string;
  style?: React.CSSProperties;
  wrapStyle?: React.CSSProperties;
}

export function Input({ state = 'default', error, label, hint, style = {}, wrapStyle = {}, ...rest }: InputProps) {
  const dark = useDark();
  const [focus, setFocus] = useState(false);
  const isErr = state === 'error' || !!error;
  const isDisabled = state === 'disabled' || rest.disabled;

  let border = `1px solid ${dark ? 'var(--color-border)' : '#d9d9d9'}`;
  let boxShadow = 'none';
  if (isErr) {
    border = '1px solid #ff4d4f';
    boxShadow = '0 0 0 2px rgba(255,77,79,.2)';
  } else if (focus) {
    border = '1px solid #c79f00';
    boxShadow = '0 0 0 3px rgba(255,204,0,.24)';
  }

  const input = (
    <input
      className="dbc-input"
      onFocus={(e) => {
        setFocus(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        rest.onBlur?.(e);
      }}
      {...rest}
      style={{
        width: '100%',
        height: 36,
        padding: '0 12px',
        borderRadius: 6,
        border,
        boxShadow,
        background: isDisabled ? 'rgba(0,0,0,.04)' : dark ? 'var(--color-bg-subtle)' : '#fff',
        fontSize: 14,
        fontFamily: tokens.font,
        outline: 'none',
        color: isDisabled ? 'rgba(5,5,5,.25)' : dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)',
        cursor: isDisabled ? 'not-allowed' : 'text',
        ...style,
      }}
    />
  );

  if (!label && !hint && !error) return input;
  return (
    <div style={wrapStyle}>
      {label && (
        <label className="dbc-text-2" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      {input}
      {error && <span style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4, display: 'block' }}>{error}</span>}
      {hint && !error && (
        <span className="dbc-text-3" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
