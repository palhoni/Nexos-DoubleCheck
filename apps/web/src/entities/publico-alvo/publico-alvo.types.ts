export const STATUS_PUBLICO_ALVO_LIST = ['Ativo', 'Inativo'] as const;
export type StatusPublicoAlvo = (typeof STATUS_PUBLICO_ALVO_LIST)[number];

export const TIPO_USUARIO_PUBLICO_ALVO_LIST = ['Cliente Final', 'Usuário Interno', 'Parceiro', 'Administrador', 'Operador', 'Outro'] as const;
export type TipoUsuarioPublicoAlvo = (typeof TIPO_USUARIO_PUBLICO_ALVO_LIST)[number];

export const FREQUENCIA_USO_PUBLICO_ALVO_LIST = ['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Esporádica'] as const;
export type FrequenciaUsoPublicoAlvo = (typeof FREQUENCIA_USO_PUBLICO_ALVO_LIST)[number];

export const CANAIS_UTILIZADOS_PUBLICO_ALVO_LIST = ['Web', 'Aplicativo Mobile', 'E-mail', 'WhatsApp', 'API', 'Telefone', 'Presencial'] as const;
export type CanalUtilizadoPublicoAlvo = (typeof CANAIS_UTILIZADOS_PUBLICO_ALVO_LIST)[number];

export type PaisPublicoAlvo = string;

export interface PublicoAlvo {
  id: string;
  produtoId: string;
  nome: string;
  status: StatusPublicoAlvo;
  perfil?: string | null;
  tipoUsuario?: TipoUsuarioPublicoAlvo | null;
  descricao?: string | null;
  necessidades: string[];
  dores: string[];
  objetivos: string[];
  frequenciaUso?: FrequenciaUsoPublicoAlvo | null;
  canaisUtilizados: CanalUtilizadoPublicoAlvo[];
  paisesOndeSeAplica: PaisPublicoAlvo[];
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}
