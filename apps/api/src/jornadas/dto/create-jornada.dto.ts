import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PAISES_JORNADA, STATUS_JORNADA } from '../jornadas.constants';

export class CreateJornadaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_JORNADA)
  status?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  publicoAlvoId?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventoInicial?: string;

  @IsOptional()
  @IsString()
  resultadoEsperado?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PAISES_JORNADA, { each: true })
  paises?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  moduloIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  funcionalidadeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  produtoParticipanteIds?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  // etapas tem endpoint próprio (lista simples aditiva, como necessidades/dores/objetivos do Público-alvo).
}
