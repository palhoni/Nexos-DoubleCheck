import { useEffect, useState } from 'react';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  IconTile,
  Input,
  RightRail,
  SectionCard,
  Toast,
  type IconName,
  type StatusPreset,
} from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { formatDateBR, formatDateTimeBR, getErrorMessage } from '@/entities/crud/shared';
import { pessoaHooks } from '@/entities/pessoa/pessoa.hooks';
import { useFonteResumo } from '@/entities/fonte/fonte.api';
import { useDocumentoResumo } from '@/entities/documento/documento.api';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { PROJETO_CONFIG } from '@/entities/projeto/projeto.config';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import type { Projeto } from '@/entities/projeto/projeto.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

interface DetailValueProps {
  label: string;
  value?: React.ReactNode;
  full?: boolean;
}

function DetailValue({ label, value, full = false }: DetailValueProps) {
  return (
    <div className={`project-detail-value${full ? ' project-detail-value--full' : ''}`}>
      <div className="project-detail-value__label">{label}</div>
      <div className="project-detail-value__content">{value == null || value === '' ? '—' : value}</div>
    </div>
  );
}

interface ProjectListManagerProps {
  projetoId: string;
  title: string;
  description: string;
  values: string[];
  subResource: 'paises';
  placeholder: string;
  addLabel: string;
  onError: (title: string, message: string) => void;
}

