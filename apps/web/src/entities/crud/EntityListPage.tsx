import { useState } from 'react';
import {
  AddButton,
  Button,
  DataTableCard,
  EmptyState,
  FormGrid,
  Icon,
  Input,
  PageGrid,
  Pagination,
  RowActionButton,
  SectionCard,
  Toast,
  useContainerWidth,
  type DataTableColumn,
  type FormGridCols,
} from '@/design-system';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { EntitySelectField } from './EntityFormFields';
import { EntityFormModal } from './EntityFormModal';
import { EntityStatusBadge, getErrorMessage, normalizeOptions, renderEntityCell, type ExtraOptions } from './shared';
import type { EntityHooks } from './createEntityHooks';
import type { ColumnConfig, EntityConfig } from './types';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--color-text-tertiary)', transform: open ? 'none' : 'rotate(180deg)' }}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function EntityListPage<T extends { id: string }>({
  config,
  hooks,
  scopeId,
  breadcrumb,
  title,
  onOpenDetail,
  embedded = false,
  extraOptions,
  fixedQuery,
  rightRail,
  pageSize = 10,
}: {
  config: EntityConfig<T>;
  hooks: EntityHooks<T>;
  scopeId?: string;
  breadcrumb?: React.ReactNode[];
  title?: string;
  onOpenDetail: (id: string) => void;
  /** true quando renderizado dentro de outra tela (ex.: aba do Detalhe do Projeto) —
   *  omite o padding de página cheia e o cabeçalho de breadcrumb/título. */
  embedded?: boolean;
  /** Opções dinâmicas para campos/colunas com `optionsFrom` (ex.: nomes de Time por id). */
  extraOptions?: ExtraOptions;
  /** Filtro fixo (não editável pela UI), ex.: { timeId: "..." } ao listar Pessoas de um Time
   *  específico — some também como valor padrão ao criar um novo registro nesta lista. */
  fixedQuery?: Record<string, string>;
  /** Coluna direita opcional — omitida por padrão, sem mudar o layout de quem não usa. */
  rightRail?: React.ReactNode;
  pageSize?: number;
}) {
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const [containerRef, cw] = useContainerWidth<HTMLDivElement>();
  const isNarrow = cw > 0 && cw < 560;
  const isCompact = cw > 0 && cw < 860;
  const isWide = cw >= 1100;

  const query = { page, pageSize, sortBy, sortDir, ...fixedQuery, ...appliedFilters };
  const { data, isLoading } = hooks.useList(query, scopeId);
  const createMutation = hooks.useCreate(scopeId);
  const updateMutation = hooks.useUpdate(scopeId);
  const toggleMutation = hooks.useToggleStatus(scopeId);

  const filters = config.list.filters;
  const items = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const filterCols = Math.min(filters.length, 3) as FormGridCols;

  function handleSort(key: string) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  function handleBuscar() {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }
  function handleLimpar() {
    setDraftFilters({});
    setAppliedFilters({});
    setPage(1);
  }

  function openCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }
  function openEdit(row: T) {
    setEditingItem(row);
    setModalOpen(true);
  }

  function handleSaveModal(dataToSave: Partial<T>) {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, dto: dataToSave },
        {
          onSuccess: () => {
            setToast({ type: 'success', title: `${config.label.singular} atualizado`, message: 'As alterações foram salvas.' });
            setModalOpen(false);
          },
          onError: (error) => setToast({ type: 'error', title: 'Não foi possível salvar', message: getErrorMessage(error) }),
        },
      );
    } else {
      createMutation.mutate({ ...fixedQuery, ...dataToSave } as Partial<T>, {
        onSuccess: () => {
          setToast({ type: 'success', title: `${config.label.singular} criado`, message: 'Cadastro realizado com sucesso.' });
          setModalOpen(false);
        },
        onError: (error) => setToast({ type: 'error', title: 'Não foi possível criar', message: getErrorMessage(error) }),
      });
    }
  }

  const visibleColumns = config.list.columns.filter((c) => {
    if (c.hideBelow === 'compact' && isCompact) return false;
    if (c.hideBelow === 'wide' && !isWide) return false;
    return true;
  });

  const hasApplied = Object.values(appliedFilters).some(Boolean);

  const dataColumns: DataTableColumn<T>[] = visibleColumns.map((col: ColumnConfig<T>) => ({
    key: col.key,
    label: col.label,
    minWidth: col.minWidth,
    sortable: col.sortable,
    primary: col.primary,
    stopRowClick: col.render === 'statusBadge',
    render: (row: T) =>
      col.render === 'statusBadge' ? (
        <EntityStatusBadge config={config} value={String(row[col.key])} onToggle={() => toggleMutation.mutate(row.id)} />
      ) : (
        renderEntityCell(row, col, extraOptions)
      ),
  }));

  const content = (
    <>
      {filters.length > 0 && (
        <SectionCard
          title="Filtros"
          action={<ChevronIcon open={filtersOpen} />}
          onHeaderClick={() => setFiltersOpen((v) => !v)}
          divider={filtersOpen}
          padding="none"
        >
          {filtersOpen && (
            <div style={{ padding: '20px 24px 24px' }}>
              <FormGrid columns={{ base: 1, sm: filterCols }} gap={14} style={{ marginBottom: 20 }}>
                {filters.map((f) => (
                  <div key={f.key}>
                    <label className="dbc-text-2" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      {f.label}
                    </label>
                    {f.type === 'select' ? (
                      <EntitySelectField value={draftFilters[f.key]} onChange={(v) => setDraftFilters((d) => ({ ...d, [f.key]: v }))} options={normalizeOptions(f.options)} />
                    ) : (
                      <Input
                        placeholder={f.placeholder ?? `Informe ${f.label.toLowerCase()}`}
                        value={draftFilters[f.key] ?? ''}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, [f.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                      />
                    )}
                  </div>
                ))}
              </FormGrid>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="danger" onClick={handleLimpar}>
                  Limpar filtros
                </Button>
                <Button variant="default" icon="search" onClick={handleBuscar}>
                  Buscar
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      <div>
        <AddButton onClick={openCreate}>{isNarrow ? 'Novo' : `Novo ${config.label.singular.toLowerCase()}`}</AddButton>
      </div>

      <DataTableCard
        columns={dataColumns}
        rows={items}
        rowKey={(row) => row.id}
        loading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(row) => onOpenDetail(row.id)}
        rowActions={(row) => (
          <>
            <RowActionButton title="Ver detalhe" onClick={() => onOpenDetail(row.id)}>
              <Icon name="eye" size={15} />
            </RowActionButton>
            <RowActionButton title="Editar" onClick={() => openEdit(row)}>
              <Icon name="edit" size={15} />
            </RowActionButton>
          </>
        )}
        narrowRender={(row) => (
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="dbc-text" style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(row[config.list.columns[0].key])}
                </div>
                <div style={{ marginTop: 6 }}>
                  {config.statusField && <EntityStatusBadge config={config} value={String(row[config.statusField])} onToggle={() => toggleMutation.mutate(row.id)} />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <RowActionButton title="Ver detalhe" onClick={() => onOpenDetail(row.id)}>
                  <Icon name="eye" size={15} />
                </RowActionButton>
                <RowActionButton title="Editar" onClick={() => openEdit(row)}>
                  <Icon name="edit" size={15} />
                </RowActionButton>
              </div>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            title={`Nenhum ${config.label.singular.toLowerCase()} encontrado`}
            message={hasApplied ? 'Ajuste os filtros ou limpe a busca para ver todos os registros.' : `Cadastre o primeiro ${config.label.singular.toLowerCase()} para começar.`}
            actionLabel={hasApplied ? 'Limpar filtros' : `Novo ${config.label.singular.toLowerCase()}`}
            onAction={hasApplied ? handleLimpar : openCreate}
          />
        }
        footer={totalPages > 1 ? <Pagination page={page} total={totalPages} onChange={setPage} /> : undefined}
      />
    </>
  );

  return (
    <div className={embedded ? undefined : 'main-pad'} ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!embedded && <SetupPageHeader breadcrumb={breadcrumb ?? [config.label.plural]} title={title ?? config.label.plural} />}

      <PageGrid rail={rightRail}>{content}</PageGrid>

      <EntityFormModal config={config} open={modalOpen} item={editingItem} onClose={() => setModalOpen(false)} onSave={handleSaveModal} saving={createMutation.isPending || updateMutation.isPending} extraOptions={extraOptions} />
      <Toast open={!!toast} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </div>
  );
}
