export interface AvatarProps {
  size?: number;
  /** Iniciais (ex.: "JS") — quando informado, substitui o ícone genérico de pessoa. */
  initials?: string;
}

export function Avatar({ size = 36, initials }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #fff8d9, #f2e4a4)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(0,0,0,.06)',
      }}
    >
      {initials ? (
        <span style={{ fontSize: size * 0.36, fontWeight: 700, color: '#4a3b00' }}>{initials}</span>
      ) : (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#4a3b00" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      )}
    </div>
  );
}

/** Iniciais a partir de um nome completo — "João Santos" → "JS", "Ana" → "AN".
 *  Extraído de duplicações locais (HomePage, IntegracoesMapaPage). */
export function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
