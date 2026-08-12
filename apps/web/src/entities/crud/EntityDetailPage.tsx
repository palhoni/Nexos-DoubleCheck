import { useEffect, useState } from 'react';
import { Button, EmptyState, FormGrid, FormGridItem, Input, SectionCard, Tabs, Toast, tokens, useDark } from '@/design-system';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { EntityFormModal } from './EntityFormModal';
import { findFieldDef, FieldValue } from './EntityFieldDisplay';
import { EntityStatusBadge, formatDateTimeBR, getErrorMessage, type ExtraOptions } from './shared';
import type { EntityHooks } from './createEntityHooks';
import type { EntityConfig, FieldConfig } from './types';

function FieldGrid<T extends { id: string }>({
  config,
  item,
  fieldKeys,
  extraOptions,
}: {
  config: EntityConfig<T>;
  item: T;
  fieldKeys?: string[];
  extraOptions?: ExtraOptions;
}) {
  const keys = fieldKeys ?? config.form.sections.flatMap((s) => s.fields.map((f) => f.key));
  const fields = keys.map((k) => findFieldDef(config, k)).filter((f): f is FieldConfig<T> => !!f);
  return (
    <FormGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={tokens.layout.readGridGap}>
      {fields.map((f) => (
        <FormGridItem key={f.key} span={f.colSpan === 2 ? 2 : 1}>
          <div className="dbc-text-3" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>
            {f.label}
          </div>
          <div className="dbc-text" style={{ fontSize: 13 }}>
            <FieldValue field={f} value={(item as Record<string, unknown>)[f.key]} extraOptions={extraOptions} />
          </div>
        </FormGridItem>
      ))}
    </FormGrid>
  );
}

