import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/design-system';
import { listTestDesignerExecutions, type TestDesignerHistoryItem } from '@/entities/agents/agent-execution.api';
import './agents-orchestration.css';

function statusLabel(item: TestDesignerHistoryItem) {
  if (item.phase === 'truncated') return 'Saída truncada';
  if (item.phase === 'invalid-output') return 'Saída inválida';
  if (item.parcial) return 'Parcial';
  if (item.status === 'completed') return 'Concluído';
  if (item.status === 'failed') return 'Falhou';
  if (item.status === 'processing') return 'Processando';
  return 'Na fila';
}

export function TestPlansPage() {
  const navigate = useNavigate(); const [items, setItems] = useState<TestDesignerHistoryItem[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { listTestDesignerExecutions().then(setItems).finally(() => setLoading(false)); }, []);
  return <div className="us-analyses-page"><header className="us-analyses-hero test-plans-hero"><div><small>PLANEJAMENTO DE QUALIDADE</small><h1>Planos de Teste</h1><p>Cobertura, gaps, rastreabilidade e casos recomendados pelo Desenhista de Testes.</p></div></header><section className="agent-history-card us-analyses-list"><header><div><span className="agent-history-icon"><Icon name="chart" size={19} /></span><span><small>SALVOS NO BANCO</small><h2>Planos gerados</h2><p>Abra uma versão para consultar toda a estratégia de testes.</p></span></div></header>{items.length ? <div className="agent-history-list">{items.map((item) => <button type="button" className="agent-history-row" key={item.id} onClick={() => navigate(`/agents/planos-teste/${item.id}`)}><span className={`agent-history-status is-${item.status}${item.parcial ? ' is-partial' : ''}`}><i />{statusLabel(item)}</span><span className="agent-history-title"><strong>{item.titulo}</strong><small>{item.projeto.nome} · {item.projeto.codigo}</small></span><span className="agent-history-owner"><small>Origem</small><strong>Análise de US</strong></span><span className="agent-history-date"><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</strong><small>{item.hasResult ? item.parcial ? 'Relatório bruto preservado' : 'Plano disponível' : `${item.progress}% processado`}</small></span><span className="agent-history-open">Abrir plano →</span></button>)}</div> : <div className="agent-history-empty"><Icon name="chart" size={23} /><strong>{loading ? 'Carregando planos...' : 'Nenhum plano gerado'}</strong><span>Abra uma US analisada e envie-a ao Desenhista de Testes.</span></div>}</section></div>;
}
