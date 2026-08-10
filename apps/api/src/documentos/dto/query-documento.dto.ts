import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DOCUMENTO_SORTABLE_FIELDS, DOCUMENTO_STATUS } from '../documentos.constants';

export class QueryDocumentoDto {
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

  /**
   * Escopo de catálogo para vínculo: documentos do próprio Projeto em qualquer estado
   * + documentos Publicados pertencentes a outros Projetos.
   */
  @IsOptional()
  @IsString()
  disponivelParaProjetoId?: string;

  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsIn(DOCUMENTO_STATUS)
  status?: string;

  @IsOptional()
  @IsIn(DOCUMENTO_SORTABLE_FIELDS)
  sortBy: string = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
