import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, getInitials, type IconName } from '@/design-system';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { useAllProdutos, type ProdutoGlobal } from '@/entities/produto/produto.globalApi';
import { useAllIntegracoes, type IntegracaoGlobal } from '@/entities/integracao/integracao.globalApi';
import { useGovernanceSummary } from '@/entities/governanca/governanca.api';
import {
  useDashboardResumo,
  useAtividadeRecente,
  usePendenciasDocumentacao,
  type AtividadeItem,
  type Pendencia,
} from '@/entities/dashboard/dashboard.api';

const ENTITY_ICON: Record<string, IconName> = {
  Projeto: 'folder',
  Time: 'users',
  Pessoa: 'user',
  Produto: 'box',
  PublicoAlvo: 'user',
  Modulo: 'box',
  Funcionalidade: 'check',
  Jornada: 'chart',
  Regra: 'clipboardCheck',
  Integracao: 'network',
  Documento: 'folder',
};

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? '' : 's'}`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function Panel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`dbc-panel ${className}`}>
      <header className="dbc-panel__header">
        <h2>{title}</h2>
        {action}
      </header>
      <div className="dbc-panel__body">{children}</div>
    </section>
  );
}

function PanelLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className="dbc-panel-link" onClick={onClick}>{children}</button>;
}

function MetricCard({ label, value, active, inactive, icon, onClick }: { label: string; value: number; active: number; inactive: number; icon: IconName; onClick: () => void }) {
  return (
    <button type="button" className="dbc-metric" onClick={onClick}>
      <span className="dbc-metric__icon"><Icon name={icon} size={25} width={1.7} /></span>
      <span className="dbc-metric__copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small><i className="is-active" />Ativos: {active}<b>•</b><i />Inativos: {inactive}</small>
      </span>
    </button>
  );
}

function MaturityCard({ score, delta = 0 }: { score: number; delta?: number }) {
  const bounded = Math.max(0, Math.min(100, score));
  return (
    <button type="button" className="dbc-maturity" onClick={() => window.location.assign('/governanca')}>
      <span>
        <span>Maturidade da base</span>
        <strong>{bounded}%</strong>
        <small>{bounded >= 80 ? 'Boa cobertura' : bounded >= 60 ? 'Cobertura em evolução' : 'Requer atenção'} {delta !== 0 && <em>{delta > 0 ? '+' : ''}{delta} pp</em>}</small>
      </span>
      <i className="dbc-maturity__ring" style={{ background: `conic-gradient(#3b82c4 ${bounded * 3.6}deg, #ececec 0deg)` }}><b /></i>
    </button>
  );
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  route: string;
}

function ecosystemData(products: ProdutoGlobal[], integrations: IntegracaoGlobal[]) {
  if (!products.length) return { focus: null as GraphNode | null, nodes: [] as GraphNode[] };
  const counts = new Map<string, number>();
  for (const integration of integrations) {
    counts.set(integration.produtoId, (counts.get(integration.produtoId) ?? 0) + 1);
    if (integration.produtoRelacionadoId) counts.set(integration.produtoRelacionadoId, (counts.get(integration.produtoRelacionadoId) ?? 0) + 1);
  }
  const focusProduct = [...products].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0];
  const focus: GraphNode = {
    id: focusProduct.id,
    label: focusProduct.nome,
    type: 'Produto central',
    route: `/projetos/${focusProduct.projetoId}/produtos/${focusProduct.id}`,
  };

  const connected: GraphNode[] = [];
  for (const integration of integrations.filter((item) => item.produtoId === focusProduct.id || item.produtoRelacionadoId === focusProduct.id)) {
    if (integration.produtoId === focusProduct.id && integration.produtoRelacionado) {
      connected.push({ id: integration.produtoRelacionadoId!, label: integration.produtoRelacionado.nome, type: integration.tipo ?? 'Produto integrado', route: `/projetos/${integration.produtoRelacionado.projetoId}/produtos/${integration.produtoRelacionadoId}` });
    } else if (integration.produtoRelacionadoId === focusProduct.id) {
      connected.push({ id: integration.produtoId, label: integration.produto.nome, type: integration.tipo ?? 'Produto integrado', route: `/projetos/${integration.produto.projetoId}/produtos/${integration.produtoId}` });
    } else {
      connected.push({ id: integration.id, label: integration.nome, type: integration.tipo ?? 'Integração externa', route: `/projetos/${integration.produto.projetoId}/produtos/${integration.produtoId}/integracoes/${integration.id}` });
    }
  }

  const seen = new Set<string>();
  const nodes = connected.filter((item) => !seen.has(item.id) && seen.add(item.id)).slice(0, 4);
  for (const product of products) {
    if (nodes.length >= 4) break;
    if (product.id !== focusProduct.id && !seen.has(product.id)) {
      seen.add(product.id);
      nodes.push({ id: product.id, label: product.nome, type: product.status, route: `/projetos/${product.projetoId}/produtos/${product.id}` });
    }
  }
  return { focus, nodes };
}

