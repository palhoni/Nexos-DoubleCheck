import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTableCard,
  EmptyState,
  Icon,
  MetricCard,
  RightRail,
  SearchInput,
  SectionCard,
  Tabs,
  type DataTableColumn,
} from '@/design-system';
import { useKnowledgeGraph } from '@/entities/conhecimento/conhecimento.api';
import type { KnowledgeGraphEdge, KnowledgeGraphNode, KnowledgeNodeType } from '@/entities/conhecimento/conhecimento.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const GRAPH_WIDTH = 1480;
const GRAPH_HEIGHT = 860;
const NODE_WIDTH = 176;
const NODE_HEIGHT = 64;

const TYPE_LABEL: Record<KnowledgeNodeType, string> = {
  Projeto: 'Projetos',
  Time: 'Times',
  Pessoa: 'Pessoas',
  Produto: 'Produtos',
  PublicoAlvo: 'Públicos',
  Modulo: 'Módulos',
  Funcionalidade: 'Funcionalidades',
  Jornada: 'Jornadas',
  Regra: 'Regras',
  Integracao: 'Integrações',
  Fonte: 'Fontes',
  Documento: 'Documentos',
};

const DEFAULT_VISIBLE_TYPES = new Set<KnowledgeNodeType>([
  'Projeto',
  'Produto',
  'Modulo',
  'Funcionalidade',
  'Jornada',
  'Regra',
  'Integracao',
  'Fonte',
  'Documento',
]);

const GAP_TYPES = new Set<KnowledgeNodeType>(['Produto', 'PublicoAlvo', 'Modulo', 'Funcionalidade', 'Jornada', 'Regra', 'Integracao', 'Documento']);

function nodeInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'NX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function nodeTypeClass(type: KnowledgeNodeType) {
  return `knowledge-map__node--${type.toLowerCase()}`;
}

function statusPreset(status: string | null) {
  if (!status) return 'info' as const;
  if (['Ativo', 'Ativa', 'Publicado'].includes(status)) return 'ativo' as const;
  if (['Planejamento', 'Revisao', 'Rascunho'].includes(status)) return 'pendente' as const;
  if (['Inativo', 'Inativa', 'Arquivado'].includes(status)) return 'inativo' as const;
  return 'info' as const;
}

interface PositionedNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  distance: number;
}

function createLayout(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[], selectedKey: string | null, preferredProjectId?: string | null): PositionedNode[] {
  if (!nodes.length) return [];
  const adjacency = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  nodes.forEach((node) => {
    adjacency.set(node.key, new Set());
    degree.set(node.key, 0);
  });
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  });

  const preferred = preferredProjectId ? nodes.find((node) => node.type === 'Projeto' && node.id === preferredProjectId)?.key : null;
  const centerKey = selectedKey && adjacency.has(selectedKey)
    ? selectedKey
    : preferred ?? [...nodes].sort((a, b) => (degree.get(b.key) ?? 0) - (degree.get(a.key) ?? 0))[0].key;

  const distances = new Map<string, number>([[centerKey, 0]]);
  const queue = [centerKey];
  while (queue.length) {
    const current = queue.shift()!;
    const currentDistance = distances.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      if (distances.has(next)) continue;
      distances.set(next, Math.min(3, currentDistance + 1));
      queue.push(next);
    }
  }

  const rings = new Map<number, KnowledgeGraphNode[]>();
  for (const node of nodes) {
    const distance = Math.min(3, distances.get(node.key) ?? 3);
    const list = rings.get(distance) ?? [];
    list.push(node);
    rings.set(distance, list);
  }

  const result: PositionedNode[] = [];
  const centerX = GRAPH_WIDTH / 2;
  const centerY = GRAPH_HEIGHT / 2;
  const ringSize: Record<number, { rx: number; ry: number }> = {
    0: { rx: 0, ry: 0 },
    1: { rx: 260, ry: 175 },
    2: { rx: 470, ry: 305 },
    3: { rx: 650, ry: 390 },
  };

  for (const [distance, ringNodes] of rings) {
    const ordered = [...ringNodes].sort((a, b) => {
      if (a.key === centerKey) return -1;
      if (b.key === centerKey) return 1;
      const byExternal = Number(a.external) - Number(b.external);
      if (byExternal) return byExternal;
      return (degree.get(b.key) ?? 0) - (degree.get(a.key) ?? 0) || a.label.localeCompare(b.label, 'pt-BR');
    });
    if (distance === 0) {
      result.push({ ...ordered[0], x: centerX, y: centerY, distance: 0 });
      continue;
    }
    const ring = ringSize[distance] ?? ringSize[3];
    const offset = distance % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / Math.max(ordered.length, 2);
    ordered.forEach((node, index) => {
      const angle = offset + (Math.PI * 2 * index) / Math.max(ordered.length, 1);
      result.push({
        ...node,
        x: centerX + Math.cos(angle) * ring.rx,
        y: centerY + Math.sin(angle) * ring.ry,
        distance,
      });
    });
  }

  return result;
}

