import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { PessoasService } from './pessoas.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { QueryPessoaDto } from './dto/query-pessoa.dto';

@UseGuards(JwtAuthGuard)
@Controller('projetos/:projetoId/pessoas')
export class PessoasController {
  constructor(private readonly pessoasService: PessoasService) {}

  @Get()
  findAll(@Param('projetoId') projetoId: string, @Query() query: QueryPessoaDto) {
    return this.pessoasService.findAll(projetoId, query);
  }

  @Get(':id')
  findOne(@Param('projetoId') projetoId: string, @Param('id') id: string) {
    return this.pessoasService.findOneOrThrow(projetoId, id);
  }

  @Post()
  create(@Param('projetoId') projetoId: string, @Body() dto: CreatePessoaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pessoasService.create(projetoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: UpdatePessoaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pessoasService.update(projetoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('projetoId') projetoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pessoasService.toggleStatus(projetoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('projetoId') projetoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.pessoasService.historico(projetoId, id, query.page, query.pageSize);
  }

  @Post(':id/produtos')
  addProduto(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.pessoasService.addListItem(projetoId, id, 'produtos', dto.valor);
  }
  @Delete(':id/produtos/:valor')
  removeProduto(@Param('projetoId') projetoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.pessoasService.removeListItem(projetoId, id, 'produtos', valor);
  }

  @Post(':id/responsabilidades')
  addResponsabilidade(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.pessoasService.addListItem(projetoId, id, 'responsabilidades', dto.valor);
  }
  @Delete(':id/responsabilidades/:valor')
  removeResponsabilidade(@Param('projetoId') projetoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.pessoasService.removeListItem(projetoId, id, 'responsabilidades', valor);
  }

  @Post(':id/especialidades')
  addEspecialidade(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.pessoasService.addListItem(projetoId, id, 'especialidades', dto.valor);
  }
  @Delete(':id/especialidades/:valor')
  removeEspecialidade(@Param('projetoId') projetoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.pessoasService.removeListItem(projetoId, id, 'especialidades', valor);
  }
}
