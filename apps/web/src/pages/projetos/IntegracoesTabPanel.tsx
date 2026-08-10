import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, DataTableCard, EmptyState, Icon, RowActionButton, SearchInput, SectionCard, type DataTableColumn } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, getErrorMessage } from '@/entities/crud/shared';
import { INTEGRACAO_CONFIG } from '@/entities/integracao/integracao.config';
import { integracaoHooks } from '@/entities/integracao/integracao.hooks';
import type { Integracao } from '@/entities/integracao/integracao.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { useAllProdutos, type ProdutoGlobal } from '@/entities/produto/produto.globalApi';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';

function criticidadePreset(value?: string | null) {
  if (value === 'Alta') return 'erro' as const;
  if (value === 'Média') return 'pendente' as const;
  if (value === 'Baixa') return 'sucesso' as const;
  return 'info' as const;
}

function directionCopy(item: Integracao, current: ProdutoGlobal | undefined, related: ProdutoGlobal | undefined) {
  if (!current) return item.direcao ?? 'Direção não informada';
  if (!related) return `${current.nome} · destino não informado`;
  if (item.direcao === 'Entrada') return `${related.nome} → ${current.nome}`;
  if (item.direcao === 'Bidirecional') return `${current.nome} ↔ ${related.nome}`;
  return `${current.nome} → ${related.nome}`;
}

