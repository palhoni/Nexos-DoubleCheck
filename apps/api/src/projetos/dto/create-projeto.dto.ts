import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AREAS_NEGOCIO, IDIOMAS, STATUS_PROJETO } from '../projeto.constants';

export class CreateProjetoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo!: string;

  @IsOptional()
  @IsIn(STATUS_PROJETO)
  status?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsIn(AREAS_NEGOCIO)
  areaNegocio?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(IDIOMAS, { each: true })
  idiomas?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataInicio?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavelPrincipal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  confluenceRef?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  // jiraRef, paisesDisponiveis, fontesGerais e historico ficam de fora de propósito:
  // jiraRef só é populado por uma futura integração; os demais têm endpoints próprios.
}
