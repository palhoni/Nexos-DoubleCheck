import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ENDPOINT_DECISIONS = [
  'Pendente',
  'Automatizar',
  'Adiar',
  'NaoAutomatizar',
  'Investigar',
] as const;
export type EndpointDecisionValue = (typeof ENDPOINT_DECISIONS)[number];

export class UpdateEndpointDecisionDto {
  @IsIn(ENDPOINT_DECISIONS)
  decisao!: EndpointDecisionValue;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificativa?: string;
}
