import type { EntityConfig } from '@/entities/crud/types';
import { AREAS_NEGOCIO_LIST } from '@/entities/projeto/projeto.types';
import { AMBIENTES_PRODUTO_LIST, ESTABILIDADE_PRODUTO_LIST, STATUS_PRODUTO_LIST, type Produto } from './produto.types';

export const PRODUTO_CONFIG: EntityConfig<Produto> = {
  key: 'produtos',
  label: { singular: 'Produto', plural: 'Produtos' },
  endpoint: (projetoId) => `/projetos/${projetoId}/produtos`,
  scopedBy: 'projetoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Produto', primary: true, minWidth: 220 },
      { key: 'codigo', label: 'Código', minWidth: 100, hideBelow: 'compact' },
      { key: 'areaNegocio', label: 'Área de Negócio', minWidth: 150, hideBelow: 'compact' },
      { key: 'timeResponsavelId', label: 'Time Responsável', minWidth: 170, hideBelow: 'wide', optionsFrom: 'times', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome do Produto', type: 'text' },
      { key: 'areaNegocio', label: 'Área de Negócio', type: 'select', options: AREAS_NEGOCIO_LIST },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_PRODUTO_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Planejamento: 'pendente', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Novo Produto', edit: 'Editar Produto' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome do Produto', type: 'text', required: true, colSpan: 2 },
          { key: 'nomeCurto', label: 'Nome Curto', type: 'text' },
          { key: 'codigo', label: 'Código', type: 'text', required: true },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_PRODUTO_LIST },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'objetivo', label: 'Objetivo', type: 'textarea', colSpan: 2 },
          { key: 'problemaResolve', label: 'Problema que Resolve', type: 'textarea', colSpan: 2 },
          { key: 'usuariosPrincipais', label: 'Usuários Principais', type: 'textarea', colSpan: 2 },
        ],
      },
      {
        title: 'Negócio e Responsáveis',
        fields: [
          { key: 'areaNegocio', label: 'Área de Negócio', type: 'select', options: AREAS_NEGOCIO_LIST },
          { key: 'areasBeneficiadas', label: 'Áreas Beneficiadas', type: 'multiselect', options: AREAS_NEGOCIO_LIST },
          { key: 'timeResponsavelId', label: 'Time Responsável', type: 'select', optionsFrom: 'times' },
          { key: 'responsavelPrincipal', label: 'Responsável Principal', type: 'text' },
          { key: 'ambientes', label: 'Ambientes', type: 'multiselect', options: AMBIENTES_PRODUTO_LIST, colSpan: 2 },
        ],
      },
      {
        title: 'Estabilidade em Produção',
        fields: [
          { key: 'estabilidadeStatus', label: 'Status de Estabilidade', type: 'select', options: ESTABILIDADE_PRODUTO_LIST },
          { key: 'estabilidadeObservacao', label: 'Observação de Estabilidade', type: 'textarea', colSpan: 2, hint: 'Ex.: bugs abertos em PRD, motivo da mudança de status. Atualizado manualmente pelo PO.' },
        ],
      },
      {
        title: 'Observações',
        fields: [{ key: 'observacoes', label: 'Observações', type: 'textarea', colSpan: 2 }],
      },
    ],
  },

  detail: {
    header: { title: (r) => r.nome, badges: [{ field: 'status' }] },
    shell: {
      tabs: [
        {
          key: 'config',
          label: 'Visão Geral',
          kind: 'genericFields',
          fields: ['status', 'areaNegocio', 'areasBeneficiadas', 'timeResponsavelId', 'responsavelPrincipal', 'ambientes', 'estabilidadeStatus', 'estabilidadeObservacao'],
        },
        { key: 'publicoAlvo', label: 'Público-alvo', kind: 'bespoke', component: 'PublicoAlvoTab' },
        { key: 'paises', label: 'Países', kind: 'simpleList', field: 'paises' },
        { key: 'modulos', label: 'Módulos', kind: 'bespoke', component: 'ModulosTab' },
        { key: 'funcionalidades', label: 'Funcionalidades', kind: 'bespoke', component: 'FuncionalidadesTab' },
        { key: 'jornadas', label: 'Jornadas', kind: 'bespoke', component: 'JornadasTab' },
        { key: 'regras', label: 'Regras', kind: 'bespoke', component: 'RegrasTab' },
        { key: 'integracoes', label: 'Integrações', kind: 'bespoke', component: 'IntegracoesTab' },
        { key: 'maturidade', label: 'Maturidade', kind: 'bespoke', component: 'MaturidadeTab' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
