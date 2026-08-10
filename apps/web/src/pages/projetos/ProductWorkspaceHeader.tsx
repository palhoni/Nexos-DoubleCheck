import type { ReactNode } from 'react';
import { Button, Icon, Tabs } from '@/design-system';
import { EntityStatusBadge, formatDateTimeBR } from '@/entities/crud/shared';
import { PRODUTO_CONFIG } from '@/entities/produto/produto.config';
import type { Produto } from '@/entities/produto/produto.types';

export const PRODUCT_WORKSPACE_TABS = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'publicoAlvo', label: 'Público-alvo' },
  { key: 'paises', label: 'Países' },
  { key: 'modulos', label: 'Módulos' },
  { key: 'funcionalidades', label: 'Funcionalidades' },
  { key: 'jornadas', label: 'Jornadas' },
  { key: 'regras', label: 'Regras' },
  { key: 'integracoes', label: 'Integrações' },
  { key: 'historico', label: 'Histórico' },
  { key: 'maturidade', label: 'Maturidade' },
] as const;

export type ProductWorkspaceTabKey = (typeof PRODUCT_WORKSPACE_TABS)[number]['key'];

function ProductMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="product-summary__meta-item">
      <span className="product-summary__meta-label">{label}</span>
      <span className="product-summary__meta-value">{value || '—'}</span>
    </div>
  );
}

export function ProductWorkspaceHeader({
  item,
  timeName,
  activeTab,
  onTabChange,
  onToggleStatus,
  actions,
}: {
  item: Produto;
  timeName?: string;
  activeTab: ProductWorkspaceTabKey;
  onTabChange: (tab: ProductWorkspaceTabKey) => void;
  onToggleStatus?: () => void;
  actions?: ReactNode;
}) {
  return (
    <>
      <section className="product-summary" aria-label={`Resumo do produto ${item.nome}`}>
        <div className="product-summary__identity">
          <span className="product-summary__icon"><Icon name="box" size={22} /></span>
          <div className="product-summary__title-wrap">
            <div className="product-summary__title-row">
              <h2>{item.nome}</h2>
              <EntityStatusBadge config={PRODUTO_CONFIG} value={item.status} onToggle={onToggleStatus} />
            </div>
            <span className="product-summary__description">{item.descricao || item.nomeCurto || item.codigo}</span>
          </div>
        </div>
        {actions && <div className="product-summary__actions">{actions}</div>}
        <div className="product-summary__meta">
          <ProductMeta label="Código" value={item.codigo} />
          <ProductMeta label="Time responsável" value={timeName || 'Não definido'} />
          <ProductMeta label="Área de negócio" value={item.areaNegocio || 'Não informada'} />
          <ProductMeta label="Países" value={`${item.paises.length} cadastrado${item.paises.length === 1 ? '' : 's'}`} />
          <ProductMeta label="Última atualização" value={formatDateTimeBR(item.updatedAt)} />
        </div>
      </section>
      <nav className="product-detail-tabs" aria-label="Navegação do produto">
        <Tabs
          items={PRODUCT_WORKSPACE_TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
          value={activeTab}
          onChange={(key) => onTabChange(key as ProductWorkspaceTabKey)}
          ariaLabel="Seções do produto"
        />
      </nav>
    </>
  );
}

export function ProductEditAction({ onClick }: { onClick: () => void }) {
  return <Button variant="default" icon="edit" onClick={onClick}>Editar produto</Button>;
}