function EcosystemGraph({ products, integrations }: { products: ProdutoGlobal[]; integrations: IntegracaoGlobal[] }) {
  const navigate = useNavigate();
  const graph = useMemo(() => ecosystemData(products, integrations), [products, integrations]);
  if (!graph.focus) return <div className="dbc-empty">Cadastre produtos para visualizar o ecossistema.</div>;

  return (
    <div className="dbc-ecosystem">
      <svg viewBox="0 0 760 230" preserveAspectRatio="none" aria-hidden="true">
        <path d="M180 48 H305 Q330 48 330 76 V115" />
        <path d="M180 180 H305 Q330 180 330 150 V115" />
        <path d="M430 115 V76 Q430 48 455 48 H580" />
        <path d="M430 115 V150 Q430 180 455 180 H580" />
      </svg>
      <button type="button" className="ecosystem-node ecosystem-node--focus" onClick={() => navigate(graph.focus!.route)}>
        <span><Icon name="box" size={18} /></span><b>{graph.focus.label}</b><small>{graph.focus.type}</small>
      </button>
      {graph.nodes.map((node, index) => (
        <button type="button" key={node.id} className={`ecosystem-node ecosystem-node--${index + 1}`} onClick={() => navigate(node.route)}>
          <span>{getInitials(node.label)}</span><b>{node.label}</b><small>{node.type}</small>
        </button>
      ))}
      <div className="ecosystem-legend"><span><i />Fluxo documentado</span><span><i />Relação do produto</span></div>
    </div>
  );
}

function Readiness({ values }: { values?: { produtos: number; regras: number; integracoes: number; documentos: number } }) {
  const rows: Array<[string, IconName, number]> = [
    ['Produtos', 'box', values?.produtos ?? 0],
    ['Regras', 'clipboardCheck', values?.regras ?? 0],
    ['Integrações', 'network', values?.integracoes ?? 0],
    ['Documentos', 'folder', values?.documentos ?? 0],
  ];
  return <div className="dbc-readiness">{rows.map(([label, icon, value]) => <div key={label}><span className="readiness-icon"><Icon name={icon} size={18} /></span><strong>{label}</strong><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>)}</div>;
}

function ActivityList({ items }: { items: AtividadeItem[] }) {
  return <div className="dbc-activity-list">{items.map((item) => <div key={item.id}><span className={`activity-icon activity-icon--${item.entityType.toLowerCase()}`}><Icon name={ENTITY_ICON[item.entityType] ?? 'box'} size={16} /></span><span><strong>{item.label}</strong><small>{item.entityType} • por {item.actorNome ?? 'sistema'}</small></span><time>{formatRelative(item.ts)}</time></div>)}</div>;
}

function AttentionList({ items, onOpen }: { items: Pendencia[]; onOpen: (item: Pendencia) => void }) {
  return <div className="dbc-attention-list">{items.map((item, index) => <button type="button" key={`${item.produtoId}-${index}`} onClick={() => onOpen(item)}><span className="attention-icon"><Icon name={item.prioridade === 'Alta' ? 'info' : 'clipboardCheck'} size={17} /></span><span><strong>{item.descricao}</strong><small>{item.produtoNome}</small></span><em className={item.prioridade === 'Alta' ? 'is-high' : ''}><i />{item.prioridade}</em></button>)}</div>;
}

