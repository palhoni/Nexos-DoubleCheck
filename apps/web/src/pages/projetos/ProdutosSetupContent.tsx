import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ChipList,
  DataTableCard,
  EmptyState,
  Icon,
  Pagination,
  RightRail,
  RowActionButton,
  SearchInput,
  SectionCard,
  type DataTableColumn,
} from '@/design-system';
import { EntitySelectField } from '@/entities/crud/EntityFormFields';
import { EntityStatusBadge, normalizeOptions } from '@/entities/crud/shared';
import { PRODUTO_CONFIG } from '@/entities/produto/produto.config';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { STATUS_PRODUTO_LIST, type Produto } from '@/entities/produto/produto.types';
import { AREAS_NEGOCIO_LIST } from '@/entities/projeto/projeto.types';
import { timeHooks } from '@/entities/time/time.hooks';
import type { Time } from '@/entities/time/time.types';

const PAGE_SIZE = 10;
const SUPPORT_PAGE_SIZE = 100;

function clean(value: string | null | undefined, fallback = 'Não informado') {
  const text = value?.trim();
  return text || fallback;
}

function MetricLine({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="setup-rail-metric">
      <div>
        <div className="setup-rail-metric__label">{label}</div>
        {hint && <div className="setup-rail-metric__hint">{hint}</div>}
      </div>
      <div className="setup-rail-metric__value">{value}</div>
    </div>
  );
}

function CoverageRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="setup-product-health-row">
      <div className="setup-product-health-row__header">
        <span>{label}</span>
        <strong>{value}/{total}</strong>
      </div>
      <div className="setup-product-health-row__track" aria-hidden="true">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <small>{percentage}% dos produtos</small>
    </div>
  );
}