export function IntegracoesTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: listData, isLoading } = integracaoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const createMutation = integracaoHooks.useCreate(produtoId);
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const { data: produtosGlobais } = useAllProdutos();
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);

  const items = listData?.data ?? [];
  const products = produtosGlobais ?? [];
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const currentProduct = productMap.get(produtoId);
  const times = timesData?.data.map((t) => ({ value: t.id, label: t.nome })) ?? [];
  const produtosRelacionados = products.filter((p) => p.id !== produtoId).map((p) => ({ value: p.id, label: `${p.nome} · ${p.projeto.nome}` }));
  const funcionalidades = funcionalidadesData?.data.map((f) => ({ value: f.id, label: f.nome })) ?? [];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return items.filter((item) => {
      const related = item.produtoRelacionadoId ? productMap.get(item.produtoRelacionadoId) : undefined;
      const matchesQuery = !normalized || [item.nome, item.endpoint, item.dadosTrafegados, item.tipo, related?.nome, related?.projeto.nome]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(normalized));
      return matchesQuery && (!status || item.status === status) && (!type || item.tipo === type);
    });
  }, [items, productMap, query, status, type]);

  const connectedProducts = new Set(items.map((i) => i.produtoRelacionadoId).filter(Boolean));
  const crossProject = items.filter((i) => {
    if (!i.produtoRelacionadoId || !currentProduct) return false;
    return productMap.get(i.produtoRelacionadoId)?.projetoId !== currentProduct.projetoId;
  });
  const highCriticality = items.filter((i) => i.criticidade === 'Alta');
  const wellDocumented = items.filter((i) => Boolean(i.produtoRelacionadoId && i.direcao && i.tipo && i.criticidade && i.endpoint?.trim() && i.dadosTrafegados?.trim()));
  const documentationRate = items.length ? Math.round((wellDocumented.length / items.length) * 100) : 0;
  const types = [...new Set(items.map((i) => i.tipo).filter((value): value is NonNullable<Integracao['tipo']> => value != null))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const columns: DataTableColumn<Integracao>[] = [
    {
      key: 'nome',
      label: 'Integração',
      primary: true,
      minWidth: 240,
      sortable: false,
      render: (row) => (
        <div className="integration-list__identity">
          <span className="integration-list__icon"><Icon name="network" size={15} /></span>
          <div><strong>{row.nome}</strong><span>{row.tipo ?? 'Tipo não informado'} · {row.modo ?? 'Modo não informado'}</span></div>
        </div>
      ),
    },
    {
      key: 'flow',
      label: 'Fluxo',
      minWidth: 300,
      sortable: false,
      render: (row) => {
        const related = row.produtoRelacionadoId ? productMap.get(row.produtoRelacionadoId) : undefined;
        const isCross = Boolean(currentProduct && related && currentProduct.projetoId !== related.projetoId);
        return (
          <div className="integration-list__flow">
            <strong>{directionCopy(row, currentProduct, related)}</strong>
            <span>{related?.projeto.nome ?? 'Produto relacionado não documentado'} {isCross && <Badge preset="analise">Cross-project</Badge>}</span>
          </div>
        );
      },
    },
    {
      key: 'contract',
      label: 'Contrato / canal',
      minWidth: 220,
      sortable: false,
      render: (row) => <div className="integration-list__contract"><strong>{row.endpoint || 'Não documentado'}</strong><span>{row.papelDependencia || 'Papel não informado'}</span></div>,
    },
    {
      key: 'criticidade',
      label: 'Criticidade',
      minWidth: 120,
      sortable: false,
      render: (row) => row.criticidade ? <Badge preset={criticidadePreset(row.criticidade)}>{row.criticidade}</Badge> : <span className="knowledge-empty">Não informada</span>,
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 110,
      sortable: false,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={INTEGRACAO_CONFIG} value={row.status} />,
    },
  ];

  if (!projetoId) return null;

  function save(dto: Partial<Integracao>) {
    setError(null);
    createMutation.mutate(dto, {
      onSuccess: () => setCreateOpen(false),
      onError: (e: unknown) => setError(getErrorMessage(e)),
    });
  }

  return (
    <div className="knowledge-list integration-workspace">
      <div className="knowledge-metric-strip integration-metric-strip">
        <div><span>Integrações</span><strong>{items.length}</strong><small>{items.filter((i) => i.status === 'Ativo').length} ativas</small></div>
        <div><span>Produtos conectados</span><strong>{connectedProducts.size}</strong><small>{crossProject.length} fluxos cross-project</small></div>
        <div><span>Alta criticidade</span><strong>{highCriticality.length}</strong><small>merecem atenção especial</small></div>
        <div><span>Documentação essencial</span><strong>{documentationRate}%</strong><small>{wellDocumented.length} de {items.length || 0} completos</small></div>
      </div>

      <SectionCard padding="none">
        <div className="knowledge-list-toolbar integration-list-toolbar">
          <div className="knowledge-list-toolbar__copy">
            <strong>Integrações do produto</strong>
            <span>Dependências técnicas e funcionais que conectam este produto ao ecossistema.</span>
          </div>
          <div className="knowledge-list-toolbar__controls">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar integração, produto ou endpoint..." wrapStyle={{ minWidth: 270 }} />
            <select value={type} onChange={(e) => setType(e.target.value)} className="knowledge-filter-select" aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>{types.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="knowledge-filter-select" aria-label="Filtrar por status"><option value="">Todos os status</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
            <Button variant="default" icon="network" onClick={() => navigate(`/integracoes?produto=${produtoId}`)}>Ver no mapa</Button>
            <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Nova integração</Button>
          </div>
        </div>
        <DataTableCard
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          loading={isLoading}
          ariaLabel="Integrações do produto"
          onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/integracoes/${row.id}`)}
          rowActions={(row) => <RowActionButton title={`Abrir ${row.nome}`} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/integracoes/${row.id}`)}><Icon name="arrowR" size={14} /></RowActionButton>}
          empty={<EmptyState icon="network" title={query || status || type ? 'Nenhuma integração encontrada' : 'Nenhuma integração documentada'} description={query || status || type ? 'Revise os filtros aplicados.' : 'Mapeie a primeira dependência deste produto para começar a construir o ecossistema.'} />}
        />
      </SectionCard>

      {error && <div className="knowledge-error">{error}</div>}
      <EntityFormModal config={INTEGRACAO_CONFIG} open={createOpen} item={null} onClose={() => setCreateOpen(false)} onSave={save} saving={createMutation.isPending} extraOptions={{ times, produtosRelacionados, funcionalidades }} />
    </div>
  );
}
