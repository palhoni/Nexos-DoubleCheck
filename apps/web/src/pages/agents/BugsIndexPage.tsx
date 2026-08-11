import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/design-system';
import { BUG_STATUS_LABELS, listBugs, updateBugStatus, type BugRecord, type BugStatus } from '@/entities/agents/bug-report.api';
import './agents-orchestration.css';

const STATUSES: BugStatus[] = ['Aberto', 'Corrigido', 'Invalidado'];

function severityClass(value: string) {
  return value === 'Critical' ? 'high' : value === 'High' ? 'high' : value === 'Medium' ? 'medium' : 'low';
}

export function BugsIndexPage() {
  const navigate = useNavigate();
  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBugs(await listBugs());
    } catch {
      setError('Não foi possível carregar o índice de bugs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(id: string, status: BugStatus) {
    setSavingId(id);
    try {
      const updated = await updateBugStatus(id, status);
      setBugs((current) => current.map((bug) => (bug.id === id ? updated : bug)));
    } catch {
      setError('Não foi possível salvar o status. Tente novamente.');
    } finally {
      setSavingId(null);
    }
  }

  const totais = {
    aberto: bugs.filter((bug) => bug.status === 'Aberto').length,
    corrigido: bugs.filter((bug) => bug.status === 'Corrigido').length,
    invalidado: bugs.filter((bug) => bug.status === 'Invalidado').length,
  };

  return (
    <div className="us-analyses-page">
      <header className="us-analyses-hero">
        <div><small>QUALIDADE</small><h1>Índice de Bugs</h1><p>Fonte única de verdade da numeração de bugs por projeto — status atualizado pelo time conforme a correção avança.</p></div>
        <button type="button" onClick={() => navigate('/agents/gerador-bug-report')}><Icon name="clipboardCheck" size={17} />Novo bug report</button>
      </header>

      <div className="test-plan-section">
        <div className="test-plan-kpis">
          <div><span>Total de bugs</span><strong>{bugs.length}</strong></div>
          <div><span>Abertos</span><strong>{totais.aberto}</strong></div>
          <div><span>Corrigidos</span><strong>{totais.corrigido}</strong></div>
          <div><span>Invalidados</span><strong>{totais.invalidado}</strong></div>
        </div>
      </div>

      <section className="agent-history-card us-analyses-list">
        <header><div><span className="agent-history-icon"><Icon name="folder" size={19} /></span><span><small>SALVOS NO BANCO</small><h2>Bugs registrados</h2><p>Clique num bug para ver o report completo.</p></span></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button></header>
        {error && <div className="agent-execution-error"><Icon name="info" size={17} /><span>{error}</span></div>}
        {bugs.length ? (
          <div className="agent-result-table-wrap">
            <table className="agent-result-table">
              <thead>
                <tr><th>ID</th><th>Resumo</th><th>Projeto</th><th>Severidade</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug.id}>
                    <td><button type="button" className="agent-history-open" onClick={() => navigate(`/agents/bugs/${bug.id}`)}><b>{bug.codigo}</b></button></td>
                    <td><button type="button" className="agent-history-open" onClick={() => navigate(`/agents/bugs/${bug.id}`)}>{bug.titulo}</button></td>
                    <td>{bug.projeto.nome}</td>
                    <td><span className={`agent-risk__tag is-${severityClass(bug.severidade)}`}>{bug.severidade}</span></td>
                    <td>
                      <select value={bug.status} disabled={savingId === bug.id} onChange={(event) => void changeStatus(bug.id, event.target.value as BugStatus)}>
                        {STATUSES.map((status) => <option key={status} value={status}>{BUG_STATUS_LABELS[status]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="agent-history-empty"><Icon name="folder" size={23} /><strong>{loading ? 'Carregando bugs...' : 'Nenhum bug registrado'}</strong><span>Execute o Gerador de Bug Report para documentar o primeiro defeito.</span></div>}
      </section>
    </div>
  );
}
