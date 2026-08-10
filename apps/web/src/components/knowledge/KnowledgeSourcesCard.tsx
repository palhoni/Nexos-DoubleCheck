import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Icon, Modal, SearchInput, SectionCard, Textarea } from '@/design-system';
import { formatDateOnlyBR, getErrorMessage } from '@/entities/crud/shared';
import { useFonteMutations, useFontes, useFontesVinculadas } from '@/entities/fonte/fonte.api';
import type { FonteEntityType, FonteStatus } from '@/entities/fonte/fonte.types';

function statusPreset(status: FonteStatus) {
  if (status === 'Ativa') return 'ativo' as const;
  if (status === 'Revisao') return 'pendente' as const;
  return 'inativo' as const;
}

function isHttpReference(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export interface KnowledgeSourcesCardProps {
  entityType: FonteEntityType;
  entityId: string;
  projetoId: string;
  title?: string;
  compact?: boolean;
}

/** Evidências/proveniência vinculadas a uma entidade de conhecimento.
 *  A fonte pode pertencer a outro Projeto; o vínculo registra o Projeto consumidor
 *  derivado no backend, sem duplicar propriedade. */
export function KnowledgeSourcesCard({ entityType, entityId, projetoId, title = 'Fontes e evidências', compact = false }: KnowledgeSourcesCardProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [contexto, setContexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const linksQuery = useFontesVinculadas(entityType, entityId);
  const sourcesQuery = useFontes(
    { page: 1, pageSize: 100, busca: sourceSearch.trim() || undefined, sortBy: 'updatedAt', sortDir: 'desc' },
    open,
  );
  const { link, unlink } = useFonteMutations();

  const links = linksQuery.data ?? [];
  const linkedIds = useMemo(() => new Set(links.map((item) => item.fonteId)), [links]);
  const available = useMemo(
    () => (sourcesQuery.data?.data ?? []).filter((source) => source.status !== 'Inativa' && !linkedIds.has(source.id)),
    [linkedIds, sourcesQuery.data],
  );

  function resetModal() {
    setOpen(false);
    setSourceId('');
    setContexto('');
    setSourceSearch('');
    setError(null);
  }

  function createLink() {
    if (!sourceId || link.isPending) return;
    setError(null);
    link.mutate(
      { fonteId: sourceId, entityType, entityId, contexto: contexto.trim() || undefined },
      {
        onSuccess: resetModal,
        onError: (reason) => setError(getErrorMessage(reason)),
      },
    );
  }

  return (
    <SectionCard
      title={title}
      subtitle="Evidências que sustentam este conhecimento e permitem rastrear sua origem."
      icon="clipboardCheck"
      padding={compact ? 'compact' : 'default'}
      action={
        <Button variant="default" size="sm" icon="plus" onClick={() => { setError(null); setOpen(true); }}>
          Vincular fonte
        </Button>
      }
    >
      {error && !open && <Alert type="error" title="Não foi possível concluir a operação">{error}</Alert>}
      {linksQuery.isError ? (
        <Alert type="error" title="Não foi possível carregar as fontes">{getErrorMessage(linksQuery.error)}</Alert>
      ) : linksQuery.isLoading ? (
        <div className="knowledge-source-state">Carregando fontes vinculadas...</div>
      ) : links.length === 0 ? (
        <EmptyState
          icon="clipboardCheck"
          title="Nenhuma evidência vinculada"
          message="Vincule a fonte que comprova ou explica este conhecimento."
        />
      ) : (
        <div className="knowledge-source-list">
          {links.map((item) => {
            const source = item.fonte;
            const crossProject = source.projetoId !== projetoId;
            return (
              <article className="knowledge-source-item" key={item.id}>
                <div className="knowledge-source-item__icon" aria-hidden="true">
                  <Icon name={source.oficial ? 'check' : 'clipboardCheck'} size={16} width={1.9} />
                </div>
                <div className="knowledge-source-item__body">
                  <div className="knowledge-source-item__head">
                    <strong>{source.nome}</strong>
                    <div className="knowledge-source-item__badges">
                      {source.oficial && <Badge preset="ativo">Fonte oficial</Badge>}
                      <Badge preset={statusPreset(source.status)}>{source.status === 'Revisao' ? 'Em revisão' : source.status}</Badge>
                      {crossProject && <Badge preset="analise">Cross-project</Badge>}
                    </div>
                  </div>
                  <div className="knowledge-source-item__meta">
                    <span>{source.tipo}</span>
                    <span>•</span>
                    <span>{source.projeto.nome}</span>
                    {source.ultimaVerificacao && <><span>•</span><span>Verificada em {formatDateOnlyBR(source.ultimaVerificacao)}</span></>}
                  </div>
                  {item.contexto && <p className="knowledge-source-item__context">{item.contexto}</p>}
                  <div className="knowledge-source-item__reference">
                    {isHttpReference(source.referencia) ? (
                      <a href={source.referencia} target="_blank" rel="noreferrer">{source.referencia}</a>
                    ) : (
                      <span>{source.referencia}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="knowledge-source-item__remove"
                  title="Desvincular fonte"
                  aria-label={`Desvincular ${source.nome}`}
                  disabled={unlink.isPending}
                  onClick={() => {
                    setError(null);
                    unlink.mutate(
                      { fonteId: source.id, vinculoId: item.id },
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

      <div className="knowledge-source-footer">
        <Button variant="link" size="sm" onClick={() => navigate(`/projetos/${projetoId}/fontes`)} iconRight="arrowR">
          Gerenciar fontes do ecossistema
        </Button>
      </div>

      <Modal
        open={open}
        onClose={resetModal}
        title="Vincular fonte de conhecimento"
        subtitle="Você pode reutilizar uma fonte de outro Projeto. A propriedade original será preservada e o consumo cross-project ficará rastreável."
        primaryLabel="Vincular fonte"
        primaryLoading={link.isPending}
        primaryDisabled={!sourceId}
        onPrimary={createLink}
        width={620}
      >
        <div className="knowledge-source-link-form">
          {error && <Alert type="error" title="Não foi possível concluir a operação">{error}</Alert>}
          {sourcesQuery.isError && <Alert type="error" title="Não foi possível buscar as fontes">{getErrorMessage(sourcesQuery.error)}</Alert>}
          <label>
            <span>Buscar no ecossistema</span>
            <SearchInput value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Nome, referência ou responsável..." />
          </label>
          <label>
            <span>Fonte *</span>
            <select className="knowledge-source-select" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
              <option value="">Selecione uma fonte...</option>
              {available.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.nome} · {source.projeto.nome}{source.oficial ? ' · oficial' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Contexto do vínculo</span>
            <Textarea
              rows={3}
              value={contexto}
              onChange={(event) => setContexto(event.target.value)}
              placeholder="Explique por que esta fonte sustenta este conhecimento. Ex.: contrato oficial da API usado para documentar os códigos de retorno."
            />
          </label>
          {available.length === 0 && !sourcesQuery.isLoading && (
            <Alert type="info" title="Nenhuma outra fonte disponível">
              Cadastre uma fonte no Projeto ou revise os vínculos existentes.
            </Alert>
          )}
        </div>
      </Modal>
    </SectionCard>
  );
}
