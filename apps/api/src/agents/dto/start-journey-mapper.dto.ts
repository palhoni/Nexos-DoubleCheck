import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartJourneyMapperDto {
  @IsString()
  @IsNotEmpty()
  produtoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  foco?: string;
}
