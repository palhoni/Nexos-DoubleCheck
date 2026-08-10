import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobalSearch } from '@/entities/busca/busca.api';
import type { GlobalSearchResult, GlobalSearchType } from '@/entities/busca/busca.types';

const FILTERS: Array<[GlobalSearchType, string]> = [
  ['Projeto', 'Projetos'], ['Produto', 'Produtos'], ['Funcionalidade', 'Funcionalidades'], ['Regra', 'Regras'],
  ['Jornada', 'Jornadas'], ['Integracao', 'Integrações'], ['Documento', 'Documentos'], ['Fonte', 'Fontes'],
  ['Modulo', 'Módulos'], ['PublicoAlvo', 'Públicos'], ['Time', 'Times'], ['Pessoa', 'Pessoas'],
];
const TYPE_LABEL = Object.fromEntries(FILTERS.map(([type, label]) => [type, label.replace(/s$/, '')])) as Record<GlobalSearchType, string>;

function SearchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>; }

export function BuscaGlobalPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [types, setTypes] = useState<GlobalSearchType[]>([]);
  const q = params.get('q') ?? '';
  const selected = useMemo(() => new Set(types), [types]);
  const { data, isFetching } = useGlobalSearch({ q, tipos: types.length ? types : undefined, limit: 20 }, q.trim().length >= 2);
  const results = data?.results ?? [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (value.length >= 2) setParams({ q: value });
  }
  function toggle(type: GlobalSearchType) { setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); }
  function context(item: GlobalSearchResult) { return [item.projectName, item.productName && item.productName !== item.title ? item.productName : null, item.code].filter(Boolean).join(' · '); }

  return (
    <div className="main-pad nexus-global-search-page">
      <header className="nexus-global-search-header">
        <div><h1>Busca Global</h1><p>Encontre conhecimento em todo o ecossistema sem precisar saber em qual Projeto ou Produto ele vive.</p></div>
      </header>

      <form className="nexus-global-search-hero" onSubmit={submit}>
        <SearchIcon />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex.: RN-037, elegibilidade, Customer API, qualificação..." autoFocus />
        <button type="submit" disabled={input.trim().length < 2}>Buscar</button>
      </form>

      {q.trim().length >= 2 && (
        <>
          <section className="nexus-global-search-filter-card">
            <div className="nexus-global-search-filter-head">
              <div><strong>{isFetching ? 'Buscando…' : `${results.length} resultado${results.length === 1 ? '' : 's'}`}</strong><span> para “{q}”</span></div>
              {types.length > 0 && <button type="button" onClick={() => setTypes([])}>Limpar filtros</button>}
            </div>
            <div className="nexus-global-search-chips">
              {FILTERS.map(([type, label]) => <button type="button" key={type} className={selected.has(type) ? 'is-active' : ''} onClick={() => toggle(type)}>{label}</button>)}
            </div>
          </section>

          <section className="nexus-global-search-list">
            {!isFetching && results.length === 0 ? <div className="nexus-search-empty">Nenhum conhecimento encontrado. Tente nome, código, regra, endpoint, documento ou contexto.</div> : results.map((item) => (
              <button type="button" className="nexus-global-search-row" key={`${item.type}:${item.id}`} onClick={() => navigate(item.route)}>
                <span className={`nexus-search-type nexus-search-type-${item.type.toLowerCase()}`}>{TYPE_LABEL[item.type] ?? item.type}</span>
                <span className="nexus-global-search-row-main">
                  <strong>{item.title}</strong>
                  <span>{context(item) || 'Conhecimento corporativo'}</span>
                  {item.description && <small>{item.description}</small>}
                </span>
                <span className="nexus-global-search-row-side">{item.status && <span className="nexus-search-status">{item.status}</span>}<span>→</span></span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
