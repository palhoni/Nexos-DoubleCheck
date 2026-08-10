import type { EntityConfig } from '@/entities/crud/types';
import { AREAS_NEGOCIO_LIST, IDIOMAS_LIST, STATUS_PROJETO_LIST, type Projeto } from './projeto.types';

export const PROJETO_CONFIG: EntityConfig<Projeto> = {
  key: 'projetos',
  label: { singular: 'Projeto', plural: 'Projetos' },
  endpoint: '/projetos',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Projeto', primary: true, minWidth: 240 },
      { key: 'codigo', label: 'Código', minWidth: 100, hideBelow: 'compact' },
      { key: 'areaNegocio', label: 'Área de Negócio', minWidth: 150, hideBelow: 'compact' },
      { key: 'responsavelPrincipal', label: 'Responsável', minWidth: 160, hideBelow: 'wide' },
      { key: 'idiomas', label: 'Idiomas', minWidth: 130, hideBelow: 'wide', render: 'chipList', sortable: false },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome do Projeto', type: 'text' },
      { key: 'areaNegocio', label: 'Área de Negócio', type: 'select', options: AREAS_NEGOCIO_LIST },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_PROJETO_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Planejamento: 'pendente', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Novo Projeto', edit: 'Editar Projeto' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome do Projeto', type: 'text', required: true, colSpan: 2 },
          { key: 'codigo', label: 'Código', type: 'text', required: true },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_PROJETO_LIST },
        ],
      },
      {
        title: 'Sobre',
        fields: [
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'objetivo', label: 'Objetivo', type: 'textarea', colSpan: 2 },
          { key: 'areaNegocio', label: 'Área de Negócio', type: 'select', options: AREAS_NEGOCIO_LIST },
          { key: 'idiomas', label: 'Idiomas', type: 'multiselect', options: IDIOMAS_LIST, colSpan: 2 },
          { key: 'dataInicio', label: 'Data de Início', type: 'date' },
          { key: 'responsavelPrincipal', label: 'Responsável Principal', type: 'text' },
        ],
      },
      {
        title: 'Integrações',
        fields: [
          { key: 'jiraRef', label: 'Referência do Jira', type: 'text', readOnly: true, badge: 'Somente leitura' },
          { key: 'confluenceRef', label: 'Referência do Confluence', type: 'text' },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'idiomas', 'dataInicio', 'jiraRef', 'confluenceRef'] },
        { key: 'paises', label: 'Países', kind: 'simpleList', field: 'paisesDisponiveis', subResource: 'paises' },
        { key: 'fontes', label: 'Fontes Gerais', kind: 'simpleList', field: 'fontesGerais', subResource: 'fontes' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
