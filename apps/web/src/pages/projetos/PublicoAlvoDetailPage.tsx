import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { formatDateTimeBR } from '@/entities/crud/shared';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { publicoAlvoHooks } from '@/entities/publico-alvo/publico-alvo.hooks';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import type { PublicoAlvo } from '@/entities/publico-alvo/publico-alvo.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { ProductWorkspaceHeader, type ProductWorkspaceTabKey } from './ProductWorkspaceHeader';

function ChipList({ values, empty = 'Não informado' }: { values?: string[] | null; empty?: string }) {
  if (!values?.length) return <span className="dbc-text-3">{empty}</span>;
  return <div className="audience-chip-list">{values.map((value) => <span key={value}>{value}</span>)}</div>;
}

function EditableList({ title, subtitle, field, item, icon }: { title: string; subtitle: string; field: 'necessidades' | 'dores' | 'objetivos'; item: PublicoAlvo; icon: 'clipboardCheck' | 'warning' | 'chart' }) {
  const [value, setValue] = useState('');
  const addMutation = publicoAlvoHooks.useAddListItem(item.produtoId);
  const removeMutation = publicoAlvoHooks.useRemoveListItem(item.produtoId);
  const values = item[field] ?? [];

  function add() {
    const clean = value.trim();
    if (!clean || values.includes(clean)) return;
    addMutation.mutate({ id: item.id, subResource: field, valor: clean }, { onSuccess: () => setValue('') });
  }

  return (
    <SectionCard title={title} subtitle={subtitle} icon={icon} elevation="none">
      <div className="audience-inline-form">
        <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={`Adicionar ${title.toLowerCase()}`} />
        <Button variant="default" icon="plus" onClick={add} loading={addMutation.isPending}>Adicionar</Button>
      </div>
      {values.length ? <div className="audience-editable-list">{values.map((entry) => <div key={entry}><span>{entry}</span><Button variant="ghost" size="sm" icon="close" aria-label={`Remover ${entry}`} onClick={() => removeMutation.mutate({ id: item.id, subResource: field, valor: entry })} /></div>)}</div> : <span className="dbc-text-3">Nenhum item documentado.</span>}
    </SectionCard>
  );
}

