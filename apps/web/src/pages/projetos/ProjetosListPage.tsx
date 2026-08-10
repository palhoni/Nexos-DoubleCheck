import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
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
import { PROJETO_CONFIG } from '@/entities/projeto/projeto.config';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { AREAS_NEGOCIO_LIST, STATUS_PROJETO_LIST, type Projeto } from '@/entities/projeto/projeto.types';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const PAGE_SIZE = 10;
const SUPPORT_PAGE_SIZE = 100;

function clean(value: string | null | undefined, fallback = 'Não informado') {
  const text = value?.trim();
  return text || fallback;
}

function ProjectMetric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="project-list-metric">
      <div>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

export function ProjetosListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [status, setStatus] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  const [areaNegocio, setAreaNegocio] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: listData, isLoading } = projetoHooks.useList({
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    ...(search ? { nome: search } : {}),
    ...(status ? { status } : {}),
    ...(areaNegocio ? { areaNegocio } : {}),
  });
  const { data: supportData } = projetoHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' });
  const toggleMutation = projetoHooks.useToggleStatus();

  const projects = listData?.data ?? [];
  const allProjects = supportData?.data ?? [];
  const meta = listData?.meta;
  const totalProjects = supportData?.meta.total ?? allProjects.length;
  const activeProjects = allProjects.filter((item) => item.status === 'Ativo').length;
  const planningProjects = allProjects.filter((item) => item.status === 'Planejamento').length;
  const inactiveProjects = allProjects.filter((item) => item.status === 'Inativo').length;
  const withObjective = allProjects.filter((item) => Boolean(item.objetivo?.trim())).length;
  const withOwner = allProjects.filter((item) => Boolean(item.responsavelPrincipal?.trim())).length;
  const withSource = allProjects.filter((item) => Boolean(item.confluenceRef?.trim()) || (item.fontesGerais?.length ?? 0) > 0).length;
  const supportMayBePartial = (supportData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE;

  const areaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allProjects.forEach((item) => {
      const key = item.areaNegocio?.trim() || 'Sem área definida';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  }, [allProjects]);

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

  const columns: DataTableColumn<Projeto>[] = [
    {
      key: 'nome',
      label: 'Projeto',
      primary: true,
      minWidth: 250,
      render: (row) => (
        <div className="project-list-name-cell">
          <span className="project-list-name-cell__icon"><Icon name="folder" size={15} /></span>
          <div>
            <strong>{row.nome}</strong>
            <span>{row.codigo}{row.areaNegocio ? ` · ${row.areaNegocio}` : ''}</span>
          </div>
        </div>
      ),
    },
    { key: 'responsavelPrincipal', label: 'Responsável', minWidth: 170, render: (row) => clean(row.responsavelPrincipal) },
    {
      key: 'idiomas',
      label: 'Idiomas',
      minWidth: 170,
      sortable: false,
      render: (row) => row.idiomas?.length ? (
        <div className="project-list-inline-tags">
          {row.idiomas.slice(0, 2).map((item) => <Badge key={item} preset="neutral" dot={false}>{item}</Badge>)}
          {row.idiomas.length > 2 && <span>+{row.idiomas.length - 2}</span>}
        </div>
      ) : <span className="setup-muted-value">Nenhum</span>,
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
      minWidth: 120,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={PROJETO_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />,
    },
  ];

  const firstItem = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastItem = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const hasFilters = Boolean(search || status || areaNegocio);
  const appliedFilterCount = [status, areaNegocio].filter(Boolean).length;

  return (
    <SetupPage
      stepper={false}
      header={
        <SetupPageHeader
          breadcrumb={['Setup', 'Projetos']}
          title="Projetos"
          subtitle="Escolha o contexto de trabalho e mantenha a origem do conhecimento organizada desde o início."
          actions={<Button variant="primary" icon="plus" onClick={() => navigate('/projetos/novo')}>Novo projeto</Button>}
        />
      }
      rail={
        <RightRail>
          <SectionCard title="Panorama" subtitle="Situação dos projetos cadastrados" icon="chart" padding="compact">
            <div className="project-list-metrics">
              <ProjectMetric label="Projetos" value={totalProjects} />
              <ProjectMetric label="Ativos" value={activeProjects} />
              <ProjectMetric label="Planejamento" value={planningProjects} />
              <ProjectMetric label="Inativos" value={inactiveProjects} />
            </div>
          </SectionCard>

          <SectionCard title="Qualidade da base" subtitle="Campos essenciais para contexto e governança" icon="clipboardCheck" padding="compact">
            <div className="project-list-quality">
              {[
                ['Objetivo documentado', withObjective],
                ['Responsável definido', withOwner],
                ['Fonte de referência', withSource],
              ].map(([label, value]) => {
                const count = Number(value);
                const pct = totalProjects > 0 ? Math.round((count / Math.min(totalProjects, SUPPORT_PAGE_SIZE)) * 100) : 0;
                return (
                  <div className="project-list-quality__row" key={String(label)}>
                    <div><span>{label}</span><strong>{count}/{Math.min(totalProjects, SUPPORT_PAGE_SIZE)}</strong></div>
                    <div className="project-list-quality__track"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Distribuição por área" subtitle="Onde o conhecimento está concentrado" icon="folder" padding="compact">
            {areaDistribution.length ? (
              <div className="project-list-area-list">
                {areaDistribution.slice(0, 6).map(([area, count]) => (
                  <div key={area}><span>{area}</span><Badge preset="neutral" dot={false}>{count}</Badge></div>
                ))}
              </div>
            ) : <span className="dbc-text-3">Nenhum projeto cadastrado ainda.</span>}
          </SectionCard>
        </RightRail>
      }
    >
      <div className="project-list-page">
        <DataTableCard
          ariaLabel="Projetos cadastrados"
          columns={columns}
          rows={projects}
          rowKey={(row) => row.id}
          loading={isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => navigate(`/projetos/${row.id}`)}
          rowActions={(row) => (
            <RowActionButton title={`Editar ${row.nome}`} onClick={() => navigate(`/projetos/${row.id}/editar`)}>
              <Icon name="edit" size={15} />
            </RowActionButton>
          )}
          toolbar={
            <>
              <div className="setup-table-toolbar project-list-toolbar">
                <div className="setup-table-toolbar__copy">
                  <h2>Projetos cadastrados</h2>
                  <p>Cada projeto define contexto e propriedade, sem isolar o conhecimento do ecossistema.</p>
                </div>
                <div className="setup-table-toolbar__actions">
                  <SearchInput
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
                    placeholder="Buscar projeto..."
                    wrapStyle={{ width: 250 }}
                    aria-label="Buscar projeto"
                  />
                  <Button variant="default" onClick={() => setFiltersOpen((open) => !open)}>
                    <Icon name="search" size={14} />
                    Filtros{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ''}
                  </Button>
                  <Button variant="primary" icon="plus" onClick={() => navigate('/projetos/novo')}>Novo projeto</Button>
                </div>
              </div>
              {filtersOpen && (
                <div className="setup-table-filterbar project-list-filterbar">
                  <div className="setup-table-filterbar__field">
                    <label>Status</label>
                    <EntitySelectField value={statusDraft} onChange={setStatusDraft} options={normalizeOptions(STATUS_PROJETO_LIST)} />
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
              title={hasFilters ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
              message={hasFilters ? 'Revise a busca ou os filtros aplicados.' : 'Crie o primeiro projeto para iniciar a estruturação do conhecimento.'}
              actionLabel={hasFilters ? 'Limpar filtros' : 'Criar projeto'}
              onAction={hasFilters ? clearFilters : () => navigate('/projetos/novo')}
            />
          }
          footer={meta ? (
            <div className="setup-table-footer">
              <span>{meta.total > 0 ? `Mostrando ${firstItem}–${lastItem} de ${meta.total}` : 'Nenhum registro'}</span>
              <Pagination page={meta.page} total={meta.totalPages} onChange={setPage} />
            </div>
          ) : undefined}
        />

        {supportMayBePartial && (
          <div className="setup-data-limit-note">
            <Icon name="info" size={14} />
            <span>Os indicadores laterais consideram até {SUPPORT_PAGE_SIZE} projetos por consulta; a tabela principal continua paginada normalmente.</span>
          </div>
        )}
      </div>
    </SetupPage>
  );
}
