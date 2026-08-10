import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENTO_STATUS } from '../documentos.constants';

export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty()
  projetoId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tipo!: string;

  @IsOptional()
  @IsIn(DOCUMENTO_STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  resumo?: string;

  @IsOptional()
  @IsString()
  conteudo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavel?: string;
}
