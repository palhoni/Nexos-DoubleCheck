import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProdutosService } from './produtos.service';

/** Endpoint não-aninhado, cross-projeto — usado por seletores que precisam listar
 *  Produtos de qualquer Projeto (ex.: "produtos participantes" de uma Jornada). */
@UseGuards(JwtAuthGuard)
@Controller('produtos')
export class ProdutosGlobalController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  findAll(@Query('nome') nome?: string) {
    return this.produtosService.findAllGlobal(nome);
  }
}