function TeamCoverage({ products, teamsById }: { products: Produto[]; teamsById: Map<string, Time> }) {
  const coverage = useMemo(() => {
    const countByTeam = new Map<string, number>();
    let withoutTeam = 0;

    for (const product of products) {
      if (!product.timeResponsavelId) {
        withoutTeam += 1;
        continue;
      }
      countByTeam.set(product.timeResponsavelId, (countByTeam.get(product.timeResponsavelId) ?? 0) + 1);
    }

    return {
      items: [...countByTeam.entries()]
        .map(([teamId, count]) => ({ teamId, count, name: teamsById.get(teamId)?.nome ?? 'Time não localizado' }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')),
      withoutTeam,
    };
  }, [products, teamsById]);

  if (products.length === 0) {
    return <div className="setup-rail-empty">Nenhum produto cadastrado neste projeto.</div>;
  }

  return (
    <div className="setup-product-team-list">
      {coverage.items.slice(0, 5).map((item) => (
        <div className="setup-product-team-row" key={item.teamId}>
          <span className="setup-product-team-row__icon"><Icon name="users" size={14} /></span>
          <div className="setup-product-team-row__copy">
            <strong>{item.name}</strong>
            <small>{item.count} {item.count === 1 ? 'produto' : 'produtos'}</small>
          </div>
          <Badge preset="info" dot={false}>{item.count}</Badge>
        </div>
      ))}
      {coverage.items.length > 5 && <div className="setup-rail-more">+ {coverage.items.length - 5} times</div>}
      {coverage.withoutTeam > 0 && (
        <div className="setup-product-team-row setup-product-team-row--warning">
          <span className="setup-product-team-row__icon"><Icon name="warning" size={14} /></span>
          <div className="setup-product-team-row__copy">
            <strong>Sem time responsável</strong>
            <small>{coverage.withoutTeam} {coverage.withoutTeam === 1 ? 'produto pendente' : 'produtos pendentes'}</small>
          </div>
          <Badge preset="pendente" dot={false}>{coverage.withoutTeam}</Badge>
        </div>
      )}
    </div>
  );
}

export function ProdutosSetupContent({ projetoId }: { projetoId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [status, setStatus] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  const [areaNegocio, setAreaNegocio] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const listQuery = {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    ...(search ? { nome: search } : {}),
    ...(status ? { status } : {}),
    ...(areaNegocio ? { areaNegocio } : {}),
  };

  const { data: productsData, isLoading } = produtoHooks.useList(listQuery, projetoId);
  const { data: allProductsData } = produtoHooks.useList(
    { page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' },
    projetoId,
  );
  const { data: teamsData } = timeHooks.useList(
    { page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' },
    projetoId,
  );

  const toggleMutation = produtoHooks.useToggleStatus(projetoId);

  const products = productsData?.data ?? [];
  const allProducts = allProductsData?.data ?? [];
  const teams = teamsData?.data ?? [];
  const meta = productsData?.meta;

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const totalProducts = allProductsData?.meta.total ?? allProducts.length;
  const activeProducts = allProducts.filter((product) => product.status === 'Ativo').length;
  const planningProducts = allProducts.filter((product) => product.status === 'Planejamento').length;
  const withTeam = allProducts.filter((product) => Boolean(product.timeResponsavelId)).length;
  const withCountries = allProducts.filter((product) => (product.paises?.length ?? 0) > 0).length;
  const withObjective = allProducts.filter((product) => Boolean(product.objetivo?.trim())).length;
  const supportDataMayBePartial =
    (allProductsData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE ||
    (teamsData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE;

  function applyFilters() {
    setSearch(searchDraft.trim());
    setStatus(statusDraft);
    setAreaNegocio(areaDraft);
    setPage(1);
  }

  function clearFilters() {
    setSearchDraft('');
    setSearch('');
    setStatusDraft('');
    setStatus('');
    setAreaDraft('');
    setAreaNegocio('');
    setPage(1);
  }

  function handleSort(key: string) {
    if (sortBy === key) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function openCreate() {
    navigate(`/projetos/${projetoId}/produtos/novo`);
  }

  function openEdit(row: Produto) {
    navigate(`/projetos/${projetoId}/produtos/${row.id}/editar`);
  }

  const columns: DataTableColumn<Produto>[] = [
    {
      key: 'nome',
      label: 'Produto',
      primary: true,
      minWidth: 220,
      render: (row) => (
        <div className="setup-product-cell">
          <span className="setup-product-cell__icon"><Icon name="box" size={15} /></span>
          <div className="setup-product-cell__copy">
            <strong>{row.nome}</strong>
            <span>{row.codigo}{row.nomeCurto ? ` · ${row.nomeCurto}` : ''}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'areaNegocio',
      label: 'Área de negócio',
      minWidth: 160,
      render: (row) => clean(row.areaNegocio, 'Não definida'),
    },
    {
      key: 'timeResponsavelId',
      label: 'Time responsável',
      minWidth: 170,
      sortable: false,
      render: (row) => row.timeResponsavelId ? clean(teamsById.get(row.timeResponsavelId)?.nome, 'Time não localizado') : <span className="setup-muted-value">Sem time</span>,
    },
    {
      key: 'paises',
      label: 'Países',
      minWidth: 170,
      sortable: false,
      render: (row) => (row.paises?.length ?? 0) > 0
        ? <div className="setup-chip-clamp"><ChipList values={row.paises.slice(0, 2)} />{row.paises.length > 2 && <span className="setup-chip-more">+{row.paises.length - 2}</span>}</div>
        : <span className="setup-muted-value">Nenhum</span>,
    },
    {
      key: 'ambientes',
      label: 'Ambientes',
      minWidth: 150,
      sortable: false,
      render: (row) => (row.ambientes?.length ?? 0) > 0
        ? <div className="setup-chip-clamp"><ChipList values={row.ambientes.slice(0, 2)} />{row.ambientes.length > 2 && <span className="setup-chip-more">+{row.ambientes.length - 2}</span>}</div>
        : <span className="setup-muted-value">Nenhum</span>,
    },
    {
      key: 'updatedAt',
      label: 'Atualizado',
      minWidth: 120,
      render: (row) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(row.updatedAt)),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 115,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={PRODUTO_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />,
    },
  ];

  const firstItem = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastItem = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const hasFilters = Boolean(search || status || areaNegocio);
  const appliedFilterCount = [status, areaNegocio].filter(Boolean).length;

  return (
    <>
      <div className="setup-products-layout">
        <div className="setup-products-main">
          <DataTableCard
            columns={columns}
            rows={products}
            rowKey={(row) => row.id}
            density="default"
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${row.id}`)}
            rowActions={(row) => (
              <RowActionButton title={`Editar ${row.nome}`} onClick={() => openEdit(row)}>
                <Icon name="edit" size={15} />
              </RowActionButton>
            )}
            toolbar={
              <>
                <div className="setup-table-toolbar setup-table-toolbar--products">
                  <div className="setup-table-toolbar__copy">
                    <h2>Produtos cadastrados</h2>
                    <p>Produtos que compõem o conhecimento estruturado deste projeto.</p>
                  </div>
                  <div className="setup-table-toolbar__actions">
                    <SearchInput
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
                      placeholder="Buscar produto..."
                      wrapStyle={{ width: 240 }}
                      aria-label="Buscar produto"
                    />
                    <Button variant="default" onClick={() => setFiltersOpen((open) => !open)}>
                      <Icon name="search" size={14} />
                      Filtros{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ''}
                    </Button>
                    <Button variant="primary" onClick={openCreate}>
                      <Icon name="plus" size={14} />
                      Novo produto
                    </Button>
                  </div>
                </div>
                {filtersOpen && (
                  <div className="setup-table-filterbar setup-table-filterbar--products">
                    <div className="setup-table-filterbar__field">
                      <label>Status</label>
                      <EntitySelectField value={statusDraft} onChange={setStatusDraft} options={normalizeOptions(STATUS_PRODUTO_LIST)} />
                    </div>
                    <div className="setup-table-filterbar__field setup-table-filterbar__field--wide">
                      <label>Área de negócio</label>
                      <EntitySelectField value={areaDraft} onChange={setAreaDraft} options={normalizeOptions(AREAS_NEGOCIO_LIST)} />
                    </div>
                    <div className="setup-table-filterbar__buttons">
                      <Button variant="default" onClick={clearFilters} disabled={!hasFilters && !statusDraft && !areaDraft && !searchDraft}>Limpar</Button>
                      <Button onClick={applyFilters}>Aplicar filtros</Button>
                    </div>
                  </div>
                )}
              </>
            }
            empty={
              <EmptyState
                title={hasFilters ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                message={hasFilters ? 'Revise a busca ou os filtros aplicados.' : 'Cadastre o primeiro produto para iniciar a estruturação do projeto.'}
                actionLabel={hasFilters ? 'Limpar filtros' : 'Cadastrar produto'}
                onAction={hasFilters ? clearFilters : openCreate}
              />
            }
            footer={meta ? (
              <div className="setup-table-footer">
                <span>{meta.total > 0 ? `Mostrando ${firstItem}–${lastItem} de ${meta.total}` : 'Nenhum registro'}</span>
                <Pagination page={meta.page} total={meta.totalPages} onChange={setPage} />
              </div>
            ) : undefined}
          />

          {supportDataMayBePartial && (
            <div className="setup-data-limit-note">
              <Icon name="info" size={14} />
              <span>Os indicadores laterais consideram até {SUPPORT_PAGE_SIZE} produtos/times por consulta. A tabela principal continua paginada normalmente.</span>
            </div>
          )}
        </div>

        <RightRail>
          <SectionCard>
            <div className="setup-rail-card-heading">
              <span className="setup-rail-card-heading__icon"><Icon name="chart" size={15} /></span>
              <div>
                <h3>Resumo dos produtos</h3>
                <p>Visão rápida da estrutura atual.</p>
              </div>
            </div>
            <div className="setup-products-metrics">
              <MetricLine label="Produtos cadastrados" value={totalProducts} />
              <MetricLine label="Ativos" value={activeProducts} hint="Disponíveis no projeto" />
              <MetricLine label="Em planejamento" value={planningProducts} hint="Ainda em estruturação" />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="setup-rail-card-heading">
              <span className="setup-rail-card-heading__icon"><Icon name="clipboardCheck" size={15} /></span>
              <div>
                <h3>Cobertura cadastral</h3>
                <p>Campos essenciais já documentados.</p>
              </div>
            </div>
            <div className="setup-product-health-list">
              <CoverageRow label="Time responsável" value={withTeam} total={allProducts.length} />
              <CoverageRow label="Países cadastrados" value={withCountries} total={allProducts.length} />
              <CoverageRow label="Objetivo documentado" value={withObjective} total={allProducts.length} />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="setup-rail-card-heading">
              <span className="setup-rail-card-heading__icon"><Icon name="users" size={15} /></span>
              <div>
                <h3>Responsabilidade por time</h3>
                <p>Distribuição real dos produtos cadastrados.</p>
              </div>
            </div>
            <TeamCoverage products={allProducts} teamsById={teamsById} />
          </SectionCard>

          <SectionCard>
            <div className="setup-rail-card-heading">
              <span className="setup-rail-card-heading__icon"><Icon name="zap" size={15} /></span>
              <div>
                <h3>Ações rápidas</h3>
                <p>Continue estruturando o projeto.</p>
              </div>
            </div>
            <div className="setup-quick-actions-list">
              <button type="button" onClick={openCreate}>
                <span><Icon name="plus" size={14} /></span>
                <div><strong>Novo produto</strong><small>Adicionar um produto ao projeto</small></div>
                <Icon name="arrowR" size={13} />
              </button>
              <button type="button" onClick={() => navigate(`/projetos/${projetoId}/times`)}>
                <span><Icon name="users" size={14} /></span>
                <div><strong>Revisar times</strong><small>Validar responsáveis pelos produtos</small></div>
                <Icon name="arrowR" size={13} />
              </button>
              <button type="button" onClick={() => navigate('/integracoes')}>
                <span><Icon name="network" size={14} /></span>
                <div><strong>Mapa de integrações</strong><small>Ver conexões já cadastradas</small></div>
                <Icon name="arrowR" size={13} />
              </button>
            </div>
          </SectionCard>
        </RightRail>
      </div>
    </>
  );
}
