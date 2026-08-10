import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/auth/auth.store';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>; }
function BellIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>; }

export function Topbar({ breadcrumb = '' }: { breadcrumb?: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAgentUser = user?.email.trim().toLowerCase() === 'agent_ia@teste.com';
  const [searchOpen, setSearchOpen] = useState(false);
  const initials = useMemo(() => (user?.nome ?? 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(), [user?.nome]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="dbc-topbar nexus-topbar">
        <div className="nexus-topbar-context">
          <strong>{breadcrumb || 'Nexo'}</strong>
          {breadcrumb === 'Visão Geral' && <small>Acompanhe o ecossistema, a maturidade da base de conhecimento e os pontos que precisam de atenção.</small>}
          {breadcrumb === 'Orquestração de Agents' && <small>Prepare agents especializados por projeto, com contexto isolado e governança Renault.</small>}
        </div>
        <button type="button" className="nexus-topbar-search-trigger" onClick={() => setSearchOpen(true)}>
          <SearchIcon />
          <span>Buscar no Nexo</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="nexus-topbar-actions">
          <button type="button" className="nexus-topbar-icon-btn" aria-label="Notificações" title="Notificações"><BellIcon /></button>
          <button type="button" className="nexus-topbar-user" onClick={() => navigate(isAgentUser ? '/agents' : '/governanca')} title={isAgentUser ? 'Abrir área de Agents' : 'Abrir Governança'}>
            <span className="nexus-topbar-avatar">{initials}</span>
            <span className="nexus-topbar-user-copy"><strong>{user?.nome ?? 'Usuário'}</strong><small>{isAgentUser ? 'Agent de IA' : 'Administrador'}</small></span>
          </button>
        </div>
      </header>
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
