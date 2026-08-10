import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AddListItemDto } from '../common/dto/add-list-item.dto';
import { JornadasService } from './jornadas.service';
import { CreateJornadaDto } from './dto/create-jornada.dto';
import { UpdateJornadaDto } from './dto/update-jornada.dto';
import { QueryJornadaDto } from './dto/query-jornada.dto';

@UseGuards(JwtAuthGuard)
@Controller('produtos/:produtoId/jornadas')
export class JornadasController {
  constructor(private readonly jornadasService: JornadasService) {}

  @Get()
  findAll(@Param('produtoId') produtoId: string, @Query() query: QueryJornadaDto) {
    return this.jornadasService.findAll(produtoId, query);
  }

  @Get(':id')
  findOne(@Param('produtoId') produtoId: string, @Param('id') id: string) {
    return this.jornadasService.findOneOrThrow(produtoId, id);
  }

  @Post()
  create(@Param('produtoId') produtoId: string, @Body() dto: CreateJornadaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jornadasService.create(produtoId, dto, user.userId);
  }

  @Patch(':id')
  update(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: UpdateJornadaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jornadasService.update(produtoId, id, dto, user.userId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('produtoId') produtoId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jornadasService.toggleStatus(produtoId, id, user.userId);
  }

  @Get(':id/historico')
  historico(@Param('produtoId') produtoId: string, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.jornadasService.historico(produtoId, id, query.page, query.pageSize);
  }

  @Post(':id/etapas')
  addEtapa(@Param('produtoId') produtoId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
    return this.jornadasService.addEtapa(produtoId, id, dto.valor);
  }

  @Delete(':id/etapas/:valor')
  removeEtapa(@Param('produtoId') produtoId: string, @Param('id') id: string, @Param('valor') valor: string) {
    return this.jornadasService.removeEtapa(produtoId, id, valor);
  }
}
