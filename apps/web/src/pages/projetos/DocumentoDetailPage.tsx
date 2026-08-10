import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { Alert, Badge, Button, EmptyState, Icon, RightRail, SectionCard, Toast } from '@/design-system';
import { formatDateTimeBR, getErrorMessage } from '@/entities/crud/shared';
import { useDocumento, useDocumentoHistorico, useDocumentoMutations } from '@/entities/documento/documento.api';
import type { DocumentoStatus } from '@/entities/documento/documento.types';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function statusPreset(status: DocumentoStatus) {
  if (status === 'Publicado') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  if (status === 'Arquivado') return 'inativo' as const;
  return 'info' as const;
}

function statusLabel(status: DocumentoStatus) {
  return status === 'Revisao' ? 'Em revisão' : status;
}

function nextStatus(status: DocumentoStatus): { status: DocumentoStatus; label: string; variant: 'default' | 'primary' | 'danger' } | null {
  if (status === 'Rascunho') return { status: 'Revisao', label: 'Enviar para revisão', variant: 'primary' };
  if (status === 'Revisao') return { status: 'Publicado', label: 'Publicar documento', variant: 'primary' };
  if (status === 'Publicado') return { status: 'Arquivado', label: 'Arquivar documento', variant: 'danger' };
  if (status === 'Arquivado') return { status: 'Revisao', label: 'Reabrir em revisão', variant: 'default' };
  return null;
}

