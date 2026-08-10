import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicoAlvoDto } from './create-publico-alvo.dto';

export class UpdatePublicoAlvoDto extends PartialType(CreatePublicoAlvoDto) {}
