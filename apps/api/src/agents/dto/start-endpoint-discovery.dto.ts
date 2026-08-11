import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const ENDPOINT_SOURCE_TYPES = [
  'agente3',
  'collection',
  'swagger-url',
  'swagger-arquivo',
  'network-log',
  'manual',
] as const;
export type EndpointSourceType = (typeof ENDPOINT_SOURCE_TYPES)[number];

export class EndpointSourceDto {
  @IsIn(ENDPOINT_SOURCE_TYPES)
  tipo!: EndpointSourceType;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  conteudo?: string;
}

export class StartEndpointDiscoveryDto {
  @IsString()
  @IsNotEmpty()
  projetoId!: string;

  @IsString()
  @MaxLength(120)
  sistema!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EndpointSourceDto)
  fontes!: EndpointSourceDto[];
}