function RecentList({ items, kind, onOpen }: { items: Array<{ id: string; nome: string; status: string; subtitle?: string }>; kind: 'project' | 'product'; onOpen: (id: string) => void }) {
  return <div className="dbc-recent-list">{items.map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.id)}><span>{getInitials(item.nome)}</span><b>{item.nome}<small>{item.subtitle}</small></b><em className={`status-${item.status.toLowerCase()}`}><i />{item.status}</em></button>)}{items.length === 0 && <div className="dbc-empty">Nenhum {kind === 'project' ? 'projeto' : 'produto'} cadastrado.</div>}</div>;
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: projectsData } = projetoHooks.useList({ page: 1, pageSize: 100 });
  const { data: products = [] } = useAllProdutos();
  const { data: integrations = [] } = useAllIntegracoes();
  const { data: governance } = useGovernanceSummary();
  const { data: summary } = useDashboardResumo();
  const { data: activities = [] } = useAtividadeRecente(5);
  const { data: attention } = usePendenciasDocumentacao(4);
  const projects = projectsData?.data ?? [];
  const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  const recentProducts = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);

  return (
    <div className="dbc-dashboard">
      <div className="dbc-metrics-grid">
        <MetricCard label="Projetos" value={summary?.projetos.total ?? 0} active={summary?.projetos.ativos ?? 0} inactive={summary?.projetos.inativos ?? 0} icon="folder" onClick={() => navigate('/projetos')} />
        <MetricCard label="Times" value={summary?.times.total ?? 0} active={summary?.times.ativos ?? 0} inactive={summary?.times.inativos ?? 0} icon="users" onClick={() => navigate('/projetos')} />
        <MetricCard label="Pessoas" value={summary?.pessoas.total ?? 0} active={summary?.pessoas.ativos ?? 0} inactive={summary?.pessoas.inativos ?? 0} icon="user" onClick={() => navigate('/projetos')} />
        <MetricCard label="Produtos" value={summary?.produtos.total ?? 0} active={summary?.produtos.ativos ?? 0} inactive={summary?.produtos.inativos ?? 0} icon="box" onClick={() => navigate('/projetos')} />
        <MaturityCard score={governance?.summary.overallScore ?? 0} />
      </div>

      <div className="dbc-dashboard-row dbc-dashboard-row--primary">
        <Panel title="Ecossistema do Nexo" className="dbc-ecosystem-panel" action={<PanelLink onClick={() => navigate('/integracoes')}>Ver detalhes</PanelLink>}><EcosystemGraph products={products} integrations={integrations} /></Panel>
        <Panel title="Prontidão da base" action={<PanelLink onClick={() => navigate('/visao-geral')}>Ver todos</PanelLink>}><Readiness values={summary?.prontidao} /></Panel>
      </div>

      <div className="dbc-dashboard-row">
        <Panel title="Atividade recente" action={<PanelLink onClick={() => navigate('/atividade')}>Ver todas</PanelLink>}><ActivityList items={activities} /></Panel>
        <Panel title="Atenção necessária" action={<PanelLink onClick={() => navigate('/governanca')}>Ver todas</PanelLink>}><AttentionList items={attention?.itens ?? []} onOpen={(item) => navigate(`/projetos/${item.projetoId}/produtos/${item.produtoId}`)} /></Panel>
      </div>

      <div className="dbc-dashboard-row dbc-dashboard-row--recent">
        <Panel title="Projetos recentes" action={<PanelLink onClick={() => navigate('/projetos')}>Ver todos</PanelLink>}><RecentList kind="project" items={recentProjects} onOpen={(id) => navigate(`/projetos/${id}`)} /></Panel>
        <Panel title="Produtos recentes" action={<PanelLink onClick={() => navigate('/projetos')}>Ver todos</PanelLink>}><RecentList kind="product" items={recentProducts.map((item) => ({ ...item, subtitle: item.projeto.nome }))} onOpen={(id) => { const product = products.find((item) => item.id === id); if (product) navigate(`/projetos/${product.projetoId}/produtos/${id}`); }} /></Panel>
      </div>
    </div>
  );
}
