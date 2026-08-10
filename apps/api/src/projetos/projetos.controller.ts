import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { QueryProjetoDto } from './dto/query-projeto.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Get()
  findAll(@Query() query: QueryProjetoDto) {
    return this.projetosService.findAll(query);
  }

  @Get(':id/ecossistema')
  ecossistema(@Param('id') id: string) {
    return this.projetosService.ecossistema(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projetosService.findOneOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateProjetoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projetosService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjetoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projetosService.update(id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetosService.toggleStatus(id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.projetosService.historico(id, query.page, query.pageSize);
  }

  @Post(':id/paises')
  addPais(@Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.projetosService.addPais(id, dto.valor);
  }

  @Delete(':id/paises/:valor')
  removePais(@Param('id') id: string, @Param('valor') valor: string) {
    return this.projetosService.removePais(id, valor);
  }

  @Post(':id/fontes')
  addFonte(@Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.projetosService.addFonte(id, dto.valor);
  }

  @Delete(':id/fontes/:valor')
  removeFonte(@Param('id') id: string, @Param('valor') valor: string) {
    return this.projetosService.removeFonte(id, valor);
  }
}
