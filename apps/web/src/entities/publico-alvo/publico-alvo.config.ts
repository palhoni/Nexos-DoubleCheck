import type { EntityConfig } from '@/entities/crud/types';
import {
  CANAIS_UTILIZADOS_PUBLICO_ALVO_LIST,
  FREQUENCIA_USO_PUBLICO_ALVO_LIST,
  STATUS_PUBLICO_ALVO_LIST,
  TIPO_USUARIO_PUBLICO_ALVO_LIST,
  type PublicoAlvo,
} from './publico-alvo.types';

export const PUBLICO_ALVO_CONFIG: EntityConfig<PublicoAlvo> = {
  key: 'publico-alvo',
  label: { singular: 'Público-alvo', plural: 'Públicos-alvo' },
  endpoint: (produtoId) => `/produtos/${produtoId}/publico-alvo`,
  scopedBy: 'produtoId',
  idField: 'id',

  list: {
    columns: [
      { key: 'nome', label: 'Público-alvo', primary: true, minWidth: 220 },
      { key: 'tipoUsuario', label: 'Tipo de Usuário', minWidth: 160, hideBelow: 'compact' },
      { key: 'frequenciaUso', label: 'Frequência de Uso', minWidth: 150, hideBelow: 'wide' },
      { key: 'status', label: 'Status', minWidth: 120, render: 'statusBadge' },
    ],
    filters: [
      { key: 'nome', label: 'Nome do Público', type: 'text' },
      { key: 'tipoUsuario', label: 'Tipo de Usuário', type: 'select', options: TIPO_USUARIO_PUBLICO_ALVO_LIST },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_PUBLICO_ALVO_LIST },
    ],
  },

  statusField: 'status',
  statusPresets: { Ativo: 'ativo', Inativo: 'inativo' },
  inactivate: { mode: 'toggle', activeValue: 'Ativo', inactiveValue: 'Inativo' },

  form: {
    title: { create: 'Novo Público-alvo', edit: 'Editar Público-alvo' },
    sections: [
      {
        title: 'Identificação',
        fields: [
          { key: 'nome', label: 'Nome do Público', type: 'text', required: true, colSpan: 2 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS_PUBLICO_ALVO_LIST },
          { key: 'tipoUsuario', label: 'Tipo de Usuário', type: 'select', options: TIPO_USUARIO_PUBLICO_ALVO_LIST },
        ],
      },
      {
        title: 'Perfil',
        fields: [
          { key: 'perfil', label: 'Perfil', type: 'text', colSpan: 2 },
          { key: 'descricao', label: 'Descrição', type: 'textarea', colSpan: 2 },
          { key: 'frequenciaUso', label: 'Frequência de Uso', type: 'select', options: FREQUENCIA_USO_PUBLICO_ALVO_LIST },
          { key: 'canaisUtilizados', label: 'Canais Utilizados', type: 'multiselect', options: CANAIS_UTILIZADOS_PUBLICO_ALVO_LIST, colSpan: 2 },
          { key: 'paisesOndeSeAplica', label: 'Países onde se Aplica', type: 'multiselect', optionsFrom: 'countryScope', colSpan: 2, hint: 'As opções seguem o escopo real do Produto e do Projeto.' },
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
        { key: 'config', label: 'Configurações', kind: 'genericFields', fields: ['status', 'tipoUsuario', 'frequenciaUso', 'canaisUtilizados', 'paisesOndeSeAplica'] },
        { key: 'necessidades', label: 'Necessidades', kind: 'simpleList', field: 'necessidades' },
        { key: 'dores', label: 'Dores', kind: 'simpleList', field: 'dores' },
        { key: 'objetivos', label: 'Objetivos', kind: 'simpleList', field: 'objetivos' },
        { key: 'historico', label: 'Histórico', kind: 'history' },
      ],
    },
  },
};
