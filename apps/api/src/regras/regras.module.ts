import { Module } from '@nestjs/common';
import { RegrasController } from './regras.controller';
import { RegrasService } from './regras.service';

@Module({
  controllers: [RegrasController],
  providers: [RegrasService],
})
export class RegrasModule {}
