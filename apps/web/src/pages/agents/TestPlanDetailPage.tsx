import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '@/design-system';
import { getTestDesignerExecution, startTestDesigner, type StructuredTestPlan, type TestDesignerJob, type TestPlanMonitoring } from '@/entities/agents/agent-execution.api';
import './agents-orchestration.css';

type PlanTab = 'resumo' | 'cobertura' | 'rastreabilidade' | 'gaps' | 'casos' | 'checklist' | 'tecnico';

function severityClass(value: string) { const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return normalized.startsWith('critic') || normalized.startsWith('alt') ? 'high' : normalized.startsWith('medi') ? 'medium' : 'low'; }
function numberLabel(value?: number) { return value === undefined ? 'Não informado' : new Intl.NumberFormat('pt-BR').format(value); }

function MonitoringSummary({ data }: { data: TestPlanMonitoring }) {
  return <div className="test-plan-monitoring">
    <div><span>Término do modelo</span><strong className={data.finishReason === 'length' ? 'is-invalid' : data.finishReason === 'stop' ? 'is-valid' : ''}>{data.finishReason || 'Não informado'}</strong></div>
    <div><span>JSON</span><strong className={data.jsonValid ? 'is-valid' : 'is-invalid'}>{data.jsonValid ? 'Válido' : 'Inválido'}</strong></div>
    <div><span>Contrato</span><strong className={data.contractValid ? 'is-valid' : 'is-invalid'}>{data.contractValid ? 'Completo' : 'Incompleto'}</strong></div>
    <div><span>Tokens entrada / saída</span><strong>{numberLabel(data.inputTokens)} / {numberLabel(data.outputTokens)}</strong></div>
    <div><span>Casos detectados / estruturados</span><strong>{data.detected.cases} / {data.structured.cases}</strong></div>
    <div><span>Modelo</span><strong title={data.model}>{data.model || 'Não informado'}</strong></div>
    {data.validationErrors.length > 0 && <div className="test-plan-validation-errors"><strong>Problemas encontrados na resposta</strong><ul>{data.validationErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul></div>}
  </div>;
}

function PlanContent({ plan, tab, raw }: { plan: StructuredTestPlan; tab: PlanTab; raw: string }) {
  if (tab === 'resumo') return <div className="test-plan-section"><div className="test-plan-kpis"><div><span>Cobertura</span><strong>{plan.totais.requisitos ? Math.round((plan.totais.cobertos / plan.totais.requisitos) * 100) : 0}%</strong></div><div><span>Requisitos</span><strong>{plan.totais.requisitos}</strong></div><div><span>Gaps</span><strong>{plan.totais.gaps}</strong></div><div><span>Casos recomendados</span><strong>{plan.totais.casosRecomendados}</strong></div><div><span>Bloqueadores</span><strong>{plan.totais.bloqueadores}</strong></div></div><article className="test-plan-source-review"><header><div><small>REVISÃO INDEPENDENTE DE QA</small><h2>OS original × análise do Agent 1</h2></div><strong>{plan.revisaoIndependente.decisaoNovosCasos}</strong></header><p>{plan.revisaoIndependente.justificativa}</p><div className="test-plan-review-flags"><span className={plan.revisaoIndependente.osOriginalRevisada ? 'is-ok' : ''}>OS original {plan.revisaoIndependente.osOriginalRevisada ? 'revisada' : 'não comprovada'}</span><span className={plan.revisaoIndependente.analiseAgent1Revisada ? 'is-ok' : ''}>Análise do Agent 1 {plan.revisaoIndependente.analiseAgent1Revisada ? 'revisada' : 'não comprovada'}</span><span>{plan.revisaoIndependente.conclusao}</span></div>{plan.revisaoIndependente.divergencias.length > 0 && <div className="test-plan-review-differences">{plan.revisaoIndependente.divergencias.map((item) => <div key={item.id}><b>{item.id}</b><span><strong>{item.tipo}</strong>{item.descricao}<small>Impacto: {item.impacto}</small></span></div>)}</div>}</article><article className="test-plan-strategy"><small>ESTRATÉGIA RECOMENDADA</small><h2>{plan.resumo.titulo}</h2><p>{plan.resumo.estrategia}</p><div><span>{plan.resumo.escopo}</span><strong>{plan.resumo.status}</strong></div></article></div>;
  if (tab === 'cobertura') return <div className="test-plan-section"><div className="test-coverage-grid">{plan.cobertura.map((item) => <article key={item.categoria}><header><strong>{item.categoria}</strong><b>{item.percentual}%</b></header><i><span style={{ width: `${Math.max(0, Math.min(100, item.percentual))}%` }} /></i><p>{item.avaliacao}</p><small>{item.cobertos} de {item.requisitos} requisito(s) coberto(s)</small></article>)}</div></div>;
  if (tab === 'rastreabilidade') return <div className="test-plan-section"><div className="agent-result-table-wrap"><table className="agent-result-table"><thead><tr><th>Requisito</th><th>Descrição</th><th>Cenários relacionados</th><th>Cobertura</th></tr></thead><tbody>{plan.rastreabilidade.map((item) => <tr key={item.requisitoId}><td><b>{item.requisitoId}</b></td><td>{item.requisito}</td><td>{item.cenarioIds.join(', ') || '—'}</td><td><span className={`test-trace-status is-${item.cobertura.toLowerCase() === 'coberto' ? 'covered' : 'gap'}`}>{item.cobertura}</span></td></tr>)}</tbody></table></div></div>;
  if (tab === 'gaps') return <div className="test-plan-section"><div className="test-gap-grid">{plan.gaps.map((gap) => <article key={gap.id}><header><b>{gap.id}</b><span className={`agent-risk__tag is-${severityClass(gap.severidade)}`}>{gap.severidade}</span></header><h3>{gap.descricao}</h3><dl><div><dt>Categoria</dt><dd>{gap.categoria}</dd></div><div><dt>Requisito relacionado</dt><dd>{gap.requisitoRelacionado}</dd></div></dl>{gap.assuncao && <em>Requisito assumido — validar com o PO</em>}</article>)}</div></div>;
  if (tab === 'casos') return <div className="test-plan-section"><div className="test-case-grid">{plan.casosRecomendados.map((item) => <article key={item.id}><header><div><b>{item.id}</b><span>{item.gapId}</span></div><div><em>{item.prioridade}</em><em>{item.automacao}</em></div></header><h3>{item.nome}</h3><section><strong>Pré-condições</strong><ul>{item.precondicoes.map((step) => <li key={step}>{step}</li>)}</ul><strong>Passos</strong><ol>{item.passos.map((step) => <li key={step}>{step}</li>)}</ol><strong>Resultado esperado</strong><p>{item.resultadoEsperado}</p></section><footer>{item.categoria} · {item.escopo}</footer></article>)}</div></div>;
  if (tab === 'checklist') return <div className="test-plan-section test-plan-checklists"><article><h2>Bloqueadores antes da implementação</h2>{plan.checklist.bloqueadores.map((item) => <label key={item}><span />{item}</label>)}</article><article><h2>Ordem de implementação sugerida</h2><ol>{plan.checklist.ordemImplementacao.map((item) => <li key={item}>{item}</li>)}</ol></article>{plan.frontendForaEscopo.length > 0 && <article><h2>Cenários de frontend separados</h2>{plan.frontendForaEscopo.map((item) => <div key={item.cenarioId}><b>{item.cenarioId}</b><span><strong>{item.titulo}</strong><small>{item.motivo}</small></span></div>)}</article>}</div>;
  return <pre className="agent-technical-result">{raw}</pre>;
}

export function TestPlanDetailPage() {
  const { planExecutionId = '' } = useParams(); const navigate = useNavigate();
  const [job, setJob] = useState<TestDesignerJob | null>(null); const [tab, setTab] = useState<PlanTab>('resumo'); const [error, setError] = useState('');
  const [retryJob, setRetryJob] = useState<TestDesignerJob | null>(null); const [retryStarting, setRetryStarting] = useState(false); const [retryError, setRetryError] = useState('');
  useEffect(() => { setJob(null); setError(''); setRetryError(''); getTestDesignerExecution(planExecutionId).then(setJob).catch(() => setError('Não foi possível carregar este plano de testes.')); }, [planExecutionId]);
  useEffect(() => {
    if (!retryJob || retryJob.status === 'completed' || retryJob.status === 'failed') return undefined;
    let cancelled = false; let timer: number | undefined;
    const poll = async () => {
      try {
        const updated = await getTestDesignerExecution(retryJob.id);
        if (cancelled) return;
        setRetryJob(updated);
        if (updated.result) { setRetryJob(null); navigate(`/agents/planos-teste/${updated.id}`, { replace: true }); }
        else if (updated.status === 'failed') { setRetryError(updated.error || 'A reexecução não pôde ser concluída.'); setRetryJob(null); }
        else timer = window.setTimeout(poll, 900);
      } catch { if (!cancelled) timer = window.setTimeout(poll, 1800); }
    };
    timer = window.setTimeout(poll, 600);
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [retryJob?.id, retryJob?.status, navigate]);
  async function retry(sourceExecutionId: string) {
    if (retryStarting || retryJob) return;
    setRetryStarting(true); setRetryError('');
    try { setRetryJob(await startTestDesigner(sourceExecutionId)); }
    catch { setRetryError('Não foi possível iniciar uma nova execução deste plano.'); }
    finally { setRetryStarting(false); }
  }
  if (error) return <div className="test-plan-page"><div className="agent-execution-error">{error}</div></div>;
  if (!job?.result) return <div className="us-analysis-loading"><Icon name="spinner" size={25} /><strong>Carregando plano de testes...</strong></div>;
  const { result } = job; const { plano } = result;
  const canRetry = job.phase === 'truncated' || job.phase === 'invalid-output' || Boolean(result.parcial && !result.monitoramento.contractValid);
  const tabs: Array<[PlanTab, string, number?]> = [['resumo', 'Visão geral'], ['cobertura', 'Cobertura', plano.cobertura.length], ['rastreabilidade', 'Rastreabilidade', plano.rastreabilidade.length], ['gaps', 'Gaps', plano.gaps.length], ['casos', 'Casos recomendados', plano.casosRecomendados.length], ['checklist', 'Checklist']];
  return <div className="test-plan-page"><header className="test-plan-header"><button type="button" onClick={() => navigate('/agents/planos-teste')}>← Todos os planos</button><div><span><Icon name="chart" size={24} /></span><div><small>PLANO DE TESTES · AGENT 2</small><h1>{plano.resumo.usId}</h1><p>{plano.resumo.titulo} · {result.projeto.nome}</p></div></div><aside><Button variant="secondary" onClick={() => navigator.clipboard.writeText(result.resultado)}>Copiar plano</Button>{canRetry && <Button variant="primary" onClick={() => void retry(result.sourceExecutionId)} disabled={retryStarting || Boolean(retryJob)}>{retryStarting ? 'Iniciando...' : retryJob ? 'Reexecutando...' : 'Reexecutar plano'}</Button>}<Button variant={canRetry ? 'secondary' : 'primary'} onClick={() => navigate(`/agents/desenhista-testes/${result.sourceExecutionId}`)}>Gerar nova versão</Button></aside></header>{result.parcial && <div className="agent-partial-warning"><Icon name="info" size={17} /><span><strong>{job.phase === 'truncated' ? 'Saída truncada preservada' : 'Saída inválida preservada'}</strong>{result.motivoInterrupcao}</span></div>}{(retryStarting || retryJob) && <div className="agent-retry-progress" role="status" aria-live="polite"><Icon name="spinner" size={17} /><span><strong>Reexecutando o plano</strong>{retryJob ? `${retryJob.message} · ${retryJob.progress}%` : 'Iniciando uma nova execução...'}</span></div>}{retryError && <div className="agent-execution-error"><Icon name="info" size={17} /><span>{retryError}</span></div>}<section className="agent-result-card test-plan-result"><nav className="agent-result-tabs">{tabs.map(([id, label, count]) => <button type="button" className={tab === id ? 'is-active' : ''} key={id} onClick={() => setTab(id)}>{label}{count !== undefined && <b>{count}</b>}</button>)}<button type="button" className={tab === 'tecnico' ? 'is-active is-technical' : 'is-technical'} onClick={() => setTab('tecnico')}>Relatório técnico</button></nav><MonitoringSummary data={result.monitoramento} /><PlanContent plan={plano} tab={tab} raw={result.resultado} /></section></div>;
}
