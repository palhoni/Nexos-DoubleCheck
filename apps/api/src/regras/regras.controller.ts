import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { RegrasService } from './regras.service';
import { CreateRegraDto } from './dto/create-regra.dto';
import { UpdateRegraDto } from './dto/update-regra.dto';
import { QueryRegraDto } from './dto/query-regra.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/regras')
export class RegrasController {
  constructor(private readonly regrasService: RegrasService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryRegraDto) {
    return this.regrasService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.regrasService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreateRegraDto, @CurrentUser() user: AuthenticatedUser) {
    return this.regrasService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdateRegraDto, @CurrentUser() user: AuthenticatedUser) {
    return this.regrasService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.regrasService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.regrasService.historico(produtoId, id, query.page, query.pageSize);
  }

  @Post(':id/excecoes')
  addExcecao(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.regrasService.addListItem(produtoId, id, 'excecoes', dto.valor);
  }
  @Delete(':id/excecoes/:valor')
  removeExcecao(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.regrasService.removeListItem(produtoId, id, 'excecoes', valor);
  }

  @Post(':id/exemplos')
  addExemplo(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.regrasService.addListItem(produtoId, id, 'exemplos', dto.valor);
  }
  @Delete(':id/exemplos/:valor')
  removeExemplo(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.regrasService.removeListItem(produtoId, id, 'exemplos', valor);
  }

  @Post(':id/nova-versao')
  criarNovaVersao(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.regrasService.criarNovaVersao(produtoId, id, user.userId);
  }

  @Get(':id/versoes')
  listarVersoes(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.regrasService.listarVersoes(produtoId, id);
  }
}

/** Rota irmã, fora do prefixo `produtos/:produtoId/regras` — resume regras no nível do
 *  projeto (join por todos os produtos), usada pelo SetupStepper para saber se o projeto
 *  já tem regra cadastrada, sem exigir um produtoId específico. */
@UseGuards(JwtAuthGuard)
@Controller('regras')
export class RegrasResumoController {
  constructor(private readonly regrasService: RegrasService) {}

  @Get('resumo')
  resumo(@Query('projetoId') projetoId: string) {
    return this.regrasService.resumoPorProjeto(projetoId);
  }
}
