import { useEffect } from 'react';
import { GlobalSearchPanel } from './GlobalSearchPanel';

export function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="nexus-search-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="nexus-search-dialog" role="dialog" aria-modal="true" aria-label="Busca global do Nexo" onMouseDown={(e) => e.stopPropagation()}>
        <GlobalSearchPanel autoFocus compact onClose={onClose} />
        <div className="nexus-search-dialog-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
