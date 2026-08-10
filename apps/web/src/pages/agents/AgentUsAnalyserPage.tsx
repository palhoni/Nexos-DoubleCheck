import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon, Textarea } from '@/design-system';
import { getAgentExecution, listAgentExecutions, startUsAnalyser, type AgentExecutionHistoryItem, type AgentExecutionJob, type StructuredUsAnalysis, type UsAnalyserResult } from '@/entities/agents/agent-execution.api';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import './agents-orchestration.css';

const MAX_FILE_SIZE = 1_000_000;
type ResultTab = 'requisito' | 'gate' | 'perguntas' | 'cenarios' | 'regras' | 'tecnico';

const RESULT_TABS: Array<{ id: ResultTab; label: string; icon: 'folder' | 'audit' | 'search' | 'clipboardCheck' | 'info' }> = [
  { id: 'requisito', label: 'Requisito reescrito', icon: 'folder' },
  { id: 'gate', label: 'Gate de qualidade', icon: 'audit' },
  { id: 'perguntas', label: 'Perguntas', icon: 'search' },
  { id: 'cenarios', label: 'Cenários de teste', icon: 'clipboardCheck' },
  { id: 'regras', label: 'Regras de negócio', icon: 'info' },
];

function EmptyAnalysisSection({ text }: { text: string }) {
  return <div className="agent-result-empty"><Icon name="info" size={22} /><strong>Nenhum item identificado</strong><span>{text}</span></div>;
}

function GateScore({ label, score, description }: { label: string; score: number; description: string }) {
  const safeScore = Math.max(0, Math.min(10, Number(score) || 0));
  const tone = safeScore >= 7 ? 'good' : safeScore >= 4 ? 'attention' : 'critical';
  return (
    <article className={`agent-gate-score is-${tone}`}>
      <div><span>{label}</span><strong>{safeScore}<small>/10</small></strong></div>
      <i><b style={{ width: `${safeScore * 10}%` }} /></i>
      <p>{description}</p>
    </article>
  );
}

const PROCESS_PHASES = [
  { id: 'context', label: 'Contexto do projeto' },
  { id: 'copilot', label: 'Conexão com o Copilot' },
  { id: 'requirement', label: 'Reescrita do requisito' },
  { id: 'gate', label: 'Gate de qualidade' },
  { id: 'rules', label: 'Regras de negócio' },
  { id: 'questions', label: 'Perguntas de refinamento' },
  { id: 'scenarios', label: 'Cenários de teste' },
  { id: 'structuring', label: 'Organização visual' },
] as const;

function ProcessingModal({ job, onClose }: { job: AgentExecutionJob; onClose: () => void }) {
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

  return (
    <div className="agent-processing-overlay" role="dialog" aria-modal="true" aria-labelledby="agent-processing-title">
      <section className="agent-processing-modal">
        <header>
          <div className={`agent-processing-mark${isCompleted ? ' is-complete' : isFailed ? ' is-failed' : ''}`}><Icon name={isCompleted ? 'audit' : isFailed ? 'info' : 'spinner'} size={24} /></div>
          <div><small>AGENT 1 · GITHUB COPILOT</small><h2 id="agent-processing-title">{isCompleted ? 'Análise concluída' : isFailed ? 'Não foi possível concluir' : 'Analisando e reescrevendo a US'}</h2><p>{job.message}</p></div>
          <span className="agent-processing-time">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
        </header>

        <div className="agent-processing-progress"><div><span>Progresso estimado</span><strong>{job.progress}%</strong></div><i><b style={{ width: `${job.progress}%` }} /></i></div>

        <div className="agent-processing-body">
          <ol className="agent-processing-steps">{PROCESS_PHASES.map((phase, index) => {
            const done = isCompleted || index < currentIndex;
            const active = !isCompleted && !isFailed && index === currentIndex;
            return <li key={phase.id} className={done ? 'is-done' : active ? 'is-active' : ''}><i>{done ? '✓' : active ? <span /> : index + 1}</i><span>{phase.label}</span><em>{done ? 'Concluído' : active ? 'Em análise' : 'Aguardando'}</em></li>;
          })}</ol>

          <aside className="agent-live-summary">
            <h3>O que o agent já identificou</h3>
            {job.live.title && <div className="agent-live-title"><small>Requisito</small><strong>{job.live.title}</strong></div>}
            <div className="agent-live-metrics"><div><strong>{job.live.rules}</strong><span>Regras</span></div><div><strong>{job.live.questions}</strong><span>Perguntas</span></div><div><strong>{job.live.scenarios}</strong><span>Cenários</span></div></div>
            {job.live.gateStatus && <div className="agent-live-gate"><span>Gate preliminar</span><strong>{job.live.gateStatus}</strong></div>}
            <p><i />{job.live.characters.toLocaleString('pt-BR')} caracteres recebidos do Copilot</p>
          </aside>
        </div>

        {isFailed && <div className="agent-processing-error"><Icon name="info" size={17} />{job.error || 'Falha desconhecida durante a análise.'}</div>}
        <footer><span>{isCompleted ? 'O relatório visual está pronto para consulta.' : isFailed && job.result ? 'O conteúdo recebido antes da interrupção foi preservado.' : isFailed ? 'Nenhum conteúdo chegou antes da interrupção.' : 'A análise pode levar alguns minutos. Você pode acompanhar cada etapa aqui.'}</span>{(isCompleted || isFailed) && <Button variant={isCompleted || job.result ? 'primary' : 'secondary'} onClick={onClose}>{isCompleted ? 'Ver análise completa' : job.result ? 'Ver resultado parcial' : 'Fechar'}</Button>}</footer>
      </section>
    </div>
  );
}

