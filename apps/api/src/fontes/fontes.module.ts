import { Module } from '@nestjs/common';
import { FontesController } from './fontes.controller';
import { FontesService } from './fontes.service';

@Module({
  controllers: [FontesController],
  providers: [FontesService],
})
export class FontesModule {}
