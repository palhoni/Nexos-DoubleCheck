import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, Alert, Icon, type IconName } from '@/design-system';
import { useAuthStore } from '@/auth/auth.store';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { NexusMark } from './NexusMark';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  matchPrefix?: boolean;
  disabled?: boolean;
}

const SETUP_NAV: NavItem[] = [
  { path: '/visao-geral', label: 'Visão Geral', icon: 'chart' },
  { path: '/projetos', label: 'Projetos', icon: 'folder', matchPrefix: true },
  { path: '/integracoes', label: 'Integrações', icon: 'network' },
];

const OPERACIONAL_NAV: NavItem[] = [
  { path: '/conhecimento', label: 'Conhecimento', icon: 'clipboardCheck' },
  { path: '/governanca', label: 'Governança', icon: 'info' },
  { path: '/buscar', label: 'Busca Global', icon: 'search' },
  { path: '/atividade', label: 'Atividade', icon: 'clock' },
  { path: '/minha-area', label: 'Minha Área', icon: 'users' },
];

const AGENT_WORKSPACE_NAV: NavItem[] = [
  { path: '/agents?area=necessidades', label: 'Necessidades', icon: 'clipboardCheck', disabled: true },
  { path: '/agents?area=descoberta', label: 'Descoberta', icon: 'search', disabled: true },
  { path: '/agents?area=conhecimento', label: 'Conhecimento', icon: 'folder', disabled: true },
  { path: '/agents?area=impacto', label: 'Impacto', icon: 'chart', disabled: true },
  { path: '/agents?area=planejamento', label: 'Planejamento', icon: 'clock', disabled: true },
  { path: '/agents?area=qualidade', label: 'Qualidade', icon: 'audit', disabled: true },
  { path: '/agents?area=valor', label: 'Valor', icon: 'zap', disabled: true },
  { path: '/agents?area=administracao', label: 'Administração', icon: 'info', disabled: true },
];

interface ProjectNavItem {
  key: 'times' | 'pessoas' | 'produtos' | 'regras' | 'documentos' | 'integracoes' | 'paises' | 'auditoria';
  label: string;
  icon: IconName;
  path: (projectId: string) => string;
}

