import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegracoesService } from './integracoes.service';

/** Endpoint não-aninhado, cross-produto/projeto — alimenta o mapa visual de integrações. */
@UseGuards(JwtAuthGuard)
@Controller('integracoes')
export class IntegracoesGlobalController {
  constructor(private readonly integracoesService: IntegracoesService) {}

  @Get()
  findAll() {
    return this.integracoesService.findAllGlobal();
  }
}