function GraphCanvas({
  nodes,
  edges,
  selectedNodeKey,
  selectedEdgeId,
  projectId,
  onSelectNode,
  onSelectEdge,
}: {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  selectedNodeKey: string | null;
  selectedEdgeId: string | null;
  projectId?: string | null;
  onSelectNode: (key: string) => void;
  onSelectEdge: (id: string) => void;
}) {
  const positioned = useMemo(() => createLayout(nodes, edges, selectedNodeKey, projectId), [nodes, edges, selectedNodeKey, projectId]);
  const byKey = useMemo(() => new Map(positioned.map((node) => [node.key, node])), [positioned]);
  const selectedConnected = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeKey) return set;
    edges.forEach((edge) => {
      if (edge.source === selectedNodeKey) set.add(edge.target);
      if (edge.target === selectedNodeKey) set.add(edge.source);
    });
    return set;
  }, [edges, selectedNodeKey]);

  return (
    <div className="knowledge-map__canvas-shell">
      <div className="knowledge-map__canvas-scroll" tabIndex={0} aria-label="Mapa navegável do conhecimento">
        <svg className="knowledge-map__canvas" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} role="img" aria-label="Grafo de conhecimento do Nexus">
          <defs>
            <marker id="knowledge-map-arrow" markerWidth="9" markerHeight="9" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L8,3.5 z" className="knowledge-map__arrow" />
            </marker>
          </defs>

          <g className="knowledge-map__edges">
            {edges.map((edge, index) => {
              const source = byKey.get(edge.source);
              const target = byKey.get(edge.target);
              if (!source || !target) return null;
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const normalX = -dy / length;
              const normalY = dx / length;
              const curve = ((index % 5) - 2) * 7;
              const controlX = (source.x + target.x) / 2 + normalX * curve;
              const controlY = (source.y + target.y) / 2 + normalY * curve;
              const path = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
              const selected = selectedEdgeId === edge.id;
              const connected = !selectedNodeKey || edge.source === selectedNodeKey || edge.target === selectedNodeKey;
              const showLabel = selected || (selectedNodeKey && connected && edge.kind !== 'hierarchy');
              const labelX = (source.x + 2 * controlX + target.x) / 4;
              const labelY = (source.y + 2 * controlY + target.y) / 4;
              return (
                <g
                  key={edge.id}
                  role="button"
                  tabIndex={0}
                  className={`knowledge-map__edge-group knowledge-map__edge-group--${edge.kind}${edge.crossProject ? ' knowledge-map__edge-group--cross' : ''}${connected ? '' : ' knowledge-map__edge-group--muted'}${selected ? ' knowledge-map__edge-group--selected' : ''}`}
                  onClick={() => onSelectEdge(edge.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectEdge(edge.id);
                    }
                  }}
                >
                  <path d={path} markerEnd="url(#knowledge-map-arrow)" className="knowledge-map__edge-path" />
                  {showLabel && (
                    <g className="knowledge-map__edge-label" transform={`translate(${labelX}, ${labelY})`}>
                      <rect x="-43" y="-11" width="86" height="22" rx="11" />
                      <text textAnchor="middle" y="4">{edge.label.slice(0, 15)}</text>
                    </g>
                  )}
                  <title>{`${source.label} — ${edge.label} → ${target.label}${edge.crossProject ? ' · cross-project' : ''}`}</title>
                </g>
              );
            })}
          </g>

          <g className="knowledge-map__nodes">
            {positioned.map((node) => {
              const selected = selectedNodeKey === node.key;
              const connected = selectedConnected.has(node.key);
              const muted = !!selectedNodeKey && !selected && !connected;
              return (
                <g
                  key={node.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${TYPE_LABEL[node.type]}: ${node.label}, ${node.relationCount} relações`}
                  className={`knowledge-map__node ${nodeTypeClass(node.type)}${selected ? ' knowledge-map__node--selected' : ''}${connected ? ' knowledge-map__node--connected' : ''}${muted ? ' knowledge-map__node--muted' : ''}${node.external ? ' knowledge-map__node--external' : ''}`}
                  transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                  onClick={() => onSelectNode(node.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectNode(node.key);
                    }
                  }}
                >
                  <rect className="knowledge-map__node-surface" width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" />
                  <circle className="knowledge-map__node-avatar" cx="25" cy="23" r="14" />
                  <text className="knowledge-map__node-avatar-text" x="25" y="27" textAnchor="middle">{nodeInitials(node.label)}</text>
                  <text className="knowledge-map__node-type" x="48" y="18">{TYPE_LABEL[node.type].toUpperCase()}</text>
                  <text className="knowledge-map__node-title" x="48" y="36">{node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}</text>
                  <text className="knowledge-map__node-meta" x="48" y="53">{node.code ?? `${node.relationCount} relações`}</text>
                  {node.external && <circle className="knowledge-map__node-cross-dot" cx="160" cy="14" r="4" />}
                  <title>{`${node.label} · ${TYPE_LABEL[node.type]} · ${node.ownerProjectName ?? 'sem projeto'}${node.external ? ' · cross-project' : ''}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function NodeInspector({ node, edges, nodes, onOpen, onSelectNode }: { node: KnowledgeGraphNode | null; edges: KnowledgeGraphEdge[]; nodes: KnowledgeGraphNode[]; onOpen: (route: string) => void; onSelectNode: (key: string) => void }) {
  if (!node) {
    return (
      <SectionCard title="Entidade em foco" subtitle="Selecione qualquer nó para navegar pelo contexto." icon="network" padding="compact">
        <div className="knowledge-map__inspector-empty">
          <Icon name="network" size={24} />
          <strong>Navegue pelas relações</strong>
          <span>O painel mostra propriedade, evidências, documentos e entidades diretamente conectadas.</span>
        </div>
      </SectionCard>
    );
  }

  const connectedEdges = edges.filter((edge) => edge.source === node.key || edge.target === node.key);
  const byKey = new Map(nodes.map((item) => [item.key, item]));
  const neighbors = connectedEdges.map((edge) => ({ edge, node: byKey.get(edge.source === node.key ? edge.target : edge.source) })).filter((item): item is { edge: KnowledgeGraphEdge; node: KnowledgeGraphNode } => !!item.node);
  const crossCount = connectedEdges.filter((edge) => edge.crossProject).length;

  return (
    <SectionCard title="Entidade em foco" subtitle="Contexto estrutural e rastreabilidade." icon="network" padding="compact">
      <div className="knowledge-map__inspector">
        <div className="knowledge-map__inspector-heading">
          <div>
            <span>{TYPE_LABEL[node.type]}</span>
            <strong>{node.label}</strong>
            <small>{node.code ?? node.ownerProjectName ?? 'Sem código'}</small>
          </div>
          {node.status && <Badge preset={statusPreset(node.status)}>{node.status}</Badge>}
        </div>

        <dl className="knowledge-map__inspector-facts">
          <div><dt>Projeto proprietário</dt><dd>{node.ownerProjectName ?? 'Não se aplica'}</dd></div>
          {node.parentProductName && <div><dt>Produto</dt><dd>{node.parentProductName}</dd></div>}
          <div><dt>Relações</dt><dd>{node.relationCount}</dd></div>
          <div><dt>Cross-project</dt><dd>{crossCount}</dd></div>
          <div><dt>Fontes diretas</dt><dd>{node.evidenceCount}</dd></div>
          <div><dt>Documentos</dt><dd>{node.documentCount}</dd></div>
        </dl>

        {node.route && <Button variant="default" iconRight="arrowR" block onClick={() => onOpen(node.route!)}>Abrir detalhe</Button>}

        <div className="knowledge-map__neighbor-list">
          <span>Conexões diretas</span>
          {neighbors.length ? neighbors.slice(0, 8).map(({ edge, node: neighbor }) => (
            <button key={`${edge.id}:${neighbor.key}`} type="button" onClick={() => onSelectNode(neighbor.key)}>
              <span className={`knowledge-map__neighbor-dot ${nodeTypeClass(neighbor.type)}`} />
              <span><strong>{neighbor.label}</strong><small>{edge.label} · {TYPE_LABEL[neighbor.type]}</small></span>
              {edge.crossProject && <Badge preset="analise">Cross-project</Badge>}
            </button>
          )) : <small>Nenhuma relação visível com os filtros atuais.</small>}
        </div>
      </div>
    </SectionCard>
  );
}

export function MapaConhecimentoPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const projetoId = params.get('projeto') || undefined;
  const produtoId = params.get('produto') || undefined;
  const nodeParam = params.get('node');
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(nodeParam);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grafo');
  const [visibleTypes, setVisibleTypes] = useState<Set<KnowledgeNodeType>>(new Set(DEFAULT_VISIBLE_TYPES));

  const projects = projetoHooks.useList({ page: 1, pageSize: 100 });
  const graph = useKnowledgeGraph({ projetoId, produtoId, maxNodes: 200 });
  const data = graph.data;
  const projectRows = projects.data?.data ?? [];

  useEffect(() => {
    if (!data) return;
    if (selectedNodeKey && data.nodes.some((node) => node.key === selectedNodeKey)) return;
    const preferred = data.scope.produtoId ? `Produto:${data.scope.produtoId}` : data.scope.projetoId ? `Projeto:${data.scope.projetoId}` : null;
    const fallback = preferred && data.nodes.some((node) => node.key === preferred) ? preferred : data.nodes.find((node) => node.type === 'Projeto')?.key ?? data.nodes[0]?.key ?? null;
    setSelectedNodeKey(fallback);
  }, [data, selectedNodeKey]);

  const typeCounts = useMemo(() => {
    const counts = new Map<KnowledgeNodeType, number>();
    data?.nodes.forEach((node) => counts.set(node.type, (counts.get(node.type) ?? 0) + 1));
    return counts;
  }, [data]);

  const visibleNodes = useMemo(() => {
    if (!data) return [];
    return data.nodes.filter((node) => visibleTypes.has(node.type));
  }, [data, visibleTypes]);

  const visibleKeys = useMemo(() => new Set(visibleNodes.map((node) => node.key)), [visibleNodes]);
  const visibleEdges = useMemo(() => (data?.edges ?? []).filter((edge) => visibleKeys.has(edge.source) && visibleKeys.has(edge.target)), [data, visibleKeys]);
  const nodeByKey = useMemo(() => new Map((data?.nodes ?? []).map((node) => [node.key, node])), [data]);
  const selectedNode = selectedNodeKey ? nodeByKey.get(selectedNodeKey) ?? null : null;
  const selectedEdge = selectedEdgeId ? (data?.edges ?? []).find((edge) => edge.id === selectedEdgeId) ?? null : null;

  const searchResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (term.length < 2 || !data) return [];
    return data.nodes
      .filter((node) => `${node.label} ${node.code ?? ''} ${node.ownerProjectName ?? ''}`.toLocaleLowerCase('pt-BR').includes(term))
      .sort((a, b) => b.relationCount - a.relationCount || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 7);
  }, [data, search]);

  const gapNodes = useMemo(() => (data?.nodes ?? []).filter((node) => GAP_TYPES.has(node.type) && node.evidenceCount === 0 && node.documentCount === 0).sort((a, b) => b.relationCount - a.relationCount), [data]);
  const lowConnectivityNodes = useMemo(() => (data?.nodes ?? []).filter((node) => GAP_TYPES.has(node.type) && node.relationCount <= 1).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')), [data]);

  function chooseProject(next: string) {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set('projeto', next);
    else nextParams.delete('projeto');
    nextParams.delete('produto');
    nextParams.delete('node');
    setParams(nextParams);
    setSelectedNodeKey(null);
    setSelectedEdgeId(null);
  }

  function selectNode(key: string) {
    setSelectedNodeKey(key);
    setSelectedEdgeId(null);
    const next = new URLSearchParams(params);
    next.set('node', key);
    setParams(next, { replace: true });
  }

  function toggleType(type: KnowledgeNodeType) {
    setVisibleTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      if (next.size === 0) next.add(type);
      return next;
    });
  }

  const relationRows = useMemo(() => visibleEdges.slice(0, 120), [visibleEdges]);
  const relationColumns = useMemo<DataTableColumn<KnowledgeGraphEdge>[]>(() => [
    { key: 'source', label: 'Origem', primary: true, minWidth: 220, sortable: false, render: (edge) => { const node = nodeByKey.get(edge.source); return <div className="knowledge-map__relation-entity"><strong>{node?.label ?? '—'}</strong><span>{node ? TYPE_LABEL[node.type] : 'Entidade'}</span></div>; } },
    { key: 'label', label: 'Relação', minWidth: 150, sortable: false, render: (edge) => <Badge preset={edge.crossProject ? 'analise' : 'info'}>{edge.label}</Badge> },
    { key: 'target', label: 'Destino', minWidth: 220, sortable: false, render: (edge) => { const node = nodeByKey.get(edge.target); return <div className="knowledge-map__relation-entity"><strong>{node?.label ?? '—'}</strong><span>{node ? TYPE_LABEL[node.type] : 'Entidade'}</span></div>; } },
    { key: 'scope', label: 'Escopo', minWidth: 130, sortable: false, render: (edge) => edge.crossProject ? <Badge preset="analise">Cross-project</Badge> : <span className="dbc-text-3">Mesmo projeto</span> },
  ], [nodeByKey]);

  const rail = (
    <RightRail sticky>
      <NodeInspector node={selectedNode} edges={visibleEdges} nodes={visibleNodes} onOpen={navigate} onSelectNode={selectNode} />

      {selectedEdge && (
        <SectionCard title="Relação em foco" subtitle="Semântica registrada/derivada entre as entidades." icon="arrowR" padding="compact">
          <div className="knowledge-map__edge-inspector">
            <strong>{nodeByKey.get(selectedEdge.source)?.label ?? 'Origem'}</strong>
            <span>{selectedEdge.label}</span>
            <strong>{nodeByKey.get(selectedEdge.target)?.label ?? 'Destino'}</strong>
            <Badge preset={selectedEdge.crossProject ? 'analise' : 'info'}>{selectedEdge.crossProject ? 'Cross-project' : 'Mesmo projeto'}</Badge>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Leitura do mapa" subtitle="Indicadores objetivos do recorte atual." icon="chart" padding="compact">
        <div className="knowledge-map__rail-stats">
          <div><span>Entidades visíveis</span><strong>{visibleNodes.length}</strong></div>
          <div><span>Relações visíveis</span><strong>{visibleEdges.length}</strong></div>
          <div><span>Cross-project</span><strong>{visibleEdges.filter((edge) => edge.crossProject).length}</strong></div>
          <div><span>Tipos ativos</span><strong>{visibleTypes.size}</strong></div>
        </div>
      </SectionCard>

      <Alert type="info" title="Leitura confiável">O mapa é derivado somente de relações estruturadas que já existem no Nexus. Ele não cria impacto, dependência ou evidência por inferência de IA.</Alert>
    </RightRail>
  );

  return (
    <SetupPage
      header={
        <SetupPageHeader
          breadcrumb={['Conhecimento', data?.scope.projetoNome ?? 'Ecossistema']}
          title="Mapa do Conhecimento"
          subtitle="Navegue pelas relações reais entre Projetos, Produtos, Regras, Funcionalidades, Jornadas, Integrações, Fontes e Documentos."
          actions={projetoId ? <Button variant="default" icon="box" onClick={() => navigate(`/projetos/${projetoId}`)}>Abrir projeto</Button> : undefined}
        />
      }
      rail={rail}
    >
      <div className="knowledge-map__metrics">
        <MetricCard label="Entidades" value={data?.summary.entities ?? '—'} icon={<Icon name="box" size={18} />} loading={graph.isLoading} />
        <MetricCard label="Relações" value={data?.summary.relations ?? '—'} icon={<Icon name="network" size={18} />} loading={graph.isLoading} />
        <MetricCard label="Cross-project" value={data?.summary.crossProjectRelations ?? '—'} icon={<Icon name="arrowR" size={18} />} loading={graph.isLoading} />
        <MetricCard label="Sem evidência direta" value={data?.summary.withoutDirectEvidence ?? '—'} icon={<Icon name="warning" size={18} />} loading={graph.isLoading} />
      </div>

      <SectionCard padding="none">
        <div className="knowledge-map__toolbar">
          <div className="knowledge-map__toolbar-main">
            <label className="knowledge-map__project-filter">
              <span>Escopo</span>
              <select value={projetoId ?? ''} onChange={(event) => chooseProject(event.target.value)}>
                <option value="">Ecossistema completo</option>
                {projectRows.map((project) => <option key={project.id} value={project.id}>{project.nome} · {project.codigo}</option>)}
              </select>
            </label>
            <div className="knowledge-map__search-wrap">
              <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Localizar produto, regra, funcionalidade, documento..." />
              {searchResults.length > 0 && (
                <div className="knowledge-map__search-results">
                  {searchResults.map((node) => (
                    <button key={node.key} type="button" onClick={() => { if (!visibleTypes.has(node.type)) setVisibleTypes((current) => new Set([...current, node.type])); selectNode(node.key); setSearch(''); }}>
                      <span className={`knowledge-map__search-icon ${nodeTypeClass(node.type)}`}>{nodeInitials(node.label)}</span>
                      <span><strong>{node.label}</strong><small>{TYPE_LABEL[node.type]} · {node.ownerProjectName ?? 'Sem projeto'}</small></span>
                      {node.external && <Badge preset="analise">Cross-project</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="knowledge-map__type-filters" aria-label="Tipos de conhecimento visíveis">
            {[...typeCounts.entries()].map(([type, count]) => (
              <button key={type} type="button" className={visibleTypes.has(type) ? 'is-active' : ''} onClick={() => toggleType(type)} aria-pressed={visibleTypes.has(type)}>
                {TYPE_LABEL[type]} <span>{count}</span>
              </button>
            ))}
          </div>

          <div className="knowledge-map__view-tabs">
            <Tabs
              value={view}
              onChange={setView}
              variant="underline"
              items={[
                { key: 'grafo', label: 'Grafo' },
                { key: 'relacoes', label: 'Relações' },
                { key: 'lacunas', label: 'Lacunas objetivas' },
              ]}
              ariaLabel="Visualização do mapa do conhecimento"
            />
          </div>
        </div>

        {graph.isLoading ? (
          <div className="knowledge-map__state">Carregando relações do conhecimento...</div>
        ) : graph.isError ? (
          <div className="knowledge-map__state"><Alert type="error" title="Não foi possível carregar o mapa">Tente novamente. Se o problema persistir, valide o endpoint de conhecimento da API.</Alert></div>
        ) : !data?.nodes.length ? (
          <div className="knowledge-map__state"><EmptyState icon="network" title="Nenhum conhecimento estruturado encontrado" message="Cadastre Projetos e Produtos para iniciar o mapa." /></div>
        ) : view === 'grafo' ? (
          <>
            {data.truncated && <div className="knowledge-map__notice"><Alert type="warning" title="Recorte de segurança">O grafo atingiu o limite de entidades da consulta. Refine por Projeto para navegar com mais precisão.</Alert></div>}
            {visibleNodes.length ? <GraphCanvas nodes={visibleNodes} edges={visibleEdges} selectedNodeKey={selectedNodeKey} selectedEdgeId={selectedEdgeId} projectId={data.scope.projetoId} onSelectNode={selectNode} onSelectEdge={(id) => { setSelectedEdgeId(id); const edge = data.edges.find((item) => item.id === id); if (edge) setSelectedNodeKey(edge.source); }} /> : <div className="knowledge-map__state"><EmptyState title="Nenhum tipo de conhecimento visível" message="Ative pelo menos um filtro de entidade." /></div>}
          </>
        ) : view === 'relacoes' ? (
          <div className="knowledge-map__table-wrap">
            <DataTableCard
              rows={relationRows}
              columns={relationColumns}
              rowKey={(row) => row.id}
              ariaLabel="Relações do mapa do conhecimento"
              onRowClick={(edge) => { setSelectedEdgeId(edge.id); setSelectedNodeKey(edge.source); }}
              empty={<EmptyState title="Nenhuma relação com os filtros atuais" />}
              footer={visibleEdges.length > relationRows.length ? <span className="dbc-text-3">Mostrando as primeiras {relationRows.length} de {visibleEdges.length} relações. Refine o escopo ou os tipos de entidade.</span> : undefined}
            />
          </div>
        ) : (
          <div className="knowledge-map__gaps">
            <div className="knowledge-map__gap-column">
              <div className="knowledge-map__gap-heading"><div><strong>Sem fonte ou documento direto</strong><span>Entidades de conhecimento sem evidência/documento vinculado diretamente.</span></div><Badge preset={gapNodes.length ? 'pendente' : 'ativo'}>{gapNodes.length}</Badge></div>
              {gapNodes.length ? gapNodes.slice(0, 30).map((node) => <button key={node.key} type="button" onClick={() => { if (!visibleTypes.has(node.type)) setVisibleTypes((current) => new Set([...current, node.type])); selectNode(node.key); setView('grafo'); }}><span className={`knowledge-map__gap-icon ${nodeTypeClass(node.type)}`}>{nodeInitials(node.label)}</span><span><strong>{node.label}</strong><small>{TYPE_LABEL[node.type]} · {node.ownerProjectName}</small></span><Icon name="arrowR" size={14} /></button>) : <div className="knowledge-map__gap-empty">Nenhuma lacuna direta nesse recorte.</div>}
            </div>
            <div className="knowledge-map__gap-column">
              <div className="knowledge-map__gap-heading"><div><strong>Baixa conectividade</strong><span>Entidades com no máximo uma relação estruturada no recorte atual.</span></div><Badge preset={lowConnectivityNodes.length ? 'pendente' : 'ativo'}>{lowConnectivityNodes.length}</Badge></div>
              {lowConnectivityNodes.length ? lowConnectivityNodes.slice(0, 30).map((node) => <button key={node.key} type="button" onClick={() => { if (!visibleTypes.has(node.type)) setVisibleTypes((current) => new Set([...current, node.type])); selectNode(node.key); setView('grafo'); }}><span className={`knowledge-map__gap-icon ${nodeTypeClass(node.type)}`}>{nodeInitials(node.label)}</span><span><strong>{node.label}</strong><small>{TYPE_LABEL[node.type]} · {node.relationCount} relação(ões)</small></span><Icon name="arrowR" size={14} /></button>) : <div className="knowledge-map__gap-empty">Nenhuma entidade com baixa conectividade nesse recorte.</div>}
            </div>
          </div>
        )}
      </SectionCard>
    </SetupPage>
  );
}
