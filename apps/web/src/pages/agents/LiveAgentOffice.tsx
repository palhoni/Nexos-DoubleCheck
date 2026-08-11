import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listAgentExecutions,
  listTestDesignerExecutions,
  type AgentExecutionHistoryItem,
  type TestDesignerHistoryItem,
} from '@/entities/agents/agent-execution.api';
import { listEndpointDiscoveryExecutions, type EndpointDiscoveryHistoryItem } from '@/entities/agents/endpoint-discovery.api';
import { listBugReportExecutions, type BugReportHistoryItem } from '@/entities/agents/bug-report.api';
import { AGENTS_CATALOG, LIVE_AGENTS } from './agents.catalog';
import { useAgentStations, executionState, designerReaction, type AgentStation, type LiveExecution, type StationState } from './useAgentStations';
import { NexusMark } from '@/shell/NexusMark';

const STATE_COPY: Record<StationState, { label: string; activity: string }> = {
  working: { label: 'Trabalhando', activity: 'Processando agora' },
  supporting: { label: 'Apoiando QA', activity: 'Contribuindo com o desenho dos testes' },
  collaborating: { label: 'Em alinhamento', activity: 'Discutindo o requisito com o Agent 1' },
  queued: { label: 'Na fila', activity: 'Preparando contexto' },
  done: { label: 'Entregou', activity: 'Última tarefa concluída' },
  attention: { label: 'Atenção', activity: 'Requer revisão' },
  idle: { label: 'Disponível', activity: 'Aguardando uma tarefa' },
  offline: { label: 'Em preparação', activity: 'Integração ainda não conectada' },
};

function normalizeAnalysis(item: AgentExecutionHistoryItem): LiveExecution {
  return { id: item.id, agentId: 'agent1-analisador-us', title: item.titulo || 'Análise de requisito', status: item.status, progress: item.progress, message: item.message, partial: item.parcial, updatedAt: item.updatedAt, projectId: item.projeto.id };
}

function normalizePlan(item: TestDesignerHistoryItem): LiveExecution {
  return { id: item.id, agentId: 'agent2-desenhista-testes', title: item.titulo || 'Plano de testes', status: item.status, progress: item.progress, message: item.message, partial: item.parcial, updatedAt: item.updatedAt, projectId: item.projeto.id };
}

function normalizeEndpointDiscovery(item: EndpointDiscoveryHistoryItem): LiveExecution {
  return { id: item.id, agentId: 'agent4-descobridor-endpoints', title: item.titulo || 'Descoberta de endpoints', status: item.status, progress: item.progress, message: item.message, partial: false, updatedAt: item.updatedAt, projectId: item.projeto.id };
}

function normalizeBugReport(item: BugReportHistoryItem): LiveExecution {
  return { id: item.id, agentId: 'agent7-gerador-bug-report', title: item.titulo || 'Bug report', status: item.status, progress: item.progress, message: item.message, partial: false, updatedAt: item.updatedAt, projectId: item.projeto.id };
}

function meetingMoment(progress: number, now: number) {
  const moments = progress < 25
    ? [
        { agent: 1, text: 'Vamos alinhar objetivo, contexto e resultado esperado.', agenda: 'Contexto da OS' },
        { agent: 3, text: 'Qual jornada do usuário precisamos observar?', agenda: 'Contexto da OS' },
      ]
    : progress < 50
      ? [
          { agent: 4, text: 'Quais integrações e dependências participam do fluxo?', agenda: 'Dependências e regras' },
          { agent: 9, text: 'Há alguma premissa que ainda precisa de aprovação?', agenda: 'Dependências e regras' },
        ]
      : progress < 75
        ? [
            { agent: 2, text: 'Esse critério permite comprovar o resultado?', agenda: 'Critérios e cobertura' },
            { agent: 6, text: 'Onde estão os riscos e comportamentos de borda?', agenda: 'Critérios e cobertura' },
          ]
        : [
            { agent: 7, text: 'Vou registrar as decisões e pendências da reunião.', agenda: 'Decisões e próximos passos' },
            { agent: 8, text: 'Fechamos o entendimento para seguir com segurança?', agenda: 'Decisões e próximos passos' },
          ];
  return moments[Math.floor(now / 6000) % moments.length];
}

