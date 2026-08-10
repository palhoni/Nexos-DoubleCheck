import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { EntityStatusBadge, formatDateTimeBR } from '@/entities/crud/shared';
import { FUNCIONALIDADE_CONFIG } from '@/entities/funcionalidade/funcionalidade.config';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { integracaoHooks } from '@/entities/integracao/integracao.hooks';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';
import { regraHooks } from '@/entities/regra/regra.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return <div className="knowledge-detail-field"><span>{label}</span><p className={value ? '' : 'knowledge-empty'}>{value || 'Não informado'}</p></div>;
}

export function FuncionalidadeDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, funcionalidadeId } = useParams<{ projetoId: string; produtoId: string; funcionalidadeId: string }>();
  const { data: item, isLoading } = funcionalidadeHooks.useDetail(funcionalidadeId, produtoId);
  const { data: produto } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: jornadasData } = jornadaHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: integracoesData } = integracaoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: produtosGlobais } = useAllProdutos();
  const toggleMutation = funcionalidadeHooks.useToggleStatus(produtoId);

  const moduloMap = useMemo(() => new Map((modulosData?.data ?? []).map((m) => [m.id, m.nome])), [modulosData]);
  const produtoMap = useMemo(() => new Map((produtosGlobais ?? []).map((p) => [p.id, p])), [produtosGlobais]);

  if (!projetoId || !produtoId || !funcionalidadeId) return null;
  if (isLoading) return <div className="main-pad">Carregando funcionalidade...</div>;
  if (!item) return <div className="main-pad"><EmptyState title="Funcionalidade não encontrada" /></div>;

  const jornadas = (jornadasData?.data ?? []).filter((j) => j.funcionalidadeIds.includes(item.id));
  const regras = (regrasData?.data ?? []).filter((r) => r.funcionalidadeIds.includes(item.id));
  const integracoes = (integracoesData?.data ?? []).filter((i) => i.funcionalidadeIds.includes(item.id));
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

  const rail = (
    <div className="knowledge-detail-rail">
      <SectionCard title="Conexões do conhecimento" icon="network" padding="compact">
        <div className="knowledge-connection-metrics">
          <div><span>Jornadas</span><strong>{jornadas.length}</strong></div>
          <div><span>Regras</span><strong>{regras.length}</strong></div>
          <div><span>Integrações</span><strong>{integracoes.length}</strong></div>
          <div><span>Produtos externos</span><strong>{externalProducts.size}</strong></div>
        </div>
      </SectionCard>
      <SectionCard title="Qualidade do conhecimento" icon="chart" padding="compact">
        <div className="knowledge-checklist">
          <div className={item.descricao ? 'is-ok' : ''}><Icon name={item.descricao ? 'check' : 'info'} size={14} /><span>Descrição</span></div>
          <div className={item.objetivo ? 'is-ok' : ''}><Icon name={item.objetivo ? 'check' : 'info'} size={14} /><span>Objetivo</span></div>
          <div className={item.comportamentoEsperado ? 'is-ok' : ''}><Icon name={item.comportamentoEsperado ? 'check' : 'info'} size={14} /><span>Comportamento esperado</span></div>
          <div className={jornadas.length || regras.length || integracoes.length ? 'is-ok' : ''}><Icon name={jornadas.length || regras.length || integracoes.length ? 'check' : 'info'} size={14} /><span>Relacionamentos estruturados</span></div>
        </div>
      </SectionCard>
    </div>
  );

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', produto?.nome ?? 'Produto', 'Funcionalidades']} title="Detalhe da Funcionalidade" subtitle="Entenda o comportamento e onde esta capacidade participa do ecossistema de conhecimento." back={{ label: 'Voltar para funcionalidades', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=funcionalidades`) }} />}
      rail={rail}
    >
      <div className="knowledge-detail">
        <SectionCard padding="none" elevation="xs">
          <div className="knowledge-entity-hero">
            <div className="knowledge-entity-hero__icon"><Icon name="box" size={22} /></div>
            <div className="knowledge-entity-hero__copy"><div className="knowledge-entity-hero__title"><h2>{item.nome}</h2><EntityStatusBadge config={FUNCIONALIDADE_CONFIG} value={item.status} /></div><p>{item.codigo} · {item.moduloId ? moduloMap.get(item.moduloId) ?? 'Módulo não localizado' : 'Sem módulo associado'}</p></div>
            <div className="knowledge-entity-hero__actions"><Button variant="default" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button></div>
          </div>
        </SectionCard>

        <div className="knowledge-detail-grid">
          <SectionCard title="Comportamento funcional" icon="clipboardCheck" elevation="none"><TextBlock label="Descrição" value={item.descricao} /><TextBlock label="Objetivo" value={item.objetivo} /><TextBlock label="Comportamento esperado" value={item.comportamentoEsperado} /><TextBlock label="Usuários" value={item.usuarios} /></SectionCard>
          <SectionCard title="Responsabilidade" icon="users" elevation="none"><TextBlock label="Responsável principal" value={item.responsavelPrincipal} /><TextBlock label="Observações" value={item.observacoes} /><div className="knowledge-detail-field"><span>Última atualização</span><p>{formatDateTimeBR(item.updatedAt)}</p></div></SectionCard>
        </div>

        <SectionCard title="Relacionamentos" subtitle="Evidências estruturadas de onde esta funcionalidade é usada." icon="network">
          <div className="knowledge-relations-grid">
            <div><h4>Jornadas</h4>{jornadas.length ? jornadas.map((j) => <button key={j.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/jornadas/${j.id}`)}>{j.nome}<span>{j.etapas.length} etapas</span></button>) : <p>Nenhuma jornada relacionada.</p>}</div>
            <div><h4>Regras</h4>{regras.length ? regras.map((r) => <button key={r.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${r.id}`)}>{r.nome}<span>{r.prioridade ?? 'Sem prioridade'}</span></button>) : <p>Nenhuma regra relacionada.</p>}</div>
            <div><h4>Integrações</h4>{integracoes.length ? integracoes.map((i) => <button key={i.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/integracoes/${i.id}`)}>{i.nome}<span>{i.tipo ?? 'Tipo não informado'} · {i.criticidade ?? 'Sem criticidade'}</span></button>) : <p>Nenhuma integração relacionada.</p>}</div>
          </div>
        </SectionCard>

        {externalProducts.size > 0 && <SectionCard title="Alcance cross-project" subtitle="Produtos de outros projetos conectados por jornadas ou integrações desta funcionalidade." icon="network"><div className="knowledge-cross-project-list">{Array.from(externalProducts.entries()).map(([id, label]) => <button key={id} onClick={() => { const p = produtoMap.get(id); if (p) navigate(`/projetos/${p.projetoId}/produtos/${id}`); }}><Icon name="box" size={15} /><span>{label}</span><Badge preset="analise">Cross-project</Badge></button>)}</div></SectionCard>}
        <KnowledgeSourcesCard entityType="Funcionalidade" entityId={funcionalidadeId} projetoId={projetoId} />
        <KnowledgeDocumentsCard entityType="Funcionalidade" entityId={funcionalidadeId} projetoId={projetoId} />
      </div>
    </SetupPage>
  );
}
