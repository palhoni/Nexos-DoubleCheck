import { Module } from '@nestjs/common';
import { FuncionalidadesController } from './funcionalidades.controller';
import { FuncionalidadesService } from './funcionalidades.service';

@Module({
  controllers: [FuncionalidadesController],
  providers: [FuncionalidadesService],
})
export class FuncionalidadesModule {}
