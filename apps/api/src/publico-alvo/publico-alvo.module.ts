import { Module } from '@nestjs/common';
import { PublicoAlvoController } from './publico-alvo.controller';
import { PublicoAlvoService } from './publico-alvo.service';

@Module({
  controllers: [PublicoAlvoController],
  providers: [PublicoAlvoService],
})
export class PublicoAlvoModule {}
