import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { KnowledgeSourcesCard } from '@/components/knowledge/KnowledgeSourcesCard';
import { KnowledgeDocumentsCard } from '@/components/knowledge/KnowledgeDocumentsCard';
import { Badge, Button, EmptyState, Icon, SectionCard } from '@/design-system';
import { EntityStatusBadge, formatDateTimeBR } from '@/entities/crud/shared';
import { PRODUTO_CONFIG } from '@/entities/produto/produto.config';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import { projetoHooks } from '@/entities/projeto/projeto.hooks';
import { useMaturidadeProduto } from '@/entities/produto/produto.maturidade';
import type { Produto } from '@/entities/produto/produto.types';
import { timeHooks } from '@/entities/time/time.hooks';
import { SetupPage } from '@/shell/setup/SetupPage';
import { SetupPageHeader } from '@/shell/setup/SetupPageHeader';
import { FuncionalidadesTabPanel } from './FuncionalidadesTabPanel';
import { IntegracoesTabPanel } from './IntegracoesTabPanel';
import { JornadasTabPanel } from './JornadasTabPanel';
import { MaturidadeTabPanel } from './MaturidadeTabPanel';
import { ModulosTabPanel } from './ModulosTabPanel';
import { PublicoAlvoTabPanel } from './PublicoAlvoTabPanel';
import { RegrasTabPanel } from './RegrasTabPanel';

import { ProductEditAction, ProductWorkspaceHeader, type ProductWorkspaceTabKey } from './ProductWorkspaceHeader';

function OverviewBlock({ title, value, icon }: { title: string; value?: string | null; icon: 'box' | 'users' | 'clipboardCheck' | 'network' }) {
  return (
    <SectionCard padding="compact" elevation="none" style={{ height: '100%' }}>
      <div className="product-overview-block__head">
        <span className="product-overview-block__icon"><Icon name={icon} size={16} /></span>
        <span className="product-overview-block__title">{title}</span>
      </div>
      <div className={`product-overview-block__value${value ? '' : ' product-overview-block__value--empty'}`}>
        {value || 'Não informado'}
      </div>
    </SectionCard>
  );
}

function ChipGroup({ items }: { items?: string[] | null }) {
  if (!items?.length) return <span className="dbc-text-3">Não informado</span>;
  return (
    <div className="product-chip-list">
      {items.map((item) => <span className="product-chip" key={item}>{item}</span>)}
    </div>
  );
}

