import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { EntityStatusBadge, formatDateTimeBR } from '@/entities/crud/shared';
import { funcionalidadeHooks } from '@/entities/funcionalidade/funcionalidade.hooks';
import { JORNADA_CONFIG } from '@/entities/jornada/jornada.config';
import { jornadaHooks } from '@/entities/jornada/jornada.hooks';
import { moduloHooks } from '@/entities/modulo/modulo.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { useAllProdutos } from '@/entities/produto/produto.globalApi';
import { publicoAlvoHooks } from '@/entities/publico-alvo/publico-alvo.hooks';
import { regraHooks } from '@/entities/regra/regra.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

function Copy({ label, value }: { label: string; value?: string | null }) {
  return <div className="knowledge-detail-field"><span>{label}</span><p className={value ? '' : 'knowledge-empty'}>{value || 'Não informado'}</p></div>;
}

export function JornadaDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, jornadaId } = useParams<{ projetoId: string; produtoId: string; jornadaId: string }>();
  const { data: item, isLoading } = jornadaHooks.useDetail(jornadaId, produtoId);
  const { data: produto } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: publicosData } = publicoAlvoHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: modulosData } = moduloHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: funcionalidadesData } = funcionalidadeHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: regrasData } = regraHooks.useList({ page: 1, pageSize: 100 }, produtoId);
  const { data: produtosGlobais } = useAllProdutos();
  const toggleMutation = jornadaHooks.useToggleStatus(produtoId);

  const publicoMap = useMemo(() => new Map((publicosData?.data ?? []).map((p) => [p.id, p.nome])), [publicosData]);
  const moduloMap = useMemo(() => new Map((modulosData?.data ?? []).map((m) => [m.id, m.nome])), [modulosData]);
  const funcMap = useMemo(() => new Map((funcionalidadesData?.data ?? []).map((f) => [f.id, f])), [funcionalidadesData]);
  const produtoMap = useMemo(() => new Map((produtosGlobais ?? []).map((p) => [p.id, p])), [produtosGlobais]);

  if (!projetoId || !produtoId || !jornadaId) return null;
  if (isLoading) return <div className="main-pad">Carregando jornada...</div>;
  if (!item) return <div className="main-pad"><EmptyState title="Jornada não encontrada" /></div>;

  const regras = (regrasData?.data ?? []).filter((r) => r.jornadaIds.includes(item.id));
  const participants = item.produtoParticipanteIds.map((id) => produtoMap.get(id)).filter(Boolean);
  const external = participants.filter((p) => p!.projetoId !== projetoId);
  const functions = item.funcionalidadeIds.map((id) => funcMap.get(id)).filter(Boolean);

  const rail = <div className="knowledge-detail-rail">
    <SectionCard title="Alcance da jornada" icon="network" padding="compact"><div className="knowledge-connection-metrics"><div><span>Etapas</span><strong>{item.etapas.length}</strong></div><div><span>Funcionalidades</span><strong>{functions.length}</strong></div><div><span>Regras</span><strong>{regras.length}</strong></div><div><span>Projetos externos</span><strong>{new Set(external.map((p) => p!.projetoId)).size}</strong></div></div></SectionCard>
    <SectionCard title="Qualidade do conhecimento" icon="chart" padding="compact"><div className="knowledge-checklist"><div className={item.objetivo ? 'is-ok' : ''}><Icon name={item.objetivo ? 'check' : 'info'} size={14} /><span>Objetivo</span></div><div className={item.eventoInicial ? 'is-ok' : ''}><Icon name={item.eventoInicial ? 'check' : 'info'} size={14} /><span>Evento inicial</span></div><div className={item.resultadoEsperado ? 'is-ok' : ''}><Icon name={item.resultadoEsperado ? 'check' : 'info'} size={14} /><span>Resultado esperado</span></div><div className={item.etapas.length ? 'is-ok' : ''}><Icon name={item.etapas.length ? 'check' : 'info'} size={14} /><span>Etapas documentadas</span></div></div></SectionCard>
  </div>;

  return <SetupPage header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', produto?.nome ?? 'Produto', 'Jornadas']} title="Detalhe da Jornada" subtitle="Visualize o fluxo ponta a ponta, suas etapas e o alcance entre produtos e projetos." back={{ label: 'Voltar para jornadas', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=jornadas`) }} />} rail={rail}>
    <div className="knowledge-detail">
      <SectionCard padding="none"><div className="knowledge-entity-hero"><div className="knowledge-entity-hero__icon"><Icon name="network" size={22} /></div><div className="knowledge-entity-hero__copy"><div className="knowledge-entity-hero__title"><h2>{item.nome}</h2><EntityStatusBadge config={JORNADA_CONFIG} value={item.status} /></div><p>{item.publicoAlvoId ? publicoMap.get(item.publicoAlvoId) ?? 'Público não localizado' : 'Sem público-alvo definido'} · atualizado em {formatDateTimeBR(item.updatedAt)}</p></div><div className="knowledge-entity-hero__actions"><Button variant="default" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button></div></div></SectionCard>

      <div className="knowledge-detail-grid"><SectionCard title="Contexto da jornada" icon="clipboardCheck" elevation="none"><Copy label="Descrição" value={item.descricao} /><Copy label="Objetivo" value={item.objetivo} /><Copy label="Evento inicial" value={item.eventoInicial} /><Copy label="Resultado esperado" value={item.resultadoEsperado} /></SectionCard><SectionCard title="Escopo" icon="box" elevation="none"><div className="knowledge-detail-field"><span>Países</span><div className="knowledge-chip-list">{item.paises.length ? item.paises.map((p) => <Badge key={p} preset="info">{p}</Badge>) : <p className="knowledge-empty">Não informado</p>}</div></div><div className="knowledge-detail-field"><span>Módulos</span><div className="knowledge-chip-list">{item.moduloIds.length ? item.moduloIds.map((id) => <Badge key={id} preset="info">{moduloMap.get(id) ?? 'Módulo não localizado'}</Badge>) : <p className="knowledge-empty">Não informado</p>}</div></div><Copy label="Observações" value={item.observacoes} /></SectionCard></div>

      <SectionCard title="Fluxo da jornada" subtitle="Sequência documentada de etapas. A ordem abaixo é a fonte estruturada do fluxo." icon="network">
        {item.etapas.length ? <div className="journey-flow">{item.etapas.map((etapa, index) => <div className="journey-flow__step" key={`${etapa}-${index}`}><span className="journey-flow__index">{index + 1}</span><div><strong>{etapa}</strong>{index === 0 && item.eventoInicial ? <small>Inicia em: {item.eventoInicial}</small> : null}{index === item.etapas.length - 1 && item.resultadoEsperado ? <small>Resultado: {item.resultadoEsperado}</small> : null}</div>{index < item.etapas.length - 1 && <span className="journey-flow__connector" />}</div>)}</div> : <EmptyState title="Etapas ainda não documentadas" message="Cadastre as etapas para tornar o fluxo navegável e analisável." />}
      </SectionCard>

      <SectionCard title="Conhecimento relacionado" icon="network"><div className="knowledge-relations-grid"><div><h4>Funcionalidades</h4>{functions.length ? functions.map((f) => <button key={f!.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/funcionalidades/${f!.id}`)}>{f!.nome}<span>{f!.codigo}</span></button>) : <p>Nenhuma funcionalidade relacionada.</p>}</div><div><h4>Regras</h4>{regras.length ? regras.map((r) => <button key={r.id} onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/regras/${r.id}`)}>{r.nome}<span>{r.prioridade ?? 'Sem prioridade'}</span></button>) : <p>Nenhuma regra relacionada.</p>}</div><div><h4>Produtos participantes</h4>{participants.length ? participants.map((p) => <button key={p!.id} onClick={() => navigate(`/projetos/${p!.projetoId}/produtos/${p!.id}`)}>{p!.nome}<span>{p!.projeto.nome}</span>{p!.projetoId !== projetoId && <Badge preset="analise">Cross-project</Badge>}</button>) : <p>Nenhum produto participante.</p>}</div></div></SectionCard>

      <KnowledgeSourcesCard entityType="Jornada" entityId={jornadaId} projetoId={projetoId} />

      <KnowledgeDocumentsCard entityType="Jornada" entityId={jornadaId} projetoId={projetoId} />
    </div>
  </SetupPage>;
}
