import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, DataTableCard, EmptyState, Icon, Pagination, RowActionButton, SectionCard, type DataTableColumn } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, getErrorMessage } from '@/entities/crud/shared';
import { FUNCIONALIDADE_CONFIG } from '@/entities/funcionalidade/funcionalidade.config';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import type { Funcionalidade } from '@/entities/funcionalidade/funcionalidade.types';
import { integracaoHooks } from '@/entities/integracao/integracao.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { regraHooks } from '@/entities/regra/regra.hooks';

export function FuncionalidadesTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Funcionalidade | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = { page, pageSize: 10, nome: search || undefined, status: status || undefined };
  const { data, isLoading } = funcionalidadeHooks.useList(query, produtoId);
  const { data: allData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: integracoesData } = integracaoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const createMutation = funcionalidadeHooks.useCreate(produtoId);
  const updateMutation = funcionalidadeHooks.useUpdate(produtoId);
  const toggleMutation = funcionalidadeHooks.useToggleStatus(produtoId);

  const modulos = modulosData?.data ?? [];
  const moduloOptions = modulos.map((m) => ({ value: m.id, label: m.nome }));
  const moduloMap = useMemo(() => new Map(modulos.map((m) => [m.id, m.nome])), [modulos]);
  const all = allData?.data ?? [];
  const jornadas = jornadasData?.data ?? [];
  const regras = regrasData?.data ?? [];
  const integracoes = integracoesData?.data ?? [];

  const relationCount = (id: string) =>
    jornadas.filter((j) => j.funcionalidadeIds.includes(id)).length +
    regras.filter((r) => r.funcionalidadeIds.includes(id)).length +
    integracoes.filter((i) => i.funcionalidadeIds.includes(id)).length;

  const documented = all.filter((f) => f.objetivo && f.comportamentoEsperado).length;
  const linked = all.filter((f) => relationCount(f.id) > 0).length;

  const columns: DataTableColumn<Funcionalidade>[] = [
    {
      key: 'nome', label: 'Funcionalidade', primary: true, minWidth: 250,
      render: (row) => <div><strong className="knowledge-primary">{row.nome}</strong><span className="knowledge-secondary">{row.codigo}</span></div>,
    },
    { key: 'modulo', label: 'Módulo', minWidth: 160, render: (row) => <span>{row.moduloId ? moduloMap.get(row.moduloId) ?? 'Módulo não localizado' : 'Sem módulo'}</span> },
    { key: 'relacoes', label: 'Relações', minWidth: 110, sortable: false, render: (row) => <Badge preset={relationCount(row.id) ? 'info' : 'pendente'}>{relationCount(row.id)}</Badge> },
    { key: 'status', label: 'Status', minWidth: 115, stopRowClick: true, render: (row) => <EntityStatusBadge config={FUNCIONALIDADE_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} /> },
  ];

  function save(dto: Partial<Funcionalidade>) {
    setError(null);
    const options = {
      onSuccess: () => { setModalOpen(false); setEditing(null); },
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
        <SectionCard padding="compact" elevation="none"><span>Funcionalidades</span><strong>{all.length}</strong><small>{all.filter((f) => f.status === 'Ativo').length} ativas</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Documentação essencial</span><strong>{all.length ? Math.round((documented / all.length) * 100) : 0}%</strong><small>objetivo + comportamento</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Conectadas</span><strong>{linked}</strong><small>com regra, jornada ou integração</small></SectionCard>
      </div>

      <SectionCard title="Funcionalidades do produto" subtitle="Capacidades funcionais e suas conexões com o conhecimento do produto." icon="box" padding="none">
        <div className="knowledge-toolbar">
          <div className="knowledge-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar funcionalidade..." /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="knowledge-select"><option value="">Todos os status</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setModalOpen(true); }}>Nova funcionalidade</Button>
        </div>
        <DataTableCard
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={isLoading}
          ariaLabel="Funcionalidades do produto"
          onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/funcionalidades/${row.id}`)}
          rowActions={(row) => <RowActionButton title="Editar" onClick={() => { setEditing(row); setModalOpen(true); }}><Icon name="edit" size={15} /></RowActionButton>}
          empty={<EmptyState title="Nenhuma funcionalidade encontrada" message="Documente a primeira capacidade funcional deste produto." actionLabel="Nova funcionalidade" onAction={() => setModalOpen(true)} />}
          footer={meta ? <div className="knowledge-table-footer"><span>Mostrando {items.length} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div> : undefined}
        />
      </SectionCard>

      {error && <div className="knowledge-error">{error}</div>}
      <EntityFormModal config={FUNCIONALIDADE_CONFIG} open={modalOpen} item={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} saving={createMutation.isPending || updateMutation.isPending} extraOptions={{ modulos: moduloOptions }} />
    </div>
  );
}
