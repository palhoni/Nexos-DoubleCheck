import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { FONTE_STATUS } from '../fontes.constants';

export class CreateFonteDto {
  @IsString()
  @IsNotEmpty()
  projetoId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tipo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  referencia!: string;

  @IsOptional()
  @IsIn(FONTE_STATUS)
  status?: string;

  @IsOptional()
  @IsBoolean()
  oficial?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsDateString()
  ultimaVerificacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