function relativeTime(value: string, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'agora';
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
}

function HumanSprite({ number, pose = 'standing', className = '' }: { number: number; pose?: 'standing' | 'seated'; className?: string }) {
  return <i className={`agent-human-sprite agent-human-sprite--${number} is-${pose}${className ? ` ${className}` : ''}`} />;
}

function PixelPerson({ station }: { station: AgentStation }) {
  return <span className={`live-person live-person--${station.state}`} aria-hidden="true"><i className="live-person__shadow" /><HumanSprite number={station.agent.number} pose={station.state === 'done' ? 'standing' : 'seated'} className="live-person__human" /></span>;
}

function Desk({ station, onOpen }: { station: AgentStation; onOpen: () => void }) {
  const copy = STATE_COPY[station.state];
  const progress = station.displayProgress ?? station.execution?.progress;
  return (
    <button type="button" className={`live-desk live-desk--${station.agent.number} is-${station.state}${station.reaction ? ' is-reacting' : ''}`} onClick={onOpen} aria-label={`Agent ${station.agent.number}, ${station.agent.shortName}: ${copy.label}`}>
      <span className="live-desk__bubble"><strong>{copy.label}</strong>{station.reaction || station.execution?.message || copy.activity}</span>
      <span className="live-desk__table" aria-hidden="true"><i className="live-desk__screen"><NexusMark size={15} /><b>{station.state === 'working' || station.state === 'supporting' || station.state === 'collaborating' ? '···' : station.agent.number}</b></i><i className="live-desk__keyboard" /><i className="live-desk__mug" /></span>
      <PixelPerson station={station} />
      <span className="live-desk__label"><small>AGENT {station.agent.number}</small><strong>{station.agent.shortName}</strong><em>{copy.label}</em></span>
      {progress !== undefined && <span className="live-desk__progress"><i style={{ width: `${progress}%` }} /></span>}
    </button>
  );
}

function RefinementMeeting({ execution, now }: { execution: LiveExecution; now: number }) {
  const moment = meetingMoment(execution.progress, now);
  return (
    <section className="live-meeting" role="status" aria-label={`Reunião de refinamento de ${execution.title}`}>
      <header className="live-meeting__header">
        <span className="live-meeting__mark"><NexusMark size={24} /></span>
        <span><small>SALA DE REFINAMENTO · RENAULT NEXO</small><strong>{execution.title}</strong></span>
        <em><i /> REUNIÃO EM ANDAMENTO</em>
      </header>
      <div className="live-meeting__stage">
        <div className="live-meeting__screen"><small>PAUTA ATUAL</small><strong>{moment.agenda}</strong><span>{execution.message}</span></div>
        <div className="live-meeting__table" aria-hidden="true"><NexusMark size={38} /><span><i /><i /><i /></span></div>
        {AGENTS_CATALOG.map((agent) => (
          <div key={agent.id} className={`live-meeting-seat live-meeting-seat--${agent.number}${moment.agent === agent.number ? ' is-speaking' : ''}`}>
            {moment.agent === agent.number && <span className="live-meeting-seat__bubble">{moment.text}</span>}
            <span className="live-meeting-person" aria-hidden="true"><HumanSprite number={agent.number} className="live-meeting-person__arrival" /><HumanSprite number={agent.number} pose="seated" className="live-meeting-person__human" /></span>
            <span className="live-meeting-seat__label"><small>AGENT {agent.number}</small><strong>{agent.shortName}</strong></span>
          </div>
        ))}
      </div>
      <footer className="live-meeting__footer">
        <span><i /> Todos os 9 Agents presentes</span>
        <div><i style={{ width: `${execution.progress}%` }} /></div>
        <strong>{execution.progress}%</strong>
      </footer>
    </section>
  );
}

