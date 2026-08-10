import { Module } from '@nestjs/common';
import { GovernancaController } from './governanca.controller';
import { GovernancaService } from './governanca.service';

@Module({
  controllers: [GovernancaController],
  providers: [GovernancaService],
})
export class GovernancaModule {}
