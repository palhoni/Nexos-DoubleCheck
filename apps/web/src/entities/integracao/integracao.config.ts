import type { EntityConfig } from '@/entities/crud/types';
import {
  CRITICIDADE_INTEGRACAO_LIST,
  DIRECAO_INTEGRACAO_LIST,
  MODO_INTEGRACAO_LIST,
  PAPEL_DEPENDENCIA_INTEGRACAO_LIST,
  STATUS_INTEGRACAO_LIST,
  TIPO_INTEGRACAO_LIST,
  type Integracao,
} from './integracao.types';

export const INTEGRACAO_CONFIG: EntityConfig<Integracao> = {
  key: 'integracoes',
  label: { singular: 'Integração', plural: 'Integrações' },
  endpoint: (produtoId) => `/produtos/${produtoId}/integracoes`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Integração', primary: true, minWidth: 220 },
      { key: 'tipo', label: 'Tipo', minWidth: 130, hideBelow: 'compact' },
      { key: 'criticidade', label: 'Criticidade', minWidth: 110, hideBelow: 'wide' },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome da Integração', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_INTEGRACAO_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Nova Integração', edit: 'Editar Integração' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome da Integração', type: 'text', required: true, colSpan: 2 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_INTEGRACAO_LIST },
          { key: 'direcao', label: 'Direção', type: 'select', options: DIRECAO_INTEGRACAO_LIST },
          { key: 'papelDependencia', label: 'Papel da Dependência', type: 'select', options: PAPEL_DEPENDENCIA_INTEGRACAO_LIST, hint: 'Por que essa integração existe — ortogonal à direção e ao tipo técnico.' },
        ],
      },
      {
        title: 'Detalhes Técnicos',
        fields: [
          { key: 'produtoRelacionadoId', label: 'Produto Relacionado', type: 'select', optionsFrom: 'produtosRelacionados', colSpan: 2 },
          { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_INTEGRACAO_LIST },
          { key: 'endpoint', label: 'Endpoint / Evento / Fila / Tabela / Arquivo', type: 'text', colSpan: 2 },
          { key: 'modo', label: 'Modo', type: 'select', options: MODO_INTEGRACAO_LIST },
          { key: 'criticidade', label: 'Criticidade', type: 'select', options: CRITICIDADE_INTEGRACAO_LIST },
          { key: 'dadosTrafegados', label: 'Dados Trafegados', type: 'text', placeholder: 'Ex.: Clientes, Ofertas, Produtos', colSpan: 2 },
          { key: 'timeProprietarioId', label: 'Time Proprietário', type: 'select', optionsFrom: 'times' },
          { key: 'funcionalidadeIds', label: 'Funcionalidades Dependentes', type: 'multiselect', optionsFrom: 'funcionalidades', colSpan: 2 },
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
          fields: ['status', 'direcao', 'papelDependencia', 'produtoRelacionadoId', 'tipo', 'endpoint', 'modo', 'criticidade', 'dadosTrafegados', 'timeProprietarioId', 'funcionalidadeIds'],
        },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
