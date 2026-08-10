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
  Toast,
  type DataTableColumn,
} from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntitySelectField } from '@/entities/crud/EntityFormFields';
import { EntityStatusBadge, getErrorMessage, normalizeOptions } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import type { Produto } from '@/entities/produto/produto.types';
import { REGRA_CONFIG } from '@/entities/regra/regra.config';
import { regraHooks } from '@/entities/regra/regra.hooks';
import { STATUS_REGRA_LIST, type Regra } from '@/entities/regra/regra.types';

const PAGE_SIZE = 10;
const SUPPORT_PAGE_SIZE = 100;

type ToastState = { type: 'success' | 'error'; title: string; message?: string } | null;

function priorityPreset(priority: Regra['prioridade']) {
  if (priority === 'Alta') return 'erro' as const;
  if (priority === 'Média') return 'pendente' as const;
  return 'info' as const;
}

function completeness(rule: Regra) {
  const checks = [
    Boolean(rule.condicao?.trim()),
    Boolean(rule.resultadoEsperado?.trim()),
    (rule.moduloIds?.length ?? 0) > 0,
    (rule.funcionalidadeIds?.length ?? 0) > 0,
    (rule.jornadaIds?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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

export function RegrasSetupContent({ projetoId }: { projetoId: string }) {
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [status, setStatus] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Regra | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const { data: productsData, isLoading: loadingProducts } = produtoHooks.useList(
    { page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' },
    projetoId,
  );
  const products = productsData?.data ?? [];
  const effectiveProductId = selectedProductId || products[0]?.id || '';
  const selectedProduct = products.find((product) => product.id === effectiveProductId);

  const listQuery = {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    ...(search ? { nome: search } : {}),
    ...(status ? { status } : {}),
  };

  const { data: rulesData, isLoading: loadingRules } = regraHooks.useList(listQuery, effectiveProductId || undefined, { enabled: Boolean(effectiveProductId) });
  const { data: allRulesData } = regraHooks.useList(
    { page: 1, pageSize: SUPPORT_PAGE_SIZE, sortBy: 'nome', sortDir: 'asc' },
    effectiveProductId || undefined,
    { enabled: Boolean(effectiveProductId) },
  );
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE }, effectiveProductId || undefined, { enabled: Boolean(effectiveProductId) });
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE }, effectiveProductId || undefined, { enabled: Boolean(effectiveProductId) });
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: SUPPORT_PAGE_SIZE }, effectiveProductId || undefined, { enabled: Boolean(effectiveProductId) });

  const createMutation = regraHooks.useCreate(effectiveProductId || undefined);
  const updateMutation = regraHooks.useUpdate(effectiveProductId || undefined);
  const toggleMutation = regraHooks.useToggleStatus(effectiveProductId || undefined);

  const rules = rulesData?.data ?? [];
  const allRules = allRulesData?.data ?? [];
  const meta = rulesData?.meta;
  const activeRules = allRules.filter((rule) => rule.status === 'Ativo').length;
  const highPriorityRules = allRules.filter((rule) => rule.prioridade === 'Alta').length;
  const documentedRules = allRules.filter((rule) => completeness(rule) >= 60).length;
  const supportDataMayBePartial = (allRulesData?.meta.total ?? 0) > SUPPORT_PAGE_SIZE;

  const productOptions = useMemo(
    () => products.map((product: Produto) => ({ value: product.id, label: `${product.nome}${product.codigo ? ` · ${product.codigo}` : ''}` })),
    [products],
  );
  const extraOptions = useMemo(
    () => ({
      modulos: modulosData?.data.map((item) => ({ value: item.id, label: item.nome })) ?? [],
      funcionalidades: funcionalidadesData?.data.map((item) => ({ value: item.id, label: item.nome })) ?? [],
      jornadas: jornadasData?.data.map((item) => ({ value: item.id, label: item.nome })) ?? [],
    }),
    [modulosData, funcionalidadesData, jornadasData],
  );

  function changeProduct(productId: string) {
    setSelectedProductId(productId);
    setPage(1);
    setSearchDraft('');
    setSearch('');
    setStatusDraft('');
    setStatus('');
    setEditingItem(null);
    setModalOpen(false);
  }

  function applyFilters() {
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

  function openEdit(rule: Regra) {
    setEditingItem(rule);
    setModalOpen(true);
  }

  async function save(data: Partial<Regra>) {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, dto: data });
        setToast({ type: 'success', title: 'Regra atualizada', message: 'As alterações foram salvas com sucesso.' });
      } else {
        await createMutation.mutateAsync(data);
        setToast({ type: 'success', title: 'Regra criada', message: 'A regra foi adicionada ao produto selecionado.' });
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      setToast({ type: 'error', title: 'Não foi possível salvar a regra', message: getErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<Regra>[] = [
    {
      key: 'nome',
      label: 'Regra',
      primary: true,
      minWidth: 240,
      render: (row) => (
        <div className="setup-rule-cell">
          <span className="setup-rule-cell__icon"><Icon name="clipboardCheck" size={15} /></span>
          <div className="setup-rule-cell__copy">
            <strong>{row.nome}</strong>
            <span>Versão {row.numeroVersao}{row.versaoAtual ? ' · atual' : ''}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'prioridade',
      label: 'Prioridade',
      minWidth: 110,
      render: (row) => row.prioridade ? <Badge preset={priorityPreset(row.prioridade)} dot={false}>{row.prioridade}</Badge> : <span className="dbc-text-3">Não definida</span>,
    },
    {
      key: 'condicao',
      label: 'Condição',
      minWidth: 240,
      sortable: false,
      render: (row) => <span className="setup-table-clamp">{row.condicao?.trim() || 'Não documentada'}</span>,
    },
    {
      key: 'resultadoEsperado',
      label: 'Resultado esperado',
      minWidth: 240,
      sortable: false,
      render: (row) => <span className="setup-table-clamp">{row.resultadoEsperado?.trim() || 'Não documentado'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 110,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={REGRA_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />,
    },
  ];

  const firstItem = meta ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const lastItem = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const hasFilters = Boolean(search || status);

  if (loadingProducts) {
    return <SectionCard><div className="setup-rules-loading">Carregando produtos do projeto...</div></SectionCard>;
  }

  if (products.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          title="Cadastre um produto antes das regras"
          message="As regras de negócio são vinculadas a um produto. Crie o primeiro produto para continuar esta etapa do Setup."
          actionLabel="Ir para Produtos"
          onAction={() => navigate(`/projetos/${projetoId}/produtos`)}
        />
      </SectionCard>
    );
  }

  return (
    <>
      <div className="setup-rules-context">
        <div className="setup-rules-context__copy">
          <span className="setup-rules-context__eyebrow">Produto em contexto</span>
          <strong>{selectedProduct?.nome ?? 'Selecione um produto'}</strong>
          <span>As regras são armazenadas por produto no modelo atual do sistema.</span>
        </div>
        <div className="setup-rules-context__selector">
          <label htmlFor="setup-rules-product">Produto</label>
          <EntitySelectField value={effectiveProductId} onChange={changeProduct} options={productOptions} />
        </div>
      </div>

      <div className="setup-rules-layout">
        <div className="setup-rules-main">
          <DataTableCard
            columns={columns}
            rows={rules}
            rowKey={(row) => row.id}
            density="default"
            loading={loadingRules}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${effectiveProductId}/regras/${row.id}`)}
            rowActions={(row) => (
              <RowActionButton title={`Editar ${row.nome}`} onClick={() => openEdit(row)}>
                <Icon name="edit" size={15} />
              </RowActionButton>
            )}
            toolbar={
              <div className="setup-table-toolbar">
                <div className="setup-table-toolbar__copy">
                  <h2>Regras cadastradas</h2>
                  <p>Regras de negócio vinculadas ao produto selecionado.</p>
                </div>
                <div className="setup-table-toolbar__actions">
                  <SearchInput
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                    placeholder="Buscar regra..."
                    wrapStyle={{ width: 240 }}
                  />
                  <Button variant={filtersOpen || status ? 'default' : 'ghost'} icon="chevronDown" onClick={() => setFiltersOpen((value) => !value)}>
                    Filtros{status ? ' · 1' : ''}
                  </Button>
                  <Button variant="primary" icon="plus" onClick={openCreate}>
                    Nova regra
                  </Button>
                </div>
                {filtersOpen && (
                  <div className="setup-table-filterbar">
                    <div className="setup-table-filterbar__field">
                      <label>Status</label>
                      <EntitySelectField value={statusDraft} onChange={setStatusDraft} options={normalizeOptions([...STATUS_REGRA_LIST])} />
                    </div>
                    <div className="setup-table-filterbar__buttons">
                      {hasFilters && <Button variant="ghost" onClick={clearFilters}>Limpar</Button>}
                      <Button variant="default" icon="search" onClick={applyFilters}>Aplicar filtros</Button>
                    </div>
                  </div>
                )}
              </div>
            }
            empty={
              <EmptyState
                title={hasFilters ? 'Nenhuma regra encontrada' : 'Nenhuma regra cadastrada'}
                message={hasFilters ? 'Revise os filtros aplicados ou limpe a busca.' : 'Documente a primeira regra de negócio deste produto.'}
                actionLabel={hasFilters ? 'Limpar filtros' : 'Nova regra'}
                onAction={hasFilters ? clearFilters : openCreate}
              />
            }
            footer={meta && meta.total > 0 ? (
              <div className="setup-table-footer">
                <span>Mostrando {firstItem}–{lastItem} de {meta.total}</span>
                {meta.totalPages > 1 && <Pagination page={page} total={meta.totalPages} onChange={setPage} />}
              </div>
            ) : undefined}
          />
        </div>

        <RightRail>
          <SectionCard title="Resumo das regras" subtitle="Indicadores do produto selecionado.">
            <div className="setup-rail-metrics">
              <MetricLine label="Regras cadastradas" value={allRulesData?.meta.total ?? allRules.length} />
              <MetricLine label="Regras ativas" value={activeRules} />
              <MetricLine label="Prioridade alta" value={highPriorityRules} />
              <MetricLine label="Documentação essencial" value={`${documentedRules}/${allRules.length}`} hint="Condição, resultado e relacionamentos principais." />
            </div>
            {supportDataMayBePartial && <div className="setup-data-note">Os indicadores auxiliares consideram até 100 regras do produto.</div>}
          </SectionCard>

          <SectionCard title="Qualidade do cadastro" subtitle="Sinais objetivos para revisar a base.">
            <div className="setup-rule-quality-list">
              <div><span>Sem condição documentada</span><strong>{allRules.filter((rule) => !rule.condicao?.trim()).length}</strong></div>
              <div><span>Sem resultado esperado</span><strong>{allRules.filter((rule) => !rule.resultadoEsperado?.trim()).length}</strong></div>
              <div><span>Sem prioridade</span><strong>{allRules.filter((rule) => !rule.prioridade).length}</strong></div>
              <div><span>Sem relacionamento</span><strong>{allRules.filter((rule) => !(rule.moduloIds?.length || rule.funcionalidadeIds?.length || rule.jornadaIds?.length)).length}</strong></div>
            </div>
          </SectionCard>

          <SectionCard title="Próximas etapas">
            <div className="setup-quick-actions-list">
              <button type="button" onClick={() => navigate(`/projetos/${projetoId}/produtos/${effectiveProductId}?tab=regras`)}>
                <span className="setup-quick-actions-list__icon"><Icon name="box" size={16} /></span>
                <span><strong>Abrir produto</strong><small>Revisar as regras no contexto completo do produto.</small></span>
                <Icon name="arrowR" size={14} />
              </button>
              <button type="button" onClick={() => navigate(`/projetos/${projetoId}/produtos`)}>
                <span className="setup-quick-actions-list__icon"><Icon name="clipboardCheck" size={16} /></span>
                <span><strong>Trocar contexto</strong><small>Voltar à lista de produtos do projeto.</small></span>
                <Icon name="arrowR" size={14} />
              </button>
            </div>
          </SectionCard>
        </RightRail>
      </div>

      <EntityFormModal
        config={REGRA_CONFIG}
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSave={save}
        saving={createMutation.isPending || updateMutation.isPending}
        extraOptions={extraOptions}
      />

      <Toast open={Boolean(toast)} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
