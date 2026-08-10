import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DataTableCard,
  EmptyState,
  Icon,
  Pagination,
  RowActionButton,
  SectionCard,
  type DataTableColumn,
} from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, getErrorMessage } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { MODULO_CONFIG } from '@/entities/modulo/modulo.config';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import type { Modulo } from '@/entities/modulo/modulo.types';
import { regraHooks } from '@/entities/regra/regra.hooks';

export function ModulosTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Modulo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = moduloHooks.useList({ page, pageSize: 10, nome: search || undefined, status: status || undefined }, produtoId);
  const { data: allData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);

  const createMutation = moduloHooks.useCreate(produtoId);
  const updateMutation = moduloHooks.useUpdate(produtoId);
  const toggleMutation = moduloHooks.useToggleStatus(produtoId);

  const all = allData?.data ?? [];
  const funcionalidades = funcionalidadesData?.data ?? [];
  const jornadas = jornadasData?.data ?? [];
  const regras = regrasData?.data ?? [];

  const counts = useMemo(() => {
    const map = new Map<string, { funcionalidades: number; jornadas: number; regras: number }>();
    for (const modulo of all) map.set(modulo.id, { funcionalidades: 0, jornadas: 0, regras: 0 });
    for (const f of funcionalidades) {
      if (!f.moduloId) continue;
      const current = map.get(f.moduloId);
      if (current) current.funcionalidades += 1;
    }
    for (const j of jornadas) {
      for (const moduloId of j.moduloIds) {
        const current = map.get(moduloId);
        if (current) current.jornadas += 1;
      }
    }
    for (const r of regras) {
      for (const moduloId of r.moduloIds) {
        const current = map.get(moduloId);
        if (current) current.regras += 1;
      }
    }
    return map;
  }, [all, funcionalidades, jornadas, regras]);

  const documented = all.filter((m) => m.descricao?.trim() && m.objetivo?.trim()).length;
  const connected = all.filter((m) => {
    const c = counts.get(m.id);
    return Boolean(c && (c.funcionalidades || c.jornadas || c.regras));
  }).length;

  const columns: DataTableColumn<Modulo>[] = [
    {
      key: 'nome',
      label: 'Módulo',
      primary: true,
      minWidth: 260,
      render: (row) => (
        <div>
          <strong className="knowledge-primary">{row.nome}</strong>
          <span className="knowledge-secondary">{row.codigo}</span>
        </div>
      ),
    },
    {
      key: 'funcionalidades',
      label: 'Funcionalidades',
      minWidth: 120,
      sortable: false,
      render: (row) => <Badge preset={counts.get(row.id)?.funcionalidades ? 'info' : 'pendente'}>{counts.get(row.id)?.funcionalidades ?? 0}</Badge>,
    },
    {
      key: 'jornadas',
      label: 'Jornadas',
      minWidth: 100,
      sortable: false,
      render: (row) => <span>{counts.get(row.id)?.jornadas ?? 0}</span>,
    },
    {
      key: 'regras',
      label: 'Regras',
      minWidth: 90,
      sortable: false,
      render: (row) => <span>{counts.get(row.id)?.regras ?? 0}</span>,
    },
    {
      key: 'responsavelPrincipal',
      label: 'Responsável',
      minWidth: 180,
      render: (row) => <span>{row.responsavelPrincipal || 'Não definido'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 110,
      stopRowClick: true,
      render: (row) => <EntityStatusBadge config={MODULO_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} />,
    },
  ];

  function save(dto: Partial<Modulo>) {
    setError(null);
    const options = {
      onSuccess: () => {
        setModalOpen(false);
        setEditing(null);
      },
      onError: (e: unknown) => setError(getErrorMessage(e)),
    };
    if (editing) updateMutation.mutate({ id: editing.id, dto }, options);
    else createMutation.mutate(dto, options);
  }

  if (!projetoId) return null;
  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="knowledge-tab">
      <div className="knowledge-metrics">
        <SectionCard padding="compact" elevation="none"><span>Módulos</span><strong>{all.length}</strong><small>{all.filter((m) => m.status === 'Ativo').length} ativos</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Conectados</span><strong>{connected}</strong><small>com funcionalidades, jornadas ou regras</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Documentação essencial</span><strong>{all.length ? Math.round((documented / all.length) * 100) : 0}%</strong><small>descrição + objetivo</small></SectionCard>
      </div>

      <SectionCard title="Módulos do produto" subtitle="Organize capacidades do produto em blocos de conhecimento navegáveis." icon="box" padding="none">
        <div className="knowledge-toolbar">
          <div className="knowledge-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar módulo..." /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="knowledge-select"><option value="">Todos os status</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setModalOpen(true); }}>Novo módulo</Button>
        </div>
        <DataTableCard
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={isLoading}
          ariaLabel="Módulos do produto"
          onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/modulos/${row.id}`)}
          rowActions={(row) => <RowActionButton title="Editar" onClick={() => { setEditing(row); setModalOpen(true); }}><Icon name="edit" size={15} /></RowActionButton>}
          empty={<EmptyState title="Nenhum módulo encontrado" message="Estruture o produto em módulos para organizar funcionalidades, jornadas e regras." actionLabel="Novo módulo" onAction={() => setModalOpen(true)} />}
          footer={meta ? <div className="knowledge-table-footer"><span>Mostrando {items.length} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div> : undefined}
        />
      </SectionCard>

      {error && <div className="knowledge-error">{error}</div>}
      <EntityFormModal config={MODULO_CONFIG} open={modalOpen} item={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} saving={createMutation.isPending || updateMutation.isPending} />
    </div>
  );
}
