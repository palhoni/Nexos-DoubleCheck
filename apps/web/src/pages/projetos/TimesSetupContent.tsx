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
  Toast,
  type DataTableColumn,
} from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntitySelectField } from '@/entities/crud/EntityFormFields';
import { EntityStatusBadge, getErrorMessage, normalizeOptions } from '@/entities/crud/shared';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import type { Pessoa } from '@/entities/pessoa/pessoa.types';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import type { Produto } from '@/entities/produto/produto.types';
import { TIME_CONFIG } from '@/entities/time/time.config';
import { timeHooks } from '@/entities/time/time.hooks';
import { STATUS_TIME_LIST, type Time } from '@/entities/time/time.types';

const PAGE_SIZE = 10;
const SUPPORT_PAGE_SIZE = 100;

type ToastState = { type: 'success' | 'error'; title: string; message: string } | null;

function clampLabel(value: string | null | undefined, fallback = 'Não informado') {
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

function ProductCoverage({ produtos, timesById }: { produtos: Produto[]; timesById: Map<string, Time> }) {
  if (produtos.length === 0) {
    return <div className="setup-rail-empty">Nenhum produto cadastrado neste projeto.</div>;
  }

  return (
    <div className="setup-product-coverage-list">
      {produtos.slice(0, 6).map((produto) => {
        const time = produto.timeResponsavelId ? timesById.get(produto.timeResponsavelId) : undefined;
        return (
          <div className="setup-product-coverage-row" key={produto.id}>
            <div className="setup-product-coverage-row__main">
              <strong>{produto.nome}</strong>
              <span>{time ? time.nome : 'Sem time responsável'}</span>
            </div>
            <Badge preset={time ? 'ativo' : 'pendente'} dot={false}>
              {time ? 'Coberto' : 'Pendente'}
            </Badge>
          </div>
        );
      })}
      {produtos.length > 6 && <div className="setup-rail-more">+ {produtos.length - 6} produtos</div>}
    </div>
  );
}

export function TimesSetupContent({ projetoId }: { projetoId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [status, setStatus] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Time | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const listQuery = {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    ...(search ? { nome: search } : {}),
    ...(status ? { status } : {}),
  };

  const { data: timesData, isLoading } = timeHooks.useList(listQuery, projetoId);
  const { data: allTimesData } = timeHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);
  const { data: pessoasData } = pessoaHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);
  const { data: produtosData } = produtoHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' }, projetoId);

  const createMutation = timeHooks.useCreate(projetoId);
  const updateMutation = timeHooks.useUpdate(projetoId);
  const toggleMutation = timeHooks.useToggleStatus(projetoId);

  const times = timesData?.data ?? [];
  const allTimes = allTimesData?.data ?? [];
  const pessoas = pessoasData?.data ?? [];
  const produtos = produtosData?.data ?? [];
  const meta = timesData?.meta;

  const peopleByTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const pessoa of pessoas) {
      if (!pessoa.timeId) continue;
      map.set(pessoa.timeId, (map.get(pessoa.timeId) ?? 0) + 1);
    }
    return map;
  }, [pessoas]);

  const productByTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const produto of produtos) {
      if (!produto.timeResponsavelId) continue;
      map.set(produto.timeResponsavelId, (map.get(produto.timeResponsavelId) ?? 0) + 1);
    }
    return map;
  }, [produtos]);

  const timesById = useMemo(() => new Map(allTimes.map((time) => [time.id, time])), [allTimes]);
  const activeTimes = allTimes.filter((time) => time.status === 'Ativo').length;
  const assignedPeople = pessoas.filter((pessoa: Pessoa) => Boolean(pessoa.timeId)).length;
  const coveredProducts = produtos.filter((produto) => Boolean(produto.timeResponsavelId)).length;
  const supportDataMayBePartial =
    (allTimesData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE ||
    (pessoasData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE ||
    (produtosData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE;

  function applySearch() {
    setSearch(searchDraft.trim());
    setStatus(statusDraft);
    setPage(1);
  }

  function clearFilters() {
    setSearchDraft('');
    setSearch('');
    setStatusDraft('');
    setStatus('');
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
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEdit(row: Time) {
    setEditingItem(row);
    setModalOpen(true);
  }

  function save(data: Partial<Time>) {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, dto: data },
        {
          onSuccess: () => {
            setModalOpen(false);
            setToast({ type: 'success', title: 'Time atualizado', message: 'As alterações foram salvas com sucesso.' });
          },
          onError: (error) => setToast({ type: 'error', title: 'Não foi possível salvar', message: getErrorMessage(error) }),
        },
      );
      return;
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        setModalOpen(false);
        setToast({ type: 'success', title: 'Time criado', message: 'O novo time foi adicionado ao projeto.' });
      },
      onError: (error) => setToast({ type: 'error', title: 'Não foi possível criar', message: getErrorMessage(error) }),
    });
  }

  const columns: DataTableColumn<Time>[] = [
    {
      key: 'nome',
      label: 'Time',
      primary: true,
      minWidth: 190,
      render: (row) => (
        <div className="setup-table-primary-cell">
          <strong>{row.nome}</strong>
          <span>{clampLabel(row.descricao, 'Sem descrição')}</span>
        </div>
      ),
    },
    {
      key: 'missao',
      label: 'Missão',
      minWidth: 220,
      sortable: false,
      render: (row) => <span className="setup-table-clamp">{clampLabel(row.missao, 'Não informada')}</span>,
    },
    {
      key: 'paisesAtuacao',
      label: 'Países',
      minWidth: 170,
      sortable: false,
      render: (row) => <div className="setup-chip-clamp"><ChipList values={(row.paisesAtuacao ?? []).slice(0, 2)} />{(row.paisesAtuacao?.length ?? 0) > 2 && <span className="setup-chip-more">+{(row.paisesAtuacao?.length ?? 0) - 2}</span>}</div>,
    },
    {
      key: 'produtos',
      label: 'Produtos',
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (row) => <span className="setup-table-number">{productByTime.get(row.id) ?? row.produtosAtendidos?.length ?? 0}</span>,
    },
    {
      key: 'pessoas',
      label: 'Pessoas',
      minWidth: 90,
      sortable: false,
      align: 'center',
      render: (row) => <span className="setup-table-number">{peopleByTime.get(row.id) ?? 0}</span>,
    },
    {
      key: 'responsavelPrincipal',
      label: 'Responsável',
      minWidth: 160,
      render: (row) => clampLabel(row.responsavelPrincipal),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 110,
      stopRowClick: true,
      render: (row) => (
        <EntityStatusBadge config={TIME_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />
      ),
    },
  ];

  const firstItem = meta ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastItem = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const hasFilters = Boolean(search || status);

  return (
    <>
      <div className="setup-times-layout">
        <div className="setup-times-main">
          <DataTableCard
            columns={columns}
            rows={times}
            rowKey={(row) => row.id}
            density="default"
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(row) => navigate(`/projetos/${projetoId}/times/${row.id}`)}
            rowActions={(row) => (
              <RowActionButton title={`Editar ${row.nome}`} onClick={() => openEdit(row)}>
                <Icon name="edit" size={15} />
              </RowActionButton>
            )}
            toolbar={
              <div className="setup-table-toolbar">
                <div className="setup-table-toolbar__copy">
                  <h2>Times cadastrados</h2>
                  <p>Estrutura de times vinculada a este projeto.</p>
                </div>
                <div className="setup-table-toolbar__actions">
                  <SearchInput
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && applySearch()}
                    placeholder="Buscar time..."
                    wrapStyle={{ width: 240 }}
                  />
                  <Button variant={filtersOpen || status ? 'default' : 'ghost'} icon="chevronDown" onClick={() => setFiltersOpen((value) => !value)}>
                    Filtros{status ? ' · 1' : ''}
                  </Button>
                  <Button variant="primary" icon="plus" onClick={openCreate}>
                    Novo time
                  </Button>
                </div>
                {filtersOpen && (
                  <div className="setup-table-filterbar">
                    <div className="setup-table-filterbar__field">
                      <label>Status</label>
                      <EntitySelectField value={statusDraft} onChange={setStatusDraft} options={normalizeOptions([...STATUS_TIME_LIST])} />
                    </div>
                    <div className="setup-table-filterbar__buttons">
                      {hasFilters && (
                        <Button variant="ghost" onClick={clearFilters}>
                          Limpar
                        </Button>
                      )}
                      <Button variant="default" icon="search" onClick={applySearch}>
                        Aplicar filtros
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            }
            empty={
              <EmptyState
                title={hasFilters ? 'Nenhum time encontrado' : 'Nenhum time cadastrado'}
                message={hasFilters ? 'Revise os filtros aplicados ou limpe a busca.' : 'Cadastre o primeiro time para estruturar as responsabilidades do projeto.'}
                actionLabel={hasFilters ? 'Limpar filtros' : 'Novo time'}
                onAction={hasFilters ? clearFilters : openCreate}
              />
            }
            footer={
              meta && meta.total > 0 ? (
                <div className="setup-table-footer">
                  <span>
                    Mostrando {firstItem}–{lastItem} de {meta.total}
                  </span>
                  {meta.totalPages > 1 && <Pagination page={page} total={meta.totalPages} onChange={setPage} />}
                </div>
              ) : undefined
            }
          />
        </div>

        <RightRail>
          <SectionCard title="Cobertura do projeto" subtitle="Indicadores calculados a partir dos cadastros existentes.">
            <div className="setup-rail-metrics">
              <MetricLine label="Times ativos" value={`${activeTimes}/${allTimesData?.meta.total ?? allTimes.length}`} />
              <MetricLine label="Pessoas com time" value={`${assignedPeople}/${pessoasData?.meta.total ?? pessoas.length}`} />
              <MetricLine label="Produtos com responsável" value={`${coveredProducts}/${produtosData?.meta.total ?? produtos.length}`} />
            </div>
            {supportDataMayBePartial && <div className="setup-data-note">Os detalhamentos por relacionamento exibem até 100 registros por entidade.</div>}
          </SectionCard>

          <SectionCard title="Cobertura por produto" subtitle="Time principal associado a cada produto.">
            <ProductCoverage produtos={produtos} timesById={timesById} />
            <Button variant="link" iconRight="arrowR" onClick={() => navigate(`/projetos/${projetoId}/produtos`)}>
              Ver produtos do projeto
            </Button>
          </SectionCard>

          <SectionCard title="Ações rápidas">
            <div className="setup-quick-actions-list">
              <button type="button" onClick={openCreate}>
                <span className="setup-quick-actions-list__icon"><Icon name="plus" size={16} /></span>
                <span><strong>Adicionar time</strong><small>Criar uma nova estrutura de responsabilidade.</small></span>
                <Icon name="arrowR" size={14} />
              </button>
              <button type="button" onClick={() => navigate(`/projetos/${projetoId}/pessoas`)}>
                <span className="setup-quick-actions-list__icon"><Icon name="users" size={16} /></span>
                <span><strong>Gerenciar pessoas</strong><small>Revisar alocação e papéis do projeto.</small></span>
                <Icon name="arrowR" size={14} />
              </button>
              <button type="button" onClick={() => navigate(`/projetos/${projetoId}/produtos`)}>
                <span className="setup-quick-actions-list__icon"><Icon name="box" size={16} /></span>
                <span><strong>Gerenciar produtos</strong><small>Revisar produtos e times responsáveis.</small></span>
                <Icon name="arrowR" size={14} />
              </button>
            </div>
          </SectionCard>
        </RightRail>
      </div>

      <EntityFormModal
        config={TIME_CONFIG}
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSave={save}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <Toast open={Boolean(toast)} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
