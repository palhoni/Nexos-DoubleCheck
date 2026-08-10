import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { STATUS_TIME, TIME_SORTABLE_FIELDS } from '../time.constants';

export class QueryTimeDto {
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
  @IsIn(STATUS_TIME)
  status?: string;

  @IsOptional()
  @IsIn(TIME_SORTABLE_FIELDS)
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
