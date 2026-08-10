import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Icon } from '@/design-system';
import { getAgentExecution, type AgentExecutionJob } from '@/entities/agents/agent-execution.api';
import { legacyAnalysis, RESULT_TABS, StructuredResult, type ResultTab } from './AgentUsAnalyserPage';
import './agents-orchestration.css';

export function UsAnalysisDetailPage() {
  const { executionId = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<AgentExecutionJob | null>(null);
  const [tab, setTab] = useState<ResultTab>('requisito');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const value = await getAgentExecution(executionId);
        if (cancelled) return;
        setJob(value);
        if (value.status === 'queued' || value.status === 'processing') timer = window.setTimeout(load, 1200);
      } catch {
        if (!cancelled) setError('Não foi possível carregar os detalhes desta US.');
      }
    };
    void load();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [executionId]);

  if (error) return <div className="us-analysis-detail-page"><div className="agent-execution-error"><Icon name="info" size={18} /><span>{error}</span></div><Button variant="secondary" onClick={() => navigate('/agents/analises')}>Voltar para análises</Button></div>;
  if (!job) return <div className="us-analysis-loading"><Icon name="spinner" size={25} /><strong>Carregando detalhes da US...</strong></div>;
  if (!job.result) return <div className="us-analysis-detail-page"><header className="us-analysis-detail-header"><button type="button" onClick={() => navigate('/agents/analises')}>← Todas as análises</button><div><small>ANÁLISE EM ANDAMENTO</small><h1>{job.live.title || 'Requisito funcional'}</h1><p>{job.message} · {job.progress}% concluído</p></div></header><div className="us-analysis-progress"><i><b style={{ width: `${job.progress}%` }} /></i><span>Esta página será atualizada automaticamente.</span></div></div>;

  const result = job.result;
  const analysis = result.analise ?? legacyAnalysis(result.titulo);
  return (
    <div className="us-analysis-detail-page">
      <header className="us-analysis-detail-header">
        <button type="button" onClick={() => navigate('/agents/analises')}>← Todas as análises</button>
        <div className="us-analysis-detail-title"><span><Icon name="clipboardCheck" size={24} /></span><div><small>{result.parcial ? 'RESULTADO PARCIAL PRESERVADO' : 'REQUISITO ANALISADO'}</small><h1>{analysis.requisito.identificador}</h1><p>{analysis.requisito.titulo || result.titulo} · {result.projeto.nome}</p></div></div>
        <div className="us-analysis-detail-actions"><Button variant="secondary" onClick={() => navigator.clipboard.writeText(result.resultado)}>Copiar relatório</Button><Button variant="primary" onClick={() => navigate(`/agents/agent1-analisador-us?projeto=${result.projeto.id}`)}>Nova análise</Button></div>
      </header>
      {result.parcial && <div className="agent-partial-warning"><Icon name="info" size={17} /><span><strong>Execução interrompida — conteúdo preservado</strong>{result.motivoInterrupcao || 'Consulte as seções disponíveis abaixo.'}</span></div>}
      <section className="agent-result-card us-analysis-result">
        <nav className="agent-result-tabs" aria-label="Seções da análise">
          {RESULT_TABS.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}><Icon name={item.icon} size={15} />{item.label}<b>{item.id === 'perguntas' ? analysis.perguntasRefinamento.length : item.id === 'cenarios' ? analysis.cenariosTeste.length : item.id === 'regras' ? analysis.regrasNegocio.length : ''}</b></button>)}
          <button type="button" className={tab === 'tecnico' ? 'is-active is-technical' : 'is-technical'} onClick={() => setTab('tecnico')}>Relatório técnico</button>
        </nav>
        <StructuredResult analysis={analysis} raw={result.resultado} activeTab={tab} />
      </section>
    </div>
  );
}
