import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StartBugReportDto {
  @IsString()
  @IsNotEmpty()
  projetoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tema?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(60_000)
  evidencias!: string;
}
