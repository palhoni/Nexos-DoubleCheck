import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, DataTableCard, EmptyState, MetricCard, RightRail, SectionCard, type DataTableColumn } from '@/design-system';
import { useMyArea } from '@/entities/minha-area/minha-area.api';
import type { MyAreaPending, MyAreaPriority, MyAreaResponsibility } from '@/entities/minha-area/minha-area.types';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const PRIORITY: Record<MyAreaPriority, string> = { critical: 'Crítico', warning: 'Atenção', info: 'Acompanhar' };
const tone = (value: MyAreaPriority) => value === 'critical' ? 'erro' as const : value === 'warning' ? 'pendente' as const : 'info' as const;

export function MinhaAreaPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useMyArea();
  const [priority, setPriority] = useState<'all' | MyAreaPriority>('all');

  const pending = useMemo(() => (data?.pendings ?? []).filter((item) => priority === 'all' || item.priority === priority), [data?.pendings, priority]);
  const responsibilities = useMemo(() => data ? [
    ...data.responsibilities.projects.map((item) => ({ ...item, type: 'Projeto' })),
    ...data.responsibilities.products.map((item) => ({ ...item, type: 'Produto' })),
    ...data.responsibilities.modules.map((item) => ({ ...item, type: 'Módulo' })),
    ...data.responsibilities.functions.map((item) => ({ ...item, type: 'Funcionalidade' })),
  ] : [], [data]);

  const pendingColumns: DataTableColumn<MyAreaPending>[] = [
    { key: 'priority', header: 'Prioridade', width: 110, render: (item) => <Badge preset={tone(item.priority)}>{PRIORITY[item.priority]}</Badge> },
    { key: 'pending', header: 'Pendência', render: (item) => <div className="my-area-primary-cell"><strong>{item.title}</strong><span>{item.description}</span></div> },
    { key: 'entity', header: 'Entidade', width: 120, render: (item) => item.entityType },
    { key: 'project', header: 'Projeto', width: 190, render: (item) => item.projectName },
  ];

  const responsibilityColumns: DataTableColumn<MyAreaResponsibility & { type: string }>[] = [
    { key: 'type', header: 'Tipo', width: 130, render: (item) => <Badge preset="info">{item.type}</Badge> },
    { key: 'name', header: 'Conhecimento sob sua responsabilidade', render: (item) => <div className="my-area-primary-cell"><strong>{item.nome}</strong><span>{item.projectName}</span></div> },
    { key: 'project', header: 'Projeto', width: 190, render: (item) => item.projectName },
  ];

  const rail = data ? (
    <RightRail>
      <SectionCard title="Seu contexto">
        <div className="my-area-identity"><strong>{data.identity.nome}</strong><span>{data.identity.email}</span></div>
        <div className="my-area-context-list">
          <div><span>Projetos relacionados</span><strong>{data.summary.projects}</strong></div>
          <div><span>Times vinculados</span><strong>{data.identity.teams.length}</strong></div>
          <div><span>Conhecimento sob responsabilidade</span><strong>{data.summary.ownedKnowledge}</strong></div>
        </div>
        {data.linkageNote && <Alert type="info">{data.linkageNote}</Alert>}
      </SectionCard>
      <SectionCard title="Projetos no seu contexto">
        {data.projects.length ? <div className="my-area-projects">{data.projects.map((project) => <button type="button" key={project.id} onClick={() => navigate(`/projetos/${project.id}`)}><strong>{project.nome}</strong><span>{project.reasons.join(' · ')}</span></button>)}</div> : <p className="my-area-muted">Nenhum Projeto foi associado ao seu usuário pelos dados atuais.</p>}
      </SectionCard>
      <SectionCard title="Como esta área funciona">
        <p className="my-area-muted">O Nexus não cria tarefas artificiais. Esta visão reúne responsabilidades e pendências derivadas de dados já documentados.</p>
      </SectionCard>
    </RightRail>
  ) : undefined;

  return (
    <SetupPage stepper={false} header={<SetupPageHeader title="Minha Área" subtitle="O que exige sua atenção, o conhecimento sob sua responsabilidade e o contexto em que você atua no Nexus." actions={<Button variant="secondary" onClick={() => refetch()}>Atualizar</Button>} />} rail={rail}>
      <div className="my-area-page">
        {isError && <Alert type="error">Não foi possível carregar sua área de trabalho.</Alert>}
        <div className="my-area-metrics">
          <MetricCard label="Pendências" value={isLoading ? '…' : data?.summary.pending ?? 0} hint="derivadas da base" />
          <MetricCard label="Críticas" value={isLoading ? '…' : data?.summary.critical ?? 0} hint="prioridade imediata" />
          <MetricCard label="Fontes para revisar" value={isLoading ? '…' : data?.summary.sourcesToReview ?? 0} hint="sob sua responsabilidade" />
          <MetricCard label="Documentos" value={isLoading ? '…' : data?.summary.documentsToReview ?? 0} hint="rascunho ou revisão" />
        </div>

        <SectionCard title="Precisa da sua atenção" subtitle="Pendências reais encontradas somente em itens cuja responsabilidade está ligada ao seu nome ou e-mail.">
          <div className="my-area-filterbar">
            <label><span>Prioridade</span><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="all">Todas</option><option value="critical">Críticas</option><option value="warning">Atenção</option><option value="info">Acompanhar</option></select></label>
            <span>{pending.length} item(ns)</span>
          </div>
          <DataTableCard columns={pendingColumns} data={pending} rowKey={(item) => item.id} onRowClick={(item) => navigate(item.route)} empty={<EmptyState title="Nada exigindo sua atenção neste filtro" description="Quando uma responsabilidade sua gerar uma pendência objetiva, ela aparecerá aqui." />} />
        </SectionCard>

        <DataTableCard title="Conhecimento sob sua responsabilidade" subtitle="Projetos, Produtos, Módulos e Funcionalidades que apontam explicitamente você como responsável principal." columns={responsibilityColumns} data={responsibilities} rowKey={(item) => `${item.type}:${item.id}`} onRowClick={(item) => navigate(item.route)} empty={<EmptyState title="Nenhuma responsabilidade explícita encontrada" description="O Nexus só mostra aqui relações que consegue comprovar pelos dados atuais." />} />

        {data?.recentActivity.length ? <SectionCard title="Sua atividade recente" subtitle="Últimas alterações registradas no histórico com seu usuário."><div className="my-area-activity">{data.recentActivity.map((item) => <div key={item.id}><span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span><strong>{item.description || `${item.action} em ${item.entity}`}</strong><small>{item.entity}</small></div>)}</div></SectionCard> : null}
      </div>
    </SetupPage>
  );
}
