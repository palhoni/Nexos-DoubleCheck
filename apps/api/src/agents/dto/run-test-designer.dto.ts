import { IsNotEmpty, IsString } from 'class-validator';

export class RunTestDesignerDto {
  @IsString()
  @IsNotEmpty()
  analysisExecutionId!: string;
}
