import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, EmptyState, Icon, Pagination, SectionCard } from '@/design-system';
import { publicoAlvoHooks } from '@/entities/publico-alvo/publico-alvo.hooks';
import { produtoHooks } from '@/entities/produto/produto.hooks';
import type { PublicoAlvo } from '@/entities/publico-alvo/publico-alvo.types';

const PAGE_SIZE = 10;

function SummaryMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="audience-metric">
      <span className="audience-metric__label">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function AudienceRow({ item, productCountries, onOpen, onEdit }: { item: PublicoAlvo; productCountries: string[]; onOpen: () => void; onEdit: () => void }) {
  return (
    <tr className="audience-table__row" tabIndex={0} onClick={onOpen} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}>
      <td>
        <div className="audience-table__identity">
          <span className="audience-table__avatar"><Icon name="users" size={15} /></span>
          <div><strong>{item.nome}</strong><span>{item.perfil || item.descricao || 'Perfil ainda não documentado'}</span></div>
        </div>
      </td>
      <td>{item.tipoUsuario || '—'}</td>
      <td>{item.frequenciaUso || '—'}</td>
      <td><span className="audience-table__count">{item.necessidades.length}</span></td>
      <td><span className="audience-table__count">{item.dores.length}</span></td>
      <td><span className="audience-table__count">{item.objetivos.length}</span></td>
      <td><div className="audience-country-cell"><strong>{item.paisesOndeSeAplica.length}</strong><span>{productCountries.length && item.paisesOndeSeAplica.some((country) => !productCountries.includes(country)) ? 'revisar escopo' : item.paisesOndeSeAplica.length ? 'no escopo' : 'não definido'}</span></div></td>
      <td><Badge kind="status" preset={item.status === 'Ativo' ? 'ativo' : 'inativo'}>{item.status}</Badge></td>
      <td className="audience-table__action">
        <Button variant="ghost" size="sm" icon="edit" aria-label={`Editar ${item.nome}`} onClick={(e) => { e.stopPropagation(); onEdit(); }} />
      </td>
    </tr>
  );
}

export function PublicoAlvoTabPanel({ scopeId: produtoId }: { scopeId: string }) {
  const navigate = useNavigate();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'createdAt',
    sortDir: 'desc' as const,
    ...(search.trim() ? { nome: search.trim() } : {}),
    ...(status ? { status } : {}),
  }), [page, search, status]);

  const { data, isLoading } = publicoAlvoHooks.useList(query, produtoId);
  const productQuery = produtoHooks.useDetail(produtoId, projetoId);
  const supportQuery = publicoAlvoHooks.useList({ page: 1, pageSize: 100, sortBy: 'createdAt', sortDir: 'desc' }, produtoId);
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const all = supportQuery.data?.data ?? [];

  if (!projetoId) return null;

  const active = all.filter((item) => item.status === 'Ativo').length;
  const documentedNeeds = all.filter((item) => item.necessidades.length > 0).length;
  const documentedPains = all.filter((item) => item.dores.length > 0).length;
  const productCountries = productQuery.data?.paises ?? [];
  const withCountries = all.filter((item) => item.paisesOndeSeAplica.length > 0).length;
  const scopeConflicts = productCountries.length ? all.filter((item) => item.paisesOndeSeAplica.some((country) => !productCountries.includes(country))).length : 0;

  const base = `/projetos/${projetoId}/produtos/${produtoId}/publico-alvo`;

  return (
    <div className="audience-list-layout">
      <div className="audience-list-main">
        <SectionCard
          title="Públicos cadastrados"
          subtitle="Perfis de usuário que orientam jornadas, necessidades e decisões do produto."
          icon="users"
          actions={<Button variant="primary" icon="plus" onClick={() => navigate(`${base}/novo`)}>Novo público</Button>}
        >
          <div className="audience-toolbar">
            <div className="audience-search-wrap">
              <Icon name="search" size={15} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar público por nome..."
                aria-label="Buscar público por nome"
              />
            </div>
            <Button variant={filtersOpen ? 'primary' : 'default'} onClick={() => setFiltersOpen((v) => !v)}>Filtros</Button>
          </div>

          {filtersOpen && (
            <div className="audience-filter-panel">
              <label>
                <span>Status</span>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </label>
              <div className="audience-filter-panel__actions">
                <Button variant="default" onClick={() => { setStatus(''); setSearch(''); setPage(1); }}>Limpar filtros</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="audience-loading">Carregando públicos...</div>
          ) : rows.length ? (
            <>
              <div className="audience-table-wrap">
                <table className="audience-table">
                  <thead><tr><th>Público</th><th>Tipo</th><th>Frequência</th><th>Necessidades</th><th>Dores</th><th>Objetivos</th><th>Países</th><th>Status</th><th aria-label="Ações" /></tr></thead>
                  <tbody>
                    {rows.map((item) => (
                      <AudienceRow
                        key={item.id}
                        item={item}
                        productCountries={productCountries}
                        onOpen={() => navigate(`${base}/${item.id}`)}
                        onEdit={() => navigate(`${base}/${item.id}/editar`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="audience-pagination">
                <span>Mostrando {((meta?.page ?? 1) - 1) * PAGE_SIZE + 1}–{Math.min((meta?.page ?? 1) * PAGE_SIZE, meta?.total ?? rows.length)} de {meta?.total ?? rows.length}</span>
                <Pagination page={meta?.page ?? page} total={meta?.totalPages ?? 1} onChange={setPage} />
              </div>
            </>
          ) : (
            <EmptyState
              title="Nenhum público encontrado"
              message={search || status ? 'Ajuste a busca ou os filtros para encontrar outros registros.' : 'Cadastre o primeiro público-alvo deste produto.'}
              icon="users"
              actionLabel={!search && !status ? 'Novo público' : undefined}
              onAction={!search && !status ? () => navigate(`${base}/novo`) : undefined}
            />
          )}
        </SectionCard>
      </div>

      <aside className="audience-list-rail">
        <SectionCard title="Resumo dos públicos" icon="chart" padding="compact">
          <div className="audience-metric-grid">
            <SummaryMetric label="Cadastrados" value={supportQuery.data?.meta.total ?? all.length} hint="perfis no produto" />
            <SummaryMetric label="Ativos" value={active} hint="em uso" />
            <SummaryMetric label="Com necessidades" value={documentedNeeds} hint="documentadas" />
            <SummaryMetric label="Com dores" value={documentedPains} hint="mapeadas" />
            <SummaryMetric label="Com países" value={withCountries} hint="escopo definido" />
            <SummaryMetric label="Revisar escopo" value={scopeConflicts} hint={productCountries.length ? 'fora do Produto' : 'sem países no Produto'} />
          </div>
        </SectionCard>

        <SectionCard title="Qualidade do cadastro" subtitle="Sinais calculados com os dados disponíveis" icon="clipboardCheck" padding="compact">
          <div className="audience-quality-list">
            {[
              ['Tipo de usuário', all.filter((x) => Boolean(x.tipoUsuario)).length],
              ['Perfil ou descrição', all.filter((x) => Boolean(x.perfil || x.descricao)).length],
              ['Necessidades', documentedNeeds],
              ['Dores', documentedPains],
              ['Objetivos', all.filter((x) => x.objetivos.length > 0).length],
            ].map(([label, count]) => {
              const total = all.length;
              const pct = total ? Math.round((Number(count) / total) * 100) : 0;
              return <div className="audience-quality-item" key={String(label)}><div><span>{label}</span><strong>{Number(count)}/{total}</strong></div><div className="audience-quality-track"><span style={{ width: `${pct}%` }} /></div></div>;
            })}
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}
