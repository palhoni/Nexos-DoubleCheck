import { PartialType } from '@nestjs/mapped-types';
import { CreateFuncionalidadeDto } from './create-funcionalidade.dto';

export class UpdateFuncionalidadeDto extends PartialType(CreateFuncionalidadeDto) {}
