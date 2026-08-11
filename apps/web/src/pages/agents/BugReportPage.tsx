import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon, Textarea } from '@/design-system';
import { getBugReportExecution, startBugReport, type BugReportJob } from '@/entities/agents/bug-report.api';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import './agents-orchestration.css';

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'A API não respondeu à solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível iniciar a geração do bug report.';
}

function ProcessingOverlay({ job, onClose }: { job: BugReportJob; onClose: () => void }) {
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  return (
    <div className="agent-processing-overlay" role="dialog" aria-modal="true" aria-labelledby="bug-report-processing-title">
      <section className="agent-processing-modal">
        <header>
          <div className={`agent-processing-mark${isCompleted ? ' is-complete' : isFailed ? ' is-failed' : ''}`}>
            <Icon name={isCompleted ? 'audit' : isFailed ? 'info' : 'spinner'} size={24} />
          </div>
          <div>
            <small>AGENT 7 · CLAUDE</small>
            <h2 id="bug-report-processing-title">{isCompleted ? 'Bug report concluído' : isFailed ? 'Não foi possível concluir' : 'Documentando os defeitos'}</h2>
            <p>{job.message}</p>
          </div>
        </header>
        <div className="agent-processing-progress"><div><span>Progresso estimado</span><strong>{job.progress}%</strong></div><i><b style={{ width: `${job.progress}%` }} /></i></div>
        <p><i />{job.live.characters.toLocaleString('pt-BR')} caracteres recebidos do Claude</p>
        {isFailed && <div className="agent-processing-error"><Icon name="info" size={17} />{job.error || 'Falha desconhecida durante a geração do bug report.'}</div>}
        <footer>
          <span>{isCompleted ? `${job.result?.totais.documentados ?? 0} bug(s) registrados no índice do projeto.` : isFailed ? 'Nenhum bug foi registrado para esta execução.' : 'A geração pode levar alguns instantes.'}</span>
          {(isCompleted || isFailed) && <Button variant={isCompleted ? 'primary' : 'secondary'} onClick={onClose}>{isCompleted ? 'Ver índice de bugs' : 'Fechar'}</Button>}
        </footer>
      </section>
    </div>
  );
}

export function BugReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const initialProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? '';
  const [projectOverride, setProjectOverride] = useState('');
  const projectId = projectOverride || initialProjectId;

  const [tema, setTema] = useState('');
  const [evidencias, setEvidencias] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<BugReportJob | null>(null);
  const [processingOpen, setProcessingOpen] = useState(false);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => () => { if (pollRef.current) window.clearTimeout(pollRef.current); }, []);

  const canSubmit = Boolean(projectId) && evidencias.trim().length >= 20;

  function poll(id: string, delayMs = 900) {
    pollRef.current = window.setTimeout(async () => {
      try {
        const updated = await getBugReportExecution(id);
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
      const startedJob = await startBugReport({ projetoId: projectId, tema: tema.trim() || undefined, evidencias: evidencias.trim() });
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
    if (job?.status === 'completed') navigate('/agents/bugs');
  }

  return (
    <div className="agent-detail-page">
      {processingOpen && job && <ProcessingOverlay job={job} onClose={closeProcessing} />}
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate(`/agents${projectId ? `?projeto=${projectId}` : ''}`)}>← Voltar para orquestração</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="clipboardCheck" size={25} /></span>
          <span><small>AGENT 7 · QUALIDADE</small><h1>Gerador de Bug Report</h1><p>Transforma a evidência de um defeito em um bug report completo e numera automaticamente o próximo BUG-ID do projeto.</p></span>
        </div>
        <div className="agent-detail-provider"><i />Claude (Anthropic) conectado</div>
      </header>

      <div className="agent-detail-grid">
        <section className="agent-detail-card agent-input-card">
          <header><span>1</span><div><h2>Descreva o defeito</h2><p>Cole a evidência de um ou mais bugs — o agent separa e documenta cada um.</p></div></header>

          <label className="agent-field"><span>Projeto <b>*</b></span><select value={projectId} onChange={(event) => setProjectOverride(event.target.value)} disabled={projectsLoading || running}><option value="">Selecione um projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome} · {project.codigo}</option>)}</select></label>
          <label className="agent-field"><span>Tema (opcional)</span><input value={tema} onChange={(event) => setTema(event.target.value)} placeholder="Ex.: consignment-notes, checkout" maxLength={120} disabled={running} /></label>

          <label className="agent-field">
            <span>Evidência do(s) bug(s) <b>*</b></span>
            <Textarea rows={16} value={evidencias} onChange={(event) => setEvidencias(event.target.value)} placeholder="Descreva o que aconteceu de errado: passos para reproduzir, resultado obtido, resultado esperado, request/response se houver, TC-ID relacionado..." disabled={running} />
            <small>{evidencias.length.toLocaleString('pt-BR')} / 60.000 caracteres</small>
          </label>

          {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
          <Button variant="primary" size="lg" block loading={running} disabled={!canSubmit} onClick={execute}>{running ? 'Documentando com Claude...' : 'Gerar bug report'}</Button>
          <p className="agent-execution-note"><Icon name="info" size={14} /> Sem triagem formal do Agent 6 ainda, a evidência entra direto do texto acima — nada é inventado além do que você descrever.</p>
        </section>

        <aside className="agent-detail-card agent-scope-card">
          <header><span>2</span><div><h2>O que será entregue</h2><p>Um bug documentado e numerado por defeito real.</p></div></header>
          <ul>
            <li><Icon name="clipboardCheck" size={17} /><span><strong>BUG-ID sequencial</strong>Numeração única por projeto, nunca reaproveitada.</span></li>
            <li><Icon name="audit" size={17} /><span><strong>Report completo</strong>Passos, resultado obtido x esperado, evidência técnica e AC violado.</span></li>
            <li><Icon name="folder" size={17} /><span><strong>Índice de bugs</strong>Status editável pelo time (Aberto, Corrigido, Invalidado).</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
