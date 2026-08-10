import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENTO_STATUS } from '../documentos.constants';

/**
 * Metadados editáveis sem criar uma nova versão editorial.
 * Código, propriedade, título, resumo e conteúdo não são alterados aqui.
 * Mudanças editoriais passam pelo endpoint de versões para preservar histórico.
 */
export class UpdateDocumentoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tipo?: string;

  @IsOptional()
  @IsIn(DOCUMENTO_STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavel?: string;
}
