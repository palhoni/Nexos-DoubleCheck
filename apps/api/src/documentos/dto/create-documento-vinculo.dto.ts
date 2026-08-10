import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DOCUMENTO_ENTITY_TYPES } from '../documentos.constants';

export class CreateDocumentoVinculoDto {
  @IsIn(DOCUMENTO_ENTITY_TYPES)
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  contexto?: string;
}
