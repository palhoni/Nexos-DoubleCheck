import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, DataTableCard, EmptyState, Icon, Pagination, RowActionButton, SectionCard, type DataTableColumn } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, getErrorMessage } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { REGRA_CONFIG } from '@/entities/regra/regra.config';
import { regraHooks } from '@/entities/regra/regra.hooks';
import type { Regra } from '@/entities/regra/regra.types';

function completeness(rule: Regra) {
  const checks = [
    Boolean(rule.condicao?.trim()),
    Boolean(rule.resultadoEsperado?.trim()),
    Boolean(rule.prioridade),
    Boolean(rule.moduloIds.length || rule.funcionalidadeIds.length || rule.jornadaIds.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function priorityPreset(priority: Regra['prioridade']) {
  if (priority === 'Alta') return 'erro' as const;
  if (priority === 'Média') return 'pendente' as const;
  return 'info' as const;
}

export function RegrasTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Regra | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = regraHooks.useList({ page, pageSize: 10, nome: search || undefined, status: status || undefined }, produtoId);
  const { data: allData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);

  const createMutation = regraHooks.useCreate(produtoId);
  const updateMutation = regraHooks.useUpdate(produtoId);
  const toggleMutation = regraHooks.useToggleStatus(produtoId);

  const all = allData?.data ?? [];
  const modulos = modulosData?.data ?? [];
  const funcionalidades = funcionalidadesData?.data ?? [];
  const jornadas = jornadasData?.data ?? [];
  const moduloMap = useMemo(() => new Map(modulos.map((m) => [m.id, m.nome])), [modulos]);

  const linked = all.filter((r) => r.moduloIds.length || r.funcionalidadeIds.length || r.jornadaIds.length).length;
  const high = all.filter((r) => r.prioridade === 'Alta' && r.status === 'Ativo').length;
  const wellDocumented = all.filter((r) => completeness(r) === 100).length;

  const extraOptions = {
    modulos: modulos.map((m) => ({ value: m.id, label: m.nome })),
    funcionalidades: funcionalidades.map((f) => ({ value: f.id, label: f.nome })),
    jornadas: jornadas.map((j) => ({ value: j.id, label: j.nome })),
  };

  const columns: DataTableColumn<Regra>[] = [
    {
      key: 'nome', label: 'Regra', primary: true, minWidth: 280,
      render: (row) => <div><strong className="knowledge-primary">{row.nome}</strong><span className="knowledge-secondary">v{row.numeroVersao}{row.versaoAtual ? ' · versão atual' : ''}</span></div>,
    },
    { key: 'prioridade', label: 'Prioridade', minWidth: 110, render: (row) => row.prioridade ? <Badge preset={priorityPreset(row.prioridade)}>{row.prioridade}</Badge> : <span className="knowledge-empty">Não definida</span> },
    { key: 'modulos', label: 'Módulos', minWidth: 150, sortable: false, render: (row) => row.moduloIds.length ? <span>{row.moduloIds.slice(0, 2).map((id) => moduloMap.get(id) ?? 'Módulo').join(', ')}{row.moduloIds.length > 2 ? ` +${row.moduloIds.length - 2}` : ''}</span> : <span className="knowledge-empty">Nenhum</span> },
    { key: 'relacoes', label: 'Relações', minWidth: 100, sortable: false, render: (row) => <Badge preset={row.moduloIds.length || row.funcionalidadeIds.length || row.jornadaIds.length ? 'info' : 'pendente'}>{row.moduloIds.length + row.funcionalidadeIds.length + row.jornadaIds.length}</Badge> },
    { key: 'qualidade', label: 'Completude', minWidth: 110, sortable: false, render: (row) => <span className="knowledge-score"><strong>{completeness(row)}%</strong></span> },
    { key: 'status', label: 'Status', minWidth: 110, stopRowClick: true, render: (row) => <EntityStatusBadge config={REGRA_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} /> },
  ];

  function save(dto: Partial<Regra>) {
    setError(null);
    const options = { onSuccess: () => { setModalOpen(false); setEditing(null); }, onError: (e: unknown) => setError(getErrorMessage(e)) };
    if (editing) updateMutation.mutate({ id: editing.id, dto }, options);
    else createMutation.mutate(dto, options);
  }

  if (!projetoId) return null;
  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="knowledge-tab">
      <div className="knowledge-metrics knowledge-metrics--four">
        <SectionCard padding="compact" elevation="none"><span>Regras</span><strong>{all.length}</strong><small>{all.filter((r) => r.status === 'Ativo').length} ativas</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Alta prioridade</span><strong>{high}</strong><small>ativas e críticas para leitura humana</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Conectadas</span><strong>{linked}</strong><small>com módulos, funcionalidades ou jornadas</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Completas</span><strong>{wellDocumented}</strong><small>condição + resultado + prioridade + relação</small></SectionCard>
      </div>

      <SectionCard title="Regras de negócio" subtitle="Decisões estruturadas que explicam como o produto deve se comportar e onde cada regra se aplica." icon="clipboardCheck" padding="none">
        <div className="knowledge-toolbar">
          <div className="knowledge-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar regra..." /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="knowledge-select"><option value="">Todos os status</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setModalOpen(true); }}>Nova regra</Button>
        </div>
        <DataTableCard
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={isLoading}
          ariaLabel="Regras de negócio do produto"
          onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${row.id}`)}
          rowActions={(row) => <RowActionButton title="Editar" onClick={() => { setEditing(row); setModalOpen(true); }}><Icon name="edit" size={15} /></RowActionButton>}
          empty={<EmptyState title="Nenhuma regra encontrada" message="Documente a primeira decisão de negócio deste produto." actionLabel="Nova regra" onAction={() => setModalOpen(true)} />}
          footer={meta ? <div className="knowledge-table-footer"><span>Mostrando {items.length} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div> : undefined}
        />
      </SectionCard>

      {error && <div className="knowledge-error">{error}</div>}
      <EntityFormModal config={REGRA_CONFIG} open={modalOpen} item={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} saving={createMutation.isPending || updateMutation.isPending} extraOptions={extraOptions} />
    </div>
  );
}
