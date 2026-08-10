import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, EmptyState, MetricCard, Pagination, RightRail, SectionCard } from '@/design-system';
import { useActivityFeed } from '@/entities/atividade/atividade.api';
import type { ActivityItem } from '@/entities/atividade/atividade.types';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';

const ENTITY_LABEL: Record<string, string> = {
  Projeto: 'Projeto', Time: 'Time', Pessoa: 'Pessoa', Produto: 'Produto', PublicoAlvo: 'Público',
  Modulo: 'Módulo', Funcionalidade: 'Funcionalidade', Jornada: 'Jornada', Regra: 'Regra',
  Integracao: 'Integração', Fonte: 'Fonte', Documento: 'Documento',
};

const ENTITY_TYPES = Object.keys(ENTITY_LABEL);

function dateKey(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(date, today)) return 'Hoje';
  if (same(date, yesterday)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function eventTone(label: string) {
  const value = label.toLowerCase();
  if (value.includes('criad') || value.includes('vinculad') || value.includes('publicad')) return 'ativo' as const;
  if (value.includes('inativ') || value.includes('arquivad') || value.includes('desvinculad')) return 'erro' as const;
  if (value.includes('revis') || value.includes('versão') || value.includes('versao')) return 'pendente' as const;
  return 'info' as const;
}

function TimelineItem({ item, onOpen }: { item: ActivityItem; onOpen: () => void }) {
  const context = [item.context.projectName, item.context.productName].filter(Boolean).join(' · ');
  return (
    <article className="nexus-activity-item">
      <div className={`nexus-activity-marker nexus-activity-marker--${eventTone(item.label)}`} aria-hidden="true" />
      <div className="nexus-activity-time" title={fullDate(item.createdAt)}>{timeLabel(item.createdAt)}</div>
      <button type="button" className="nexus-activity-content" onClick={onOpen} disabled={!item.context.route}>
        <div className="nexus-activity-content__top">
          <strong>{item.label}</strong>
          <Badge preset="info">{ENTITY_LABEL[item.entityType] ?? item.entityType}</Badge>
          {item.context.crossProject && <Badge preset="pendente">Cross-project</Badge>}
        </div>
        <div className="nexus-activity-content__meta">
          <span>{item.actor?.nome ?? 'Ação do sistema'}</span>
          {context && <><span aria-hidden="true">•</span><span>{context}</span></>}
          {item.context.entityLabel && <><span aria-hidden="true">•</span><span>{item.context.entityLabel}</span></>}
        </div>
      </button>
    </article>
  );
}

export function AtividadePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const projetoId = params.get('projeto') || undefined;
  const actorUserId = params.get('actor') || undefined;
  const selectedType = params.get('tipo') || undefined;
  const de = params.get('de') || undefined;
  const ate = params.get('ate') || undefined;
  const q = params.get('q') || undefined;

  const { data: projectsData } = projetoHooks.useList({ page: 1, pageSize: 100, sortBy: 'nome', sortDir: 'asc' });
  const projects = projectsData?.data ?? [];
  const { data, isLoading, refetch } = useActivityFeed({ page, pageSize: 30, projetoId, actorUserId, tipos: selectedType ? [selectedType] : undefined, q, de, ate });

  const groups = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    (data?.data ?? []).forEach((item) => {
      const key = dateKey(item.createdAt);
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [data?.data]);

  function update(name: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    update('q', search.trim() || undefined);
  }

  function clearFilters() {
    setSearch('');
    setParams({});
  }

  const activeFilters = [projetoId, actorUserId, selectedType, de, ate, q].filter(Boolean).length;
  const actors = data?.facets.actors ?? [];
  const facets = data?.facets.entityTypes ?? [];

  const rail = (
    <RightRail>
      <SectionCard title="Leitura da atividade">
        <p className="nexus-activity-principle">Este feed é rastreabilidade operacional. Ele mostra eventos efetivamente registrados no histórico do Nexus; não infere mudanças que não foram persistidas.</p>
      </SectionCard>
      <SectionCard title="Entidades mais movimentadas">
        <div className="nexus-activity-facets">
          {facets.slice(0, 8).map((facet) => (
            <button key={facet.type} type="button" onClick={() => update('tipo', facet.type)} className={selectedType === facet.type ? 'is-active' : ''}>
              <span>{ENTITY_LABEL[facet.type] ?? facet.type}</span><strong>{facet.count}</strong>
            </button>
          ))}
          {!facets.length && <span className="dbc-text-3">Sem atividade no escopo atual.</span>}
        </div>
      </SectionCard>
      <SectionCard title="Atalhos de rastreabilidade">
        <div className="nexus-activity-links">
          <Button variant="secondary" block onClick={() => navigate('/governanca')}>Abrir Governança</Button>
          <Button variant="secondary" block onClick={() => navigate('/conhecimento')}>Mapa do Conhecimento</Button>
        </div>
      </SectionCard>
    </RightRail>
  );

  return (
    <SetupPage
      stepper={false}
      header={<SetupPageHeader title="Atividade do Ecossistema" subtitle="Acompanhe o que mudou, quem realizou a ação, quando aconteceu e em qual contexto do conhecimento." actions={<Button variant="secondary" onClick={() => refetch()}>Atualizar</Button>} />}
      rail={rail}
    >
      <div className="nexus-activity-page">
        <div className="nexus-activity-metrics">
          <MetricCard label="Eventos no escopo" value={isLoading ? '…' : data?.summary.total ?? 0} hint="histórico registrado" />
          <MetricCard label="Hoje" value={isLoading ? '…' : data?.summary.today ?? 0} hint="alterações desde 00:00" />
          <MetricCard label="Últimos 7 dias" value={isLoading ? '…' : data?.summary.last7Days ?? 0} hint="atividade recente" />
          <MetricCard label="Pessoas envolvidas" value={isLoading ? '…' : data?.summary.actors ?? 0} hint="atores identificados" />
        </div>

        <SectionCard>
          <form className="nexus-activity-toolbar" onSubmit={submitSearch}>
            <label className="nexus-activity-search">
              <span>Buscar no histórico</span>
              <div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: publicada, RN-037, Customer API..." /><button type="submit">Buscar</button></div>
            </label>
            <label><span>Projeto</span><select value={projetoId ?? ''} onChange={(e) => update('projeto', e.target.value || undefined)}><option value="">Todo o ecossistema</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nome}</option>)}</select></label>
            <label><span>Entidade</span><select value={selectedType ?? ''} onChange={(e) => update('tipo', e.target.value || undefined)}><option value="">Todas</option>{ENTITY_TYPES.map((type) => <option key={type} value={type}>{ENTITY_LABEL[type]}</option>)}</select></label>
            <label><span>Responsável pela ação</span><select value={actorUserId ?? ''} onChange={(e) => update('actor', e.target.value || undefined)}><option value="">Todos</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.nome}</option>)}</select></label>
            <label><span>De</span><input type="date" value={de ?? ''} onChange={(e) => update('de', e.target.value || undefined)} /></label>
            <label><span>Até</span><input type="date" value={ate ?? ''} onChange={(e) => update('ate', e.target.value || undefined)} /></label>
            {activeFilters > 0 && <button type="button" className="nexus-activity-clear" onClick={clearFilters}>Limpar {activeFilters} filtro{activeFilters === 1 ? '' : 's'}</button>}
          </form>
        </SectionCard>

        <SectionCard title="Linha do tempo" subtitle={`${data?.meta.total ?? 0} evento${(data?.meta.total ?? 0) === 1 ? '' : 's'} encontrado${(data?.meta.total ?? 0) === 1 ? '' : 's'} no escopo atual.`}>
          {isLoading ? <div className="nexus-activity-loading">Carregando histórico…</div> : groups.length === 0 ? (
            <EmptyState title="Nenhuma atividade encontrada" description="Ajuste os filtros ou continue usando o Nexus para que novos eventos sejam registrados no histórico." />
          ) : (
            <div className="nexus-activity-timeline">
              {groups.map(([day, items]) => (
                <section key={day} className="nexus-activity-day">
                  <h3>{day}</h3>
                  <div>{items.map((item) => <TimelineItem key={item.id} item={item} onOpen={() => item.context.route && navigate(item.context.route)} />)}</div>
                </section>
              ))}
            </div>
          )}
          {(data?.meta.totalPages ?? 1) > 1 && (
            <div className="nexus-activity-pagination"><Pagination page={data?.meta.page ?? 1} total={data?.meta.totalPages ?? 1} onChange={(next) => update('page', String(next))} /></div>
          )}
        </SectionCard>
      </div>
    </SetupPage>
  );
}
