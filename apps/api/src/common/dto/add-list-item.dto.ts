import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddListItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  valor!: string;
}