function StructuredResult({ analysis, raw, activeTab }: { analysis: StructuredUsAnalysis; raw: string; activeTab: ResultTab }) {
  if (activeTab === 'requisito') return (
    <div className="agent-result-section">
      <div className="agent-requirement-summary">
        <div><small>IDENTIFICADOR</small><strong>{analysis.requisito.identificador}</strong></div>
        <div><small>MODO</small><strong>{analysis.requisito.modo}</strong></div>
        <div><small>ESCOPO</small><strong>{analysis.requisito.escopo}</strong></div>
      </div>
      <article className="agent-result-block agent-rewritten-story"><small>VERSÃO REESCRITA PELO AGENT</small><h3>{analysis.requisitoReescrito.titulo}</h3><blockquote>{analysis.requisitoReescrito.historiaUsuario}</blockquote><div className="agent-story-context"><div><b>Contexto</b><p>{analysis.requisitoReescrito.contexto}</p></div><div><b>Objetivo</b><p>{analysis.requisitoReescrito.objetivo}</p></div></div></article>
      <div className="agent-scope-columns"><article className="agent-result-block"><h3>Escopo incluído <span>{analysis.requisitoReescrito.escopoIncluido.length}</span></h3>{analysis.requisitoReescrito.escopoIncluido.length ? <ul className="agent-check-list">{analysis.requisitoReescrito.escopoIncluido.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyAnalysisSection text="Nenhum item de escopo confirmado." />}</article><article className="agent-result-block"><h3>Fora do escopo <span>{analysis.requisitoReescrito.escopoFora.length}</span></h3>{analysis.requisitoReescrito.escopoFora.length ? <ul className="agent-out-list">{analysis.requisitoReescrito.escopoFora.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyAnalysisSection text="O fora do escopo ainda não foi definido." />}</article></div>
      <article className="agent-result-block"><h3>Critérios de aceite reescritos <span>{analysis.requisitoReescrito.criteriosAceite.length}</span></h3>{analysis.requisitoReescrito.criteriosAceite.length ? <ol className="agent-criteria-list">{analysis.requisitoReescrito.criteriosAceite.map((item, index) => <li key={`${item.id}-${index}`}><b>{item.id || `AC${String(index + 1).padStart(2, '0')}`}</b><span>{item.descricao}<em className={`criterion-${item.tipo.toLowerCase().replaceAll(' ', '-')}`}>{item.tipo}</em></span></li>)}</ol> : <EmptyAnalysisSection text="O agent não conseguiu reescrever critérios testáveis sem decisões adicionais." />}</article>
      <div className="agent-requirement-support"><article className="agent-result-block"><h3>Dependências</h3><ul className="agent-simple-list">{analysis.requisitoReescrito.dependencias.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="agent-result-block"><h3>Premissas</h3><ul className="agent-simple-list">{analysis.requisitoReescrito.premissas.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="agent-result-block agent-human-decisions"><h3>Pendências do PO</h3><ul>{analysis.requisitoReescrito.pendencias.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
      {analysis.riscosAdicionais.length > 0 && <article className="agent-result-block"><h3>Riscos adicionais <span>{analysis.riscosAdicionais.length}</span></h3><ul className="agent-simple-list">{analysis.riscosAdicionais.map((item) => <li key={item}>{item}</li>)}</ul></article>}
    </div>
  );

  if (activeTab === 'gate') return (
    <div className="agent-result-section">
      <div className={`agent-gate-status is-${analysis.gate.status.toLowerCase()}`}><span>Resultado do gate</span><strong>{analysis.gate.status}</strong><p>{analysis.gate.status === 'PASS' ? 'Requisito em boas condições para avançar.' : analysis.gate.status === 'FAIL' ? 'Existem bloqueios críticos antes do desenvolvimento.' : 'Pode avançar após tratar as lacunas indicadas.'}</p></div>
      <div className="agent-gate-grid"><GateScore label="Coerência" score={analysis.gate.coerencia.nota} description={analysis.gate.coerencia.justificativa} /><GateScore label="Completude" score={analysis.gate.completude.nota} description={analysis.gate.completude.justificativa} /><GateScore label="Testabilidade" score={analysis.gate.testabilidade.nota} description={analysis.gate.testabilidade.justificativa} /></div>
      <article className="agent-result-block"><h3>Findings identificados <span>{analysis.gate.findings.length}</span></h3>{analysis.gate.findings.length ? <div className="agent-findings-list">{analysis.gate.findings.map((finding, index) => <div key={`${index}-${finding.categoria}`}><header><span>{finding.categoria}</span><em className={`severity-${finding.severidade.toLowerCase()}`}>{finding.severidade}</em></header><blockquote>{finding.trecho}</blockquote><p>{finding.recomendacao}</p></div>)}</div> : <EmptyAnalysisSection text="Nenhum finding adicional foi identificado." />}</article>
      {analysis.gate.decisoesHumanas.length > 0 && <article className="agent-result-block agent-human-decisions"><h3>Requer decisão humana <span>{analysis.gate.decisoesHumanas.length}</span></h3><ul>{analysis.gate.decisoesHumanas.map((item) => <li key={item}>{item}</li>)}</ul></article>}
    </div>
  );

  if (activeTab === 'perguntas') return analysis.perguntasRefinamento.length ? (
    <div className="agent-result-section"><div className="agent-result-table-wrap"><table className="agent-result-table"><thead><tr><th>ID</th><th>Pergunta para refinamento</th><th>Trecho de origem</th><th>Risco mitigado</th><th>Criticidade</th></tr></thead><tbody>{analysis.perguntasRefinamento.map((question) => <tr key={question.id}><td><b>{question.id}</b></td><td><strong>{question.pergunta}</strong></td><td>{question.trechoOrigem}</td><td>{question.riscoMitigado}</td><td><span className={`agent-criticality is-${question.criticidade.toLowerCase().replace('é', 'e')}`}>{question.criticidade}</span></td></tr>)}</tbody></table></div></div>
  ) : <EmptyAnalysisSection text="O agent não produziu perguntas de refinamento para este requisito." />;

  if (activeTab === 'cenarios') return analysis.cenariosTeste.length ? (
    <div className="agent-result-section"><div className="agent-scenario-grid">{analysis.cenariosTeste.map((scenario) => <article className="agent-scenario-card" key={scenario.id}><header><div><b>{scenario.id}</b><span>{scenario.escopo}</span></div><div><em>{scenario.tipo}</em><em className="is-execution">{scenario.execucao}</em></div></header><h3>{scenario.titulo}</h3><dl><div><dt>DADO</dt><dd>{scenario.dado}</dd></div><div><dt>QUANDO</dt><dd>{scenario.quando}</dd></div><div><dt>ENTÃO</dt><dd>{scenario.entao}</dd></div></dl><footer><span>Critério relacionado</span><strong>{scenario.criterioRelacionado}</strong></footer></article>)}</div></div>
  ) : <EmptyAnalysisSection text="Nenhum cenário foi estruturado nesta resposta." />;

  if (activeTab === 'regras') return analysis.regrasNegocio.length ? (
    <div className="agent-result-section"><div className="agent-rules-list">{analysis.regrasNegocio.map((rule) => <article key={rule.id}><header><b>{rule.id}</b><span className={`rule-status is-${rule.status.toLowerCase().replaceAll(' ', '-').replace('ç', 'c').replace('ã', 'a')}`}>{rule.status}</span></header><h3>{rule.regra}</h3><dl><div><dt>Origem no requisito</dt><dd>{rule.origem}</dd></div><div><dt>Risco relacionado</dt><dd>{rule.risco}</dd></div></dl></article>)}</div></div>
  ) : <EmptyAnalysisSection text="Nenhuma regra de negócio explícita ou inferida foi identificada." />;

  return <pre className="agent-technical-result">{raw}</pre>;
}

function normalizeRequirementFile(content: string) {
  if (!/<(?:html|body|div|p|table|h\d)\b/i.test(content)) return content.trim();
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'A API não respondeu à solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível iniciar a análise.';
}

function executionStatusLabel(status: AgentExecutionHistoryItem['status'], parcial: boolean) {
  if (status === 'completed') return 'Concluída';
  if (status === 'failed' && parcial) return 'Parcial preservada';
  if (status === 'failed') return 'Falhou';
  if (status === 'processing') return 'Em processamento';
  return 'Na fila';
}

function legacyAnalysis(title: string): StructuredUsAnalysis {
  return {
    requisito: { identificador: title || 'Não informado', titulo: title || 'Requisito funcional', resumo: 'Este resultado foi gerado antes da implantação do formato visual. O conteúdo integral permanece disponível em Relatório técnico.', modo: 'Não classificado', escopo: 'Não classificado', criteriosAceite: [] },
    requisitoReescrito: { titulo: title || 'Requisito funcional', historiaUsuario: 'Disponível após uma nova execução do agent.', contexto: 'Consulte o relatório técnico da execução anterior.', objetivo: 'Não informado.', escopoIncluido: [], escopoFora: [], criteriosAceite: [], dependencias: [], premissas: [], pendencias: [] },
    gate: { status: 'CONDITIONAL', coerencia: { nota: 0, justificativa: 'Consulte o relatório técnico.' }, completude: { nota: 0, justificativa: 'Consulte o relatório técnico.' }, testabilidade: { nota: 0, justificativa: 'Consulte o relatório técnico.' }, findings: [], decisoesHumanas: [] },
    regrasNegocio: [],
    perguntasRefinamento: [],
    cenariosTeste: [],
    riscosAdicionais: [],
  };
}

export function AgentUsAnalyserPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const initialProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? '';
  const [projectOverride, setProjectOverride] = useState('');
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [fileName, setFileName] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UsAnalyserResult | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('requisito');
  const [job, setJob] = useState<AgentExecutionJob | null>(null);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [history, setHistory] = useState<AgentExecutionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const projectId = projectOverride || initialProjectId;
  const resultAnalysis = result?.analise ?? legacyAnalysis(result?.titulo ?? title);
  const jobId = job?.id;
  const jobStatus = job?.status;

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listAgentExecutions(projectId || undefined));
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const savedJobId = window.sessionStorage.getItem('nexo.agent1.executionId');
    if (!savedJobId) return;
    void getAgentExecution(savedJobId).then((savedJob) => {
      setJob(savedJob);
      setProcessingOpen(savedJob.status === 'queued' || savedJob.status === 'processing');
      setRunning(savedJob.status === 'queued' || savedJob.status === 'processing');
      if (savedJob.result) setResult(savedJob.result);
    }).catch(() => window.sessionStorage.removeItem('nexo.agent1.executionId'));
  }, []);

  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const updated = await getAgentExecution(jobId);
        if (cancelled) return;
        setJob(updated);
        if (updated.status === 'completed' && updated.result) {
          setResult(updated.result);
          setResultTab('requisito');
          setRunning(false);
          void refreshHistory();
        } else if (updated.status === 'failed') {
          if (updated.result) {
            setResult(updated.result);
            setResultTab('requisito');
          }
          setRunning(false);
          setError(updated.error || 'O agent não conseguiu concluir a análise.');
          void refreshHistory();
        } else {
          timer = window.setTimeout(poll, 900);
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(poll, 1800);
      }
    };
    timer = window.setTimeout(poll, 500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, jobStatus, refreshHistory]);

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede 1 MB. Cole somente o texto relevante do requisito.');
      event.target.value = '';
      return;
    }
    try {
      const content = normalizeRequirementFile(await file.text());
      if (!content) throw new Error('O arquivo não contém texto legível.');
      setRequirement(content.slice(0, 120_000));
      setFileName(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (fileError) {
      setError(errorMessage(fileError));
    }
  }

  async function execute() {
    if (!projectId || requirement.trim().length < 20) return;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const startedJob = await startUsAnalyser({ projetoId: projectId, titulo: title.trim() || undefined, requisito: requirement.trim() });
      setJob(startedJob);
      window.sessionStorage.setItem('nexo.agent1.executionId', startedJob.id);
      setProcessingOpen(true);
      void refreshHistory();
    } catch (executionError) {
      setError(errorMessage(executionError));
      setRunning(false);
    }
  }

  async function openHistoryItem(item: AgentExecutionHistoryItem) {
    setError('');
    try {
      const savedJob = await getAgentExecution(item.id);
      setJob(savedJob);
      setResult(savedJob.result ?? null);
      setResultTab('requisito');
      setRunning(savedJob.status === 'queued' || savedJob.status === 'processing');
      setProcessingOpen(savedJob.status === 'queued' || savedJob.status === 'processing');
      window.sessionStorage.setItem('nexo.agent1.executionId', savedJob.id);
    } catch (historyError) {
      setError(errorMessage(historyError));
    }
  }

  return (
    <div className="agent-detail-page">
      {processingOpen && job && <ProcessingModal job={job} onClose={() => setProcessingOpen(false)} />}
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate(`/agents${projectId ? `?projeto=${projectId}` : ''}`)}>← Voltar para orquestração</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="clipboardCheck" size={25} /></span>
          <span><small>AGENT 1 · REQUISITOS</small><h1>Analisador de US</h1><p>Analisa o requisito, aponta dúvidas e riscos e propõe cenários de teste orientados por qualidade.</p></span>
        </div>
        <div className="agent-detail-provider"><i />GitHub Copilot autenticado</div>
      </header>

      <div className="agent-detail-grid">
        <section className="agent-detail-card agent-input-card">
          <header><span>1</span><div><h2>Prepare a análise</h2><p>O contexto fica isolado no projeto selecionado.</p></div></header>

          <label className="agent-field"><span>Projeto <b>*</b></span><select value={projectId} onChange={(event) => setProjectOverride(event.target.value)} disabled={projectsLoading || running}><option value="">Selecione um projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome} · {project.codigo}</option>)}</select></label>
          <label className="agent-field"><span>Título ou ID da US</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: CDS-12288" maxLength={180} disabled={running} /></label>

          <div className="agent-upload-row">
            <input ref={fileInputRef} className="agent-file-input" type="file" accept=".doc,.txt,.md,.html,.htm" onChange={loadFile} />
            <Button variant="secondary" icon="folder" onClick={() => fileInputRef.current?.click()} disabled={running}>Carregar requisito</Button>
            <span>{fileName || 'DOC, TXT, MD ou HTML · até 1 MB'}</span>
          </div>

          <label className="agent-field"><span>Requisito funcional <b>*</b></span><Textarea rows={16} value={requirement} onChange={(event) => { setRequirement(event.target.value); setResult(null); }} placeholder="Cole aqui a descrição, critérios de aceite, regras e referências do requisito..." disabled={running} /><small>{requirement.length.toLocaleString('pt-BR')} / 120.000 caracteres</small></label>

          {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
          <Button variant="primary" size="lg" block loading={running} disabled={!projectId || requirement.trim().length < 20} onClick={execute}>{running ? 'Analisando com GitHub Copilot...' : 'Iniciar análise do requisito'}</Button>
          <p className="agent-execution-note"><Icon name="info" size={14} /> O agent recebe apenas o texto acima e os dados do projeto. Ferramentas, comandos e gravação de arquivos ficam bloqueados.</p>
        </section>

        <aside className="agent-detail-card agent-scope-card">
          <header><span>2</span><div><h2>O que será entregue</h2><p>Saída completa em uma única análise.</p></div></header>
          <ul><li><Icon name="folder" size={17} /><span><strong>Requisito reescrito</strong>Versão clara, organizada e testável para o PO.</span></li><li><Icon name="audit" size={17} /><span><strong>Gate de qualidade</strong>Coerência, completude e testabilidade.</span></li><li><Icon name="search" size={17} /><span><strong>Dúvidas de refinamento</strong>Perguntas vinculadas ao texto e risco mitigado.</span></li><li><Icon name="clipboardCheck" size={17} /><span><strong>Cenários de teste</strong>Happy path, negativos, bordas e rastreabilidade.</span></li><li><Icon name="info" size={17} /><span><strong>Decisões humanas</strong>Pontos que precisam de confirmação do PO.</span></li></ul>
        </aside>
      </div>

      <section className="agent-history-card">
        <header>
          <div><span className="agent-history-icon"><Icon name="clock" size={19} /></span><span><small>RESULTADOS SALVOS NO BANCO</small><h2>Histórico de análises</h2><p>Reabra resultados completos, parciais ou acompanhe execuções em andamento.</p></span></div>
          <button type="button" onClick={() => void refreshHistory()} disabled={historyLoading}>{historyLoading ? 'Atualizando...' : 'Atualizar histórico'}</button>
        </header>
        {history.length ? <div className="agent-history-list">{history.map((item) => (
          <button type="button" className="agent-history-row" key={item.id} onClick={() => void openHistoryItem(item)}>
            <span className={`agent-history-status is-${item.status}${item.parcial ? ' is-partial' : ''}`}><i />{executionStatusLabel(item.status, item.parcial)}</span>
            <span className="agent-history-title"><strong>{item.titulo || 'Requisito funcional'}</strong><small>{item.projeto.nome} · {item.projeto.codigo}</small></span>
            <span className="agent-history-owner"><small>Executado por</small><strong>{item.actorUser.nome}</strong></span>
            <span className="agent-history-date"><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</strong><small>{item.hasResult ? 'Resultado disponível' : `${item.progress}% processado`}</small></span>
            <span className="agent-history-open">Ver análise →</span>
          </button>
        ))}</div> : <div className="agent-history-empty"><Icon name="clock" size={23} /><strong>{historyLoading ? 'Carregando histórico...' : 'Nenhuma análise salva'}</strong><span>As próximas execuções aparecerão aqui automaticamente.</span></div>}
      </section>

      {result && (
        <section className="agent-result-card" aria-live="polite">
          <header><div><small>{result.parcial ? 'ANÁLISE PARCIAL PRESERVADA' : 'ANÁLISE CONCLUÍDA'}</small><h2>{result.titulo}</h2><p>{result.projeto.nome} · {result.provider} · {(result.duracaoMs / 1000).toFixed(1)}s</p></div><Button variant="secondary" onClick={() => navigator.clipboard.writeText(result.resultado)}>Copiar relatório {result.parcial ? 'parcial' : 'completo'}</Button></header>
          {result.parcial && <div className="agent-partial-warning"><Icon name="info" size={17} /><span><strong>Execução interrompida — resultado parcial recuperado</strong>{result.motivoInterrupcao || 'A execução terminou antes de concluir todas as seções.'}</span></div>}
          <nav className="agent-result-tabs" aria-label="Seções da análise">
            {RESULT_TABS.map((tab) => <button type="button" key={tab.id} className={resultTab === tab.id ? 'is-active' : ''} onClick={() => setResultTab(tab.id)}><Icon name={tab.icon} size={15} />{tab.label}<b>{tab.id === 'perguntas' ? resultAnalysis.perguntasRefinamento.length : tab.id === 'cenarios' ? resultAnalysis.cenariosTeste.length : tab.id === 'regras' ? resultAnalysis.regrasNegocio.length : ''}</b></button>)}
            <button type="button" className={resultTab === 'tecnico' ? 'is-active is-technical' : 'is-technical'} onClick={() => setResultTab('tecnico')}>Relatório técnico</button>
          </nav>
          <StructuredResult analysis={resultAnalysis} raw={result.resultado} activeTab={resultTab} />
        </section>
      )}
    </div>
  );
}
