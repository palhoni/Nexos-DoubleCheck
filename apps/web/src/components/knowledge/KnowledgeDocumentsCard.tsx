import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Icon, Modal, SearchInput, SectionCard, Textarea } from '@/design-system';
import { getErrorMessage } from '@/entities/crud/shared';
import { useDocumentoMutations, useDocumentos, useDocumentosVinculados } from '@/entities/documento/documento.api';
import type { DocumentoEntityType, DocumentoStatus } from '@/entities/documento/documento.types';

function statusPreset(status: DocumentoStatus) {
  if (status === 'Publicado') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  if (status === 'Arquivado') return 'inativo' as const;
  return 'info' as const;
}

function statusLabel(status: DocumentoStatus) {
  return status === 'Revisao' ? 'Em revisão' : status;
}

export interface KnowledgeDocumentsCardProps {
  entityType: DocumentoEntityType;
  entityId: string;
  projetoId: string;
  title?: string;
  compact?: boolean;
}

/**
 * Documentos curados relacionados a uma entidade do Nexus.
 * Documentos de outro Projeto só podem ser consumidos quando Publicados;
 * a propriedade original nunca é transferida pelo vínculo.
 */
export function KnowledgeDocumentsCard({ entityType, entityId, projetoId, title = 'Documentos relacionados', compact = false }: KnowledgeDocumentsCardProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [contexto, setContexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const linksQuery = useDocumentosVinculados(entityType, entityId);
  const documentsQuery = useDocumentos(
    { page: 1, pageSize: 100, disponivelParaProjetoId: projetoId, busca: documentSearch.trim() || undefined, sortBy: 'updatedAt', sortDir: 'desc' },
    open,
  );
  const { link, unlink } = useDocumentoMutations();

  const links = linksQuery.data ?? [];
  const linkedIds = useMemo(() => new Set(links.map((item) => item.documentoId)), [links]);
  const available = useMemo(
    () => (documentsQuery.data?.data ?? []).filter((documento) => {
      if (linkedIds.has(documento.id) || documento.status === 'Arquivado') return false;
      if (documento.projetoId !== projetoId && (!documento.versaoPublicada || !documento.publicadoEm)) return false;
      return true;
    }),
    [documentsQuery.data, linkedIds, projetoId],
  );

  function resetModal() {
    setOpen(false);
    setDocumentSearch('');
    setDocumentoId('');
    setContexto('');
    setError(null);
  }

  function createLink() {
    if (!documentoId || link.isPending) return;
    setError(null);
    link.mutate(
      { documentoId, entityType, entityId, contexto: contexto.trim() || undefined },
      {
        onSuccess: resetModal,
        onError: (reason) => setError(getErrorMessage(reason)),
      },
    );
  }

  return (
    <SectionCard
      title={title}
      subtitle="Documentação curada que explica, especifica ou contextualiza este conhecimento."
      icon="folder"
      padding={compact ? 'compact' : 'default'}
      action={<Button variant="default" size="sm" icon="plus" onClick={() => { setError(null); setOpen(true); }}>Vincular documento</Button>}
    >
      {error && !open && <Alert type="error" title="Não foi possível concluir a operação">{error}</Alert>}
      {linksQuery.isError ? (
        <Alert type="error" title="Não foi possível carregar os documentos">{getErrorMessage(linksQuery.error)}</Alert>
      ) : linksQuery.isLoading ? (
        <div className="knowledge-document-state">Carregando documentos relacionados...</div>
      ) : links.length === 0 ? (
        <EmptyState icon="folder" title="Nenhum documento relacionado" message="Vincule documentação que ajude pessoas a compreender este conhecimento sem depender da memória do time." />
      ) : (
        <div className="knowledge-document-list">
          {links.map((item) => {
            const documento = item.documento;
            const crossProject = documento.projetoId !== projetoId;
            const activePublishedSnapshot = crossProject && !!documento.versaoPublicada && !!documento.publicadoEm;
            return (
              <article className="knowledge-document-item" key={item.id}>
                <button
                  type="button"
                  className="knowledge-document-item__open"
                  onClick={() => navigate(`/projetos/${documento.projetoId}/documentos/${documento.id}${activePublishedSnapshot ? '?view=published' : ''}`)}
                >
                  <span className="knowledge-document-item__icon" aria-hidden="true"><Icon name="folder" size={16} width={1.8} /></span>
                  <span className="knowledge-document-item__body">
                    <span className="knowledge-document-item__head">
                      <strong>{documento.titulo}</strong>
                      <span className="knowledge-document-item__badges">
                        {activePublishedSnapshot ? <Badge preset="ativo">Publicado v{documento.versaoPublicada}</Badge> : <Badge preset={statusPreset(documento.status)}>{statusLabel(documento.status)}</Badge>}
                        {activePublishedSnapshot && documento.versao > (documento.versaoPublicada ?? 0) && <Badge preset="pendente">v{documento.versao} em revisão</Badge>}
                        {crossProject && <Badge preset="analise">Cross-project</Badge>}
                      </span>
                    </span>
                    <span className="knowledge-document-item__meta">{documento.codigo} · {documento.tipo} · v{activePublishedSnapshot ? documento.versaoPublicada : documento.versao} · {documento.projeto.nome}</span>
                    {item.contexto && <span className="knowledge-document-item__context">{item.contexto}</span>}
                  </span>
                  <Icon name="arrowR" size={14} />
                </button>
                <button
                  type="button"
                  className="knowledge-document-item__remove"
                  aria-label={`Desvincular ${documento.titulo}`}
                  title="Desvincular documento"
                  disabled={unlink.isPending}
                  onClick={() => {
                    setError(null);
                    unlink.mutate(
                      { documentoId: documento.id, vinculoId: item.id },
                      { onError: (reason) => setError(getErrorMessage(reason)) },
                    );
                  }}
                >
                  <Icon name="close" size={13} />
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="knowledge-document-footer">
        <Button variant="link" size="sm" onClick={() => navigate(`/projetos/${projetoId}/documentos`)} iconRight="arrowR">
          Gerenciar documentos do Projeto
        </Button>
      </div>

      <Modal
        open={open}
        onClose={resetModal}
        title="Vincular documento de conhecimento"
        subtitle="Documentos publicados podem ser reutilizados entre Projetos sem perder propriedade, versão ou histórico."
        primaryLabel="Vincular documento"
        primaryLoading={link.isPending}
        primaryDisabled={!documentoId}
        onPrimary={createLink}
        width={640}
      >
        <div className="knowledge-document-link-form">
          {error && <Alert type="error" title="Não foi possível concluir a operação">{error}</Alert>}
          {documentsQuery.isError && <Alert type="error" title="Não foi possível buscar documentos">{getErrorMessage(documentsQuery.error)}</Alert>}
          <label>
            <span>Buscar no ecossistema</span>
            <SearchInput value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Título, código, resumo ou responsável..." />
          </label>
          <label>
            <span>Documento *</span>
            <select className="knowledge-document-select" value={documentoId} onChange={(event) => setDocumentoId(event.target.value)}>
              <option value="">Selecione um documento...</option>
              {available.map((documento) => (
                <option key={documento.id} value={documento.id}>
                  {documento.titulo} · {documento.projeto.nome} · v{documento.projetoId !== projetoId ? (documento.versaoPublicada ?? documento.versao) : documento.versao}{documento.projetoId !== projetoId ? ' · publicada · cross-project' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Contexto do vínculo</span>
            <Textarea rows={3} value={contexto} onChange={(event) => setContexto(event.target.value)} placeholder="Explique como este documento ajuda a compreender ou operar este conhecimento." />
          </label>
          {available.length === 0 && !documentsQuery.isLoading && (
            <Alert type="info" title="Nenhum documento disponível">Crie um documento no Projeto ou publique um documento de outro Projeto antes de reutilizá-lo aqui.</Alert>
          )}
        </div>
      </Modal>
    </SectionCard>
  );
}
