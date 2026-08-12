import { Module } from '@nestjs/common';
import { RegrasController, RegrasResumoController } from './regras.controller';
import { RegrasService } from './regras.service';

@Module({
  controllers: [RegrasController, RegrasResumoController],
  providers: [RegrasService],
  exports: [RegrasService],
})
export class RegrasModule {}
