import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { STATUS_FUNCIONALIDADE } from '../funcionalidades.constants';

export class CreateFuncionalidadeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo!: string;

  @IsOptional()
  @IsString()
  moduloId?: string;

  @IsOptional()
  @IsIn(STATUS_FUNCIONALIDADE)
  status?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  comportamentoEsperado?: string;

  @IsOptional()
  @IsString()
  usuarios?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavelPrincipal?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
