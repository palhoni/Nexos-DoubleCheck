import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NIVEL_DECISAO, STATUS_PESSOA } from '../pessoa.constants';

export class CreatePessoaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @IsOptional()
  @IsIn(STATUS_PESSOA)
  status?: string;

  @IsOptional()
  @IsEmail()
  emailCorporativo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  papel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @IsString()
  timeId?: string;

  @IsOptional()
  @IsIn(NIVEL_DECISAO)
  nivelDecisao?: string;

  @IsOptional()
  @IsBoolean()
  pessoaReferencia?: boolean;

  @IsOptional()
  @IsString()
  observacoes?: string;

  // produtos, responsabilidades e especialidades têm endpoint próprio
  // (lista simples aditiva, mesmo padrão de paisesDisponiveis/produtosAtendidos).
}
