import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PUBLICO_ALVO_SORTABLE_FIELDS, STATUS_PUBLICO_ALVO } from '../publico-alvo.constants';

export class QueryPublicoAlvoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsIn(STATUS_PUBLICO_ALVO)
  status?: string;

  @IsOptional()
  @IsIn(PUBLICO_ALVO_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
