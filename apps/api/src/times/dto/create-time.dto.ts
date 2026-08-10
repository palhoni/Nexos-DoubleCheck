import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CANAIS_COMUNICACAO, PAISES_ATUACAO, STATUS_TIME } from '../time.constants';

export class CreateTimeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_TIME)
  status?: string;

  @IsOptional()
  @IsString()
  missao?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsavelPrincipal?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PAISES_ATUACAO, { each: true })
  paisesAtuacao?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(CANAIS_COMUNICACAO, { each: true })
  canaisComunicacao?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  // produtosAtendidos tem endpoint próprio (lista simples aditiva, como
  // paisesDisponiveis/fontesGerais do Projeto) — não faz parte do form de criação.
}
