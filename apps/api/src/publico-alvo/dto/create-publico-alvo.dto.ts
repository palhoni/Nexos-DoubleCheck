import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CANAIS_UTILIZADOS_PUBLICO_ALVO, FREQUENCIA_USO_PUBLICO_ALVO, PAISES_PUBLICO_ALVO, STATUS_PUBLICO_ALVO, TIPO_USUARIO_PUBLICO_ALVO } from '../publico-alvo.constants';

export class CreatePublicoAlvoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_PUBLICO_ALVO)
  status?: string;

  @IsOptional()
  @IsString()
  perfil?: string;

  @IsOptional()
  @IsIn(TIPO_USUARIO_PUBLICO_ALVO)
  tipoUsuario?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsIn(FREQUENCIA_USO_PUBLICO_ALVO)
  frequenciaUso?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(CANAIS_UTILIZADOS_PUBLICO_ALVO, { each: true })
  canaisUtilizados?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PAISES_PUBLICO_ALVO, { each: true })
  paisesOndeSeAplica?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  // necessidades/dores/objetivos têm endpoint próprio (lista simples aditiva,
  // como produtosAtendidos do Time) — não fazem parte do form de criação.
}
