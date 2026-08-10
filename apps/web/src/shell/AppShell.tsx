import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/auth/auth.store';

const ROUTE_LABELS: Array<[string, string]> = [
  ['/', 'Visão Geral'],
  ['/visao-geral', 'Setup / Visão Geral'],
  ['/projetos', 'Setup / Projetos'],
  ['/integracoes', 'Integrações'],
  ['/conhecimento', 'Conhecimento'],
  ['/governanca', 'Governança'],
  ['/buscar', 'Busca Global'],
  ['/atividade', 'Atividade'],
  ['/agents/analises', 'Agents / Análises de US'],
  ['/agents/desenhista-testes', 'Agents / Desenhista de Testes'],
  ['/agents/planos-teste', 'Agents / Planos de Teste'],
  ['/agents/agent1-analisador-us', 'Agents / Analisador de US'],
  ['/agents', 'Orquestração de Agents'],
  ['/minha-area', 'Minha Área'],
];

function labelFor(pathname: string): string {
  const match = ROUTE_LABELS.find(([prefix]) => pathname === prefix || (prefix !== '/' && pathname.startsWith(prefix)));
  return match?.[1] ?? '';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);

  function handleLogout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="dbc-layout-bg renault-app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onLogout={handleLogout} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar breadcrumb={labelFor(location.pathname)} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div key={location.pathname} className="dbc-page-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
