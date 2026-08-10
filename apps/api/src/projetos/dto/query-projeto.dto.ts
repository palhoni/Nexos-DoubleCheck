import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AREAS_NEGOCIO, PROJETO_SORTABLE_FIELDS, STATUS_PROJETO } from '../projeto.constants';

export class QueryProjetoDto {
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
  @IsIn(AREAS_NEGOCIO)
  areaNegocio?: string;

  @IsOptional()
  @IsIn(STATUS_PROJETO)
  status?: string;

  @IsOptional()
  @IsIn(PROJETO_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
