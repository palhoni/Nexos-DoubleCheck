import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  DataTableCard,
  EmptyState,
  Icon,
  MetricCard,
  RightRail,
  SectionCard,
  type DataTableColumn,
  type StatusPreset,
} from '@/design-system';
import { useProjetoEcossistema, type EcossistemaConexao, type EcossistemaProjetoNode } from '@/entities/projeto/projeto.ecossistemaApi';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const GRAPH_WIDTH = 980;
const GRAPH_HEIGHT = 520;
const NODE_W = 190;
const NODE_H = 76;

const STATUS_PRESET: Record<string, StatusPreset> = {
  Ativo: 'ativo',
  Planejamento: 'pendente',
  Inativo: 'inativo',
};

interface ProjectGraphNode {
  project: EcossistemaProjetoNode;
  x: number;
  y: number;
  connections: number;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildGraph(main: EcossistemaProjetoNode, related: EcossistemaProjetoNode[], connections: EcossistemaConexao[]): ProjectGraphNode[] {
  const all = [main, ...related];
  const degree = new Map(all.map((project) => [project.id, 0]));
  connections.forEach((connection) => {
    degree.set(connection.origem.projetoId, (degree.get(connection.origem.projetoId) ?? 0) + 1);
    degree.set(connection.destino.projetoId, (degree.get(connection.destino.projetoId) ?? 0) + 1);
  });

  const nodes: ProjectGraphNode[] = [{
    project: main,
    x: GRAPH_WIDTH / 2,
    y: GRAPH_HEIGHT / 2,
    connections: degree.get(main.id) ?? 0,
  }];

  if (!related.length) return nodes;
  const radiusX = Math.min(350, 210 + related.length * 18);
  const radiusY = Math.min(190, 135 + related.length * 10);
  related.forEach((project, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / related.length;
    nodes.push({
      project,
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * radiusX,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radiusY,
      connections: degree.get(project.id) ?? 0,
    });
  });
  return nodes;
}

function EcosystemGraph({
  main,
  related,
  connections,
  selectedProjectId,
  onSelect,
}: {
  main: EcossistemaProjetoNode;
  related: EcossistemaProjetoNode[];
  connections: EcossistemaConexao[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = useMemo(() => buildGraph(main, related, connections), [main, related, connections]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.project.id, node])), [nodes]);
  const aggregated = useMemo(() => {
    const map = new Map<string, { source: string; target: string; count: number; high: number }>();
    connections.filter((item) => item.crossProject).forEach((item) => {
      const key = `${item.origem.projetoId}::${item.destino.projetoId}`;
      const current = map.get(key) ?? { source: item.origem.projetoId, target: item.destino.projetoId, count: 0, high: 0 };
      current.count += 1;
      if (item.criticidade === 'Alta') current.high += 1;
      map.set(key, current);
    });
    return [...map.values()];
  }, [connections]);

  return (
    <div className="ecosystem-graph-shell">
      <div className="ecosystem-graph-scroll" tabIndex={0} aria-label="Grafo de dependências entre projetos">
        <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} className="ecosystem-graph" role="img" aria-label="Ecossistema de projetos conectados por integrações reais">
          <defs>
            <marker id="ecosystem-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L8,3.5 z" className="ecosystem-graph__arrow" />
            </marker>
          </defs>

