import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/design-system';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { AGENTS_CATALOG, AGENT_STAGES, LIVE_AGENTS, type AgentCatalogItem } from './agents.catalog';
import { LiveAgentOffice } from './LiveAgentOffice';
import './agents-orchestration.css';

type WorkspaceTab = 'plano' | 'precondicoes' | 'gates' | 'configuracoes';

function BotMark({ number, tone = 'teal' }: { number: number; tone?: string }) {
  return (
    <span className={`agent-bot-mark agent-bot-mark--${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="7" width="14" height="12" rx="4" />
        <path d="M12 3v4M9 3h6M8.5 12h.01M15.5 12h.01M9 16h6" />
      </svg>
      <small>{number}</small>
    </span>
  );
}

function AgentCard({ agent, selected, onSelect }: { agent: AgentCatalogItem; selected: boolean; onSelect: () => void }) {
  const stage = AGENT_STAGES.find((item) => item.id === agent.stage)!;
  return (
    <button type="button" className={`agent-flow-card${selected ? ' is-selected' : ''}`} onClick={onSelect}>
      <BotMark number={agent.number} tone={stage.tone} />
      <span className="agent-flow-card__copy">
        <strong>{agent.shortName}</strong>
        <small>{agent.description}</small>
      </span>
      <span className="agent-flow-card__status">Pronto</span>
    </button>
  );
}

function MiniProgress({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="agents-mini-progress">
      <span>{label}</span><strong>{value}/{total}</strong>
      <i><b style={{ width: `${(value / total) * 100}%`, background: color }} /></i>
    </div>
  );
}

export function AgentsOrchestrationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const [selectedAgentId, setSelectedAgentId] = useState(AGENTS_CATALOG[0].id);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('plano');
  const [notice, setNotice] = useState('');
  const [viewMode, setViewMode] = useState<'office' | 'flow'>('office');

  const selectedProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId)
    ? requestedProjectId
    : projects[0]?.id ?? '';
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedAgent = AGENTS_CATALOG.find((agent) => agent.id === selectedAgentId) ?? AGENTS_CATALOG[0];

  useEffect(() => {
    if (!requestedProjectId && projects[0]) {
      const next = new URLSearchParams(searchParams);
      next.set('projeto', projects[0].id);
      setSearchParams(next, { replace: true });
    }
  }, [projects, requestedProjectId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stages = useMemo(() => AGENT_STAGES.map((stage) => ({
    ...stage,
    agents: AGENTS_CATALOG.filter((agent) => agent.stage === stage.id),
  })), []);

  function changeProject(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set('projeto', projectId);
    setSearchParams(next);
  }

  function showPlannedAction(message: string) {
    setNotice(`${message} A execução dos agents será conectada na próxima etapa.`);
  }

  const projectName = selectedProject?.nome ?? (projectsLoading ? 'Carregando projetos…' : 'Nenhum projeto cadastrado');

  return (
    <div className="agents-orchestration">
      {notice && <div className="agents-notice" role="status"><Icon name="info" size={17} />{notice}</div>}

      <section className="agents-toolbar" aria-label="Controles do plano">
        <label className="agents-project-select">
          <span>Projeto ativo</span>
          <select value={selectedProjectId} onChange={(event) => changeProject(event.target.value)} disabled={!projects.length}>
            {!projects.length && <option value="">Nenhum projeto disponível</option>}
            {projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}
          </select>
        </label>

        <div className="agents-toolbar__view">
          <span>Modo de exibição</span>
          <div><button type="button" className={viewMode === 'office' ? 'is-active' : ''} aria-label="Escritório ao vivo" title="Escritório ao vivo" onClick={() => setViewMode('office')}><Icon name="chart" size={16} /></button><button type="button" className={viewMode === 'flow' ? 'is-active' : ''} aria-label="Plano em colunas" title="Plano em colunas" onClick={() => setViewMode('flow')}><Icon name="folder" size={16} /></button></div>
        </div>

        <div className="agents-toolbar__actions">
          {viewMode === 'office' ? <>
            <button type="button" className="agents-btn agents-btn--secondary" onClick={() => navigate('/agents/analises')}>Ver análises</button>
            <button type="button" className="agents-btn agents-btn--primary" onClick={() => navigate(`/agents/agent1-analisador-us?nova=1${selectedProjectId ? `&projeto=${selectedProjectId}` : ''}`)}><span className="agents-play">▶</span>Nova análise</button>
          </> : <>
            <button type="button" className="agents-btn agents-btn--secondary" onClick={() => showPlannedAction('Plano salvo visualmente.')}>Salvar plano</button>
            <button type="button" className="agents-btn agents-btn--primary" onClick={() => showPlannedAction('Plano preparado.')}><span className="agents-play">▶</span>Preparar execução</button>
          </>}
          <button type="button" className="agents-icon-button" aria-label="Mais opções">•••</button>
        </div>
      </section>

      {viewMode === 'office' && <LiveAgentOffice projectId={selectedProjectId} projectName={projectName} />}

      {viewMode === 'flow' && <div className="agents-workspace-grid">
        <section className="agents-flow-panel" aria-label="Fluxo dos agents">
          <div className="agents-flow-columns">
            {stages.map((stage, index) => (
              <div className={`agents-stage agents-stage--${stage.tone}`} key={stage.id}>
                <header>
                  <span className="agents-stage__icon"><Icon name={stage.id === 'requisitos' ? 'clipboardCheck' : stage.id === 'descoberta' ? 'search' : stage.id === 'planejamento' ? 'chart' : 'audit'} size={18} /></span>
                  <span><strong>{stage.label}</strong><small>{stage.subtitle}</small></span>
                  <b>{stage.agents.length}</b>
                </header>
                <div className="agents-stage__cards">
                  {stage.agents.map((agent) => <AgentCard key={agent.id} agent={agent} selected={agent.id === selectedAgent.id} onSelect={() => {
                    setSelectedAgentId(agent.id);
                    if (agent.routes?.start) navigate(`${agent.routes.start}${selectedProjectId ? `?projeto=${selectedProjectId}` : ''}`);
                    else if (agent.routes?.list) navigate(agent.routes.list);
                  }} />)}
                </div>
                {index < stages.length - 1 && <span className="agents-stage__connector" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
          <footer className="agents-flow-legend">
            <span><i className="is-ready" />Pronto para configurar</span>
            <span><i className="is-selected" />Agent selecionado</span>
            <span><i className="is-pending" />Execução ainda não conectada</span>
          </footer>
        </section>

        <aside className="agents-right-rail">
          <section className="agents-rail-card agents-current-agent">
            <header>Agent selecionado</header>
            <div className="agents-current-agent__identity">
              <BotMark number={selectedAgent.number} tone={AGENT_STAGES.find((stage) => stage.id === selectedAgent.stage)?.tone} />
              <span><small>Agent {selectedAgent.number}</small><strong>{selectedAgent.shortName}</strong><em>{AGENT_STAGES.find((stage) => stage.id === selectedAgent.stage)?.label}</em></span>
            </div>
            <p>{selectedAgent.description}</p>
            <div className="agents-command"><span>Definição do agent</span><code>{selectedAgent.definitionPath}</code></div>
            <div className="agents-capabilities">{selectedAgent.capabilities.map((item) => <span key={item}>{item}</span>)}</div>
          </section>

          <section className="agents-rail-card agents-context-card">
            <header>Contexto atual</header>
            <dl>
              <div><dt>Projeto</dt><dd>{projectName}</dd></div>
              <div><dt>Catálogo</dt><dd>9 agents carregados</dd></div>
              <div><dt>Modo</dt><dd>Planejamento visual</dd></div>
            </dl>
          </section>

          <section className="agents-rail-card agents-summary-card">
            <header>Resumo da preparação</header>
            <MiniProgress label="Catalogados" value={AGENTS_CATALOG.length} total={AGENTS_CATALOG.length} color="#2ea94f" />
            <MiniProgress label="Configurados" value={LIVE_AGENTS.length} total={AGENTS_CATALOG.length} color="#2868f0" />
            <MiniProgress label="Aguardando regras" value={AGENTS_CATALOG.length - LIVE_AGENTS.length} total={AGENTS_CATALOG.length} color="#b5b5b5" />
          </section>
        </aside>
      </div>}

      {viewMode === 'flow' && <section className="agents-plan-panel">
        <nav aria-label="Detalhes do plano">
          {([
            ['plano', 'Plano de execução'],
            ['precondicoes', 'Pré-condições'],
            ['gates', 'Gates de aprovação'],
            ['configuracoes', 'Configurações'],
          ] as Array<[WorkspaceTab, string]>).map(([id, label]) => <button type="button" key={id} className={activeTab === id ? 'is-active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
        </nav>

        {activeTab === 'plano' && (
          <div className="agents-plan-content">
            <div className="agents-plan-summary">
              <h3>Resumo do plano</h3>
              <dl><div><dt>Projeto</dt><dd>{projectName}</dd></div><div><dt>Objetivo</dt><dd>{selectedProject?.objetivo || 'Objetivo será definido antes da primeira execução.'}</dd></div><div><dt>Agents</dt><dd>9 agents disponíveis</dd></div><div><dt>Estratégia</dt><dd>Contexto isolado por projeto</dd></div></dl>
            </div>
            <div className="agents-checklist">
              <h3>Pré-condições</h3>
              <label className="is-done"><span>✓</span>Projeto selecionado</label>
              <label className="is-done"><span>✓</span>Catálogo de agents identificado</label>
              <label><span />Requisito funcional vinculado</label>
              <label><span />Ambiente de testes autorizado</label>
              <label><span />Credenciais de execução configuradas</label>
            </div>
            <div className="agents-gates">
              <h3>Gates de aprovação</h3>
              <div><span><strong>Gate 1: Requisito e contexto</strong><small>Aprovação: Produto</small></span><em className="is-review">Configurar</em></div>
              <div><span><strong>Gate 2: Cobertura de testes</strong><small>Aprovação: Qualidade</small></span><em>Pendente</em></div>
              <div><span><strong>Gate 3: Execução segura</strong><small>Aprovação: Governança</small></span><em>Pendente</em></div>
            </div>
            <div className="agents-controls">
              <h3>Controles de execução</h3>
              <button type="button" onClick={() => showPlannedAction('Configuração inicial aberta.')}>Configurar primeiro plano</button>
              <p><Icon name="info" size={15} /> Nenhum agent será executado nesta etapa visual.</p>
            </div>
          </div>
        )}
        {activeTab !== 'plano' && <div className="agents-tab-placeholder"><Icon name="info" size={22} /><strong>{activeTab === 'precondicoes' ? 'Pré-condições do projeto' : activeTab === 'gates' ? 'Gates de aprovação' : 'Configurações de execução'}</strong><span>Esta área está preparada visualmente e será detalhada quando você definir as próximas regras.</span></div>}
      </section>}

      <footer className="agents-page-footer">© 2026 Double Check. Uso interno.</footer>
    </div>
  );
}
