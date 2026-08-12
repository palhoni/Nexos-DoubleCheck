import { useState } from 'react';
import { tokens } from '../tokens';
import { useDark } from '../hooks/useDark';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> {
  style?: React.CSSProperties;
}

export function Textarea({ rows = 3, style = {}, ...rest }: TextareaProps) {
  const dark = useDark();
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      className="dbc-input"
      rows={rows}
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
        padding: '8px 12px',
        borderRadius: 6,
        border: focus ? '1px solid #3b82c4' : `1px solid ${dark ? 'var(--color-border)' : '#d9d9d9'}`,
        boxShadow: focus ? '0 0 0 3px rgba(59,130,196,.24)' : 'none',
        background: dark ? 'var(--color-bg-subtle)' : '#fff',
        fontSize: 14,
        fontFamily: tokens.font,
        outline: 'none',
        color: dark ? 'var(--color-text)' : 'rgba(5,5,5,.88)',
        resize: 'vertical',
        ...style,
      }}
    />
  );
}
