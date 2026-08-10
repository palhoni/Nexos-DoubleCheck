import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CRITICIDADE_INTEGRACAO, DIRECAO_INTEGRACAO, MODO_INTEGRACAO, PAPEL_DEPENDENCIA_INTEGRACAO, STATUS_INTEGRACAO, TIPO_INTEGRACAO } from '../integracoes.constants';

export class CreateIntegracaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_INTEGRACAO)
  status?: string;

  @IsOptional()
  @IsIn(DIRECAO_INTEGRACAO)
  direcao?: string;

  @IsOptional()
  @IsIn(PAPEL_DEPENDENCIA_INTEGRACAO)
  papelDependencia?: string;

  @IsOptional()
  @IsString()
  produtoRelacionadoId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  funcionalidadeIds?: string[];

  @IsOptional()
  @IsIn(TIPO_INTEGRACAO)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  endpoint?: string;

  @IsOptional()
  @IsIn(MODO_INTEGRACAO)
  modo?: string;

  @IsOptional()
  @IsIn(CRITICIDADE_INTEGRACAO)
  criticidade?: string;

  @IsOptional()
  @IsString()
  dadosTrafegados?: string;

  @IsOptional()
  @IsString()
  timeProprietarioId?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
