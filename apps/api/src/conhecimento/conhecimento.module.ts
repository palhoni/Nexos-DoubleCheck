import { Module } from '@nestjs/common';
import { ConhecimentoController } from './conhecimento.controller';
import { ConhecimentoService } from './conhecimento.service';

@Module({
  controllers: [ConhecimentoController],
  providers: [ConhecimentoService],
})
export class ConhecimentoModule {}
