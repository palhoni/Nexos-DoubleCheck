import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '@/design-system';
import {
  ENDPOINT_SOURCE_LABELS,
  getEndpointDiscoveryExecution,
  startEndpointDiscovery,
  type EndpointDiscoveryJob,
  type EndpointSourceInput,
  type EndpointSourceType,
} from '@/entities/agents/endpoint-discovery.api';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import './agents-orchestration.css';

const SOURCE_TYPES: EndpointSourceType[] = ['agente3', 'collection', 'swagger-url', 'swagger-arquivo', 'network-log', 'manual'];

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'A API não respondeu à solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível iniciar a descoberta de endpoints.';
}

function emptySource(): EndpointSourceInput {
  return { tipo: 'manual', conteudo: '' };
}

function ProcessingOverlay({ job, onClose }: { job: EndpointDiscoveryJob; onClose: () => void }) {
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  return (
    <div className="agent-processing-overlay" role="dialog" aria-modal="true" aria-labelledby="endpoint-processing-title">
      <section className="agent-processing-modal">
        <header>
          <div className={`agent-processing-mark${isCompleted ? ' is-complete' : isFailed ? ' is-failed' : ''}`}>
            <Icon name={isCompleted ? 'audit' : isFailed ? 'info' : 'spinner'} size={24} />
          </div>
          <div>
            <small>AGENT 4 · CLAUDE</small>
            <h2 id="endpoint-processing-title">{isCompleted ? 'Backlog concluído' : isFailed ? 'Não foi possível concluir' : 'Descobrindo e priorizando os endpoints'}</h2>
            <p>{job.message}</p>
          </div>
        </header>
        <div className="agent-processing-progress"><div><span>Progresso estimado</span><strong>{job.progress}%</strong></div><i><b style={{ width: `${job.progress}%` }} /></i></div>
        <p><i />{job.live.characters.toLocaleString('pt-BR')} caracteres recebidos do Claude</p>
        {isFailed && <div className="agent-processing-error"><Icon name="info" size={17} />{job.error || 'Falha desconhecida durante a descoberta de endpoints.'}</div>}
        <footer>
          <span>{isCompleted ? 'O backlog já foi salvo e está pronto para o time decidir.' : isFailed ? 'Nenhum backlog foi salvo para esta execução.' : 'A descoberta pode levar alguns minutos.'}</span>
          {(isCompleted || isFailed) && <Button variant={isCompleted ? 'primary' : 'secondary'} onClick={onClose}>{isCompleted ? 'Ver backlog' : 'Fechar'}</Button>}
        </footer>
      </section>
    </div>
  );
}

