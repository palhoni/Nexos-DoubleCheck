import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '@/entities/busca/busca.api';
import type { GlobalSearchResult, GlobalSearchType } from '@/entities/busca/busca.types';

const TYPE_LABEL: Record<GlobalSearchType, string> = {
  Projeto: 'Projeto', Time: 'Time', Pessoa: 'Pessoa', Produto: 'Produto', PublicoAlvo: 'Público-alvo',
  Modulo: 'Módulo', Funcionalidade: 'Funcionalidade', Jornada: 'Jornada', Regra: 'Regra',
  Integracao: 'Integração', Fonte: 'Fonte', Documento: 'Documento',
};

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
}
function ArrowIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

function resultContext(item: GlobalSearchResult) {
  const parts = [item.projectName, item.productName && item.productName !== item.title ? item.productName : null, item.code].filter(Boolean);
  return parts.join(' · ');
}

export interface GlobalSearchPanelProps {
  autoFocus?: boolean;
  compact?: boolean;
  onClose?: () => void;
  initialQuery?: string;
}

export function GlobalSearchPanel({ autoFocus = false, compact = false, onClose, initialQuery = '' }: GlobalSearchPanelProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useGlobalSearch({ q: query, limit: compact ? 5 : 12 }, query.trim().length >= 2);
  const results = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  useEffect(() => setActive(0), [query]);

  function open(item: GlobalSearchResult) {
    onClose?.();
    navigate(item.route);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(value + 1, Math.max(0, results.length - 1))); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
    if (event.key === 'Enter' && results[active]) { event.preventDefault(); open(results[active]); }
    if (event.key === 'Escape') onClose?.();
  }

  return (
    <div className={`nexus-search-panel${compact ? ' nexus-search-panel-compact' : ''}`}>
      <div className="nexus-search-input-wrap">
        <span className="nexus-search-input-icon"><SearchIcon /></span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="nexus-search-input"
          placeholder="Buscar projetos, produtos, regras, jornadas, integrações..."
          aria-label="Buscar no Nexo"
        />
        {isFetching && <span className="nexus-search-loading">Buscando…</span>}
      </div>

      {query.trim().length < 2 ? (
        <div className="nexus-search-hint">
          <strong>Busque pelo conhecimento, não pela tela.</strong>
          <span>Nome, código, condição de regra, endpoint, documento, fonte, pessoa ou contexto de produto.</span>
        </div>
      ) : results.length === 0 && !isFetching ? (
        <div className="nexus-search-empty">Nenhum conhecimento encontrado para “{query.trim()}”.</div>
      ) : (
        <div className="nexus-search-results" role="listbox" aria-label="Resultados da busca">
          {results.map((item, index) => (
            <button
              type="button"
              key={`${item.type}:${item.id}`}
              className={`nexus-search-result${active === index ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => open(item)}
              role="option"
              aria-selected={active === index}
            >
              <span className={`nexus-search-type nexus-search-type-${item.type.toLowerCase()}`}>{TYPE_LABEL[item.type]}</span>
              <span className="nexus-search-result-main">
                <span className="nexus-search-result-title">{item.title}</span>
                <span className="nexus-search-result-context">{resultContext(item) || 'Conhecimento corporativo'}</span>
                {item.description && <span className="nexus-search-result-description">{item.description}</span>}
              </span>
              <span className="nexus-search-result-side">
                {item.status && <span className="nexus-search-status">{item.status}</span>}
                <ArrowIcon />
              </span>
            </button>
          ))}
        </div>
      )}

      {compact && query.trim().length >= 2 && results.length > 0 && (
        <button type="button" className="nexus-search-see-all" onClick={() => { onClose?.(); navigate(`/buscar?q=${encodeURIComponent(query.trim())}`); }}>
          Ver todos os resultados <ArrowIcon />
        </button>
      )}
    </div>
  );
}
