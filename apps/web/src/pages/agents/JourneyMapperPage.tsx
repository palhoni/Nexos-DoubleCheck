import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon } from '@/design-system';
import { getJourneyMapperExecution, startJourneyMapper, type JourneyMapperJob } from '@/entities/agents/journey-mapper.api';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import './agents-orchestration.css';

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const apiMessage = error.response?.data?.message;
    return Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage ?? 'A API não respondeu à solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível iniciar o mapeamento de jornadas.';
}

const PROCESS_PHASES = [
  { id: 'auditando-cobertura', label: 'Auditando cobertura de jornadas' },
  { id: 'compondo-narrativas', label: 'Compondo as narrativas com o Claude' },
  { id: 'persistindo', label: 'Salvando jornadas e relacionamentos' },
] as const;

function ProcessingOverlay({ job, onClose }: { job: JourneyMapperJob; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (job.status === 'completed' || job.status === 'failed') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job.status]);
  const elapsed = Math.max(0, Math.floor((now - new Date(job.createdAt).getTime()) / 1000));
  const currentIndex = PROCESS_PHASES.findIndex((phase) => phase.id === job.phase);
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const result = job.result;
  return (
    <div className="agent-processing-overlay" role="dialog" aria-modal="true" aria-labelledby="journey-mapper-processing-title">
      <section className="agent-processing-modal">
        <header>
          <div className={`agent-processing-mark${isCompleted ? ' is-complete' : isFailed ? ' is-failed' : ''}`}>
            <Icon name={isCompleted ? 'network' : isFailed ? 'info' : 'spinner'} size={24} />
          </div>
          <div>
            <small>MAPEADOR DE JORNADAS · CLAUDE</small>
            <h2 id="journey-mapper-processing-title">{isCompleted ? 'Mapeamento concluído' : isFailed ? 'Não foi possível concluir' : 'Compondo as jornadas'}</h2>
            <p>{job.message}</p>
          </div>
          <span className="agent-processing-time">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
        </header>
        <div className="agent-processing-progress"><div><span>Progresso estimado</span><strong>{job.progress}%</strong></div><i><b style={{ width: `${job.progress}%` }} /></i></div>
        <div className="agent-processing-body">
          <ol className="agent-processing-steps">
            {PROCESS_PHASES.map((phase, index) => {
              const done = isCompleted || index < currentIndex;
              const active = !isCompleted && !isFailed && index === currentIndex;
              return (
                <li key={phase.id} className={done ? 'is-done' : active ? 'is-active' : ''}>
                  <i>{done ? '✓' : active ? <span /> : index + 1}</i>
                  <span>{phase.label}</span>
                  <em>{done ? 'Concluído' : active ? 'Em andamento' : 'Aguardando'}</em>
                </li>
              );
            })}
          </ol>
          <aside className="agent-live-summary">
            <h3>Progresso da execução</h3>
            <p><i />{job.live.characters.toLocaleString('pt-BR')} caracteres recebidos do Claude</p>
          </aside>
        </div>
        {isFailed && <div className="agent-processing-error"><Icon name="info" size={17} />{job.error || 'Falha desconhecida durante o mapeamento de jornadas.'}</div>}
        {isCompleted && result && (
          <ul className="agent-processing-summary">
            <li><strong>{result.jornadasCriadas.length}</strong> jornada(s) nova(s)</li>
            <li><strong>{result.jornadasEstendidas.length}</strong> jornada(s) estendida(s)</li>
            <li><strong>{result.cobertura.cobertasDepois}/{result.cobertura.funcionalidadesTotais}</strong> funcionalidades cobertas (antes: {result.cobertura.cobertasAntes})</li>
            <li><strong>{result.relacionamentos.regras}</strong> regra(s) de negócio vinculada(s)</li>
            <li><strong>{result.relacionamentos.produtosParticipantes}</strong> produto(s) participante(s) vinculado(s)</li>
            <li><strong>{result.relacionamentos.fontes}</strong> fonte(s) de evidência vinculada(s)</li>
            <li><strong>{result.relacionamentos.documentos}</strong> documento(s) vinculado(s)</li>
            <li><strong>{result.foraDeEscopo.length}</strong> deixada(s) de fora de propósito</li>
            {result.erros.length > 0 && <li className="agent-processing-summary__warning"><strong>{result.erros.length}</strong> item(ns) da proposta não puderam ser aplicados</li>}
          </ul>
        )}
        <footer>
          <span>{isCompleted ? 'As jornadas já estão salvas no produto.' : isFailed ? 'Nenhuma jornada foi criada nesta execução.' : 'O mapeamento pode levar alguns instantes.'}</span>
          {(isCompleted || isFailed) && <Button variant={isCompleted ? 'primary' : 'secondary'} onClick={onClose}>{isCompleted ? 'Ver jornadas do produto' : 'Fechar'}</Button>}
        </footer>
      </section>
    </div>
  );
}