export function LiveAgentOffice({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<LiveExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    async function refresh(silent = false) {
      if (!projectId) { if (active) setLoading(false); return; }
      try {
        const [analyses, plans, discoveries, bugReports] = await Promise.all([
          listAgentExecutions(projectId),
          listTestDesignerExecutions(),
          listEndpointDiscoveryExecutions(projectId),
          listBugReportExecutions(projectId),
        ]);
        if (!active) return;
        setExecutions([
          ...analyses.map(normalizeAnalysis),
          ...plans.filter((item) => item.projeto.id === projectId).map(normalizePlan),
          ...discoveries.map(normalizeEndpointDiscovery),
          ...bugReports.map(normalizeBugReport),
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setError('');
      } catch {
        if (active) setError(silent ? 'Conexão perdida. Mantendo o último estado enquanto tentamos reconectar.' : 'Não foi possível sincronizar a sala agora. Tentaremos novamente automaticamente.');
      } finally { if (active) setLoading(false); }
    }
    void refresh();
    timer = window.setInterval(() => void refresh(true), 4000);
    return () => { active = false; if (timer) window.clearInterval(timer); };
  }, [projectId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    stations,
    analyzerExecution,
    refinementMeetingActive,
    designerExecution,
    designerProductionActive,
    collaborationActive,
    activeCount,
    attentionCount,
  } = useAgentStations({ executions, now });

  function openStation(station: AgentStation) {
    if (station.collaborationExecutionId) {
      navigate(`/agents/analises/${station.collaborationExecutionId}`);
      return;
    }
    const routes = station.agent.routes;
    if (!routes) return;
    if (station.execution && routes.detail) {
      navigate(routes.detail(station.execution.id));
      return;
    }
    if (routes.start) {
      navigate(`${routes.start}${projectId ? `?projeto=${projectId}` : ''}`);
      return;
    }
    if (routes.list) navigate(routes.list);
  }

  return (
    <section className="live-office-shell" aria-label="Sala de operações dos agents">
      <header className="live-office-header">
        <div className="live-office-title"><span className="live-office-brand-mark"><NexusMark size={36} /></span><div><span className="live-office-eyebrow"><i /> RENAULT NEXO · OPERAÇÃO AO VIVO</span><h1>Os Agents estão no escritório</h1><p>{projectName} · estados sincronizados a cada 4 segundos</p></div></div>
        <div className="live-office-kpis"><span><small>{refinementMeetingActive ? 'Em reunião' : designerProductionActive ? 'Nos postos' : 'Em atividade'}</small><strong>{activeCount}</strong></span><span><small>Pedem atenção</small><strong>{attentionCount}</strong></span><span><small>Conectados</small><strong>{LIVE_AGENTS.length} / {stations.length}</strong></span></div>
      </header>
      {error && <div className="live-office-error" role="status">{error}</div>}
      <div className="live-office-layout">
        <div className={`live-office-map${loading ? ' is-loading' : ''}${refinementMeetingActive ? ' is-meeting' : ''}`}>
          <div className="live-office-room live-office-room--focus"><span>ANÁLISE &amp; PLANEJAMENTO</span></div><div className="live-office-room live-office-room--lab"><span>LABORATÓRIO DE QA</span></div>
          <div className="live-office-window"><i /><i /><i /></div><div className="live-office-board"><span><NexusMark size={20} /></span><strong>RENAULT<br />QUALITY LAB</strong><i /><i /><i /></div><div className="live-office-coffee"><i /><strong>CAFÉ · NEXO</strong></div>
          <div className="live-office-plant live-office-plant--one"><i /><i /><i /></div><div className="live-office-plant live-office-plant--two"><i /><i /><i /></div><div className="live-office-rug" aria-hidden="true" />
          {collaborationActive && <div className="live-office-collaboration" aria-label="Agent 1 e Agent 2 alinhando o requisito"><i /><span>ALINHAMENTO DO REQUISITO</span><i /></div>}
          {stations.map((station) => <Desk key={station.agent.id} station={station} onOpen={() => openStation(station)} />)}
          {refinementMeetingActive && analyzerExecution && <RefinementMeeting execution={analyzerExecution} now={now} />}
          <div className="live-office-map-legend"><span><i className="is-working" /> trabalhando</span><span><i className="is-supporting" /> apoiando QA</span><span><i className="is-collaborating" /> em alinhamento</span><span><i className="is-idle" /> disponível</span><span><i className="is-attention" /> atenção</span><span><i className="is-offline" /> não conectado</span></div>
        </div>
        <aside className="live-office-feed">
          <header><span><i /> ATIVIDADE REAL</span><time>{new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></header>
          <div className="live-office-feed__body">
            {!loading && executions.length === 0 && <div className="live-office-empty"><span>☕</span><strong>Escritório tranquilo</strong><p>Nenhuma execução neste projeto. Os Agents conectados estão disponíveis.</p></div>}
            {refinementMeetingActive && analyzerExecution ? <button type="button" className="live-feed-item is-meeting" onClick={() => navigate(`/agents/analises/${analyzerExecution.id}`)}><span className="live-feed-item__number">9</span><span className="live-feed-item__copy"><strong>Todos os Agents</strong><b>Reunião de refinamento da OS</b><small>{meetingMoment(analyzerExecution.progress, now).agenda}</small></span><span className="live-feed-item__meta"><em>Em reunião</em><time>agora</time></span><span className="live-feed-item__progress"><i style={{ width: `${analyzerExecution.progress}%` }} /></span></button> : designerProductionActive && designerExecution ? <button type="button" className="live-feed-item is-production" onClick={() => navigate('/agents/planos-teste')}><span className="live-feed-item__number">9</span><span className="live-feed-item__copy"><strong>Operação coletiva de QA</strong><b>Todos nos postos de trabalho</b><small>Agent 2 coordenando o desenho dos testes</small></span><span className="live-feed-item__meta"><em>Produzindo</em><time>agora</time></span><span className="live-feed-item__progress"><i style={{ width: `${designerExecution.progress}%` }} /></span></button> : collaborationActive && analyzerExecution && <button type="button" className="live-feed-item is-collaborating" onClick={() => navigate(`/agents/analises/${analyzerExecution.id}`)}><span className="live-feed-item__number">1↔2</span><span className="live-feed-item__copy"><strong>Analisador + Desenhista</strong><b>Discussão do requisito em andamento</b><small>{designerReaction(analyzerExecution.progress, now)}</small></span><span className="live-feed-item__meta"><em>Alinhando</em><time>agora</time></span><span className="live-feed-item__progress"><i style={{ width: `${analyzerExecution.progress}%` }} /></span></button>}
            {executions.slice(0, 8).map((execution) => {
              const agent = AGENTS_CATALOG.find((item) => item.id === execution.agentId)!;
              const state = executionState(execution);
              return <button type="button" key={execution.id} className={`live-feed-item is-${state}`} onClick={() => openStation({ agent, execution, state })}><span className="live-feed-item__number">{agent.number}</span><span className="live-feed-item__copy"><strong>{agent.shortName}</strong><b>{execution.title}</b><small>{execution.message}</small></span><span className="live-feed-item__meta"><em>{STATE_COPY[state].label}</em><time>{relativeTime(execution.updatedAt, now)}</time></span><span className="live-feed-item__progress"><i style={{ width: `${execution.progress}%` }} /></span></button>;
            })}
          </div>
          <footer><i className={error ? 'is-error' : ''} />{error ? 'Reconectando…' : 'Sincronização ativa'}</footer>
        </aside>
      </div>
    </section>
  );
}
