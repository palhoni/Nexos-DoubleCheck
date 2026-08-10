import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateFonteDto } from './create-fonte.dto';

/**
 * A propriedade da fonte e imutavel apos a criacao.
 * Uma fonte pode ser consumida por outros Projetos por meio de vinculos,
 * mas continua pertencendo ao Projeto que a cadastrou.
 */
export class UpdateFonteDto extends PartialType(OmitType(CreateFonteDto, ['projetoId'] as const)) {}
