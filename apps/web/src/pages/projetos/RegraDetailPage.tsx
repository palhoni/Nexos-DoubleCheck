import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { EntityFormModal } from '@/entities/crud/EntityFormModal';
import { EntityStatusBadge, formatDateTimeBR, getErrorMessage } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { integracaoHooks } from '@/entities/integracao/integracao.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';
import { REGRA_CONFIG } from '@/entities/regra/regra.config';
import { regraHooks, useCriarNovaVersaoRegra, useVersoesRegra } from '@/entities/regra/regra.hooks';
import type { Regra } from '@/entities/regra/regra.types';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function priorityPreset(priority: Regra['prioridade']) {
  if (priority === 'Alta') return 'erro' as const;
  if (priority === 'Média') return 'pendente' as const;
  return 'info' as const;
}

function Copy({ label, value }: { label: string; value?: string | null }) {
  return <div className="knowledge-detail-field"><span>{label}</span><p className={value ? '' : 'knowledge-empty'}>{value || 'Não informado'}</p></div>;
}

export function RegraDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, regraId } = useParams<{ projetoId: string; produtoId: string; regraId: string }>();
  const { data: item, isLoading } = regraHooks.useDetail(regraId, produtoId);
  const { data: produto } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: integracoesData } = integracaoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: produtosGlobais } = useAllProdutos();
  const { data: versoes } = useVersoesRegra(regraId, produtoId);
  const toggleMutation = regraHooks.useToggleStatus(produtoId);
  const updateMutation = regraHooks.useUpdate(produtoId);
  const newVersionMutation = useCriarNovaVersaoRegra(produtoId);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modulos = modulosData?.data ?? [];
  const funcionalidades = funcionalidadesData?.data ?? [];
  const jornadas = jornadasData?.data ?? [];
  const moduloMap = useMemo(() => new Map(modulos.map((m) => [m.id, m])), [modulos]);
  const funcMap = useMemo(() => new Map(funcionalidades.map((f) => [f.id, f])), [funcionalidades]);
  const jornadaMap = useMemo(() => new Map(jornadas.map((j) => [j.id, j])), [jornadas]);
  const produtoMap = useMemo(() => new Map((produtosGlobais ?? []).map((p) => [p.id, p])), [produtosGlobais]);

  if (!projetoId || !produtoId || !regraId) return null;
  if (isLoading) return <div className="main-pad">Carregando regra...</div>;
  if (!item) return <div className="main-pad"><EmptyState title="Regra não encontrada" /></div>;

  const linkedModules = item.moduloIds.map((id) => moduloMap.get(id)).filter(Boolean);
  const linkedFunctions = item.funcionalidadeIds.map((id) => funcMap.get(id)).filter(Boolean);
  const linkedJourneys = item.jornadaIds.map((id) => jornadaMap.get(id)).filter(Boolean);
  const functionIds = new Set(item.funcionalidadeIds);
  const derivedIntegrations = (integracoesData?.data ?? []).filter((i) => i.funcionalidadeIds.some((id) => functionIds.has(id)));

  const externalProducts = new Map<string, string>();
  for (const integration of derivedIntegrations) {
    if (!integration.produtoRelacionadoId) continue;
    const related = produtoMap.get(integration.produtoRelacionadoId);
    if (related && related.projetoId !== projetoId) externalProducts.set(related.id, `${related.nome} · ${related.projeto.nome}`);
  }
  for (const journey of linkedJourneys) {
    if (!journey) continue;
    for (const id of journey.produtoParticipanteIds) {
      const related = produtoMap.get(id);
      if (related && related.projetoId !== projetoId) externalProducts.set(related.id, `${related.nome} · ${related.projeto.nome}`);
    }
  }

  const extraOptions = {
    modulos: modulos.map((m) => ({ value: m.id, label: m.nome })),
    funcionalidades: funcionalidades.map((f) => ({ value: f.id, label: f.nome })),
    jornadas: jornadas.map((j) => ({ value: j.id, label: j.nome })),
  };

  function save(dto: Partial<Regra>) {
    setError(null);
    updateMutation.mutate({ id: item!.id, dto }, {
      onSuccess: () => setEditOpen(false),
      onError: (e: unknown) => setError(getErrorMessage(e)),
    });
  }

  function createVersion() {
    setError(null);
    newVersionMutation.mutate(item!.id, {
      onSuccess: (nova) => navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${nova.id}`),
      onError: (e: unknown) => setError(getErrorMessage(e)),
    });
  }

  const completenessChecks = [
    { label: 'Condição documentada', ok: Boolean(item.condicao?.trim()) },
    { label: 'Resultado esperado', ok: Boolean(item.resultadoEsperado?.trim()) },
    { label: 'Prioridade definida', ok: Boolean(item.prioridade) },
    { label: 'Relacionamentos estruturados', ok: Boolean(item.moduloIds.length || item.funcionalidadeIds.length || item.jornadaIds.length) },
  ];

  const rail = (
    <div className="knowledge-detail-rail">
      <SectionCard title="Leitura da regra" icon="chart" padding="compact">
        <div className="knowledge-connection-metrics">
          <div><span>Módulos</span><strong>{linkedModules.length}</strong></div>
          <div><span>Funcionalidades</span><strong>{linkedFunctions.length}</strong></div>
          <div><span>Jornadas</span><strong>{linkedJourneys.length}</strong></div>
          <div><span>Versões</span><strong>{versoes?.length ?? 1}</strong></div>
        </div>
      </SectionCard>
      <SectionCard title="Qualidade do conhecimento" icon="clipboardCheck" padding="compact"><div className="knowledge-checklist">{completenessChecks.map((check) => <div key={check.label} className={check.ok ? 'is-ok' : ''}><Icon name={check.ok ? 'check' : 'info'} size={14} /><span>{check.label}</span></div>)}</div></SectionCard>
      {externalProducts.size > 0 && <SectionCard title="Alcance cross-project" subtitle="Derivado de jornadas e integrações relacionadas às funcionalidades desta regra." icon="network" padding="compact"><div className="knowledge-cross-project-list">{Array.from(externalProducts.entries()).map(([id, label]) => <button key={id} onClick={() => { const p = produtoMap.get(id); if (p) navigate(`/projetos/${p.projetoId}/produtos/${id}`); }}><Icon name="box" size={15} /><span>{label}</span><Badge preset="analise">Cross-project</Badge></button>)}</div></SectionCard>}
    </div>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', produto?.nome ?? 'Produto', 'Regras']} title="Detalhe da Regra" subtitle="Consulte a decisão de negócio, seus relacionamentos e a evolução das versões." back={{ label: 'Voltar para regras', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=regras`) }} />}
      rail={rail}
    >
      <div className="knowledge-detail">
        <SectionCard padding="none">
          <div className="knowledge-entity-hero knowledge-entity-hero--rule">
            <div className="knowledge-entity-hero__icon"><Icon name="clipboardCheck" size={22} /></div>
            <div className="knowledge-entity-hero__copy">
              <div className="knowledge-entity-hero__title"><h2>{item.nome}</h2><EntityStatusBadge config={REGRA_CONFIG} value={item.status} />{item.prioridade && <Badge preset={priorityPreset(item.prioridade)}>{item.prioridade}</Badge>}</div>
              <p>Versão {item.numeroVersao}{item.versaoAtual ? ' · atual' : ''} · atualizado em {formatDateTimeBR(item.updatedAt)}</p>
            </div>
            <div className="knowledge-entity-hero__actions"><Button variant="default" icon="edit" onClick={() => setEditOpen(true)}>Editar regra</Button>{item.versaoAtual && <Button variant="primary" onClick={createVersion} disabled={newVersionMutation.isPending}>{newVersionMutation.isPending ? 'Criando...' : 'Nova versão'}</Button>}<Button variant="ghost" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button></div>
          </div>
        </SectionCard>

        <div className="rule-decision-grid">
          <SectionCard title="SE — Condição" icon="info" elevation="none"><div className={`rule-decision-copy ${item.condicao ? '' : 'knowledge-empty'}`}>{item.condicao || 'Condição ainda não documentada.'}</div></SectionCard>
          <SectionCard title="ENTÃO — Resultado esperado" icon="check" elevation="none"><div className={`rule-decision-copy ${item.resultadoEsperado ? '' : 'knowledge-empty'}`}>{item.resultadoEsperado || 'Resultado esperado ainda não documentado.'}</div></SectionCard>
        </div>

        <SectionCard title="Onde esta regra se aplica" subtitle="Relações estruturadas que dão contexto à decisão de negócio." icon="network">
          <div className="knowledge-relations-grid">
            <div><h4>Módulos</h4>{linkedModules.length ? linkedModules.map((m) => <button key={m!.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/modulos/${m!.id}`)}>{m!.nome}<span>{m!.codigo}</span></button>) : <p>Nenhum módulo relacionado.</p>}</div>
            <div><h4>Funcionalidades</h4>{linkedFunctions.length ? linkedFunctions.map((f) => <button key={f!.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/funcionalidades/${f!.id}`)}>{f!.nome}<span>{f!.codigo}</span></button>) : <p>Nenhuma funcionalidade relacionada.</p>}</div>
            <div><h4>Jornadas</h4>{linkedJourneys.length ? linkedJourneys.map((j) => <button key={j!.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/jornadas/${j!.id}`)}>{j!.nome}<span>{j!.etapas.length} etapas</span></button>) : <p>Nenhuma jornada relacionada.</p>}</div>
          </div>
        </SectionCard>

        <div className="knowledge-detail-grid">
          <SectionCard title="Exceções" icon="info" elevation="none">{item.excecoes.length ? <div className="knowledge-list-lines">{item.excecoes.map((value, index) => <div key={`${value}-${index}`}><span>{index + 1}</span><p>{value}</p></div>)}</div> : <p className="knowledge-empty">Nenhuma exceção documentada.</p>}</SectionCard>
          <SectionCard title="Exemplos" icon="clipboardCheck" elevation="none">{item.exemplos.length ? <div className="knowledge-list-lines">{item.exemplos.map((value, index) => <div key={`${value}-${index}`}><span>{index + 1}</span><p>{value}</p></div>)}</div> : <p className="knowledge-empty">Nenhum exemplo documentado.</p>}</SectionCard>
        </div>

        <SectionCard title="Evolução da regra" subtitle="Versionamento real do mesmo grupo de regra. Nada é perdido quando a decisão evolui." icon="chart">
          {versoes?.length ? <div className="rule-version-timeline">{[...versoes].sort((a, b) => b.numeroVersao - a.numeroVersao).map((version) => <button key={version.id} className={version.id === item.id ? 'is-current' : ''} onClick={() => version.id !== item.id && navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${version.id}`)}><span className="rule-version-timeline__dot" /><div><strong>v{version.numeroVersao} · {version.nome}</strong><small>{version.versaoAtual ? 'Versão atual' : 'Versão anterior'} · {formatDateTimeBR(version.createdAt)}</small></div><EntityStatusBadge config={REGRA_CONFIG} value={version.status} /></button>)}</div> : <EmptyState title="Histórico de versões indisponível" />}
        </SectionCard>

        <SectionCard title="Observações" icon="info" elevation="none"><Copy label="Observações adicionais" value={item.observacoes} /><div className="knowledge-detail-field"><span>Vigência</span><p>{item.vigenciaInicio || item.vigenciaFim ? `${item.vigenciaInicio || 'sem início'} → ${item.vigenciaFim || 'sem fim'}` : 'Não definida'}</p></div></SectionCard>

        {error && <div className="knowledge-error">{error}</div>}
        <EntityFormModal config={REGRA_CONFIG} open={editOpen} item={item} onClose={() => setEditOpen(false)} onSave={save} saving={updateMutation.isPending} extraOptions={extraOptions} />
        <KnowledgeSourcesCard entityType="Regra" entityId={regraId} projetoId={projetoId} />
        <KnowledgeDocumentsCard entityType="Regra" entityId={regraId} projetoId={projetoId} />
      </div>
    </SetupPage>
  );
}
