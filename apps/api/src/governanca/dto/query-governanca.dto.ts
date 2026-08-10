import { IsOptional, IsString } from 'class-validator';

export class QueryGovernancaDto {
  @IsOptional()
  @IsString()
  projetoId?: string;
}
