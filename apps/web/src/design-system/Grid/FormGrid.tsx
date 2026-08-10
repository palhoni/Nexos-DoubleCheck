import { createContext, useContext } from 'react';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { tokens } from '../tokens';

export type FormGridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export interface FormGridColsResponsive {
  base?: FormGridCols;
  sm?: FormGridCols;
  md?: FormGridCols;
  lg?: FormGridCols;
}

export type FormGridSpan = FormGridCols | 'full';
export interface FormGridSpanResponsive {
  base?: FormGridSpan;
  sm?: FormGridSpan;
  md?: FormGridSpan;
  lg?: FormGridSpan;
}

/** Preset de modal/edição compacta. */
export const FORM_GRID_EDIT: FormGridColsResponsive = { base: 1, sm: 2 };
/** Preset de leitura de detalhes. */
export const FORM_GRID_READ: FormGridColsResponsive = { base: 1, sm: 2, md: 3, lg: 4 };
/** Preset para formulários de página completa: 12 colunas a partir de 700px. */
export const FORM_GRID_PAGE: FormGridColsResponsive = { base: 1, sm: 12, md: 12, lg: 12 };

function resolveColumns(columns: FormGridCols | FormGridColsResponsive | undefined, width: number): FormGridCols {
  if (typeof columns === 'number') return columns;
  const c = columns ?? FORM_GRID_EDIT;
  if (width >= 1400 && c.lg) return c.lg;
  if (width >= 1000 && c.md) return c.md;
  if (width >= 700 && c.sm) return c.sm;
  return c.base ?? 1;
}

function resolveSpan(span: FormGridSpan | FormGridSpanResponsive | undefined, width: number): FormGridSpan {
  if (span == null || typeof span === 'number' || span === 'full') return span ?? 1;
  if (width >= 1400 && span.lg != null) return span.lg;
  if (width >= 1000 && span.md != null) return span.md;
  if (width >= 700 && span.sm != null) return span.sm;
  return span.base ?? 1;
}

interface FormGridContextValue {
  columns: number;
  width: number;
}

const FormGridContext = createContext<FormGridContextValue>({ columns: 1, width: 0 });

export interface FormGridProps {
  columns?: FormGridCols | FormGridColsResponsive;
  gap?: number;
  rowGap?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Grid determinístico para formulários. Mantém compatibilidade com as grades de 1–4
 * colunas existentes e passa a suportar a malha de 12 colunas dos formulários completos.
 * A responsividade é baseada na largura real do contêiner.
 */
export function FormGrid({ columns, gap = tokens.layout.formGap, rowGap, children, style }: FormGridProps) {
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const n = resolveColumns(columns, width);

  return (
    <FormGridContext.Provider value={{ columns: n, width }}>
      <div
        ref={ref}
        className="setup-form-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          columnGap: gap,
          rowGap: rowGap ?? gap,
          ...style,
        }}
      >
        {children}
      </div>
    </FormGridContext.Provider>
  );
}

export interface FormGridItemProps {
  /** Span simples ou responsivo. `full` sempre ocupa a largura disponível. */
  span?: FormGridSpan | FormGridSpanResponsive;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormGridItem({ span = 1, children, style }: FormGridItemProps) {
  const { columns, width } = useContext(FormGridContext);
  const resolved = resolveSpan(span, width);
  const gridColumn = resolved === 'full' ? '1 / -1' : resolved > 1 ? `span ${Math.min(resolved, columns)}` : undefined;

  return <div style={{ gridColumn, minWidth: 0, ...style }}>{children}</div>;
}
