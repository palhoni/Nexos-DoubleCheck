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
import { MODULO_CONFIG } from '@/entities/modulo/modulo.config';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import type { Modulo } from '@/entities/modulo/modulo.types';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';
import { regraHooks } from '@/entities/regra/regra.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function Copy({ label, value }: { label: string; value?: string | null }) {
  return <div className="knowledge-detail-field"><span>{label}</span><p className={value ? '' : 'knowledge-empty'}>{value || 'Não informado'}</p></div>;
}

export function ModuloDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, moduloId } = useParams<{ projetoId: string; produtoId: string; moduloId: string }>();
  const { data: item, isLoading } = moduloHooks.useDetail(moduloId, produtoId);
  const { data: produto } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: integracoesData } = integracaoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: produtosGlobais } = useAllProdutos();
  const toggleMutation = moduloHooks.useToggleStatus(produtoId);
  const updateMutation = moduloHooks.useUpdate(produtoId);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const produtoMap = useMemo(() => new Map((produtosGlobais ?? []).map((p) => [p.id, p])), [produtosGlobais]);

  if (!projetoId || !produtoId || !moduloId) return null;
  if (isLoading) return <div className="main-pad">Carregando módulo...</div>;
  if (!item) return <div className="main-pad"><EmptyState title="Módulo não encontrado" /></div>;

  const funcionalidades = (funcionalidadesData?.data ?? []).filter((f) => f.moduloId === item.id);
  const funcionalidadeIds = new Set(funcionalidades.map((f) => f.id));
  const jornadas = (jornadasData?.data ?? []).filter((j) => j.moduloIds.includes(item.id) || j.funcionalidadeIds.some((id) => funcionalidadeIds.has(id)));
  const regras = (regrasData?.data ?? []).filter((r) => r.moduloIds.includes(item.id) || r.funcionalidadeIds.some((id) => funcionalidadeIds.has(id)));
  const integracoes = (integracoesData?.data ?? []).filter((i) => i.funcionalidadeIds.some((id) => funcionalidadeIds.has(id)));

  const externalProducts = new Map<string, string>();
  for (const integracao of integracoes) {
    if (!integracao.produtoRelacionadoId) continue;
    const related = produtoMap.get(integracao.produtoRelacionadoId);
    if (related && related.projetoId !== projetoId) externalProducts.set(related.id, `${related.nome} · ${related.projeto.nome}`);
  }
  for (const jornada of jornadas) {
    for (const id of jornada.produtoParticipanteIds) {
      const related = produtoMap.get(id);
      if (related && related.projetoId !== projetoId) externalProducts.set(related.id, `${related.nome} · ${related.projeto.nome}`);
    }
  }

  function save(dto: Partial<Modulo>) {
    setError(null);
    updateMutation.mutate({ id: item!.id, dto }, {
      onSuccess: () => setEditOpen(false),
      onError: (e: unknown) => setError(getErrorMessage(e)),
    });
  }

  const rail = (
    <div className="knowledge-detail-rail">
      <SectionCard title="Conexões do módulo" icon="network" padding="compact">
        <div className="knowledge-connection-metrics">
          <div><span>Funcionalidades</span><strong>{funcionalidades.length}</strong></div>
          <div><span>Jornadas</span><strong>{jornadas.length}</strong></div>
          <div><span>Regras</span><strong>{regras.length}</strong></div>
          <div><span>Integrações</span><strong>{integracoes.length}</strong></div>
        </div>
      </SectionCard>
      <SectionCard title="Qualidade do conhecimento" icon="chart" padding="compact">
        <div className="knowledge-checklist">
          <div className={item.descricao ? 'is-ok' : ''}><Icon name={item.descricao ? 'check' : 'info'} size={14} /><span>Descrição</span></div>
          <div className={item.objetivo ? 'is-ok' : ''}><Icon name={item.objetivo ? 'check' : 'info'} size={14} /><span>Objetivo</span></div>
          <div className={item.responsavelPrincipal ? 'is-ok' : ''}><Icon name={item.responsavelPrincipal ? 'check' : 'info'} size={14} /><span>Responsável definido</span></div>
          <div className={funcionalidades.length ? 'is-ok' : ''}><Icon name={funcionalidades.length ? 'check' : 'info'} size={14} /><span>Funcionalidades associadas</span></div>
        </div>
      </SectionCard>
      {externalProducts.size > 0 && <SectionCard title="Alcance cross-project" icon="network" padding="compact"><div className="knowledge-cross-project-list">{Array.from(externalProducts.entries()).map(([id, label]) => <button key={id} onClick={() => { const p = produtoMap.get(id); if (p) navigate(`/projetos/${p.projetoId}/produtos/${id}`); }}><Icon name="box" size={15} /><span>{label}</span><Badge preset="analise">Cross-project</Badge></button>)}</div></SectionCard>}
    </div>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', produto?.nome ?? 'Produto', 'Módulos']} title="Detalhe do Módulo" subtitle="Veja como este módulo organiza funcionalidades e se conecta às demais camadas de conhecimento." back={{ label: 'Voltar para módulos', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=modulos`) }} />}
      rail={rail}
    >
      <div className="knowledge-detail">
        <SectionCard padding="none">
          <div className="knowledge-entity-hero">
            <div className="knowledge-entity-hero__icon"><Icon name="box" size={22} /></div>
            <div className="knowledge-entity-hero__copy"><div className="knowledge-entity-hero__title"><h2>{item.nome}</h2><EntityStatusBadge config={MODULO_CONFIG} value={item.status} /></div><p>{item.codigo} · atualizado em {formatDateTimeBR(item.updatedAt)}</p></div>
            <div className="knowledge-entity-hero__actions"><Button variant="default" icon="edit" onClick={() => setEditOpen(true)}>Editar módulo</Button><Button variant="ghost" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button></div>
          </div>
        </SectionCard>

        <div className="knowledge-detail-grid">
          <SectionCard title="Contexto do módulo" icon="clipboardCheck" elevation="none"><Copy label="Descrição" value={item.descricao} /><Copy label="Objetivo" value={item.objetivo} /></SectionCard>
          <SectionCard title="Governança" icon="users" elevation="none"><Copy label="Responsável principal" value={item.responsavelPrincipal} /><div className="knowledge-detail-field"><span>Ordem de exibição</span><p>{item.ordemExibicao ?? 'Não definida'}</p></div><Copy label="Observações" value={item.observacoes} /></SectionCard>
        </div>

        <SectionCard title="Rede de conhecimento do módulo" subtitle="Relações estruturadas derivadas dos cadastros reais do produto." icon="network">
          <div className="knowledge-relations-grid knowledge-relations-grid--four">
            <div><h4>Funcionalidades</h4>{funcionalidades.length ? funcionalidades.map((f) => <button key={f.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/funcionalidades/${f.id}`)}>{f.nome}<span>{f.codigo}</span></button>) : <p>Nenhuma funcionalidade associada.</p>}</div>
            <div><h4>Jornadas</h4>{jornadas.length ? jornadas.map((j) => <button key={j.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/jornadas/${j.id}`)}>{j.nome}<span>{j.etapas.length} etapas</span></button>) : <p>Nenhuma jornada relacionada.</p>}</div>
            <div><h4>Regras</h4>{regras.length ? regras.map((r) => <button key={r.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${r.id}`)}>{r.nome}<span>{r.prioridade ?? 'Sem prioridade'}</span></button>) : <p>Nenhuma regra relacionada.</p>}</div>
            <div><h4>Integrações</h4>{integracoes.length ? integracoes.map((i) => <button key={i.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/integracoes/${i.id}`)}>{i.nome}<span>{i.tipo ?? 'Tipo não informado'} · {i.criticidade ?? 'Sem criticidade'}</span></button>) : <p>Nenhuma integração derivada das funcionalidades deste módulo.</p>}</div>
          </div>
        </SectionCard>

        <KnowledgeSourcesCard entityType="Modulo" entityId={moduloId} projetoId={projetoId} />

        <KnowledgeDocumentsCard entityType="Modulo" entityId={moduloId} projetoId={projetoId} />

        {error && <div className="knowledge-error">{error}</div>}
        <EntityFormModal config={MODULO_CONFIG} open={editOpen} item={item} onClose={() => setEditOpen(false)} onSave={save} saving={updateMutation.isPending} />
      </div>
    </SetupPage>
  );
}
