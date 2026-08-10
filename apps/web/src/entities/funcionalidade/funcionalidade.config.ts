import type { EntityConfig } from '@/entities/crud/types';
import { STATUS_FUNCIONALIDADE_LIST, type Funcionalidade } from './funcionalidade.types';

export const FUNCIONALIDADE_CONFIG: EntityConfig<Funcionalidade> = {
  key: 'funcionalidades',
  label: { singular: 'Funcionalidade', plural: 'Funcionalidades' },
  endpoint: (produtoId) => `/produtos/${produtoId}/funcionalidades`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Funcionalidade', primary: true, minWidth: 220 },
      { key: 'codigo', label: 'Código', minWidth: 100, hideBelow: 'compact' },
      { key: 'moduloId', label: 'Módulo', minWidth: 170, hideBelow: 'wide', optionsFrom: 'modulos', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome da Funcionalidade', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_FUNCIONALIDADE_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Nova Funcionalidade', edit: 'Editar Funcionalidade' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome da Funcionalidade', type: 'text', required: true, colSpan: 2 },
          { key: 'codigo', label: 'Código', type: 'text', required: true },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_FUNCIONALIDADE_LIST },
          { key: 'moduloId', label: 'Módulo', type: 'select', optionsFrom: 'modulos' },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'objetivo', label: 'Objetivo', type: 'textarea', colSpan: 2 },
          { key: 'comportamentoEsperado', label: 'Comportamento Esperado', type: 'textarea', colSpan: 2 },
          { key: 'usuarios', label: 'Usuários', type: 'textarea', colSpan: 2 },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'moduloId', 'responsavelPrincipal'] },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
