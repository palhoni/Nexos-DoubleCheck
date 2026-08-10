import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RunUsAnalyserDto {
  @IsString()
  @IsNotEmpty()
  projetoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  titulo?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(120_000)
  requisito!: string;
}
