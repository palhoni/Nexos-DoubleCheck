import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/design-system';
import {
  ENDPOINT_DECISION_LABELS,
  getEndpointBacklog,
  updateEndpointDecision,
  type EndpointBacklogDetail,
  type EndpointDecision,
} from '@/entities/agents/endpoint-discovery.api';
import './agents-orchestration.css';

const DECISIONS: EndpointDecision[] = ['Pendente', 'Automatizar', 'Adiar', 'NaoAutomatizar', 'Investigar'];

function priorityClass(value: string) {
  return value === 'Alta' ? 'high' : value === 'Média' ? 'medium' : 'low';
}

export function EndpointBacklogDetailPage() {
  const { backlogId = '' } = useParams();
  const navigate = useNavigate();
  const [backlog, setBacklog] = useState<EndpointBacklogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    getEndpointBacklog(backlogId)
      .then(setBacklog)
      .catch(() => setError('Não foi possível carregar este backlog de endpoints.'))
      .finally(() => setLoading(false));
  }, [backlogId]);

  async function changeDecision(itemId: string, decisao: EndpointDecision) {
    if (!backlog) return;
    setSavingId(itemId);
    try {
      const updated = await updateEndpointDecision(backlog.id, itemId, { decisao });
      setBacklog((current) => current && { ...current, itens: current.itens.map((item) => (item.id === itemId ? updated : item)) });
    } catch {
      setError('Não foi possível salvar a decisão. Tente novamente.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <div className="agent-detail-page"><p className="agent-execution-note">Carregando backlog...</p></div>;
  if (!backlog) return <div className="agent-detail-page">{error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}</div>;

  const totais = {
    alta: backlog.itens.filter((item) => item.prioridade === 'Alta').length,
    media: backlog.itens.filter((item) => item.prioridade === 'Média').length,
    baixa: backlog.itens.filter((item) => item.prioridade === 'Baixa').length,
    automatizar: backlog.itens.filter((item) => item.decisao === 'Automatizar').length,
    pendente: backlog.itens.filter((item) => item.decisao === 'Pendente').length,
  };

  return (
    <div className="agent-detail-page">
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate('/agents/endpoints')}>← Voltar para backlogs</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="network" size={25} /></span>
          <span><small>AGENT 4 · BACKLOG</small><h1>{backlog.sistema}</h1><p>{backlog.projeto.nome} · {backlog.projeto.codigo} · gerado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(backlog.createdAt))}</p></span>
        </div>
      </header>

      <div className="test-plan-section">
        <div className="test-plan-kpis">
          <div><span>Total de endpoints</span><strong>{backlog.itens.length}</strong></div>
          <div><span>Alta prioridade</span><strong>{totais.alta}</strong></div>
          <div><span>Média prioridade</span><strong>{totais.media}</strong></div>
          <div><span>Baixa prioridade</span><strong>{totais.baixa}</strong></div>
          <div><span>Já decididos</span><strong>{backlog.itens.length - totais.pendente}</strong></div>
        </div>
      </div>

      {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}

      <div className="agent-result-table-wrap">
        <table className="agent-result-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Método</th>
              <th>Endpoint</th>
              <th>Descrição</th>
              <th>Auth</th>
              <th>Prioridade</th>
              <th>Critério</th>
              <th>Decisão do time</th>
            </tr>
          </thead>
          <tbody>
            {backlog.itens.map((item) => (
              <tr key={item.id}>
                <td><b>{item.codigo}</b></td>
                <td>{item.metodo}</td>
                <td><code>{item.endpoint}</code></td>
                <td>{item.descricao}</td>
                <td>{item.autenticacao}</td>
                <td><span className={`agent-risk__tag is-${priorityClass(item.prioridade)}`} title={item.criterioPrioridade}>{item.prioridade}</span></td>
                <td><small>{item.criterioPrioridade}</small></td>
                <td>
                  <select
                    value={item.decisao}
                    disabled={savingId === item.id}
                    onChange={(event) => void changeDecision(item.id, event.target.value as EndpointDecision)}
                  >
                    {DECISIONS.map((decisao) => <option key={decisao} value={decisao}>{ENDPOINT_DECISION_LABELS[decisao]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
