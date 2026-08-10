import type { EntityConfig } from '@/entities/crud/types';
import { CANAIS_COMUNICACAO_LIST, PAISES_ATUACAO_LIST, STATUS_TIME_LIST, type Time } from './time.types';

export const TIME_CONFIG: EntityConfig<Time> = {
  key: 'times',
  label: { singular: 'Time', plural: 'Times' },
  endpoint: (projetoId) => `/projetos/${projetoId}/times`,
  scopedBy: 'projetoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Time', primary: true, minWidth: 220 },
      { key: 'responsavelPrincipal', label: 'Responsável', minWidth: 160, hideBelow: 'compact' },
      { key: 'paisesAtuacao', label: 'Países de Atuação', minWidth: 150, hideBelow: 'wide', render: 'chipList', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome do Time', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_TIME_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Novo Time', edit: 'Editar Time' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome do Time', type: 'text', required: true, colSpan: 2 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_TIME_LIST },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'missao', label: 'Missão', type: 'textarea', colSpan: 2 },
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'responsavelPrincipal', label: 'Responsável Principal', type: 'text' },
          { key: 'paisesAtuacao', label: 'Países de Atuação', type: 'multiselect', options: PAISES_ATUACAO_LIST },
          { key: 'canaisComunicacao', label: 'Canais de Comunicação', type: 'multiselect', options: CANAIS_COMUNICACAO_LIST, colSpan: 2 },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'paisesAtuacao', 'canaisComunicacao'] },
        { key: 'pessoas', label: 'Pessoas do Time', kind: 'bespoke', component: 'PessoasDoTimeTab' },
        { key: 'produtos', label: 'Produtos Atendidos', kind: 'simpleList', field: 'produtosAtendidos', subResource: 'produtos-atendidos' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
