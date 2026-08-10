import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listAgentExecutions,
  listTestDesignerExecutions,
  type AgentExecutionHistoryItem,
  type AgentExecutionStatus,
  type TestDesignerHistoryItem,
} from '@/entities/agents/agent-execution.api';
import { AGENTS_CATALOG, type AgentCatalogItem } from './agents.catalog';
import { NexusMark } from '@/shell/NexusMark';

type LiveExecution = {
  id: string;
  agentId: string;
  title: string;
  status: AgentExecutionStatus;
  progress: number;
  message: string;
  partial: boolean;
  updatedAt: string;
  projectId: string;
};

type StationState = 'working' | 'supporting' | 'collaborating' | 'queued' | 'done' | 'attention' | 'idle' | 'offline';
type AgentStation = { agent: AgentCatalogItem; state: StationState; execution?: LiveExecution; reaction?: string; displayProgress?: number; collaborationExecutionId?: string };

const CONNECTED_AGENTS = new Set(['agent1-analisador-us', 'agent2-desenhista-testes']);
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

function executionState(execution?: LiveExecution): StationState {
  if (!execution) return 'idle';
  if (execution.status === 'processing') return 'working';
  if (execution.status === 'queued') return 'queued';
  if (execution.status === 'failed' || execution.partial) return 'attention';
  return 'done';
}

function designerReaction(progress: number, now: number) {
  const reactions = progress < 20
    ? ['Me conte o objetivo principal.', 'Vou mapear os primeiros riscos.']
    : progress < 45
      ? ['Esse critério é observável?', 'Temos dados para esse cenário?']
      : progress < 70
        ? ['Encontrei uma borda importante.', 'Vou confrontar isso com a OS.']
        : progress < 90
          ? ['Esses casos cobrem o risco?', 'Estou verificando a rastreabilidade.']
          : ['Entendimento alinhado.', 'Pronto para revisar a cobertura.'];
  return reactions[Math.floor(now / 6000) % reactions.length];
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

const SUPPORT_MESSAGES: Record<number, string> = {
  1: 'Validando aderência à OS refinada.',
  3: 'Revisando impacto nos fluxos de tela.',
  4: 'Conferindo contratos e integrações.',
  5: 'Preparando a estratégia de execução.',
  6: 'Mapeando riscos e pontos de falha.',
  7: 'Organizando evidências e rastreabilidade.',
  8: 'Preparando critérios para o reteste.',
  9: 'Auditando cobertura e guardrails.',
};

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

function PixelPerson({ station }: { station: AgentStation }) {
  return <span className={`live-person live-person--${station.state}`} aria-hidden="true"><i className="live-person__shadow" /><i className="live-person__legs" /><i className="live-person__body" /><i className="live-person__head" /><i className="live-person__hair" /></span>;
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
            <span className="live-meeting-person" aria-hidden="true"><i className="live-meeting-person__chair" /><i className="live-meeting-person__body" /><i className="live-meeting-person__head" /><i className="live-meeting-person__hair" /></span>
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
        const [analyses, plans] = await Promise.all([listAgentExecutions(projectId), listTestDesignerExecutions()]);
        if (!active) return;
        setExecutions([...analyses.map(normalizeAnalysis), ...plans.filter((item) => item.projeto.id === projectId).map(normalizePlan)].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
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

  const analyzerExecution = executions.find((item) => item.agentId === 'agent1-analisador-us');
  const designerExecution = executions.find((item) => item.agentId === 'agent2-desenhista-testes');
  const analyzerIsActive = analyzerExecution?.status === 'processing' || analyzerExecution?.status === 'queued';
  const refinementMeetingActive = analyzerExecution?.status === 'processing';
  const designerProductionActive = designerExecution?.status === 'processing';
  const supportAgentNumbers = [1, 3, 4, 9, 5, 6, 7, 8];
  const reactingSupportAgent = supportAgentNumbers[Math.floor(now / 5000) % supportAgentNumbers.length];
  const stations = useMemo<AgentStation[]>(() => AGENTS_CATALOG.map((agent) => {
    const execution = executions.find((item) => item.agentId === agent.id);
    if (designerProductionActive && agent.id !== 'agent2-desenhista-testes' && designerExecution) {
      return { agent, execution, state: 'supporting', reaction: agent.number === reactingSupportAgent ? SUPPORT_MESSAGES[agent.number] : undefined, displayProgress: designerExecution.progress };
    }
    if (!CONNECTED_AGENTS.has(agent.id)) return { agent, state: 'offline' };
    if (agent.id === 'agent2-desenhista-testes' && analyzerIsActive && analyzerExecution && execution?.status !== 'processing' && execution?.status !== 'queued') {
      return { agent, execution, state: 'collaborating', reaction: designerReaction(analyzerExecution.progress, now), displayProgress: analyzerExecution.progress, collaborationExecutionId: analyzerExecution.id };
    }
    return { agent, execution, state: executionState(execution) };
  }), [analyzerExecution, analyzerIsActive, designerExecution, designerProductionActive, executions, now, reactingSupportAgent]);
  const collaborationActive = stations.some((item) => item.state === 'collaborating');
  const activeCount = refinementMeetingActive || designerProductionActive ? stations.length : stations.filter((item) => item.state === 'working' || item.state === 'collaborating' || item.state === 'queued').length;
  const attentionCount = stations.filter((item) => item.state === 'attention').length;

  function openStation(station: AgentStation) {
    const execution = station.execution;
    if (station.collaborationExecutionId) {
      navigate(`/agents/analises/${station.collaborationExecutionId}`);
      return;
    }
    if (station.agent.id === 'agent1-analisador-us') {
      navigate(execution ? `/agents/analises/${execution.id}` : `/agents/agent1-analisador-us${projectId ? `?projeto=${projectId}` : ''}`);
    } else if (station.agent.id === 'agent2-desenhista-testes') {
      navigate('/agents/planos-teste');
    }
  }

  return (
    <section className="live-office-shell" aria-label="Sala de operações dos agents">
      <header className="live-office-header">
        <div className="live-office-title"><span className="live-office-brand-mark"><NexusMark size={36} /></span><div><span className="live-office-eyebrow"><i /> RENAULT NEXO · OPERAÇÃO AO VIVO</span><h1>Os Agents estão no escritório</h1><p>{projectName} · estados sincronizados a cada 4 segundos</p></div></div>
        <div className="live-office-kpis"><span><small>{refinementMeetingActive ? 'Em reunião' : designerProductionActive ? 'Nos postos' : 'Em atividade'}</small><strong>{activeCount}</strong></span><span><small>Pedem atenção</small><strong>{attentionCount}</strong></span><span><small>Conectados</small><strong>2 / {stations.length}</strong></span></div>
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
