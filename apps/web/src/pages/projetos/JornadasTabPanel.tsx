import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, DataTableCard, EmptyState, Icon, Pagination, RowActionButton, SectionCard, type DataTableColumn } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, getErrorMessage } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { JORNADA_CONFIG } from '@/entities/jornada/jornada.config';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import type { Jornada } from '@/entities/jornada/jornada.types';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { publicoAlvoHooks } from '@/entities/publico-alvo/publico-alvo.hooks';
import { regraHooks } from '@/entities/regra/regra.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';

export function JornadasTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Jornada | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = jornadaHooks.useList({ page, pageSize: 10, nome: search || undefined, status: status || undefined }, produtoId);
  const { data: allData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: publicosData } = publicoAlvoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: produtosGlobais } = useAllProdutos();
  const createMutation = jornadaHooks.useCreate(produtoId);
  const updateMutation = jornadaHooks.useUpdate(produtoId);
  const toggleMutation = jornadaHooks.useToggleStatus(produtoId);

  const publicos = publicosData?.data ?? [];
  const publicoMap = useMemo(() => new Map(publicos.map((p) => [p.id, p.nome])), [publicos]);
  const produtosMap = useMemo(() => new Map((produtosGlobais ?? []).map((p) => [p.id, p])), [produtosGlobais]);
  const all = allData?.data ?? [];
  const regras = regrasData?.data ?? [];
  const crossProject = all.filter((j) => j.produtoParticipanteIds.some((id) => produtosMap.get(id)?.projetoId !== projetoId)).length;
  const documented = all.filter((j) => j.objetivo && j.eventoInicial && j.resultadoEsperado && j.etapas.length > 0).length;

  const extraOptions = {
    publicosAlvo: publicos.map((p) => ({ value: p.id, label: p.nome })),
    modulos: (modulosData?.data ?? []).map((m) => ({ value: m.id, label: m.nome })),
    funcionalidades: (funcionalidadesData?.data ?? []).map((f) => ({ value: f.id, label: f.nome })),
    produtosParticipantes: (produtosGlobais ?? []).map((p) => ({ value: p.id, label: `${p.nome} (${p.projeto.nome})` })),
  };

  const columns: DataTableColumn<Jornada>[] = [
    { key: 'nome', label: 'Jornada', primary: true, minWidth: 240, render: (row) => <div><strong className="knowledge-primary">{row.nome}</strong><span className="knowledge-secondary">{row.publicoAlvoId ? publicoMap.get(row.publicoAlvoId) ?? 'Público não localizado' : 'Sem público definido'}</span></div> },
    { key: 'etapas', label: 'Etapas', minWidth: 90, sortable: false, render: (row) => <strong>{row.etapas.length}</strong> },
    { key: 'funcionalidades', label: 'Funcionalidades', minWidth: 120, sortable: false, render: (row) => <Badge preset={row.funcionalidadeIds.length ? 'info' : 'pendente'}>{row.funcionalidadeIds.length}</Badge> },
    { key: 'produtos', label: 'Produtos', minWidth: 110, sortable: false, render: (row) => <Badge preset={row.produtoParticipanteIds.some((id) => produtosMap.get(id)?.projetoId !== projetoId) ? 'analise' : 'info'}>{row.produtoParticipanteIds.length}</Badge> },
    { key: 'regras', label: 'Regras', minWidth: 90, sortable: false, render: (row) => <span>{regras.filter((r) => r.jornadaIds.includes(row.id)).length}</span> },
    { key: 'status', label: 'Status', minWidth: 110, stopRowClick: true, render: (row) => <EntityStatusBadge config={JORNADA_CONFIG} value={row.status} onToggle={() => toggleMutation.mutate(row.id)} /> },
  ];

  function save(dto: Partial<Jornada>) {
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
      <div className="knowledge-metrics">
        <SectionCard padding="compact" elevation="none"><span>Jornadas</span><strong>{all.length}</strong><small>{all.filter((j) => j.status === 'Ativo').length} ativas</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Cross-project</span><strong>{crossProject}</strong><small>com produtos de outros projetos</small></SectionCard>
        <SectionCard padding="compact" elevation="none"><span>Documentação essencial</span><strong>{all.length ? Math.round((documented / all.length) * 100) : 0}%</strong><small>objetivo + gatilho + resultado + etapas</small></SectionCard>
      </div>

      <SectionCard title="Jornadas do produto" subtitle="Fluxos de negócio conectando públicos, funcionalidades, produtos e regras." icon="network" padding="none">
        <div className="knowledge-toolbar">
          <div className="knowledge-search"><Icon name="search" size={15} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar jornada..." /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="knowledge-select"><option value="">Todos os status</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>
          <Button variant="primary" icon="plus" onClick={() => { setEditing(null); setModalOpen(true); }}>Nova jornada</Button>
        </div>
        <DataTableCard columns={columns} rows={items} rowKey={(r) => r.id} loading={isLoading} ariaLabel="Jornadas do produto" onRowClick={(row) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/jornadas/${row.id}`)} rowActions={(row) => <RowActionButton title="Editar" onClick={() => { setEditing(row); setModalOpen(true); }}><Icon name="edit" size={15} /></RowActionButton>} empty={<EmptyState title="Nenhuma jornada encontrada" message="Documente o primeiro fluxo ponta a ponta deste produto." actionLabel="Nova jornada" onAction={() => setModalOpen(true)} />} footer={meta ? <div className="knowledge-table-footer"><span>Mostrando {items.length} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div> : undefined} />
      </SectionCard>
      {error && <div className="knowledge-error">{error}</div>}
      <EntityFormModal config={JORNADA_CONFIG} open={modalOpen} item={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} saving={createMutation.isPending || updateMutation.isPending} extraOptions={extraOptions} />
    </div>
  );
}