export function EndpointDiscoveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const initialProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? '';
  const [projectOverride, setProjectOverride] = useState('');
  const projectId = projectOverride || initialProjectId;

  const [sistema, setSistema] = useState('');
  const [fontes, setFontes] = useState<EndpointSourceInput[]>([emptySource()]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<EndpointDiscoveryJob | null>(null);
  const [processingOpen, setProcessingOpen] = useState(false);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => () => { if (pollRef.current) window.clearTimeout(pollRef.current); }, []);

  const fontesValidas = fontes.filter((fonte) => (fonte.tipo === 'swagger-url' ? Boolean(fonte.url?.trim()) : Boolean(fonte.conteudo?.trim())));
  const canSubmit = Boolean(projectId) && sistema.trim().length > 0 && fontesValidas.length > 0;

  function updateFonte(index: number, patch: Partial<EndpointSourceInput>) {
    setFontes((current) => current.map((fonte, i) => (i === index ? { ...fonte, ...patch } : fonte)));
  }

  function addFonte() {
    setFontes((current) => [...current, emptySource()]);
  }

  function removeFonte(index: number) {
    setFontes((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  function poll(id: string, delayMs = 900) {
    pollRef.current = window.setTimeout(async () => {
      try {
        const updated = await getEndpointDiscoveryExecution(id);
        setJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          setRunning(false);
          return;
        }
        poll(id, Math.min(delayMs + 200, 2500));
      } catch {
        poll(id, 2500);
      }
    }, delayMs);
  }

  async function execute() {
    if (!canSubmit) return;
    setRunning(true);
    setError('');
    try {
      const startedJob = await startEndpointDiscovery({ projetoId: projectId, sistema: sistema.trim(), fontes: fontesValidas });
      setJob(startedJob);
      setProcessingOpen(true);
      poll(startedJob.id);
    } catch (executionError) {
      setError(errorMessage(executionError));
      setRunning(false);
    }
  }

  function closeProcessing() {
    setProcessingOpen(false);
    if (job?.result?.backlogId) navigate(`/agents/endpoints/${job.result.backlogId}`);
  }

  return (
    <div className="agent-detail-page">
      {processingOpen && job && <ProcessingOverlay job={job} onClose={closeProcessing} />}
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate(`/agents${projectId ? `?projeto=${projectId}` : ''}`)}>← Voltar para orquestração</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="network" size={25} /></span>
          <span><small>AGENT 4 · DESCOBERTA</small><h1>Descobridor de Endpoints</h1><p>Consolida as fontes informadas num backlog de endpoints priorizado, pronto para o time decidir o que automatizar.</p></span>
        </div>
        <div className="agent-detail-provider"><i />Claude (Anthropic) conectado</div>
      </header>

      <div className="agent-detail-grid">
        <section className="agent-detail-card agent-input-card">
          <header><span>1</span><div><h2>Prepare a descoberta</h2><p>Informe o projeto, o sistema e ao menos uma fonte de endpoints.</p></div></header>

          <label className="agent-field"><span>Projeto <b>*</b></span><select value={projectId} onChange={(event) => setProjectOverride(event.target.value)} disabled={projectsLoading || running}><option value="">Selecione um projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome} · {project.codigo}</option>)}</select></label>
          <label className="agent-field"><span>Sistema ou módulo <b>*</b></span><input value={sistema} onChange={(event) => setSistema(event.target.value)} placeholder="Ex.: task-manager, checkout, user-management" maxLength={120} disabled={running} /></label>

          <div className="endpoint-sources">
            <div className="endpoint-sources__head"><span>Fontes dos endpoints <b>*</b></span><button type="button" onClick={addFonte} disabled={running}><Icon name="plus" size={14} /> Adicionar fonte</button></div>
            {fontes.map((fonte, index) => (
              <div className="endpoint-source-row" key={index}>
                <select value={fonte.tipo} onChange={(event) => updateFonte(index, { tipo: event.target.value as EndpointSourceType, url: undefined, conteudo: undefined })} disabled={running}>
                  {SOURCE_TYPES.map((tipo) => <option key={tipo} value={tipo}>{ENDPOINT_SOURCE_LABELS[tipo]}</option>)}
                </select>
                {fonte.tipo === 'swagger-url'
                  ? <input type="url" placeholder="https://exemplo.com/swagger.json" value={fonte.url ?? ''} onChange={(event) => updateFonte(index, { url: event.target.value })} disabled={running} />
                  : <textarea rows={3} placeholder="Cole aqui o conteúdo desta fonte (collection, lista de endpoints, logs...)" value={fonte.conteudo ?? ''} onChange={(event) => updateFonte(index, { conteudo: event.target.value })} disabled={running} />}
                <button type="button" className="endpoint-source-remove" onClick={() => removeFonte(index)} disabled={running || fontes.length === 1} aria-label="Remover fonte"><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>

          {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
          <Button variant="primary" size="lg" block loading={running} disabled={!canSubmit} onClick={execute}>{running ? 'Descobrindo endpoints com Claude...' : 'Iniciar descoberta de endpoints'}</Button>
          <p className="agent-execution-note"><Icon name="info" size={14} /> Nenhum dado real de payload é registrado — apenas a estrutura observada nas fontes informadas.</p>
        </section>

        <aside className="agent-detail-card agent-scope-card">
          <header><span>2</span><div><h2>O que será entregue</h2><p>Um backlog persistente, editável pelo time.</p></div></header>
          <ul>
            <li><Icon name="network" size={17} /><span><strong>Backlog normalizado</strong>ID, método, endpoint, autenticação e estrutura observada.</span></li>
            <li><Icon name="chart" size={17} /><span><strong>Prioridade sugerida</strong>Alta, média ou baixa, com o critério que justifica.</span></li>
            <li><Icon name="clipboardCheck" size={17} /><span><strong>Decisão do time</strong>Automatizar, adiar, não automatizar ou investigar — por endpoint.</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
