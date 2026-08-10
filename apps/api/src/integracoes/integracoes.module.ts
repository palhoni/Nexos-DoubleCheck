import { Module } from '@nestjs/common';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesGlobalController } from './integracoes-global.controller';
import { IntegracoesService } from './integracoes.service';

@Module({
  controllers: [IntegracoesController, IntegracoesGlobalController],
  providers: [IntegracoesService],
})
export class IntegracoesModule {}
