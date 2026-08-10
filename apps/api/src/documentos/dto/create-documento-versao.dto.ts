import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentoVersaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  titulo?: string;

  @IsOptional()
  @IsString()
  resumo?: string;

  @IsString()
  @IsNotEmpty()
  conteudo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoAlteracao?: string;
}
