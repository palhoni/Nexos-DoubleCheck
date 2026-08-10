import type { EntityConfig } from '@/entities/crud/types';
import { PAISES_JORNADA_LIST, STATUS_JORNADA_LIST, type Jornada } from './jornada.types';

export const JORNADA_CONFIG: EntityConfig<Jornada> = {
  key: 'jornadas',
  label: { singular: 'Jornada', plural: 'Jornadas' },
  endpoint: (produtoId) => `/produtos/${produtoId}/jornadas`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Jornada', primary: true, minWidth: 220 },
      { key: 'publicoAlvoId', label: 'Público-alvo', minWidth: 170, hideBelow: 'compact', optionsFrom: 'publicosAlvo', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome da Jornada', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_JORNADA_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Nova Jornada', edit: 'Editar Jornada' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome da Jornada', type: 'text', required: true, colSpan: 2 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_JORNADA_LIST },
          { key: 'publicoAlvoId', label: 'Público-alvo', type: 'select', optionsFrom: 'publicosAlvo' },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'objetivo', label: 'Objetivo', type: 'textarea', colSpan: 2 },
          { key: 'eventoInicial', label: 'Evento Inicial', type: 'text', colSpan: 2 },
          { key: 'resultadoEsperado', label: 'Resultado Esperado', type: 'textarea', colSpan: 2 },
          { key: 'paises', label: 'Países', type: 'multiselect', options: PAISES_JORNADA_LIST, colSpan: 2 },
        ],
      },
      {
        title: 'Relacionamentos',
        fields: [
          { key: 'moduloIds', label: 'Módulos', type: 'multiselect', optionsFrom: 'modulos', colSpan: 2 },
          { key: 'funcionalidadeIds', label: 'Funcionalidades', type: 'multiselect', optionsFrom: 'funcionalidades', colSpan: 2 },
          { key: 'produtoParticipanteIds', label: 'Produtos Participantes', type: 'multiselect', optionsFrom: 'produtosParticipantes', colSpan: 2 },
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
          label: 'Configurações',
          kind: 'genericFields',
          fields: ['status', 'publicoAlvoId', 'paises', 'moduloIds', 'funcionalidadeIds', 'produtoParticipanteIds'],
        },
        { key: 'etapas', label: 'Etapas', kind: 'simpleList', field: 'etapas' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
