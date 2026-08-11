import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/design-system';
import { listEndpointBacklogs, type EndpointBacklogSummary } from '@/entities/agents/endpoint-discovery.api';
import './agents-orchestration.css';

export function EndpointBacklogsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EndpointBacklogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listEndpointBacklogs());
    } catch {
      setError('Não foi possível carregar os backlogs de endpoints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="us-analyses-page">
      <header className="us-analyses-hero">
        <div><small>DESCOBERTA</small><h1>Backlogs de Endpoints</h1><p>Consulte os backlogs gerados pelo Agent 4, com a prioridade sugerida e a decisão do time por endpoint.</p></div>
        <button type="button" onClick={() => navigate('/agents/descobridor-endpoints')}><Icon name="network" size={17} />Nova descoberta</button>
      </header>

      <section className="agent-history-card us-analyses-list">
        <header><div><span className="agent-history-icon"><Icon name="folder" size={19} /></span><span><small>SALVOS NO BANCO</small><h2>Backlogs gerados</h2><p>Cada backlog possui uma página própria com a decisão do time por endpoint.</p></span></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button></header>
        {error && <div className="agent-execution-error"><Icon name="info" size={17} /><span>{error}</span></div>}
        {items.length ? <div className="agent-history-list">{items.map((item) => (
          <button type="button" className="agent-history-row" key={item.id} onClick={() => navigate(`/agents/endpoints/${item.id}`)}>
            <span className="agent-history-status is-completed"><i />{item._count.itens} endpoint(s)</span>
            <span className="agent-history-title"><strong>{item.sistema}</strong><small>{item.projeto.nome} · {item.projeto.codigo}</small></span>
            <span className="agent-history-date"><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</strong><small>Gerado</small></span>
            <span className="agent-history-open">Abrir backlog →</span>
          </button>
        ))}</div> : <div className="agent-history-empty"><Icon name="folder" size={23} /><strong>{loading ? 'Carregando backlogs...' : 'Nenhum backlog encontrado'}</strong><span>Execute o Descobridor de Endpoints para gerar o primeiro backlog.</span></div>}
      </section>
    </div>
  );
}
