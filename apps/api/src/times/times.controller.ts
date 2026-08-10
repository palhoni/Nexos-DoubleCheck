import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { TimesService } from './times.service';
import { CreateTimeDto } from './dto/create-time.dto';
import { UpdateTimeDto } from './dto/update-time.dto';
import { QueryTimeDto } from './dto/query-time.dto';

@UseGuards(JwtAuthGuard)
@Controller('projetos/:projetoId/times')
export class TimesController {
  constructor(private readonly timesService: TimesService) {}

  @Get()
  findAll(@Param('projetoId') projetoId: string, @Query() query: QueryTimeDto) {
    return this.timesService.findAll(projetoId, query);
  }

  @Get(':id')
  findOne(@Param('projetoId') projetoId: string, @Param('id') id: string) {
    return this.timesService.findOneOrThrow(projetoId, id);
  }

  @Post()
  create(@Param('projetoId') projetoId: string, @Body() dto: CreateTimeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.timesService.create(projetoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: UpdateTimeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.timesService.update(projetoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('projetoId') projetoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.timesService.toggleStatus(projetoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('projetoId') projetoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.timesService.historico(projetoId, id, query.page, query.pageSize);
  }

  @Post(':id/produtos-atendidos')
  addProdutoAtendido(@Param('projetoId') projetoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.timesService.addProdutoAtendido(projetoId, id, dto.valor);
  }

  @Delete(':id/produtos-atendidos/:valor')
  removeProdutoAtendido(@Param('projetoId') projetoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.timesService.removeProdutoAtendido(projetoId, id, valor);
  }
}
