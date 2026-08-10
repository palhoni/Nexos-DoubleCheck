import { ArrayUnique, IsArray, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PRIORIDADE_REGRA, STATUS_REGRA } from '../regras.constants';

export class CreateRegraDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_REGRA)
  status?: string;

  @IsOptional()
  @IsString()
  condicao?: string;

  @IsOptional()
  @IsString()
  resultadoEsperado?: string;

  @IsOptional()
  @IsIn(PRIORIDADE_REGRA)
  prioridade?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  vigenciaInicio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  vigenciaFim?: Date;

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
  jornadaIds?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  // excecoes/exemplos têm endpoint próprio (lista simples aditiva, como etapas da Jornada).
}
