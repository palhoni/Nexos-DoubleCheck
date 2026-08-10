import { PartialType } from '@nestjs/mapped-types';
import { CreateRegraDto } from './create-regra.dto';

export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
