import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { INTEGRACAO_SORTABLE_FIELDS, STATUS_INTEGRACAO } from '../integracoes.constants';

export class QueryIntegracaoDto {
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
  @IsIn(STATUS_INTEGRACAO)
  status?: string;

  @IsOptional()
  @IsIn(INTEGRACAO_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
