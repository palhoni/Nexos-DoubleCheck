import type { EntityConfig } from '@/entities/crud/types';
import { NIVEL_DECISAO_LIST, STATUS_PESSOA_LIST, type Pessoa } from './pessoa.types';

export const PESSOA_CONFIG: EntityConfig<Pessoa> = {
  key: 'pessoas',
  label: { singular: 'Pessoa', plural: 'Pessoas' },
  endpoint: (projetoId) => `/projetos/${projetoId}/pessoas`,
  scopedBy: 'projetoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Nome', primary: true, minWidth: 200 },
      { key: 'papel', label: 'Papel', minWidth: 150, hideBelow: 'compact' },
      { key: 'timeId', label: 'Time', minWidth: 170, hideBelow: 'wide', optionsFrom: 'times', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_PESSOA_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Nova Pessoa', edit: 'Editar Pessoa' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome', type: 'text', required: true, colSpan: 2 },
          { key: 'emailCorporativo', label: 'E-mail Corporativo', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_PESSOA_LIST },
        ],
      },
      {
        title: 'Papel e Time',
        fields: [
          { key: 'papel', label: 'Papel', type: 'text' },
          { key: 'cargo', label: 'Cargo', type: 'text' },
          { key: 'timeId', label: 'Time', type: 'select', optionsFrom: 'times' },
          { key: 'nivelDecisao', label: 'Nível de Decisão', type: 'select', options: NIVEL_DECISAO_LIST },
          { key: 'pessoaReferencia', label: 'É pessoa de referência', type: 'boolean', colSpan: 2 },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'timeId', 'nivelDecisao', 'pessoaReferencia'] },
        { key: 'responsabilidades', label: 'Papéis e Responsabilidades', kind: 'simpleList', field: 'responsabilidades' },
        { key: 'especialidades', label: 'Especialidades', kind: 'simpleList', field: 'especialidades' },
        { key: 'produtos', label: 'Produtos da Pessoa', kind: 'simpleList', field: 'produtos' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
