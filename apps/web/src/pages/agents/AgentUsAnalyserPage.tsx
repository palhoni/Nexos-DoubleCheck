import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon, Textarea } from '@/design-system';
import { extractRequirementFile, getAgentExecution, startUsAnalyser, type AgentExecutionJob, type StructuredUsAnalysis } from '@/entities/agents/agent-execution.api';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import './agents-orchestration.css';

const MAX_FILE_SIZE = 1_000_000;
const MAX_PDF_SIZE = 10_000_000;
export type ResultTab = 'requisito' | 'gate' | 'perguntas' | 'cenarios' | 'regras' | 'tecnico';

export const RESULT_TABS: Array<{ id: ResultTab; label: string; icon: 'folder' | 'audit' | 'search' | 'clipboardCheck' | 'info' }> = [
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

function RiskIndicator({ value }: { value: string }) {
  const risk = String(value ?? '').trim();
  const match = risk.match(/^(?:(?:risco|risk|severidade|severity|impacto|impact)\s*(?:[:=-]\s*)?)?(critical|cr[ií]tic[oa]|high|alto|alta|medium|moderate|m[eé]dio|m[eé]dia|moderado|moderada|low|baixo|baixa)\b\s*(?:[-–—:]\s*)?(.*)$/i);
  const normalizedLevel = (match?.[1] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedRisk = risk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const inferredTone = /lgpd|privacidade|compliance|legal|seguranca|fraude|vazamento|dados pessoais|perda de dados|indisponibilidade|fora do sorteio|bloquei/.test(normalizedRisk)
    ? 'high'
    : /falha|falhar|incorret|inconsist|integracao|duplic|atras|qualidade|experiencia|confus|contagem/.test(normalizedRisk)
      ? 'medium'
      : 'low';
  const tone = normalizedLevel
    ? normalizedLevel.startsWith('critic') || normalizedLevel === 'high' || normalizedLevel.startsWith('alt')
      ? 'high'
      : normalizedLevel === 'medium' || normalizedLevel.startsWith('moder') || normalizedLevel.startsWith('medi')
        ? 'medium'
        : 'low'
    : inferredTone;
  const label = tone === 'high' ? 'Alto' : tone === 'medium' ? 'Médio' : 'Baixo';
  const description = match?.[2]?.trim() || risk || 'O agent não forneceu uma descrição para este risco.';
  const inferred = !match;

  return <span className="agent-risk"><em className={`agent-risk__tag is-${tone}${inferred ? ' is-inferred' : ''}`} title={inferred ? 'Severidade inferida a partir da descrição do risco' : `Severidade informada pelo agent: ${match[1]}`}>{label}</em><span>{description}</span></span>;
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

function severityPresentation(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized === 'critical' || normalized === 'critico') return { tone: 'critical', label: 'Crítica' };
  if (normalized === 'high' || normalized === 'alta' || normalized === 'alto') return { tone: 'high', label: 'Alta' };
  if (normalized === 'medium' || normalized === 'media' || normalized === 'medio') return { tone: 'medium', label: 'Média' };
  if (normalized === 'low' || normalized === 'baixa' || normalized === 'baixo') return { tone: 'low', label: 'Baixa' };
  return { tone: 'medium', label: value || 'Média' };
}

function findingCategoryPresentation(value: string) {
  const categories: Record<string, string> = {
    'dependency-gap': 'Dependência não definida',
    'missing-criteria': 'Critério ausente',
    ambiguity: 'Ambiguidade',
    untestable: 'Não testável',
    contradiction: 'Contradição',
    incomplete: 'Incompleto',
    inconsistency: 'Inconsistência',
    security: 'Segurança',
    privacy: 'Privacidade',
    compliance: 'Conformidade',
  };
  return categories[value.trim().toLowerCase()] ?? value.replaceAll('-', ' ');
}

function humanDecisionPresentation(value: string) {
  const match = value.trim().match(/^\[?\s*(?:needs?\s+po\s+confirmation|po\s+confirmation|required\s+decision)\s*:\s*(.*?)\s*]?$/i);
  return match?.[1] ?? value;
}

export function StructuredResult({ analysis, raw, activeTab }: { analysis: StructuredUsAnalysis; raw: string; activeTab: ResultTab }) {
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
      <article className="agent-result-block"><h3>Pontos de atenção identificados <span>{analysis.gate.findings.length}</span></h3>{analysis.gate.findings.length ? <div className="agent-findings-list">{analysis.gate.findings.map((finding, index) => { const severity = severityPresentation(finding.severidade); return <div key={`${index}-${finding.categoria}`}><header><span>{findingCategoryPresentation(finding.categoria)}</span><em className={`severity-${severity.tone}`}>{severity.label}</em></header><blockquote>{finding.trecho}</blockquote><p>{finding.recomendacao}</p></div>; })}</div> : <EmptyAnalysisSection text="Nenhum ponto de atenção adicional foi identificado." />}</article>
      {analysis.gate.decisoesHumanas.length > 0 && <article className="agent-result-block agent-human-decisions"><h3>Decisões que precisam do PO <span>{analysis.gate.decisoesHumanas.length}</span></h3><ul>{analysis.gate.decisoesHumanas.map((item) => <li key={item}>{humanDecisionPresentation(item)}</li>)}</ul></article>}
    </div>
  );

  if (activeTab === 'perguntas') return analysis.perguntasRefinamento.length ? (
    <div className="agent-result-section"><div className="agent-result-table-wrap"><table className="agent-result-table"><thead><tr><th>ID</th><th>Pergunta para refinamento</th><th>Trecho de origem</th><th>Risco mitigado</th><th>Criticidade</th></tr></thead><tbody>{analysis.perguntasRefinamento.map((question) => <tr key={question.id}><td><b>{question.id}</b></td><td><strong>{question.pergunta}</strong></td><td>{question.trechoOrigem}</td><td>{question.riscoMitigado}</td><td><span className={`agent-criticality is-${question.criticidade.toLowerCase().replace('é', 'e')}`}>{question.criticidade}</span></td></tr>)}</tbody></table></div></div>
  ) : <EmptyAnalysisSection text="O agent não produziu perguntas de refinamento para este requisito." />;

  if (activeTab === 'cenarios') return analysis.cenariosTeste.length ? (
    <div className="agent-result-section"><div className="agent-scenario-grid">{analysis.cenariosTeste.map((scenario) => <article className="agent-scenario-card" key={scenario.id}><header><div><b>{scenario.id}</b><span>{scenario.escopo}</span></div><div><em>{scenario.tipo}</em><em className="is-execution">{scenario.execucao}</em></div></header><h3>{scenario.titulo}</h3><dl><div><dt>DADO</dt><dd>{scenario.dado}</dd></div><div><dt>QUANDO</dt><dd>{scenario.quando}</dd></div><div><dt>ENTÃO</dt><dd>{scenario.entao}</dd></div></dl><footer><span>Critério relacionado</span><strong>{scenario.criterioRelacionado}</strong></footer></article>)}</div></div>
  ) : <EmptyAnalysisSection text="Nenhum cenário foi estruturado nesta resposta." />;

  if (activeTab === 'regras') return analysis.regrasNegocio.length ? (
    <div className="agent-result-section"><div className="agent-rules-list">{analysis.regrasNegocio.map((rule) => <article key={rule.id}><header><b>{rule.id}</b><span className={`rule-status is-${rule.status.toLowerCase().replaceAll(' ', '-').replace('ç', 'c').replace('ã', 'a')}`}>{rule.status}</span></header><h3>{rule.regra}</h3><dl><div><dt>Origem no requisito</dt><dd>{rule.origem}</dd></div><div className="agent-rule-risk"><dt>Risco relacionado</dt><dd><RiskIndicator value={rule.risco} /></dd></div></dl></article>)}</div></div>
  ) : <EmptyAnalysisSection text="Nenhuma regra de negócio explícita ou inferida foi identificada." />;

  return <pre className="agent-technical-result">{raw}</pre>;
}

function normalizeRequirementFile(content: string) {
  if (!/<(?:html|body|div|p|table|h\d)\b/i.test(content)) return content.trim();
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const JIRA_SECTION_TITLES = new Set([
  'Descrição', 'Contexto', 'Objetivo', 'Tracking', 'Taxonomia', 'Comentários', 'Regras:',
  'Pontos em aberto:', 'Objetivos do framing', 'Ideia inicial:', '2 Round de ideias:', 'OLD',
]);

function formatRequirementText(content: string) {
  const decoded = new DOMParser().parseFromString(content, 'text/html').documentElement.textContent ?? content;
  const lines = decoded.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').split('\n');
  const formatted: string[] = [];
  for (const originalLine of lines) {
    let line = originalLine.trim();
    if (!line) {
      if (formatted.at(-1) !== '') formatted.push('');
      continue;
    }
    if (/^https?:\/\/jira\.dt\.renault\.com\/si\/jira\.issueviews:/i.test(line)) continue;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s+\[#?[A-Z]+-\d+]/i.test(line)) continue;
    if (/^\d+\/\d+$/.test(line) || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
    if (/^-{10,}$/.test(line)) {
      formatted.push('', '## Conteúdo anterior', '');
      continue;
    }
    line = line.split(/\t+/).map((part) => part.trim()).filter(Boolean).join(' | ');
    const issueHeader = formatted.length === 0
      ? line.match(/^(\[#?[A-Z]+-\d+]\s+.*?)\s+Criado:\s*(.*?)\s+Atualizado:\s*(.+)$/i)
      : null;
    if (issueHeader) {
      formatted.push(`# ${issueHeader[1]}`, `Criado: ${issueHeader[2]}`, `Atualizado: ${issueHeader[3]}`, '');
      continue;
    }
    if (formatted.length === 0 && /^\[#?[A-Z]+-\d+]/i.test(line)) line = `# ${line}`;
    else if (JIRA_SECTION_TITLES.has(line)) line = `## ${line.replace(/:$/, '')}`;
    if (line.startsWith('## ') && formatted.at(-1) !== '') formatted.push('');
    formatted.push(line);
    if (line.startsWith('## ')) formatted.push('');
  }
  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function RequirementPreview({ content }: { content: string }) {
  const lines = content.split('\n');
  return <div className="agent-requirement-preview">{lines.map((line, index) => {
    const key = `${index}-${line.slice(0, 24)}`;
    if (!line) return <div className="agent-preview-space" key={key} />;
    if (line.startsWith('# ')) return <h3 key={key}>{line.slice(2)}</h3>;
    if (line.startsWith('## ')) return <h4 key={key}>{line.slice(3)}</h4>;
    if (line.includes(' | ')) return <div className="agent-preview-table-row" key={key}>{line.split(' | ').map((cell, cellIndex) => <span key={`${key}-${cellIndex}`}>{cell}</span>)}</div>;
    const metadata = line.match(/^([^:]{2,45}):\s*(.+)$/);
    if (metadata && !/^https?:/i.test(line)) return <div className="agent-preview-metadata" key={key}><strong>{metadata[1]}</strong><span>{metadata[2]}</span></div>;
    if (/^https?:\/\//i.test(line)) return <p className="agent-preview-link" key={key}>{line}</p>;
    return <p key={key}>{line}</p>;
  })}</div>;
}

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'A API não respondeu à solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível iniciar a análise.';
}

export function legacyAnalysis(title: string): StructuredUsAnalysis {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: projectsData, isLoading: projectsLoading } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const requestedProjectId = searchParams.get('projeto');
  const newAnalysisRequested = searchParams.get('nova') === '1';
  const initialProjectId = requestedProjectId && projects.some((project) => project.id === requestedProjectId) ? requestedProjectId : projects[0]?.id ?? '';
  const [projectOverride, setProjectOverride] = useState('');
  const [title, setTitle] = useState('');
  const [requirement, setRequirement] = useState('');
  const [requirementView, setRequirementView] = useState<'edit' | 'preview'>('edit');
  const [fileName, setFileName] = useState('');
  const [extractingFile, setExtractingFile] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<AgentExecutionJob | null>(null);
  const [processingOpen, setProcessingOpen] = useState(false);
  const projectId = projectOverride || initialProjectId;
  const jobId = job?.id;
  const jobStatus = job?.status;

  useEffect(() => {
    if (newAnalysisRequested) {
      window.sessionStorage.removeItem('nexo.agent1.executionId');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('nova');
      setSearchParams(nextParams, { replace: true });
      return;
    }
    const savedJobId = window.sessionStorage.getItem('nexo.agent1.executionId');
    if (!savedJobId) return;
    void getAgentExecution(savedJobId).then((savedJob) => {
      if (savedJob.status === 'completed' || savedJob.status === 'failed') {
        window.sessionStorage.removeItem('nexo.agent1.executionId');
        return;
      }
      setJob(savedJob);
      setProcessingOpen(savedJob.status === 'queued' || savedJob.status === 'processing');
      setRunning(savedJob.status === 'queued' || savedJob.status === 'processing');
    }).catch(() => window.sessionStorage.removeItem('nexo.agent1.executionId'));
  }, [newAnalysisRequested, searchParams, setSearchParams]);

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
          setRunning(false);
          setProcessingOpen(false);
          window.sessionStorage.removeItem('nexo.agent1.executionId');
          navigate(`/agents/analises/${updated.id}`, { replace: true });
        } else if (updated.status === 'failed') {
          if (updated.result) {
            setRunning(false);
            setProcessingOpen(false);
            window.sessionStorage.removeItem('nexo.agent1.executionId');
            navigate(`/agents/analises/${updated.id}`, { replace: true });
            return;
          }
          setRunning(false);
          setError(updated.error || 'O agent não conseguiu concluir a análise.');
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
  }, [jobId, jobStatus, navigate]);

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const sizeLimit = isPdf ? MAX_PDF_SIZE : MAX_FILE_SIZE;
    if (file.size > sizeLimit) {
      setError(`O arquivo excede ${isPdf ? '10 MB' : '1 MB'}.`);
      event.target.value = '';
      return;
    }
    setExtractingFile(true);
    try {
      const extracted = isPdf ? await extractRequirementFile(file) : null;
      const content = extracted?.texto ?? normalizeRequirementFile(await file.text());
      if (!content) throw new Error('O arquivo não contém texto legível.');
      setRequirement(formatRequirementText(content).slice(0, 120_000));
      setRequirementView('preview');
      setFileName(file.name);
      if (!title) setTitle(extracted?.tituloSugerido ?? file.name.replace(/\.[^.]+$/, ''));
      if (extracted?.truncado) setError('O PDF ultrapassou 120.000 caracteres e foi limitado para a análise.');
    } catch (fileError) {
      setError(errorMessage(fileError));
    } finally {
      setExtractingFile(false);
    }
  }

  function pasteRequirement(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = event.clipboardData.getData('text/plain');
    if (!pasted) return;
    event.preventDefault();
    const target = event.currentTarget;
    const before = requirement.slice(0, target.selectionStart);
    const after = requirement.slice(target.selectionEnd);
    setRequirement(`${before}${formatRequirementText(pasted)}${after}`.slice(0, 120_000));
  }

  async function execute() {
    if (!projectId || requirement.trim().length < 20) return;
    setRunning(true);
    setError('');
    try {
      const startedJob = await startUsAnalyser({ projetoId: projectId, titulo: title.trim() || undefined, requisito: requirement.trim() });
      setJob(startedJob);
      window.sessionStorage.setItem('nexo.agent1.executionId', startedJob.id);
      setProcessingOpen(true);
    } catch (executionError) {
      setError(errorMessage(executionError));
      setRunning(false);
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
            <input ref={fileInputRef} className="agent-file-input" type="file" accept=".pdf,.doc,.txt,.md,.html,.htm" onChange={loadFile} />
            <Button variant="secondary" icon="folder" loading={extractingFile} onClick={() => fileInputRef.current?.click()} disabled={running || extractingFile}>{extractingFile ? 'Lendo PDF do Jira...' : 'Carregar requisito'}</Button>
            <span>{fileName || 'PDF do Jira até 10 MB · DOC, TXT, MD ou HTML até 1 MB'}</span>
          </div>

          <div className="agent-field agent-requirement-editor">
            <div className="agent-requirement-editor__head"><span>Requisito funcional <b>*</b></span><div><button type="button" className={requirementView === 'edit' ? 'is-active' : ''} onClick={() => setRequirementView('edit')}>Editar</button><button type="button" className={requirementView === 'preview' ? 'is-active' : ''} onClick={() => setRequirementView('preview')} disabled={!requirement.trim()}>Visualização organizada</button><button type="button" onClick={() => { setRequirement(formatRequirementText(requirement)); setRequirementView('preview'); }} disabled={!requirement.trim() || running}>Organizar texto</button></div></div>
            {requirementView === 'edit' ? <Textarea rows={18} value={requirement} onPaste={pasteRequirement} onChange={(event) => setRequirement(event.target.value)} placeholder="Cole aqui a descrição, critérios de aceite, regras e referências do requisito..." disabled={running} /> : <RequirementPreview content={requirement} />}
            <small>{requirement.length.toLocaleString('pt-BR')} / 120.000 caracteres</small>
          </div>

          {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}
          <Button variant="primary" size="lg" block loading={running} disabled={!projectId || requirement.trim().length < 20} onClick={execute}>{running ? 'Analisando com GitHub Copilot...' : 'Iniciar análise do requisito'}</Button>
          <p className="agent-execution-note"><Icon name="info" size={14} /> O agent recebe apenas o texto acima e os dados do projeto. Ferramentas, comandos e gravação de arquivos ficam bloqueados.</p>
        </section>

        <aside className="agent-detail-card agent-scope-card">
          <header><span>2</span><div><h2>O que será entregue</h2><p>Saída completa em uma única análise.</p></div></header>
          <ul><li><Icon name="folder" size={17} /><span><strong>Requisito reescrito</strong>Versão clara, organizada e testável para o PO.</span></li><li><Icon name="audit" size={17} /><span><strong>Gate de qualidade</strong>Coerência, completude e testabilidade.</span></li><li><Icon name="search" size={17} /><span><strong>Dúvidas de refinamento</strong>Perguntas vinculadas ao texto e risco mitigado.</span></li><li><Icon name="clipboardCheck" size={17} /><span><strong>Cenários de teste</strong>Happy path, negativos, bordas e rastreabilidade.</span></li><li><Icon name="info" size={17} /><span><strong>Decisões humanas</strong>Pontos que precisam de confirmação do PO.</span></li></ul>
        </aside>
      </div>

    </div>
  );
}
