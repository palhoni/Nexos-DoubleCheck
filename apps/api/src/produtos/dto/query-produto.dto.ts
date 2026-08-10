import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AREAS_NEGOCIO } from '../../projetos/projeto.constants';
import { PRODUTO_SORTABLE_FIELDS, STATUS_PRODUTO } from '../produto.constants';

export class QueryProdutoDto {
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
  @IsIn(STATUS_PRODUTO)
  status?: string;

  @IsOptional()
  @IsIn(AREAS_NEGOCIO)
  areaNegocio?: string;

  @IsOptional()
  @IsIn(PRODUTO_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
