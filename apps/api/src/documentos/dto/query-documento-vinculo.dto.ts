import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { DOCUMENTO_ENTITY_TYPES } from '../documentos.constants';

export class QueryDocumentoVinculoDto {
  @IsIn(DOCUMENTO_ENTITY_TYPES)
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