export function JourneyMapperPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const initialProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? '';
  const [projectOverride, setProjectOverride] = useState('');
  const projectId = projectOverride || initialProjectId;

  const { data: productsData, isLoading: productsLoading } = produtoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' }, projectId, { enabled: !!projectId });
  const products = useMemo(() => productsData?.data ?? [], [productsData?.data]);
  const [productOverride, setProductOverride] = useState('');
  const produtoId = productOverride || products[0]?.id || '';

  const [foco, setFoco] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<JourneyMapperJob | null>(null);
  const [processingOpen, setProcessingOpen] = useState(false);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => () => { if (pollRef.current) window.clearTimeout(pollRef.current); }, []);
  useEffect(() => { setProductOverride(''); }, [projectId]);

  const canSubmit = Boolean(produtoId) && !running;

  function poll(id: string, delayMs = 900) {
    pollRef.current = window.setTimeout(async () => {
      try {
        const updated = await getJourneyMapperExecution(id);
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
      const startedJob = await startJourneyMapper({ produtoId, foco: foco.trim() || undefined });
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
    if (job?.status === 'completed' && job.result) {
      navigate(`/projetos/${job.result.produto.projetoId}/produtos/${job.result.produto.id}?tab=jornadas`);
    }
  }

  return (
    <div className="agent-detail-page">
      {processingOpen && job && <ProcessingOverlay job={job} onClose={closeProcessing} />}
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate(`/agents${projectId ? `?projeto=${projectId}` : ''}`)}>← Voltar para orquestração</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="network" size={25} /></span>
          <span><small>CONHECIMENTO</small><h1>Mapeador de Jornadas</h1><p>Audita quais Funcionalidades ainda não pertencem a nenhuma Jornada e cria ou estende Jornadas para os fluxos ponta-a-ponta relevantes.</p></span>
        </div>
        <div className="agent-detail-provider"><i />Claude (Anthropic) conectado</div>
      </header>

      <div className="agent-detail-grid">
        <section className="agent-detail-card agent-input-card">
          <header><span>1</span><div><h2>Selecione o produto</h2><p>Jornada é sempre composta a partir da estrutura já cadastrada de um Produto.</p></div></header>

          <label className="agent-field"><span>Projeto <b>*</b></span><select value={projectId} onChange={(event) => setProjectOverride(event.target.value)} disabled={projectsLoading || running}><option value="">Selecione um projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome} · {project.codigo}</option>)}</select></label>
          <label className="agent-field"><span>Produto <b>*</b></span><select value={produtoId} onChange={(event) => setProductOverride(event.target.value)} disabled={!projectId || productsLoading || running}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nome} · {product.codigo}</option>)}</select></label>
          <label className="agent-field"><span>Foco (opcional)</span><input value={foco} onChange={(event) => setFoco(event.target.value)} placeholder="Ex.: focar nas jornadas de arbitragem" maxLength={160} disabled={running} /></label>

          {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
          <Button variant="primary" size="lg" block loading={running} disabled={!canSubmit} onClick={execute}>{running ? 'Mapeando com Claude...' : 'Mapear jornadas'}</Button>
          <p className="agent-execution-note"><Icon name="info" size={14} /> O produto precisa já ter Módulos, Funcionalidades e Público-alvo cadastrados — nada é inventado além do que já existe.</p>
        </section>

        <aside className="agent-detail-card agent-scope-card">
          <header><span>2</span><div><h2>O que será entregue</h2><p>Cobertura real de Jornadas sobre o Produto.</p></div></header>
          <ul>
            <li><Icon name="network" size={17} /><span><strong>Auditoria de cobertura</strong>Quais Funcionalidades já pertencem a uma Jornada e quais ainda não.</span></li>
            <li><Icon name="clipboardCheck" size={17} /><span><strong>Jornadas novas e estendidas</strong>Narrativas ponta-a-ponta salvas diretamente no Produto.</span></li>
            <li><Icon name="audit" size={17} /><span><strong>Regras, produtos, fontes e documentos</strong>Vincula Regras de negócio, Produtos participantes, Fontes e Documentos que evidenciam cada jornada.</span></li>
            <li><Icon name="box" size={17} /><span><strong>Fora de escopo, com motivo</strong>Capacidades de suporte não são forçadas para dentro de uma jornada.</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
