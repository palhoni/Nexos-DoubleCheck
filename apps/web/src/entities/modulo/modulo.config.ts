import type { EntityConfig } from '@/entities/crud/types';
import { STATUS_MODULO_LIST, type Modulo } from './modulo.types';

export const MODULO_CONFIG: EntityConfig<Modulo> = {
  key: 'modulos',
  label: { singular: 'Módulo', plural: 'Módulos' },
  endpoint: (produtoId) => `/produtos/${produtoId}/modulos`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Módulo', primary: true, minWidth: 220 },
      { key: 'codigo', label: 'Código', minWidth: 100, hideBelow: 'compact' },
      { key: 'responsavelPrincipal', label: 'Responsável', minWidth: 160, hideBelow: 'wide' },
      { key: 'ordemExibicao', label: 'Ordem', minWidth: 90, hideBelow: 'wide' },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome do Módulo', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_MODULO_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Novo Módulo', edit: 'Editar Módulo' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome do Módulo', type: 'text', required: true, colSpan: 2 },
          { key: 'codigo', label: 'Código', type: 'text', required: true },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_MODULO_LIST },
          { key: 'ordemExibicao', label: 'Ordem de Exibição', type: 'number' },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'objetivo', label: 'Objetivo', type: 'textarea', colSpan: 2 },
          { key: 'responsavelPrincipal', label: 'Responsável', type: 'text' },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'responsavelPrincipal', 'ordemExibicao'] },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
