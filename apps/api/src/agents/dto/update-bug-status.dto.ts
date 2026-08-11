import { IsIn } from 'class-validator';

export const BUG_STATUSES = ['Aberto', 'Corrigido', 'Invalidado'] as const;
export type BugStatusValue = (typeof BUG_STATUSES)[number];

export class UpdateBugStatusDto {
  @IsIn(BUG_STATUSES)
  status!: BugStatusValue;
}
