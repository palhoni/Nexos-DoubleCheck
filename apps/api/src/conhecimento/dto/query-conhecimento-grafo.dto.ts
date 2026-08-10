import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryConhecimentoGrafoDto {
  @IsOptional()
  @IsString()
  projetoId?: string;

  @IsOptional()
  @IsString()
  produtoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(250)
  maxNodes = 180;
}