export function DocumentoDetailPage() {
  const navigate = useNavigate();
  const { projetoId, documentoId } = useParams<{ projetoId: string; documentoId: string }>();
  const [searchParams] = useSearchParams();
  const documentQuery = useDocumento(documentoId);
  const historyQuery = useDocumentoHistorico(documentoId, 1, 8);
  const { update } = useDocumentoMutations();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  if (!projetoId || !documentoId) return null;
  if (documentQuery.isLoading) return <div className="main-pad">Carregando documento...</div>;
  if (!documentQuery.data) return <div className="main-pad"><EmptyState title="Documento não encontrado" actionLabel="Voltar para documentos" onAction={() => navigate(`/projetos/${projetoId}/documentos`)} /></div>;

  const documento = documentQuery.data;
  const publishedView = searchParams.get('view') === 'published' && !!documento.versaoPublicadaSnapshot;
  const publishedSnapshot = publishedView ? documento.versaoPublicadaSnapshot : null;
  const displayVersion = publishedSnapshot?.numero ?? documento.versao;
  const displayTitle = publishedSnapshot?.titulo ?? documento.titulo;
  const displayResumo = publishedSnapshot?.resumo ?? documento.resumo;
  const displayContent = publishedSnapshot?.conteudo ?? documento.conteudo;
  const action = publishedView ? null : nextStatus(documento.status);
  const versions = publishedSnapshot && !documento.versoes.some((version) => version.numero === publishedSnapshot.numero)
    ? [publishedSnapshot, ...documento.versoes]
    : documento.versoes;
  const history = historyQuery.data?.data ?? [];

  function changeStatus(status: DocumentoStatus) {
    update.mutate(
      { id: documento.id, payload: { status } },
      {
        onSuccess: () => setToast({ type: 'success', title: 'Status atualizado', message: `O documento agora está como “${statusLabel(status)}”.` }),
        onError: (reason) => setToast({ type: 'error', title: 'Não foi possível alterar o status', message: getErrorMessage(reason) }),
      },
    );
  }

  const summary = (
    <SectionCard padding="none">
      <div className="document-detail-summary">
        <div className="document-detail-summary__identity">
          <div className="document-detail-summary__icon"><Icon name="folder" size={22} width={1.8} /></div>
          <div>
            <span className="document-detail-summary__eyebrow">{documento.tipo} · {documento.codigo}{publishedView ? ' · versão publicada' : ''}</span>
            <div className="document-detail-summary__title"><h2>{displayTitle}</h2>{publishedView ? <Badge preset="ativo">Publicado v{displayVersion}</Badge> : <Badge preset={statusPreset(documento.status)}>{statusLabel(documento.status)}</Badge>}</div>
            <p>{displayResumo || 'Sem resumo executivo documentado.'}</p>
          </div>
        </div>
        <div className="document-detail-summary__facts">
          <div><span>Versão</span><strong>v{displayVersion}</strong></div>
          <div><span>Responsável</span><strong>{documento.responsavel || 'Não informado'}</strong></div>
          <div><span>Projeto proprietário</span><strong>{documento.projeto.nome}</strong></div>
          <div><span>{publishedView ? 'Publicada' : 'Atualizado'}</span><strong>{formatDateTimeBR(publishedSnapshot?.createdAt ?? documento.updatedAt)}</strong></div>
        </div>
      </div>
    </SectionCard>
  );

  const rail = (
    <RightRail sticky>
      <SectionCard title="Governança" subtitle="Estado editorial e confiança operacional do documento." icon="clipboardCheck" padding="compact">
        <div className="document-governance-card">
          <div><span>Status</span><Badge preset={statusPreset(documento.status)}>{statusLabel(documento.status)}</Badge></div>
          <div><span>Versão atual</span><strong>v{documento.versao}</strong></div>{documento.versaoPublicada && <div><span>Versão publicada</span><strong>v{documento.versaoPublicada}</strong></div>}
          <div><span>Evidências</span><strong>{documento.fontesTotal}</strong></div>
          <div><span>Vínculos</span><strong>{documento.vinculosTotal}</strong></div>
          <div><span>Cross-project</span><strong>{documento.vinculosCrossProject}</strong></div>
          <div><span>Publicado em</span><strong>{documento.publicadoEm ? formatDateTimeBR(documento.publicadoEm) : '—'}</strong></div>
        </div>
        {documento.status === 'Publicado' && documento.fontesTotal === 0 && <Alert type="warning" title="Publicado sem evidência">O documento pode ser publicado sem fonte, mas a ausência de evidência reduz a rastreabilidade do conhecimento. Vincule a origem sempre que ela existir.</Alert>}
        {action && <Button block variant={action.variant} loading={update.isPending} onClick={() => changeStatus(action.status)}>{action.label}</Button>}
      </SectionCard>

      <SectionCard title="Versões" subtitle="Histórico editorial preservado; versões anteriores nunca são sobrescritas." icon="clock" padding="compact">
        <div className="document-version-list">
          {versions.map((version) => (
            <div key={version.id} className={version.numero === displayVersion ? 'is-current' : ''}>
              <span className="document-version-list__marker" />
              <div><strong>v{version.numero} · {version.titulo}</strong><small>{version.createdBy?.nome ? `${version.createdBy.nome} · ` : ''}{formatDateTimeBR(version.createdAt)}</small>{version.motivoAlteracao && <p>{version.motivoAlteracao}</p>}</div>
              {version.numero === displayVersion && <Badge preset={publishedView ? 'ativo' : 'info'}>{publishedView ? 'Publicada' : 'Atual'}</Badge>}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Histórico recente" subtitle="Ações registradas sobre este documento." icon="clock" padding="compact">
        {historyQuery.isLoading ? <span className="dbc-text-2">Carregando histórico...</span> : history.length ? (
          <div className="document-history-list">{history.map((entry, index) => <div key={`${entry.ts}-${index}`}><span /><div><strong>{entry.label}</strong><small>{entry.actorNome ? `${entry.actorNome} · ` : ''}{formatDateTimeBR(entry.ts)}</small></div></div>)}</div>
        ) : <span className="dbc-text-3">Nenhuma alteração registrada ainda.</span>}
      </SectionCard>
    </RightRail>
  );

  return (
    <>
      <SetupPage
        header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', documento.projeto.nome, 'Documentos', displayTitle]} title={publishedView ? 'Versão Publicada do Documento' : 'Detalhe do Documento'} subtitle={publishedView ? 'Você está consultando a última versão efetivamente publicada para consumo confiável no ecossistema.' : 'Consulte conteúdo, evidências, relações e versões sem perder a proveniência do conhecimento.'} back={{ label: 'Voltar para documentos', onClick: () => navigate(`/projetos/${documento.projetoId}/documentos`) }} actions={publishedView ? <Button variant="default" icon="eye" onClick={() => navigate(`/projetos/${documento.projetoId}/documentos/${documento.id}`)}>Ver versão atual</Button> : <Button variant="default" icon="edit" onClick={() => navigate(`/projetos/${documento.projetoId}/documentos/${documento.id}/editar`)}>Editar documento</Button>} />}
        afterStepper={summary}
        rail={rail}
      >
        {publishedView && documento.versao > displayVersion && (
          <Alert type="info" title={`Você está vendo a versão publicada v${displayVersion}`}>A versão atual é v{documento.versao} e está como “{statusLabel(documento.status)}”. Consumidores cross-project continuam lendo a última publicação estável até que a revisão seja publicada.</Alert>
        )}
        <SectionCard title="Conteúdo documentado" subtitle={publishedView ? `Snapshot publicado da versão v${displayVersion}.` : 'Versão atual do conhecimento curado.'} icon="clipboardCheck">
          {displayContent ? <div className="document-content-view">{displayContent}</div> : <EmptyState icon="folder" title="Conteúdo ainda não documentado" message="Edite o documento e registre o conteúdo antes de considerá-lo pronto para uso." />}
        </SectionCard>

        <SectionCard title="Onde este documento é utilizado" subtitle="Relações estruturadas que tornam a documentação navegável dentro do ecossistema." icon="network">
          {documento.vinculos.length ? (
            <div className="document-usage-list">
              {documento.vinculos.map((link) => (
                <button type="button" key={link.id} disabled={!link.entityPath} onClick={() => link.entityPath && navigate(link.entityPath)}>
                  <div><span className="document-usage-list__type">{link.entityType}</span><strong>{link.entityLabel || link.entityId}</strong><small>{link.projetoContexto.nome}</small>{link.contexto && <p>{link.contexto}</p>}</div>
                  <div>{link.projetoContextoId !== documento.projetoId && <Badge preset="analise">Cross-project</Badge>}{link.entityPath && <Icon name="arrowR" size={14} />}</div>
                </button>
              ))}
            </div>
          ) : <EmptyState icon="network" title="Documento ainda isolado" message="Vincule este documento a Produtos, Funcionalidades, Regras, Jornadas ou Integrações a partir das respectivas telas de detalhe." />}
        </SectionCard>

        <KnowledgeSourcesCard entityType="Documento" entityId={documento.id} projetoId={documento.projetoId} title="Fontes e evidências do documento" />
      </SetupPage>
      <Toast open={!!toast} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
