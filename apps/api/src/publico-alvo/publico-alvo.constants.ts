export const STATUS_PUBLICO_ALVO = ['Ativo', 'Inativo'] as const;

export const TIPO_USUARIO_PUBLICO_ALVO = ['Cliente Final', 'Usuário Interno', 'Parceiro', 'Administrador', 'Operador', 'Outro'] as const;

export const FREQUENCIA_USO_PUBLICO_ALVO = ['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Esporádica'] as const;

export const CANAIS_UTILIZADOS_PUBLICO_ALVO = ['Web', 'Aplicativo Mobile', 'E-mail', 'WhatsApp', 'API', 'Telefone', 'Presencial'] as const;

export const PAISES_PUBLICO_ALVO = [
  'Brasil',
  'Portugal',
  'Estados Unidos',
  'México',
  'Colômbia',
  'Argentina',
  'Chile',
  'Espanha',
] as const;

export const PUBLICO_ALVO_SORTABLE_FIELDS = ['nome', 'status', 'tipoUsuario', 'frequenciaUso', 'createdAt', 'updatedAt'] as const;
