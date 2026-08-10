import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  DataTableCard,
  EmptyState,
  MetricCard,
  SectionCard,
  Tabs,
  tokens,
  type DataTableColumn,
  type StatusPreset,
} from '@/design-system';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { formatDateTimeBR } from '@/entities/crud/shared';
import { useAllIntegracoes, type IntegracaoGlobal } from '@/entities/integracao/integracao.globalApi';
import { useAllProdutos, type ProdutoGlobal } from '@/entities/produto/produto.globalApi';

const STATUS_PRESET_PRODUTO: Record<string, StatusPreset> = {
  Ativo: 'ativo',
  Planejamento: 'pendente',
  Inativo: 'inativo',
};

const TODOS_KEY = '__todos__';
const GRAPH_WIDTH = 1240;
const GRAPH_HEIGHT = 650;
const NODE_WIDTH = 186;
const NODE_HEIGHT = 72;

function criticidadeClass(criticidade: string | null) {
  if (criticidade === 'Alta') return 'integration-graph__edge--high';
  if (criticidade === 'Média') return 'integration-graph__edge--medium';
  if (criticidade === 'Baixa') return 'integration-graph__edge--low';
  return 'integration-graph__edge--neutral';
}

function touchesProduct(integration: IntegracaoGlobal, productId: string) {
  return integration.produtoId === productId || integration.produtoRelacionadoId === productId;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface GraphNode {
  product: ProdutoGlobal;
  x: number;
  y: number;
  degree: number;
}

function createGraphLayout(products: ProdutoGlobal[], integrations: IntegracaoGlobal[]): GraphNode[] {
  if (products.length === 0) return [];

  const degree = new Map<string, number>();
  products.forEach((product) => degree.set(product.id, 0));
  integrations.forEach((integration) => {
    if (degree.has(integration.produtoId)) {
      degree.set(integration.produtoId, (degree.get(integration.produtoId) ?? 0) + 1);
    }
    if (integration.produtoRelacionadoId && degree.has(integration.produtoRelacionadoId)) {
      degree.set(integration.produtoRelacionadoId, (degree.get(integration.produtoRelacionadoId) ?? 0) + 1);
    }
  });

  const ordered = [...products].sort((a, b) => {
    const byDegree = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
    return byDegree || a.nome.localeCompare(b.nome, 'pt-BR');
  });

  const [hub, ...rest] = ordered;
  const nodes: GraphNode[] = [
    {
      product: hub,
      x: GRAPH_WIDTH / 2,
      y: GRAPH_HEIGHT / 2,
      degree: degree.get(hub.id) ?? 0,
    },
  ];

  if (rest.length === 0) return nodes;

  const radiusX = Math.min(470, 250 + rest.length * 22);
  const radiusY = Math.min(245, 170 + rest.length * 10);
  const startAngle = -Math.PI / 2;

  rest.forEach((product, index) => {
    const angle = startAngle + (Math.PI * 2 * index) / rest.length;
    nodes.push({
      product,
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * radiusX,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radiusY,
      degree: degree.get(product.id) ?? 0,
    });
  });

  return nodes;
}

function GraphProductNode({
  node,
  selected,
  connected,
  onSelect,
}: {
  node: GraphNode;
  selected: boolean;
  connected: boolean;
  onSelect: () => void;
}) {
  const statusClass = node.product.status === 'Ativo'
    ? 'integration-graph__status--active'
    : node.product.status === 'Planejamento'
      ? 'integration-graph__status--planning'
      : 'integration-graph__status--inactive';

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${node.product.nome}, ${node.degree} conexões`}
      className={`integration-graph__node${selected ? ' integration-graph__node--selected' : ''}${connected ? ' integration-graph__node--connected' : ''}`}
      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <rect className="integration-graph__node-surface" width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" />
      <circle className="integration-graph__node-avatar" cx="26" cy="27" r="15" />
      <text className="integration-graph__node-avatar-text" x="26" y="31" textAnchor="middle">
        {initials(node.product.nome)}
      </text>
      <text className="integration-graph__node-title" x="50" y="24">
        {node.product.nome.length > 21 ? `${node.product.nome.slice(0, 20)}…` : node.product.nome}
      </text>
      <text className="integration-graph__node-meta" x="50" y="43">
        {node.product.codigo}
      </text>
      <circle className={`integration-graph__status ${statusClass}`} cx="160" cy="53" r="4" />
      <text className="integration-graph__node-count" x="50" y="61">
        {node.degree} {node.degree === 1 ? 'conexão' : 'conexões'}
      </text>
    </g>
  );
}

function IntegrationGraph({
  products,
  integrations,
  selectedProductId,
  onSelectProduct,
  onOpenIntegration,
  focusedIntegrationId,
}: {
  products: ProdutoGlobal[];
  integrations: IntegracaoGlobal[];
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  onOpenIntegration: (integration: IntegracaoGlobal) => void;
  focusedIntegrationId?: string | null;
}) {
  const nodes = useMemo(() => createGraphLayout(products, integrations), [products, integrations]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.product.id, node])), [nodes]);

  const connectedIds = useMemo(() => {
    if (!selectedProductId) return new Set<string>();
    const ids = new Set<string>();
    integrations.forEach((integration) => {
      if (integration.produtoId === selectedProductId && integration.produtoRelacionadoId) ids.add(integration.produtoRelacionadoId);
      if (integration.produtoRelacionadoId === selectedProductId) ids.add(integration.produtoId);
    });
    return ids;
  }, [integrations, selectedProductId]);

  const edges = integrations.filter((integration) => integration.produtoRelacionadoId && byId.has(integration.produtoId) && byId.has(integration.produtoRelacionadoId));

  return (
    <div className="integration-graph-shell">
      <div className="integration-graph-scroll" tabIndex={0} aria-label="Grafo de integrações entre produtos">
        <svg className="integration-graph" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} role="img" aria-label="Mapa visual das integrações entre produtos">
          <defs>
            <marker id="integration-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L8,3.5 z" className="integration-graph__arrow" />
            </marker>
          </defs>

          <g className="integration-graph__edges">
            {edges.map((integration, index) => {
              const from = byId.get(integration.produtoId)!;
              const to = byId.get(integration.produtoRelacionadoId!)!;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / length;
              const ny = dx / length;
              const curve = ((index % 3) - 1) * 20;
              const controlX = (from.x + to.x) / 2 + nx * curve;
              const controlY = (from.y + to.y) / 2 + ny * curve;
              const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
              const focused = focusedIntegrationId === integration.id;
              const highlighted = focused || !selectedProductId || touchesProduct(integration, selectedProductId);
              const midpointX = (from.x + 2 * controlX + to.x) / 4;
              const midpointY = (from.y + 2 * controlY + to.y) / 4;

              return (
                <g
                  key={integration.id}
                  className={`integration-graph__edge-group${highlighted ? ' integration-graph__edge-group--highlighted' : ' integration-graph__edge-group--muted'}${focused ? ' integration-graph__edge-group--focused' : ''}`}
                  onClick={() => onOpenIntegration(integration)}
                >
                  <path
                    d={path}
                    markerEnd="url(#integration-arrow)"
                    className={`integration-graph__edge ${criticidadeClass(integration.criticidade)}`}
                  />
                  {highlighted && (
                    <g className="integration-graph__edge-label" transform={`translate(${midpointX}, ${midpointY})`}>
                      <rect x="-39" y="-11" width="78" height="22" rx="11" />
                      <text textAnchor="middle" y="4">
                        {(integration.tipo ?? 'Integração').slice(0, 12)}
                      </text>
                    </g>
                  )}
                  <title>{`${integration.produto.nome} → ${integration.produtoRelacionado?.nome ?? 'Destino'} · ${integration.nome}`}</title>
                </g>
              );
            })}
          </g>

          <g className="integration-graph__nodes">
            {nodes.map((node) => (
              <GraphProductNode
                key={node.product.id}
                node={node}
                selected={selectedProductId === node.product.id}
                connected={connectedIds.has(node.product.id)}
                onSelect={() => onSelectProduct(node.product.id)}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function ProductContextPanel({
  product,
  integrations,
  onOpenProduct,
}: {
  product: ProdutoGlobal | null;
  integrations: IntegracaoGlobal[];
  onOpenProduct: (productId: string) => void;
}) {
  if (!product) {
    return (
      <SectionCard>
        <div className="integration-context-empty">
          <strong>Selecione um produto no grafo</strong>
          <span>Veja time responsável, conexões e tipos de integração sem sair do mapa.</span>
        </div>
      </SectionCard>
    );
  }

  const connected = integrations.filter((integration) => touchesProduct(integration, product.id));
  const types = [...new Set(connected.map((integration) => integration.tipo).filter(Boolean))];
  const related = new Set<string>();
  connected.forEach((integration) => {
    if (integration.produtoId === product.id && integration.produtoRelacionado?.nome) related.add(integration.produtoRelacionado.nome);
    if (integration.produtoRelacionadoId === product.id) related.add(integration.produto.nome);
  });

  return (
    <SectionCard>
      <div className="integration-context-panel">
        <div className="integration-context-panel__heading">
          <div>
            <span className="integration-context-panel__eyebrow">Produto selecionado</span>
            <strong>{product.nome}</strong>
            <span>{product.codigo} · {product.projeto.nome}</span>
          </div>
          <Badge kind="status" preset={STATUS_PRESET_PRODUTO[product.status] ?? 'info'}>{product.status}</Badge>
        </div>

        <div className="integration-context-panel__metrics">
          <div><span>Integrações</span><strong>{connected.length}</strong></div>
          <div><span>Produtos conectados</span><strong>{related.size}</strong></div>
          <div><span>Tipos</span><strong>{types.length}</strong></div>
        </div>

        <div className="integration-context-panel__section">
          <span>Time responsável</span>
          <strong>{product.timeResponsavel?.nome ?? 'Não definido'}</strong>
        </div>

        <div className="integration-context-panel__section">
          <span>Tipos mapeados</span>
          <div className="integration-context-panel__chips">
            {types.length > 0 ? types.map((type) => <em key={type}>{type}</em>) : <small>Nenhum tipo informado</small>}
          </div>
        </div>

        <button type="button" className="integration-context-panel__action" onClick={() => onOpenProduct(product.id)}>
          Abrir detalhe do produto →
        </button>
      </div>
    </SectionCard>
  );
}

export function IntegracoesMapaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: integrationsData, isLoading: loadingIntegrations } = useAllIntegracoes();
  const { data: productsData, isLoading: loadingProducts } = useAllProdutos();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(searchParams.get('produto'));
  const focusedIntegrationId = searchParams.get('integracao');

  const integrations = integrationsData ?? [];
  const involvedProductIds = useMemo(() => {
    const ids = new Set<string>();
    integrations.forEach((integration) => {
      ids.add(integration.produtoId);
      if (integration.produtoRelacionadoId) ids.add(integration.produtoRelacionadoId);
    });
    return ids;
  }, [integrations]);

  const products = useMemo(
    () => (productsData ?? []).filter((product) => involvedProductIds.has(product.id)),
    [productsData, involvedProductIds],
  );

  const filteredIntegrations = typeFilter ? integrations.filter((integration) => integration.tipo === typeFilter) : integrations;
  const types = [...new Set(integrations.map((integration) => integration.tipo).filter((type): type is string => !!type))];
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  const totalApis = integrations.filter((integration) => integration.tipo === 'API').length;
  const totalEvents = integrations.filter((integration) => integration.tipo === 'Evento').length;
  const totalDatabases = integrations.filter((integration) => integration.tipo === 'Banco de Dados').length;
  const involvedTeams = new Set(integrations.map((integration) => integration.timeProprietarioId).filter(Boolean)).size;
  const isLoading = loadingIntegrations || loadingProducts;

  useEffect(() => {
    const productFromQuery = searchParams.get('produto');
    if (productFromQuery) setSelectedProductId(productFromQuery);
  }, [searchParams]);

  function openProduct(productId: string) {
    const product = (productsData ?? []).find((item) => item.id === productId);
    if (product) navigate(`/projetos/${product.projetoId}/produtos/${product.id}`);
  }

  function openIntegration(integration: IntegracaoGlobal) {
    navigate(`/projetos/${integration.produto.projetoId}/produtos/${integration.produtoId}/integracoes/${integration.id}`);
  }

  const columns: DataTableColumn<IntegracaoGlobal>[] = [
    {
      key: 'nome',
      label: 'Fluxo',
      render: (integration) => (
        <>
          <div className="dbc-text" style={{ fontWeight: 600 }}>{integration.nome}</div>
          <div className="dbc-text-3" style={{ fontSize: 11 }}>{integration.papelDependencia ?? '—'} · {integration.modo ?? '—'}</div>
        </>
      ),
    },
    { key: 'tipo', label: 'Tipo', render: (integration) => integration.tipo ?? '—' },
    {
      key: 'fluxo',
      label: 'Origem → Destino',
      sortable: false,
      render: (integration) => `${integration.produto.nome}${integration.produtoRelacionado ? ` → ${integration.produtoRelacionado.nome}` : ''}`,
    },
    { key: 'dados', label: 'Dados', sortable: false, render: (integration) => integration.dadosTrafegados ?? '—' },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      stopRowClick: true,
      render: (integration) => <Badge kind="status" preset={integration.status === 'Ativo' ? 'ativo' : 'inativo'}>{integration.status}</Badge>,
    },
    { key: 'updatedAt', label: 'Última atualização', sortable: false, render: (integration) => formatDateTimeBR(integration.updatedAt) },
  ];

  return (
    <div className="main-pad integration-map-page">
      <SetupPageHeader
        breadcrumb={['Setup', 'Integrações']}
        title="Mapa de Integrações"
        meta={<span className="dbc-text-2" style={{ fontSize: 13 }}>Visualize dependências, fluxos e relacionamentos entre Produtos em um único grafo.</span>}
      />

      {isLoading ? (
        <SectionCard><span className="dbc-text-2">Carregando mapa de integrações...</span></SectionCard>
      ) : integrations.length === 0 ? (
        <SectionCard><EmptyState title="Nenhuma integração cadastrada ainda" message="Cadastre integrações dentro de um Produto para vê-las aqui." icon="box" /></SectionCard>
      ) : (
        <>
          <div className="integration-map-metrics">
            <MetricCard label="APIs conectadas" value={totalApis} minWidth={0} />
            <MetricCard label="Eventos mapeados" value={totalEvents} minWidth={0} />
            <MetricCard label="Bancos de dados" value={totalDatabases} minWidth={0} />
            <MetricCard label="Times envolvidos" value={involvedTeams} minWidth={0} />
          </div>

          <SectionCard padding="none">
            <div className="integration-map-toolbar">
              <div>
                <strong>Grafo de relacionamentos</strong>
                <span>{products.length} produtos · {filteredIntegrations.length} integrações exibidas</span>
              </div>
              <Tabs
                variant="pill"
                size="sm"
                ariaLabel="Filtrar grafo por tipo de integração"
                items={[{ key: TODOS_KEY, label: 'Todos' }, ...types.map((type) => ({ key: type, label: type }))]}
                value={typeFilter ?? TODOS_KEY}
                onChange={(key) => {
                  setTypeFilter(key === TODOS_KEY ? null : key);
                  setSelectedProductId(null);
                }}
              />
            </div>

            <div className="integration-map-layout">
              <IntegrationGraph
                products={products}
                integrations={filteredIntegrations}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
                onOpenIntegration={openIntegration}
                focusedIntegrationId={focusedIntegrationId}
              />
              <aside className="integration-map-context">
                <ProductContextPanel product={selectedProduct} integrations={filteredIntegrations} onOpenProduct={openProduct} />
              </aside>
            </div>

            <div className="integration-map-legend" aria-label="Legenda do grafo">
              <span><i className="integration-map-legend__line integration-map-legend__line--high" />Alta criticidade</span>
              <span><i className="integration-map-legend__line integration-map-legend__line--medium" />Média</span>
              <span><i className="integration-map-legend__line integration-map-legend__line--low" />Baixa</span>
              <span><i className="integration-map-legend__line integration-map-legend__line--neutral" />Não informada</span>
              <small>Clique em um produto para destacar suas conexões. Clique em uma linha para abrir a integração.</small>
            </div>
          </SectionCard>

          <DataTableCard
            toolbar={
              <div className="integration-table-toolbar" style={{ padding: tokens.layout.cardPad }}>
                <div>
                  <strong>Integrações mapeadas</strong>
                  <span>{filteredIntegrations.length} registros no filtro atual</span>
                </div>
              </div>
            }
            columns={columns}
            rows={filteredIntegrations}
            rowKey={(integration) => integration.id}
            density="compact"
            onRowClick={openIntegration}
            empty={<EmptyState title="Nenhuma integração deste tipo" icon="box" />}
            ariaLabel="Integrações mapeadas"
          />
        </>
      )}
    </div>
  );
}