          <g>
            {aggregated.map((edge) => {
              const source = byId.get(edge.source);
              const target = byId.get(edge.target);
              if (!source || !target) return null;
              const selected = !selectedProjectId || edge.source === selectedProjectId || edge.target === selectedProjectId;
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / length;
              const ny = dx / length;
              const curve = 18;
              const cx = (source.x + target.x) / 2 + nx * curve;
              const cy = (source.y + target.y) / 2 + ny * curve;
              const path = `M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`;
              const mx = (source.x + 2 * cx + target.x) / 4;
              const my = (source.y + 2 * cy + target.y) / 4;
              return (
                <g key={`${edge.source}-${edge.target}`} className={selected ? 'ecosystem-graph__edge-group' : 'ecosystem-graph__edge-group ecosystem-graph__edge-group--muted'}>
                  <path d={path} markerEnd="url(#ecosystem-arrow)" className={`ecosystem-graph__edge${edge.high ? ' ecosystem-graph__edge--high' : ''}`} />
                  {selected && (
                    <g transform={`translate(${mx},${my})`} className="ecosystem-graph__edge-label">
                      <rect x="-28" y="-11" width="56" height="22" rx="11" />
                      <text textAnchor="middle" y="4">{edge.count} {edge.count === 1 ? 'fluxo' : 'fluxos'}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          <g>
            {nodes.map((node) => {
              const selected = selectedProjectId === node.project.id;
              const isMain = node.project.id === main.id;
              return (
                <g
                  key={node.project.id}
                  transform={`translate(${node.x - NODE_W / 2},${node.y - NODE_H / 2})`}
                  className={`ecosystem-graph__node${selected ? ' ecosystem-graph__node--selected' : ''}${isMain ? ' ecosystem-graph__node--main' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.project.nome}, ${node.connections} conexões`}
                  onClick={() => onSelect(node.project.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(node.project.id);
                    }
                  }}
                >
                  <rect width={NODE_W} height={NODE_H} rx="12" className="ecosystem-graph__node-surface" />
                  <circle cx="28" cy="28" r="16" className="ecosystem-graph__node-avatar" />
                  <text x="28" y="32" textAnchor="middle" className="ecosystem-graph__node-avatar-text">{initials(node.project.nome)}</text>
                  <text x="53" y="25" className="ecosystem-graph__node-title">{node.project.nome.length > 20 ? `${node.project.nome.slice(0, 19)}…` : node.project.nome}</text>
                  <text x="53" y="44" className="ecosystem-graph__node-meta">{node.project.codigo}</text>
                  <text x="53" y="62" className="ecosystem-graph__node-count">{node.connections} {node.connections === 1 ? 'conexão' : 'conexões'}</text>
                  {isMain && <text x="165" y="18" textAnchor="middle" className="ecosystem-graph__main-tag">ATUAL</text>}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export function ProjetoEcossistemaPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useProjetoEcossistema(id);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selected = data
    ? [data.projeto, ...data.projetosRelacionados].find((project) => project.id === selectedProjectId) ?? data.projeto
    : null;

  const selectedConnections = data && selected
    ? data.conexoes.filter((connection) => connection.origem.projetoId === selected.id || connection.destino.projetoId === selected.id)
    : [];

  const columns: DataTableColumn<EcossistemaConexao>[] = [
    {
      key: 'nome',
      label: 'Integração',
      primary: true,
      minWidth: 220,
      render: (row) => (
        <div className="ecosystem-connection-name">
          <strong>{row.nome}</strong>
          <span>{row.tipo ?? 'Tipo não informado'}{row.modo ? ` · ${row.modo}` : ''}</span>
        </div>
      ),
    },
    {
      key: 'origem',
      label: 'Origem',
      minWidth: 220,
      render: (row) => <div className="ecosystem-endpoint"><strong>{row.origem.nome}</strong><span>{row.origem.projetoNome}</span></div>,
    },
    {
      key: 'destino',
      label: 'Destino',
      minWidth: 220,
      render: (row) => <div className="ecosystem-endpoint"><strong>{row.destino.nome}</strong><span>{row.destino.projetoNome}</span></div>,
    },
    {
      key: 'criticidade',
      label: 'Criticidade',
      minWidth: 110,
      render: (row) => <Badge preset={row.criticidade === 'Alta' ? 'erro' : row.criticidade === 'Média' ? 'pendente' : 'info'}>{row.criticidade ?? 'Não definida'}</Badge>,
    },
    {
      key: 'crossProject',
      label: 'Escopo',
      minWidth: 130,
      render: (row) => <Badge preset={row.crossProject ? 'info' : 'inativo'}>{row.crossProject ? 'Cross-project' : 'Interno'}</Badge>,
    },
  ];

  if (!id) return null;

  if (isLoading) {
    return <div className="setup-page" aria-live="polite"><span className="dbc-text-2">Carregando ecossistema...</span></div>;
  }

  if (isError || !data) {
    return (
      <div className="setup-page">
        <EmptyState title="Não foi possível carregar o ecossistema" message="Verifique a conexão e tente novamente." actionLabel="Voltar ao projeto" onAction={() => navigate(`/projetos/${id}`)} />
      </div>
    );
  }

  const rail = (
    <RightRail sticky>
      <SectionCard title="Projeto em foco" subtitle="Contexto selecionado no grafo." icon="folder">
        <div className="ecosystem-focus-card">
          <div className="ecosystem-focus-card__head">
            <div>
              <strong>{selected?.nome}</strong>
              <span>{selected?.codigo}</span>
            </div>
            {selected && <Badge preset={STATUS_PRESET[selected.status] ?? 'info'}>{selected.status}</Badge>}
          </div>
          <div className="ecosystem-focus-card__meta">
            <span>Área de negócio</span>
            <strong>{selected?.areaNegocio ?? 'Não definida'}</strong>
          </div>
          <div className="ecosystem-focus-card__meta">
            <span>Conexões visíveis</span>
            <strong>{selectedConnections.length}</strong>
          </div>
          {selected && selected.id !== id && (
            <button type="button" className="ecosystem-focus-card__action" onClick={() => navigate(`/projetos/${selected.id}`)}>
              Abrir projeto relacionado →
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Leitura do ecossistema" subtitle="Indicadores derivados das integrações documentadas." icon="network">
        <div className="ecosystem-insights">
          <div><span>Entradas no projeto</span><strong>{data.resumo.entradas}</strong></div>
          <div><span>Saídas do projeto</span><strong>{data.resumo.saidas}</strong></div>
          <div><span>Alta criticidade</span><strong>{data.resumo.altaCriticidade}</strong></div>
          <div><span>Produtos conectados</span><strong>{data.resumo.produtosDoProjetoConectados}</strong></div>
        </div>
        <p className="ecosystem-insights__note">Esses números não são estimativas: são derivados apenas das Integrações atualmente documentadas no Nexus.</p>
      </SectionCard>
    </RightRail>
  );

  return (
    <SetupPage
      step="projeto"
      header={
        <SetupPageHeader
          title="Ecossistema do Projeto"
          description="Visualize dependências reais entre este projeto e outros contextos da organização."
          back={{ label: 'Voltar ao projeto', onClick: () => navigate(`/projetos/${id}`) }}
        />
      }
      rail={rail}
    >
      <div className="ecosystem-metrics">
        <MetricCard label="Conexões documentadas" value={data.resumo.totalConexoes} icon={<Icon name="network" size={18} />} />
        <MetricCard label="Cross-project" value={data.resumo.conexoesCrossProject} icon={<Icon name="arrowR" size={18} />} />
        <MetricCard label="Projetos relacionados" value={data.resumo.projetosRelacionados} icon={<Icon name="folder" size={18} />} />
        <MetricCard label="Alta criticidade" value={data.resumo.altaCriticidade} icon={<Icon name="warning" size={18} />} />
      </div>

      <SectionCard title="Mapa do ecossistema" subtitle="Projetos conectados por Integrações reais entre seus Produtos." icon="network" padding="none">
        {data.projetosRelacionados.length === 0 ? (
          <div className="ecosystem-empty">
            <EmptyState title="Nenhuma dependência cross-project documentada" message="Quando um Produto deste projeto se integrar a um Produto de outro projeto, a relação aparecerá automaticamente aqui." />
          </div>
        ) : (
          <>
            <EcosystemGraph
              main={data.projeto}
              related={data.projetosRelacionados}
              connections={data.conexoes}
              selectedProjectId={selected?.id ?? null}
              onSelect={setSelectedProjectId}
            />
            <div className="ecosystem-legend">
              <span><i className="ecosystem-legend__line" /> Fluxo documentado</span>
              <span><i className="ecosystem-legend__line ecosystem-legend__line--high" /> Contém integração de alta criticidade</span>
              <small>Clique em um projeto para isolar suas conexões.</small>
            </div>
          </>
        )}
      </SectionCard>

      <DataTableCard
        columns={columns}
        rows={selectedConnections}
        loading={false}
        rowKey={(row) => row.id}
        ariaLabel="Dependências documentadas do ecossistema"
        toolbar={
          <div className="ecosystem-table-heading">
            <div>
              <strong>Dependências documentadas</strong>
              <span>Relações de entrada e saída que tocam o contexto selecionado.</span>
            </div>
            <Badge preset="info">{selectedConnections.length} {selectedConnections.length === 1 ? 'relação' : 'relações'}</Badge>
          </div>
        }
        empty={<EmptyState title="Nenhuma dependência encontrada" message="Não existem Integrações documentadas para o contexto selecionado." />}
        onRowClick={(row) => navigate(`/projetos/${row.origem.projetoId}/produtos/${row.origem.id}/integracoes/${row.id}`)}
      />
    </SetupPage>
  );
}