function OverviewTab({ item, timeName }: { item: Produto; timeName?: string }) {
  return (
    <div className="product-overview">
      <div className="product-overview__grid product-overview__grid--primary">
        <OverviewBlock title="Objetivo" value={item.objetivo} icon="clipboardCheck" />
        <OverviewBlock title="Problema que resolve" value={item.problemaResolve} icon="box" />
        <OverviewBlock title="Usuários principais" value={item.usuariosPrincipais} icon="users" />
      </div>

      <SectionCard title="Contexto do produto" icon="box" elevation="none">
        <div className="product-context-grid">
          <div>
            <span className="product-field-label">Descrição</span>
            <p className="product-field-copy">{item.descricao || 'Não informado'}</p>
          </div>
          <div>
            <span className="product-field-label">Área de negócio</span>
            <p className="product-field-copy product-field-copy--strong">{item.areaNegocio || 'Não informado'}</p>
          </div>
          <div>
            <span className="product-field-label">Time responsável</span>
            <p className="product-field-copy product-field-copy--strong">{timeName || 'Não definido'}</p>
          </div>
          <div>
            <span className="product-field-label">Responsável principal</span>
            <p className="product-field-copy product-field-copy--strong">{item.responsavelPrincipal || 'Não definido'}</p>
          </div>
        </div>
      </SectionCard>

      <div className="product-overview__grid product-overview__grid--secondary">
        <SectionCard title="Áreas beneficiadas" icon="users" elevation="none"><ChipGroup items={item.areasBeneficiadas} /></SectionCard>
        <SectionCard title="Ambientes" icon="network" elevation="none"><ChipGroup items={item.ambientes} /></SectionCard>
        <SectionCard title="Países de atuação" icon="box" elevation="none"><ChipGroup items={item.paises} /></SectionCard>
      </div>

      {(item.estabilidadeObservacao || item.observacoes) && (
        <div className="product-overview__grid product-overview__grid--notes">
          {item.estabilidadeObservacao && (
            <SectionCard title="Observação de estabilidade" icon="info" elevation="none">
              <p className="product-field-copy">{item.estabilidadeObservacao}</p>
            </SectionCard>
          )}
          {item.observacoes && (
            <SectionCard title="Observações" icon="clipboardCheck" elevation="none">
              <p className="product-field-copy">{item.observacoes}</p>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

function CountriesTab({ item }: { item: Produto }) {
  const projectQuery = projetoHooks.useDetail(item.projetoId);
  const addMutation = produtoHooks.useAddListItem(item.projetoId);
  const removeMutation = produtoHooks.useRemoveListItem(item.projetoId);
  const [country, setCountry] = useState('');
  const projectCountries = projectQuery.data?.paisesDisponiveis ?? [];
  const availableProjectCountries = projectCountries.filter((value) => !item.paises.includes(value));

  function addCountry() {
    const value = country.trim();
    if (!value || item.paises.includes(value)) return;
    addMutation.mutate({ id: item.id, subResource: 'paises', valor: value });
    setCountry('');
  }

  return (
    <div className="product-country-layout"><SectionCard title="Países de atuação" subtitle="Defina onde este produto realmente opera. Esse escopo orienta Públicos e demais conhecimentos relacionados." icon="box">
      <div className="product-inline-form">
        <input
          className="product-inline-input"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCountry()}
          placeholder="Adicionar país"
          aria-label="Adicionar país"
        />
        <Button variant="primary" icon="plus" onClick={addCountry} loading={addMutation.isPending}>Adicionar</Button>
      </div>
      {item.paises.length ? (
        <div className="product-country-grid">
          {item.paises.map((pais) => (
            <div className="product-country-item" key={pais}>
              <span className="product-country-item__name">{pais}</span>
              <Button variant="ghost" size="sm" icon="close" aria-label={`Remover ${pais}`} onClick={() => removeMutation.mutate({ id: item.id, subResource: 'paises', valor: pais })} />
            </div>
          ))}
        </div>
      ) : <EmptyState title="Nenhum país cadastrado" message="Adicione os países em que este produto atua." icon="box" />}
    </SectionCard>
    <aside className="product-country-context"><SectionCard title="Contexto do Projeto" subtitle="Países disponíveis no projeto proprietário" icon="clipboardCheck" padding="compact">{projectQuery.isLoading ? <span className="dbc-text-2">Carregando contexto...</span> : projectCountries.length ? <><div className="product-country-context__summary"><strong>{item.paises.length}/{projectCountries.length}</strong><span>países do Projeto usados pelo Produto</span></div><div className="product-country-context__list">{projectCountries.map((value) => { const selected = item.paises.includes(value); return <button type="button" key={value} className={selected ? 'is-selected' : ''} disabled={selected || addMutation.isPending} onClick={() => addMutation.mutate({ id: item.id, subResource: 'paises', valor: value })}><span>{value}</span><span>{selected ? 'Vinculado' : 'Adicionar'}</span></button>; })}</div></> : <div className="product-country-context__empty"><Icon name="info" size={15} /><span>O Projeto ainda não possui países disponíveis. O campo livre continua habilitado para não bloquear o cadastro.</span></div>}</SectionCard>{availableProjectCountries.length === 0 && projectCountries.length > 0 && <div className="product-country-context__ok"><Icon name="check" size={14} />Todos os países disponíveis no Projeto já estão vinculados ao Produto.</div>}</aside></div>
  );
}

function HistoryTab({ projetoId, produtoId }: { projetoId: string; produtoId: string }) {
  const { data, isLoading } = produtoHooks.useHistorico(produtoId, 1, 20, projetoId);
  const entries = data?.data ?? [];
  if (isLoading) return <span className="dbc-text-2">Carregando histórico...</span>;
  if (!entries.length) return <EmptyState title="Sem histórico registrado" icon="clock" />;
  return (
    <SectionCard title="Histórico do produto" subtitle="Alterações registradas para este produto." icon="clock">
      <div className="product-history">
        {entries.map((entry, index) => (
          <div className="product-history__item" key={`${entry.ts}-${index}`}>
            <span className="product-history__dot" aria-hidden="true" />
            <div className="product-history__content">
              <span className="product-history__label">{entry.label}</span>
              <span className="product-history__date">{entry.actorNome ? `${entry.actorNome} · ` : ''}{formatDateTimeBR(entry.ts)}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function KnowledgeRail({ projetoId, produtoId, item }: { projetoId: string; produtoId: string; item: Produto }) {
  const { data, isLoading } = useMaturidadeProduto(projetoId, produtoId);
  const maturity = data?.geral ?? 0;
  const categories = data?.categorias ?? [];

  return (
    <div className="product-detail-rail">
      <SectionCard title="Maturidade do conhecimento" subtitle="Qualidade da documentação estruturada" icon="chart" padding="compact">
        {isLoading ? <span className="dbc-text-2">Carregando...</span> : data ? (
          <>
            <div className="product-maturity-summary">
              <div className="product-maturity-ring" style={{ '--product-progress': `${maturity}%` } as React.CSSProperties}>
                <div className="product-maturity-ring__inner"><strong>{maturity}%</strong><span>Geral</span></div>
              </div>
              <div className="product-maturity-summary__copy">
                <strong>{maturity >= 80 ? 'Avançado' : maturity >= 50 ? 'Em progresso' : 'Inicial'}</strong>
                <span>{categories.length} categorias avaliadas</span>
              </div>
            </div>
            <div className="product-maturity-list">
              {categories.slice(0, 6).map((category) => (
                <div className="product-maturity-item" key={category.chave}>
                  <div className="product-maturity-item__head"><span>{category.label}</span><strong>{category.percentual}%</strong></div>
                  <div className="product-maturity-item__track"><span style={{ width: `${Math.max(0, Math.min(100, category.percentual))}%` }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : <span className="dbc-text-3">Maturidade indisponível.</span>}
      </SectionCard>

      <SectionCard title="Situação operacional" icon="zap" padding="compact">
        <div className="product-operational-list">
          <div><span>Status do produto</span><EntityStatusBadge config={PRODUTO_CONFIG} value={item.status} /></div>
          <div><span>Estabilidade</span><Badge kind="status" preset={item.estabilidadeStatus === 'Estável' ? 'ativo' : item.estabilidadeStatus === 'Em Evolução' ? 'analise' : 'pendente'}>{item.estabilidadeStatus}</Badge></div>
          <div><span>Ambientes</span><strong>{item.ambientes.length}</strong></div>
          <div><span>Países</span><strong>{item.paises.length}</strong></div>
        </div>
      </SectionCard>

      <SectionCard title="Próximas ações" subtitle="Atalhos para continuar estruturando o produto" icon="arrowR" padding="compact">
        <div className="product-next-actions">
          <span>Use as abas acima para completar público-alvo, módulos, funcionalidades, jornadas, regras e integrações.</span>
          <span>A aba Maturidade mostra os pontos com menor cobertura de documentação.</span>
        </div>
      </SectionCard>

      <KnowledgeSourcesCard entityType="Produto" entityId={produtoId} projetoId={projetoId} compact />

      <KnowledgeDocumentsCard entityType="Produto" entityId={produtoId} projetoId={projetoId} compact />
    </div>
  );
}

export function ProdutoDetailPage() {
  const navigate = useNavigate();
  const { projetoId, produtoId } = useParams<{ projetoId: string; produtoId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as ProductWorkspaceTabKey | null;
  const activeTab: ProductWorkspaceTabKey = requestedTab && ['overview', 'publicoAlvo', 'paises', 'modulos', 'funcionalidades', 'jornadas', 'regras', 'integracoes', 'historico', 'maturidade'].includes(requestedTab) ? requestedTab : 'overview';

  const { data: item, isLoading } = produtoHooks.useDetail(produtoId, projetoId);
  const { data: timesData } = timeHooks.useList({ page: 1, pageSize: 100 }, projetoId);
  const toggleMutation = produtoHooks.useToggleStatus(projetoId);
  const times = useMemo(() => timesData?.data.map((time) => ({ value: time.id, label: time.nome })) ?? [], [timesData]);
  const timeName = times.find((time) => time.value === item?.timeResponsavelId)?.label;

  if (!projetoId || !produtoId) return null;

  if (isLoading) return <div className="main-pad"><span className="dbc-text-2">Carregando produto...</span></div>;
  if (!item) return <div className="main-pad"><EmptyState title="Produto não encontrado" message="O registro pode ter sido removido ou inativado." actionLabel="Voltar para produtos" onAction={() => navigate(`/projetos/${projetoId}/produtos`)} /></div>;

  function renderTab() {
    switch (activeTab) {
      case 'overview': return <OverviewTab item={item!} timeName={timeName} />;
      case 'publicoAlvo': return <PublicoAlvoTabPanel scopeId={produtoId!} />;
      case 'paises': return <CountriesTab item={item!} />;
      case 'modulos': return <ModulosTabPanel scopeId={produtoId!} />;
      case 'funcionalidades': return <FuncionalidadesTabPanel scopeId={produtoId!} />;
      case 'jornadas': return <JornadasTabPanel scopeId={produtoId!} />;
      case 'regras': return <RegrasTabPanel scopeId={produtoId!} />;
      case 'integracoes': return <IntegracoesTabPanel scopeId={produtoId!} />;
      case 'historico': return <HistoryTab projetoId={projetoId!} produtoId={produtoId!} />;
      case 'maturidade': return <MaturidadeTabPanel scopeId={produtoId!} />;
      default: return null;
    }
  }

  return (
    <SetupPage
      header={
        <SetupPageHeader
          breadcrumb={['Setup', 'Projetos', 'Produtos', item.nome]}
          title="Detalhe do Produto"
          subtitle="Visão consolidada do produto e da base de conhecimento associada."
          back={{ label: 'Voltar para produtos', onClick: () => navigate(`/projetos/${projetoId}/produtos`) }}
        />
      }
      rail={<KnowledgeRail projetoId={projetoId} produtoId={produtoId} item={item} />}
      afterStepper={
        <ProductWorkspaceHeader
          item={item}
          timeName={timeName}
          activeTab={activeTab}
          onTabChange={(tab) => setSearchParams(tab === 'overview' ? {} : { tab })}
          onToggleStatus={() => toggleMutation.mutate(item.id)}
          actions={<ProductEditAction onClick={() => navigate(`/projetos/${projetoId}/produtos/${produtoId}/editar`)} />}
        />
      }
    >
      <div className="product-detail-content">{renderTab()}</div>


    </SetupPage>
  );
}