function ProjectListManager({ projetoId, title, description, values, subResource, placeholder, addLabel, onError }: ProjectListManagerProps) {
  const [draft, setDraft] = useState('');
  const addMutation = projetoHooks.useAddListItem();
  const removeMutation = projetoHooks.useRemoveListItem();
  const normalized = draft.trim();
  const duplicate = !!normalized && values.some((value) => value.localeCompare(normalized, 'pt-BR', { sensitivity: 'base' }) === 0);

  function add() {
    if (!normalized || duplicate || addMutation.isPending) return;
    addMutation.mutate(
      { id: projetoId, subResource, valor: normalized },
      {
        onSuccess: () => setDraft(''),
        onError: (error) => onError(`Não foi possível adicionar ${addLabel.toLowerCase()}`, getErrorMessage(error)),
      },
    );
  }

  function remove(value: string) {
    if (removeMutation.isPending) return;
    removeMutation.mutate(
      { id: projetoId, subResource, valor: value },
      { onError: (error) => onError(`Não foi possível remover ${addLabel.toLowerCase()}`, getErrorMessage(error)) },
    );
  }

  return (
    <div className="project-list-manager">
      <div className="project-list-manager__heading">
        <div>
          <div className="project-list-manager__title">{title}</div>
          <div className="project-list-manager__description">{description}</div>
        </div>
        <span className="project-list-manager__count">{values.length}</span>
      </div>

      <div className="project-list-manager__toolbar">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
          aria-label={placeholder}
        />
        <Button variant="default" icon="plus" onClick={add} loading={addMutation.isPending} disabled={!normalized || duplicate}>
          Adicionar
        </Button>
      </div>

      {duplicate && <div className="project-list-manager__hint">Este valor já está cadastrado.</div>}

      {values.length === 0 ? (
        <div className="project-list-manager__empty">Nenhum item cadastrado ainda.</div>
      ) : (
        <div className="project-list-manager__chips">
          {values.map((value) => (
            <span className="project-list-manager__chip" key={value}>
              <span>{value}</span>
              <button type="button" aria-label={`Remover ${value}`} title={`Remover ${value}`} onClick={() => remove(value)} disabled={removeMutation.isPending}>
                <Icon name="close" size={12} width={2.4} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SetupLinkProps {
  icon: IconName;
  label: string;
  description: string;
  count?: number;
  loading?: boolean;
  onClick: () => void;
}

function SetupLink({ icon, label, description, count, loading, onClick }: SetupLinkProps) {
  const hasItems = (count ?? 0) > 0;
  return (
    <button type="button" className="project-setup-link" onClick={onClick}>
      <IconTile size="md" tone={hasItems ? 'primary' : 'neutral'}>
        <Icon name={icon} size={16} width={1.8} />
      </IconTile>
      <span className="project-setup-link__copy">
        <span className="project-setup-link__title">{label}</span>
        <span className="project-setup-link__description">{description}</span>
      </span>
      <span className={`project-setup-link__status${hasItems ? ' project-setup-link__status--done' : ''}`}>
        {loading ? '…' : hasItems ? `${count} cadastrado${count === 1 ? '' : 's'}` : 'Não iniciado'}
      </span>
      <Icon name="arrowR" size={14} stroke="var(--color-text-tertiary)" width={1.8} />
    </button>
  );
}

export function ProjetoDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const { data: projeto, isLoading } = projetoHooks.useDetail(id);
  const { data: historicoData, isLoading: historicoLoading } = projetoHooks.useHistorico(id, 1, 5);
  const { data: timesData, isLoading: timesLoading } = timeHooks.useList({ page: 1, pageSize: 1 }, id, { enabled: !!id });
  const { data: pessoasData, isLoading: pessoasLoading } = pessoaHooks.useList({ page: 1, pageSize: 1 }, id, { enabled: !!id });
  const { data: produtosData, isLoading: produtosLoading } = produtoHooks.useList({ page: 1, pageSize: 1 }, id, { enabled: !!id });
  const { data: fontesResumo, isLoading: fontesLoading } = useFonteResumo(id);
  const { data: documentosResumo, isLoading: documentosLoading } = useDocumentoResumo(id);
  const updateMutation = projetoHooks.useUpdate();

  useEffect(() => {
    if (!projeto?.id || (requestedSection !== 'paises' && requestedSection !== 'auditoria')) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`project-${requestedSection}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projeto?.id, requestedSection]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="setup-page" aria-live="polite">
        <span className="dbc-text-2">Carregando projeto...</span>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="setup-page">
        <EmptyState title="Projeto não encontrado" message="O projeto pode ter sido removido ou você pode não ter mais acesso a ele." actionLabel="Voltar para projetos" onAction={() => navigate('/projetos')} />
      </div>
    );
  }

  const statusPreset = (PROJETO_CONFIG.statusPresets?.[projeto.status] ?? 'info') as StatusPreset;
  const historico = historicoData?.data ?? [];
  const totalTimes = timesData?.meta.total ?? 0;
  const totalPessoas = pessoasData?.meta.total ?? 0;
  const totalProdutos = produtosData?.meta.total ?? 0;

  function saveProject(dto: Partial<Projeto>) {
    updateMutation.mutate(
      { id: id!, dto },
      {
        onSuccess: () => {
          setEditOpen(false);
          setToast({ type: 'success', title: 'Projeto atualizado', message: 'As alterações foram salvas com sucesso.' });
        },
        onError: (error) => setToast({ type: 'error', title: 'Não foi possível salvar', message: getErrorMessage(error) }),
      },
    );
  }

  const summary = (
    <SectionCard padding="none" style={{ overflow: 'visible' }}>
      <div className="project-summary">
        <div className="project-summary__identity">
          <IconTile size="lg" tone="primary">
            <Icon name="folder" size={21} width={1.8} />
          </IconTile>
          <div className="project-summary__copy">
            <div className="project-summary__eyebrow">Projeto</div>
            <div className="project-summary__title-row">
              <h2>{projeto.nome}</h2>
              <Badge preset={statusPreset}>{projeto.status}</Badge>
            </div>
            <div className="project-summary__description">{projeto.descricao?.trim() || 'Sem descrição cadastrada.'}</div>
          </div>
        </div>

        <div className="project-summary__facts">
          <DetailValue label="Código" value={projeto.codigo} />
          <DetailValue label="Área de negócio" value={projeto.areaNegocio} />
          <DetailValue label="Responsável" value={projeto.responsavelPrincipal} />
          <DetailValue label="Última atualização" value={formatDateTimeBR(projeto.updatedAt)} />
        </div>
      </div>
    </SectionCard>
  );

  const rail = (
    <RightRail sticky>
      <SectionCard title="Setup do projeto" subtitle="Acompanhe e avance pelas próximas etapas." icon="clipboardCheck" padding="none">
        <div className="project-setup-links">
          <SetupLink icon="users" label="Times" description="Estrutura e responsáveis" count={totalTimes} loading={timesLoading} onClick={() => navigate(`/projetos/${id}/times`)} />
          <SetupLink icon="user" label="Pessoas" description="Papéis e responsabilidades" count={totalPessoas} loading={pessoasLoading} onClick={() => navigate(`/projetos/${id}/pessoas`)} />
          <SetupLink icon="box" label="Produtos" description="Produtos vinculados ao projeto" count={totalProdutos} loading={produtosLoading} onClick={() => navigate(`/projetos/${id}/produtos`)} />
          <SetupLink icon="network" label="Ecossistema" description="Dependências e consumo entre projetos" onClick={() => navigate(`/projetos/${id}/ecossistema`)} />
          <SetupLink icon="clipboardCheck" label="Mapa do conhecimento" description="Navegue pelas relações estruturadas deste projeto" onClick={() => navigate(`/conhecimento?projeto=${id}`)} />
          <SetupLink icon="clipboardCheck" label="Fontes" description="Proveniência e evidências do conhecimento" count={fontesResumo?.total} loading={fontesLoading} onClick={() => navigate(`/projetos/${id}/fontes`)} />
          <SetupLink icon="folder" label="Documentos" description="Conhecimento curado, versionado e reutilizável" count={documentosResumo?.total} loading={documentosLoading} onClick={() => navigate(`/projetos/${id}/documentos`)} />
        </div>
      </SectionCard>

      <div id="project-auditoria" className="project-sidebar-target" tabIndex={-1}>
      <SectionCard title="Histórico recente" subtitle="Últimas alterações registradas no projeto." icon="clock">
        {historicoLoading ? (
          <div className="project-history__empty">Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div className="project-history__empty">Nenhuma alteração registrada ainda.</div>
        ) : (
          <div className="project-history">
            {historico.map((item, index) => (
              <div className="project-history__item" key={`${item.ts}-${index}`}>
                <span className="project-history__dot" aria-hidden />
                <div className="project-history__copy">
                  <div className="project-history__label">{item.label}</div>
                  <div className="project-history__time">{item.actorNome ? `${item.actorNome} · ` : ''}{formatDateTimeBR(item.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      </div>
    </RightRail>
  );

  return (
    <>
      <SetupPage
        header={
          <SetupPageHeader
            breadcrumb={['Setup', 'Projetos', projeto.nome]}
            title="Detalhe do Projeto"
            subtitle="Revise o contexto do projeto e avance pelas etapas do setup de forma orientada."
            back={{ label: 'Voltar para projetos', onClick: () => navigate('/projetos') }}
            actions={
              <Button variant="default" icon="edit" onClick={() => setEditOpen(true)}>
                Editar projeto
              </Button>
            }
          />
        }
        afterStepper={summary}
        rail={rail}
      >
        <SectionCard title="Contexto do projeto" subtitle="Informações que orientam escopo, propósito e decisões do setup." icon="folder">
          <div className="project-detail-grid">
            <DetailValue label="Objetivo" value={projeto.objetivo} />
            <DetailValue label="Descrição" value={projeto.descricao} />
            <DetailValue label="Observações" value={projeto.observacoes} full />
          </div>
        </SectionCard>

        <SectionCard title="Configuração do projeto" subtitle="Metadados e referências compartilhadas por todo o projeto." icon="info">
          <div className="project-detail-grid project-detail-grid--compact">
            <DetailValue label="Área de negócio" value={projeto.areaNegocio} />
            <DetailValue label="Responsável principal" value={projeto.responsavelPrincipal} />
            <DetailValue label="Data de início" value={formatDateBR(projeto.dataInicio)} />
            <DetailValue label="Idiomas" value={projeto.idiomas?.length ? projeto.idiomas.join(', ') : '—'} />
            <DetailValue label="Referência Jira" value={projeto.jiraRef} />
            <DetailValue label="Referência Confluence" value={projeto.confluenceRef} />
          </div>
        </SectionCard>

        <div id="project-paises" className="project-sidebar-target" tabIndex={-1}>
        <SectionCard title="Cobertura do contexto" subtitle="Cadastros de apoio que delimitam onde o conhecimento deste Projeto se aplica." icon="network">
          <div className="project-list-manager-grid project-list-manager-grid--single">
            <ProjectListManager
              projetoId={id}
              title="Países disponíveis"
              description="Países que podem ser associados às estruturas do projeto."
              values={projeto.paisesDisponiveis ?? []}
              subResource="paises"
              placeholder="Ex.: Brasil"
              addLabel="País"
              onError={(title, message) => setToast({ type: 'error', title, message })}
            />
          </div>
        </SectionCard>
        </div>

        <KnowledgeSourcesCard entityType="Projeto" entityId={id} projetoId={id} title="Fontes que sustentam o contexto do Projeto" />

        <KnowledgeDocumentsCard entityType="Projeto" entityId={id} projetoId={id} title="Documentos que explicam o contexto do Projeto" />
      </SetupPage>

      <EntityFormModal config={PROJETO_CONFIG} open={editOpen} item={projeto} onClose={() => setEditOpen(false)} onSave={saveProject} saving={updateMutation.isPending} />
      <Toast open={!!toast} type={toast?.type} title={toast?.title} message={toast?.message} onClose={() => setToast(null)} />
    </>
  );
}
