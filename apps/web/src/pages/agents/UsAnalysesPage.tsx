import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/design-system';
import { listAgentExecutions, type AgentExecutionHistoryItem } from '@/entities/agents/agent-execution.api';
import './agents-orchestration.css';

function statusLabel(item: AgentExecutionHistoryItem) {
  if (item.parcial) return 'Resultado parcial';
  if (item.status === 'completed') return 'Concluída';
  if (item.status === 'failed') return 'Falhou';
  if (item.status === 'processing') return 'Em processamento';
  return 'Na fila';
}

export function UsAnalysesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AgentExecutionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listAgentExecutions());
    } catch {
      setError('Não foi possível carregar as análises salvas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="us-analyses-page">
      <header className="us-analyses-hero">
        <div><small>REQUISITOS FUNCIONAIS</small><h1>Análises de US</h1><p>Consulte os requisitos analisados pelo Agent, seus gates, regras, perguntas e cenários de teste.</p></div>
        <button type="button" onClick={() => navigate('/agents/agent1-analisador-us')}><Icon name="clipboardCheck" size={17} />Nova análise</button>
      </header>

      <section className="agent-history-card us-analyses-list">
        <header><div><span className="agent-history-icon"><Icon name="folder" size={19} /></span><span><small>SALVAS NO BANCO</small><h2>Requisitos analisados</h2><p>Cada resultado possui uma página própria de consulta.</p></span></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button></header>
        {error && <div className="agent-execution-error"><Icon name="info" size={17} /><span>{error}</span></div>}
        {items.length ? <div className="agent-history-list">{items.map((item) => (
          <button type="button" className="agent-history-row" key={item.id} onClick={() => navigate(`/agents/analises/${item.id}`)}>
            <span className={`agent-history-status is-${item.status}${item.parcial ? ' is-partial' : ''}`}><i />{statusLabel(item)}</span>
            <span className="agent-history-title"><strong>{item.titulo || 'Requisito funcional'}</strong><small>{item.projeto.nome} · {item.projeto.codigo}</small></span>
            <span className="agent-history-owner"><small>Executado por</small><strong>{item.actorUser.nome}</strong></span>
            <span className="agent-history-date"><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</strong><small>{item.hasResult ? 'Resultado disponível' : `${item.progress}% processado`}</small></span>
            <span className="agent-history-open">Abrir US →</span>
          </button>
        ))}</div> : <div className="agent-history-empty"><Icon name="folder" size={23} /><strong>{loading ? 'Carregando análises...' : 'Nenhuma análise encontrada'}</strong><span>Execute o Analisador de US para gerar o primeiro resultado.</span></div>}
      </section>
    </div>
  );
}
