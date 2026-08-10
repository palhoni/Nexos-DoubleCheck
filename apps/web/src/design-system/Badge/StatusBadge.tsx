import { Badge, type StatusPreset } from './Badge';

export interface StatusBadgeProps {
  label: React.ReactNode;
  preset?: StatusPreset;
  /** Quando informado, o badge vira clicável (clique alterna o status) — para de propagar
   *  o clique pro elemento pai (ex.: não navega ao clicar o badge numa linha de tabela). */
  onToggle?: () => void;
  title?: string;
}

/** Badge de status — versão pura, sem conhecimento de `EntityConfig`. `EntityStatusBadge`
 *  (entities/crud/shared.tsx) resolve o preset a partir da config e delega pra esta. */
export function StatusBadge({ label, preset = 'info', onToggle, title }: StatusBadgeProps) {
  const badge = (
    <Badge kind="status" preset={preset}>
      {label}
    </Badge>
  );
  if (!onToggle) return badge;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={title ?? 'Clique para alternar o status'}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {badge}
    </button>
  );
}
