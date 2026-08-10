import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { REGRA_SORTABLE_FIELDS, STATUS_REGRA } from '../regras.constants';

export class QueryRegraDto {
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
  @IsIn(STATUS_REGRA)
  status?: string;

  @IsOptional()
  @IsIn(REGRA_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
