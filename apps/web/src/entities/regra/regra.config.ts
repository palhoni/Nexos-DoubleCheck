import type { EntityConfig } from '@/entities/crud/types';
import { PRIORIDADE_REGRA_LIST, STATUS_REGRA_LIST, type Regra } from './regra.types';

export const REGRA_CONFIG: EntityConfig<Regra> = {
  key: 'regras',
  label: { singular: 'Regra', plural: 'Regras' },
  endpoint: (produtoId) => `/produtos/${produtoId}/regras`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Regra', primary: true, minWidth: 220 },
      { key: 'prioridade', label: 'Prioridade', minWidth: 110, hideBelow: 'compact' },
      { key: 'numeroVersao', label: 'Versão', minWidth: 80, hideBelow: 'wide', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome da Regra', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_REGRA_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Nova Regra', edit: 'Editar Regra' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome da Regra', type: 'text', required: true, colSpan: 2 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_REGRA_LIST },
          { key: 'prioridade', label: 'Prioridade', type: 'select', options: PRIORIDADE_REGRA_LIST },
        ],
      },
      {
        title: 'Regra',
        fields: [
          { key: 'condicao', label: 'Condição', type: 'textarea', colSpan: 2 },
          { key: 'resultadoEsperado', label: 'Resultado Esperado', type: 'textarea', colSpan: 2 },
          { key: 'vigenciaInicio', label: 'Vigência - Início', type: 'date' },
          { key: 'vigenciaFim', label: 'Vigência - Fim', type: 'date' },
        ],
      },
      {
        title: 'Relacionamentos',
        fields: [
          { key: 'moduloIds', label: 'Módulos', type: 'multiselect', optionsFrom: 'modulos', colSpan: 2 },
          { key: 'funcionalidadeIds', label: 'Funcionalidades', type: 'multiselect', optionsFrom: 'funcionalidades', colSpan: 2 },
          { key: 'jornadaIds', label: 'Jornadas', type: 'multiselect', optionsFrom: 'jornadas', colSpan: 2 },
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
          fields: ['status', 'prioridade', 'vigenciaInicio', 'vigenciaFim', 'moduloIds', 'funcionalidadeIds', 'jornadaIds'],
        },
        { key: 'excecoes', label: 'Exceções', kind: 'simpleList', field: 'excecoes' },
        { key: 'exemplos', label: 'Exemplos', kind: 'simpleList', field: 'exemplos' },
        { key: 'versoes', label: 'Versões', kind: 'bespoke', component: 'VersoesTab' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
