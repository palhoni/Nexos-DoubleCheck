export const tokens = {
  color: {
    primary: '#3b82c4',
    primaryHover: '#306ba1',
    primaryDeep: '#141414',
    success: '#52c41a',
    successText: '#389e0d',
    warning: '#faad14',
    warningText: '#d48806',
    error: '#ff4d4f',
    errorText: '#cf1322',
    info: '#3b82c4',
    purple: '#531dab',
    neutral: '#8c8c8c',
    white: '#ffffff',
    black: '#050505',
  },

  /** Espelha `--space-*` de colors_and_type.css — em JS pra permitir aritmética
   *  (breakpoints, larguras calculadas) e erro de compilação em caso de digitação errada. */
  space: { none: 0, xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, huge: 40 },

  radius: { xs: 2, sm: 4, md: 6, lg: 9, xl: 14, pill: 999 },

  /** Espelha `--shadow-*` de colors_and_type.css — a cor/opacidade continua definida só
   *  em CSS (tema-dependente onde fizer sentido); aqui é só um acesso tipado. */
  shadow: {
    none: 'none',
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    ring: 'var(--shadow-ring)',
  },

  /** Estilos de texto reutilizáveis — usar via spread: `style={{...tokens.text.pageTitle}}`.
   *  Normaliza os ~13 tamanhos de fonte hoje espalhados pelo app em um vocabulário fixo. */
  text: {
    pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' },
    pageTitleSm: { fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' },
    sectionTitle: { fontSize: 14, fontWeight: 600 },
    metric: { fontSize: 24, fontWeight: 700, lineHeight: 1.15 },
    body: { fontSize: 14, fontWeight: 400 },
    bodySm: { fontSize: 13, fontWeight: 400 },
    caption: { fontSize: 12, fontWeight: 400 },
    micro: { fontSize: 11, fontWeight: 400 },
    label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' },
  } as const,

  /** Medidas de layout compostas — uma decisão só, reutilizada em vez de recalculada
   *  em cada card/grid/tabela do app. */
  layout: {
    cardPad: '20px 24px',
    cardPadCompact: '16px 20px',
    cardRadius: 9,
    pageGridGap: 24,
    railWidth: 'minmax(320px, 380px)',
    railBreakpoint: 1100,
    formGap: 16,
    readGridGap: 20,
    actionGap: 12,
    tableCell: { comfortable: '16px 20px', default: '12px 16px', compact: '8px 12px' },
  },

  font: 'var(--font-sans)',
} as const;
