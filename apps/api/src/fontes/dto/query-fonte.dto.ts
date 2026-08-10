import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FONTE_SORTABLE_FIELDS, FONTE_STATUS } from '../fontes.constants';

export class QueryFonteDto {
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
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  projetoId?: string;

  @IsOptional()
  @IsString()
  consumidorProjetoId?: string;

  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsIn(FONTE_STATUS)
  status?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  oficial?: boolean;

  @IsOptional()
  @IsIn(FONTE_SORTABLE_FIELDS)
  sortBy: string = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
