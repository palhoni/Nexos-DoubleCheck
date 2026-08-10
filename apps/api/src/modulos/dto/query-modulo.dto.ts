import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MODULO_SORTABLE_FIELDS, STATUS_MODULO } from '../modulos.constants';

export class QueryModuloDto {
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
  @IsIn(STATUS_MODULO)
  status?: string;

  @IsOptional()
  @IsIn(MODULO_SORTABLE_FIELDS)
  sortBy: string = 'ordemExibicao';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'asc';
}
