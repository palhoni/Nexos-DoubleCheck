import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { FONTE_ENTITY_TYPES } from '../fontes.constants';

export class CreateFonteVinculoDto {
  @IsIn(FONTE_ENTITY_TYPES)
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  contexto?: string;
}
