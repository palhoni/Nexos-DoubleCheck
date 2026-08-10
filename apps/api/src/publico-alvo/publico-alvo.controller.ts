import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { PublicoAlvoService } from './publico-alvo.service';
import { CreatePublicoAlvoDto } from './dto/create-publico-alvo.dto';
import { UpdatePublicoAlvoDto } from './dto/update-publico-alvo.dto';
import { QueryPublicoAlvoDto } from './dto/query-publico-alvo.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/publico-alvo')
export class PublicoAlvoController {
  constructor(private readonly publicoAlvoService: PublicoAlvoService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryPublicoAlvoDto) {
    return this.publicoAlvoService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.publicoAlvoService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreatePublicoAlvoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.publicoAlvoService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdatePublicoAlvoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.publicoAlvoService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publicoAlvoService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.publicoAlvoService.historico(produtoId, id, query.page, query.pageSize);
  }

  @Post(':id/necessidades')
  addNecessidade(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.publicoAlvoService.addListItem(produtoId, id, 'necessidades', dto.valor);
  }
  @Delete(':id/necessidades/:valor')
  removeNecessidade(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.publicoAlvoService.removeListItem(produtoId, id, 'necessidades', valor);
  }

  @Post(':id/dores')
  addDor(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.publicoAlvoService.addListItem(produtoId, id, 'dores', dto.valor);
  }
  @Delete(':id/dores/:valor')
  removeDor(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.publicoAlvoService.removeListItem(produtoId, id, 'dores', valor);
  }

  @Post(':id/objetivos')
  addObjetivo(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.publicoAlvoService.addListItem(produtoId, id, 'objetivos', dto.valor);
  }
  @Delete(':id/objetivos/:valor')
  removeObjetivo(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.publicoAlvoService.removeListItem(produtoId, id, 'objetivos', valor);
  }
}