export function PublicoAlvoDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId, publicoAlvoId } = useParams<{ projetoId: string; produtoId: string; publicoAlvoId: string }>();
  const publicoQuery = publicoAlvoHooks.useDetail(publicoAlvoId, produtoId);
  const produtoQuery = produtoHooks.useDetail(produtoId, projetoId);
  const projetoQuery = projetoHooks.useDetail(projetoId);
  const timesQuery = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const toggleMutation = publicoAlvoHooks.useToggleStatus(produtoId);
  const historyQuery = publicoAlvoHooks.useHistorico(publicoAlvoId, 1, 6, produtoId);

  const timeName = useMemo(() => (timesQuery.data?.data ?? []).find((x) => x.id === produtoQuery.data?.timeResponsavelId)?.nome, [timesQuery.data, produtoQuery.data]);
  if (!projetoId || !produtoId || !publicoAlvoId) return null;
  if (publicoQuery.isLoading || produtoQuery.isLoading) return <div className="main-pad"><span className="dbc-text-2">Carregando público...</span></div>;
  const item = publicoQuery.data;
  const produto = produtoQuery.data;
  if (!item || !produto) return <div className="main-pad"><EmptyState title="Público não encontrado" actionLabel="Voltar ao produto" onAction={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=publicoAlvo`)} /></div>;

  const navigateTab = (tab: ProductWorkspaceTabKey) => navigate(`/projetos/${projetoId}/produtos/${produtoId}${tab === 'overview' ? '' : `?tab=${tab}`}`);
  const history = historyQuery.data?.data ?? [];
  const completenessParts = [item.tipoUsuario, item.perfil || item.descricao, item.frequenciaUso, item.canaisUtilizados.length, item.paisesOndeSeAplica.length, item.necessidades.length, item.dores.length, item.objetivos.length];
  const completeness = Math.round((completenessParts.filter(Boolean).length / completenessParts.length) * 100);
  const productCountrySet = new Set(produto.paises ?? []);
  const projectCountrySet = new Set(projetoQuery.data?.paisesDisponiveis ?? []);
  const outsideProductScope = item.paisesOndeSeAplica.filter((country) => productCountrySet.size > 0 && !productCountrySet.has(country));
  const outsideProjectScope = item.paisesOndeSeAplica.filter((country) => projectCountrySet.size > 0 && !projectCountrySet.has(country));

  return (
    <SetupPage
      header={<SetupPageHeader breadcrumb={['Setup', 'Projetos', 'Produtos', produto.nome, 'Público-alvo']} title="Detalhe do Público" subtitle="Perfil, necessidades, dores e contexto de uso deste público." back={{ label: 'Voltar para públicos', onClick: () => navigate(`/projetos/${projetoId}/produtos/${produtoId}?tab=publicoAlvo`) }} />}
      afterStepper={<ProductWorkspaceHeader item={produto} timeName={timeName} activeTab="publicoAlvo" onTabChange={navigateTab} />}
      rail={<div className="audience-detail-rail">
        <SectionCard title="Resumo do público" icon="users" padding="compact">
          <div className="audience-profile-score"><strong>{completeness}%</strong><span>completude cadastral</span></div>
          <div className="audience-rail-facts"><div><span>Status</span><Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : 'inativo'}>{item.status}</Badge></div><div><span>Necessidades</span><strong>{item.necessidades.length}</strong></div><div><span>Dores</span><strong>{item.dores.length}</strong></div><div><span>Objetivos</span><strong>{item.objetivos.length}</strong></div></div>
        </SectionCard>
        <SectionCard title="Histórico recente" icon="clock" padding="compact">{historyQuery.isLoading ? <span className="dbc-text-2">Carregando...</span> : history.length ? <div className="audience-history">{history.map((entry, i) => <div key={`${entry.ts}-${i}`}><span /><div><strong>{entry.label}</strong><small>{entry.actorNome ? `${entry.actorNome} · ` : ''}{formatDateTimeBR(entry.ts)}</small></div></div>)}</div> : <span className="dbc-text-3">Nenhuma alteração registrada.</span>}</SectionCard>
      </div>}
    >
      <section className="audience-profile-summary">
        <div className="audience-profile-summary__identity"><span><Icon name="users" size={20} /></span><div><div><h2>{item.nome}</h2><Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : 'inativo'}>{item.status}</Badge></div><p>{item.perfil || item.descricao || 'Perfil ainda não documentado.'}</p></div></div>
        <div className="audience-profile-summary__actions"><Button variant="default" onClick={() => toggleMutation.mutate(item.id)}>{item.status === 'Ativo' ? 'Inativar' : 'Ativar'}</Button><Button variant="primary" icon="edit" onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/publico-alvo/${item.id}/editar`)}>Editar público</Button></div>
        <div className="audience-profile-summary__meta"><div><span>Tipo de usuário</span><strong>{item.tipoUsuario || 'Não informado'}</strong></div><div><span>Frequência de uso</span><strong>{item.frequenciaUso || 'Não informada'}</strong></div><div><span>Atualização</span><strong>{formatDateTimeBR(item.updatedAt)}</strong></div></div>
      </section>

      <div className="audience-detail-grid">
        <SectionCard title="Descrição e perfil" icon="user" elevation="none"><p className="audience-copy">{item.descricao || item.perfil || 'Não informado'}</p></SectionCard>
        <SectionCard title="Canais utilizados" icon="network" elevation="none"><ChipList values={item.canaisUtilizados} /></SectionCard>
        <SectionCard title="Países onde se aplica" subtitle="Escopo geográfico documentado para este público." icon="box" elevation="none"><ChipList values={item.paisesOndeSeAplica} />{outsideProductScope.length > 0 && <div className="audience-scope-alert"><Icon name="warning" size={14} /><div><strong>{outsideProductScope.length} país{outsideProductScope.length === 1 ? '' : 'es'} fora do escopo atual do Produto</strong><span>{outsideProductScope.join(', ')}</span></div></div>}{outsideProjectScope.length > 0 && <div className="audience-scope-alert audience-scope-alert--strong"><Icon name="warning" size={14} /><div><strong>Escopo não encontrado no Projeto</strong><span>{outsideProjectScope.join(', ')}</span></div></div>}</SectionCard>
        <EditableList title="Necessidades" subtitle="O que este público precisa obter do produto." field="necessidades" item={item} icon="clipboardCheck" />
        <EditableList title="Dores" subtitle="Problemas e fricções percebidos por este público." field="dores" item={item} icon="warning" />
        <EditableList title="Objetivos" subtitle="Resultados esperados por este público." field="objetivos" item={item} icon="chart" />
        {item.observacoes && <SectionCard title="Observações" icon="info" elevation="none"><p className="audience-copy">{item.observacoes}</p></SectionCard>}
      </div>
      <KnowledgeSourcesCard entityType="PublicoAlvo" entityId={publicoAlvoId} projetoId={projetoId} />
      <KnowledgeDocumentsCard entityType="PublicoAlvo" entityId={publicoAlvoId} projetoId={projetoId} />
    </SetupPage>
  );
}
