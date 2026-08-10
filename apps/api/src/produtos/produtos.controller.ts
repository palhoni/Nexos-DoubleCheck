import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { QueryProdutoDto } from './dto/query-produto.dto';

@UseGuards(JwtAuthGuard)
@Controller('projetos/:projetoId/produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  findAll(@Param('projetoId') projetoId: string, @Query() query: QueryProdutoDto) {
    return this.produtosService.findAll(projetoId, query);
  }

  @Get(':id')
  findOne(@Param('projetoId') projetoId: string, @Param('id') id: string) {
    return this.produtosService.findOneOrThrow(projetoId, id);
  }

  @Post()
  create(@Param('projetoId') projetoId: string, @Body() dto: CreateProdutoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.produtosService.create(projetoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: UpdateProdutoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.produtosService.update(projetoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('projetoId') projetoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.produtosService.toggleStatus(projetoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('projetoId') projetoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.produtosService.historico(projetoId, id, query.page, query.pageSize);
  }

  @Get(':id/maturidade')
  maturidade(@Param('projetoId') projetoId: string, @Param('id') id: string) {
    return this.produtosService.calcularMaturidade(projetoId, id);
  }

  @Post(':id/paises')
  addPais(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.produtosService.addPais(projetoId, id, dto.valor);
  }

  @Delete(':id/paises/:valor')
  removePais(@Param('projetoId') projetoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.produtosService.removePais(projetoId, id, valor);
  }
}
