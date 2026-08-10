import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, formatDateTimeBR, getErrorMessage } from '@/entities/crud/shared';
import { INTEGRACAO_CONFIG } from '@/entities/integracao/integracao.config';
import { integracaoHooks } from '@/entities/integracao/integracao.hooks';
import type { Integracao } from '@/entities/integracao/integracao.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function criticidadePreset(value?: string | null) {
  if (value === 'Alta') return 'erro' as const;
  if (value === 'Média') return 'pendente' as const;
  if (value === 'Baixa') return 'sucesso' as const;
  return 'info' as const;
}

function Field({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return <div className="knowledge-detail-field"><span>{label}</span><p className={`${value ? '' : 'knowledge-empty'}${mono ? ' integration-mono' : ''}`}>{value || 'Não informado'}</p></div>;
}

export function IntegracaoDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, integracaoId } = useParams<{ projetoId: string; produtoId: string; integracaoId: string }>();
  const { data: item, isLoading } = integracaoHooks.useDetail(integracaoId, produtoId);
  const { data: historyData } = integracaoHooks.useHistorico(integracaoId, 1, 8, produtoId);
  const { data: produto } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const { data: produtosGlobais } = useAllProdutos();
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const updateMutation = integracaoHooks.useUpdate(produtoId);
  const toggleMutation = integracaoHooks.useToggleStatus(produtoId);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = produtosGlobais ?? [];
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const related = item?.produtoRelacionadoId ? productMap.get(item.produtoRelacionadoId) : undefined;
  const funcionalidades = funcionalidadesData?.data ?? [];
  const funcionalidadeMap = useMemo(() => new Map(funcionalidades.map((f) => [f.id, f])), [funcionalidades]);
  const linkedFunctions = item?.funcionalidadeIds.map((id) => funcionalidadeMap.get(id)).filter(Boolean) ?? [];
  const ownerTeam = timesData?.data.find((t) => t.id === item?.timeProprietarioId);
  const isCrossProject = Boolean(related && related.projetoId !== projetoId);

  if (!projetoId || !produtoId || !integracaoId) return null;
  if (isLoading) return <div className="main-pad">Carregando integração...</div>;
  if (!item) return <div className="main-pad"><EmptyState title="Integração não encontrada" /></div>;

  const origin = item.direcao === 'Entrada' ? related : productMap.get(produtoId);
  const destination = item.direcao === 'Entrada' ? productMap.get(produtoId) : related;
  const bidirectional = item.direcao === 'Bidirecional';
  const completenessChecks = [
    { label: 'Produto relacionado', ok: Boolean(item.produtoRelacionadoId) },
    { label: 'Direção definida', ok: Boolean(item.direcao) },
    { label: 'Tipo técnico', ok: Boolean(item.tipo) },
    { label: 'Criticidade', ok: Boolean(item.criticidade) },
    { label: 'Contrato / canal', ok: Boolean(item.endpoint?.trim()) },
    { label: 'Dados trafegados', ok: Boolean(item.dadosTrafegados?.trim()) },
    { label: 'Time proprietário', ok: Boolean(item.timeProprietarioId) },
    { label: 'Funcionalidades relacionadas', ok: item.funcionalidadeIds.length > 0 },
  ];
  const completeness = Math.round((completenessChecks.filter((check) => check.ok).length / completenessChecks.length) * 100);
  const extraOptions = {
    times: timesData?.data.map((t) => ({ value: t.id, label: t.nome })) ?? [],
    produtosRelacionados: products.filter((p) => p.id !== produtoId).map((p) => ({ value: p.id, label: `${p.nome} · ${p.projeto.nome}` })),
    funcionalidades: funcionalidades.map((f) => ({ value: f.id, label: f.nome })),
  };

  function save(dto: Partial<Integracao>) {
    setError(null);
    updateMutation.mutate({ id: item!.id, dto }, {
      onSuccess: () => setEditOpen(false),
      onError: (e: unknown) => setError(getErrorMessage(e)),
    });
  }

  const rail = (
    <div className="knowledge-detail-rail">
      <SectionCard title="Qualidade do conhecimento" icon="clipboardCheck" padding="compact">
        <div className="integration-quality-score"><strong>{completeness}%</strong><span>documentação essencial</span></div>
        <div className="knowledge-checklist">{completenessChecks.map((check) => <div key={check.label} className={check.ok ? 'is-ok' : ''}><Icon name={check.ok ? 'check' : 'info'} size={14} /><span>{check.label}</span></div>)}</div>
      </SectionCard>
      <SectionCard title="Governança" icon="users" padding="compact">
        <div className="integration-governance-list"><div><span>Time proprietário</span><strong>{ownerTeam?.nome ?? 'Não definido'}</strong></div><div><span>Produto proprietário</span><strong>{produto?.nome ?? 'Produto atual'}</strong></div><div><span>Projeto proprietário</span><strong>{produto?.projetoId === projetoId ? 'Projeto atual' : projetoId}</strong></div><div><span>Última atualização</span><strong>{formatDateTimeBR(item.updatedAt)}</strong></div></div>
      </SectionCard>
      {isCrossProject && related && <SectionCard title="Dependência cross-project" subtitle="A relação atravessa a fronteira organizacional do projeto, mas permanece rastreável pela integração real." icon="network" padding="compact"><button type="button" className="integration-related-project" onClick={() => navigate(`/projetos/${related.projetoId}/produtos/${related.id}`)}><Icon name="box" size={16} /><span><strong>{related.nome}</strong><small>{related.projeto.nome}</small></span><Badge preset="analise">Cross-project</Badge></button></SectionCard>}
    </div>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', produto?.nome ?? 'Produto', 'Integrações']} title="Detalhe da Integração" subtitle="Entenda o fluxo, o contrato documentado, a governança e o alcance desta dependência." back={{ label: 'Voltar para integrações', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=integracoes`) }} />}
      rail={rail}
    >
      <div className="knowledge-detail integration-detail">
        <SectionCard padding="none">
          <div className="knowledge-entity-hero integration-entity-hero">
            <div className="knowledge-entity-hero__icon"><Icon name="network" size={22} /></div>
            <div className="knowledge-entity-hero__copy"><div className="knowledge-entity-hero__title"><h2>{item.nome}</h2><EntityStatusBadge config={INTEGRACAO_CONFIG} value={item.status} />{item.criticidade && <Badge preset={criticidadePreset(item.criticidade)}>{item.criticidade}</Badge>}{isCrossProject && <Badge preset="analise">Cross-project</Badge>}</div><p>{item.tipo ?? 'Tipo não informado'} · {item.modo ?? 'Modo não informado'} · atualizado em {formatDateTimeBR(item.updatedAt)}</p></div>
            <div className="knowledge-entity-hero__actions"><Button variant="default" icon="network" onClick={() => navigate(`/integracoes?produto=${produtoId}&integracao=${item.id}`)}>Ver no mapa</Button><Button variant="default" icon="edit" onClick={() => setEditOpen(true)}>Editar integração</Button><Button variant="ghost" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button></div>
          </div>
        </SectionCard>

        <SectionCard title="Fluxo da dependência" subtitle="Leitura visual da direção registrada nesta integração." icon="network">
          <div className={`integration-flow-card${bidirectional ? ' integration-flow-card--bidirectional' : ''}`}>
            <button type="button" className="integration-flow-node" onClick={() => origin && navigate(`/projetos/${origin.projetoId}/produtos/${origin.id}`)} disabled={!origin}><span>Origem</span><strong>{origin?.nome ?? 'Não documentada'}</strong><small>{origin?.projeto.nome ?? 'Projeto não identificado'}</small></button>
            <div className="integration-flow-connector"><span>{bidirectional ? '↔' : '→'}</span><strong>{item.tipo ?? 'Integração'}</strong><small>{item.papelDependencia ?? 'Papel não informado'}</small></div>
            <button type="button" className="integration-flow-node" onClick={() => destination && navigate(`/projetos/${destination.projetoId}/produtos/${destination.id}`)} disabled={!destination}><span>Destino</span><strong>{destination?.nome ?? (bidirectional && related ? related.nome : 'Não documentado')}</strong><small>{destination?.projeto.nome ?? (related?.projeto.nome || 'Projeto não identificado')}</small></button>
          </div>
          {bidirectional && <p className="integration-flow-note"><Icon name="info" size={14} /> O cadastro indica troca bidirecional. Origem e destino são apresentados como contexto visual, não como uma única direção exclusiva.</p>}
        </SectionCard>

        <div className="knowledge-detail-grid integration-detail-grid">
          <SectionCard title="Contrato e transporte" icon="zap" elevation="none"><Field label="Endpoint / Evento / Fila / Tabela / Arquivo" value={item.endpoint} mono /><Field label="Tipo" value={item.tipo} /><Field label="Modo" value={item.modo} /><Field label="Papel da dependência" value={item.papelDependencia} /></SectionCard>
          <SectionCard title="Semântica do fluxo" icon="clipboardCheck" elevation="none"><Field label="Dados trafegados" value={item.dadosTrafegados} /><Field label="Direção" value={item.direcao} /><Field label="Criticidade" value={item.criticidade} /><Field label="Observações" value={item.observacoes} /></SectionCard>
        </div>

        <SectionCard title="Funcionalidades dependentes" subtitle="Funcionalidades do produto atual explicitamente ligadas a esta integração." icon="box">
          {linkedFunctions.length ? <div className="knowledge-relations-grid"><div><h4>Funcionalidades</h4>{linkedFunctions.map((f) => <button key={f!.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/funcionalidades/${f!.id}`)}>{f!.nome}<span>{f!.codigo}</span></button>)}</div></div> : <EmptyState icon="box" title="Nenhuma funcionalidade relacionada" message="Relacionar funcionalidades melhora a rastreabilidade funcional desta dependência." />}
        </SectionCard>

        <SectionCard title="Histórico recente" subtitle="Rastreabilidade das alterações registradas para esta integração." icon="clock">
          {(historyData?.data?.length ?? 0) > 0 ? <div className="knowledge-history-timeline">{historyData!.data.map((entry, index) => <div key={`${entry.ts}-${index}`}><span className="knowledge-history-timeline__dot" /><div><strong>{entry.label}</strong><small>{entry.actorNome ? `${entry.actorNome} · ` : ''}{formatDateTimeBR(entry.ts)}</small></div></div>)}</div> : <EmptyState icon="clock" title="Sem histórico registrado" />}
        </SectionCard>

        <KnowledgeSourcesCard entityType="Integracao" entityId={integracaoId} projetoId={projetoId} />

        <KnowledgeDocumentsCard entityType="Integracao" entityId={integracaoId} projetoId={projetoId} />

        {error && <div className="knowledge-error">{error}</div>}
        <EntityFormModal config={INTEGRACAO_CONFIG} open={editOpen} item={item} onClose={() => setEditOpen(false)} onSave={save} saving={updateMutation.isPending} extraOptions={extraOptions} />
      </div>
    </SetupPage>
  );
}