function SimpleListTab({
  id,
  values,
  subResource,
  itemLabel,
  hooks,
  scopeId,
}: {
  id: string;
  values: string[];
  subResource: string;
  itemLabel: string;
  hooks: EntityHooks<{ id: string }>;
  scopeId?: string;
}) {
  const dark = useDark();
  const [value, setValue] = useState('');
  const addMutation = hooks.useAddListItem(scopeId);
  const removeMutation = hooks.useRemoveListItem(scopeId);

  function add() {
    const v = value.trim();
    if (!v || values.includes(v)) return;
    addMutation.mutate({ id, subResource, valor: v });
    setValue('');
  }
  function remove(v: string) {
    removeMutation.mutate({ id, subResource, valor: v });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, maxWidth: 420 }}>
        <Input placeholder={`Adicionar ${itemLabel.toLowerCase()}`} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="primary" icon="plus" onClick={add}>
          Adicionar
        </Button>
      </div>
      {values.length === 0 ? (
        <EmptyState title={`Nenhum(a) ${itemLabel.toLowerCase()} cadastrado(a)`} icon="box" />
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {values.map((v) => (
            <span
              key={v}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px 6px 14px',
                borderRadius: tokens.radius.pill,
                background: dark ? 'var(--color-bg-subtle)' : '#f8f9fb',
                border: `1px solid ${dark ? 'var(--color-border)' : '#eaecef'}`,
                fontSize: 13,
              }}
            >
              {v}
              <button type="button" onClick={() => remove(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: dark ? 'rgba(255,255,255,.5)' : 'rgba(5,5,5,.4)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ id, hooks, scopeId }: { id: string; hooks: EntityHooks<{ id: string }>; scopeId?: string }) {
  const page = 1;
  const { data, isLoading } = hooks.useHistorico(id, page, 10, scopeId);
  const dark = useDark();
  const entries = data?.data ?? [];

  if (isLoading) return <span className="dbc-text-2">Carregando...</span>;
  if (!entries.length) return <EmptyState title="Sem histórico registrado" icon="box" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < entries.length - 1 ? 16 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3b82c4', flexShrink: 0 }} />
            {i < entries.length - 1 && <span style={{ width: 1, flex: 1, background: dark ? 'var(--color-border)' : '#e5e7eb', marginTop: 4 }} />}
          </div>
          <div style={{ paddingBottom: 4 }}>
            <div className="dbc-text" style={{ fontSize: 13, fontWeight: 500 }}>
              {h.label}
            </div>
            <div className="dbc-text-3" style={{ fontSize: 12, marginTop: 2 }}>
              {formatDateTimeBR(h.ts)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntityDetailPage<T extends { id: string }>({
  config,
  hooks,
  id,
  scopeId,
  breadcrumbBase,
  onBack,
  bespokeComponents,
  extraOptions,
  rightRail,
  headerActions,
  defaultTab,
}: {
  config: EntityConfig<T>;
  hooks: EntityHooks<T>;
  id: string;
  scopeId?: string;
  breadcrumbBase?: React.ReactNode[];
  onBack: () => void;
  bespokeComponents?: Record<string, (props: { scopeId: string }) => React.ReactNode>;
  extraOptions?: ExtraOptions;
  /** Coluna direita opcional — omitida por padrão, sem mudar layout. */
  rightRail?: React.ReactNode;
  /** Substitui o botão "Editar" padrão do header. Passe `null` pra remover sem substituir. */
  headerActions?: React.ReactNode;
  defaultTab?: string;
}) {
  const { data: loadedItem, isLoading } = hooks.useDetail(id, scopeId);
  const updateMutation = hooks.useUpdate(scopeId);
  const toggleMutation = hooks.useToggleStatus(scopeId);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const shell = config.detail?.shell;
  // produto.config.ts declara seu próprio primeiro tab como "Visão Geral" (kind genericFields) —
  // nesse caso o tab sintético abaixo duplicaria o rótulo. Detectado por label+kind, não só kind,
  // pra não esconder o overview completo (todos os campos) de entidades cujo primeiro tab próprio
  // é deliberadamente um subconjunto menor (ex.: "Configurações" do Projeto).
  const skipSyntheticOverview = shell?.tabs[0]?.label === 'Visão Geral' && shell.tabs[0]?.kind === 'genericFields';
  const initialTab = defaultTab ?? (skipSyntheticOverview ? shell!.tabs[0].key : 'overview');
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="main-pad">
        <span className="dbc-text-2">Carregando...</span>
      </div>
    );
  }

  if (!loadedItem) {
    return (
      <div className="main-pad">
        <EmptyState title="Registro não encontrado" message="Ele pode ter sido removido ou inativado." actionLabel="Voltar" onAction={onBack} />
      </div>
    );
  }

  const item: T = loadedItem;
  const tabs = shell ? (skipSyntheticOverview ? shell.tabs : [{ key: 'overview', label: 'Visão Geral' } as const, ...shell.tabs]) : null;
  const headerTitle = config.detail?.header.title(item) ?? String(item[config.list.columns[0].key]);
  const headerBadges = config.detail?.header.badges ?? [];

  function handleSaveEdit(dto: Partial<T>) {
    updateMutation.mutate(
      { id, dto },
      {
        onSuccess: () => {
          setEditOpen(false);
          setToast({ type: 'success', title: 'Salvo', message: 'As alterações foram registradas.' });
        },
        onError: (error) => setToast({ type: 'error', title: 'Não foi possível salvar', message: getErrorMessage(error) }),
      },
    );
  }

  function renderTabContent(tabKey: string) {
    if (tabKey === 'overview' && !skipSyntheticOverview) return <FieldGrid config={config} item={item} extraOptions={extraOptions} />;
    const tab = shell?.tabs.find((t) => t.key === tabKey);
    if (!tab) return null;
    if (tab.kind === 'genericFields') return <FieldGrid config={config} item={item} fieldKeys={tab.fields} extraOptions={extraOptions} />;
    if (tab.kind === 'simpleList') {
      const values = (item as Record<string, unknown>)[tab.field];
      return (
        <SimpleListTab
          id={id}
          values={Array.isArray(values) ? (values as string[]) : []}
          subResource={tab.subResource ?? tab.field}
          itemLabel={tab.label}
          hooks={hooks as unknown as EntityHooks<{ id: string }>}
          scopeId={scopeId}
        />
      );
    }
    if (tab.kind === 'history') return <HistoryTab id={id} hooks={hooks as unknown as EntityHooks<{ id: string }>} scopeId={scopeId} />;
    if (tab.kind === 'bespoke') {
      const Bespoke = bespokeComponents?.[tab.component];
      if (Bespoke) return <Bespoke scopeId={id} />;
    }
    return (
      <div style={{ padding: '30px 0', textAlign: 'center' }}>
        <span className="dbc-text-2" style={{ fontSize: 13 }}>
          Esta seção está em desenvolvimento.
        </span>
      </div>
    );
  }

  return (
    <SetupPage
      rail={rightRail}
      header={
        <SetupPageHeader
          breadcrumb={[...(breadcrumbBase ?? [config.label.plural]), headerTitle]}
          title={headerTitle}
          badges={
            headerBadges.length > 0
              ? headerBadges.map((b, i) => <EntityStatusBadge key={i} config={config} value={String(item[b.field])} onToggle={() => toggleMutation.mutate(id)} />)
              : undefined
          }
          actions={
            headerActions !== undefined ? (
              headerActions
            ) : (
              <Button variant="default" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )
          }
          back={{ label: `Voltar para ${config.label.plural}`, onClick: onBack }}
        />
      }
    >
      {shell ? (
        <SectionCard padding="none">
          <div style={{ padding: '0 24px' }}>
            <Tabs items={tabs!.map((t) => ({ key: t.key, label: t.label }))} value={activeTab} onChange={setActiveTab} />
          </div>
          <div style={{ padding: tokens.layout.cardPad }}>{renderTabContent(activeTab)}</div>
        </SectionCard>
      ) : (
        <SectionCard>{renderTabContent('overview')}</SectionCard>
      )}

      <EntityFormModal config={config} open={editOpen} item={item} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} saving={updateMutation.isPending} extraOptions={extraOptions} />
      <Toast open={!!toast} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </SetupPage>
  );
}
