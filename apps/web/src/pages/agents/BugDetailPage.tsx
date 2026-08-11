import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/design-system';
import { BUG_STATUS_LABELS, getBug, updateBugStatus, type BugRecord, type BugStatus } from '@/entities/agents/bug-report.api';
import './agents-orchestration.css';

const STATUSES: BugStatus[] = ['Aberto', 'Corrigido', 'Invalidado'];

function severityClass(value: string) {
  return value === 'Critical' || value === 'High' ? 'high' : value === 'Medium' ? 'medium' : 'low';
}

export function BugDetailPage() {
  const { bugId = '' } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState<BugRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getBug(bugId)
      .then(setBug)
      .catch(() => setError('Não foi possível carregar este bug.'))
      .finally(() => setLoading(false));
  }, [bugId]);

  async function changeStatus(status: BugStatus) {
    if (!bug) return;
    setSaving(true);
    try {
      setBug(await updateBugStatus(bug.id, status));
    } catch {
      setError('Não foi possível salvar o status. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="agent-detail-page"><p className="agent-execution-note">Carregando bug...</p></div>;
  if (!bug) return <div className="agent-detail-page">{error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}</div>;

  const evidencia = bug.evidenciaTecnica;

  return (
    <div className="agent-detail-page">
      <header className="agent-detail-hero">
        <button type="button" className="agent-detail-back" onClick={() => navigate('/agents/bugs')}>← Voltar para o índice de bugs</button>
        <div className="agent-detail-hero__identity">
          <span className="agent-detail-bot"><Icon name="clipboardCheck" size={25} /></span>
          <span><small>AGENT 7 · {bug.codigo}</small><h1>{bug.titulo}</h1><p>{bug.projeto.nome} · {bug.projeto.codigo} · registrado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(bug.createdAt))}</p></span>
        </div>
      </header>

      <div className="test-plan-section">
        <div className="test-plan-kpis">
          <div><span>Severidade</span><strong><span className={`agent-risk__tag is-${severityClass(bug.severidade)}`}>{bug.severidade}</span></strong></div>
          <div><span>Prioridade sugerida</span><strong>{bug.prioridadeSugerida || '—'}</strong></div>
          <div><span>TC relacionado</span><strong>{bug.tcIdRelacionado || '—'}</strong></div>
          <div><span>Ambiente</span><strong>{bug.ambiente || '—'}</strong></div>
          <div>
            <span>Status</span>
            <select value={bug.status} disabled={saving} onChange={(event) => void changeStatus(event.target.value as BugStatus)}>
              {STATUSES.map((status) => <option key={status} value={status}>{BUG_STATUS_LABELS[status]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="agent-execution-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}

      <div className="agent-result-section">
        <article className="agent-result-block"><h3>Descrição</h3><p>{bug.descricao}</p></article>

        <article className="agent-result-block">
          <h3>Passos para reproduzir <span>{bug.passosReproducao.length}</span></h3>
          {bug.passosReproducao.length ? <ol className="agent-criteria-list">{bug.passosReproducao.map((step, index) => <li key={index}><b>{index + 1}</b><span>{step}</span></li>)}</ol> : <p>Não informado.</p>}
        </article>

        <div className="agent-requirement-support">
          <article className="agent-result-block"><h3>Resultado obtido</h3><p>{bug.resultadoObtido}</p></article>
          <article className="agent-result-block"><h3>Resultado esperado</h3><p>{bug.resultadoEsperado}</p></article>
        </div>

        {evidencia && (
          <article className="agent-result-block">
            <h3>Evidência técnica</h3>
            <dl>
              {evidencia.metodo && <div><dt>Método</dt><dd>{evidencia.metodo}</dd></div>}
              {evidencia.url && <div><dt>URL</dt><dd><code>{evidencia.url}</code></dd></div>}
              {evidencia.headers && <div><dt>Headers</dt><dd>{evidencia.headers}</dd></div>}
              {evidencia.payload && <div><dt>Payload</dt><dd><code>{evidencia.payload}</code></dd></div>}
              {evidencia.responseStatus && <div><dt>Status da resposta</dt><dd>{evidencia.responseStatus}</dd></div>}
              {evidencia.responseBody && <div><dt>Body da resposta</dt><dd><code>{evidencia.responseBody}</code></dd></div>}
            </dl>
          </article>
        )}

        {bug.criterioAceiteViolado && <article className="agent-result-block"><h3>Critério de aceite violado</h3><blockquote>{bug.criterioAceiteViolado}</blockquote></article>}
        {bug.notasAdicionais && <article className="agent-result-block"><h3>Notas adicionais</h3><p>{bug.notasAdicionais}</p></article>}
      </div>
    </div>
  );
}
