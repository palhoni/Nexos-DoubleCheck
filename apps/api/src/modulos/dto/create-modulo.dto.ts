import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { STATUS_MODULO } from '../modulos.constants';

export class CreateModuloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo!: string;

  @IsOptional()
  @IsIn(STATUS_MODULO)
  status?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavelPrincipal?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordemExibicao?: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
