import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTableCard,
  EmptyState,
  Icon,
  Input,
  Modal,
  Pagination,
  RightRail,
  RowActionButton,
  SearchInput,
  SectionCard,
  Textarea,
} from '@/design-system';
import { formatDateOnlyBR, getErrorMessage } from '@/entities/crud/shared';
import { useFonte, useFonteHistorico, useFonteMutations, useFonteResumo, useFontes } from '@/entities/fonte/fonte.api';
import type { FonteConhecimento, FontePayload, FonteStatus, FonteUpdatePayload } from '@/entities/fonte/fonte.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const PAGE_SIZE = 10;

function statusPreset(status: FonteStatus) {
  if (status === 'Ativa') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  return 'inativo' as const;
}

function sourceLabel(status: FonteStatus) {
  return status === 'Revisao' ? 'Em revisão' : status;
}

function toUpdatePayload(payload: FontePayload): FonteUpdatePayload {
  const { projetoId, ...updatePayload } = payload;
  void projetoId;
  return updatePayload;
}

function SourceFormModal({
  open,
  projetoId,
  item,
  onClose,
}: {
  open: boolean;
  projetoId: string;
  item: FonteConhecimento | null;
  onClose: () => void;
}) {
  const { create, update } = useFonteMutations();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState(item?.nome ?? '');
  const [tipo, setTipo] = useState(item?.tipo ?? '');
  const [referencia, setReferencia] = useState(item?.referencia ?? '');
  const [status, setStatus] = useState<FonteStatus>(item?.status ?? 'Ativa');
  const [oficial, setOficial] = useState(item?.oficial ?? false);
  const [responsavel, setResponsavel] = useState(item?.responsavel ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [ultimaVerificacao, setUltimaVerificacao] = useState(item?.ultimaVerificacao?.slice(0, 10) ?? '');
  const [observacoes, setObservacoes] = useState(item?.observacoes ?? '');

  const saving = create.isPending || update.isPending;
  const governanceValid = !oficial || Boolean(responsavel.trim());
  const valid = Boolean(nome.trim() && tipo.trim() && referencia.trim() && governanceValid);

  function submit() {
    if (!valid || saving) return;
    setError(null);
    const payload: FontePayload = {
      projetoId,
      nome: nome.trim(),
      tipo: tipo.trim(),
      referencia: referencia.trim(),
      status,
      oficial,
      responsavel: responsavel.trim() || undefined,
      descricao: descricao.trim() || undefined,
      ultimaVerificacao: ultimaVerificacao || undefined,
      observacoes: observacoes.trim() || undefined,
    };
    const callbacks = {
      onSuccess: onClose,
      onError: (reason: unknown) => setError(getErrorMessage(reason)),
    };
    if (item) {
      update.mutate({ id: item.id, payload: toUpdatePayload(payload) }, callbacks);
    } else {
      create.mutate(payload, callbacks);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={item ? 'Editar fonte de conhecimento' : 'Nova fonte de conhecimento'}
      subtitle="Registre a origem do conhecimento sem transformar uma referência não verificada em verdade oficial."
      primaryLabel={item ? 'Salvar alterações' : 'Cadastrar fonte'}
      primaryLoading={saving}
      primaryDisabled={!valid}
      onPrimary={submit}
      width={760}
    >
      <div className="source-form">
        {error && <Alert type="error" title="Não foi possível salvar">{error}</Alert>}
        <div className="source-form__grid">
          <label className="source-form__field source-form__field--wide"><span>Nome *</span><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Contrato OpenAPI Customer API" /></label>
          <label className="source-form__field"><span>Tipo *</span><Input list="nexus-source-types" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: OpenAPI" /><datalist id="nexus-source-types"><option value="Confluence" /><option value="Jira" /><option value="OpenAPI" /><option value="Repositório" /><option value="Documento" /><option value="Figma" /><option value="URL" /><option value="Banco de Dados" /></datalist></label>
          <label className="source-form__field"><span>Status</span><select className="knowledge-source-select" value={status} onChange={(e) => setStatus(e.target.value as FonteStatus)}><option value="Ativa">Ativa</option><option value="Revisao">Em revisão</option><option value="Inativa">Inativa</option></select></label>
          <label className="source-form__field source-form__field--full"><span>Referência *</span><Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="URL, caminho do repositório, chave do documento ou identificador verificável" /></label>
          <label className="source-form__field"><span>Responsável pela fonte</span><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Time, pessoa ou área proprietária" /></label>
          <label className="source-form__field"><span>Última verificação</span><Input type="date" value={ultimaVerificacao} onChange={(e) => setUltimaVerificacao(e.target.value)} /></label>
          <label className="source-form__field source-form__field--full"><span>Descrição</span><Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que esta fonte comprova ou documenta?" /></label>
          <label className="source-form__field source-form__field--full"><span>Observações</span><Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Limitações, escopo, dependências ou cuidados ao interpretar esta fonte." /></label>
        </div>
        <label className="source-form__official"><input type="checkbox" checked={oficial} onChange={(e) => setOficial(e.target.checked)} /><span><strong>Fonte oficial / fonte da verdade</strong><small>Marque somente quando houver responsabilidade e governança claras sobre esta referência. Uma fonte oficial exige responsável informado.</small>{oficial && !governanceValid && <small className="source-form__validation">Informe o responsável pela fonte para concluir.</small>}</span></label>
      </div>
    </Modal>
  );
}

function SourceHistory({ source }: { source: FonteConhecimento }) {
  const history = useFonteHistorico(source.id, 1, 6);
  const entries = history.data?.data ?? [];
  return (
    <div className="source-history">
      {history.isLoading ? <span>Carregando histórico...</span> : entries.length ? entries.map((entry, index) => (
        <div key={`${entry.ts}-${index}`} className="source-history__item"><span className="source-history__dot" /><div><strong>{entry.label}</strong><small>{entry.actorNome ? `${entry.actorNome} · ` : ''}{new Date(entry.ts).toLocaleString('pt-BR')}</small></div></div>
      )) : <span>Nenhuma alteração registrada ainda.</span>}
    </div>
  );
}

export function ProjetoFontesPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedSourceId = searchParams.get('fonte');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | FonteStatus>('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FonteConhecimento | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: projeto, isLoading: projectLoading } = projetoHooks.useDetail(id);
  const sources = useFontes({ page, pageSize: PAGE_SIZE, projetoId: id, busca: search || undefined, status: status || undefined, sortBy, sortDir });
  const summary = useFonteResumo(id);
  const consumedSources = useFontes({ page: 1, pageSize: 100, consumidorProjetoId: id, sortBy: 'updatedAt', sortDir: 'desc' });
  const { toggle } = useFonteMutations();

  const rows = sources.data?.data ?? [];
  const externalConsumed = (consumedSources.data?.data ?? []).filter((source) => source.projetoId !== id);
  const meta = sources.data?.meta;
  const requestedDetail = useFonte(requestedSourceId ?? undefined);
  const selectedSource = rows.find((row) => row.id === selectedId) ?? requestedDetail.data ?? rows[0] ?? null;
  const selectedDetail = useFonte(selectedSource?.id);

  useEffect(() => {
    if (!requestedSourceId || selectedId === requestedSourceId) return;
    const requested = rows.find((row) => row.id === requestedSourceId);
    if (requested) setSelectedId(requested.id);
  }, [requestedSourceId, rows, selectedId]);

  const columns = useMemo(() => [
    { key: 'nome', label: 'Fonte', primary: true, minWidth: 260, render: (row: FonteConhecimento) => <div className="source-table-primary"><strong>{row.nome}</strong><span>{row.tipo} · {row.projeto.codigo}</span></div> },
    { key: 'oficial', label: 'Governança', minWidth: 150, render: (row: FonteConhecimento) => <div className="source-governance-cell">{row.oficial ? <Badge preset="ativo">Fonte oficial</Badge> : <span>Referência</span>}{row.responsavel && <small>{row.responsavel}</small>}</div> },
    { key: 'ultimaVerificacao', label: 'Verificação', minWidth: 130, render: (row: FonteConhecimento) => row.ultimaVerificacao ? formatDateOnlyBR(row.ultimaVerificacao) : <span className="source-unverified">Não informada</span> },
    { key: 'vinculosTotal', label: 'Uso', minWidth: 110, sortable: false, render: (row: FonteConhecimento) => <div className="source-usage-cell"><strong>{row.vinculosTotal}</strong><span>{row.vinculosCrossProject ? `${row.vinculosCrossProject} cross-project` : 'no ecossistema'}</span></div> },
    { key: 'status', label: 'Status', minWidth: 110, render: (row: FonteConhecimento) => <Badge preset={statusPreset(row.status)}>{sourceLabel(row.status)}</Badge> },
  ], []);

  function changeSort(key: string) {
    if (sortBy === key) setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
    setPage(1);
  }

  if (!id) return null;
  if (projectLoading) return <div className="main-pad">Carregando projeto...</div>;
  if (!projeto) return <div className="main-pad"><EmptyState title="Projeto não encontrado" /></div>;

  const s = summary.data;
  const rail = (
    <RightRail sticky>
      <SectionCard title="Proveniência" subtitle="Qualidade e governança das fontes deste Projeto." icon="clipboardCheck" padding="compact">
        <div className="source-summary-grid">
          <div><span>Fontes</span><strong>{s?.total ?? '—'}</strong></div>
          <div><span>Oficiais</span><strong>{s?.oficiais ?? '—'}</strong></div>
          <div><span>Em revisão</span><strong>{s?.emRevisao ?? '—'}</strong></div>
          <div><span>Sem verificação</span><strong>{s?.semVerificacao ?? '—'}</strong></div><div><span>Fontes externas</span><strong>{s?.fontesExternasConsumidas ?? '—'}</strong></div>
        </div>
        <div className="source-cross-project-metric"><Icon name="network" size={15} /><div><strong>{s?.consumosCrossProject ?? 0}</strong><span>consumos cross-project destas fontes</span></div></div>
      </SectionCard>

      <SectionCard title="Fonte selecionada" subtitle="Rastreabilidade da referência em foco." icon="info" padding="compact">
        {selectedSource ? <div className="source-selected-card"><div className="source-selected-card__title"><strong>{selectedSource.nome}</strong><Badge preset={statusPreset(selectedSource.status)}>{sourceLabel(selectedSource.status)}</Badge></div><dl><div><dt>Tipo</dt><dd>{selectedSource.tipo}</dd></div><div><dt>Responsável</dt><dd>{selectedSource.responsavel || 'Não informado'}</dd></div><div><dt>Uso</dt><dd>{selectedSource.vinculosTotal} vínculo(s)</dd></div><div><dt>Cross-project</dt><dd>{selectedSource.vinculosCrossProject}</dd></div></dl><div className="source-selected-card__reference">{selectedSource.referencia}</div><div className="source-selected-card__uses"><span>Onde esta fonte é usada</span>{selectedDetail.isLoading ? <small>Carregando vínculos...</small> : selectedDetail.data?.vinculos.length ? selectedDetail.data.vinculos.slice(0, 6).map((usage) => <div key={usage.id}><strong>{usage.entityType}</strong><span>{usage.projetoContexto.nome}</span>{usage.projetoContextoId !== selectedSource.projetoId && <Badge preset="analise">Cross-project</Badge>}</div>) : <small>Nenhum conhecimento vinculado ainda.</small>}</div><SourceHistory source={selectedSource} /></div> : <span className="dbc-text-3">Selecione uma fonte na tabela.</span>}
      </SectionCard>

      <Alert type="info" title="Regra de confiança">Uma fonte só deve ser marcada como oficial quando houver proprietário e responsabilidade claros. Referências migradas do legado entram em revisão por segurança.</Alert>
    </RightRail>
  );

  return (
    <>
      <SetupPage
        header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', projeto.nome, 'Fontes']} title="Fontes e Proveniência" subtitle="Estruture de onde vem o conhecimento, quem responde por ele e onde essa evidência é reutilizada no ecossistema." back={{ label: 'Voltar para o projeto', onClick: () => navigate(`/projetos/${id}`) }} actions={<Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>Nova fonte</Button>} />}
        rail={rail}
      >
        <DataTableCard
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          loading={sources.isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={changeSort}
          onRowClick={(row) => setSelectedId(row.id)}
          ariaLabel="Fontes de conhecimento do Projeto"
          toolbar={<div className="source-table-toolbar"><div className="source-table-toolbar__heading"><div><strong>Fontes de conhecimento</strong><span>Uma fonte mantém sua propriedade original mesmo quando é reutilizada por outro Projeto.</span></div></div><div className="source-toolbar"><SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome, referência ou responsável..." /><select className="knowledge-source-select" value={status} onChange={(e) => { setStatus(e.target.value as '' | FonteStatus); setPage(1); }}><option value="">Todos os status</option><option value="Ativa">Ativas</option><option value="Revisao">Em revisão</option><option value="Inativa">Inativas</option></select><Button variant="default" icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>Nova fonte</Button></div></div>}
          empty={<EmptyState icon="clipboardCheck" title="Nenhuma fonte encontrada" message="Cadastre a primeira evidência estruturada deste Projeto." />}
          rowActions={(row) => <><RowActionButton title={`Editar ${row.nome}`} onClick={() => { setEditing(row); setFormOpen(true); }}><Icon name="edit" size={14} /></RowActionButton><RowActionButton title={row.status === 'Ativa' ? `Inativar ${row.nome}` : `Ativar ${row.nome}`} onClick={() => toggle.mutate(row.id)}><Icon name={row.status === 'Ativa' ? 'close' : 'check'} size={14} /></RowActionButton></>}
          footer={meta && <div className="source-table-footer"><span>Mostrando {rows.length ? (meta.page - 1) * meta.pageSize + 1 : 0}–{Math.min(meta.page * meta.pageSize, meta.total)} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div>}
        />

        <SectionCard title="Fontes externas consumidas" subtitle="Evidências pertencentes a outros Projetos que já sustentam conhecimentos deste contexto." icon="network">
          {consumedSources.isLoading ? <span className="dbc-text-2">Carregando fontes externas...</span> : externalConsumed.length ? <div className="source-external-list">{externalConsumed.slice(0, 8).map((source) => <button type="button" key={source.id} onClick={() => navigate(`/projetos/${source.projetoId}/fontes`)}><div><strong>{source.nome}</strong><span>{source.tipo} · propriedade: {source.projeto.nome}</span></div><div>{source.oficial && <Badge preset="ativo">Oficial</Badge>}<Badge preset="analise">Cross-project</Badge><Icon name="arrowR" size={13} /></div></button>)}</div> : <EmptyState icon="network" title="Nenhuma fonte externa consumida" message="Quando um conhecimento deste Projeto reutilizar uma fonte de outro Projeto, ela aparecerá aqui sem perder sua propriedade original." /> }
        </SectionCard>
      </SetupPage>

      {formOpen && <SourceFormModal key={editing?.id ?? 'new'} open={formOpen} projetoId={id} item={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />}
    </>
  );
}
