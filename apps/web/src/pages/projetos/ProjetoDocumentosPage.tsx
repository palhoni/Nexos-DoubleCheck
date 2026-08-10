import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
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
} from '@/design-system';
import { formatDateTimeBR } from '@/entities/crud/shared';
import { useDocumento, useDocumentoResumo, useDocumentos } from '@/entities/documento/documento.api';
import type { DocumentoConhecimento, DocumentoStatus } from '@/entities/documento/documento.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const PAGE_SIZE = 10;

function statusPreset(status: DocumentoStatus) {
  if (status === 'Publicado') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  if (status === 'Arquivado') return 'inativo' as const;
  return 'info' as const;
}

function statusLabel(status: DocumentoStatus) {
  return status === 'Revisao' ? 'Em revisão' : status;
}

export function ProjetoDocumentosPage() {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | DocumentoStatus>('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const projectQuery = projetoHooks.useDetail(projetoId);
  const documentsQuery = useDocumentos({
    page,
    pageSize: PAGE_SIZE,
    projetoId,
    busca: search.trim() || undefined,
    status: status || undefined,
    sortBy,
    sortDir,
  }, !!projetoId);
  const summaryQuery = useDocumentoResumo(projetoId);
  const externalQuery = useDocumentos({ page: 1, pageSize: 100, consumidorProjetoId: projetoId, sortBy: 'updatedAt', sortDir: 'desc' }, !!projetoId);

  const rows = documentsQuery.data?.data ?? [];
  const meta = documentsQuery.data?.meta;
  const selected = rows[0] ?? null;
  const selectedDetail = useDocumento(selected?.id);
  const external = (externalQuery.data?.data ?? []).filter((item) => item.projetoId !== projetoId);
  const summary = summaryQuery.data;

  const columns = useMemo(() => [
    {
      key: 'titulo',
      label: 'Documento',
      primary: true,
      minWidth: 280,
      render: (row: DocumentoConhecimento) => (
        <div className="document-table-primary">
          <strong>{row.titulo}</strong>
          <span>{row.codigo} · {row.tipo}</span>
        </div>
      ),
    },
    {
      key: 'versao',
      label: 'Versão',
      minWidth: 90,
      align: 'center' as const,
      render: (row: DocumentoConhecimento) => <strong>v{row.versao}</strong>,
    },
    {
      key: 'vinculosTotal',
      label: 'Cobertura',
      minWidth: 130,
      sortable: false,
      render: (row: DocumentoConhecimento) => (
        <div className="document-metric-cell"><strong>{row.vinculosTotal}</strong><span>{row.vinculosCrossProject ? `${row.vinculosCrossProject} cross-project` : 'vínculo(s)'}</span></div>
      ),
    },
    {
      key: 'fontesTotal',
      label: 'Evidências',
      minWidth: 110,
      sortable: false,
      render: (row: DocumentoConhecimento) => (
        <div className={`document-source-cell${row.fontesTotal === 0 ? ' document-source-cell--warning' : ''}`}>
          <strong>{row.fontesTotal}</strong><span>{row.fontesTotal ? 'fonte(s)' : 'sem fonte'}</span>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Atualizado',
      minWidth: 150,
      render: (row: DocumentoConhecimento) => formatDateTimeBR(row.updatedAt),
    },
    {
      key: 'status',
      label: 'Status',
      minWidth: 120,
      render: (row: DocumentoConhecimento) => <Badge preset={statusPreset(row.status)}>{statusLabel(row.status)}</Badge>,
    },
  ], []);

  function changeSort(key: string) {
    if (sortBy === key) setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
    setPage(1);
  }

  if (!projetoId) return null;
  if (projectQuery.isLoading) return <div className="main-pad">Carregando projeto...</div>;
  if (!projectQuery.data) return <div className="main-pad"><EmptyState title="Projeto não encontrado" /></div>;

  const projeto = projectQuery.data;
  const rail = (
    <RightRail sticky>
      <SectionCard title="Documentação do Projeto" subtitle="Estado editorial e rastreabilidade dos documentos próprios." icon="folder" padding="compact">
        <div className="document-summary-grid">
          <div><span>Documentos</span><strong>{summary?.total ?? '—'}</strong></div>
          <div><span>Com versão publicada</span><strong>{summary?.publicados ?? '—'}</strong></div>
          <div><span>Em revisão</span><strong>{summary?.emRevisao ?? '—'}</strong></div>
          <div><span>Rascunhos</span><strong>{summary?.rascunhos ?? '—'}</strong></div>
          <div><span>Sem evidência</span><strong>{summary?.semFonte ?? '—'}</strong></div>
          <div><span>Externos usados</span><strong>{summary?.documentosExternosConsumidos ?? '—'}</strong></div>
        </div>
        <div className="document-cross-project-metric"><Icon name="network" size={15} /><div><strong>{summary?.consumosCrossProject ?? 0}</strong><span>consumos cross-project dos documentos deste Projeto</span></div></div>
      </SectionCard>

      <SectionCard title="Documento selecionado" subtitle="Visão rápida do artefato em foco." icon="info" padding="compact">
        {selected ? (
          <div className="document-selected-card">
            <div className="document-selected-card__head"><strong>{selected.titulo}</strong><Badge preset={statusPreset(selected.status)}>{statusLabel(selected.status)}</Badge></div>
            <span className="document-selected-card__code">{selected.codigo} · {selected.tipo} · v{selected.versao}</span>
            <dl>
              <div><dt>Responsável</dt><dd>{selected.responsavel || 'Não informado'}</dd></div>
              <div><dt>Vínculos</dt><dd>{selected.vinculosTotal}</dd></div>
              <div><dt>Evidências</dt><dd>{selected.fontesTotal}</dd></div>
              <div><dt>Cross-project</dt><dd>{selected.vinculosCrossProject}</dd></div>
            </dl>
            {selected.resumo && <p>{selected.resumo}</p>}
            {selectedDetail.data?.vinculos?.length ? (
              <div className="document-selected-card__uses">
                <span>Onde é utilizado</span>
                {selectedDetail.data.vinculos.slice(0, 5).map((link) => (
                  <div key={link.id}><strong>{link.entityType}</strong><span>{link.projetoContexto.nome}</span>{link.projetoContextoId !== selected.projetoId && <Badge preset="analise">Cross-project</Badge>}</div>
                ))}
              </div>
            ) : null}
            <Button variant="link" size="sm" iconRight="arrowR" onClick={() => navigate(`/projetos/${selected.projetoId}/documentos/${selected.id}`)}>Abrir documento</Button>
          </div>
        ) : <span className="dbc-text-3">Selecione um documento na tabela.</span>}
      </SectionCard>

      <Alert type="info" title="Documento não é Fonte">Documentos organizam e versionam conhecimento dentro do Nexus. Fontes continuam registrando a evidência/origem que sustenta esse conteúdo.</Alert>
    </RightRail>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', projeto.nome, 'Documentos']} title="Documentos de Conhecimento" subtitle="Transforme decisões, especificações e contexto em documentação versionada, navegável e reutilizável no ecossistema." back={{ label: 'Voltar para o projeto', onClick: () => navigate(`/projetos/${projetoId}`) }} actions={<Button variant="primary" icon="plus" onClick={() => navigate(`/projetos/${projetoId}/documentos/novo`)}>Novo documento</Button>} />}
      rail={rail}
    >
      <DataTableCard
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={documentsQuery.isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={changeSort}
        onRowClick={(row) => navigate(`/projetos/${row.projetoId}/documentos/${row.id}`)}
        ariaLabel="Documentos de conhecimento do Projeto"
        toolbar={(
          <div className="document-table-toolbar">
            <div className="document-table-toolbar__heading"><div><strong>Documentos próprios</strong><span>O código e a propriedade permanecem estáveis; alterações editoriais geram versões rastreáveis.</span></div></div>
            <div className="document-toolbar">
              <SearchInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por título, código, resumo ou responsável..." />
              <select className="knowledge-document-select" value={status} onChange={(event) => { setStatus(event.target.value as '' | DocumentoStatus); setPage(1); }}>
                <option value="">Todos os status</option>
                <option value="Rascunho">Rascunhos</option>
                <option value="Revisao">Em revisão</option>
                <option value="Publicado">Publicados</option>
                <option value="Arquivado">Arquivados</option>
              </select>
              <Button variant="default" icon="plus" onClick={() => navigate(`/projetos/${projetoId}/documentos/novo`)}>Novo documento</Button>
            </div>
          </div>
        )}
        empty={<EmptyState icon="folder" title="Nenhum documento encontrado" message="Crie o primeiro documento curado deste Projeto. Fontes e evidências poderão ser vinculadas depois sem duplicar propriedade." />}
        rowActions={(row) => <RowActionButton title={`Editar ${row.titulo}`} onClick={() => navigate(`/projetos/${row.projetoId}/documentos/${row.id}/editar`)}><Icon name="edit" size={14} /></RowActionButton>}
        footer={meta && <div className="document-table-footer"><span>Mostrando {rows.length ? (meta.page - 1) * meta.pageSize + 1 : 0}–{Math.min(meta.page * meta.pageSize, meta.total)} de {meta.total}</span><Pagination page={meta.page} total={meta.totalPages} onChange={setPage} /></div>}
      />

      <SectionCard title="Documentos externos consumidos" subtitle="Conhecimento publicado por outros Projetos e reutilizado neste contexto sem perder propriedade ou versão." icon="network">
        {externalQuery.isLoading ? <span className="dbc-text-2">Carregando documentos externos...</span> : external.length ? (
          <div className="document-external-list">
            {external.slice(0, 10).map((documento) => {
              const activePublishedSnapshot = !!documento.versaoPublicada && !!documento.publicadoEm;
              return (
                <button type="button" key={documento.id} onClick={() => navigate(`/projetos/${documento.projetoId}/documentos/${documento.id}${activePublishedSnapshot ? '?view=published' : ''}`)}>
                  <div><strong>{documento.titulo}</strong><span>{documento.codigo} · propriedade: {documento.projeto.nome} · v{activePublishedSnapshot ? documento.versaoPublicada : documento.versao}</span></div>
                  <div>
                    {activePublishedSnapshot ? <Badge preset="ativo">Publicado v{documento.versaoPublicada}</Badge> : <Badge preset={statusPreset(documento.status)}>{statusLabel(documento.status)}</Badge>}
                    {activePublishedSnapshot && documento.versao > (documento.versaoPublicada ?? 0) && <Badge preset="pendente">v{documento.versao} em revisão</Badge>}
                    <Badge preset="analise">Cross-project</Badge><Icon name="arrowR" size={13} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : <EmptyState icon="network" title="Nenhum documento externo consumido" message="Quando uma entidade deste Projeto reutilizar um documento publicado por outro Projeto, ele aparecerá aqui." />}
      </SectionCard>
    </SetupPage>
  );
}