const PROJECT_NAV: ProjectNavItem[] = [
  { key: 'times', label: 'Times', icon: 'users', path: (id) => `/projetos/${id}/times` },
  { key: 'pessoas', label: 'Pessoas', icon: 'user', path: (id) => `/projetos/${id}/pessoas` },
  { key: 'produtos', label: 'Produtos', icon: 'box', path: (id) => `/projetos/${id}/produtos` },
  { key: 'regras', label: 'Regras', icon: 'clipboardCheck', path: (id) => `/projetos/${id}/regras` },
  { key: 'documentos', label: 'Documentos', icon: 'folder', path: (id) => `/projetos/${id}/documentos` },
  { key: 'integracoes', label: 'Integrações', icon: 'network', path: (id) => `/projetos/${id}/ecossistema` },
  { key: 'paises', label: 'Países', icon: 'globe', path: (id) => `/projetos/${id}?section=paises` },
  { key: 'auditoria', label: 'Auditoria', icon: 'audit', path: (id) => `/projetos/${id}?section=auditoria` },
];

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      className={`renault-sidebar-toggle${on ? ' is-on' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      aria-pressed={on}
      aria-label="Alternar modo escuro"
    >
      <span />
    </button>
  );
}

function CollapseArrow({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s cubic-bezier(0.215, 0.61, 0.355, 1)' }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SetupChevron({ open }: { open: boolean }) {
  return (
    <Icon
      name="chevronDown"
      size={14}
      width={1.8}
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .18s ease' }}
    />
  );
}

export interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAgentUser = user?.email.trim().toLowerCase() === 'agent_ia@teste.com';
  const { data: agentProjectsData } = projetoHooks.useList(
    { page: 1, pageSize: 3, sortBy: 'updatedAt', sortDir: 'desc' },
    undefined,
    { enabled: isAgentUser },
  );
  const agentProjects = agentProjectsData?.data ?? [];

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('nexus-dark') === 'true';
    } catch {
      return false;
    }
  });
  const [collapsed, setCollapsed] = useState(false);
  const selectedProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/projetos\/([^/]+)/);
    const value = match?.[1];
    return value && value !== 'novo' ? decodeURIComponent(value) : null;
  }, [location.pathname]);
  const activeProjectSection = useMemo<ProjectNavItem['key'] | null>(() => {
    const section = new URLSearchParams(location.search).get('section');
    if (section === 'paises' || section === 'auditoria') return section;
    if (/\/times(?:\/|$)/.test(location.pathname)) return 'times';
    if (/\/pessoas(?:\/|$)/.test(location.pathname)) return 'pessoas';
    if (/\/documentos(?:\/|$)/.test(location.pathname)) return 'documentos';
    if (/\/ecossistema(?:\/|$)/.test(location.pathname) || /\/integracoes(?:\/|$)/.test(location.pathname)) return 'integracoes';
    if (/\/regras(?:\/|$)/.test(location.pathname)) return 'regras';
    if (/\/produtos(?:\/|$)/.test(location.pathname)) return 'produtos';
    return null;
  }, [location.pathname, location.search]);
  const setupRouteActive = useMemo(() => SETUP_NAV.some((item) => item.matchPrefix ? location.pathname.startsWith(item.path) : location.pathname === item.path), [location.pathname]);
  const [setupOpen, setSetupOpen] = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutAck, setLogoutAck] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('nexus-dark', String(dark));
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }
  }, [dark]);

  useEffect(() => {
    if (setupRouteActive) setSetupOpen(true);
  }, [setupRouteActive]);

  useEffect(() => {
    if (selectedProjectId) setProjectOpen(true);
  }, [selectedProjectId]);

  function closeLogout() {
    setLogoutOpen(false);
    setLogoutAck(false);
  }

  function confirmLogout() {
    closeLogout();
    onLogout();
  }

  function isActive(item: NavItem) {
    return item.matchPrefix ? location.pathname.startsWith(item.path) : location.pathname === item.path;
  }

  function navButton(item: NavItem, nested = false) {
    const active = isActive(item);
    return (
      <button
        type="button"
        key={item.path}
        className={`dbc-nav-item renault-nav-item${nested ? ' renault-nav-item--nested' : ''}${active ? ' dbc-nav-item-active' : ''}`}
        title={collapsed ? item.label : undefined}
        onClick={() => navigate(item.path)}
      >
        <Icon name={item.icon} size={nested ? 16 : 18} width={1.7} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  }

  function agentWorkspaceButton(item: NavItem) {
    const target = new URL(item.path, window.location.origin);
    const targetArea = target.searchParams.get('area');
    const currentArea = new URLSearchParams(location.search).get('area');
    const active = target.pathname === '/agents'
      ? location.pathname === '/agents' && targetArea === currentArea
      : location.pathname.startsWith(target.pathname);
    return (
      <button
        type="button"
        key={item.path}
        className={`dbc-nav-item renault-nav-item${active ? ' dbc-nav-item-active' : ''}${item.disabled ? ' is-disabled' : ''}`}
        title={item.disabled ? `${item.label} — Em breve` : collapsed ? item.label : undefined}
        onClick={() => !item.disabled && navigate(item.path)}
        disabled={item.disabled}
        aria-disabled={item.disabled || undefined}
      >
        <Icon name={item.icon} size={18} width={1.7} />
        {!collapsed && <><span>{item.label}</span>{item.disabled && <small className="renault-nav-coming-soon">Em breve</small>}</>}
      </button>
    );
  }

  function projectNavGroup() {
    const item = SETUP_NAV.find((entry) => entry.path === '/projetos')!;
    const active = isActive(item);
    return (
      <div className={`renault-project-nav${selectedProjectId ? ' has-project' : ''}`} key={item.path}>
        <button
          type="button"
          className={`dbc-nav-item renault-nav-item renault-nav-item--nested${active ? ' dbc-nav-item-active' : ''}`}
          onClick={() => selectedProjectId ? setProjectOpen((value) => !value) : navigate('/projetos')}
          aria-expanded={selectedProjectId ? projectOpen : undefined}
        >
          <Icon name="folder" size={16} width={1.7} />
          <span>Projetos</span>
          {selectedProjectId && <SetupChevron open={projectOpen} />}
        </button>

        {selectedProjectId && projectOpen && (
          <div className="renault-project-nav__children" aria-label="Áreas do projeto selecionado">
            {PROJECT_NAV.map((projectItem) => (
              <button
                type="button"
                key={projectItem.key}
                className={`dbc-nav-item renault-nav-item renault-nav-item--project${activeProjectSection === projectItem.key ? ' dbc-nav-item-active' : ''}`}
                onClick={() => navigate(projectItem.path(selectedProjectId))}
              >
                <Icon name={projectItem.icon} size={15} width={1.7} />
                <span>{projectItem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className={`dbc-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="renault-sidebar-scroll">
        <div className="renault-sidebar-head">
          {!collapsed && (
            <div className="renault-sidebar-logo">
              <NexusMark size={31} />
              <span className="renault-sidebar-brand"><strong>Nexo</strong><small>Powered by Renault</small></span>
            </div>
          )}
          <button
            type="button"
            className="dbc-sidebar-collapse-btn"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <CollapseArrow collapsed={collapsed} />
          </button>
        </div>

        {collapsed && <div className="renault-sidebar-collapsed-mark"><NexusMark size={37} /></div>}

        <nav className="renault-sidebar-nav" aria-label="Navegação principal">
          {isAgentUser ? (
            <>
              {agentWorkspaceButton({ path: '/agents', label: 'Orquestração', icon: 'network' })}
              {agentWorkspaceButton({ path: '/agents/analises', label: 'Análises de US', icon: 'clipboardCheck' })}
              {!collapsed && <div className="renault-sidebar-section-label">Ciclo de trabalho</div>}
              {AGENT_WORKSPACE_NAV.map(agentWorkspaceButton)}
              {!collapsed && <div className="renault-sidebar-section-label">Projetos recentes</div>}
              {!collapsed && (
                <div className="agents-sidebar-projects">
                  {agentProjects.map((project, index) => (
                    <button type="button" key={project.id} onClick={() => navigate(`/agents?projeto=${project.id}`)}>
                      <span>{project.nome}</span><i className={`tone-${index + 1}`} />
                    </button>
                  ))}
                  {!agentProjects.length && <small>Nenhum projeto disponível</small>}
                </div>
              )}
            </>
          ) : (
            <>
              {navButton({ path: '/', label: 'Início', icon: 'home' })}

              <div className={`renault-nav-group${setupRouteActive ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="dbc-nav-item renault-nav-item renault-nav-group__trigger"
                  onClick={() => collapsed ? navigate('/projetos') : setSetupOpen((value) => !value)}
                  title={collapsed ? 'Setup' : undefined}
                  aria-expanded={!collapsed ? setupOpen : undefined}
                >
                  <Icon name="folder" size={18} width={1.7} />
                  {!collapsed && <><span>Setup</span><SetupChevron open={setupOpen} /></>}
                </button>
                {!collapsed && setupOpen && <div className="renault-nav-group__children">{SETUP_NAV.map((item) => item.path === '/projetos' ? projectNavGroup() : navButton(item, true))}</div>}
              </div>

              {!collapsed && <div className="renault-sidebar-section-label">Operacional</div>}
              {OPERACIONAL_NAV.map((item) => navButton(item))}
            </>
          )}
        </nav>

        <div className="renault-sidebar-spacer" />

        {!collapsed && (
          <div className="renault-governance-card" role="status">
            <span className="renault-governance-card__icon"><Icon name="clipboardCheck" size={17} width={1.7} /></span>
            <span><strong>Governança e segurança</strong><small>{isAgentUser ? 'Contexto isolado por projeto' : 'Tudo em conformidade'} <i /></small></span>
          </div>
        )}

        <div className="renault-sidebar-preferences">
          <button type="button" className="dbc-nav-item renault-nav-item" onClick={() => setDark((value) => !value)} title={collapsed ? 'Modo escuro' : undefined}>
            <Icon name="info" size={17} width={1.7} />
            {!collapsed && <><span>Modo escuro</span><ToggleSwitch on={dark} onChange={() => setDark((value) => !value)} /></>}
          </button>
        </div>
      </div>

      <div className="dbc-sidebar-footer">
        <button type="button" className="dbc-logout-btn" onClick={() => setLogoutOpen(true)} title={collapsed ? 'Sair' : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      <Modal
        open={logoutOpen}
        onClose={closeLogout}
        title="Sair do sistema?"
        subtitle="Confirme que deseja encerrar a sua sessão."
        width={440}
        secondaryLabel="Cancelar"
        primaryLabel="Sair do sistema"
        danger
        primaryDisabled={!logoutAck}
        onPrimary={confirmLogout}
      >
        <Alert type="warning" title="Você será desconectado">
          Ao sair, sua sessão atual será encerrada e você precisará entrar novamente com suas credenciais para acessar a plataforma.
        </Alert>
        <label className={`renault-logout-ack${logoutAck ? ' is-checked' : ''}`} onClick={() => setLogoutAck((value) => !value)}>
          <span className="renault-logout-ack__check">
            {logoutAck && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </span>
          <span className="dbc-text-2">Estou ciente e confirmo que desejo <strong className="dbc-text">encerrar a sessão</strong> agora.</span>
        </label>
      </Modal>
    </aside>
  );
}
