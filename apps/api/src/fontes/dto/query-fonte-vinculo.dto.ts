import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { FONTE_ENTITY_TYPES } from '../fontes.constants';

export class QueryFonteVinculoDto {
  @IsIn(FONTE_ENTITY_TYPES)
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
