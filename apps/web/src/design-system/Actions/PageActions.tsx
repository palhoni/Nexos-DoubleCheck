import { tokens } from '../tokens';

export interface PageActionsProps {
  children: React.ReactNode;
  /** Ordem dos filhos: da menos pra mais importante (ex.: Cancelar, Inativar, Salvar). */
  align?: 'right' | 'left' | 'between';
  /** Fixa a barra no rodapé da área de conteúdo, com divisor — para formulários longos. */
  sticky?: boolean;
  gap?: number;
  style?: React.CSSProperties;
}

/** Barra de ações única do Setup. O CSS cuida de sticky, safe-area e empilhamento mobile. */
export function PageActions({ children, align = 'right', sticky = false, gap = tokens.layout.actionGap, style }: PageActionsProps) {
  const justify = align === 'right' ? 'flex-end' : align === 'left' ? 'flex-start' : 'space-between';

  return (
    <div
      className={`setup-page-actions setup-page-actions--${align}${sticky ? ' setup-page-actions--sticky dbc-card' : ''}`}
      style={{ justifyContent: justify, gap, ...style }}
    >
      {children}
    </div>
  );
}
