import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '@/design-system';
import { getAgentExecution, getTestDesignerExecution, listTestDesignerExecutions, startTestDesigner, type AgentExecutionJob, type TestDesignerHistoryItem, type TestDesignerJob } from '@/entities/agents/agent-execution.api';
import './agents-orchestration.css';

function compactNumber(value?: number) { return value === undefined ? '—' : new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
function historyStatus(item: TestDesignerHistoryItem) { return item.phase === 'truncated' ? 'Saída truncada' : item.phase === 'invalid-output' ? 'Saída inválida' : item.parcial ? 'Parcial' : item.status === 'completed' ? 'Concluído' : item.status; }

function DesignerProcessing({ job }: { job: TestDesignerJob }) {
  return <div className="agent-processing-overlay" role="dialog" aria-modal="true"><section className="agent-processing-modal test-designer-processing"><header><div className="agent-processing-mark"><Icon name="spinner" size={24} /></div><div><small>AGENT 2 · CLAUDE</small><h2>Desenhando o plano de testes</h2><p>{job.message}</p></div><span className="agent-processing-time">{job.progress}%</span></header><div className="agent-processing-progress"><div><span>Progresso estimado</span><strong>{job.progress}%</strong></div><i><b style={{ width: `${job.progress}%` }} /></i></div><div className="test-designer-live"><div><strong>{job.live.gaps}</strong><span>Gaps detectados</span></div><div><strong>{job.live.cases}</strong><span>Casos detectados</span></div><div><strong>{job.live.blockers}</strong><span>Bloqueadores</span></div><div><strong>{compactNumber(job.live.characters)}</strong><span>Caracteres recebidos</span></div><div><strong>{compactNumber(job.live.outputTokens)}</strong><span>Tokens de saída</span></div></div><footer><span>{job.live.model ? `Modelo: ${job.live.model} · ` : ''}{job.live.lastChunkAt ? `Último trecho: ${new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' }).format(new Date(job.live.lastChunkAt))}` : 'Aguardando o primeiro trecho...'}</span></footer></section></div>;
}

export function TestDesignerPage() {
  const { analysisExecutionId = '' } = useParams();
  const navigate = useNavigate();
  const [source, setSource] = useState<AgentExecutionJob | null>(null);
  const [history, setHistory] = useState<TestDesignerHistoryItem[]>([]);
  const [job, setJob] = useState<TestDesignerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getAgentExecution(analysisExecutionId), listTestDesignerExecutions(analysisExecutionId)])
      .then(([sourceJob, plans]) => { setSource(sourceJob); setHistory(plans); })
      .catch(() => setError('Não foi possível carregar a análise de origem.'))
      .finally(() => setLoading(false));
  }, [analysisExecutionId]);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return undefined;
    let cancelled = false; let timer: number | undefined;
    const poll = async () => {
      try {
        const updated = await getTestDesignerExecution(job.id);
        if (cancelled) return;
        setJob(updated);
        if (updated.result) navigate(`/agents/planos-teste/${updated.id}`, { replace: true });
        else if (updated.status !== 'failed') timer = window.setTimeout(poll, 900);
        else setError(updated.error || 'O Agent não conseguiu concluir o plano.');
      } catch { if (!cancelled) timer = window.setTimeout(poll, 1800); }
    };
    timer = window.setTimeout(poll, 600);
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [job, navigate]);

  async function execute() {
    setError('');
    try { setJob(await startTestDesigner(analysisExecutionId)); }
    catch { setError('Não foi possível iniciar o Desenhista de Testes.'); }
  }

  if (loading) return <div className="us-analysis-loading"><Icon name="spinner" size={25} /><strong>Carregando análise da US...</strong></div>;
  const analysis = source?.result?.analise;
  return <div className="test-designer-page">{job && (job.status === 'queued' || job.status === 'processing') && <DesignerProcessing job={job} />}
    <header className="test-designer-hero"><button type="button" onClick={() => navigate(`/agents/analises/${analysisExecutionId}`)}>← Voltar para a US</button><div><span><Icon name="chart" size={25} /></span><div><small>AGENT 2 · PLANEJAMENTO</small><h1>Desenhista de Testes</h1><p>Transforme a análise aprovada em cobertura, gaps e casos de teste rastreáveis.</p></div></div></header>
    {error && <div className="agent-execution-error"><Icon name="info" size={18} /><span>{error}</span></div>}
    <div className="test-designer-grid"><section className="test-designer-source"><header><span>1</span><div><h2>Fontes da revisão</h2><p>O Agent 2 relerá a OS original e confrontará sua leitura com a análise salva.</p></div></header><dl><div><dt>Identificador</dt><dd>{analysis?.requisito.identificador || source?.result?.titulo}</dd></div><div><dt>Projeto</dt><dd>{source?.result?.projeto.nome}</dd></div><div><dt>Escopo</dt><dd>{analysis?.requisito.escopo}</dd></div><div><dt>Gate</dt><dd>{analysis?.gate.status}</dd></div><div><dt>Cenários existentes</dt><dd>{analysis?.cenariosTeste.length ?? 0}</dd></div><div><dt>Critérios de aceite</dt><dd>{analysis?.requisitoReescrito.criteriosAceite.length ?? 0}</dd></div></dl><article><strong>{analysis?.requisitoReescrito.titulo}</strong><p>{analysis?.requisitoReescrito.objetivo}</p></article></section>
      <aside className="test-designer-delivery"><header><span>2</span><div><h2>O que será entregue</h2><p>Planejamento sem alteração de arquivos.</p></div></header><ul><li><Icon name="search" size={17} /><span><strong>Revisão independente</strong>OS original comparada à análise do Agent 1.</span></li><li><Icon name="chart" size={17} /><span><strong>Cobertura em 6 categorias</strong>Percentuais recalculados independentemente.</span></li><li><Icon name="network" size={17} /><span><strong>Rastreabilidade</strong>Requisitos ligados aos cenários existentes.</span></li><li><Icon name="info" size={17} /><span><strong>Gaps priorizados</strong>Somente gaps sustentados pelas fontes.</span></li><li><Icon name="clipboardCheck" size={17} /><span><strong>Decisão sobre novos casos</strong>Gerar casos adicionais apenas quando necessário.</span></li></ul><Button variant="primary" size="lg" block onClick={() => void execute()} disabled={!source?.result || job?.status === 'processing' || job?.status === 'queued'}>Revisar fontes e desenhar plano</Button></aside>
    </div>
    {history.length > 0 && <section className="test-designer-previous"><header><h2>Planos anteriores desta US</h2><span>{history.length}</span></header>{history.map((item) => <button type="button" key={item.id} onClick={() => navigate(`/agents/planos-teste/${item.id}`)}><span><strong>{item.titulo}</strong><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></span><em>{historyStatus(item)}</em><b>Abrir plano →</b></button>)}</section>}
  </div>;
}
